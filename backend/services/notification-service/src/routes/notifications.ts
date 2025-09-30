import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { PushNotificationService } from '../services/pushNotificationService';
import { WeatherNotificationService } from '../services/weatherNotificationService';
import { CrowdAlertService } from '../services/crowdAlertService';
import { EventReminderService } from '../services/eventReminderService';
import { 
  NotificationType, 
  NotificationPriority,
  UserNotificationPreferences 
} from '../types/notification';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Initialize services
const pushService = new PushNotificationService();
const notificationService = new NotificationService(pushService);
const weatherNotificationService = new WeatherNotificationService(notificationService);
const crowdAlertService = new CrowdAlertService(notificationService);
const eventReminderService = new EventReminderService(notificationService);

// Register device token for push notifications
router.post('/register-token', asyncHandler(async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  
  if (!userId || !token) {
    throw createError('User ID and token are required', 400);
  }
  
  pushService.registerUserToken(userId, token);
  
  res.json({ 
    success: true, 
    message: 'Token registered successfully' 
  });
}));

// Unregister device token
router.post('/unregister-token', asyncHandler(async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  
  if (!userId || !token) {
    throw createError('User ID and token are required', 400);
  }
  
  pushService.unregisterUserToken(userId, token);
  
  res.json({ 
    success: true, 
    message: 'Token unregistered successfully' 
  });
}));

// Create a custom notification
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { userId, type, title, body, data, priority, scheduledFor, expiresAt } = req.body;
  
  if (!userId || !type || !title || !body) {
    throw createError('User ID, type, title, and body are required', 400);
  }
  
  const notification = await notificationService.createNotification({
    userId,
    type: type as NotificationType,
    title,
    body,
    data,
    priority: priority as NotificationPriority,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  });
  
  res.status(201).json({ 
    success: true, 
    notification: notification.toJSON() 
  });
}));

// Create notification from template
router.post('/template', asyncHandler(async (req: Request, res: Response) => {
  const { userId, type, data, priority, scheduledFor, expiresAt } = req.body;
  
  if (!userId || !type || !data) {
    throw createError('User ID, type, and data are required', 400);
  }
  
  const notification = await notificationService.createFromTemplate(
    type as NotificationType,
    userId,
    data,
    {
      priority: priority as NotificationPriority,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    }
  );
  
  if (!notification) {
    throw createError('Failed to create notification from template', 400);
  }
  
  res.status(201).json({ 
    success: true, 
    notification: notification.toJSON() 
  });
}));

// Get user notifications
router.get('/user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const notifications = notificationService.getUserNotifications(userId);
  const paginatedNotifications = notifications
    .slice(Number(offset), Number(offset) + Number(limit))
    .map(n => n.toJSON());
  
  res.json({
    success: true,
    notifications: paginatedNotifications,
    total: notifications.length
  });
}));

// Get specific notification
router.get('/:notificationId', asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  
  const notification = notificationService.getNotification(notificationId);
  
  if (!notification) {
    throw createError('Notification not found', 404);
  }
  
  res.json({
    success: true,
    notification: notification.toJSON()
  });
}));

// Set user notification preferences
router.post('/preferences', asyncHandler(async (req: Request, res: Response) => {
  const preferences: UserNotificationPreferences = req.body;
  
  if (!preferences.userId) {
    throw createError('User ID is required', 400);
  }
  
  notificationService.setUserPreferences(preferences);
  
  res.json({
    success: true,
    message: 'Preferences updated successfully'
  });
}));

// Get user notification preferences
router.get('/preferences/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  const preferences = notificationService.getUserPreferences(userId);
  
  res.json({
    success: true,
    preferences: preferences || null
  });
}));

// Weather-based notifications
router.post('/weather/check', asyncHandler(async (req: Request, res: Response) => {
  const { userId, activities } = req.body;
  
  if (!userId || !activities) {
    throw createError('User ID and activities are required', 400);
  }
  
  await weatherNotificationService.checkWeatherAndNotify(userId, activities);
  
  res.json({
    success: true,
    message: 'Weather check completed'
  });
}));

// Crowd alert notifications
router.post('/crowd/check', asyncHandler(async (req: Request, res: Response) => {
  const { userLocations } = req.body;
  
  if (!userLocations) {
    throw createError('User locations are required', 400);
  }
  
  await crowdAlertService.checkCrowdLevelsAndNotify(userLocations);
  
  res.json({
    success: true,
    message: 'Crowd check completed'
  });
}));

// Subscribe to crowd updates
router.post('/crowd/subscribe', asyncHandler(async (req: Request, res: Response) => {
  const { userId, locationIds } = req.body;
  
  if (!userId || !locationIds) {
    throw createError('User ID and location IDs are required', 400);
  }
  
  await crowdAlertService.subscribeToCrowdUpdates(userId, locationIds);
  
  res.json({
    success: true,
    message: 'Subscribed to crowd updates'
  });
}));

// Event subscription
router.post('/events/subscribe', asyncHandler(async (req: Request, res: Response) => {
  const subscription = req.body;
  
  if (!subscription.userId || !subscription.eventId) {
    throw createError('User ID and event ID are required', 400);
  }
  
  await eventReminderService.subscribeToEvent(subscription);
  
  res.json({
    success: true,
    message: 'Subscribed to event reminders'
  });
}));

// Add user activity
router.post('/activities', asyncHandler(async (req: Request, res: Response) => {
  const activity = req.body;
  
  if (!activity.userId || !activity.name || !activity.scheduledTime) {
    throw createError('User ID, name, and scheduled time are required', 400);
  }
  
  // Convert scheduledTime to Date object
  activity.scheduledTime = new Date(activity.scheduledTime);
  
  await eventReminderService.addUserActivity(activity);
  
  res.json({
    success: true,
    message: 'Activity added successfully'
  });
}));

// Get notification statistics
router.get('/stats/overview', asyncHandler(async (req: Request, res: Response) => {
  const stats = notificationService.getStats();
  
  res.json({
    success: true,
    stats
  });
}));

// Process pending notifications (for manual trigger)
router.post('/process', asyncHandler(async (req: Request, res: Response) => {
  await notificationService.processPendingNotifications();
  
  res.json({
    success: true,
    message: 'Pending notifications processed'
  });
}));

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;