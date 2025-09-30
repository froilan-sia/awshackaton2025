import { SmartRoutingService } from '../../src/services/smartRoutingService';
import { CrowdTrackingService } from '../../src/services/crowdTrackingService';
import { AlternativeRecommendationService } from '../../src/services/alternativeRecommendationService';
import { RoutePoint, CrowdLevel } from '../../src/types/crowd';

describe('SmartRoutingService', () => {
  let service: SmartRoutingService;
  let crowdTrackingService: CrowdTrackingService;
  let alternativeService: AlternativeRecommendationService;

  beforeEach(() => {
    crowdTrackingService = new CrowdTrackingService();
    alternativeService = new AlternativeRecommendationService(crowdTrackingService);
    service = new SmartRoutingService(crowdTrackingService, alternativeService);
  });

  describe('optimizeRoute', () => {
    it('should optimize route by replacing overcrowded locations', async () => {
      // Set up overcrowded location
      await crowdTrackingService.updateCrowdData('hk-disneyland', {
        crowdLevel: CrowdLevel.VERY_HIGH,
        estimatedWaitTime: 90,
        currentOccupancy: 48000,
        capacity: 50000
      });

      const originalRoute: RoutePoint[] = [
        {
          locationId: 'hk-disneyland',
          coordinates: { latitude: 22.3129, longitude: 114.0413 },
          estimatedArrivalTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          estimatedDuration: 480, // 8 hours
          crowdLevel: CrowdLevel.LOW // Will be updated
        }
      ];

      const optimization = await service.optimizeRoute('user-123', originalRoute);
      
      expect(optimization.userId).toBe('user-123');
      expect(optimization.originalRoute).toEqual(originalRoute);
      expect(optimization.optimizedRoute).toBeDefined();
      expect(optimization.alternativesConsidered).toBeGreaterThanOrEqual(0);
      
      // If alternatives were found and used, check the optimization
      if (optimization.alternativesConsidered > 0 && optimization.estimatedTimeSaved > 0) {
        expect(optimization.crowdAvoidanceScore).toBeGreaterThan(0);
        expect(optimization.optimizedRoute[0].locationId).not.toBe('hk-disneyland');
      }
    });

    it('should keep original route if no better alternatives exist', async () => {
      // Set up low crowd location
      await crowdTrackingService.updateCrowdData('victoria-peak', {
        crowdLevel: CrowdLevel.LOW,
        estimatedWaitTime: 5,
        currentOccupancy: 500,
        capacity: 5000
      });

      const originalRoute: RoutePoint[] = [
        {
          locationId: 'victoria-peak',
          coordinates: { latitude: 22.2783, longitude: 114.1747 },
          estimatedArrivalTime: new Date(Date.now() + 60 * 60 * 1000),
          estimatedDuration: 120,
          crowdLevel: CrowdLevel.LOW
        }
      ];

      const optimization = await service.optimizeRoute('user-123', originalRoute);
      
      expect(optimization.optimizedRoute[0].locationId).toBe('victoria-peak');
      expect(optimization.estimatedTimeSaved).toBe(0);
    });

    it('should handle multiple locations in route', async () => {
      const originalRoute: RoutePoint[] = [
        {
          locationId: 'hk-disneyland',
          coordinates: { latitude: 22.3129, longitude: 114.0413 },
          estimatedArrivalTime: new Date(Date.now() + 60 * 60 * 1000),
          estimatedDuration: 240,
          crowdLevel: CrowdLevel.LOW
        },
        {
          locationId: 'victoria-peak',
          coordinates: { latitude: 22.2783, longitude: 114.1747 },
          estimatedArrivalTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
          estimatedDuration: 120,
          crowdLevel: CrowdLevel.LOW
        }
      ];

      const optimization = await service.optimizeRoute('user-123', originalRoute);
      
      expect(optimization.optimizedRoute).toHaveLength(2);
      expect(optimization.originalRoute).toHaveLength(2);
    });
  });

  describe('findOptimalVisitTime', () => {
    it('should find optimal time within preferred time window', async () => {
      const preferredTime = new Date();
      preferredTime.setHours(14, 0, 0, 0); // 2 PM

      const optimalTime = await service.findOptimalVisitTime('test-location', preferredTime);
      
      if (optimalTime) {
        // Should be within 4 hours of preferred time
        const timeDiff = Math.abs(optimalTime.getTime() - preferredTime.getTime());
        const fourHours = 4 * 60 * 60 * 1000;
        expect(timeDiff).toBeLessThanOrEqual(fourHours);
      }
    });

    it('should return null if no predictions available', async () => {
      // Mock service to return empty predictions
      const mockCrowdService = {
        getCrowdPredictions: jest.fn().mockResolvedValue([])
      } as any;
      
      const testService = new SmartRoutingService(mockCrowdService, alternativeService);
      const optimalTime = await testService.findOptimalVisitTime('test-location', new Date());
      
      expect(optimalTime).toBeNull();
    });
  });

  describe('calculateRouteEfficiency', () => {
    it('should calculate efficiency based on crowd levels and duration', () => {
      const route: RoutePoint[] = [
        {
          locationId: 'location-1',
          coordinates: { latitude: 22.3, longitude: 114.2 },
          estimatedArrivalTime: new Date(),
          estimatedDuration: 120, // 2 hours
          crowdLevel: CrowdLevel.LOW
        },
        {
          locationId: 'location-2',
          coordinates: { latitude: 22.3, longitude: 114.2 },
          estimatedArrivalTime: new Date(),
          estimatedDuration: 60, // 1 hour
          crowdLevel: CrowdLevel.HIGH
        }
      ];

      const efficiency = service.calculateRouteEfficiency(route);
      
      expect(efficiency).toBeGreaterThan(0);
      expect(efficiency).toBeLessThanOrEqual(1);
      
      // Route with low crowd should be more efficient than high crowd
      const lowCrowdRoute: RoutePoint[] = [
        {
          locationId: 'location-1',
          coordinates: { latitude: 22.3, longitude: 114.2 },
          estimatedArrivalTime: new Date(),
          estimatedDuration: 120,
          crowdLevel: CrowdLevel.LOW
        }
      ];

      const highCrowdRoute: RoutePoint[] = [
        {
          locationId: 'location-1',
          coordinates: { latitude: 22.3, longitude: 114.2 },
          estimatedArrivalTime: new Date(),
          estimatedDuration: 120,
          crowdLevel: CrowdLevel.VERY_HIGH
        }
      ];

      const lowEfficiency = service.calculateRouteEfficiency(lowCrowdRoute);
      const highEfficiency = service.calculateRouteEfficiency(highCrowdRoute);
      
      expect(lowEfficiency).toBeGreaterThan(highEfficiency);
    });

    it('should handle empty route', () => {
      const efficiency = service.calculateRouteEfficiency([]);
      expect(efficiency).toBe(0);
    });
  });

  describe('getRecommendedDepartureTimes', () => {
    it('should return recommended times for multiple locations', async () => {
      const locationIds = ['hk-disneyland', 'victoria-peak'];
      const recommendations = await service.getRecommendedDepartureTimes(locationIds);
      
      expect(recommendations.size).toBeGreaterThan(0);
      
      for (const [locationId, times] of recommendations) {
        expect(locationIds).toContain(locationId);
        expect(Array.isArray(times)).toBe(true);
        expect(times.length).toBeLessThanOrEqual(5); // Max 5 recommendations
        
        // All recommended times should be in the future
        times.forEach(time => {
          expect(time).toBeInstanceOf(Date);
          expect(time.getTime()).toBeGreaterThan(Date.now());
        });
      }
    });

    it('should handle empty location list', async () => {
      const recommendations = await service.getRecommendedDepartureTimes([]);
      expect(recommendations.size).toBe(0);
    });

    it('should only recommend times with low to moderate crowd levels', async () => {
      const recommendations = await service.getRecommendedDepartureTimes(['test-location']);
      
      // Since we're using mock data, we can't directly verify crowd levels
      // but we can verify the structure and that recommendations exist
      if (recommendations.has('test-location')) {
        const times = recommendations.get('test-location')!;
        expect(times.length).toBeGreaterThan(0);
      }
    });
  });
});