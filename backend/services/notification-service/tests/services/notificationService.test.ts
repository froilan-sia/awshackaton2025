import { NotificationService } from '../../src/services/notificationService';
import { PushNotificationService } from '../../src/services/pushNotificationService';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationStatus,
  UserNotificationPreferences 
} from '../../src/types/notification';

// Mock the PushNotificationService
jest.mock('../../src/services/pushNotificationService');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockPushService: jest.Mocked<PushNotificationService>;

  beforeEach(() => {
    mockPushService = new PushNotificationService() as jest.Mocked<PushNotificationService>;
    mockPushService.sendNotification = jest.fn().mockResolvedValue(true);
    notificationService = new NotificationService(mockPushService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification with default values', async () => {
      const payload = {
        userId: 'user123',
        type: NotificationType.WEATHER_ALERT,
        title: 'Weather Alert',
        body: 'Rain expected in your area'
      };

      const notification = await notificationService.createNotification(payload);

      expect(notification.userId).toBe('user123');
      expect(notification.type).toBe(NotificationType.WEATHER_ALERT);
      expect(notification.title).toBe('Weather Alert');
      expect(notification.body).toBe('Rain expected in your area');
      expect(notification.priority).toBe(NotificationPriority.NORMAL);
      expect(notification.status).toBe(NotificationStatus.SENT);
      expect(mockPushService.sendNotification).toHaveBeenCalledWith(notification);
    });

    it('should create a scheduled notification', async () => {
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const payload = {
        userId: 'user123',
        type: NotificationType.EVENT_REMINDER,
        title: 'Event Reminder',
        body: 'Your event starts soon',
        scheduledFor: scheduledTime
      };

      const notification = await notificationService.createNotification(payload);

      expect(notification.scheduledFor).toEqual(scheduledTime);
      expect(notification.status).toBe(NotificationStatus.PENDING);
      expect(mockPushService.sendNotification).not.toHaveBeenCalled();
    });

    it('should not send notification if user has disabled the type', async () => {
      const preferences: UserNotificationPreferences = {
        userId: 'user123',
        enabledTypes: [NotificationType.EVENT_REMINDER], // Weather alerts disabled
        quietHours: { start: '22:00', end: '08:00' },
        timezone: 'Asia/Hong_Kong',
        language: 'en'
      };

      notificationService.setUserPreferences(preferences);

      const payload = {
        userId: 'user123',
        type: NotificationType.WEATHER_ALERT,
        title: 'Weather Alert',
        body: 'Rain expected'
      };

      const notification = await notificationService.createNotification(payload);

      expect(notification.status).toBe(NotificationStatus.EXPIRED);
      expect(mockPushService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('createFromTemplate', () => {
    it('should create notification from weather alert template', async () => {
      const data = {
        weatherCondition: 'Heavy rain',
        alternativeCount: 3,
        activityName: 'Hiking',
        timeUntil: '2 hours'
      };

      const notification = await notificationService.createFromTemplate(
        NotificationType.WEATHER_ALERT,
        'user123',
        data
      );

      expect(notification).toBeTruthy();
      expect(notification!.type).toBe(NotificationType.WEATHER_ALERT);
      expect(notification!.title).toBe('Weather Update for Your Plans');
      expect(notification!.body).toContain('Heavy rain');
      expect(notification!.body).toContain('3 indoor alternatives');
    });

    it('should create notification from crowd alert template', async () => {
      const data = {
        locationName: 'Victoria Peak',
        crowdLevel: 'very busy',
        waitTime: 45
      };

      const notification = await notificationService.createFromTemplate(
        NotificationType.CROWD_ALERT,
        'user123',
        data
      );

      expect(notification).toBeTruthy();
      expect(notification!.type).toBe(NotificationType.CROWD_ALERT);
      expect(notification!.title).toBe('Crowd Alert: Victoria Peak');
      expect(notification!.body).toContain('very busy');
      expect(notification!.body).toContain('45 minutes');
    });

    it('should throw error for invalid notification type', async () => {
      await expect(
        notificationService.createFromTemplate(
          'INVALID_TYPE' as NotificationType,
          'user123',
          {}
        )
      ).rejects.toThrow('No template found for notification type');
    });
  });

  describe('processPendingNotifications', () => {
    it('should process notifications that are ready to send', async () => {
      // Create a notification scheduled for the past (should be sent now)
      const pastTime = new Date(Date.now() - 60 * 1000); // 1 minute ago
      await notificationService.createNotification({
        userId: 'user123',
        type: NotificationType.EVENT_REMINDER,
        title: 'Event Reminder',
        body: 'Event starting now',
        scheduledFor: pastTime
      });

      await notificationService.processPendingNotifications();

      expect(mockPushService.sendNotification).toHaveBeenCalled();
    });

    it('should not process notifications scheduled for the future', async () => {
      // Create a notification scheduled for the future
      const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      await notificationService.createNotification({
        userId: 'user123',
        type: NotificationType.EVENT_REMINDER,
        title: 'Future Event',
        body: 'Event in 1 hour',
        scheduledFor: futureTime
      });

      mockPushService.sendNotification.mockClear();
      await notificationService.processPendingNotifications();

      expect(mockPushService.sendNotification).not.toHaveBeenCalled();
    });

    it('should mark expired notifications', async () => {
      // Create an expired notification
      const pastTime = new Date(Date.now() - 60 * 1000); // 1 minute ago
      const expiredTime = new Date(Date.now() - 30 * 1000); // 30 seconds ago
      
      const notification = await notificationService.createNotification({
        userId: 'user123',
        type: NotificationType.EVENT_REMINDER,
        title: 'Expired Event',
        body: 'This event has passed',
        scheduledFor: pastTime,
        expiresAt: expiredTime
      });

      await notificationService.processPendingNotifications();

      const updatedNotification = notificationService.getNotification(notification.id);
      expect(updatedNotification?.status).toBe(NotificationStatus.EXPIRED);
    });
  });

  describe('quiet hours handling', () => {
    beforeEach(() => {
      // Mock current time to be 23:00 (11 PM)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T23:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reschedule non-urgent notifications during quiet hours', async () => {
      const preferences: UserNotificationPreferences = {
        userId: 'user123',
        enabledTypes: [NotificationType.EVENT_REMINDER],
        quietHours: { start: '22:00', end: '08:00' },
        timezone: 'Asia/Hong_Kong',
        language: 'en'
      };

      notificationService.setUserPreferences(preferences);

      const notification = await notificationService.createNotification({
        userId: 'user123',
        type: NotificationType.EVENT_REMINDER,
        title: 'Event Reminder',
        body: 'Non-urgent reminder',
        priority: NotificationPriority.NORMAL
      });

      expect(notification.status).toBe(NotificationStatus.SCHEDULED);
      expect(notification.scheduledFor).toBeTruthy();
      expect(mockPushService.sendNotification).not.toHaveBeenCalled();
    });

    it('should send urgent notifications even during quiet hours', async () => {
      const preferences: UserNotificationPreferences = {
        userId: 'user123',
        enabledTypes: [NotificationType.SAFETY_ALERT],
        quietHours: { start: '22:00', end: '08:00' },
        timezone: 'Asia/Hong_Kong',
        language: 'en'
      };

      notificationService.setUserPreferences(preferences);

      const notification = await notificationService.createNotification({
        userId: 'user123',
        type: NotificationType.SAFETY_ALERT,
        title: 'Safety Alert',
        body: 'Urgent safety information',
        priority: NotificationPriority.URGENT
      });

      expect(notification.status).toBe(NotificationStatus.SENT);
      expect(mockPushService.sendNotification).toHaveBeenCalledWith(notification);
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications sorted by creation time', async () => {
      const userId = 'user123';
      
      // Create multiple notifications
      await notificationService.createNotification({
        userId,
        type: NotificationType.WEATHER_ALERT,
        title: 'First Alert',
        body: 'First notification'
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await notificationService.createNotification({
        userId,
        type: NotificationType.CROWD_ALERT,
        title: 'Second Alert',
        body: 'Second notification'
      });

      const notifications = notificationService.getUserNotifications(userId);

      expect(notifications).toHaveLength(2);
      expect(notifications[0].title).toBe('Second Alert'); // Most recent first
      expect(notifications[1].title).toBe('First Alert');
    });

    it('should return empty array for user with no notifications', () => {
      const notifications = notificationService.getUserNotifications('nonexistent');
      expect(notifications).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return correct notification statistics', async () => {
      // Create notifications with different statuses
      await notificationService.createNotification({
        userId: 'user1',
        type: NotificationType.WEATHER_ALERT,
        title: 'Sent Alert',
        body: 'This will be sent'
      });

      const futureTime = new Date(Date.now() + 60 * 60 * 1000);
      await notificationService.createNotification({
        userId: 'user2',
        type: NotificationType.EVENT_REMINDER,
        title: 'Scheduled Reminder',
        body: 'This is scheduled',
        scheduledFor: futureTime
      });

      // Mock a failed notification
      mockPushService.sendNotification.mockResolvedValueOnce(false);
      await notificationService.createNotification({
        userId: 'user3',
        type: NotificationType.CROWD_ALERT,
        title: 'Failed Alert',
        body: 'This will fail'
      });

      const stats = notificationService.getStats();

      expect(stats.total).toBe(3);
      expect(stats.sent).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.expired).toBe(0);
    });
  });
});