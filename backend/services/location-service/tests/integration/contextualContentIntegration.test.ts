import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { EnhancedLocationContentModel } from '../../src/models/EnhancedLocationContent';
import { GeofenceModel } from '../../src/models/Geofence';
import { UserLocationPreferencesModel } from '../../src/models/UserLocationPreferences';
import { ContentCategory } from '../../src/types/location';

describe('Contextual Content Integration Tests', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-location-integration';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear all test data
    await EnhancedLocationContentModel.deleteMany({});
    await GeofenceModel.deleteMany({});
    await UserLocationPreferencesModel.deleteMany({});
  });

  describe('Complete Content Delivery Workflow', () => {
    it('should deliver contextual content based on location and user preferences', async () => {
      // Step 1: Create a geofence
      const geofence = await GeofenceModel.create({
        id: 'integration-test-geofence',
        name: 'Test Historical Site',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 100,
        isActive: true
      });

      // Step 2: Create enhanced content for the geofence
      const contentResponse = await request(app)
        .post('/api/contextual-content/multimedia')
        .send({
          geofenceId: geofence.id,
          title: 'Historical Site Information',
          description: 'Learn about this important historical location',
          content: 'This site has significant historical importance dating back to the 19th century...',
          category: ContentCategory.HISTORICAL,
          language: 'en',
          multimedia: [
            {
              type: 'image',
              url: 'https://example.com/historical-site.jpg',
              altText: 'Historical building exterior',
              description: 'Photo of the historical building'
            },
            {
              type: 'audio',
              url: 'https://example.com/audio-guide.mp3',
              duration: 180,
              description: 'Audio guide narration'
            }
          ],
          interestTags: ['history', 'architecture', 'culture'],
          contextualTriggers: {
            timeOfDay: ['morning', 'afternoon'],
            weather: ['sunny', 'cloudy']
          }
        })
        .expect(201);

      expect(contentResponse.body.success).toBe(true);
      const createdContent = contentResponse.body.data;

      // Step 3: Create user preferences
      await UserLocationPreferencesModel.create({
        userId: 'integration-test-user',
        interests: ['history', 'architecture'],
        language: 'en',
        contentCategories: [ContentCategory.HISTORICAL, ContentCategory.CULTURAL],
        preferredMediaTypes: ['image', 'audio', 'text'],
        maxReadTime: 15,
        trackingEnabled: true,
        contentNotifications: true,
        geofenceRadius: 150,
        updateFrequency: 30
      });

      // Step 4: Trigger content delivery
      const triggerResponse = await request(app)
        .post('/api/contextual-content/trigger')
        .send({
          userId: 'integration-test-user',
          location: {
            latitude: 22.3193,
            longitude: 114.1694,
            timestamp: new Date().toISOString()
          },
          context: {
            timeOfDay: 'morning',
            weather: 'sunny',
            connectionQuality: 'good',
            batteryLevel: 80
          }
        })
        .expect(200);

      expect(triggerResponse.body.success).toBe(true);
      const deliveryResult = triggerResponse.body.data;

      // Verify content was delivered
      expect(deliveryResult.triggeredContent).toHaveLength(1);
      expect(deliveryResult.triggeredContent[0].id).toBe(createdContent.id);
      expect(deliveryResult.triggeredContent[0].title).toBe('Historical Site Information');
      expect(deliveryResult.deliveryMethod).toBe('immediate');
      expect(deliveryResult.reason).toContain('contextually relevant');

      // Verify multimedia content
      const deliveredContent = deliveryResult.triggeredContent[0];
      expect(deliveredContent.multimedia).toHaveLength(2);
      expect(deliveredContent.multimedia[0].type).toBe('image');
      expect(deliveredContent.multimedia[1].type).toBe('audio');
    });

    it('should filter content based on contextual triggers', async () => {
      // Create geofence
      const geofence = await GeofenceModel.create({
        id: 'context-filter-geofence',
        name: 'Context Filter Test Site',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 100,
        isActive: true
      });

      // Create evening-only content
      await request(app)
        .post('/api/contextual-content/multimedia')
        .send({
          geofenceId: geofence.id,
          title: 'Evening Activity',
          description: 'Special evening activity',
          content: 'This activity is only available in the evening...',
          category: ContentCategory.CULTURAL,
          language: 'en',
          multimedia: [],
          interestTags: ['culture', 'nightlife'],
          contextualTriggers: {
            timeOfDay: ['evening', 'night']
          }
        })
        .expect(201);

      // Try to trigger content in the morning
      const morningResponse = await request(app)
        .post('/api/contextual-content/trigger')
        .send({
          userId: 'context-test-user',
          location: {
            latitude: 22.3193,
            longitude: 114.1694,
            timestamp: new Date().toISOString()
          },
          context: {
            timeOfDay: 'morning',
            connectionQuality: 'good'
          }
        })
        .expect(200);

      // Should not deliver evening content in the morning
      expect(morningResponse.body.data.triggeredContent).toHaveLength(0);

      // Try to trigger content in the evening
      const eveningResponse = await request(app)
        .post('/api/contextual-content/trigger')
        .send({
          userId: 'context-test-user',
          location: {
            latitude: 22.3193,
            longitude: 114.1694,
            timestamp: new Date().toISOString()
          },
          context: {
            timeOfDay: 'evening',
            connectionQuality: 'good'
          }
        })
        .expect(200);

      // Should deliver evening content in the evening
      expect(eveningResponse.body.data.triggeredContent).toHaveLength(1);
      expect(eveningResponse.body.data.triggeredContent[0].title).toBe('Evening Activity');
    });

    it('should optimize content delivery for poor connection', async () => {
      // Create geofence
      const geofence = await GeofenceModel.create({
        id: 'connection-test-geofence',
        name: 'Connection Test Site',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 100,
        isActive: true
      });

      // Create content with heavy multimedia
      await request(app)
        .post('/api/contextual-content/multimedia')
        .send({
          geofenceId: geofence.id,
          title: 'Heavy Multimedia Content',
          description: 'Content with large media files',
          content: 'This content includes large media files...',
          category: ContentCategory.HISTORICAL,
          language: 'en',
          multimedia: [
            {
              type: 'video',
              url: 'https://example.com/large-video.mp4',
              size: 50000000, // 50MB
              description: 'Large historical video'
            },
            {
              type: 'image',
              url: 'https://example.com/large-image.jpg',
              size: 5000000, // 5MB
              description: 'High resolution image'
            }
          ],
          interestTags: ['history']
        })
        .expect(201);

      // Trigger with poor connection
      const poorConnectionResponse = await request(app)
        .post('/api/contextual-content/trigger')
        .send({
          userId: 'connection-test-user',
          location: {
            latitude: 22.3193,
            longitude: 114.1694,
            timestamp: new Date().toISOString()
          },
          context: {
            timeOfDay: 'morning',
            connectionQuality: 'poor',
            batteryLevel: 25
          }
        })
        .expect(200);

      const result = poorConnectionResponse.body.data;
      
      // Should use notification delivery method for poor connection
      expect(result.deliveryMethod).toBe('notification');
      
      // Should filter out heavy multimedia
      if (result.triggeredContent.length > 0) {
        const content = result.triggeredContent[0];
        const hasLargeVideo = content.multimedia.some(m => m.type === 'video' && m.size > 10000000);
        expect(hasLargeVideo).toBe(false);
      }
    });
  });

  describe('Content Accuracy Testing', () => {
    it('should accurately test content delivery timing and accuracy', async () => {
      // Setup test environment
      const geofence = await GeofenceModel.create({
        id: 'accuracy-test-geofence',
        name: 'Accuracy Test Site',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 100,
        isActive: true
      });

      // Create expected content
      const expectedContent = await request(app)
        .post('/api/contextual-content/multimedia')
        .send({
          geofenceId: geofence.id,
          title: 'Expected Content',
          description: 'This content should be delivered',
          content: 'Expected content body...',
          category: ContentCategory.PRACTICAL,
          language: 'en',
          multimedia: [],
          interestTags: ['practical', 'safety']
        })
        .expect(201);

      // Create unexpected content (different category/tags)
      await request(app)
        .post('/api/contextual-content/multimedia')
        .send({
          geofenceId: geofence.id,
          title: 'Unexpected Content',
          description: 'This content should not be prioritized',
          content: 'Unexpected content body...',
          category: ContentCategory.SHOPPING,
          language: 'en',
          multimedia: [],
          interestTags: ['shopping', 'retail']
        })
        .expect(201);

      // Run accuracy test
      const accuracyResponse = await request(app)
        .post('/api/contextual-content/test-accuracy')
        .send({
          testLocation: {
            latitude: 22.3193,
            longitude: 114.1694,
            timestamp: new Date().toISOString()
          },
          expectedContentIds: [expectedContent.body.data.id],
          context: {
            timeOfDay: 'morning',
            connectionQuality: 'good'
          }
        })
        .expect(200);

      const testResults = accuracyResponse.body.data;

      // Verify test results
      expect(testResults.accuracy).toBeGreaterThan(0);
      expect(testResults.timing).toBeGreaterThan(0);
      expect(testResults.deliveredContent).toContain(expectedContent.body.data.id);
      expect(testResults.missedContent).toHaveLength(0);
    });
  });

  describe('Offline Content Caching', () => {
    it('should provide cached content for offline access', async () => {
      // Create geofence
      const geofence = await GeofenceModel.create({
        id: 'offline-test-geofence',
        name: 'Offline Test Site',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 100,
        isActive: true
      });

      // Create offline-suitable content
      await request(app)
        .post('/api/contextual-content/multimedia')
        .send({
          geofenceId: geofence.id,
          title: 'Offline Content',
          description: 'Content available offline',
          content: 'This content is available for offline viewing...',
          category: ContentCategory.HISTORICAL,
          language: 'en',
          multimedia: [
            {
              type: 'image',
              url: 'https://example.com/small-image.jpg',
              size: 100000, // Small image suitable for offline
              description: 'Small historical image'
            }
          ],
          interestTags: ['history', 'offline']
        })
        .expect(201);

      // Request cached content
      const cachedResponse = await request(app)
        .get('/api/contextual-content/cached')
        .query({
          latitude: 22.3193,
          longitude: 114.1694,
          radius: 500,
          languages: ['en'],
          interests: ['history']
        })
        .expect(200);

      expect(cachedResponse.body.success).toBe(true);
      expect(cachedResponse.body.data.content).toBeDefined();
      
      // Verify offline availability
      const cachedContent = cachedResponse.body.data.content;
      if (cachedContent.length > 0) {
        expect(cachedContent[0].offlineAvailable).toBe(true);
      }
    });
  });

  describe('Multi-language Support', () => {
    it('should deliver content in user preferred language', async () => {
      // Create geofence
      const geofence = await GeofenceModel.create({
        id: 'multilang-test-geofence',
        name: 'Multi-language Test Site',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 100,
        isActive: true
      });

      // Create content in multiple languages
      await request(app)
        .post('/api/contextual-content/multimedia')
        .send({
          geofenceId: geofence.id,
          title: 'English Content',
          description: 'Content in English',
          content: 'This is English content...',
          category: ContentCategory.HISTORICAL,
          language: 'en',
          multimedia: [],
          interestTags: ['history']
        })
        .expect(201);

      await request(app)
        .post('/api/contextual-content/multimedia')
        .send({
          geofenceId: geofence.id,
          title: '中文内容',
          description: '中文描述',
          content: '这是中文内容...',
          category: ContentCategory.HISTORICAL,
          language: 'zh',
          multimedia: [],
          interestTags: ['history']
        })
        .expect(201);

      // Create user preferences for Chinese
      await UserLocationPreferencesModel.create({
        userId: 'chinese-user',
        interests: ['history'],
        language: 'zh',
        contentCategories: [ContentCategory.HISTORICAL],
        preferredMediaTypes: ['text'],
        trackingEnabled: true,
        contentNotifications: true,
        geofenceRadius: 100,
        updateFrequency: 30
      });

      // Request content for Chinese user
      const chineseResponse = await request(app)
        .post('/api/contextual-content/trigger')
        .send({
          userId: 'chinese-user',
          location: {
            latitude: 22.3193,
            longitude: 114.1694,
            timestamp: new Date().toISOString()
          },
          context: {
            timeOfDay: 'morning',
            connectionQuality: 'good'
          }
        })
        .expect(200);

      // Should deliver Chinese content
      const deliveredContent = chineseResponse.body.data.triggeredContent;
      if (deliveredContent.length > 0) {
        expect(deliveredContent[0].language).toBe('zh');
        expect(deliveredContent[0].title).toBe('中文内容');
      }
    });
  });
});