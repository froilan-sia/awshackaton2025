import axios from 'axios';
import { WeatherInfo } from '../types/itinerary';
import { addDays, differenceInDays } from 'date-fns';

export class WeatherService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY || 'demo_key';
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  /**
   * Get weather forecast for a date range
   */
  async getForecast(startDate: Date, endDate: Date): Promise<WeatherInfo[]> {
    try {
      const days = differenceInDays(endDate, startDate) + 1;
      const forecast: WeatherInfo[] = [];

      // For demo purposes, we'll generate mock weather data
      // In production, this would call the actual weather API
      if (this.apiKey === 'demo_key') {
        return this.generateMockForecast(startDate, endDate);
      }

      // Real API call would be implemented here
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          q: 'Hong Kong',
          appid: this.apiKey,
          units: 'metric',
          cnt: days * 8 // 8 forecasts per day (3-hour intervals)
        }
      });

      // Process the API response to create daily forecasts
      const dailyForecasts = this.processForecastData(response.data, startDate, endDate);
      
      return dailyForecasts;
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      // Fallback to mock data if API fails
      return this.generateMockForecast(startDate, endDate);
    }
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(): Promise<WeatherInfo> {
    try {
      if (this.apiKey === 'demo_key') {
        return this.generateMockCurrentWeather();
      }

      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: 'Hong Kong',
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return this.processCurrentWeatherData(response.data);
    } catch (error) {
      console.error('Error fetching current weather:', error);
      return this.generateMockCurrentWeather();
    }
  }

  /**
   * Check if weather is suitable for outdoor activities
   */
  isOutdoorFriendly(weather: WeatherInfo): boolean {
    return (
      weather.precipitation < 5 && // Less than 5mm rain
      weather.temperature.max < 35 && // Not too hot
      weather.temperature.min > 5 && // Not too cold
      weather.windSpeed < 15 // Not too windy
    );
  }

  /**
   * Get weather-based activity recommendations
   */
  getActivityRecommendations(weather: WeatherInfo): {
    recommended: string[];
    avoid: string[];
    tips: string[];
  } {
    const recommendations = {
      recommended: [] as string[],
      avoid: [] as string[],
      tips: [] as string[]
    };

    // Rain conditions
    if (weather.precipitation > 10) {
      recommendations.recommended.push('Indoor museums', 'Shopping malls', 'Covered markets');
      recommendations.avoid.push('Hiking trails', 'Outdoor markets', 'Beach activities');
      recommendations.tips.push('Bring waterproof clothing', 'Use covered walkways');
    } else if (weather.precipitation > 5) {
      recommendations.tips.push('Carry an umbrella', 'Check for covered areas');
    }

    // Temperature conditions
    if (weather.temperature.max > 35) {
      recommendations.recommended.push('Air-conditioned venues', 'Indoor attractions', 'Shaded areas');
      recommendations.avoid.push('Prolonged outdoor walking', 'Exposed hiking trails');
      recommendations.tips.push('Stay hydrated', 'Wear light clothing', 'Take frequent breaks');
    } else if (weather.temperature.min < 10) {
      recommendations.tips.push('Dress warmly', 'Layer clothing', 'Bring a jacket');
    }

    // Humidity conditions
    if (weather.humidity > 80) {
      recommendations.tips.push('Expect high humidity', 'Wear breathable fabrics');
    }

    // Wind conditions
    if (weather.windSpeed > 20) {
      recommendations.avoid.push('Cable car rides', 'High-altitude viewpoints');
      recommendations.tips.push('Secure loose items', 'Be cautious near water');
    }

    // Good weather
    if (this.isOutdoorFriendly(weather)) {
      recommendations.recommended.push(
        'Hiking trails', 
        'Outdoor markets', 
        'Waterfront walks', 
        'Parks and gardens',
        'Outdoor dining'
      );
    }

    return recommendations;
  }

  /**
   * Generate mock weather forecast for demo purposes
   */
  private generateMockForecast(startDate: Date, endDate: Date): WeatherInfo[] {
    const forecast: WeatherInfo[] = [];
    const days = differenceInDays(endDate, startDate) + 1;

    for (let i = 0; i < days; i++) {
      const date = addDays(startDate, i);
      
      // Generate realistic Hong Kong weather patterns
      const baseTemp = 25 + Math.sin(i * 0.5) * 5; // Varying temperature
      const precipitation = Math.random() > 0.7 ? Math.random() * 15 : 0; // 30% chance of rain
      
      forecast.push({
        date,
        temperature: {
          min: Math.round(baseTemp - 3),
          max: Math.round(baseTemp + 5)
        },
        humidity: Math.round(70 + Math.random() * 20), // 70-90% humidity
        precipitation: Math.round(precipitation * 10) / 10,
        windSpeed: Math.round(5 + Math.random() * 10), // 5-15 km/h
        condition: this.getWeatherCondition(precipitation, baseTemp),
        description: this.getWeatherDescription(precipitation, baseTemp)
      });
    }

    return forecast;
  }

  /**
   * Generate mock current weather
   */
  private generateMockCurrentWeather(): WeatherInfo {
    const temp = 25 + Math.random() * 10;
    const precipitation = Math.random() > 0.8 ? Math.random() * 10 : 0;

    return {
      date: new Date(),
      temperature: {
        min: Math.round(temp - 2),
        max: Math.round(temp + 3)
      },
      humidity: Math.round(70 + Math.random() * 20),
      precipitation: Math.round(precipitation * 10) / 10,
      windSpeed: Math.round(5 + Math.random() * 10),
      condition: this.getWeatherCondition(precipitation, temp),
      description: this.getWeatherDescription(precipitation, temp)
    };
  }

  /**
   * Process real weather API forecast data
   */
  private processForecastData(data: any, startDate: Date, endDate: Date): WeatherInfo[] {
    const dailyForecasts: WeatherInfo[] = [];
    const days = differenceInDays(endDate, startDate) + 1;

    // Group forecasts by day and calculate daily averages
    for (let i = 0; i < days; i++) {
      const date = addDays(startDate, i);
      const dayForecasts = data.list.filter((forecast: any) => {
        const forecastDate = new Date(forecast.dt * 1000);
        return forecastDate.toDateString() === date.toDateString();
      });

      if (dayForecasts.length > 0) {
        const dailyWeather = this.aggregateDailyWeather(dayForecasts, date);
        dailyForecasts.push(dailyWeather);
      }
    }

    return dailyForecasts;
  }

  /**
   * Process current weather API data
   */
  private processCurrentWeatherData(data: any): WeatherInfo {
    return {
      date: new Date(),
      temperature: {
        min: Math.round(data.main.temp_min),
        max: Math.round(data.main.temp_max)
      },
      humidity: data.main.humidity,
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      condition: data.weather[0].main,
      description: data.weather[0].description
    };
  }

  /**
   * Aggregate multiple forecasts into a daily summary
   */
  private aggregateDailyWeather(forecasts: any[], date: Date): WeatherInfo {
    const temps = forecasts.map(f => f.main.temp);
    const humidity = forecasts.reduce((sum, f) => sum + f.main.humidity, 0) / forecasts.length;
    const precipitation = forecasts.reduce((sum, f) => sum + (f.rain?.['3h'] || 0), 0);
    const windSpeed = forecasts.reduce((sum, f) => sum + f.wind.speed, 0) / forecasts.length;

    return {
      date,
      temperature: {
        min: Math.round(Math.min(...temps)),
        max: Math.round(Math.max(...temps))
      },
      humidity: Math.round(humidity),
      precipitation: Math.round(precipitation * 10) / 10,
      windSpeed: Math.round(windSpeed * 3.6), // Convert m/s to km/h
      condition: forecasts[0].weather[0].main,
      description: forecasts[0].weather[0].description
    };
  }

  /**
   * Get weather condition based on precipitation and temperature
   */
  private getWeatherCondition(precipitation: number, temperature: number): string {
    if (precipitation > 10) return 'Rain';
    if (precipitation > 5) return 'Light Rain';
    if (temperature > 35) return 'Hot';
    if (temperature < 10) return 'Cool';
    return 'Clear';
  }

  /**
   * Get weather description
   */
  private getWeatherDescription(precipitation: number, temperature: number): string {
    if (precipitation > 10) return 'Heavy rain expected';
    if (precipitation > 5) return 'Light rain possible';
    if (temperature > 35) return 'Very hot and humid';
    if (temperature < 10) return 'Cool and comfortable';
    return 'Pleasant weather';
  }
}