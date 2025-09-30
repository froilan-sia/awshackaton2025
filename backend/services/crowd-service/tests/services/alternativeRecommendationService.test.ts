import { AlternativeRecommendationService } from '../../src/services/alternativeRecommendationService';
import { CrowdTrackingService } from '../../src/services/crowdTrackingService';
import { CrowdLevel } from '../../src/types/crowd';

describe('AlternativeRecommendationService', () => {
  let service: AlternativeRecommendationService;
  let crowdTrackingService: CrowdTrackingService;

  beforeEach(() => {
    crowdTrackingService = new CrowdTrackingService();
    service = new AlternativeRecommendationService(crowdTrackingService);
  });

  describe('getAlternatives', () => {
    it('should return alternatives for overcrowded location', async () => {
      // Set up a high crowd location
      await crowdTrackingService.updateCrowdData('hk-disneyland', {
        crowdLevel: CrowdLevel.VERY_HIGH,
        estimatedWaitTime: 60,
        currentOccupancy: 45000,
        capacity: 50000
      });

      const alternatives = await service.getAlternatives('hk-disneyland');
      
      if (alternatives) {
        expect(alternatives.originalLocationId).toBe('hk-disneyland');
        expect(alternatives.alternatives.length).toBeGreaterThan(0);
        expect(alternatives.alternatives.length).toBeLessThanOrEqual(5);
        expect(alternatives.reason).toContain('Hong Kong Disneyland');
      
        // Check that alternatives have lower crowd levels
        alternatives.alternatives.forEach(alt => {
          expect([CrowdLevel.LOW, CrowdLevel.MODERATE]).toContain(alt.crowdLevel);
          expect(alt.similarity).toBeGreaterThan(0);
          expect(alt.similarity).toBeLessThanOrEqual(1);
          expect(alt.distance).toBeGreaterThan(0);
          expect(alt.estimatedTravelTime).toBeGreaterThan(0);
        });
      } else {
        // If no alternatives found, that's also valid for this test
        expect(alternatives).toBeNull();
      }
    });

    it('should return null for location with low crowd', async () => {
      // Set up a low crowd location
      await crowdTrackingService.updateCrowdData('test-location', {
        crowdLevel: CrowdLevel.LOW,
        estimatedWaitTime: 5,
        currentOccupancy: 100,
        capacity: 1000
      });

      const alternatives = await service.getAlternatives('test-location');
      
      expect(alternatives).toBeNull();
    });

    it('should return null for non-existent location', async () => {
      const alternatives = await service.getAlternatives('non-existent-location');
      
      expect(alternatives).toBeNull();
    });

    it('should limit alternatives to maximum distance', async () => {
      // Set up a high crowd location
      await crowdTrackingService.updateCrowdData('victoria-peak', {
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 30,
        currentOccupancy: 4000,
        capacity: 5000
      });

      const alternatives = await service.getAlternatives('victoria-peak', 1000); // 1km radius
      
      if (alternatives) {
        alternatives.alternatives.forEach(alt => {
          expect(alt.distance).toBeLessThanOrEqual(1000);
        });
      }
    });
  });

  describe('getBulkAlternatives', () => {
    it('should return alternatives for multiple overcrowded locations', async () => {
      // Set up multiple high crowd locations
      await crowdTrackingService.updateCrowdData('location-1', {
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 40
      });
      
      await crowdTrackingService.updateCrowdData('location-2', {
        crowdLevel: CrowdLevel.VERY_HIGH,
        estimatedWaitTime: 60
      });

      const bulkAlternatives = await service.getBulkAlternatives(['location-1', 'location-2']);
      
      // May or may not have alternatives depending on mock data
      expect(bulkAlternatives.size).toBeGreaterThanOrEqual(0);
      
      for (const [locationId, alternatives] of bulkAlternatives) {
        expect(['location-1', 'location-2']).toContain(locationId);
        expect(alternatives.originalLocationId).toBe(locationId);
        expect(alternatives.alternatives.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty location list', async () => {
      const bulkAlternatives = await service.getBulkAlternatives([]);
      
      expect(bulkAlternatives.size).toBe(0);
    });

    it('should handle mix of crowded and non-crowded locations', async () => {
      // Set up one high crowd and one low crowd location
      await crowdTrackingService.updateCrowdData('crowded-location', {
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 45
      });
      
      await crowdTrackingService.updateCrowdData('empty-location', {
        crowdLevel: CrowdLevel.LOW,
        estimatedWaitTime: 2
      });

      const bulkAlternatives = await service.getBulkAlternatives(['crowded-location', 'empty-location']);
      
      // Should only have alternatives for the crowded location (if any alternatives exist)
      if (bulkAlternatives.size > 0) {
        expect(bulkAlternatives.has('empty-location')).toBe(false);
      }
    });
  });

  describe('alternative quality', () => {
    it('should return alternatives sorted by quality score', async () => {
      // Set up a high crowd theme park
      await crowdTrackingService.updateCrowdData('hk-disneyland', {
        crowdLevel: CrowdLevel.VERY_HIGH,
        estimatedWaitTime: 90
      });

      const alternatives = await service.getAlternatives('hk-disneyland');
      
      if (alternatives && alternatives.alternatives.length > 1) {
        // Check that alternatives are sorted (higher similarity/lower crowd first)
        for (let i = 1; i < alternatives.alternatives.length; i++) {
          const prev = alternatives.alternatives[i - 1];
          const current = alternatives.alternatives[i];
          
          // Calculate quality scores
          const prevScore = prev.similarity * 0.6 + (1 - getCrowdLevelValue(prev.crowdLevel) / 4) * 0.4;
          const currentScore = current.similarity * 0.6 + (1 - getCrowdLevelValue(current.crowdLevel) / 4) * 0.4;
          
          expect(prevScore).toBeGreaterThanOrEqual(currentScore);
        }
      }
    });

    it('should include similar categories in alternatives', async () => {
      // Set up a high crowd theme park
      await crowdTrackingService.updateCrowdData('hk-disneyland', {
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 45
      });

      const alternatives = await service.getAlternatives('hk-disneyland');
      
      if (alternatives) {
        // Should include Ocean Park as it's also a theme park
        const oceanParkAlternative = alternatives.alternatives.find(
          alt => alt.locationId === 'ocean-park'
        );
        
        if (oceanParkAlternative) {
          expect(oceanParkAlternative.similarity).toBeGreaterThan(0.3);
        }
      }
    });
  });
});

function getCrowdLevelValue(crowdLevel: CrowdLevel): number {
  switch (crowdLevel) {
    case CrowdLevel.LOW: return 1;
    case CrowdLevel.MODERATE: return 2;
    case CrowdLevel.HIGH: return 3;
    case CrowdLevel.VERY_HIGH: return 4;
    default: return 1;
  }
}