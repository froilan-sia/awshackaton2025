import { EventRecommendationService, EventFilters, UserPreferences } from '../../src/services/eventRecommendationService';
import { EventModel } from '../../src/models/Event';
import { EventSource, EventCategory } from '../../src/types/event';

describe('EventRecommendationService', () => {
  let recommendationService: EventRecommendationService;
  let sampleEvents: any[];

  beforeEach(async () => {
    recommendationService = new EventRecommendationService();
    
    // Create sample events for testing
    sampleEvents = [
      {
        id: 'test_event_1',
        title: 'Art Exhibition',
        description: 'Contemporary art exhibition',
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          address: 'Central, Hong Kong',
          district: 'Central',
          venue: 'Art Gallery',
          nearbyTransport: []
        },
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        source: EventSource.CULTURAL_INSTITUTION,
        targetAudience: ['art_lovers', 'adults'],
        weatherDependent: false,
        categories: [EventCategory.CULTURAL],
        pricing: { isFree: false, ticketPrices: [{ category: 'Adult', price: 150, description: 'General admission' }], currency: 'HKD', bookingRequired: true },
        capacity: { waitlistAvailable: false, isFullyBooked: false },
        organizer: { name: 'Art Gallery', type: 'cultural_institution', contact: {} },
        images: [],
        tags: ['art', 'exhibition', 'contemporary'],
        localPerspective: { localPopularity: 8, localRecommendation: true, culturalSignificance: 'Important art venue', localTips: [], authenticityScore: 9 },
        practicalInfo: { languageSupport: ['en', 'zh-HK'], accessibility: { wheelchairAccessible: true, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'test_event_2',
        title: 'Family Fun Day',
        description: 'Activities for the whole family',
        location: {
          latitude: 22.2855,
          longitude: 114.1577,
          address: 'Admiralty, Hong Kong',
          district: 'Admiralty',
          venue: 'Community Center',
          nearbyTransport: []
        },
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        endTime: new Date(Date.now() + 50 * 60 * 60 * 1000),
        source: EventSource.COMMUNITY,
        targetAudience: ['families', 'children'],
        weatherDependent: false,
        categories: [EventCategory.FAMILY],
        pricing: { isFree: true, ticketPrices: [], currency: 'HKD', bookingRequired: false },
        capacity: { waitlistAvailable: false, isFullyBooked: false },
        organizer: { name: 'Community Center', type: 'community_group', contact: {} },
        images: [],
        tags: ['family', 'children', 'activities'],
        localPerspective: { localPopularity: 7, localRecommendation: true, culturalSignificance: 'Community event', localTips: [], authenticityScore: 6 },
        practicalInfo: { languageSupport: ['en', 'zh-HK'], accessibility: { wheelchairAccessible: true, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await EventModel.insertMany(sampleEvents);
  });

  describe('getFilteredEvents', () => {
    it('should filter events by category', async () => {
      const filters: EventFilters = {
        categories: [EventCategory.CULTURAL]
      };

      const events = await recommendationService.getFilteredEvents(filters);
      
      expect(events.length).toBe(1);
      expect(events[0].categories).toContain(EventCategory.CULTURAL);
    });

    it('should filter events by source', async () => {
      const filters: EventFilters = {
        sources: [EventSource.COMMUNITY]
      };

      const events = await recommendationService.getFilteredEvents(filters);
      
      expect(events.length).toBe(1);
      expect(events[0].source).toBe(EventSource.COMMUNITY);
    });

    it('should filter events by district', async () => {
      const filters: EventFilters = {
        districts: ['Central']
      };

      const events = await recommendationService.getFilteredEvents(filters);
      
      expect(events.length).toBe(1);
      expect(events[0].location.district).toBe('Central');
    });

    it('should filter free events', async () => {
      const filters: EventFilters = {
        isFree: true
      };

      const events = await recommendationService.getFilteredEvents(filters);
      
      expect(events.length).toBe(1);
      expect(events[0].pricing.isFree).toBe(true);
    });

    it('should filter by target audience', async () => {
      const filters: EventFilters = {
        targetAudience: ['families']
      };

      const events = await recommendationService.getFilteredEvents(filters);
      
      expect(events.length).toBe(1);
      expect(events[0].targetAudience).toContain('families');
    });
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return personalized recommendations with scores', async () => {
      const userPreferences: UserPreferences = {
        interests: ['art', 'culture'],
        budgetRange: 'medium',
        groupType: 'couple',
        ageGroup: 'adult',
        language: 'en'
      };

      const recommendations = await recommendationService.getPersonalizedRecommendations(userPreferences);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('event');
      expect(recommendations[0]).toHaveProperty('score');
      expect(recommendations[0]).toHaveProperty('reasons');
      expect(recommendations[0].score).toBeGreaterThan(0);
      expect(recommendations[0].score).toBeLessThanOrEqual(1);
    });

    it('should prioritize events matching user interests', async () => {
      const artLoverPreferences: UserPreferences = {
        interests: ['art', 'exhibition'],
        budgetRange: 'high',
        groupType: 'solo',
        ageGroup: 'adult',
        language: 'en'
      };

      const recommendations = await recommendationService.getPersonalizedRecommendations(artLoverPreferences);
      
      // Art exhibition should score higher than family event
      const artEvent = recommendations.find(r => r.event.title === 'Art Exhibition');
      const familyEvent = recommendations.find(r => r.event.title === 'Family Fun Day');
      
      expect(artEvent).toBeDefined();
      expect(familyEvent).toBeDefined();
      expect(artEvent!.score).toBeGreaterThan(familyEvent!.score);
    });

    it('should consider budget preferences', async () => {
      const budgetPreferences: UserPreferences = {
        interests: ['activities'],
        budgetRange: 'low',
        groupType: 'family',
        ageGroup: 'adult',
        language: 'en'
      };

      const recommendations = await recommendationService.getPersonalizedRecommendations(budgetPreferences);
      
      // Free family event should score higher for low budget
      const familyEvent = recommendations.find(r => r.event.title === 'Family Fun Day');
      expect(familyEvent).toBeDefined();
      expect(familyEvent!.score).toBeGreaterThan(0.5);
    });
  });

  describe('getNearbyEvents', () => {
    it('should return events within specified radius', async () => {
      const centralLat = 22.2783;
      const centralLng = 114.1747;
      const radiusKm = 10;

      const nearbyEvents = await recommendationService.getNearbyEvents(centralLat, centralLng, radiusKm);
      
      expect(nearbyEvents.length).toBeGreaterThan(0);
      // All events should be within the radius (both test events are in Hong Kong)
      expect(nearbyEvents.length).toBe(2);
    });

    it('should sort events by proximity', async () => {
      const centralLat = 22.2783;
      const centralLng = 114.1747;

      const nearbyEvents = await recommendationService.getNearbyEvents(centralLat, centralLng, 10);
      
      // The Central event should be first (closer to the query point)
      expect(nearbyEvents[0].location.district).toBe('Central');
    });

    it('should limit results', async () => {
      const centralLat = 22.2783;
      const centralLng = 114.1747;
      const limit = 1;

      const nearbyEvents = await recommendationService.getNearbyEvents(centralLat, centralLng, 10, limit);
      
      expect(nearbyEvents.length).toBe(limit);
    });
  });

  describe('getEventsByCategory', () => {
    it('should return events by category', async () => {
      const events = await recommendationService.getEventsByCategory(EventCategory.CULTURAL);
      
      expect(events.length).toBe(1);
      expect(events[0].categories).toContain(EventCategory.CULTURAL);
    });

    it('should sort by local insights when requested', async () => {
      const events = await recommendationService.getEventsByCategory(EventCategory.CULTURAL, true);
      
      expect(events.length).toBe(1);
      // Should be sorted by local popularity and authenticity
      expect(events[0].localPerspective.authenticityScore).toBeGreaterThan(0);
    });
  });
});