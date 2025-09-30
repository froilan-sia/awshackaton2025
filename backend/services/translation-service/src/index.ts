import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import translationRoutes from './routes/translation';
import preferencesRoutes from './routes/preferences';
import pronunciationRoutes from './routes/pronunciation';
import etiquetteRoutes from './routes/etiquette';
import localizationRoutes from './routes/localization';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'translation-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/translation', translationRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/pronunciation', pronunciationRoutes);
app.use('/api/etiquette', etiquetteRoutes);
app.use('/api/localization', localizationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Translation service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;