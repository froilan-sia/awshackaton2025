import { WeatherNotificationService } from '../../src/services/weatherNotificationService';
import { NotificationService } from '../../src/services/notificationService';
import { NotificationType, NotificationPriority } from '../../src/types/notification';

// Mock the NotificationService
jest.mock('../../src/services/notificationService');

// Mock fetch
global.fetch = jest.fn();

describe('WeatherNotificationService', () => {
  let weatherNotificationService: WeatherNotificationService;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockNotificationService = new NotificationService({} as any) as jest.Mocked<NotificationService>;
    mockNotificationService.createFromTemplate = jest.fn();
    
    weatherNotificationService = new WeatherNotificationService(mockNotificationService);
    
    // Setup environment
    process.env.WEATHER_SERVICE_URL = 'http://localhost:3008';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkWeatherAndNotify', () => {
    const mockCurrentWeather = {
      condition: 'heavy rain',
      severity: 'high',
      temperature: 20,
      humidity: 90,
      windSpeed: 30,
      precipitation: 15
    };

    const mockForecast = [mockCurrentWeather];

    const mockActivities = [
      {
        id: 'activity1',
        userId: 'user123',
        name: 'Hiking at Dragon\'s Back',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        location: 'Dragon\'s Back Trail',
        isOutdoor: true,
        weatherSensitive: true
      },
      {
        id: 'activity2',
        userId: 'user123',
        name: 'Shopping at IFC',
        scheduledTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
        location: 'IFC Mall',
        isOutdoor: false,
        weatherSensitive: false
      }
    ];

    beforeEach(() => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockCurrentWeather)
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ forecast: mockForecast })
        });
    });

    it('should send weather alert for outdoor weather-sensitive activities', async () => {
      await weatherNotificationService.checkWeatherAndNotify('user123', mockActivities);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.WEATHER_ALERT,
        'user123',
        expect.objectContaining({
          weatherCondition: expect.stringContaining('heavy rain'),
          activityName: 'Hiking at Dragon\'s Back',
          alternativeCount: expect.any(Number)
        }),
        expect.objectContaining({
          priority: NotificationPriority.URGENT,
          scheduledFor: expect.any(Date),
          expiresAt: expect.any(Date)
        })
      );
    });

    it('should not send alerts for indoor non-weather-sensitive activities', async () => {
      const indoorActivities = [mockActivities[1]]; // Only shopping activity
      
      await weatherNotificationService.checkWeatherAndNotify('user123', indoorActivities);

      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });

    it('should not send alerts for activities more than 24 hours away', async () => {
      const futureActivities = [{
        ...mockActivities[0],
        scheduledTime: new Date(Date.now() + 25 * 60 * 60 * 1000) // 25 hours from now
      }];

      await weatherNotificationService.checkWeatherAndNotify('user123', futureActivities);

      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });

    it('should not send alerts for past activities', async () => {
      const pastActivities = [{
        ...mockActivities[0],
        scheduledTime: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      }];

      await weatherNotificationService.checkWeatherAndNotify('user123', pastActivities);

      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });
  });

  describe('weather issue identification', () => {
    it('should identify heavy rain as an issue for outdoor activities', async () => {
      const heavyRainWeather = {
        condition: 'heavy rain',
        severity: 'high' as const,
        temperature: 25,
        humidity: 85,
        windSpeed: 15,
        precipitation: 10
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(heavyRainWeather)
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ forecast: [heavyRainWeather] })
        });

      const outdoorActivity = {
        id: 'activity1',
        userId: 'user123',
        name: 'Beach Visit',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: 'Repulse Bay',
        isOutdoor: true,
        weatherSensitive: true
      };

      await weatherNotificationService.checkWeatherAndNotify('user123', [outdoorActivity]);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.WEATHER_ALERT,
        'user123',
        expect.objectContaining({
          issues: expect.stringContaining('heavy rain expected')
        }),
        expect.any(Object)
      );
    });

    it('should identify extreme temperatures as issues', async () => {
      const extremeHeatWeather = {
        condition: 'sunny',
        severity: 'high' as const,
        temperature: 38, // Extreme heat
        humidity: 60,
        windSpeed: 10,
        precipitation: 0
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(extremeHeatWeather)
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ forecast: [extremeHeatWeather] })
        });

      const outdoorActivity = {
        id: 'activity1',
        userId: 'user123',
        name: 'Hiking',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: 'Lion Rock',
        isOutdoor: true,
        weatherSensitive: true
      };

      await weatherNotificationService.checkWeatherAndNotify('user123', [outdoorActivity]);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.WEATHER_ALERT,
        'user123',
        expect.objectContaining({
          issues: expect.stringContaining('extreme heat')
        }),
        expect.any(Object)
      );
    });

    it('should identify strong winds as an issue', async () => {
      const windyWeather = {
        condition: 'windy',
        severity: 'medium' as const,
        temperature: 25,
        humidity: 70,
        windSpeed: 35, // Strong winds
        precipitation: 0
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(windyWeather)
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ forecast: [windyWeather] })
        });

      const outdoorActivity = {
        id: 'activity1',
        userId: 'user123',
        name: 'Cable Car Ride',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: 'Ngong Ping',
        isOutdoor: true,
        weatherSensitive: true
      };

      await weatherNotificationService.checkWeatherAndNotify('user123', [outdoorActivity]);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.WEATHER_ALERT,
        'user123',
        expect.objectContaining({
          issues: expect.stringContaining('strong winds')
        }),
        expect.any(Object)
      );
    });
  });

  describe('notification timing', () => {
    it('should schedule notification 12 hours before for activities more than 12 hours away', async () => {
      const activityIn15Hours = {
        id: 'activity1',
        userId: 'user123',
        name: 'Morning Hike',
        scheduledTime: new Date(Date.now() + 15 * 60 * 60 * 1000), // 15 hours from now
        location: 'Peak Trail',
        isOutdoor: true,
        weatherSensitive: true
      };

      const badWeather = {
        condition: 'storm',
        severity: 'high' as const,
        temperature: 22,
        humidity: 95,
        windSpeed: 40,
        precipitation: 20
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(badWeather)
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ forecast: [badWeather] })
        });

      await weatherNotificationService.checkWeatherAndNotify('user123', [activityIn15Hours]);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.WEATHER_ALERT,
        'user123',
        expect.any(Object),
        expect.objectContaining({
          scheduledFor: expect.any(Date)
        })
      );

      // Check that the scheduled time is approximately 12 hours before the activity
      const call = mockNotificationService.createFromTemplate.mock.calls[0];
      const scheduledFor = call[3]?.scheduledFor as Date;
      const expectedTime = new Date(activityIn15Hours.scheduledTime.getTime() - 12 * 60 * 60 * 1000);
      
      expect(Math.abs(scheduledFor.getTime() - expectedTime.getTime())).toBeLessThan(60000); // Within 1 minute
    });

    it('should send notification immediately for activities less than 1 hour away', async () => {
      const activitySoon = {
        id: 'activity1',
        userId: 'user123',
        name: 'Immediate Activity',
        scheduledTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        location: 'Nearby Park',
        isOutdoor: true,
        weatherSensitive: true
      };

      const badWeather = {
        condition: 'rain',
        severity: 'medium' as const,
        temperature: 20,
        humidity: 85,
        windSpeed: 20,
        precipitation: 8
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(badWeather)
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ forecast: [badWeather] })
        });

      await weatherNotificationService.checkWeatherAndNotify('user123', [activitySoon]);

      const call = mockNotificationService.createFromTemplate.mock.calls[0];
      const scheduledFor = call[3]?.scheduledFor as Date;
      
      // Should be scheduled for now (within 1 minute)
      expect(Math.abs(scheduledFor.getTime() - Date.now())).toBeLessThan(60000);
    });
  });

  describe('priority determination', () => {
    it('should set URGENT priority for severe weather', async () => {
      const severeWeather = {
        condition: 'typhoon',
        severity: 'high' as const,
        temperature: 25,
        humidity: 95,
        windSpeed: 60,
        precipitation: 30
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(severeWeather)
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ forecast: [severeWeather] })
        });

      const activity = {
        id: 'activity1',
        userId: 'user123',
        name: 'Outdoor Event',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: 'Outdoor Venue',
        isOutdoor: true,
        weatherSensitive: true
      };

      await weatherNotificationService.checkWeatherAndNotify('user123', [activity]);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.WEATHER_ALERT,
        'user123',
        expect.any(Object),
        expect.objectContaining({
          priority: NotificationPriority.URGENT
        })
      );
    });

    it('should set NORMAL priority for moderate weather issues', async () => {
      const moderateWeather = {
        condition: 'light rain',
        severity: 'low' as const,
        temperature: 25,
        humidity: 75,
        windSpeed: 15,
        precipitation: 3
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(moderateWeather)
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ forecast: [moderateWeather] })
        });

      const activity = {
        id: 'activity1',
        userId: 'user123',
        name: 'Park Walk',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: 'Victoria Park',
        isOutdoor: true,
        weatherSensitive: true
      };

      await weatherNotificationService.checkWeatherAndNotify('user123', [activity]);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.WEATHER_ALERT,
        'user123',
        expect.any(Object),
        expect.objectContaining({
          priority: NotificationPriority.NORMAL
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle weather service API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Weather service unavailable'));

      const activity = {
        id: 'activity1',
        userId: 'user123',
        name: 'Outdoor Activity',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: 'Outdoor Location',
        isOutdoor: true,
        weatherSensitive: true
      };

      // Should not throw an error
      await expect(
        weatherNotificationService.checkWeatherAndNotify('user123', [activity])
      ).resolves.not.toThrow();

      // Should not create any notifications when weather data is unavailable
      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });

    it('should use default weather when API returns invalid data', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({}) // Empty response
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ forecast: [] }) // Empty forecast
        });

      const activity = {
        id: 'activity1',
        userId: 'user123',
        name: 'Outdoor Activity',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: 'Outdoor Location',
        isOutdoor: true,
        weatherSensitive: true
      };

      // Should not throw an error and should not create notifications for default good weather
      await expect(
        weatherNotificationService.checkWeatherAndNotify('user123', [activity])
      ).resolves.not.toThrow();

      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });
  });
});