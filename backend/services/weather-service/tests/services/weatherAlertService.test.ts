import { WeatherAlertService } from '../../src/services/weatherAlertService';
import { WeatherService } from '../../src/services/weatherService';
import { WeatherRecommendationService } from '../../src/services/weatherRecommendationService';
import { WeatherAlertType, AlertSeverity, CurrentWeather, WeatherForecast } from '../../src/types/weather';

// Mock the services
jest.mock('../../src/services/weatherService');
jest.mock('../../src/services/weatherRecommendationService');
jest.mock('node-cron');

describe('WeatherAlertService', () => {
  let alertService: WeatherAlertService;
  let mockWeatherService: jest.Mocked<WeatherService>;
  let mockRecommendationService: jest.Mocked<WeatherRecommendationService>;

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

  beforeEach(() => {
    mockWeatherService = new WeatherService() as jest.Mocked<WeatherService>;
    mockRecommendationService = new WeatherRecommendationService() as jest.Mocked<WeatherRecommendationService>;
    
    alertService = new WeatherAlertService(mockWeatherService, mockRecommendationService);

    // Setup default mocks
    mockWeatherService.getCurrentWeather.mockResolvedValue(mockCurrentWeather);
    mockWeatherService.getWeatherForecast.mockResolvedValue(mockForecast);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscription management', () => {
    it('should allow users to subscribe to weather alerts', () => {
      const subscription = {
        userId: 'user123',
        alertTypes: [WeatherAlertType.EXTREME_HEAT, WeatherAlertType.HEAVY_RAIN],
        location: { lat: 22.3193, lon: 114.1694 },
        callback: jest.fn()
      };

      expect(() => alertService.subscribe(subscription)).not.toThrow();
    });

    it('should allow users to unsubscribe from weather alerts', () => {
      const subscription = {
        userId: 'user123',
        alertTypes: [WeatherAlertType.EXTREME_HEAT],
        location: { lat: 22.3193, lon: 114.1694 },
        callback: jest.fn()
      };

      alertService.subscribe(subscription);
      expect(() => alertService.unsubscribe('user123')).not.toThrow();
    });
  });

  describe('alert generation', () => {
    it('should generate extreme heat alert for high temperatures', async () => {
      const hotWeather = {
        ...mockCurrentWeather,
        temperature: 36
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(hotWeather);
      mockWeatherService.getWeatherForecast.mockResolvedValue(mockForecast);

      // Add a subscription to trigger the alert check
      alertService.subscribe({
        userId: 'test-user',
        alertTypes: [WeatherAlertType.EXTREME_HEAT],
        location: { lat: 22.3193, lon: 114.1694 },
        callback: jest.fn()
      });

      await alertService.checkWeatherAlerts();
      const alerts = alertService.getActiveAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe(WeatherAlertType.EXTREME_HEAT);
      expect(alerts[0].severity).toBe(AlertSeverity.HIGH);
      expect(alerts[0].title).toBe('Extreme Heat Warning');
      expect(alerts[0].affectedActivities).toContain('outdoor_hiking');
      expect(alerts[0].recommendations).toContain('Stay in air-conditioned areas during peak hours (11 AM - 4 PM)');
    });

    it('should generate extreme severity alert for very high temperatures', async () => {
      const veryHotWeather = {
        ...mockCurrentWeather,
        temperature: 39
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(veryHotWeather);
      mockWeatherService.getWeatherForecast.mockResolvedValue(mockForecast);

      alertService.subscribe({
        userId: 'test-user',
        alertTypes: [WeatherAlertType.EXTREME_HEAT],
        location: { lat: 22.3193, lon: 114.1694 },
        callback: jest.fn()
      });

      await alertService.checkWeatherAlerts();
      const alerts = alertService.getActiveAlerts();

      expect(alerts[0].severity).toBe(AlertSeverity.EXTREME);
    });

    it('should generate heavy rain alert for high precipitation', async () => {
      const rainyForecast = [
        {
          ...mockForecast[0],
          precipitationChance: 85,
          precipitationAmount: 15
        }
      ];

      mockWeatherService.getWeatherForecast.mockResolvedValue(rainyForecast);

      await alertService.checkWeatherAlerts();
      const alerts = alertService.getActiveAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe(WeatherAlertType.HEAVY_RAIN);
      expect(alerts[0].severity).toBe(AlertSeverity.MODERATE);
      expect(alerts[0].recommendations).toContain('Carry a sturdy umbrella');
    });

    it('should generate high severity rain alert for very heavy precipitation', async () => {
      const heavyRainyForecast = [
        {
          ...mockForecast[0],
          precipitationChance: 90,
          precipitationAmount: 30
        }
      ];

      mockWeatherService.getWeatherForecast.mockResolvedValue(heavyRainyForecast);

      await alertService.checkWeatherAlerts();
      const alerts = alertService.getActiveAlerts();

      expect(alerts[0].severity).toBe(AlertSeverity.HIGH);
    });

    it('should generate strong wind alert', async () => {
      const windyWeather = {
        ...mockCurrentWeather,
        windSpeed: 18
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(windyWeather);

      await alertService.checkWeatherAlerts();
      const alerts = alertService.getActiveAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe(WeatherAlertType.STRONG_WIND);
      expect(alerts[0].severity).toBe(AlertSeverity.MODERATE);
      expect(alerts[0].affectedActivities).toContain('boat_tours');
    });

    it('should generate thunderstorm alert', async () => {
      const stormyWeather = {
        ...mockCurrentWeather,
        conditions: [
          {
            id: 200,
            main: 'Thunderstorm',
            description: 'thunderstorm with light rain',
            icon: '11d'
          }
        ]
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(stormyWeather);

      await alertService.checkWeatherAlerts();
      const alerts = alertService.getActiveAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe(WeatherAlertType.THUNDERSTORM);
      expect(alerts[0].severity).toBe(AlertSeverity.HIGH);
      expect(alerts[0].recommendations).toContain('Seek indoor shelter immediately');
    });

    it('should generate fog alert for poor visibility', async () => {
      const foggyWeather = {
        ...mockCurrentWeather,
        visibility: 1.5
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(foggyWeather);

      await alertService.checkWeatherAlerts();
      const alerts = alertService.getActiveAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe(WeatherAlertType.FOG);
      expect(alerts[0].severity).toBe(AlertSeverity.MODERATE);
      expect(alerts[0].affectedActivities).toContain('sightseeing');
    });

    it('should generate multiple alerts for multiple conditions', async () => {
      const extremeWeather = {
        ...mockCurrentWeather,
        temperature: 37,
        windSpeed: 20,
        visibility: 1
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(extremeWeather);

      await alertService.checkWeatherAlerts();
      const alerts = alertService.getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(1);
      expect(alerts.some(a => a.type === WeatherAlertType.EXTREME_HEAT)).toBe(true);
      expect(alerts.some(a => a.type === WeatherAlertType.STRONG_WIND)).toBe(true);
      expect(alerts.some(a => a.type === WeatherAlertType.FOG)).toBe(true);
    });
  });

  describe('alert notification', () => {
    it('should notify subscribed users of relevant alerts', async () => {
      const callback = jest.fn();
      const subscription = {
        userId: 'user123',
        alertTypes: [WeatherAlertType.EXTREME_HEAT],
        location: { lat: 22.3193, lon: 114.1694 },
        callback
      };

      alertService.subscribe(subscription);

      const hotWeather = {
        ...mockCurrentWeather,
        temperature: 36
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(hotWeather);

      await alertService.checkWeatherAlerts();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: WeatherAlertType.EXTREME_HEAT,
          severity: AlertSeverity.HIGH
        })
      );
    });

    it('should not notify users of irrelevant alert types', async () => {
      const callback = jest.fn();
      const subscription = {
        userId: 'user123',
        alertTypes: [WeatherAlertType.HEAVY_RAIN], // Only subscribed to rain
        location: { lat: 22.3193, lon: 114.1694 },
        callback
      };

      alertService.subscribe(subscription);

      const hotWeather = {
        ...mockCurrentWeather,
        temperature: 36 // Heat alert, but user only wants rain alerts
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(hotWeather);

      await alertService.checkWeatherAlerts();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('alert management', () => {
    it('should clean up expired alerts', async () => {
      const hotWeather = {
        ...mockCurrentWeather,
        temperature: 36
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(hotWeather);

      await alertService.checkWeatherAlerts();
      let alerts = alertService.getActiveAlerts();
      expect(alerts).toHaveLength(1);

      // Mock time passing beyond alert expiry
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + 7 * 60 * 60 * 1000); // 7 hours later

      await alertService.checkWeatherAlerts();
      alerts = alertService.getActiveAlerts();
      expect(alerts).toHaveLength(0);

      // Restore original Date.now
      Date.now = originalDate;
    });

    it('should get alert by ID', async () => {
      const hotWeather = {
        ...mockCurrentWeather,
        temperature: 36
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(hotWeather);

      await alertService.checkWeatherAlerts();
      const alerts = alertService.getActiveAlerts();
      const alertId = alerts[0].id;

      const retrievedAlert = alertService.getAlertById(alertId);
      expect(retrievedAlert).toEqual(alerts[0]);
    });

    it('should return undefined for non-existent alert ID', () => {
      const retrievedAlert = alertService.getAlertById('non-existent-id');
      expect(retrievedAlert).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle weather service errors gracefully', async () => {
      mockWeatherService.getCurrentWeather.mockRejectedValue(new Error('API Error'));

      // Should not throw
      await expect(alertService.checkWeatherAlerts()).resolves.not.toThrow();
    });

    it('should handle callback errors gracefully', async () => {
      const faultyCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const subscription = {
        userId: 'user123',
        alertTypes: [WeatherAlertType.EXTREME_HEAT],
        location: { lat: 22.3193, lon: 114.1694 },
        callback: faultyCallback
      };

      alertService.subscribe(subscription);

      const hotWeather = {
        ...mockCurrentWeather,
        temperature: 36
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue(hotWeather);

      // Should not throw despite callback error
      await expect(alertService.checkWeatherAlerts()).resolves.not.toThrow();
    });
  });
});