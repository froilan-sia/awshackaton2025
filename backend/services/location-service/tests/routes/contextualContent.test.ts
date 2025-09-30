import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import contextualContentRoutes from '../../src/routes/contextualContent';
import { EnhancedLocationContentModel } from '../../src/models/EnhancedLocationContent';
import { GeofenceModel } from '../../src/models/Geofence';
import { ContentCategory } from '../../src/types/location';

// Mock the ContextualContentService
jest.mock('../../src/services/contextualContentService');

const app = express();
app.use(express.json());
app.use('/api/contextual-content', contextualContentRoutes);

describe('Contextual Content Routes', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-location-routes';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await EnhancedLocationContentModel.deleteMany({});
    await GeofenceModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /trigger', () => {
    it('should trigger contextual content delivery', async () => {
      const requestBody = {
        userId: 'test-user',
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date().toISOString()
        },
        context: {
          timeOfDay: 'morning',
          weather: 'sunny',
          connectionQuality: 'good'
        }
      };

      const response = await request(app)
        .post('/api/contextual-content/trigger')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        userId: 'test-user'
        // Missing location
      };

      const response = await request(app)
        .post('/api/contextual-content/trigger')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid location data', async () => {
      const requestBody = {
        userId: 'test-user',
        location: {
          latitude: 'invalid',
          longitude: 114.1694
        }
      };

      const response = await request(app)
        .post('/api/contextual-content/trigger')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('Invalid location data');
    });
  });

  describe('GET /geofence/:geofenceId', () => {
    it('should get enhanced content for a specific geofence', async () => {
      const geofenceId = 'test-geofence-1';

      const response = await request(app)
        .get(`/api/contextual-content/geofence/${geofenceId}`)
        .query({
          languages: ['en'],
          interests: ['history', 'culture'],
          timeOfDay: 'morning'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.geofenceId).toBe(geofenceId);
      expect(response.body.data.content).toBeDefined();
    });

    it('should handle multiple languages and interests', async () => {
      const geofenceId = 'test-geofence-2';

      const response = await request(app)
        .get(`/api/contextual-content/geofence/${geofenceId}`)
        .query({
          languages: ['en', 'zh'],
          interests: ['food', 'shopping'],
          contentTypes: [ContentCategory.FOOD, ContentCategory.SHOPPING]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /multimedia', () => {
    it('should create multimedia content', async () => {
      const contentData = {
        geofenceId: 'test-geofence',
        title: 'Test Multimedia Content',
        description: 'Test description',
        content: 'Test content body',
        category: ContentCategory.HISTORICAL,
        language: 'en',
        multimedia: [{
          type: 'image',
          url: 'https://example.com/image.jpg',
          description: 'Test image'
        }],
        interestTags: ['history', 'culture'],
        contextualTriggers: {
          timeOfDay: ['morning', 'afternoon']
        }
      };

      const response = await request(app)
        .post('/api/contextual-content/multimedia')
        .send(contentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        geofenceId: 'test-geofence',
        title: 'Test Content'
        // Missing description, content, category
      };

      const response = await request(app)
        .post('/api/contextual-content/multimedia')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid category', async () => {
      const invalidData = {
        geofenceId: 'test-geofence',
        title: 'Test Content',
        description: 'Test description',
        content: 'Test content',
        category: 'invalid-category'
      };

      const response = await request(app)
        .post('/api/contextual-content/multimedia')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Invalid category');
      expect(response.body.validCategories).toBeDefined();
    });
  });

  describe('GET /cached', () => {
    it('should get cached content for offline access', async () => {
      const response = await request(app)
        .get('/api/contextual-content/cached')
        .query({
          latitude: 22.3193,
          longitude: 114.1694,
          radius: 500,
          languages: ['en'],
          interests: ['history']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toBeDefined();
      expect(response.body.data.content).toBeDefined();
    });

    it('should return 400 for missing coordinates', async () => {
      const response = await request(app)
        .get('/api/contextual-content/cached')
        .query({
          radius: 500
          // Missing latitude and longitude
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required parameters');
    });

    it('should use default values for optional parameters', async () => {
      const response = await request(app)
        .get('/api/contextual-content/cached')
        .query({
          latitude: 22.3193,
          longitude: 114.1694
          // No radius, languages, interests - should use defaults
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.radius).toBe(1000); // Default radius
    });
  });

  describe('POST /test-accuracy', () => {
    it('should test content accuracy and timing', async () => {
      const testData = {
        testLocation: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date().toISOString()
        },
        expectedContentIds: ['content-1', 'content-2'],
        context: {
          timeOfDay: 'morning',
          weather: 'sunny',
          connectionQuality: 'good'
        }
      };

      const response = await request(app)
        .post('/api/contextual-content/test-accuracy')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 for missing test data', async () => {
      const incompleteData = {
        testLocation: {
          latitude: 22.3193,
          longitude: 114.1694
        }
        // Missing expectedContentIds
      };

      const response = await request(app)
        .post('/api/contextual-content/test-accuracy')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid expectedContentIds', async () => {
      const invalidData = {
        testLocation: {
          latitude: 22.3193,
          longitude: 114.1694
        },
        expectedContentIds: 'not-an-array'
      };

      const response = await request(app)
        .post('/api/contextual-content/test-accuracy')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('expectedContentIds (array)');
    });
  });

  describe('GET /category/:category', () => {
    it('should get content by category and location', async () => {
      const category = ContentCategory.HISTORICAL;

      const response = await request(app)
        .get(`/api/contextual-content/category/${category}`)
        .query({
          latitude: 22.3193,
          longitude: 114.1694,
          radius: 1000,
          language: 'en'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe(category);
      expect(response.body.data.content).toBeDefined();
    });

    it('should return 400 for invalid category', async () => {
      const invalidCategory = 'invalid-category';

      const response = await request(app)
        .get(`/api/contextual-content/category/${invalidCategory}`)
        .query({
          latitude: 22.3193,
          longitude: 114.1694
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid category');
      expect(response.body.validCategories).toBeDefined();
    });

    it('should return 400 for missing coordinates', async () => {
      const category = ContentCategory.FOOD;

      const response = await request(app)
        .get(`/api/contextual-content/category/${category}`)
        .query({
          radius: 1000
          // Missing latitude and longitude
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required parameters');
    });

    it('should use default values for optional parameters', async () => {
      const category = ContentCategory.CULTURAL;

      const response = await request(app)
        .get(`/api/contextual-content/category/${category}`)
        .query({
          latitude: 22.3193,
          longitude: 114.1694
          // No radius or language - should use defaults
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.radius).toBe(1000); // Default radius
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      const mockService = require('../../src/services/contextualContentService').ContextualContentService;
      mockService.prototype.triggerContextualContent = jest.fn().mockRejectedValue(
        new Error('Service error')
      );

      const requestBody = {
        userId: 'test-user',
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date().toISOString()
        }
      };

      const response = await request(app)
        .post('/api/contextual-content/trigger')
        .send(requestBody)
        .expect(500);

      expect(response.body.error).toContain('Failed to trigger contextual content');
      expect(response.body.message).toBe('Service error');
    });
  });

  describe('Time of day detection', () => {
    it('should correctly detect time of day', async () => {
      // Test morning detection
      const originalDate = Date;
      const mockDate = jest.fn(() => ({
        getHours: () => 9 // 9 AM
      }));
      global.Date = mockDate as any;

      const response = await request(app)
        .post('/api/contextual-content/trigger')
        .send({
          userId: 'test-user',
          location: {
            latitude: 22.3193,
            longitude: 114.1694,
            timestamp: new Date().toISOString()
          }
        })
        .expect(200);

      // Restore original Date
      global.Date = originalDate;

      expect(response.body.success).toBe(true);
    });
  });
});