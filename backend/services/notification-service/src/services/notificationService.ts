import { Notification } from '../models/Notification';
import { NotificationTemplateManager } from '../models/NotificationTemplate';
import { PushNotificationService } from './pushNotificationService';
import { 
  NotificationPayload, 
  NotificationType, 
  NotificationPriority,
  NotificationStatus,
  UserNotificationPreferences 
} from '../types/notification';

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private userPreferences: Map<string, UserNotificationPreferences> = new Map();
  private pushService: PushNotificationService;

  constructor(pushService: PushNotificationService) {
    this.pushService = pushService;
  }

  public async createNotification(payload: Partial<NotificationPayload>): Promise<Notification> {
    const notification = new Notification(payload);
    this.notifications.set(notification.id, notification);
    
    // If no scheduled time, try to send immediately
    if (!notification.scheduledFor) {
      await this.processNotification(notification);
    }
    
    return notification;
  }

  public async createFromTemplate(
    type: NotificationType,
    userId: string,
    data: Record<string, any>,
    options?: {
      priority?: NotificationPriority;
      scheduledFor?: Date;
      expiresAt?: Date;
    }
  ): Promise<Notification | null> {
    const rendered = NotificationTemplateManager.renderTemplate(type, data);
    if (!rendered) {
      throw new Error(`No template found for notification type: ${type}`);
    }

    const template = NotificationTemplateManager.getTemplate(type);
    const notification = await this.createNotification({
      userId,
      type,
      title: rendered.title,
      body: rendered.body,
      data,
      priority: options?.priority || template?.defaultPriority || NotificationPriority.NORMAL,
      scheduledFor: options?.scheduledFor,
      expiresAt: options?.expiresAt
    });

    return notification;
  }

  public async processNotification(notification: Notification): Promise<boolean> {
    try {
      // Check if user has this notification type enabled
      if (!this.isNotificationAllowed(notification)) {
        notification.markAsExpired();
        return false;
      }

      // Check if it's quiet hours for the user
      if (this.isQuietHours(notification.userId)) {
        // Reschedule for after quiet hours unless it's urgent
        if (notification.priority !== NotificationPriority.URGENT) {
          this.rescheduleAfterQuietHours(notification);
          return false;
        }
      }

      // Send the notification
      const success = await this.pushService.sendNotification(notification);
      
      if (success) {
        notification.markAsSent();
        return true;
      } else {
        notification.markAsFailed();
        return false;
      }
    } catch (error) {
      console.error('Error processing notification:', error);
      notification.markAsFailed();
      return false;
    }
  }

  public async processPendingNotifications(): Promise<void> {
    const pendingNotifications = Array.from(this.notifications.values())
      .filter(n => n.shouldSendNow());

    for (const notification of pendingNotifications) {
      await this.processNotification(notification);
    }

    // Clean up expired notifications
    this.cleanupExpiredNotifications();
  }

  public getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  public getUserNotifications(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public setUserPreferences(preferences: UserNotificationPreferences): void {
    this.userPreferences.set(preferences.userId, preferences);
  }

  public getUserPreferences(userId: string): UserNotificationPreferences | undefined {
    return this.userPreferences.get(userId);
  }

  private isNotificationAllowed(notification: Notification): boolean {
    const preferences = this.getUserPreferences(notification.userId);
    if (!preferences) return true; // Default to allowing all notifications
    
    return preferences.enabledTypes.includes(notification.type);
  }

  private isQuietHours(userId: string): boolean {
    const preferences = this.getUserPreferences(userId);
    if (!preferences || !preferences.quietHours) return false;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    
    const { start, end } = preferences.quietHours;
    
    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  private rescheduleAfterQuietHours(notification: Notification): void {
    const preferences = this.getUserPreferences(notification.userId);
    if (!preferences || !preferences.quietHours) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
    const scheduleTime = new Date(now);
    scheduleTime.setHours(endHour, endMinute, 0, 0);
    
    // If end time is earlier in the day, schedule for tomorrow
    if (scheduleTime <= now) {
      scheduleTime.setDate(scheduleTime.getDate() + 1);
    }
    
    notification.scheduledFor = scheduleTime;
    notification.status = NotificationStatus.SCHEDULED;
  }

  private cleanupExpiredNotifications(): void {
    const expiredIds: string[] = [];
    
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.isExpired()) {
        notification.markAsExpired();
        expiredIds.push(id);
      }
    }
    
    // Remove expired notifications older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const id of expiredIds) {
      const notification = this.notifications.get(id);
      if (notification && notification.createdAt < oneDayAgo) {
        this.notifications.delete(id);
      }
    }
  }

  public getStats(): {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    expired: number;
  } {
    const notifications = Array.from(this.notifications.values());
    
    return {
      total: notifications.length,
      pending: notifications.filter(n => n.status === NotificationStatus.PENDING).length,
      sent: notifications.filter(n => n.status === NotificationStatus.SENT).length,
      failed: notifications.filter(n => n.status === NotificationStatus.FAILED).length,
      expired: notifications.filter(n => n.status === NotificationStatus.EXPIRED).length
    };
  }
}