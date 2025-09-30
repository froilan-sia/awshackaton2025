import cron from 'node-cron';
import { WeatherService } from './weatherService';
import { WeatherRecommendationService } from './weatherRecommendationService';
import {
  WeatherAlert,
  WeatherAlertType,
  AlertSeverity,
  CurrentWeather,
  WeatherForecast
} from '../types/weather';

interface AlertSubscription {
  userId: string;
  alertTypes: WeatherAlertType[];
  location: { lat: number; lon: number };
  callback: (alert: WeatherAlert) => void;
}

export class WeatherAlertService {
  private weatherService: WeatherService;
  private recommendationService: WeatherRecommendationService;
  private subscriptions: Map<string, AlertSubscription> = new Map();
  private activeAlerts: Map<string, WeatherAlert> = new Map();
  private isRunning = false;

  constructor(weatherService: WeatherService, recommendationService: WeatherRecommendationService) {
    this.weatherService = weatherService;
    this.recommendationService = recommendationService;
  }

  startAlertMonitoring(): void {
    if (this.isRunning) return;

    // Check for weather alerts every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      await this.checkWeatherAlerts();
    });

    this.isRunning = true;
    console.log('Weather alert monitoring started');
  }

  stopAlertMonitoring(): void {
    this.isRunning = false;
    console.log('Weather alert monitoring stopped');
  }

  subscribe(subscription: AlertSubscription): void {
    this.subscriptions.set(subscription.userId, subscription);
  }

  unsubscribe(userId: string): void {
    this.subscriptions.delete(userId);
  }

  async checkWeatherAlerts(): Promise<void> {
    const uniqueLocations = new Map<string, { lat: number; lon: number }>();
    
    // Collect unique locations from subscriptions
    this.subscriptions.forEach(sub => {
      const key = `${sub.location.lat}_${sub.location.lon}`;
      uniqueLocations.set(key, sub.location);
    });

    // Check weather for each unique location
    for (const [locationKey, location] of uniqueLocations) {
      try {
        await this.checkLocationAlerts(location.lat, location.lon);
      } catch (error) {
        console.error(`Error checking alerts for location ${locationKey}:`, error);
      }
    }
  }

  private async checkLocationAlerts(lat: number, lon: number): Promise<void> {
    try {
      const currentWeather = await this.weatherService.getCurrentWeather(lat, lon);
      const forecast = await this.weatherService.getWeatherForecast(lat, lon, 2);
      
      const alerts = await this.generateAlerts(currentWeather, forecast);
      
      // Process new alerts
      alerts.forEach(alert => {
        const existingAlert = this.activeAlerts.get(alert.id);
        
        if (!existingAlert || this.hasAlertChanged(existingAlert, alert)) {
          this.activeAlerts.set(alert.id, alert);
          this.notifySubscribers(alert, lat, lon);
        }
      });

      // Clean up expired alerts
      this.cleanupExpiredAlerts();
      
    } catch (error) {
      console.error('Error checking location alerts:', error);
    }
  }

  private async generateAlerts(currentWeather: CurrentWeather, forecast: WeatherForecast[]): Promise<WeatherAlert[]> {
    const alerts: WeatherAlert[] = [];
    const now = new Date();

    // Extreme heat alert
    if (currentWeather.temperature > 35) {
      alerts.push({
        id: `heat_${currentWeather.location}_${now.getTime()}`,
        type: WeatherAlertType.EXTREME_HEAT,
        severity: currentWeather.temperature > 38 ? AlertSeverity.EXTREME : AlertSeverity.HIGH,
        title: 'Extreme Heat Warning',
        description: `Temperature is ${currentWeather.temperature}°C. Heat exhaustion risk is high.`,
        startTime: now,
        endTime: new Date(now.getTime() + 6 * 60 * 60 * 1000), // 6 hours
        affectedActivities: ['outdoor_hiking', 'beach_activities', 'walking_tours', 'outdoor_dining'],
        recommendations: [
          'Stay in air-conditioned areas during peak hours (11 AM - 4 PM)',
          'Drink water frequently, even if not thirsty',
          'Wear light-colored, loose-fitting clothing',
          'Use sunscreen SPF 30 or higher',
          'Take frequent breaks in shade'
        ]
      });
    }

    // Heavy rain alert
    const heavyRainForecast = forecast.find(f => f.precipitationChance > 80 && f.precipitationAmount && f.precipitationAmount > 10);
    if (heavyRainForecast) {
      alerts.push({
        id: `rain_${currentWeather.location}_${heavyRainForecast.date.getTime()}`,
        type: WeatherAlertType.HEAVY_RAIN,
        severity: heavyRainForecast.precipitationAmount! > 25 ? AlertSeverity.HIGH : AlertSeverity.MODERATE,
        title: 'Heavy Rain Warning',
        description: `Heavy rainfall expected with ${heavyRainForecast.precipitationChance}% chance of rain.`,
        startTime: now,
        endTime: new Date(heavyRainForecast.date.getTime() + 12 * 60 * 60 * 1000),
        affectedActivities: ['outdoor_hiking', 'beach_activities', 'walking_tours', 'sightseeing'],
        recommendations: [
          'Carry a sturdy umbrella',
          'Wear waterproof clothing and non-slip shoes',
          'Avoid hiking trails and elevated areas',
          'Consider indoor alternatives like museums and shopping malls',
          'Be cautious of flooding in low-lying areas'
        ]
      });
    }

    // Strong wind alert
    if (currentWeather.windSpeed > 15) {
      alerts.push({
        id: `wind_${currentWeather.location}_${now.getTime()}`,
        type: WeatherAlertType.STRONG_WIND,
        severity: currentWeather.windSpeed > 25 ? AlertSeverity.HIGH : AlertSeverity.MODERATE,
        title: 'Strong Wind Advisory',
        description: `Strong winds at ${currentWeather.windSpeed} m/s may affect outdoor activities.`,
        startTime: now,
        endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours
        affectedActivities: ['boat_tours', 'outdoor_dining', 'beach_activities'],
        recommendations: [
          'Secure loose items and clothing',
          'Be extra cautious near water and on elevated areas',
          'Consider postponing boat tours and water activities',
          'Choose indoor dining options'
        ]
      });
    }

    // Thunderstorm alert
    const hasThunderstorm = currentWeather.conditions.some(c => c.main === 'Thunderstorm') ||
                           forecast.some(f => f.conditions.some(c => c.main === 'Thunderstorm'));
    if (hasThunderstorm) {
      alerts.push({
        id: `thunder_${currentWeather.location}_${now.getTime()}`,
        type: WeatherAlertType.THUNDERSTORM,
        severity: AlertSeverity.HIGH,
        title: 'Thunderstorm Warning',
        description: 'Thunderstorms expected. Lightning and heavy rain possible.',
        startTime: now,
        endTime: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours
        affectedActivities: ['outdoor_hiking', 'beach_activities', 'boat_tours', 'outdoor_dining'],
        recommendations: [
          'Seek indoor shelter immediately',
          'Avoid open areas, tall trees, and metal objects',
          'Stay away from water and elevated areas',
          'Wait 30 minutes after last thunder before resuming outdoor activities'
        ]
      });
    }

    // Poor visibility alert
    if (currentWeather.visibility < 2) {
      alerts.push({
        id: `fog_${currentWeather.location}_${now.getTime()}`,
        type: WeatherAlertType.FOG,
        severity: currentWeather.visibility < 1 ? AlertSeverity.HIGH : AlertSeverity.MODERATE,
        title: 'Poor Visibility Warning',
        description: `Visibility reduced to ${currentWeather.visibility} km due to fog or haze.`,
        startTime: now,
        endTime: new Date(now.getTime() + 6 * 60 * 60 * 1000), // 6 hours
        affectedActivities: ['sightseeing', 'boat_tours', 'outdoor_hiking'],
        recommendations: [
          'Exercise caution when walking outdoors',
          'Consider indoor attractions with good views',
          'Photography may be limited',
          'Wait for visibility to improve for best sightseeing experience'
        ]
      });
    }

    return alerts;
  }

  private hasAlertChanged(existing: WeatherAlert, newAlert: WeatherAlert): boolean {
    return existing.severity !== newAlert.severity ||
           existing.description !== newAlert.description ||
           Math.abs(existing.endTime.getTime() - newAlert.endTime.getTime()) > 60000; // 1 minute difference
  }

  private notifySubscribers(alert: WeatherAlert, lat: number, lon: number): void {
    this.subscriptions.forEach(subscription => {
      // Check if subscriber is interested in this alert type and location
      if (subscription.alertTypes.includes(alert.type) &&
          this.isLocationMatch(subscription.location, { lat, lon })) {
        try {
          subscription.callback(alert);
        } catch (error) {
          console.error(`Error notifying subscriber ${subscription.userId}:`, error);
        }
      }
    });
  }

  private isLocationMatch(loc1: { lat: number; lon: number }, loc2: { lat: number; lon: number }): boolean {
    const threshold = 0.1; // ~11km radius
    return Math.abs(loc1.lat - loc2.lat) <= threshold && Math.abs(loc1.lon - loc2.lon) <= threshold;
  }

  private cleanupExpiredAlerts(): void {
    const now = new Date();
    const expiredAlerts: string[] = [];

    this.activeAlerts.forEach((alert, id) => {
      if (alert.endTime < now) {
        expiredAlerts.push(id);
      }
    });

    expiredAlerts.forEach(id => {
      this.activeAlerts.delete(id);
    });
  }

  getActiveAlerts(lat?: number, lon?: number): WeatherAlert[] {
    if (!lat || !lon) {
      return Array.from(this.activeAlerts.values());
    }

    return Array.from(this.activeAlerts.values()).filter(alert => {
      // For now, return all alerts. In a real implementation,
      // you'd filter by location based on alert metadata
      return true;
    });
  }

  getAlertById(alertId: string): WeatherAlert | undefined {
    return this.activeAlerts.get(alertId);
  }
}