import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { healthCheck } from './routes/health';
import { monitoringRoutes } from './routes/monitoring';
import { serviceDiscovery } from './services/serviceDiscovery';
import { loadBalancer } from './services/loadBalancer';
import { circuitBreaker } from './middleware/circuitBreaker';
import { serviceMonitor } from './services/serviceMonitor';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:19006'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.use('/health', healthCheck);

// Monitoring and dashboard endpoints
app.use('/monitoring', monitoringRoutes);

// Initialize service discovery and monitoring
const services = serviceDiscovery.initialize();
serviceMonitor.startMonitoring();

// Enhanced service proxy configurations with load balancing and circuit breaker
const createServiceProxy = (serviceName: string, pathPrefix: string) => {
  return createProxyMiddleware({
    target: 'http://placeholder', // Will be dynamically resolved
    changeOrigin: true,
    pathRewrite: { [`^${pathPrefix}`]: '' },
    router: (req) => {
      // Use load balancer to get healthy service instance
      const serviceInstance = loadBalancer.getHealthyInstance(serviceName);
      return serviceInstance ? serviceInstance.url : null;
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${serviceName}:`, err.message);
      
      // Try fallback service instance
      const fallbackInstance = loadBalancer.getFallbackInstance(serviceName);
      if (fallbackInstance) {
        console.log(`Attempting fallback to ${fallbackInstance.url}`);
        // Retry with fallback - simplified approach
        return fallbackInstance.url;
      }
      
      // Return service unavailable error
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `${serviceName} is currently unavailable`,
          timestamp: new Date()
        }
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add correlation ID for request tracing
      const correlationId = req.headers['x-correlation-id'] || 
                           `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('x-correlation-id', correlationId);
      proxyReq.setHeader('x-forwarded-by', 'api-gateway');
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add response headers for monitoring
      proxyRes.headers['x-served-by'] = 'api-gateway';
      proxyRes.headers['x-response-time'] = Date.now() - req.startTime;
    }
  });
};

// Service route configurations
const serviceRoutes = [
  { path: '/api/users', service: 'user-service' },
  { path: '/api/auth', service: 'user-service' },
  { path: '/api/recommendations', service: 'recommendation-service' },
  { path: '/api/locations', service: 'location-service' },
  { path: '/api/geofence', service: 'location-service' },
  { path: '/api/contextual-content', service: 'location-service' },
  { path: '/api/events', service: 'event-service' },
  { path: '/api/itinerary', service: 'itinerary-service' },
  { path: '/api/notifications', service: 'notification-service' },
  { path: '/api/weather', service: 'weather-service' },
  { path: '/api/crowd', service: 'crowd-service' },
  { path: '/api/local-insights', service: 'local-insights-service' },
  { path: '/api/translation', service: 'translation-service' },
  { path: '/api/practical-tips', service: 'practical-tips-service' },
  { path: '/api/sustainability', service: 'sustainability-service' },
  { path: '/api/privacy', service: 'privacy-service' },
  { path: '/api/admin', service: 'admin-service' }
];

// Add request timing middleware
app.use((req: any, res, next) => {
  req.startTime = Date.now();
  next();
});

// Apply circuit breaker middleware to all service routes
app.use('/api/*', circuitBreaker);

// Apply authentication middleware to protected routes
const protectedRoutes = [
  '/api/recommendations',
  '/api/users/profile',
  '/api/itinerary',
  '/api/notifications',
  '/api/local-insights',
  '/api/sustainability',
  '/api/privacy',
  '/api/admin'
];

protectedRoutes.forEach(route => {
  app.use(route, authMiddleware);
});

// Setup dynamic service proxies with load balancing
serviceRoutes.forEach(({ path, service }) => {
  console.log(`Setting up proxy: ${path} -> ${service}`);
  app.use(path, createServiceProxy(service, path));
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date()
    }
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('Service endpoints:');
  Object.entries(serviceProxies).forEach(([path, config]) => {
    console.log(`  ${path} -> ${config.target}`);
  });
});

export default app;