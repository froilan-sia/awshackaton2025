import { EventReminderService } from '../../src/services/eventReminderService';
import { NotificationService } from '../../src/services/notificationService';
import { NotificationType, NotificationPriority } from '../../src/types/notification';

// Mock the NotificationService
jest.mock('../../src/services/notificationService');

// Mock fetch
global.fetch = jest.fn();

describe('EventReminderService', () => {
  let eventReminderService: EventReminderService;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockNotificationService = new NotificationService({} as any) as jest.Mocked<NotificationService>;
    mockNotificationService.createFromTemplate = jest.fn();
    
    eventReminderService = new EventReminderService(mockNotificationService);
    
    // Setup environment
    process.env.EVENT_SERVICE_URL = 'http://localhost:3004';
    process.env.WEATHER_SERVICE_URL = 'http://localhost:3008';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeToEvent', () => {
    const mockEvent = {
      id: 'event123',
      name: 'Hong Kong Arts Festival',
      description: 'Annual arts festival',
      startTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      endTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
      location: 'Hong Kong Cultural Centre',
      type: 'cultural' as const,
      preparationTips: ['Arrive 30 minutes early', 'Dress code: smart casual'],
      weatherDependent: false,
      targetAudience: ['adults', 'families']
    };

    const mockSubscription = {
      userId: 'user123',
      eventId: 'event123',
      reminderPreferences: {
        dayBefore: false,
        hoursBeforeOptions: [4, 1],
        includePreparationTips: true,
        includeWeatherInfo: false
      }
    };

    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ event: mockEvent })
      });
    });

    it('should schedule reminders based on user preferences', async () => {
      await eventReminderService.subscribeToEvent(mockSubscription);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledTimes(2);
      
      // Check 4-hour reminder
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.EVENT_REMINDER,
        'user123',
        expect.objectContaining({
          eventName: 'Hong Kong Arts Festival',
          timeUntil: '4 hours',
          location: 'Hong Kong Cultural Centre',
          preparationTips: 'Arrive 30 minutes early, Dress code: smart casual'
        }),
        expect.objectContaining({
          priority: NotificationPriority.LOW,
          scheduledFor: expect.any(Date),
          expiresAt: expect.any(Date)
        })
      );

      // Check 1-hour reminder
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.EVENT_REMINDER,
        'user123',
        expect.objectContaining({
          eventName: 'Hong Kong Arts Festival',
          timeUntil: '1 hour',
          location: 'Hong Kong Cultural Centre'
        }),
        expect.objectContaining({
          priority: NotificationPriority.HIGH,
          scheduledFor: expect.any(Date)
        })
      );
    });

    it('should schedule day-before reminder when requested', async () => {
      const subscriptionWithDayBefore = {
        ...mockSubscription,
        reminderPreferences: {
          ...mockSubscription.reminderPreferences,
          dayBefore: true
        }
      };

      const eventTomorrow = {
        ...mockEvent,
        startTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // 25 hours from now
        endTime: new Date(Date.now() + 27 * 60 * 60 * 1000)
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ event: eventTomorrow })
      });

      await eventReminderService.subscribeToEvent(subscriptionWithDayBefore);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.EVENT_REMINDER,
        'user123',
        expect.objectContaining({
          timeUntil: '1 day'
        }),
        expect.any(Object)
      );
    });

    it('should include weather information for weather-dependent events', async () => {
      const weatherDependentEvent = {
        ...mockEvent,
        weatherDependent: true
      };

      const subscriptionWithWeather = {
        ...mockSubscription,
        reminderPreferences: {
          ...mockSubscription.reminderPreferences,
          includeWeatherInfo: true
        }
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ event: weatherDependentEvent })
        })
        .mockResolvedValue({
          json: () => Promise.resolve({ 
            weather: { condition: 'sunny', temperature: 25, precipitation: 0 } 
          })
        });

      await eventReminderService.subscribeToEvent(subscriptionWithWeather);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.EVENT_REMINDER,
        'user123',
        expect.objectContaining({
          weatherInfo: 'sunny, 25°C'
        }),
        expect.any(Object)
      );
    });

    it('should not schedule reminders for past times', async () => {
      const pastEvent = {
        ...mockEvent,
        startTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
      };

      const subscriptionWithLongReminders = {
        ...mockSubscription,
        reminderPreferences: {
          ...mockSubscription.reminderPreferences,
          hoursBeforeOptions: [24, 4, 1] // 24-hour reminder would be in the past
        }
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ event: pastEvent })
      });

      await eventReminderService.subscribeToEvent(subscriptionWithLongReminders);

      // Should only schedule 1-hour reminder (4-hour and 24-hour would be in the past)
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.EVENT_REMINDER,
        'user123',
        expect.objectContaining({
          timeUntil: '1 hour'
        }),
        expect.any(Object)
      );
    });
  });

  describe('addUserActivity', () => {
    const mockActivity = {
      id: 'activity123',
      userId: 'user123',
      name: 'Visit Victoria Peak',
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      location: 'Victoria Peak',
      type: 'attraction' as const,
      isOutdoor: true,
      preparationItems: ['comfortable shoes', 'camera'],
      weatherConsiderations: ['check weather before hiking'],
      estimatedDuration: 180 // 3 hours
    };

    it('should schedule activity reminders', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ 
          weather: { condition: 'clear' } 
        })
      });

      await eventReminderService.addUserActivity(mockActivity);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.ACTIVITY_REMINDER,
        'user123',
        expect.objectContaining({
          activityName: 'Visit Victoria Peak',
          timeUntil: '1 hour',
          location: 'Victoria Peak',
          weatherCondition: 'clear',
          preparationTip: expect.stringContaining('comfortable shoes')
        }),
        expect.objectContaining({
          priority: NotificationPriority.NORMAL,
          scheduledFor: expect.any(Date),
          expiresAt: expect.any(Date)
        })
      );
    });

    it('should schedule additional reminder for outdoor activities', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ 
          weather: { condition: 'partly cloudy' } 
        })
      });

      await eventReminderService.addUserActivity(mockActivity);

      // Should schedule both 1-hour and 30-minute reminders for outdoor activities
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledTimes(2);
      
      // Check for 30-minute reminder
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.ACTIVITY_REMINDER,
        'user123',
        expect.objectContaining({
          timeUntil: '30 minutes'
        }),
        expect.objectContaining({
          priority: NotificationPriority.HIGH
        })
      );
    });

    it('should not schedule additional reminder for indoor activities', async () => {
      const indoorActivity = {
        ...mockActivity,
        isOutdoor: false,
        weatherConsiderations: undefined
      };

      await eventReminderService.addUserActivity(indoorActivity);

      // Should only schedule 1-hour reminder for indoor activities
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledTimes(1);
    });

    it('should include weather-specific preparation tips', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ 
          weather: { condition: 'rainy' } 
        })
      });

      await eventReminderService.addUserActivity(mockActivity);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.ACTIVITY_REMINDER,
        'user123',
        expect.objectContaining({
          preparationTip: expect.stringContaining('Bring an umbrella')
        }),
        expect.any(Object)
      );
    });
  });

  describe('processUpcomingReminders', () => {
    it('should process events and activities within next 24 hours', async () => {
      // Add an event subscription
      const eventSubscription = {
        userId: 'user123',
        eventId: 'event123',
        reminderPreferences: {
          dayBefore: false,
          hoursBeforeOptions: [2],
          includePreparationTips: true,
          includeWeatherInfo: false
        }
      };

      const upcomingEvent = {
        id: 'event123',
        name: 'Upcoming Event',
        startTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
        endTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        location: 'Event Location',
        type: 'cultural' as const,
        weatherDependent: false,
        targetAudience: ['adults']
      };

      // Add an activity
      const upcomingActivity = {
        id: 'activity123',
        userId: 'user123',
        name: 'Upcoming Activity',
        scheduledTime: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
        location: 'Activity Location',
        type: 'attraction' as const,
        isOutdoor: false,
        estimatedDuration: 120
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ event: upcomingEvent })
      });

      await eventReminderService.subscribeToEvent(eventSubscription);
      await eventReminderService.addUserActivity(upcomingActivity);

      // Clear previous calls
      mockNotificationService.createFromTemplate.mockClear();

      await eventReminderService.processUpcomingReminders();

      // Should process both event and activity reminders
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalled();
    });

    it('should not process events and activities more than 24 hours away', async () => {
      const futureEvent = {
        id: 'event123',
        name: 'Future Event',
        startTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // 25 hours from now
        endTime: new Date(Date.now() + 27 * 60 * 60 * 1000),
        location: 'Future Location',
        type: 'cultural' as const,
        weatherDependent: false,
        targetAudience: ['adults']
      };

      const eventSubscription = {
        userId: 'user123',
        eventId: 'event123',
        reminderPreferences: {
          dayBefore: false,
          hoursBeforeOptions: [2],
          includePreparationTips: true,
          includeWeatherInfo: false
        }
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ event: futureEvent })
      });

      await eventReminderService.subscribeToEvent(eventSubscription);

      // Clear previous calls
      mockNotificationService.createFromTemplate.mockClear();

      await eventReminderService.processUpcomingReminders();

      // Should not process future events
      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeFromEvent', () => {
    it('should remove event subscription', async () => {
      const subscription = {
        userId: 'user123',
        eventId: 'event123',
        reminderPreferences: {
          dayBefore: false,
          hoursBeforeOptions: [1],
          includePreparationTips: true,
          includeWeatherInfo: false
        }
      };

      await eventReminderService.subscribeToEvent(subscription);
      
      let subscriptions = eventReminderService.getUserEventSubscriptions('user123');
      expect(subscriptions).toHaveLength(1);

      await eventReminderService.unsubscribeFromEvent('user123', 'event123');
      
      subscriptions = eventReminderService.getUserEventSubscriptions('user123');
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('removeUserActivity', () => {
    it('should remove user activity', async () => {
      const activity = {
        id: 'activity123',
        userId: 'user123',
        name: 'Test Activity',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: 'Test Location',
        type: 'attraction' as const,
        isOutdoor: false,
        estimatedDuration: 120
      };

      await eventReminderService.addUserActivity(activity);
      
      let activities = eventReminderService.getUserActivities('user123');
      expect(activities).toHaveLength(1);

      await eventReminderService.removeUserActivity('user123', 'activity123');
      
      activities = eventReminderService.getUserActivities('user123');
      expect(activities).toHaveLength(0);
    });
  });

  describe('priority determination', () => {
    it('should set HIGH priority for reminders 1 hour or less before events', async () => {
      const soonEvent = {
        id: 'event123',
        name: 'Soon Event',
        startTime: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        location: 'Event Location',
        type: 'cultural' as const,
        weatherDependent: false,
        targetAudience: ['adults']
      };

      const subscription = {
        userId: 'user123',
        eventId: 'event123',
        reminderPreferences: {
          dayBefore: false,
          hoursBeforeOptions: [1],
          includePreparationTips: false,
          includeWeatherInfo: false
        }
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ event: soonEvent })
      });

      await eventReminderService.subscribeToEvent(subscription);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.EVENT_REMINDER,
        'user123',
        expect.any(Object),
        expect.objectContaining({
          priority: NotificationPriority.HIGH
        })
      );
    });

    it('should set LOW priority for reminders more than 4 hours before events', async () => {
      const futureEvent = {
        id: 'event123',
        name: 'Future Event',
        startTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
        endTime: new Date(Date.now() + 10 * 60 * 60 * 1000),
        location: 'Event Location',
        type: 'cultural' as const,
        weatherDependent: false,
        targetAudience: ['adults']
      };

      const subscription = {
        userId: 'user123',
        eventId: 'event123',
        reminderPreferences: {
          dayBefore: false,
          hoursBeforeOptions: [6],
          includePreparationTips: false,
          includeWeatherInfo: false
        }
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ event: futureEvent })
      });

      await eventReminderService.subscribeToEvent(subscription);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.EVENT_REMINDER,
        'user123',
        expect.any(Object),
        expect.objectContaining({
          priority: NotificationPriority.LOW
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle event service API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Event service unavailable'));

      const subscription = {
        userId: 'user123',
        eventId: 'event123',
        reminderPreferences: {
          dayBefore: false,
          hoursBeforeOptions: [1],
          includePreparationTips: false,
          includeWeatherInfo: false
        }
      };

      // Should not throw an error
      await expect(
        eventReminderService.subscribeToEvent(subscription)
      ).resolves.not.toThrow();

      // Should not create any notifications when event data is unavailable
      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });

    it('should handle weather service API errors gracefully', async () => {
      const event = {
        id: 'event123',
        name: 'Weather Event',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        location: 'Outdoor Location',
        type: 'cultural' as const,
        weatherDependent: true,
        targetAudience: ['adults']
      };

      const subscription = {
        userId: 'user123',
        eventId: 'event123',
        reminderPreferences: {
          dayBefore: false,
          hoursBeforeOptions: [1],
          includePreparationTips: false,
          includeWeatherInfo: true
        }
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ event })
        })
        .mockRejectedValueOnce(new Error('Weather service unavailable'));

      await eventReminderService.subscribeToEvent(subscription);

      // Should still create notification with default weather info
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.EVENT_REMINDER,
        'user123',
        expect.objectContaining({
          weatherInfo: 'Weather information unavailable'
        }),
        expect.any(Object)
      );
    });
  });
});