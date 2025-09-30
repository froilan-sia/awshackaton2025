import {
  CurrentWeather,
  WeatherForecast,
  WeatherAlert,
  ActivityWeatherSuitability,
  WeatherBasedRecommendation
} from '../types/weather';

interface ActivityRule {
  activityType: string;
  idealConditions: {
    temperatureRange: [number, number];
    maxWindSpeed: number;
    maxPrecipitationChance: number;
    maxHumidity?: number;
    requiredVisibility?: number;
  };
  weatherFactors: {
    temperature: number;
    precipitation: number;
    wind: number;
    humidity: number;
    visibility: number;
  };
  recommendations: {
    good: string[];
    moderate: string[];
    poor: string[];
  };
  alternatives: string[];
}

export class WeatherRecommendationService {
  private activityRules: ActivityRule[] = [
    {
      activityType: 'outdoor_hiking',
      idealConditions: {
        temperatureRange: [15, 28],
        maxWindSpeed: 10,
        maxPrecipitationChance: 20,
        maxHumidity: 80,
        requiredVisibility: 5
      },
      weatherFactors: {
        temperature: 0.3,
        precipitation: 0.3,
        wind: 0.2,
        humidity: 0.1,
        visibility: 0.1
      },
      recommendations: {
        good: ['Perfect weather for hiking', 'Bring water and sun protection'],
        moderate: ['Consider shorter trails', 'Check weather updates regularly'],
        poor: ['Not recommended due to weather conditions', 'Consider indoor alternatives']
      },
      alternatives: ['indoor_museums', 'shopping_malls', 'cultural_centers']
    },
    {
      activityType: 'beach_activities',
      idealConditions: {
        temperatureRange: [22, 32],
        maxWindSpeed: 15,
        maxPrecipitationChance: 10,
        maxHumidity: 85
      },
      weatherFactors: {
        temperature: 0.4,
        precipitation: 0.3,
        wind: 0.2,
        humidity: 0.05,
        visibility: 0.05
      },
      recommendations: {
        good: ['Great beach weather', 'Apply sunscreen regularly', 'Stay hydrated'],
        moderate: ['Beach activities possible with precautions', 'Monitor weather changes'],
        poor: ['Beach not recommended', 'Strong winds or rain expected']
      },
      alternatives: ['indoor_pools', 'aquariums', 'waterfront_malls']
    },
    {
      activityType: 'walking_tours',
      idealConditions: {
        temperatureRange: [18, 30],
        maxWindSpeed: 12,
        maxPrecipitationChance: 30,
        maxHumidity: 85
      },
      weatherFactors: {
        temperature: 0.25,
        precipitation: 0.35,
        wind: 0.15,
        humidity: 0.15,
        visibility: 0.1
      },
      recommendations: {
        good: ['Perfect for walking tours', 'Comfortable weather for exploring'],
        moderate: ['Bring umbrella as precaution', 'Dress in layers'],
        poor: ['Consider covered walkways', 'Indoor cultural sites recommended']
      },
      alternatives: ['covered_markets', 'shopping_centers', 'museums']
    },
    {
      activityType: 'outdoor_dining',
      idealConditions: {
        temperatureRange: [20, 28],
        maxWindSpeed: 8,
        maxPrecipitationChance: 15,
        maxHumidity: 75
      },
      weatherFactors: {
        temperature: 0.3,
        precipitation: 0.4,
        wind: 0.2,
        humidity: 0.05,
        visibility: 0.05
      },
      recommendations: {
        good: ['Perfect for outdoor dining', 'Enjoy al fresco meals'],
        moderate: ['Choose covered outdoor areas', 'Have indoor backup plan'],
        poor: ['Indoor dining recommended', 'Weather not suitable for outdoor meals']
      },
      alternatives: ['indoor_restaurants', 'food_courts', 'covered_markets']
    },
    {
      activityType: 'sightseeing',
      idealConditions: {
        temperatureRange: [16, 30],
        maxWindSpeed: 15,
        maxPrecipitationChance: 40,
        requiredVisibility: 3
      },
      weatherFactors: {
        temperature: 0.2,
        precipitation: 0.25,
        wind: 0.1,
        humidity: 0.1,
        visibility: 0.35
      },
      recommendations: {
        good: ['Excellent visibility for sightseeing', 'Great photo opportunities'],
        moderate: ['Some views may be limited', 'Indoor viewpoints available'],
        poor: ['Poor visibility', 'Consider indoor attractions with views']
      },
      alternatives: ['indoor_observation_decks', 'museums', 'cultural_centers']
    },
    {
      activityType: 'boat_tours',
      idealConditions: {
        temperatureRange: [18, 30],
        maxWindSpeed: 12,
        maxPrecipitationChance: 20,
        requiredVisibility: 5
      },
      weatherFactors: {
        temperature: 0.2,
        precipitation: 0.3,
        wind: 0.35,
        humidity: 0.05,
        visibility: 0.1
      },
      recommendations: {
        good: ['Perfect conditions for boat tours', 'Calm seas expected'],
        moderate: ['Boat tours may be choppy', 'Consider motion sickness precautions'],
        poor: ['Boat tours likely cancelled', 'Rough seas or poor visibility']
      },
      alternatives: ['waterfront_walks', 'maritime_museums', 'indoor_attractions']
    }
  ];

  generateWeatherBasedRecommendations(
    currentWeather: CurrentWeather,
    forecast: WeatherForecast[],
    alerts: WeatherAlert[]
  ): WeatherBasedRecommendation {
    const activitySuitability = this.calculateActivitySuitability(currentWeather, forecast[0]);
    const generalRecommendations = this.generateGeneralRecommendations(currentWeather, forecast, alerts);

    return {
      currentWeather,
      forecast,
      alerts,
      activitySuitability,
      generalRecommendations
    };
  }

  private calculateActivitySuitability(
    currentWeather: CurrentWeather,
    todayForecast: WeatherForecast
  ): ActivityWeatherSuitability[] {
    return this.activityRules.map(rule => {
      const score = this.calculateSuitabilityScore(rule, currentWeather, todayForecast);
      const conditions = this.getWeatherConditions(currentWeather, todayForecast);
      const recommendations = this.getActivityRecommendations(rule, score);

      return {
        activityType: rule.activityType,
        suitabilityScore: Math.round(score),
        conditions,
        recommendations,
        alternatives: score < 50 ? rule.alternatives : undefined
      };
    });
  }

  private calculateSuitabilityScore(
    rule: ActivityRule,
    currentWeather: CurrentWeather,
    forecast: WeatherForecast
  ): number {
    let score = 100;

    // Temperature factor
    const temp = currentWeather.temperature;
    const [minTemp, maxTemp] = rule.idealConditions.temperatureRange;
    if (temp < minTemp || temp > maxTemp) {
      const tempDeviation = Math.min(Math.abs(temp - minTemp), Math.abs(temp - maxTemp));
      score -= (tempDeviation * 5) * rule.weatherFactors.temperature * 100;
    }

    // Precipitation factor
    const precipChance = forecast.precipitationChance;
    if (precipChance > rule.idealConditions.maxPrecipitationChance) {
      const precipExcess = precipChance - rule.idealConditions.maxPrecipitationChance;
      score -= (precipExcess / 100) * rule.weatherFactors.precipitation * 100;
    }

    // Wind factor
    if (currentWeather.windSpeed > rule.idealConditions.maxWindSpeed) {
      const windExcess = currentWeather.windSpeed - rule.idealConditions.maxWindSpeed;
      score -= (windExcess * 2) * rule.weatherFactors.wind * 100;
    }

    // Humidity factor
    if (rule.idealConditions.maxHumidity && currentWeather.humidity > rule.idealConditions.maxHumidity) {
      const humidityExcess = currentWeather.humidity - rule.idealConditions.maxHumidity;
      score -= (humidityExcess / 100) * rule.weatherFactors.humidity * 100;
    }

    // Visibility factor
    if (rule.idealConditions.requiredVisibility && currentWeather.visibility < rule.idealConditions.requiredVisibility) {
      const visibilityDeficit = rule.idealConditions.requiredVisibility - currentWeather.visibility;
      score -= (visibilityDeficit * 10) * rule.weatherFactors.visibility * 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  private getWeatherConditions(currentWeather: CurrentWeather, forecast: WeatherForecast): string[] {
    const conditions: string[] = [];

    conditions.push(`Temperature: ${currentWeather.temperature}°C (feels like ${currentWeather.feelsLike}°C)`);
    conditions.push(`Humidity: ${currentWeather.humidity}%`);
    conditions.push(`Wind: ${currentWeather.windSpeed} m/s`);
    conditions.push(`Rain chance: ${forecast.precipitationChance}%`);
    
    if (currentWeather.visibility < 10) {
      conditions.push(`Visibility: ${currentWeather.visibility} km`);
    }

    return conditions;
  }

  private getActivityRecommendations(rule: ActivityRule, score: number): string[] {
    if (score >= 70) {
      return rule.recommendations.good;
    } else if (score >= 40) {
      return rule.recommendations.moderate;
    } else {
      return rule.recommendations.poor;
    }
  }

  private generateGeneralRecommendations(
    currentWeather: CurrentWeather,
    forecast: WeatherForecast[],
    alerts: WeatherAlert[]
  ): string[] {
    const recommendations: string[] = [];

    // Temperature-based recommendations
    if (currentWeather.temperature > 30) {
      recommendations.push('Very hot weather - stay hydrated and seek air-conditioned spaces during peak hours');
      recommendations.push('Consider indoor activities between 11 AM and 4 PM');
    } else if (currentWeather.temperature < 15) {
      recommendations.push('Cool weather - bring a light jacket or sweater');
    }

    // Humidity recommendations
    if (currentWeather.humidity > 80) {
      recommendations.push('High humidity - dress in breathable, light-colored clothing');
    }

    // Rain recommendations
    const rainToday = forecast[0]?.precipitationChance > 50;
    if (rainToday) {
      recommendations.push('Rain expected - carry an umbrella and consider covered walkways');
      recommendations.push('Great day for shopping malls, museums, and indoor attractions');
    }

    // Wind recommendations
    if (currentWeather.windSpeed > 10) {
      recommendations.push('Windy conditions - secure loose items and be cautious near water');
    }

    // Alert-based recommendations
    alerts.forEach(alert => {
      recommendations.push(`${alert.title}: ${alert.description}`);
      recommendations.push(...alert.recommendations);
    });

    // General Hong Kong weather tips
    recommendations.push('Hong Kong weather can change quickly - check updates regularly');
    
    if (currentWeather.conditions.some(c => c.main === 'Clear')) {
      recommendations.push('Clear skies - perfect for photography and outdoor sightseeing');
    }

    return recommendations;
  }

  getActivityAlternatives(activityType: string, currentSuitability: number): string[] {
    const rule = this.activityRules.find(r => r.activityType === activityType);
    if (!rule || currentSuitability >= 50) {
      return [];
    }
    return rule.alternatives;
  }
}