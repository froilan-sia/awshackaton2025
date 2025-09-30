import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cron from 'node-cron';
import eventsRouter from './routes/events';
import { EventService } from './services/eventService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hk-tourism-events';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes
app.use('/api/events', eventsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'event-service',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Database connection
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Setup scheduled event synchronization
function setupEventSync() {
  const eventService = new EventService();
  const syncInterval = process.env.EVENT_SYNC_INTERVAL || '*/30 * * * *'; // Every 30 minutes by default

  cron.schedule(syncInterval, async () => {
    console.log('Starting scheduled event synchronization...');
    try {
      await eventService.syncAllEvents();
      console.log('Scheduled event synchronization completed');
    } catch (error) {
      console.error('Error during scheduled event sync:', error);
    }
  });

  console.log(`Event synchronization scheduled with interval: ${syncInterval}`);
}

// Setup cleanup job for expired events
function setupCleanupJob() {
  const eventService = new EventService();
  
  // Run cleanup daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting cleanup of expired events...');
    try {
      const deletedCount = await eventService.cleanupExpiredEvents(30);
      console.log(`Cleanup completed: ${deletedCount} expired events removed`);
    } catch (error) {
      console.error('Error during event cleanup:', error);
    }
  });

  console.log('Event cleanup job scheduled for daily at 2 AM');
}

// Start server
async function startServer() {
  try {
    await connectToDatabase();
    
    // Setup scheduled jobs
    setupEventSync();
    setupCleanupJob();
    
    app.listen(PORT, () => {
      console.log(`Event Service running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();