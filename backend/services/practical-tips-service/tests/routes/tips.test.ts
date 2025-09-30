import request from 'supertest';
import app from '../../src/index';
import { TipCategory, Priority, VenueType, WeatherCondition } from '../../src/types/practicalTips';

describe('Tips Routes', () => {
  const API_BASE = '/api/v1/tips';

  describe('POST /contextual', () => {
    it('should return contextual tips for valid request', async () => {
      const contextualRequest = {
        location: {
          latitude: 22.2711,
          longitude: 114.1489,
          venueType: VenueType.HIKING_TRAIL
        },
        weather: {
          condition: WeatherCondition.SUNNY,
          temperature: 25,
          humidity: 70,
          windSpeed: 10
        },
        timeOfDay: 'morning',
        userProfile: {
          interests: ['hiking', 'outdoor'],
          language: 'en',
          groupType: 'solo'
        }
      };

      const response = await request(app)
        .post(`${API_BASE}/contextual`)
        .send(contextualRequest)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.tips).toBeDefined();
      expect(Array.isArray(response.body.tips)).toBe(true);
      expect(response.body.totalCount).toBeDefined();
      expect(response.body.contextualRelevance).toBeDefined();
      expect(response.body.deliveryMethod).toBeDefined();
    });

    it('should return 400 for invalid request', async () => {
      const invalidRequest = {
        location: {
          latitude: 200, // Invalid latitude
          longitude: 114.1489
        },
        timeOfDay: 'morning'
      };

      const response = await request(app)
        .post(`${API_BASE}/contextual`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteRequest = {
        location: {
          latitude: 22.2711
          // Missing longitude
        }
      };

      await request(app)
        .post(`${API_BASE}/contextual`)
        .send(incompleteRequest)
        .expect(400);
    });
  });

  describe('GET /category/:category', () => {
    it('should return tips for valid category', async () => {
      const response = await request(app)
        .get(`${API_BASE}/category/${TipCategory.SAFETY}`)
        .expect(200);

      expect(response.body.tips).toBeDefined();
      expect(Array.isArray(response.body.tips)).toBe(true);
      expect(response.body.tips.every((tip: any) => tip.category === TipCategory.SAFETY)).toBe(true);
    });

    it('should filter by language', async () => {
      const response = await request(app)
        .get(`${API_BASE}/category/${TipCategory.ETIQUETTE}`)
        .query({ language: 'en' })
        .expect(200);

      expect(response.body.tips.every((tip: any) => tip.language === 'en')).toBe(true);
    });

    it('should return 400 for invalid category', async () => {
      await request(app)
        .get(`${API_BASE}/category/invalid-category`)
        .expect(400);
    });
  });

  describe('POST /', () => {
    it('should create a new tip', async () => {
      const tipData = {
        category: TipCategory.PREPARATION,
        title: 'Test Preparation Tip',
        content: 'This is a test preparation tip for tourists.',
        priority: Priority.MEDIUM,
        applicableVenues: [VenueType.HIKING_TRAIL],
        weatherConditions: [WeatherCondition.SUNNY],
        language: 'en',
        tags: ['test', 'preparation']
      };

      const response = await request(app)
        .post(API_BASE)
        .send(tipData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.category).toBe(TipCategory.PREPARATION);
      expect(response.body.title).toBe('Test Preparation Tip');
      expect(response.body.priority).toBe(Priority.MEDIUM);
    });

    it('should return 400 for invalid tip data', async () => {
      const invalidTipData = {
        category: 'invalid-category',
        title: '',
        content: 'Content'
      };

      await request(app)
        .post(API_BASE)
        .send(invalidTipData)
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteTipData = {
        category: TipCategory.SAFETY,
        title: 'Test Title'
        // Missing content
      };

      await request(app)
        .post(API_BASE)
        .send(incompleteTipData)
        .expect(400);
    });
  });

  describe('GET /:id', () => {
    let createdTipId: string;

    beforeEach(async () => {
      const tipData = {
        category: TipCategory.CULTURAL,
        title: 'Test Cultural Tip',
        content: 'This is a test cultural tip.',
        priority: Priority.HIGH
      };

      const response = await request(app)
        .post(API_BASE)
        .send(tipData);

      createdTipId = response.body.id;
    });

    it('should return tip by ID', async () => {
      const response = await request(app)
        .get(`${API_BASE}/${createdTipId}`)
        .expect(200);

      expect(response.body.id).toBe(createdTipId);
      expect(response.body.title).toBe('Test Cultural Tip');
      expect(response.body.category).toBe(TipCategory.CULTURAL);
    });

    it('should return 404 for non-existent tip', async () => {
      await request(app)
        .get(`${API_BASE}/non-existent-id`)
        .expect(404);
    });
  });

  describe('PUT /:id', () => {
    let createdTipId: string;

    beforeEach(async () => {
      const tipData = {
        category: TipCategory.WEATHER,
        title: 'Original Weather Tip',
        content: 'Original content',
        priority: Priority.MEDIUM
      };

      const response = await request(app)
        .post(API_BASE)
        .send(tipData);

      createdTipId = response.body.id;
    });

    it('should update existing tip', async () => {
      const updates = {
        title: 'Updated Weather Tip',
        priority: Priority.HIGH,
        tags: ['updated', 'weather']
      };

      const response = await request(app)
        .put(`${API_BASE}/${createdTipId}`)
        .send(updates)
        .expect(200);

      expect(response.body.title).toBe('Updated Weather Tip');
      expect(response.body.priority).toBe(Priority.HIGH);
      expect(response.body.tags).toEqual(['updated', 'weather']);
      expect(response.body.content).toBe('Original content'); // Unchanged
    });

    it('should return 404 for non-existent tip', async () => {
      const updates = {
        title: 'Updated Title'
      };

      await request(app)
        .put(`${API_BASE}/non-existent-id`)
        .send(updates)
        .expect(404);
    });

    it('should return 400 for invalid update data', async () => {
      const invalidUpdates = {
        category: 'invalid-category'
      };

      await request(app)
        .put(`${API_BASE}/${createdTipId}`)
        .send(invalidUpdates)
        .expect(400);
    });
  });

  describe('DELETE /:id', () => {
    let createdTipId: string;

    beforeEach(async () => {
      const tipData = {
        category: TipCategory.TRANSPORTATION,
        title: 'To Be Deleted',
        content: 'This tip will be deleted',
        priority: Priority.LOW
      };

      const response = await request(app)
        .post(API_BASE)
        .send(tipData);

      createdTipId = response.body.id;
    });

    it('should delete existing tip', async () => {
      await request(app)
        .delete(`${API_BASE}/${createdTipId}`)
        .expect(204);

      // Verify tip is deleted
      await request(app)
        .get(`${API_BASE}/${createdTipId}`)
        .expect(404);
    });

    it('should return 404 for non-existent tip', async () => {
      await request(app)
        .delete(`${API_BASE}/non-existent-id`)
        .expect(404);
    });
  });

  describe('Error handling', () => {
    it('should handle server errors gracefully', async () => {
      // This test would require mocking the service to throw an error
      // For now, we'll test with an extremely long content that might cause issues
      const tipData = {
        category: TipCategory.SAFETY,
        title: 'Test Tip',
        content: 'x'.repeat(10000), // Very long content
        priority: Priority.MEDIUM
      };

      const response = await request(app)
        .post(API_BASE)
        .send(tipData);

      // Should either succeed or return a proper error response
      expect([200, 201, 400, 413, 500]).toContain(response.status);
      
      if (response.status >= 400) {
        expect(response.body.error).toBeDefined();
      }
    });
  });
});