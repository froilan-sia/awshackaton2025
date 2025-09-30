import request from 'supertest';
import express from 'express';
import eventsRouter from '../../src/routes/events';
import { EventModel } from '../../src/models/Event';
import { EventSource, EventCategory } from '../../src/types/event';

const app = express();
app.use(express.json());
app.use('/api/events', eventsRouter);

describe('Events API Routes', () => {
  beforeEach(async () => {
    // Create sample events for testing
    await EventModel.insertMany([
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
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
        practicalInfo: { languageSupport: ['en', 'zh-HK'], accessibility: { wheelchairAccessible: true, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] }
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
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
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
        practicalInfo: { languageSupport: ['en', 'zh-HK'], accessibility: { wheelchairAccessible: true, signLanguageSupport: false, audioDescriptionAvailable: false, largeTextAvailable: false, specialAccommodations: [] }, whatToBring: [] }
      }
    ]);
  });

  describe('GET /api/events', () => {
    it('should return all events', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should filter events by category', async () => {
      const response = await request(app)
        .get('/api/events?categories=cultural')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].categories).toContain('cultural');
    });

    it('should filter events by source', async () => {
      const response = await request(app)
        .get('/api/events?sources=community')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].source).toBe('community');
    });

    it('should filter events by district', async () => {
      const response = await request(app)
        .get('/api/events?districts=Central')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].location.district).toBe('Central');
    });

    it('should filter free events', async () => {
      const response = await request(app)
        .get('/api/events?isFree=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].pricing.isFree).toBe(true);
    });

    it('should filter by target audience', async () => {
      const response = await request(app)
        .get('/api/events?targetAudience=families')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].targetAudience).toContain('families');
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return event by ID', async () => {
      const response = await request(app)
        .get('/api/events/test_event_1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('test_event_1');
      expect(response.body.data.title).toBe('Art Exhibition');
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/non_existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
    });
  });

  describe('POST /api/events/recommendations', () => {
    it('should return personalized recommendations', async () => {
      const userPreferences = {
        interests: ['art', 'culture'],
        budgetRange: 'medium',
        groupType: 'couple',
        ageGroup: 'adult',
        language: 'en'
      };

      const response = await request(app)
        .post('/api/events/recommendations')
        .send({ userPreferences })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('event');
      expect(response.body.data[0]).toHaveProperty('score');
      expect(response.body.data[0]).toHaveProperty('reasons');
    });

    it('should return 400 if user preferences are missing', async () => {
      const response = await request(app)
        .post('/api/events/recommendations')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User preferences are required');
    });

    it('should accept filters and limit', async () => {
      const userPreferences = {
        interests: ['family'],
        budgetRange: 'low',
        groupType: 'family',
        ageGroup: 'adult',
        language: 'en'
      };

      const filters = {
        isFree: true
      };

      const response = await request(app)
        .post('/api/events/recommendations')
        .send({ userPreferences, filters, limit: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/events/nearby/:lat/:lng', () => {
    it('should return nearby events', async () => {
      const response = await request(app)
        .get('/api/events/nearby/22.2783/114.1747')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should accept radius and limit parameters', async () => {
      const response = await request(app)
        .get('/api/events/nearby/22.2783/114.1747?radius=10&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/events/nearby/invalid/coordinates')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid coordinates');
    });
  });

  describe('GET /api/events/upcoming', () => {
    it('should return upcoming events', async () => {
      const response = await request(app)
        .get('/api/events/upcoming')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2); // Both test events are in the future
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/events/upcoming?limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/events/source/:source', () => {
    it('should return events by source', async () => {
      const response = await request(app)
        .get('/api/events/source/community')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].source).toBe('community');
    });

    it('should return 400 for invalid source', async () => {
      const response = await request(app)
        .get('/api/events/source/invalid_source')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid event source');
    });
  });

  describe('GET /api/events/search/:query', () => {
    it('should search events by title', async () => {
      const response = await request(app)
        .get('/api/events/search/Art')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Art Exhibition');
      expect(response.body.query).toBe('Art');
    });

    it('should search events by description', async () => {
      const response = await request(app)
        .get('/api/events/search/family')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toContain('family');
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/events/search/NonExistentTerm')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/events/stats', () => {
    it('should return event statistics', async () => {
      const response = await request(app)
        .get('/api/events/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('bySource');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('upcoming');
      expect(response.body.data).toHaveProperty('thisWeek');
      
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.upcoming).toBe(2);
    });
  });

  describe('POST /api/events/sync', () => {
    it('should trigger event synchronization', async () => {
      // Mock the sync methods to avoid actual API calls
      const EventService = require('../../src/services/eventService').EventService;
      const mockSync = jest.fn().mockResolvedValue({
        hktb: { created: 1, updated: 0, errors: 0 },
        mall: { created: 2, updated: 0, errors: 0 },
        totalProcessed: 3,
        totalErrors: 0
      });
      
      EventService.prototype.syncAllEvents = mockSync;

      const response = await request(app)
        .post('/api/events/sync')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalProcessed');
      expect(response.body.message).toBe('Event synchronization completed');
    });
  });
});