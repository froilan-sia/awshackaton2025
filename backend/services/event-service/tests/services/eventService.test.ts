import { EventService } from '../../src/services/eventService';
import { HKTBEventService } from '../../src/services/hktbEventService';
import { MallEventService } from '../../src/services/mallEventService';
import { EventModel } from '../../src/models/Event';
import { EventSource, EventCategory } from '../../src/types/event';

// Mock the external services
jest.mock('../../src/services/hktbEventService');
jest.mock('../../src/services/mallEventService');

describe('EventService', () => {
  let eventService: EventService;
  let mockHKTBService: jest.Mocked<HKTBEventService>;
  let mockMallService: jest.Mocked<MallEventService>;

  beforeEach(() => {
    eventService = new EventService();
    mockHKTBService = new HKTBEventService() as jest.Mocked<HKTBEventService>;
    mockMallService = new MallEventService() as jest.Mocked<MallEventService>;
    
    // Setup mocks
    mockHKTBService.syncHKTBEvents = jest.fn().mockResolvedValue({
      created: 2,
      updated: 0,
      errors: 0
    });
    
    mockMallService.syncMallEvents = jest.fn().mockResolvedValue({
      created: 3,
      updated: 0,
      errors: 0
    });

    // Replace the services in eventService
    (eventService as any).hktbService = mockHKTBService;
    (eventService as any).mallService = mockMallService;
  });

  describe('syncAllEvents', () => {
    it('should sync events from all sources', async () => {
      const result = await eventService.syncAllEvents();
      
      expect(result).toEqual({
        hktb: { created: 2, updated: 0, errors: 0 },
        mall: { created: 3, updated: 0, errors: 0 },
        totalProcessed: 5,
        totalErrors: 0
      });
      
      expect(mockHKTBService.syncHKTBEvents).toHaveBeenCalled();
      expect(mockMallService.syncMallEvents).toHaveBeenCalled();
    });

    it('should handle errors during sync', async () => {
      mockHKTBService.syncHKTBEvents.mockRejectedValue(new Error('HKTB API Error'));
      
      await expect(eventService.syncAllEvents()).rejects.toThrow('HKTB API Error');
    });
  });

  describe('getEventById', () => {
    beforeEach(async () => {
      // Create a test event
      await EventModel.create({
        id: 'test_event_1',
        title: 'Test Event',
        description: 'Test Description',
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          address: 'Test Address',
          district: 'Central',
          venue: 'Test Venue',
          nearbyTransport: []
        },
        startTime: new Date(),
        endTime: new Date(),
        source: EventSource.HKTB,
        targetAudience: ['general'],
        weatherDependent: false,
        categories: [EventCategory.CULTURAL],
        pricing: { isFree: true, ticketPrices: [], currency: 'HKD', bookingRequired: false },
        capacity: { waitlistAvailable: false, isFullyBooked: false },
        organizer: { name: 'Test Organizer', type: 'government', contact: {} },
        images: [],
        tags: [],
        localPerspective: { localPopularity: 5, localRecommendation: true, culturalSignificance: '', localTips: [], authenticityScore: 5 },
        practicalInfo: { languageSupport: ['en'], accessibility: { wheelchairAccessible: false, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] }
      });
    });

    it('should return event by ID', async () => {
      const event = await eventService.getEventById('test_event_1');
      
      expect(event).toBeDefined();
      expect(event!.id).toBe('test_event_1');
      expect(event!.title).toBe('Test Event');
    });

    it('should return null for non-existent event', async () => {
      const event = await eventService.getEventById('non_existent');
      
      expect(event).toBeNull();
    });
  });

  describe('getUpcomingEvents', () => {
    beforeEach(async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Create future event
      await EventModel.create({
        id: 'future_event',
        title: 'Future Event',
        description: 'Future Description',
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          address: 'Test Address',
          district: 'Central',
          venue: 'Test Venue',
          nearbyTransport: []
        },
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        source: EventSource.HKTB,
        targetAudience: ['general'],
        weatherDependent: false,
        categories: [EventCategory.CULTURAL],
        pricing: { isFree: true, ticketPrices: [], currency: 'HKD', bookingRequired: false },
        capacity: { waitlistAvailable: false, isFullyBooked: false },
        organizer: { name: 'Test Organizer', type: 'government', contact: {} },
        images: [],
        tags: [],
        localPerspective: { localPopularity: 5, localRecommendation: true, culturalSignificance: '', localTips: [], authenticityScore: 5 },
        practicalInfo: { languageSupport: ['en'], accessibility: { wheelchairAccessible: false, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] }
      });

      // Create past event
      await EventModel.create({
        id: 'past_event',
        title: 'Past Event',
        description: 'Past Description',
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          address: 'Test Address',
          district: 'Central',
          venue: 'Test Venue',
          nearbyTransport: []
        },
        startTime: pastDate,
        endTime: new Date(pastDate.getTime() + 60 * 60 * 1000),
        source: EventSource.HKTB,
        targetAudience: ['general'],
        weatherDependent: false,
        categories: [EventCategory.CULTURAL],
        pricing: { isFree: true, ticketPrices: [], currency: 'HKD', bookingRequired: false },
        capacity: { waitlistAvailable: false, isFullyBooked: false },
        organizer: { name: 'Test Organizer', type: 'government', contact: {} },
        images: [],
        tags: [],
        localPerspective: { localPopularity: 5, localRecommendation: true, culturalSignificance: '', localTips: [], authenticityScore: 5 },
        practicalInfo: { languageSupport: ['en'], accessibility: { wheelchairAccessible: false, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] }
      });
    });

    it('should return only upcoming events', async () => {
      const events = await eventService.getUpcomingEvents();
      
      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Future Event');
    });

    it('should respect limit parameter', async () => {
      const events = await eventService.getUpcomingEvents(0);
      
      expect(events.length).toBe(0);
    });
  });

  describe('searchEvents', () => {
    beforeEach(async () => {
      await EventModel.create({
        id: 'searchable_event',
        title: 'Art Exhibition',
        description: 'Contemporary art exhibition in Central',
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          address: 'Central, Hong Kong',
          district: 'Central',
          venue: 'Art Gallery',
          nearbyTransport: []
        },
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        source: EventSource.CULTURAL_INSTITUTION,
        targetAudience: ['art_lovers'],
        weatherDependent: false,
        categories: [EventCategory.CULTURAL],
        pricing: { isFree: false, ticketPrices: [], currency: 'HKD', bookingRequired: false },
        capacity: { waitlistAvailable: false, isFullyBooked: false },
        organizer: { name: 'Art Gallery', type: 'cultural_institution', contact: {} },
        images: [],
        tags: ['art', 'exhibition'],
        localPerspective: { localPopularity: 8, localRecommendation: true, culturalSignificance: '', localTips: [], authenticityScore: 9 },
        practicalInfo: { languageSupport: ['en'], accessibility: { wheelchairAccessible: true, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] }
      });
    });

    it('should search events by title', async () => {
      const events = await eventService.searchEvents('Art');
      
      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Art Exhibition');
    });

    it('should search events by description', async () => {
      const events = await eventService.searchEvents('Contemporary');
      
      expect(events.length).toBe(1);
      expect(events[0].description).toContain('Contemporary');
    });

    it('should search events by tags', async () => {
      const events = await eventService.searchEvents('exhibition');
      
      expect(events.length).toBe(1);
      expect(events[0].tags).toContain('exhibition');
    });

    it('should search events by venue', async () => {
      const events = await eventService.searchEvents('Gallery');
      
      expect(events.length).toBe(1);
      expect(events[0].location.venue).toBe('Art Gallery');
    });

    it('should return empty array for no matches', async () => {
      const events = await eventService.searchEvents('NonExistentTerm');
      
      expect(events.length).toBe(0);
    });
  });

  describe('getEventStatistics', () => {
    beforeEach(async () => {
      // Create events with different sources and categories
      await EventModel.insertMany([
        {
          id: 'stat_event_1',
          title: 'HKTB Event',
          description: 'Test',
          location: { latitude: 22.2783, longitude: 114.1747, address: 'Test', district: 'Central', venue: 'Test', nearbyTransport: [] },
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
          source: EventSource.HKTB,
          targetAudience: ['general'],
          weatherDependent: false,
          categories: [EventCategory.CULTURAL],
          pricing: { isFree: true, ticketPrices: [], currency: 'HKD', bookingRequired: false },
          capacity: { waitlistAvailable: false, isFullyBooked: false },
          organizer: { name: 'Test', type: 'government', contact: {} },
          images: [], tags: [],
          localPerspective: { localPopularity: 5, localRecommendation: true, culturalSignificance: '', localTips: [], authenticityScore: 5 },
          practicalInfo: { languageSupport: ['en'], accessibility: { wheelchairAccessible: false, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] }
        },
        {
          id: 'stat_event_2',
          title: 'Mall Event',
          description: 'Test',
          location: { latitude: 22.2783, longitude: 114.1747, address: 'Test', district: 'Central', venue: 'Test', nearbyTransport: [] },
          startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
          source: EventSource.MALL,
          targetAudience: ['general'],
          weatherDependent: false,
          categories: [EventCategory.FAMILY],
          pricing: { isFree: true, ticketPrices: [], currency: 'HKD', bookingRequired: false },
          capacity: { waitlistAvailable: false, isFullyBooked: false },
          organizer: { name: 'Test', type: 'mall', contact: {} },
          images: [], tags: [],
          localPerspective: { localPopularity: 5, localRecommendation: true, culturalSignificance: '', localTips: [], authenticityScore: 5 },
          practicalInfo: { languageSupport: ['en'], accessibility: { wheelchairAccessible: false, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] }
        }
      ]);
    });

    it('should return event statistics', async () => {
      const stats = await eventService.getEventStatistics();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('bySource');
      expect(stats).toHaveProperty('byCategory');
      expect(stats).toHaveProperty('upcoming');
      expect(stats).toHaveProperty('thisWeek');
      
      expect(stats.total).toBe(2);
      expect(stats.bySource[EventSource.HKTB]).toBe(1);
      expect(stats.bySource[EventSource.MALL]).toBe(1);
      expect(stats.byCategory[EventCategory.CULTURAL]).toBe(1);
      expect(stats.byCategory[EventCategory.FAMILY]).toBe(1);
      expect(stats.upcoming).toBe(2);
      expect(stats.thisWeek).toBe(2);
    });
  });

  describe('cleanupExpiredEvents', () => {
    beforeEach(async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago

      // Create old event
      await EventModel.create({
        id: 'old_event',
        title: 'Old Event',
        description: 'Test',
        location: { latitude: 22.2783, longitude: 114.1747, address: 'Test', district: 'Central', venue: 'Test', nearbyTransport: [] },
        startTime: oldDate,
        endTime: new Date(oldDate.getTime() + 60 * 60 * 1000),
        source: EventSource.HKTB,
        targetAudience: ['general'],
        weatherDependent: false,
        categories: [EventCategory.CULTURAL],
        pricing: { isFree: true, ticketPrices: [], currency: 'HKD', bookingRequired: false },
        capacity: { waitlistAvailable: false, isFullyBooked: false },
        organizer: { name: 'Test', type: 'government', contact: {} },
        images: [], tags: [],
        localPerspective: { localPopularity: 5, localRecommendation: true, culturalSignificance: '', localTips: [], authenticityScore: 5 },
        practicalInfo: { languageSupport: ['en'], accessibility: { wheelchairAccessible: false, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] }
      });
    });

    it('should clean up expired events', async () => {
      const deletedCount = await eventService.cleanupExpiredEvents(30);
      
      expect(deletedCount).toBe(1);
      
      // Verify event was deleted
      const event = await EventModel.findOne({ id: 'old_event' });
      expect(event).toBeNull();
    });
  });
});