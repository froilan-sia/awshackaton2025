import * as admin from 'firebase-admin';
import { Notification } from '../models/Notification';
import { NotificationTemplateManager } from '../models/NotificationTemplate';
import { PushNotificationRequest } from '../types/notification';

export class PushNotificationService {
  private firebaseApp: admin.app.App | null = null;
  private userTokens: Map<string, string[]> = new Map();

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.firebaseApp = admin.apps[0];
        return;
      }

      // Check if all required Firebase environment variables are present
      const requiredEnvVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn(`Firebase initialization skipped. Missing environment variables: ${missingVars.join(', ')}`);
        console.warn('Push notifications will not be available. Please configure Firebase credentials.');
        return;
      }

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID!,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        tokenUri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      };

      // Validate that we have the minimum required fields
      if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        throw new Error('Missing required Firebase service account fields');
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });

      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      console.warn('Push notifications will not be available. Please check Firebase configuration.');
      this.firebaseApp = null;
    }
  }

  public async sendNotification(notification: Notification): Promise<boolean> {
    if (!this.firebaseApp) {
      console.warn('Firebase not initialized. Cannot send push notification.');
      console.warn('Notification would have been sent:', {
        title: notification.title,
        body: notification.body,
        userId: notification.userId
      });
      return false;
    }

    const userTokens = this.getUserTokens(notification.userId);
    if (userTokens.length === 0) {
      console.warn(`No push tokens found for user: ${notification.userId}`);
      return false;
    }

    const template = NotificationTemplateManager.getTemplate(notification.type);
    const pushRequest = this.buildPushRequest(notification, template?.channelId, template?.sound);

    try {
      const results = await Promise.allSettled(
        userTokens.map(token => this.sendToToken({ ...pushRequest, token }))
      );

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.length - successCount;

      if (failureCount > 0) {
        console.warn(`Failed to send notification to ${failureCount} out of ${results.length} tokens`);
      }

      // Consider it successful if at least one token received the notification
      return successCount > 0;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  private async sendToToken(request: PushNotificationRequest): Promise<string> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    const message: admin.messaging.Message = {
      token: request.token,
      notification: request.notification,
      data: request.data,
      android: request.android ? {
        priority: request.android.priority,
        notification: {
          sound: request.android.notification.sound,
          channelId: request.android.notification.channelId,
        }
      } : undefined,
      apns: request.apns ? {
        payload: {
          aps: {
            sound: request.apns.payload.aps.sound,
            badge: request.apns.payload.aps.badge,
          }
        }
      } : undefined,
    };

    return await admin.messaging().send(message);
  }

  private buildPushRequest(
    notification: Notification, 
    channelId?: string, 
    sound?: string
  ): Omit<PushNotificationRequest, 'token'> {
    return {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data ? this.convertDataToStrings(notification.data) : undefined,
      android: {
        priority: this.mapPriorityToAndroid(notification.priority),
        notification: {
          sound: sound || 'default',
          channelId: channelId || 'default',
        }
      },
      apns: {
        payload: {
          aps: {
            sound: sound || 'default',
            badge: 1,
          }
        }
      }
    };
  }

  private convertDataToStrings(data: Record<string, any>): Record<string, string> {
    const stringData: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return stringData;
  }

  private mapPriorityToAndroid(priority: string): 'normal' | 'high' {
    return priority === 'urgent' || priority === 'high' ? 'high' : 'normal';
  }

  public registerUserToken(userId: string, token: string): void {
    const existingTokens = this.userTokens.get(userId) || [];
    if (!existingTokens.includes(token)) {
      existingTokens.push(token);
      this.userTokens.set(userId, existingTokens);
    }
  }

  public unregisterUserToken(userId: string, token: string): void {
    const existingTokens = this.userTokens.get(userId) || [];
    const updatedTokens = existingTokens.filter(t => t !== token);
    
    if (updatedTokens.length === 0) {
      this.userTokens.delete(userId);
    } else {
      this.userTokens.set(userId, updatedTokens);
    }
  }

  public getUserTokens(userId: string): string[] {
    return this.userTokens.get(userId) || [];
  }

  public async validateToken(token: string): Promise<boolean> {
    if (!this.firebaseApp) {
      console.warn('Firebase not initialized. Cannot validate token.');
      return false;
    }

    try {
      // Try to send a test message to validate the token
      await admin.messaging().send({
        token,
        data: { test: 'true' }
      }, true); // dry run
      return true;
    } catch (error) {
      return false;
    }
  }

  public async cleanupInvalidTokens(): Promise<void> {
    const allTokens = new Map<string, string[]>();
    
    // Collect all tokens with their user IDs
    for (const [userId, tokens] of this.userTokens.entries()) {
      for (const token of tokens) {
        if (!allTokens.has(token)) {
          allTokens.set(token, []);
        }
        allTokens.get(token)!.push(userId);
      }
    }

    // Validate tokens in batches
    const tokenValidationPromises = Array.from(allTokens.keys()).map(async (token) => {
      const isValid = await this.validateToken(token);
      return { token, isValid, userIds: allTokens.get(token)! };
    });

    const results = await Promise.allSettled(tokenValidationPromises);
    
    // Remove invalid tokens
    for (const result of results) {
      if (result.status === 'fulfilled' && !result.value.isValid) {
        const { token, userIds } = result.value;
        for (const userId of userIds) {
          this.unregisterUserToken(userId, token);
        }
      }
    }
  }
}