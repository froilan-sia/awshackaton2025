import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Error handling
app.use(errorHandler);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'user-service' });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hk-tourism-users';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`User service running on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;