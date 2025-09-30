import { WeatherRecommendationService } from '../../src/services/weatherRecommendationService';
import { CurrentWeather, WeatherForecast, WeatherAlert, WeatherAlertType, AlertSeverity } from '../../src/types/weather';

describe('WeatherRecommendationService', () => {
  let recommendationService: WeatherRecommendationService;

  const mockCurrentWeather: CurrentWeather = {
    location: 'Hong Kong',
    temperature: 25,
    feelsLike: 27,
    humidity: 65,
    pressure: 1013,
    visibility: 10,
    windSpeed: 5,
    windDirection: 180,
    conditions: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d'
      }
    ],
    timestamp: new Date()
  };

  const mockForecast: WeatherForecast[] = [
    {
      date: new Date(),
      temperature: {
        min: 22,
        max: 28,
        morning: 23,
        day: 26,
        evening: 25,
        night: 22
      },
      conditions: [
        {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d'
        }
      ],
      humidity: 65,
      windSpeed: 5,
      precipitationChance: 10,
      precipitationAmount: 0
    }
  ];

  const mockAlerts: WeatherAlert[] = [];

  beforeEach(() => {
    recommendationService = new WeatherRecommendationService();
  });

  describe('generateWeatherBasedRecommendations', () => {
    it('should generate comprehensive weather recommendations', () => {
      const result = recommendationService.generateWeatherBasedRecommendations(
        mockCurrentWeather,
        mockForecast,
        mockAlerts
      );

      expect(result).toEqual({
        currentWeather: mockCurrentWeather,
        forecast: mockForecast,
        alerts: mockAlerts,
        activitySuitability: expect.any(Array),
        generalRecommendations: expect.any(Array)
      });

      expect(result.activitySuitability).toHaveLength(6); // All activity types
      expect(result.generalRecommendations.length).toBeGreaterThan(0);
    });

    it('should calculate high suitability scores for good weather', () => {
      const result = recommendationService.generateWeatherBasedRecommendations(
        mockCurrentWeather,
        mockForecast,
        mockAlerts
      );

      const hikingActivity = result.activitySuitability.find(a => a.activityType === 'outdoor_hiking');
      const beachActivity = result.activitySuitability.find(a => a.activityType === 'beach_activities');

      expect(hikingActivity?.suitabilityScore).toBeGreaterThan(70);
      expect(beachActivity?.suitabilityScore).toBeGreaterThan(70);
    });

    it('should provide alternatives for poor weather conditions', () => {
      const rainyWeather = {
        ...mockCurrentWeather,
        temperature: 12, // Too cold
        windSpeed: 15 // Strong wind
      };

      const rainyForecast = [
        {
          ...mockForecast[0],
          precipitationChance: 95, // Very high rain chance
          precipitationAmount: 25 // Heavy rain
        }
      ];

      const result = recommendationService.generateWeatherBasedRecommendations(
        rainyWeather,
        rainyForecast,
        mockAlerts
      );

      const hikingActivity = result.activitySuitability.find(a => a.activityType === 'outdoor_hiking');
      
      expect(hikingActivity?.suitabilityScore).toBeLessThan(50);
      expect(hikingActivity?.alternatives).toBeDefined();
      expect(hikingActivity?.alternatives).toContain('indoor_museums');
    });
  });

  describe('activity suitability calculation', () => {
    it('should penalize outdoor activities in extreme heat', () => {
      const hotWeather = {
        ...mockCurrentWeather,
        temperature: 40 // Extreme heat
      };

      const result = recommendationService.generateWeatherBasedRecommendations(
        hotWeather,
        mockForecast,
        mockAlerts
      );

      const hikingActivity = result.activitySuitability.find(a => a.activityType === 'outdoor_hiking');
      const beachActivity = result.activitySuitability.find(a => a.activityType === 'beach_activities');

      expect(hikingActivity?.suitabilityScore).toBeLessThan(50);
      // Beach activities should be less affected by heat than hiking
      expect(beachActivity?.suitabilityScore).toBeGreaterThanOrEqual(hikingActivity?.suitabilityScore || 0);
    });

    it('should penalize water activities in strong winds', () => {
      const windyWeather = {
        ...mockCurrentWeather,
        windSpeed: 25 // Very strong wind
      };

      const result = recommendationService.generateWeatherBasedRecommendations(
        windyWeather,
        mockForecast,
        mockAlerts
      );

      const boatActivity = result.activitySuitability.find(a => a.activityType === 'boat_tours');
      const walkingActivity = result.activitySuitability.find(a => a.activityType === 'walking_tours');

      expect(boatActivity?.suitabilityScore).toBeLessThan(walkingActivity?.suitabilityScore || 100);
    });

    it('should penalize sightseeing in poor visibility', () => {
      const foggyWeather = {
        ...mockCurrentWeather,
        visibility: 1
      };

      const result = recommendationService.generateWeatherBasedRecommendations(
        foggyWeather,
        mockForecast,
        mockAlerts
      );

      const sightseeingActivity = result.activitySuitability.find(a => a.activityType === 'sightseeing');
      
      expect(sightseeingActivity?.suitabilityScore).toBeLessThan(50);
      expect(sightseeingActivity?.recommendations).toContain('Poor visibility');
    });

    it('should provide appropriate recommendations based on score ranges', () => {
      const result = recommendationService.generateWeatherBasedRecommendations(
        mockCurrentWeather,
        mockForecast,
        mockAlerts
      );

      result.activitySuitability.forEach(activity => {
        if (activity.suitabilityScore >= 70) {
          expect(activity.recommendations.some(r => r.includes('Perfect') || r.includes('Great'))).toBe(true);
        } else if (activity.suitabilityScore >= 40) {
          expect(activity.recommendations.some(r => r.includes('possible') || r.includes('precaution'))).toBe(true);
        } else {
          expect(activity.recommendations.some(r => r.includes('not recommended') || r.includes('Not recommended'))).toBe(true);
        }
      });
    });
  });

  describe('general recommendations', () => {
    it('should provide heat-related recommendations for hot weather', () => {
      const hotWeather = {
        ...mockCurrentWeather,
        temperature: 32
      };

      const result = recommendationService.generateWeatherBasedRecommendations(
        hotWeather,
        mockForecast,
        mockAlerts
      );

      expect(result.generalRecommendations.some(r => r.includes('hot weather'))).toBe(true);
      expect(result.generalRecommendations.some(r => r.includes('air-conditioned'))).toBe(true);
    });

    it('should provide rain-related recommendations for rainy weather', () => {
      const rainyForecast = [
        {
          ...mockForecast[0],
          precipitationChance: 80
        }
      ];

      const result = recommendationService.generateWeatherBasedRecommendations(
        mockCurrentWeather,
        rainyForecast,
        mockAlerts
      );

      expect(result.generalRecommendations.some(r => r.includes('umbrella'))).toBe(true);
      expect(result.generalRecommendations.some(r => r.includes('shopping malls'))).toBe(true);
    });

    it('should provide humidity-related recommendations for high humidity', () => {
      const humidWeather = {
        ...mockCurrentWeather,
        humidity: 85
      };

      const result = recommendationService.generateWeatherBasedRecommendations(
        humidWeather,
        mockForecast,
        mockAlerts
      );

      expect(result.generalRecommendations.some(r => r.includes('humidity'))).toBe(true);
      expect(result.generalRecommendations.some(r => r.includes('breathable'))).toBe(true);
    });

    it('should include alert-based recommendations', () => {
      const alertsWithRecommendations: WeatherAlert[] = [
        {
          id: 'test-alert',
          type: WeatherAlertType.EXTREME_HEAT,
          severity: AlertSeverity.HIGH,
          title: 'Heat Warning',
          description: 'Very hot weather',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          affectedActivities: ['outdoor_hiking'],
          recommendations: ['Stay hydrated', 'Seek shade']
        }
      ];

      const result = recommendationService.generateWeatherBasedRecommendations(
        mockCurrentWeather,
        mockForecast,
        alertsWithRecommendations
      );

      expect(result.generalRecommendations).toContain('Heat Warning: Very hot weather');
      expect(result.generalRecommendations).toContain('Stay hydrated');
      expect(result.generalRecommendations).toContain('Seek shade');
    });
  });

  describe('getActivityAlternatives', () => {
    it('should return alternatives for low suitability scores', () => {
      const alternatives = recommendationService.getActivityAlternatives('outdoor_hiking', 30);
      
      expect(alternatives).toContain('indoor_museums');
      expect(alternatives).toContain('shopping_malls');
      expect(alternatives).toContain('cultural_centers');
    });

    it('should return empty array for high suitability scores', () => {
      const alternatives = recommendationService.getActivityAlternatives('outdoor_hiking', 80);
      
      expect(alternatives).toEqual([]);
    });

    it('should return empty array for unknown activity types', () => {
      const alternatives = recommendationService.getActivityAlternatives('unknown_activity', 30);
      
      expect(alternatives).toEqual([]);
    });
  });
});