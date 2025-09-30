import express from 'express';
import cors from 'cors';
import { SecurityMiddleware } from './middleware/securityMiddleware';
import privacyRoutes from './routes/privacy';

const app = express();
const PORT = process.env.PORT || 3007;

// Initialize security middleware
const security = new SecurityMiddleware(process.env.JWT_SECRET || 'default-secret');

// Apply security headers
app.use(security.securityHeaders());

// CORS configuration
app.use(cors(security.corsOptions()));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security audit logging
app.use(security.auditLogger());

// IP-based rate limiting
app.use(security.ipRateLimiter(1000, 60000)); // 1000 requests per minute per IP

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'privacy-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Privacy routes
app.use('/api/privacy', privacyRoutes);

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Privacy service error:', error);
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload too large'
      }
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message
      }
    });
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Privacy service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;