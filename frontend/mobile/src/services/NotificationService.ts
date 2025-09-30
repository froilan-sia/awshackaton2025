import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationData, NotificationType } from '../types';

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notifications: NotificationData[] = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  static async initialize(): Promise<void> {
    const instance = NotificationService.getInstance();
    await instance.setupNotifications();
  }

  async setupNotifications(): Promise<void> {
    try {
      // Get push token
      this.expoPushToken = await this.registerForPushNotificationsAsync();
      
      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E31E24',
        });
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  }

  async sendLocalNotification(
    title: string,
    body: string,
    data?: any,
    type: NotificationType = NotificationType.LOCATION_CONTENT
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { ...data, type },
          sound: true,
        },
        trigger: null, // Send immediately
      });

      // Store notification in local state
      const notification: NotificationData = {
        id: Date.now().toString(),
        type,
        title,
        body,
        data,
        timestamp: new Date(),
        read: false,
      };
      
      this.notifications.unshift(notification);
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  async sendWeatherAlert(weatherCondition: string, recommendations: string[]): Promise<void> {
    const title = `Weather Update: ${weatherCondition}`;
    const body = `We've updated your recommendations based on current weather conditions.`;
    
    await this.sendLocalNotification(
      title,
      body,
      { recommendations, weatherCondition },
      NotificationType.WEATHER_ALERT
    );
  }

  async sendCrowdAlert(locationName: string, crowdLevel: string, alternatives: string[]): Promise<void> {
    const title = `Crowd Alert: ${locationName}`;
    const body = `${locationName} is currently ${crowdLevel}. Check out these alternatives!`;
    
    await this.sendLocalNotification(
      title,
      body,
      { locationName, crowdLevel, alternatives },
      NotificationType.CROWD_ALERT
    );
  }

  async sendLocationContent(locationName: string, content: string): Promise<void> {
    const title = `Welcome to ${locationName}`;
    const body = content.substring(0, 100) + (content.length > 100 ? '...' : '');
    
    await this.sendLocalNotification(
      title,
      body,
      { locationName, fullContent: content },
      NotificationType.LOCATION_CONTENT
    );
  }

  async sendEventReminder(eventName: string, startTime: Date, location: string): Promise<void> {
    const title = `Event Reminder: ${eventName}`;
    const body = `${eventName} starts soon at ${location}`;
    
    await this.sendLocalNotification(
      title,
      body,
      { eventName, startTime: startTime.toISOString(), location },
      NotificationType.EVENT_REMINDER
    );
  }

  async sendItineraryUpdate(message: string, itineraryId: string): Promise<void> {
    const title = 'Itinerary Updated';
    const body = message;
    
    await this.sendLocalNotification(
      title,
      body,
      { itineraryId },
      NotificationType.ITINERARY_UPDATE
    );
  }

  getNotifications(): NotificationData[] {
    return this.notifications;
  }

  markNotificationAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  clearAllNotifications(): void {
    this.notifications = [];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }

  private async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with actual project ID
      });
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }
}

export default NotificationService;