export interface NotificationPayload {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  createdAt: Date;
  sentAt?: Date;
  status: NotificationStatus;
}

export enum NotificationType {
  WEATHER_ALERT = 'weather_alert',
  CROWD_ALERT = 'crowd_alert',
  EVENT_REMINDER = 'event_reminder',
  ACTIVITY_REMINDER = 'activity_reminder',
  ITINERARY_UPDATE = 'itinerary_update',
  SAFETY_ALERT = 'safety_alert',
  CULTURAL_TIP = 'cultural_tip'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface WeatherAlertData {
  weatherCondition: string;
  severity: string;
  affectedActivities: string[];
  alternatives: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export interface CrowdAlertData {
  locationId: string;
  locationName: string;
  crowdLevel: string;
  estimatedWaitTime: number;
  alternatives: Array<{
    id: string;
    name: string;
    crowdLevel: string;
    distance: number;
  }>;
}

export interface EventReminderData {
  eventId: string;
  eventName: string;
  startTime: Date;
  location: string;
  preparationTips?: string[];
}

export interface ActivityReminderData {
  activityId: string;
  activityName: string;
  scheduledTime: Date;
  location: string;
  weatherConsiderations?: string[];
  preparationItems?: string[];
}

export interface PushNotificationRequest {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: 'normal' | 'high';
    notification: {
      sound: string;
      channelId: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        sound: string;
        badge?: number;
      };
    };
  };
}

export interface NotificationTemplate {
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  defaultPriority: NotificationPriority;
  channelId: string;
  sound: string;
}

export interface UserNotificationPreferences {
  userId: string;
  enabledTypes: NotificationType[];
  quietHours: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  timezone: string;
  language: string;
}