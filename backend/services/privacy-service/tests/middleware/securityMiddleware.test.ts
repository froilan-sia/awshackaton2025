import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SecurityMiddleware, AuthenticatedRequest } from '../../src/middleware/securityMiddleware';

describe('SecurityMiddleware', () => {
  let securityMiddleware: SecurityMiddleware;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    securityMiddleware = new SecurityMiddleware('test-secret');
    mockRequest = {
      headers: {},
      ip: '192.168.1.1',
      get: jest.fn(),
      connection: { remoteAddress: '192.168.1.1' } as any,
      socket: { remoteAddress: '192.168.1.1' } as any
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      on: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid JWT token', () => {
      const token = jwt.sign(
        { userId: 'user123', email: 'test@example.com', role: 'user' },
        'test-secret'
      );
      
      mockRequest.headers = { authorization: `Bearer ${token}` };

      const middleware = securityMiddleware.authenticateToken();
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        role: 'user'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      const middleware = securityMiddleware.authenticateToken();
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      const middleware = securityMiddleware.authenticateToken();
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) - 3600 },
        'test-secret'
      );
      
      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

      const middleware = securityMiddleware.authenticateToken();
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockRequest.user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'user'
      };
    });

    it('should allow access for correct role', () => {
      const middleware = securityMiddleware.requireRole('user');
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access for admin role', () => {
      mockRequest.user!.role = 'admin';
      
      const middleware = securityMiddleware.requireRole('moderator');
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for insufficient role', () => {
      const middleware = securityMiddleware.requireRole('admin');
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: "Role 'admin' required"
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access without authentication', () => {
      mockRequest.user = undefined;
      
      const middleware = securityMiddleware.requireRole('user');
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authenticateApiKey', () => {
    beforeEach(() => {
      process.env.VALID_API_KEYS = 'test-api-key-hash';
    });

    it('should authenticate valid API key', () => {
      // Mock the hash to match our test key
      const crypto = require('crypto');
      const originalCreateHash = crypto.createHash;
      crypto.createHash = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-api-key-hash')
      });

      mockRequest.headers = { 'x-api-key': 'valid-api-key' };

      const middleware = securityMiddleware.authenticateApiKey();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Restore original function
      crypto.createHash = originalCreateHash;
    });

    it('should reject request without API key', () => {
      const middleware = securityMiddleware.authenticateApiKey();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid API key', () => {
      mockRequest.headers = { 'x-api-key': 'invalid-api-key' };

      const middleware = securityMiddleware.authenticateApiKey();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('ipRateLimiter', () => {
    it('should allow requests within rate limit', () => {
      const middleware = securityMiddleware.ipRateLimiter(10, 60000);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).rateLimitInfo).toEqual({
        limit: 10,
        remaining: 9,
        resetTime: expect.any(Date)
      });
    });

    it('should block requests exceeding rate limit', () => {
      const middleware = securityMiddleware.ipRateLimiter(1, 60000);
      
      // First request should pass
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      jest.clearAllMocks();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP',
          retryAfter: expect.any(Number)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reset rate limit after window expires', (done) => {
      const middleware = securityMiddleware.ipRateLimiter(1, 100); // 100ms window
      
      // First request
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      jest.clearAllMocks();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(429);

      // Wait for window to expire and try again
      setTimeout(() => {
        jest.clearAllMocks();
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  describe('validateRequest', () => {
    const Joi = require('joi');
    const schema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0).required()
    });

    it('should pass validation for valid request', () => {
      mockRequest.body = { name: 'John', age: 25 };

      const middleware = securityMiddleware.validateRequest(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid request', () => {
      mockRequest.body = { name: 'John' }; // Missing age

      const middleware = securityMiddleware.validateRequest(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('required')
            })
          ])
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('auditLogger', () => {
    it('should log security events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (mockRequest as any).method = 'POST';
      (mockRequest as any).path = '/api/test';
      mockRequest.user = { id: 'user123', email: 'test@example.com', role: 'user' };
      mockRequest.get = jest.fn().mockReturnValue('TestAgent/1.0');

      const middleware = securityMiddleware.auditLogger();
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Simulate response finish
      const finishCallback = (mockResponse.on as jest.Mock).mock.calls.find(
        call => call[0] === 'finish'
      )[1];
      
      mockResponse.statusCode = 200;
      finishCallback();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"security_audit"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user123"')
      );

      consoleSpy.mockRestore();
    });
  });
});