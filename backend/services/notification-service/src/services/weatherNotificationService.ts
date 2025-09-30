import { NotificationService } from './notificationService';
import { 
  NotificationType, 
  NotificationPriority, 
  WeatherAlertData 
} from '../types/notification';

interface WeatherCondition {
  condition: string;
  severity: 'low' | 'medium' | 'high';
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
}

interface UserActivity {
  id: string;
  userId: string;
  name: string;
  scheduledTime: Date;
  location: string;
  isOutdoor: boolean;
  weatherSensitive: boolean;
}

export class WeatherNotificationService {
  private notificationService: NotificationService;
  private weatherServiceUrl: string;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
    this.weatherServiceUrl = process.env.WEATHER_SERVICE_URL || 'http://localhost:3008';
  }

  public async checkWeatherAndNotify(userId: string, activities: UserActivity[]): Promise<void> {
    try {
      const currentWeather = await this.getCurrentWeather();
      const forecast = await this.getWeatherForecast(24); // 24 hour forecast

      for (const activity of activities) {
        await this.evaluateActivityWeather(activity, currentWeather, forecast);
      }
    } catch (error) {
      console.error('Error checking weather for notifications:', error);
    }
  }

  private async evaluateActivityWeather(
    activity: UserActivity, 
    currentWeather: WeatherCondition,
    forecast: WeatherCondition[]
  ): Promise<void> {
    if (!activity.weatherSensitive && !activity.isOutdoor) {
      return; // Indoor, non-weather-sensitive activities don't need weather alerts
    }

    const activityTime = activity.scheduledTime;
    const hoursUntilActivity = (activityTime.getTime() - Date.now()) / (1000 * 60 * 60);

    // Only send notifications for activities within the next 24 hours
    if (hoursUntilActivity < 0 || hoursUntilActivity > 24) {
      return;
    }

    const relevantWeather = this.getWeatherForTime(forecast, activityTime);
    const weatherIssues = this.identifyWeatherIssues(activity, relevantWeather);

    if (weatherIssues.length > 0) {
      await this.sendWeatherAlert(activity, relevantWeather, weatherIssues);
    }
  }

  private async sendWeatherAlert(
    activity: UserActivity, 
    weather: WeatherCondition,
    issues: string[]
  ): Promise<void> {
    const alternatives = await this.getIndoorAlternatives(activity.location);
    
    const alertData: WeatherAlertData = {
      weatherCondition: weather.condition,
      severity: weather.severity,
      affectedActivities: [activity.name],
      alternatives: alternatives
    };

    const priority = this.determineWeatherPriority(weather.severity, issues);
    const scheduledFor = this.calculateNotificationTime(activity.scheduledTime);

    await this.notificationService.createFromTemplate(
      NotificationType.WEATHER_ALERT,
      activity.userId,
      {
        weatherCondition: this.formatWeatherCondition(weather),
        alternativeCount: alternatives.length,
        activityName: activity.name,
        timeUntil: this.formatTimeUntil(activity.scheduledTime),
        issues: issues.join(', ')
      },
      {
        priority,
        scheduledFor,
        expiresAt: new Date(activity.scheduledTime.getTime() + 2 * 60 * 60 * 1000) // Expire 2 hours after activity
      }
    );
  }

  private identifyWeatherIssues(activity: UserActivity, weather: WeatherCondition): string[] {
    const issues: string[] = [];

    if (activity.isOutdoor) {
      if (weather.precipitation > 5) {
        issues.push('heavy rain expected');
      }
      if (weather.windSpeed > 25) {
        issues.push('strong winds');
      }
      if (weather.temperature > 35) {
        issues.push('extreme heat');
      }
      if (weather.temperature < 5) {
        issues.push('very cold conditions');
      }
      if (weather.humidity > 85) {
        issues.push('high humidity');
      }
    }

    if (activity.weatherSensitive) {
      if (weather.condition.includes('storm') || weather.condition.includes('typhoon')) {
        issues.push('severe weather warning');
      }
      if (weather.precipitation > 2) {
        issues.push('rain likely');
      }
    }

    return issues;
  }

  private determineWeatherPriority(severity: string, issues: string[]): NotificationPriority {
    if (severity === 'high' || issues.some(issue => 
      issue.includes('severe') || issue.includes('extreme') || issue.includes('typhoon')
    )) {
      return NotificationPriority.URGENT;
    }
    
    if (severity === 'medium' || issues.length > 2) {
      return NotificationPriority.HIGH;
    }
    
    return NotificationPriority.NORMAL;
  }

  private calculateNotificationTime(activityTime: Date): Date {
    const hoursUntilActivity = (activityTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    if (hoursUntilActivity > 12) {
      // Send notification 12 hours before
      return new Date(activityTime.getTime() - 12 * 60 * 60 * 1000);
    } else if (hoursUntilActivity > 4) {
      // Send notification 4 hours before
      return new Date(activityTime.getTime() - 4 * 60 * 60 * 1000);
    } else if (hoursUntilActivity > 1) {
      // Send notification 1 hour before
      return new Date(activityTime.getTime() - 60 * 60 * 1000);
    } else {
      // Send immediately
      return new Date();
    }
  }

  private getWeatherForTime(forecast: WeatherCondition[], targetTime: Date): WeatherCondition {
    // Find the forecast entry closest to the target time
    // For simplicity, we'll use the current weather if no specific forecast is available
    return forecast.length > 0 ? forecast[0] : {
      condition: 'unknown',
      severity: 'low' as const,
      temperature: 25,
      humidity: 60,
      windSpeed: 10,
      precipitation: 0
    };
  }

  private async getCurrentWeather(): Promise<WeatherCondition> {
    try {
      const response = await fetch(`${this.weatherServiceUrl}/api/weather/current`);
      const data = await response.json() as any;
      
      return {
        condition: data.condition || 'clear',
        severity: this.mapWeatherSeverity(data),
        temperature: data.temperature || 25,
        humidity: data.humidity || 60,
        windSpeed: data.windSpeed || 10,
        precipitation: data.precipitation || 0
      };
    } catch (error) {
      console.error('Error fetching current weather:', error);
      // Return default weather condition
      return {
        condition: 'unknown',
        severity: 'low',
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        precipitation: 0
      };
    }
  }

  private async getWeatherForecast(hours: number): Promise<WeatherCondition[]> {
    try {
      const response = await fetch(`${this.weatherServiceUrl}/api/weather/forecast?hours=${hours}`);
      const data = await response.json() as { forecast?: any[] };
      
      return data.forecast?.map((item: any) => ({
        condition: item.condition || 'clear',
        severity: this.mapWeatherSeverity(item),
        temperature: item.temperature || 25,
        humidity: item.humidity || 60,
        windSpeed: item.windSpeed || 10,
        precipitation: item.precipitation || 0
      })) || [];
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return [];
    }
  }

  private mapWeatherSeverity(weatherData: any): 'low' | 'medium' | 'high' {
    const { condition, windSpeed, precipitation } = weatherData;
    
    if (condition?.includes('typhoon') || condition?.includes('storm') || 
        windSpeed > 40 || precipitation > 20) {
      return 'high';
    }
    
    if (condition?.includes('rain') || condition?.includes('thunder') || 
        windSpeed > 20 || precipitation > 5) {
      return 'medium';
    }
    
    return 'low';
  }

  private async getIndoorAlternatives(location: string): Promise<Array<{id: string, name: string, type: string}>> {
    try {
      // This would typically call the recommendation service or location service
      // For now, return mock alternatives
      return [
        { id: 'mall_1', name: 'IFC Mall', type: 'shopping' },
        { id: 'museum_1', name: 'Hong Kong Museum of History', type: 'museum' },
        { id: 'market_1', name: 'Temple Street Night Market (covered areas)', type: 'market' }
      ];
    } catch (error) {
      console.error('Error fetching indoor alternatives:', error);
      return [];
    }
  }

  private formatWeatherCondition(weather: WeatherCondition): string {
    let description = weather.condition;
    
    if (weather.precipitation > 0) {
      description += ` with ${weather.precipitation}mm rain`;
    }
    
    if (weather.windSpeed > 20) {
      description += `, windy (${weather.windSpeed}km/h)`;
    }
    
    return description;
  }

  private formatTimeUntil(targetTime: Date): string {
    const hoursUntil = Math.round((targetTime.getTime() - Date.now()) / (1000 * 60 * 60));
    
    if (hoursUntil < 1) {
      return 'less than 1 hour';
    } else if (hoursUntil === 1) {
      return '1 hour';
    } else {
      return `${hoursUntil} hours`;
    }
  }
}