import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../../../shared/types';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const error: ApiError = {
        code: 'UNAUTHORIZED',
        message: 'Access token is required'
      };
      return res.status(401).json({
        success: false,
        error,
        timestamp: new Date()
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user'
    };

    next();
  } catch (error) {
    const apiError: ApiError = {
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token'
    };
    
    return res.status(401).json({
      success: false,
      error: apiError,
      timestamp: new Date()
    });
  }
};