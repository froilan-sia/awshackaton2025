import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: { 
          code: 'MISSING_TOKEN', 
          message: 'Access token is required' 
        } 
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };
    
    // Verify user still exists
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: { 
          code: 'USER_NOT_FOUND', 
          message: 'User no longer exists' 
        } 
      });
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: { 
          code: 'INVALID_TOKEN', 
          message: 'Invalid access token' 
        } 
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: { 
        code: 'AUTH_ERROR', 
        message: 'Authentication failed' 
      } 
    });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };
    const user = await UserModel.findById(decoded.userId);
    
    if (user) {
      req.user = {
        id: decoded.userId,
        email: decoded.email
      };
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};