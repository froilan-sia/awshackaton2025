import axios from 'axios';
import {
  CurrentWeather,
  WeatherForecast,
  WeatherAlert,
  WeatherAlertType,
  AlertSeverity,
  OpenWeatherCurrentResponse,
  OpenWeatherForecastResponse,
  WeatherCondition
} from '../types/weather';

export class WeatherService {
  private apiKey: string;
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    this.baseUrl = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5';
    
    if (!this.apiKey) {
      throw new Error('OpenWeather API key is required');
    }
  }

  async getCurrentWeather(lat: number = 22.3193, lon: number = 114.1694): Promise<CurrentWeather> {
    const cacheKey = `current_${lat}_${lon}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get<OpenWeatherCurrentResponse>(
        `${this.baseUrl}/weather`,
        {
          params: {
            lat,
            lon,
            appid: this.apiKey,
            units: 'metric'
          }
        }
      );

      const weather = this.transformCurrentWeather(response.data);
      this.setCache(cacheKey, weather);
      return weather;
    } catch (error) {
      console.error('Error fetching current weather:', error);
      throw new Error('Failed to fetch current weather data');
    }
  }

  async getWeatherForecast(lat: number = 22.3193, lon: number = 114.1694, days: number = 5): Promise<WeatherForecast[]> {
    const cacheKey = `forecast_${lat}_${lon}_${days}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get<OpenWeatherForecastResponse>(
        `${this.baseUrl}/forecast`,
        {
          params: {
            lat,
            lon,
            appid: this.apiKey,
            units: 'metric',
            cnt: days * 8 // 8 forecasts per day (3-hour intervals)
          }
        }
      );

      const forecast = this.transformForecastData(response.data);
      this.setCache(cacheKey, forecast);
      return forecast;
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      throw new Error('Failed to fetch weather forecast data');
    }
  }

  async getWeatherAlerts(currentWeather: CurrentWeather, forecast: WeatherForecast[]): Promise<WeatherAlert[]> {
    const alerts: WeatherAlert[] = [];

    // Check for extreme weather conditions
    if (currentWeather.temperature > 35) {
      alerts.push({
        id: `heat_${Date.now()}`,
        type: WeatherAlertType.EXTREME_HEAT,
        severity: AlertSeverity.HIGH,
        title: 'Extreme Heat Warning',
        description: 'Very high temperatures expected. Stay hydrated and seek shade.',
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        affectedActivities: ['outdoor_hiking', 'beach_activities', 'walking_tours'],
        recommendations: [
          'Drink plenty of water',
          'Wear light-colored, loose-fitting clothing',
          'Seek air-conditioned indoor activities during peak hours',
          'Use sunscreen and wear a hat'
        ]
      });
    }

    // Check for heavy rain
    const hasHeavyRain = forecast.some(f => f.precipitationChance > 80);
    if (hasHeavyRain) {
      alerts.push({
        id: `rain_${Date.now()}`,
        type: WeatherAlertType.HEAVY_RAIN,
        severity: AlertSeverity.MODERATE,
        title: 'Heavy Rain Expected',
        description: 'Heavy rainfall expected in the coming hours.',
        startTime: new Date(),
        endTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
        affectedActivities: ['outdoor_activities', 'hiking', 'beach_activities'],
        recommendations: [
          'Carry an umbrella',
          'Consider indoor alternatives',
          'Wear waterproof clothing',
          'Be cautious of slippery surfaces'
        ]
      });
    }

    // Check for strong winds
    if (currentWeather.windSpeed > 15) {
      alerts.push({
        id: `wind_${Date.now()}`,
        type: WeatherAlertType.STRONG_WIND,
        severity: AlertSeverity.MODERATE,
        title: 'Strong Wind Advisory',
        description: 'Strong winds may affect outdoor activities.',
        startTime: new Date(),
        endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
        affectedActivities: ['boat_tours', 'cable_car', 'outdoor_dining'],
        recommendations: [
          'Secure loose items',
          'Be cautious near water',
          'Consider postponing boat activities'
        ]
      });
    }

    return alerts;
  }

  private transformCurrentWeather(data: OpenWeatherCurrentResponse): CurrentWeather {
    return {
      location: data.name,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      visibility: data.visibility / 1000, // Convert to km
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      conditions: data.weather.map(w => ({
        id: w.id,
        main: w.main,
        description: w.description,
        icon: w.icon
      })),
      timestamp: new Date(data.dt * 1000)
    };
  }

  private transformForecastData(data: OpenWeatherForecastResponse): WeatherForecast[] {
    const dailyForecasts = new Map<string, any[]>();

    // Group forecasts by date
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      dailyForecasts.get(date)!.push(item);
    });

    const forecasts: WeatherForecast[] = [];
    
    dailyForecasts.forEach((dayData, dateStr) => {
      const date = new Date(dateStr);
      const temps = dayData.map(d => d.main.temp);
      const conditions = dayData[0].weather; // Use first forecast's conditions for the day
      
      forecasts.push({
        date,
        temperature: {
          min: Math.round(Math.min(...temps)),
          max: Math.round(Math.max(...temps)),
          morning: Math.round(dayData.find(d => new Date(d.dt * 1000).getHours() === 6)?.main.temp || temps[0]),
          day: Math.round(dayData.find(d => new Date(d.dt * 1000).getHours() === 12)?.main.temp || temps[0]),
          evening: Math.round(dayData.find(d => new Date(d.dt * 1000).getHours() === 18)?.main.temp || temps[0]),
          night: Math.round(dayData.find(d => new Date(d.dt * 1000).getHours() === 0)?.main.temp || temps[0])
        },
        conditions: conditions.map((w: any) => ({
          id: w.id,
          main: w.main,
          description: w.description,
          icon: w.icon
        })),
        humidity: Math.round(dayData.reduce((sum, d) => sum + d.main.humidity, 0) / dayData.length),
        windSpeed: Math.round(dayData.reduce((sum, d) => sum + d.wind.speed, 0) / dayData.length),
        precipitationChance: Math.round(Math.max(...dayData.map(d => d.pop * 100))),
        precipitationAmount: dayData.reduce((sum, d) => sum + (d.rain?.['3h'] || 0), 0)
      });
    });

    return forecasts.slice(0, 5); // Return 5-day forecast
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}