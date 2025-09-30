import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
}

export class SecurityMiddleware {
  private readonly jwtSecret: string;
  private readonly rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
  }

  /**
   * Helmet security headers middleware
   */
  securityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  /**
   * JWT authentication middleware
   */
  authenticateToken() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ 
          error: { 
            code: 'MISSING_TOKEN', 
            message: 'Access token is required' 
          } 
        });
      }

      try {
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role || 'user'
        };
        next();
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return res.status(401).json({ 
            error: { 
              code: 'TOKEN_EXPIRED', 
              message: 'Access token has expired' 
            } 
          });
        }
        
        return res.status(403).json({ 
          error: { 
            code: 'INVALID_TOKEN', 
            message: 'Invalid access token' 
          } 
        });
      }
    };
  }

  /**
   * Role-based authorization middleware
   */
  requireRole(requiredRole: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          } 
        });
      }

      if (req.user.role !== requiredRole && req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: { 
            code: 'INSUFFICIENT_PERMISSIONS', 
            message: `Role '${requiredRole}' required` 
          } 
        });
      }

      next();
    };
  }

  /**
   * General rate limiting middleware
   */
  rateLimiter(options: {
    windowMs: number;
    max: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
  }) {
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests, please try again later',
          retryAfter: Math.ceil(options.windowMs / 1000)
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false
    });
  }

  /**
   * Strict rate limiting for sensitive endpoints
   */
  strictRateLimiter() {
    return this.rateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many sensitive requests, please try again later'
    });
  }

  /**
   * API key authentication for service-to-service communication
   */
  authenticateApiKey() {
    return (req: Request, res: Response, next: NextFunction) => {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return res.status(401).json({ 
          error: { 
            code: 'MISSING_API_KEY', 
            message: 'API key is required' 
          } 
        });
      }

      // In production, validate against stored API keys
      const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
      const hashedApiKey = createHash('sha256').update(apiKey).digest('hex');
      
      if (!validApiKeys.includes(hashedApiKey)) {
        return res.status(403).json({ 
          error: { 
            code: 'INVALID_API_KEY', 
            message: 'Invalid API key' 
          } 
        });
      }

      next();
    };
  }

  /**
   * IP-based rate limiting for additional security
   */
  ipRateLimiter(maxRequests: number = 100, windowMs: number = 60000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIp = this.getClientIp(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      this.cleanupRateLimitStore(windowStart);

      const key = `ip:${clientIp}`;
      const current = this.rateLimitStore.get(key);

      if (!current || current.resetTime < now) {
        // New window
        this.rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs
        });
        
        (req as AuthenticatedRequest).rateLimitInfo = {
          limit: maxRequests,
          remaining: maxRequests - 1,
          resetTime: new Date(now + windowMs)
        };
        
        next();
      } else if (current.count < maxRequests) {
        // Within limit
        current.count++;
        
        (req as AuthenticatedRequest).rateLimitInfo = {
          limit: maxRequests,
          remaining: maxRequests - current.count,
          resetTime: new Date(current.resetTime)
        };
        
        next();
      } else {
        // Rate limit exceeded
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests from this IP',
            retryAfter: Math.ceil((current.resetTime - now) / 1000)
          }
        });
      }
    };
  }

  /**
   * Request validation middleware
   */
  validateRequest(schema: any) {
    return (req: Request, res: Response, next: NextFunction) => {
      const { error } = schema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.details.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
      }
      
      next();
    };
  }

  /**
   * CORS configuration for privacy service
   */
  corsOptions() {
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    };
  }

  /**
   * Security audit logging middleware
   */
  auditLogger() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Log security-relevant events
      const securityEvent = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: this.getClientIp(req),
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        rateLimitInfo: req.rateLimitInfo
      };

      // Log on response finish
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(JSON.stringify({
          ...securityEvent,
          statusCode: res.statusCode,
          duration,
          type: 'security_audit'
        }));
      });

      next();
    };
  }

  private getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  private cleanupRateLimitStore(cutoff: number) {
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (value.resetTime < cutoff) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}