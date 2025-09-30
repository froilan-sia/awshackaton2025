import { LocationBasedTipService } from '../../src/services/locationBasedTipService';
import { PracticalTipsService } from '../../src/services/practicalTipsService';
import { VenueType, TipCategory, Priority } from '../../src/types/practicalTips';

describe('LocationBasedTipService', () => {
  let service: LocationBasedTipService;
  let practicalTipsService: PracticalTipsService;

  beforeEach(() => {
    practicalTipsService = new PracticalTipsService();
    service = new LocationBasedTipService(practicalTipsService);
  });

  describe('getTipsForLocation', () => {
    it('should return tips for nearby locations', async () => {
      const request = {
        location: {
          latitude: 22.2711, // Near Victoria Peak
          longitude: 114.1489
        },
        timeOfDay: 'afternoon' as const
      };

      const response = await service.getTipsForLocation(
        request.location.latitude,
        request.location.longitude,
        request
      );

      expect(response).toBeDefined();
      expect(response.tips).toBeDefined();
      expect(Array.isArray(response.tips)).toBe(true);
      expect(response.contextualRelevance).toBeGreaterThanOrEqual(0);
      expect(response.contextualRelevance).toBeLessThanOrEqual(1);
    });

    it('should combine location-based and contextual tips', async () => {
      const request = {
        location: {
          latitude: 22.2988, // Near Tsim Sha Tsui
          longitude: 114.1722,
          venueType: VenueType.CULTURAL_SITE
        },
        timeOfDay: 'evening' as const
      };

      const response = await service.getTipsForLocation(
        request.location.latitude,
        request.location.longitude,
        request
      );

      expect(response.tips.length).toBeGreaterThan(0);
      expect(response.deliveryMethod).toBe('immediate');
    });

    it('should calculate location relevance correctly', async () => {
      const nearbyRequest = {
        location: {
          latitude: 22.2711, // Very close to Victoria Peak
          longitude: 114.1489
        },
        timeOfDay: 'morning' as const
      };

      const farRequest = {
        location: {
          latitude: 22.5, // Far from any predefined locations
          longitude: 114.5
        },
        timeOfDay: 'morning' as const
      };

      const nearbyResponse = await service.getTipsForLocation(
        nearbyRequest.location.latitude,
        nearbyRequest.location.longitude,
        nearbyRequest
      );

      const farResponse = await service.getTipsForLocation(
        farRequest.location.latitude,
        farRequest.location.longitude,
        farRequest
      );

      // Nearby location should have higher relevance
      expect(nearbyResponse.contextualRelevance).toBeGreaterThanOrEqual(farResponse.contextualRelevance);
    });
  });

  describe('addLocationBasedTip', () => {
    it('should add a new location-based tip', async () => {
      const locationTipData = {
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          radius: 200,
          name: 'Test Location',
          venueType: VenueType.MARKET
        },
        tips: [
          {
            id: 'test_tip_1',
            category: TipCategory.CULTURAL,
            title: 'Test Market Tip',
            content: 'This is a test tip for the market',
            priority: Priority.MEDIUM,
            conditions: [],
            applicableVenues: [VenueType.MARKET],
            weatherConditions: [],
            language: 'en',
            tags: ['test', 'market'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        triggerConditions: [
          {
            type: 'venue' as const,
            value: VenueType.MARKET,
            operator: 'equals' as const
          }
        ],
        isActive: true
      };

      const result = await service.addLocationBasedTip(locationTipData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.location.name).toBe('Test Location');
      expect(result.tips).toHaveLength(1);
      expect(result.isActive).toBe(true);
    });
  });

  describe('updateLocationBasedTip', () => {
    it('should update an existing location-based tip', async () => {
      const locationTipData = {
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          radius: 200,
          name: 'Original Location',
          venueType: VenueType.MARKET
        },
        tips: [],
        triggerConditions: [],
        isActive: true
      };

      const created = await service.addLocationBasedTip(locationTipData);
      const updates = {
        location: {
          ...locationTipData.location,
          name: 'Updated Location'
        },
        isActive: false
      };

      const updated = await service.updateLocationBasedTip(created.id, updates);

      expect(updated).toBeDefined();
      expect(updated!.location.name).toBe('Updated Location');
      expect(updated!.isActive).toBe(false);
    });

    it('should return null for non-existent location tip', async () => {
      const result = await service.updateLocationBasedTip('non-existent-id', {
        isActive: false
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteLocationBasedTip', () => {
    it('should delete an existing location-based tip', async () => {
      const locationTipData = {
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          radius: 200,
          name: 'To Be Deleted',
          venueType: VenueType.MARKET
        },
        tips: [],
        triggerConditions: [],
        isActive: true
      };

      const created = await service.addLocationBasedTip(locationTipData);
      const deleted = await service.deleteLocationBasedTip(created.id);

      expect(deleted).toBe(true);

      const allTips = await service.getLocationBasedTips();
      const foundTip = allTips.find(tip => tip.id === created.id);
      expect(foundTip).toBeUndefined();
    });

    it('should return false for non-existent location tip', async () => {
      const deleted = await service.deleteLocationBasedTip('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('getLocationBasedTips', () => {
    it('should return only active location-based tips', async () => {
      const activeTipData = {
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          radius: 200,
          name: 'Active Location',
          venueType: VenueType.MARKET
        },
        tips: [],
        triggerConditions: [],
        isActive: true
      };

      const inactiveTipData = {
        location: {
          latitude: 22.3200,
          longitude: 114.1700,
          radius: 200,
          name: 'Inactive Location',
          venueType: VenueType.MARKET
        },
        tips: [],
        triggerConditions: [],
        isActive: false
      };

      await service.addLocationBasedTip(activeTipData);
      await service.addLocationBasedTip(inactiveTipData);

      const allTips = await service.getLocationBasedTips();
      
      expect(allTips.every(tip => tip.isActive)).toBe(true);
      expect(allTips.some(tip => tip.location.name === 'Active Location')).toBe(true);
      expect(allTips.some(tip => tip.location.name === 'Inactive Location')).toBe(false);
    });
  });

  describe('distance calculation', () => {
    it('should correctly identify tips within range', async () => {
      // Add a tip with small radius
      const locationTipData = {
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          radius: 100, // 100 meters
          name: 'Small Radius Location',
          venueType: VenueType.MARKET
        },
        tips: [
          {
            id: 'small_radius_tip',
            category: TipCategory.PREPARATION,
            title: 'Small Radius Tip',
            content: 'This tip has a small radius',
            priority: Priority.MEDIUM,
            conditions: [],
            applicableVenues: [VenueType.MARKET],
            weatherConditions: [],
            language: 'en',
            tags: ['small', 'radius'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        triggerConditions: [],
        isActive: true
      };

      await service.addLocationBasedTip(locationTipData);

      // Test location very close (should be within range)
      const closeRequest = {
        location: {
          latitude: 22.3194, // Very close
          longitude: 114.1695
        },
        timeOfDay: 'morning' as const
      };

      // Test location far away (should be outside range)
      const farRequest = {
        location: {
          latitude: 22.3300, // About 1km away
          longitude: 114.1800
        },
        timeOfDay: 'morning' as const
      };

      const closeResponse = await service.getTipsForLocation(
        closeRequest.location.latitude,
        closeRequest.location.longitude,
        closeRequest
      );

      const farResponse = await service.getTipsForLocation(
        farRequest.location.latitude,
        farRequest.location.longitude,
        farRequest
      );

      // Close location should have the location-specific tip
      const hasLocationTip = closeResponse.tips.some(tip => tip.id === 'small_radius_tip');
      const farHasLocationTip = farResponse.tips.some(tip => tip.id === 'small_radius_tip');

      expect(hasLocationTip).toBe(true);
      expect(farHasLocationTip).toBe(false);
    });
  });
});