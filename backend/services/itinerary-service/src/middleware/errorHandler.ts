import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default error values
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error details
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.message = 'Validation Error';
  }

  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = 'Invalid ID format';
  }

  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.message = 'Token expired';
  }

  // Send error response
  res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found - ${req.originalUrl}`) as AppError;
  error.statusCode = 404;
  next(error);
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};