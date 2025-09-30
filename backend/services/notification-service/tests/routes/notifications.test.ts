import request from 'supertest';
import express from 'express';
import notificationRoutes from '../../src/routes/notifications';
import { NotificationType, NotificationPriority } from '../../src/types/notification';

// Mock the services
jest.mock('../../src/services/notificationService');
jest.mock('../../src/services/pushNotificationService');
jest.mock('../../src/services/weatherNotificationService');
jest.mock('../../src/services/crowdAlertService');
jest.mock('../../src/services/eventReminderService');

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

describe('Notification Routes', () => {
  describe('POST /api/notifications/register-token', () => {
    it('should register a device token successfully', async () => {
      const response = await request(app)
        .post('/api/notifications/register-token')
        .send({
          userId: 'user123',
          token: 'device-token-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Token registered successfully'
      });
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/notifications/register-token')
        .send({
          token: 'device-token-123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID and token are required');
    });

    it('should return 400 when token is missing', async () => {
      const response = await request(app)
        .post('/api/notifications/register-token')
        .send({
          userId: 'user123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID and token are required');
    });
  });

  describe('POST /api/notifications/unregister-token', () => {
    it('should unregister a device token successfully', async () => {
      const response = await request(app)
        .post('/api/notifications/unregister-token')
        .send({
          userId: 'user123',
          token: 'device-token-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Token unregistered successfully'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/notifications/unregister-token')
        .send({
          userId: 'user123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID and token are required');
    });
  });

  describe('POST /api/notifications', () => {
    it('should create a custom notification successfully', async () => {
      const notificationData = {
        userId: 'user123',
        type: NotificationType.WEATHER_ALERT,
        title: 'Weather Alert',
        body: 'Rain expected in your area',
        priority: NotificationPriority.HIGH
      };

      const response = await request(app)
        .post('/api/notifications')
        .send(notificationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.notification).toBeDefined();
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .send({
          userId: 'user123',
          type: NotificationType.WEATHER_ALERT
          // Missing title and body
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID, type, title, and body are required');
    });

    it('should handle scheduled notifications', async () => {
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
      const response = await request(app)
        .post('/api/notifications')
        .send({
          userId: 'user123',
          type: NotificationType.EVENT_REMINDER,
          title: 'Event Reminder',
          body: 'Your event starts soon',
          scheduledFor: scheduledTime
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/notifications/template', () => {
    it('should create notification from template successfully', async () => {
      const templateData = {
        userId: 'user123',
        type: NotificationType.CROWD_ALERT,
        data: {
          locationName: 'Victoria Peak',
          crowdLevel: 'very busy',
          waitTime: 45,
          alternativeCount: 3
        }
      };

      const response = await request(app)
        .post('/api/notifications/template')
        .send(templateData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.notification).toBeDefined();
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/notifications/template')
        .send({
          userId: 'user123',
          type: NotificationType.CROWD_ALERT
          // Missing data
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID, type, and data are required');
    });
  });

  describe('GET /api/notifications/user/:userId', () => {
    it('should return user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/user/user123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.notifications).toBeDefined();
      expect(response.body.total).toBeDefined();
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/notifications/user/user123')
        .query({ limit: 10, offset: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/notifications/preferences', () => {
    it('should set user notification preferences successfully', async () => {
      const preferences = {
        userId: 'user123',
        enabledTypes: [NotificationType.WEATHER_ALERT, NotificationType.EVENT_REMINDER],
        quietHours: { start: '22:00', end: '08:00' },
        timezone: 'Asia/Hong_Kong',
        language: 'en'
      };

      const response = await request(app)
        .post('/api/notifications/preferences')
        .send(preferences);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Preferences updated successfully'
      });
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/notifications/preferences')
        .send({
          enabledTypes: [NotificationType.WEATHER_ALERT]
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID is required');
    });
  });

  describe('GET /api/notifications/preferences/:userId', () => {
    it('should return user notification preferences', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences/user123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.preferences).toBeDefined();
    });
  });

  describe('POST /api/notifications/weather/check', () => {
    it('should trigger weather check successfully', async () => {
      const weatherCheckData = {
        userId: 'user123',
        activities: [
          {
            id: 'activity1',
            name: 'Hiking',
            scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            location: 'Dragon\'s Back',
            isOutdoor: true,
            weatherSensitive: true
          }
        ]
      };

      const response = await request(app)
        .post('/api/notifications/weather/check')
        .send(weatherCheckData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Weather check completed'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/notifications/weather/check')
        .send({
          userId: 'user123'
          // Missing activities
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID and activities are required');
    });
  });

  describe('POST /api/notifications/crowd/check', () => {
    it('should trigger crowd check successfully', async () => {
      const crowdCheckData = {
        userLocations: [
          {
            userId: 'user123',
            currentLocation: { latitude: 22.2908, longitude: 114.1501 },
            intendedDestinations: ['loc1', 'loc2']
          }
        ]
      };

      const response = await request(app)
        .post('/api/notifications/crowd/check')
        .send(crowdCheckData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Crowd check completed'
      });
    });

    it('should return 400 when userLocations is missing', async () => {
      const response = await request(app)
        .post('/api/notifications/crowd/check')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User locations are required');
    });
  });

  describe('POST /api/notifications/crowd/subscribe', () => {
    it('should subscribe to crowd updates successfully', async () => {
      const subscriptionData = {
        userId: 'user123',
        locationIds: ['loc1', 'loc2']
      };

      const response = await request(app)
        .post('/api/notifications/crowd/subscribe')
        .send(subscriptionData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Subscribed to crowd updates'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/notifications/crowd/subscribe')
        .send({
          userId: 'user123'
          // Missing locationIds
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID and location IDs are required');
    });
  });

  describe('POST /api/notifications/events/subscribe', () => {
    it('should subscribe to event reminders successfully', async () => {
      const subscriptionData = {
        userId: 'user123',
        eventId: 'event123',
        reminderPreferences: {
          dayBefore: true,
          hoursBeforeOptions: [4, 1],
          includePreparationTips: true,
          includeWeatherInfo: false
        }
      };

      const response = await request(app)
        .post('/api/notifications/events/subscribe')
        .send(subscriptionData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Subscribed to event reminders'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/notifications/events/subscribe')
        .send({
          userId: 'user123'
          // Missing eventId
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID and event ID are required');
    });
  });

  describe('POST /api/notifications/activities', () => {
    it('should add user activity successfully', async () => {
      const activityData = {
        userId: 'user123',
        name: 'Visit Museum',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        location: 'Hong Kong Museum',
        type: 'cultural',
        isOutdoor: false,
        estimatedDuration: 120
      };

      const response = await request(app)
        .post('/api/notifications/activities')
        .send(activityData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Activity added successfully'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/notifications/activities')
        .send({
          userId: 'user123',
          name: 'Visit Museum'
          // Missing scheduledTime
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID, name, and scheduled time are required');
    });
  });

  describe('GET /api/notifications/stats/overview', () => {
    it('should return notification statistics', async () => {
      const response = await request(app)
        .get('/api/notifications/stats/overview');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
    });
  });

  describe('POST /api/notifications/process', () => {
    it('should process pending notifications', async () => {
      const response = await request(app)
        .post('/api/notifications/process');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Pending notifications processed'
      });
    });
  });

  describe('GET /api/notifications/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/notifications/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe('notification-service');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('GET /api/notifications/:notificationId', () => {
    it('should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .get('/api/notifications/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Notification not found');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .send({
          userId: 'user123',
          type: NotificationType.WEATHER_ALERT,
          title: 'Test',
          body: 'Test body'
        });

      expect(response.status).toBe(201);
    });
  });
});