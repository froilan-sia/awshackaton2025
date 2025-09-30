import { CrowdAlertService } from '../../src/services/crowdAlertService';
import { NotificationService } from '../../src/services/notificationService';
import { NotificationType, NotificationPriority } from '../../src/types/notification';

// Mock the NotificationService
jest.mock('../../src/services/notificationService');

// Mock fetch
global.fetch = jest.fn();

describe('CrowdAlertService', () => {
  let crowdAlertService: CrowdAlertService;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockNotificationService = new NotificationService({} as any) as jest.Mocked<NotificationService>;
    mockNotificationService.createFromTemplate = jest.fn();
    
    crowdAlertService = new CrowdAlertService(mockNotificationService);
    
    // Setup environment
    process.env.CROWD_SERVICE_URL = 'http://localhost:3003';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkCrowdLevelsAndNotify', () => {
    const mockCrowdData = [
      {
        locationId: 'loc1',
        locationName: 'Victoria Peak',
        crowdLevel: 'very_high' as const,
        currentCapacity: 950,
        maxCapacity: 1000,
        estimatedWaitTime: 60,
        timestamp: new Date()
      },
      {
        locationId: 'loc2',
        locationName: 'Tsim Sha Tsui Promenade',
        crowdLevel: 'medium' as const,
        currentCapacity: 300,
        maxCapacity: 500,
        estimatedWaitTime: 10,
        timestamp: new Date()
      }
    ];

    const mockUserLocations = [
      {
        userId: 'user123',
        currentLocation: { latitude: 22.2908, longitude: 114.1501 },
        intendedDestinations: ['loc1', 'loc2']
      },
      {
        userId: 'user456',
        currentLocation: { latitude: 22.3000, longitude: 114.1700 },
        intendedDestinations: ['loc2']
      }
    ];

    const mockAlternatives = [
      {
        id: 'alt1',
        name: 'Sky Terrace 428',
        crowdLevel: 'low',
        distance: 500,
        estimatedTravelTime: 5,
        type: 'attraction'
      },
      {
        id: 'alt2',
        name: 'Peak Circle Walk',
        crowdLevel: 'medium',
        distance: 300,
        estimatedTravelTime: 3,
        type: 'outdoor'
      }
    ];

    beforeEach(() => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ crowdData: mockCrowdData })
        })
        .mockResolvedValue({
          json: () => Promise.resolve({ alternatives: mockAlternatives })
        });
    });

    it('should send crowd alerts for high crowd levels', async () => {
      await crowdAlertService.checkCrowdLevelsAndNotify(mockUserLocations);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.CROWD_ALERT,
        'user123',
        expect.objectContaining({
          locationName: 'Victoria Peak',
          crowdLevel: 'extremely crowded',
          waitTime: 60,
          alternativeCount: mockAlternatives.length
        }),
        expect.objectContaining({
          priority: NotificationPriority.HIGH,
          expiresAt: expect.any(Date)
        })
      );
    });

    it('should not send alerts for locations with acceptable crowd levels', async () => {
      const lowCrowdData = [{
        locationId: 'loc1',
        locationName: 'Victoria Peak',
        crowdLevel: 'low' as const,
        currentCapacity: 200,
        maxCapacity: 1000,
        estimatedWaitTime: 5,
        timestamp: new Date()
      }];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ crowdData: lowCrowdData })
        });

      await crowdAlertService.checkCrowdLevelsAndNotify(mockUserLocations);

      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });

    it('should send alerts to multiple users for the same location', async () => {
      const userLocationsForSameDestination = [
        {
          userId: 'user123',
          currentLocation: { latitude: 22.2908, longitude: 114.1501 },
          intendedDestinations: ['loc1']
        },
        {
          userId: 'user456',
          currentLocation: { latitude: 22.3000, longitude: 114.1700 },
          intendedDestinations: ['loc1']
        }
      ];

      await crowdAlertService.checkCrowdLevelsAndNotify(userLocationsForSameDestination);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.CROWD_ALERT,
        'user123',
        expect.any(Object),
        expect.any(Object)
      );
      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.CROWD_ALERT,
        'user456',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('monitorLocationCrowdLevel', () => {
    it('should send alert for single location monitoring', async () => {
      const highCrowdData = [{
        locationId: 'loc1',
        locationName: 'Star Ferry Pier',
        crowdLevel: 'high' as const,
        currentCapacity: 850,
        maxCapacity: 1000,
        estimatedWaitTime: 30,
        timestamp: new Date()
      }];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ crowdData: highCrowdData })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ alternatives: [] })
        });

      await crowdAlertService.monitorLocationCrowdLevel('loc1', 'user123');

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.CROWD_ALERT,
        'user123',
        expect.objectContaining({
          locationName: 'Star Ferry Pier',
          crowdLevel: 'very busy',
          waitTime: 30
        }),
        expect.any(Object)
      );
    });

    it('should not send alert for acceptable crowd levels', async () => {
      const lowCrowdData = [{
        locationId: 'loc1',
        locationName: 'Star Ferry Pier',
        crowdLevel: 'low' as const,
        currentCapacity: 200,
        maxCapacity: 1000,
        estimatedWaitTime: 5,
        timestamp: new Date()
      }];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ crowdData: lowCrowdData })
        });

      await crowdAlertService.monitorLocationCrowdLevel('loc1', 'user123');

      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });
  });

  describe('crowd level formatting', () => {
    it('should format crowd levels correctly', async () => {
      const testCases = [
        { level: 'low', expected: 'not busy' },
        { level: 'medium', expected: 'moderately busy' },
        { level: 'high', expected: 'very busy' },
        { level: 'very_high', expected: 'extremely crowded' }
      ];

      for (const testCase of testCases) {
        const crowdData = [{
          locationId: 'loc1',
          locationName: 'Test Location',
          crowdLevel: testCase.level as any,
          currentCapacity: 900,
          maxCapacity: 1000,
          estimatedWaitTime: 45,
          timestamp: new Date()
        }];

        (fetch as jest.Mock)
          .mockResolvedValueOnce({
            json: () => Promise.resolve({ crowdData })
          })
          .mockResolvedValueOnce({
            json: () => Promise.resolve({ alternatives: [] })
          });

        await crowdAlertService.monitorLocationCrowdLevel('loc1', 'user123');

        if (testCase.level === 'high' || testCase.level === 'very_high') {
          expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
            NotificationType.CROWD_ALERT,
            'user123',
            expect.objectContaining({
              crowdLevel: testCase.expected
            }),
            expect.any(Object)
          );
        }

        jest.clearAllMocks();
      }
    });
  });

  describe('priority determination', () => {
    it('should set HIGH priority for very high crowd levels', async () => {
      const veryHighCrowdData = [{
        locationId: 'loc1',
        locationName: 'Extremely Busy Location',
        crowdLevel: 'very_high' as const,
        currentCapacity: 980,
        maxCapacity: 1000,
        estimatedWaitTime: 90,
        timestamp: new Date()
      }];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ crowdData: veryHighCrowdData })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ alternatives: [] })
        });

      await crowdAlertService.monitorLocationCrowdLevel('loc1', 'user123');

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.CROWD_ALERT,
        'user123',
        expect.any(Object),
        expect.objectContaining({
          priority: NotificationPriority.HIGH
        })
      );
    });

    it('should set NORMAL priority for high crowd levels with moderate wait times', async () => {
      const highCrowdData = [{
        locationId: 'loc1',
        locationName: 'Busy Location',
        crowdLevel: 'high' as const,
        currentCapacity: 850,
        maxCapacity: 1000,
        estimatedWaitTime: 25,
        timestamp: new Date()
      }];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ crowdData: highCrowdData })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ alternatives: [] })
        });

      await crowdAlertService.monitorLocationCrowdLevel('loc1', 'user123');

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.CROWD_ALERT,
        'user123',
        expect.any(Object),
        expect.objectContaining({
          priority: NotificationPriority.NORMAL
        })
      );
    });
  });

  describe('getCrowdPrediction', () => {
    it('should fetch crowd prediction for future time', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockPrediction = {
        locationId: 'loc1',
        locationName: 'Victoria Peak',
        crowdLevel: 'high',
        currentCapacity: 800,
        maxCapacity: 1000,
        estimatedWaitTime: 40,
        timestamp: futureTime
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ prediction: mockPrediction })
      });

      const prediction = await crowdAlertService.getCrowdPrediction('loc1', futureTime);

      expect(prediction).toEqual(mockPrediction);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3003/api/crowd/prediction',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId: 'loc1',
            targetTime: futureTime.toISOString()
          })
        })
      );
    });

    it('should return null when prediction service fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Service unavailable'));

      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const prediction = await crowdAlertService.getCrowdPrediction('loc1', futureTime);

      expect(prediction).toBeNull();
    });
  });

  describe('sendProactiveCrowdAlert', () => {
    it('should send proactive alert for predicted high crowd levels', async () => {
      const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockPrediction = {
        locationId: 'loc1',
        locationName: 'Victoria Peak',
        crowdLevel: 'very_high' as const,
        currentCapacity: 950,
        maxCapacity: 1000,
        estimatedWaitTime: 75,
        timestamp: scheduledTime
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ prediction: mockPrediction })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ alternatives: [] })
        });

      await crowdAlertService.sendProactiveCrowdAlert('user123', 'loc1', scheduledTime);

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.CROWD_ALERT,
        'user123',
        expect.objectContaining({
          locationName: 'Victoria Peak',
          crowdLevel: 'extremely crowded',
          waitTime: 75,
          scheduledTime: scheduledTime.toLocaleTimeString()
        }),
        expect.objectContaining({
          priority: NotificationPriority.NORMAL,
          scheduledFor: expect.any(Date), // 1 hour before
          expiresAt: expect.any(Date) // 1 hour after
        })
      );
    });

    it('should not send proactive alert for acceptable predicted crowd levels', async () => {
      const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockPrediction = {
        locationId: 'loc1',
        locationName: 'Victoria Peak',
        crowdLevel: 'low' as const,
        currentCapacity: 200,
        maxCapacity: 1000,
        estimatedWaitTime: 5,
        timestamp: scheduledTime
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ prediction: mockPrediction })
      });

      await crowdAlertService.sendProactiveCrowdAlert('user123', 'loc1', scheduledTime);

      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle crowd service API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Crowd service unavailable'));

      const userLocations = [{
        userId: 'user123',
        currentLocation: { latitude: 22.2908, longitude: 114.1501 },
        intendedDestinations: ['loc1']
      }];

      // Should not throw an error
      await expect(
        crowdAlertService.checkCrowdLevelsAndNotify(userLocations)
      ).resolves.not.toThrow();

      // Should not create any notifications when crowd data is unavailable
      expect(mockNotificationService.createFromTemplate).not.toHaveBeenCalled();
    });

    it('should use default alternatives when alternatives API fails', async () => {
      const highCrowdData = [{
        locationId: 'loc1',
        locationName: 'Busy Location',
        crowdLevel: 'high' as const,
        currentCapacity: 850,
        maxCapacity: 1000,
        estimatedWaitTime: 35,
        timestamp: new Date()
      }];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ crowdData: highCrowdData })
        })
        .mockRejectedValueOnce(new Error('Alternatives service unavailable'));

      await crowdAlertService.monitorLocationCrowdLevel('loc1', 'user123');

      expect(mockNotificationService.createFromTemplate).toHaveBeenCalledWith(
        NotificationType.CROWD_ALERT,
        'user123',
        expect.objectContaining({
          alternativeCount: 3 // Default alternatives count
        }),
        expect.any(Object)
      );
    });
  });

  describe('subscription management', () => {
    it('should log crowd update subscriptions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await crowdAlertService.subscribeToCrowdUpdates('user123', ['loc1', 'loc2']);

      expect(consoleSpy).toHaveBeenCalledWith(
        'User user123 subscribed to crowd updates for locations: loc1, loc2'
      );

      consoleSpy.mockRestore();
    });

    it('should log crowd update unsubscriptions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await crowdAlertService.unsubscribeFromCrowdUpdates('user123', ['loc1']);

      expect(consoleSpy).toHaveBeenCalledWith(
        'User user123 unsubscribed from crowd updates for locations: loc1'
      );

      consoleSpy.mockRestore();
    });
  });
});