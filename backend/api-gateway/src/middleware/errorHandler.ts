import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../../shared/types';

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Gateway Error:', error);

  // Default error response
  let statusCode = 500;
  let apiError: ApiError = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  };

  // Handle specific error types
  if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    apiError = {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service temporarily unavailable',
      fallbackAction: 'Please try again later',
      retryAfter: 60
    };
  } else if (error.code === 'ENOTFOUND') {
    statusCode = 502;
    apiError = {
      code: 'BAD_GATEWAY',
      message: 'Unable to connect to service'
    };
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    apiError = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: error.details
    };
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    apiError = {
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token'
    };
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    apiError = {
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired'
    };
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    delete apiError.details;
  }

  res.status(statusCode).json({
    success: false,
    error: apiError,
    timestamp: new Date()
  });
};