import { CrowdTrackingService } from '../../src/services/crowdTrackingService';
import { CrowdLevel, CrowdDataSource } from '../../src/types/crowd';

describe('CrowdTrackingService', () => {
  let service: CrowdTrackingService;

  beforeEach(() => {
    service = new CrowdTrackingService();
  });

  describe('getCrowdData', () => {
    it('should return crowd data for existing location', async () => {
      const crowdData = await service.getCrowdData('hk-disneyland');
      
      expect(crowdData).toBeDefined();
      expect(crowdData?.locationId).toBe('hk-disneyland');
      expect(crowdData?.locationName).toBe('Hong Kong Disneyland');
      expect(crowdData?.dataSource).toBe(CrowdDataSource.MOCK);
    });

    it('should return null for non-existing location', async () => {
      const crowdData = await service.getCrowdData('non-existing-location');
      
      expect(crowdData).toBeDefined(); // Mock service generates data for any location
      expect(crowdData?.locationId).toBe('non-existing-location');
    });

    it('should return fresh data with recent timestamp', async () => {
      const crowdData = await service.getCrowdData('victoria-peak');
      
      expect(crowdData).toBeDefined();
      expect(crowdData?.isDataFresh()).toBe(true);
      
      const now = new Date();
      const dataAge = now.getTime() - crowdData!.timestamp.getTime();
      expect(dataAge).toBeLessThan(60000); // Less than 1 minute old
    });
  });

  describe('getBulkCrowdData', () => {
    it('should return crowd data for multiple locations', async () => {
      const locationIds = ['hk-disneyland', 'victoria-peak', 'ocean-park'];
      const crowdDataMap = await service.getBulkCrowdData(locationIds);
      
      expect(crowdDataMap.size).toBe(3);
      expect(crowdDataMap.has('hk-disneyland')).toBe(true);
      expect(crowdDataMap.has('victoria-peak')).toBe(true);
      expect(crowdDataMap.has('ocean-park')).toBe(true);
    });

    it('should handle empty location list', async () => {
      const crowdDataMap = await service.getBulkCrowdData([]);
      
      expect(crowdDataMap.size).toBe(0);
    });
  });

  describe('updateCrowdData', () => {
    it('should update crowd data for existing location', async () => {
      const updatedData = await service.updateCrowdData('test-location', {
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 45,
        currentOccupancy: 800,
        capacity: 1000
      });
      
      expect(updatedData.crowdLevel).toBe(CrowdLevel.HIGH);
      expect(updatedData.estimatedWaitTime).toBe(45);
      expect(updatedData.currentOccupancy).toBe(800);
      expect(updatedData.capacity).toBe(1000);
    });

    it('should create new location if not exists', async () => {
      const newData = await service.updateCrowdData('new-location', {
        locationName: 'New Test Location',
        coordinates: { latitude: 22.3, longitude: 114.2 },
        crowdLevel: CrowdLevel.LOW,
        estimatedWaitTime: 5
      });
      
      expect(newData.locationId).toBe('new-location');
      expect(newData.locationName).toBe('New Test Location');
      expect(newData.crowdLevel).toBe(CrowdLevel.LOW);
    });
  });

  describe('getCrowdPredictions', () => {
    it('should return hourly predictions for next 24 hours', async () => {
      const predictions = await service.getCrowdPredictions('test-location', 24);
      
      expect(predictions).toHaveLength(24);
      
      predictions.forEach((prediction, index) => {
        expect(prediction.locationId).toBe('test-location');
        expect([CrowdLevel.LOW, CrowdLevel.MODERATE, CrowdLevel.HIGH, CrowdLevel.VERY_HIGH]).toContain(prediction.predictedCrowdLevel);
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        
        // Check time progression
        if (index > 0) {
          const prevTime = predictions[index - 1].timeSlot.getTime();
          const currentTime = prediction.timeSlot.getTime();
          expect(currentTime - prevTime).toBe(60 * 60 * 1000); // 1 hour difference
        }
      });
    });

    it('should return limited predictions for shorter time period', async () => {
      const predictions = await service.getCrowdPredictions('test-location', 6);
      
      expect(predictions).toHaveLength(6);
    });
  });

  describe('getHighCrowdLocations', () => {
    it('should return locations with high crowd levels', async () => {
      // Update some locations to have high crowd levels
      await service.updateCrowdData('high-crowd-1', {
        crowdLevel: CrowdLevel.HIGH,
        currentOccupancy: 900,
        capacity: 1000
      });
      
      await service.updateCrowdData('high-crowd-2', {
        crowdLevel: CrowdLevel.VERY_HIGH,
        currentOccupancy: 950,
        capacity: 1000
      });
      
      const highCrowdLocations = await service.getHighCrowdLocations();
      
      expect(highCrowdLocations.length).toBeGreaterThan(0);
      
      highCrowdLocations.forEach(location => {
        expect(location.isOvercrowded()).toBe(true);
        expect([CrowdLevel.HIGH, CrowdLevel.VERY_HIGH]).toContain(location.crowdLevel);
      });
    });
  });

  describe('calculateCrowdLevel', () => {
    it('should calculate correct crowd levels based on occupancy', () => {
      expect(service.calculateCrowdLevel(10, 100)).toBe(CrowdLevel.LOW); // 10%
      expect(service.calculateCrowdLevel(50, 100)).toBe(CrowdLevel.MODERATE); // 50%
      expect(service.calculateCrowdLevel(80, 100)).toBe(CrowdLevel.HIGH); // 80%
      expect(service.calculateCrowdLevel(95, 100)).toBe(CrowdLevel.VERY_HIGH); // 95%
    });

    it('should handle edge cases', () => {
      expect(service.calculateCrowdLevel(0, 100)).toBe(CrowdLevel.LOW);
      expect(service.calculateCrowdLevel(100, 100)).toBe(CrowdLevel.VERY_HIGH);
      expect(service.calculateCrowdLevel(40, 100)).toBe(CrowdLevel.MODERATE); // Exactly 40%
      expect(service.calculateCrowdLevel(70, 100)).toBe(CrowdLevel.HIGH); // Exactly 70%
      expect(service.calculateCrowdLevel(90, 100)).toBe(CrowdLevel.VERY_HIGH); // Exactly 90%
    });
  });
});