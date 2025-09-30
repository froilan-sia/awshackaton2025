import { NotificationService } from './notificationService';
import { 
  NotificationType, 
  NotificationPriority, 
  EventReminderData,
  ActivityReminderData 
} from '../types/notification';

interface Event {
  id: string;
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  type: 'hktb' | 'mall' | 'community' | 'cultural';
  preparationTips?: string[];
  weatherDependent: boolean;
  targetAudience: string[];
}

interface Activity {
  id: string;
  userId: string;
  name: string;
  scheduledTime: Date;
  location: string;
  type: 'attraction' | 'dining' | 'shopping' | 'cultural' | 'outdoor';
  isOutdoor: boolean;
  preparationItems?: string[];
  weatherConsiderations?: string[];
  estimatedDuration: number; // in minutes
}

interface UserEventSubscription {
  userId: string;
  eventId: string;
  reminderPreferences: {
    dayBefore: boolean;
    hoursBeforeOptions: number[]; // e.g., [24, 4, 1]
    includePreparationTips: boolean;
    includeWeatherInfo: boolean;
  };
}

export class EventReminderService {
  private notificationService: NotificationService;
  private eventServiceUrl: string;
  private weatherServiceUrl: string;
  private eventSubscriptions: Map<string, UserEventSubscription[]> = new Map();
  private userActivities: Map<string, Activity[]> = new Map();

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
    this.eventServiceUrl = process.env.EVENT_SERVICE_URL || 'http://localhost:3004';
    this.weatherServiceUrl = process.env.WEATHER_SERVICE_URL || 'http://localhost:3008';
  }

  public async subscribeToEvent(subscription: UserEventSubscription): Promise<void> {
    const userSubscriptions = this.eventSubscriptions.get(subscription.userId) || [];
    
    // Remove existing subscription for the same event
    const filteredSubscriptions = userSubscriptions.filter(s => s.eventId !== subscription.eventId);
    filteredSubscriptions.push(subscription);
    
    this.eventSubscriptions.set(subscription.userId, filteredSubscriptions);
    
    // Schedule reminders for this event
    await this.scheduleEventReminders(subscription);
  }

  public async unsubscribeFromEvent(userId: string, eventId: string): Promise<void> {
    const userSubscriptions = this.eventSubscriptions.get(userId) || [];
    const filteredSubscriptions = userSubscriptions.filter(s => s.eventId !== eventId);
    
    if (filteredSubscriptions.length === 0) {
      this.eventSubscriptions.delete(userId);
    } else {
      this.eventSubscriptions.set(userId, filteredSubscriptions);
    }
  }

  public async addUserActivity(activity: Activity): Promise<void> {
    const userActivities = this.userActivities.get(activity.userId) || [];
    
    // Remove existing activity with same ID
    const filteredActivities = userActivities.filter(a => a.id !== activity.id);
    filteredActivities.push(activity);
    
    this.userActivities.set(activity.userId, filteredActivities);
    
    // Schedule reminders for this activity
    await this.scheduleActivityReminders(activity);
  }

  public async removeUserActivity(userId: string, activityId: string): Promise<void> {
    const userActivities = this.userActivities.get(userId) || [];
    const filteredActivities = userActivities.filter(a => a.id !== activityId);
    
    if (filteredActivities.length === 0) {
      this.userActivities.delete(userId);
    } else {
      this.userActivities.set(userId, filteredActivities);
    }
  }

  private async scheduleEventReminders(subscription: UserEventSubscription): Promise<void> {
    try {
      const event = await this.getEvent(subscription.eventId);
      if (!event) return;

      const { reminderPreferences } = subscription;
      
      // Schedule reminders based on user preferences
      for (const hoursBefore of reminderPreferences.hoursBeforeOptions) {
        const reminderTime = new Date(event.startTime.getTime() - hoursBefore * 60 * 60 * 1000);
        
        // Don't schedule reminders in the past
        if (reminderTime <= new Date()) continue;

        await this.createEventReminder(subscription.userId, event, hoursBefore, reminderPreferences);
      }

      // Schedule day-before reminder if requested
      if (reminderPreferences.dayBefore) {
        const dayBeforeTime = new Date(event.startTime.getTime() - 24 * 60 * 60 * 1000);
        if (dayBeforeTime > new Date()) {
          await this.createEventReminder(subscription.userId, event, 24, reminderPreferences);
        }
      }
    } catch (error) {
      console.error('Error scheduling event reminders:', error);
    }
  }

  private async createEventReminder(
    userId: string, 
    event: Event, 
    hoursBefore: number,
    preferences: UserEventSubscription['reminderPreferences']
  ): Promise<void> {
    const reminderTime = new Date(event.startTime.getTime() - hoursBefore * 60 * 60 * 1000);
    
    let weatherInfo = '';
    if (preferences.includeWeatherInfo && event.weatherDependent) {
      weatherInfo = await this.getWeatherForEvent(event);
    }

    const eventData: EventReminderData = {
      eventId: event.id,
      eventName: event.name,
      startTime: event.startTime,
      location: event.location,
      preparationTips: preferences.includePreparationTips ? event.preparationTips : undefined
    };

    await this.notificationService.createFromTemplate(
      NotificationType.EVENT_REMINDER,
      userId,
      {
        eventName: event.name,
        timeUntil: this.formatTimeUntil(hoursBefore),
        location: event.location,
        preparationTips: eventData.preparationTips?.join(', ') || '',
        weatherInfo
      },
      {
        priority: this.determineEventPriority(hoursBefore, event.type),
        scheduledFor: reminderTime,
        expiresAt: new Date(event.endTime.getTime() + 60 * 60 * 1000) // 1 hour after event ends
      }
    );
  }

  private async scheduleActivityReminders(activity: Activity): Promise<void> {
    try {
      // Schedule reminder 1 hour before activity
      const oneHourBefore = new Date(activity.scheduledTime.getTime() - 60 * 60 * 1000);
      if (oneHourBefore > new Date()) {
        await this.createActivityReminder(activity, 1);
      }

      // Schedule reminder 30 minutes before for outdoor activities
      if (activity.isOutdoor) {
        const thirtyMinBefore = new Date(activity.scheduledTime.getTime() - 30 * 60 * 1000);
        if (thirtyMinBefore > new Date()) {
          await this.createActivityReminder(activity, 0.5);
        }
      }
    } catch (error) {
      console.error('Error scheduling activity reminders:', error);
    }
  }

  private async createActivityReminder(activity: Activity, hoursBefore: number): Promise<void> {
    const reminderTime = new Date(activity.scheduledTime.getTime() - hoursBefore * 60 * 60 * 1000);
    
    let weatherCondition = '';
    let preparationTip = '';
    
    if (activity.isOutdoor || activity.weatherConsiderations) {
      weatherCondition = await this.getWeatherForActivity(activity);
      preparationTip = this.getPreparationTip(activity, weatherCondition);
    }

    const activityData: ActivityReminderData = {
      activityId: activity.id,
      activityName: activity.name,
      scheduledTime: activity.scheduledTime,
      location: activity.location,
      weatherConsiderations: activity.weatherConsiderations,
      preparationItems: activity.preparationItems
    };

    await this.notificationService.createFromTemplate(
      NotificationType.ACTIVITY_REMINDER,
      activity.userId,
      {
        activityName: activity.name,
        timeUntil: this.formatTimeUntil(hoursBefore),
        location: activity.location,
        weatherCondition: weatherCondition || 'good',
        preparationTip
      },
      {
        priority: this.determineActivityPriority(hoursBefore, activity.type),
        scheduledFor: reminderTime,
        expiresAt: new Date(activity.scheduledTime.getTime() + activity.estimatedDuration * 60 * 1000)
      }
    );
  }

  private async getEvent(eventId: string): Promise<Event | null> {
    try {
      const response = await fetch(`${this.eventServiceUrl}/api/events/${eventId}`);
      const data = await response.json() as { event?: any };
      
      if (data.event) {
        return {
          ...data.event,
          startTime: new Date(data.event.startTime),
          endTime: new Date(data.event.endTime)
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  }

  private async getWeatherForEvent(event: Event): Promise<string> {
    try {
      const response = await fetch(`${this.weatherServiceUrl}/api/weather/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetTime: event.startTime.toISOString(),
          location: event.location
        })
      });
      
      const data = await response.json() as { weather?: any };
      return this.formatWeatherInfo(data.weather);
    } catch (error) {
      console.error('Error fetching weather for event:', error);
      return 'Weather information unavailable';
    }
  }

  private async getWeatherForActivity(activity: Activity): Promise<string> {
    try {
      const response = await fetch(`${this.weatherServiceUrl}/api/weather/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetTime: activity.scheduledTime.toISOString(),
          location: activity.location
        })
      });
      
      const data = await response.json() as { weather?: { condition?: string } };
      return data.weather?.condition || 'clear';
    } catch (error) {
      console.error('Error fetching weather for activity:', error);
      return 'clear';
    }
  }

  private formatWeatherInfo(weather: any): string {
    if (!weather) return '';
    
    let info = weather.condition || 'clear';
    if (weather.temperature) {
      info += `, ${weather.temperature}°C`;
    }
    if (weather.precipitation > 0) {
      info += `, ${weather.precipitation}mm rain expected`;
    }
    return info;
  }

  private getPreparationTip(activity: Activity, weatherCondition: string): string {
    const tips: string[] = [];
    
    if (activity.preparationItems && activity.preparationItems.length > 0) {
      tips.push(`Bring: ${activity.preparationItems.join(', ')}`);
    }
    
    if (weatherCondition.includes('rain')) {
      tips.push('Bring an umbrella');
    } else if (weatherCondition.includes('hot') || weatherCondition.includes('sunny')) {
      tips.push('Bring sun protection');
    } else if (weatherCondition.includes('cold')) {
      tips.push('Dress warmly');
    }
    
    if (activity.weatherConsiderations && activity.weatherConsiderations.length > 0) {
      tips.push(...activity.weatherConsiderations);
    }
    
    return tips.join('. ');
  }

  private determineEventPriority(hoursBefore: number, eventType: string): NotificationPriority {
    if (hoursBefore <= 1) {
      return NotificationPriority.HIGH;
    } else if (hoursBefore <= 4) {
      return NotificationPriority.NORMAL;
    } else {
      return NotificationPriority.LOW;
    }
  }

  private determineActivityPriority(hoursBefore: number, activityType: string): NotificationPriority {
    if (hoursBefore <= 0.5) {
      return NotificationPriority.HIGH;
    } else if (hoursBefore <= 1) {
      return NotificationPriority.NORMAL;
    } else {
      return NotificationPriority.LOW;
    }
  }

  private formatTimeUntil(hours: number): string {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} minutes`;
    } else if (hours === 1) {
      return '1 hour';
    } else if (hours < 24) {
      return `${Math.round(hours)} hours`;
    } else {
      const days = Math.round(hours / 24);
      return days === 1 ? '1 day' : `${days} days`;
    }
  }

  public async processUpcomingReminders(): Promise<void> {
    // This method would be called by a cron job to process all upcoming reminders
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Process event reminders
    for (const [userId, subscriptions] of this.eventSubscriptions.entries()) {
      for (const subscription of subscriptions) {
        try {
          const event = await this.getEvent(subscription.eventId);
          if (event && event.startTime <= next24Hours && event.startTime > now) {
            // Check if we need to send any reminders for this event
            await this.scheduleEventReminders(subscription);
          }
        } catch (error) {
          console.error(`Error processing event reminder for user ${userId}:`, error);
        }
      }
    }

    // Process activity reminders
    for (const [userId, activities] of this.userActivities.entries()) {
      for (const activity of activities) {
        if (activity.scheduledTime <= next24Hours && activity.scheduledTime > now) {
          try {
            await this.scheduleActivityReminders(activity);
          } catch (error) {
            console.error(`Error processing activity reminder for user ${userId}:`, error);
          }
        }
      }
    }
  }

  public getUserEventSubscriptions(userId: string): UserEventSubscription[] {
    return this.eventSubscriptions.get(userId) || [];
  }

  public getUserActivities(userId: string): Activity[] {
    return this.userActivities.get(userId) || [];
  }
}