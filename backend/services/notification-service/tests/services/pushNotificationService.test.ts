import { PushNotificationService } from '../../src/services/pushNotificationService';
import { Notification } from '../../src/models/Notification';
import { NotificationType, NotificationPriority } from '../../src/types/notification';
import * as admin from 'firebase-admin';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  messaging: jest.fn(() => ({
    send: jest.fn()
  }))
}));

describe('PushNotificationService', () => {
  let pushService: PushNotificationService;
  let mockMessaging: jest.Mocked<admin.messaging.Messaging>;

  beforeEach(() => {
    // Setup environment variables
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_PRIVATE_KEY_ID = 'test-key-id';
    process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_CLIENT_ID = 'test-client-id';

    mockMessaging = {
      send: jest.fn()
    } as any;

    (admin.messaging as jest.Mock).mockReturnValue(mockMessaging);
    
    pushService = new PushNotificationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUserToken', () => {
    it('should register a new token for user', () => {
      const userId = 'user123';
      const token = 'device-token-123';

      pushService.registerUserToken(userId, token);

      const userTokens = pushService.getUserTokens(userId);
      expect(userTokens).toContain(token);
    });

    it('should not duplicate tokens for the same user', () => {
      const userId = 'user123';
      const token = 'device-token-123';

      pushService.registerUserToken(userId, token);
      pushService.registerUserToken(userId, token); // Register same token again

      const userTokens = pushService.getUserTokens(userId);
      expect(userTokens).toHaveLength(1);
      expect(userTokens[0]).toBe(token);
    });

    it('should allow multiple tokens for the same user', () => {
      const userId = 'user123';
      const token1 = 'device-token-123';
      const token2 = 'device-token-456';

      pushService.registerUserToken(userId, token1);
      pushService.registerUserToken(userId, token2);

      const userTokens = pushService.getUserTokens(userId);
      expect(userTokens).toHaveLength(2);
      expect(userTokens).toContain(token1);
      expect(userTokens).toContain(token2);
    });
  });

  describe('unregisterUserToken', () => {
    it('should remove specific token from user', () => {
      const userId = 'user123';
      const token1 = 'device-token-123';
      const token2 = 'device-token-456';

      pushService.registerUserToken(userId, token1);
      pushService.registerUserToken(userId, token2);
      pushService.unregisterUserToken(userId, token1);

      const userTokens = pushService.getUserTokens(userId);
      expect(userTokens).toHaveLength(1);
      expect(userTokens[0]).toBe(token2);
    });

    it('should remove user entry when no tokens remain', () => {
      const userId = 'user123';
      const token = 'device-token-123';

      pushService.registerUserToken(userId, token);
      pushService.unregisterUserToken(userId, token);

      const userTokens = pushService.getUserTokens(userId);
      expect(userTokens).toHaveLength(0);
    });
  });

  describe('sendNotification', () => {
    beforeEach(() => {
      mockMessaging.send.mockResolvedValue('message-id-123');
    });

    it('should send notification to all user tokens', async () => {
      const userId = 'user123';
      const token1 = 'device-token-123';
      const token2 = 'device-token-456';

      pushService.registerUserToken(userId, token1);
      pushService.registerUserToken(userId, token2);

      const notification = new Notification({
        userId,
        type: NotificationType.WEATHER_ALERT,
        title: 'Weather Alert',
        body: 'Rain expected',
        priority: NotificationPriority.HIGH
      });

      const result = await pushService.sendNotification(notification);

      expect(result).toBe(true);
      expect(mockMessaging.send).toHaveBeenCalledTimes(2);
    });

    it('should return false when no tokens are registered', async () => {
      const notification = new Notification({
        userId: 'user-no-tokens',
        type: NotificationType.WEATHER_ALERT,
        title: 'Weather Alert',
        body: 'Rain expected'
      });

      const result = await pushService.sendNotification(notification);

      expect(result).toBe(false);
      expect(mockMessaging.send).not.toHaveBeenCalled();
    });

    it('should return true if at least one token succeeds', async () => {
      const userId = 'user123';
      const token1 = 'device-token-123';
      const token2 = 'device-token-456';

      pushService.registerUserToken(userId, token1);
      pushService.registerUserToken(userId, token2);

      // Mock one success and one failure
      mockMessaging.send
        .mockResolvedValueOnce('message-id-123')
        .mockRejectedValueOnce(new Error('Token invalid'));

      const notification = new Notification({
        userId,
        type: NotificationType.WEATHER_ALERT,
        title: 'Weather Alert',
        body: 'Rain expected'
      });

      const result = await pushService.sendNotification(notification);

      expect(result).toBe(true);
      expect(mockMessaging.send).toHaveBeenCalledTimes(2);
    });

    it('should return false if all tokens fail', async () => {
      const userId = 'user123';
      const token = 'device-token-123';

      pushService.registerUserToken(userId, token);

      mockMessaging.send.mockRejectedValue(new Error('All tokens invalid'));

      const notification = new Notification({
        userId,
        type: NotificationType.WEATHER_ALERT,
        title: 'Weather Alert',
        body: 'Rain expected'
      });

      const result = await pushService.sendNotification(notification);

      expect(result).toBe(false);
    });

    it('should include notification data in the message', async () => {
      const userId = 'user123';
      const token = 'device-token-123';

      pushService.registerUserToken(userId, token);

      const notification = new Notification({
        userId,
        type: NotificationType.CROWD_ALERT,
        title: 'Crowd Alert',
        body: 'Location is busy',
        data: {
          locationId: 'loc123',
          crowdLevel: 'high',
          alternatives: ['alt1', 'alt2']
        }
      });

      await pushService.sendNotification(notification);

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          token,
          notification: {
            title: 'Crowd Alert',
            body: 'Location is busy'
          },
          data: {
            locationId: 'loc123',
            crowdLevel: 'high',
            alternatives: '["alt1","alt2"]' // JSON stringified
          }
        })
      );
    });

    it('should set correct priority for Android', async () => {
      const userId = 'user123';
      const token = 'device-token-123';

      pushService.registerUserToken(userId, token);

      const urgentNotification = new Notification({
        userId,
        type: NotificationType.SAFETY_ALERT,
        title: 'Safety Alert',
        body: 'Urgent safety information',
        priority: NotificationPriority.URGENT
      });

      await pushService.sendNotification(urgentNotification);

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            priority: 'high'
          })
        })
      );
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      const token = 'valid-token';
      mockMessaging.send.mockResolvedValue('test-message-id');

      const isValid = await pushService.validateToken(token);

      expect(isValid).toBe(true);
      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          token,
          data: { test: 'true' }
        }),
        true // dry run
      );
    });

    it('should return false for invalid token', async () => {
      const token = 'invalid-token';
      mockMessaging.send.mockRejectedValue(new Error('Invalid token'));

      const isValid = await pushService.validateToken(token);

      expect(isValid).toBe(false);
    });
  });

  describe('cleanupInvalidTokens', () => {
    it('should remove invalid tokens from users', async () => {
      const userId1 = 'user1';
      const userId2 = 'user2';
      const validToken = 'valid-token';
      const invalidToken = 'invalid-token';

      pushService.registerUserToken(userId1, validToken);
      pushService.registerUserToken(userId1, invalidToken);
      pushService.registerUserToken(userId2, invalidToken);

      // Mock validation responses
      mockMessaging.send
        .mockImplementation((message: any, dryRun?: boolean) => {
          if (message.token === validToken) {
            return Promise.resolve('message-id');
          } else {
            return Promise.reject(new Error('Invalid token'));
          }
        });

      await pushService.cleanupInvalidTokens();

      // Valid token should remain
      expect(pushService.getUserTokens(userId1)).toContain(validToken);
      expect(pushService.getUserTokens(userId1)).not.toContain(invalidToken);
      
      // User2 should have no tokens left
      expect(pushService.getUserTokens(userId2)).toHaveLength(0);
    });
  });
});