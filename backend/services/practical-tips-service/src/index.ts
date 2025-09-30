import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import tipsRoutes from './routes/tips';
import weatherRoutes from './routes/weather';
import etiquetteRoutes from './routes/etiquette';
import locationRoutes from './routes/location';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;
const API_VERSION = process.env.API_VERSION || 'v1';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'practical-tips-service',
    version: API_VERSION,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use(`/api/${API_VERSION}/tips`, tipsRoutes);
app.use(`/api/${API_VERSION}/weather`, weatherRoutes);
app.use(`/api/${API_VERSION}/etiquette`, etiquetteRoutes);
app.use(`/api/${API_VERSION}/location`, locationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl
    }
  });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Practical Tips Service running on port ${PORT}`);
  console.log(`API Version: ${API_VERSION}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;