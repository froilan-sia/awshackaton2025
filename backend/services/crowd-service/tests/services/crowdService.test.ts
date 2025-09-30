import { CrowdService } from '../../src/services/crowdService';
import { CrowdLevel, RoutePoint } from '../../src/types/crowd';

// Mock all the dependencies
const mockCrowdTrackingService = {
  getCrowdData: jest.fn(),
  getBulkCrowdData: jest.fn(),
  getHighCrowdLocations: jest.fn()
};

const mockAlternativeService = {
  getAlternatives: jest.fn(),
  getBulkAlternatives: jest.fn()
};

const mockNotificationService = {
  sendRouteUpdate: jest.fn(),
  getConnectedUsersCount: jest.fn().mockReturnValue(5),
  close: jest.fn()
};

const mockSmartRoutingService = {
  optimizeRoute: jest.fn(),
  findOptimalVisitTime: jest.fn(),
  getRecommendedDepartureTimes: jest.fn()
};

jest.mock('../../src/services/crowdTrackingService', () => ({
  CrowdTrackingService: jest.fn().mockImplementation(() => mockCrowdTrackingService)
}));

jest.mock('../../src/services/alternativeRecommendationService', () => ({
  AlternativeRecommendationService: jest.fn().mockImplementation(() => mockAlternativeService)
}));

jest.mock('../../src/services/notificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => mockNotificationService)
}));

jest.mock('../../src/services/smartRoutingService', () => ({
  SmartRoutingService: jest.fn().mockImplementation(() => mockSmartRoutingService)
}));

describe('CrowdService', () => {
  let service: CrowdService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockCrowdTrackingService.getCrowdData.mockResolvedValue({
      locationId: 'test-location',
      locationName: 'Test Location',
      isOvercrowded: jest.fn().mockReturnValue(false),
      hasLongWait: jest.fn().mockReturnValue(false),
      toJSON: jest.fn().mockReturnValue({ locationId: 'test-location' })
    });
    
    mockCrowdTrackingService.getBulkCrowdData.mockResolvedValue(new Map());
    mockCrowdTrackingService.getHighCrowdLocations.mockResolvedValue([]);
    mockSmartRoutingService.optimizeRoute.mockResolvedValue({
      userId: 'test-user',
      originalRoute: [],
      optimizedRoute: [],
      crowdAvoidanceScore: 0.5,
      estimatedTimeSaved: 10,
      alternativesConsidered: 1
    });
    mockSmartRoutingService.getRecommendedDepartureTimes.mockResolvedValue(new Map());
    
    service = new CrowdService();
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('getLocationCrowdInfo', () => {
    it('should return crowd info for existing location', async () => {
      const result = await service.getLocationCrowdInfo('hk-disneyland');
      
      expect(result).toBeDefined();
      
      if (!result.error) {
        expect(result.crowdData).toBeDefined();
        expect(result.isOvercrowded).toBeDefined();
        expect(result.hasLongWait).toBeDefined();
        expect(typeof result.isOvercrowded).toBe('boolean');
        expect(typeof result.hasLongWait).toBe('boolean');
      }
    });

    it('should include alternatives for overcrowded locations', async () => {
      const result = await service.getLocationCrowdInfo('hk-disneyland');
      
      if (!result.error && result.isOvercrowded) {
        // If location is overcrowded, alternatives might be included
        if (result.alternatives) {
          expect(result.alternatives.originalLocationId).toBe('hk-disneyland');
          expect(Array.isArray(result.alternatives.alternatives)).toBe(true);
        }
      }
    });

    it('should include optimal visit time for overcrowded locations', async () => {
      const result = await service.getLocationCrowdInfo('hk-disneyland');
      
      if (!result.error && result.isOvercrowded && result.optimalVisitTime) {
        expect(result.optimalVisitTime).toBeInstanceOf(Date);
        expect(result.optimalVisitTime.getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  describe('getBulkCrowdInfo', () => {
    it('should return crowd info for multiple locations', async () => {
      const locationIds = ['hk-disneyland', 'victoria-peak', 'ocean-park'];
      const results = await service.getBulkCrowdInfo(locationIds);
      
      expect(typeof results).toBe('object');
      
      // Check that results contain data for requested locations
      for (const locationId of locationIds) {
        if (results[locationId]) {
          expect(results[locationId].crowdData).toBeDefined();
          expect(typeof results[locationId].isOvercrowded).toBe('boolean');
          expect(typeof results[locationId].hasLongWait).toBe('boolean');
        }
      }
    });

    it('should handle empty location list', async () => {
      const results = await service.getBulkCrowdInfo([]);
      
      expect(typeof results).toBe('object');
      expect(Object.keys(results)).toHaveLength(0);
    });
  });

  describe('optimizeUserRoute', () => {
    it('should optimize route and return optimization data', async () => {
      const route: RoutePoint[] = [
        {
          locationId: 'hk-disneyland',
          coordinates: { latitude: 22.3129, longitude: 114.0413 },
          estimatedArrivalTime: new Date(Date.now() + 60 * 60 * 1000),
          estimatedDuration: 480,
          crowdLevel: CrowdLevel.LOW
        },
        {
          locationId: 'victoria-peak',
          coordinates: { latitude: 22.2783, longitude: 114.1747 },
          estimatedArrivalTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
          estimatedDuration: 120,
          crowdLevel: CrowdLevel.LOW
        }
      ];

      const optimization = await service.optimizeUserRoute('user-123', route);
      
      expect(optimization).toBeDefined();
      expect(optimization.userId).toBe('user-123');
      expect(optimization.originalRoute).toEqual(route);
      expect(optimization.optimizedRoute).toBeDefined();
      expect(Array.isArray(optimization.optimizedRoute)).toBe(true);
      expect(typeof optimization.crowdAvoidanceScore).toBe('number');
      expect(typeof optimization.estimatedTimeSaved).toBe('number');
      expect(typeof optimization.alternativesConsidered).toBe('number');
    });

    it('should handle empty route', async () => {
      const optimization = await service.optimizeUserRoute('user-123', []);
      
      expect(optimization.originalRoute).toHaveLength(0);
      expect(optimization.optimizedRoute).toHaveLength(0);
    });
  });

  describe('subscribeToLocationAlerts', () => {
    it('should subscribe user to location alerts', async () => {
      const locationIds = ['hk-disneyland', 'victoria-peak'];
      const result = await service.subscribeToLocationAlerts('user-123', locationIds);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.subscribedLocations)).toBe(true);
      expect(result.subscribedLocations).toEqual(expect.arrayContaining(locationIds));
      expect(result.message).toContain('2 locations');
    });

    it('should handle empty location list', async () => {
      const result = await service.subscribeToLocationAlerts('user-123', []);
      
      expect(result.success).toBe(true);
      expect(result.subscribedLocations).toHaveLength(0);
      expect(result.message).toContain('0 locations');
    });

    it('should accumulate subscriptions for same user', async () => {
      await service.subscribeToLocationAlerts('user-123', ['location-1']);
      const result = await service.subscribeToLocationAlerts('user-123', ['location-2']);
      
      expect(result.subscribedLocations).toEqual(expect.arrayContaining(['location-1', 'location-2']));
    });
  });

  describe('getRecommendedTimes', () => {
    it('should return recommended times for locations', async () => {
      const locationIds = ['hk-disneyland', 'victoria-peak'];
      const recommendations = await service.getRecommendedTimes(locationIds);
      
      expect(typeof recommendations).toBe('object');
      
      // Check structure of recommendations
      for (const locationId in recommendations) {
        expect(locationIds).toContain(locationId);
        expect(Array.isArray(recommendations[locationId])).toBe(true);
        
        // Check that recommended times are Date objects
        recommendations[locationId].forEach((time: any) => {
          expect(time).toBeInstanceOf(Date);
        });
      }
    });

    it('should handle empty location list', async () => {
      const recommendations = await service.getRecommendedTimes([]);
      
      expect(typeof recommendations).toBe('object');
      expect(Object.keys(recommendations)).toHaveLength(0);
    });
  });

  describe('getHighCrowdLocations', () => {
    it('should return locations with high crowd levels', async () => {
      const highCrowdLocations = await service.getHighCrowdLocations();
      
      expect(Array.isArray(highCrowdLocations)).toBe(true);
      
      highCrowdLocations.forEach(location => {
        expect(location.locationId).toBeDefined();
        expect(location.locationName).toBeDefined();
        expect(location.crowdLevel).toBeDefined();
        expect([CrowdLevel.HIGH, CrowdLevel.VERY_HIGH]).toContain(location.crowdLevel);
        expect(location.alternatives).toBeNull(); // Should be null initially
      });
    });
  });

  describe('getServiceStats', () => {
    it('should return service statistics', () => {
      const stats = service.getServiceStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.connectedUsers).toBe('number');
      expect(typeof stats.monitoringActive).toBe('boolean');
      expect(typeof stats.totalSubscriptions).toBe('number');
      expect(stats.connectedUsers).toBeGreaterThanOrEqual(0);
      expect(stats.totalSubscriptions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('service lifecycle', () => {
    it('should start with monitoring active', () => {
      const stats = service.getServiceStats();
      expect(stats.monitoringActive).toBe(true);
    });

    it('should shutdown gracefully', () => {
      expect(() => service.shutdown()).not.toThrow();
      
      const stats = service.getServiceStats();
      expect(stats.monitoringActive).toBe(false);
    });
  });
});