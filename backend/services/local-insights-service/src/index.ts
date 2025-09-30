import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFound } from './middleware/errorHandler';

import residentsRoutes from './routes/residents';
import insightsRoutes from './routes/insights';
import reviewsRoutes from './routes/reviews';
import authenticityRoutes from './routes/authenticity';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'local-insights-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/residents', residentsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/authenticity', authenticityRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'Local Insights Service',
    version: '1.0.0',
    description: 'Manages local resident content, insights, and authenticity scoring',
    endpoints: {
      residents: '/api/residents',
      insights: '/api/insights',
      reviews: '/api/reviews',
      authenticity: '/api/authenticity'
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Local Insights Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API info: http://localhost:${PORT}/api`);
});

export default app;