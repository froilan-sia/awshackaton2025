import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import * as cron from 'node-cron';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import notificationRoutes from './routes/notifications';
import { NotificationService } from './services/notificationService';
import { PushNotificationService } from './services/pushNotificationService';
import { EventReminderService } from './services/eventReminderService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'notification-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling
app.use(errorHandler);

// Initialize services for cron jobs
const pushService = new PushNotificationService();
const notificationService = new NotificationService(pushService);
const eventReminderService = new EventReminderService(notificationService);

// Cron jobs for automated notification processing
// Process pending notifications every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Processing pending notifications...');
  try {
    await notificationService.processPendingNotifications();
    console.log('Pending notifications processed successfully');
  } catch (error) {
    console.error('Error processing pending notifications:', error);
  }
});

// Process upcoming event and activity reminders every hour
cron.schedule('0 * * * *', async () => {
  console.log('Processing upcoming reminders...');
  try {
    await eventReminderService.processUpcomingReminders();
    console.log('Upcoming reminders processed successfully');
  } catch (error) {
    console.error('Error processing upcoming reminders:', error);
  }
});

// Clean up invalid push tokens daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Cleaning up invalid push tokens...');
  try {
    await pushService.cleanupInvalidTokens();
    console.log('Invalid push tokens cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up invalid push tokens:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Cron jobs scheduled:');
  console.log('- Process pending notifications: every 5 minutes');
  console.log('- Process upcoming reminders: every hour');
  console.log('- Clean up invalid tokens: daily at 2 AM');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;