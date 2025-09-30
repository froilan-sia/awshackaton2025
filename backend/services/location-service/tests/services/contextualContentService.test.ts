import { ContextualContentService } from '../../src/services/contextualContentService';
import { EnhancedLocationContentModel } from '../../src/models/EnhancedLocationContent';
import { UserLocationPreferencesModel } from '../../src/models/UserLocationPreferences';
import { GeofenceModel } from '../../src/models/Geofence';
import { ContentCategory, GeoLocation } from '../../src/types/location';
import mongoose from 'mongoose';

// Mock the GeofenceService
jest.mock('../../src/services/geofenceService', () => ({
  GeofenceService: jest.fn().mockImplementation(() => ({
    getGeofencesNearLocation: jest.fn()
  }))
}));

describe('ContextualContentService', () => {
  let service: ContextualContentService;
  let mockGeofenceService: any;

  beforeAll(async () => {
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-location-service';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    // Clear test data
    await EnhancedLocationContentModel.deleteMany({});
    await UserLocationPreferencesModel.deleteMany({});
    await GeofenceModel.deleteMany({});

    service = new ContextualContentService();
    mockGeofenceService = (service as any).geofenceService;
  });

  describe('triggerContextualContent', () => {
    it('should trigger contextual content based on user location', async () => {
      // Setup test data
      const testGeofence = {
        id: 'test-geofence-1',
        name: 'Test Historical Site',
        center: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        radius: 100,
        isActive: true
      };

      const testContent = {
        id: 'test-content-1',
        geofenceId: 'test-geofence-1',
        title: 'Historical Site Information',
        description: 'Learn about this historical site',
        content: 'This is a significant historical location...',
        language: 'en',
        category: ContentCategory.HISTORICAL,
        priority: 8,
        isActive: true,
        multimedia: [{
          type: 'image' as const,
          url: 'https://example.com/image.jpg',
          description: 'Historical site photo'
        }],
        interestTags: ['history', 'culture'],
        accessibility: {
          screenReaderFriendly: true,
          visualDescriptions: true,
          audioAvailable: false
        },
        contextualTriggers: {
          timeOfDay: ['morning', 'afternoon']
        },
        offlineAvailable: true,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock geofence service
      mockGeofenceService.getGeofencesNearLocation.mockResolvedValue([testGeofence]);

      // Create test content
      await EnhancedLocationContentModel.create(testContent);

      // Create user preferences
      await UserLocationPreferencesModel.create({
        userId: 'test-user',
        interests: ['history', 'culture'],
        language: 'en',
        contentCategories: [ContentCategory.HISTORICAL],
        preferredMediaTypes: ['image', 'text'],
        maxReadTime: 15,
        trackingEnabled: true,
        contentNotifications: true,
        geofenceRadius: 100,
        updateFrequency: 30
      });

      const context = {
        location: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        timeOfDay: 'morning',
        connectionQuality: 'good' as const
      };

      const result = await service.triggerContextualContent('test-user', context);

      expect(result.triggeredContent).toHaveLength(1);
      expect(result.triggeredContent[0].title).toBe('Historical Site Information');
      expect(result.deliveryMethod).toBe('immediate');
      expect(result.reason).toContain('contextually relevant');
    });

    it('should filter content based on contextual triggers', async () => {
      const testGeofence = {
        id: 'test-geofence-2',
        name: 'Test Site',
        center: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        radius: 100,
        isActive: true
      };

      // Content that should be filtered out (evening only)
      const eveningContent = {
        id: 'evening-content',
        geofenceId: 'test-geofence-2',
        title: 'Evening Activity',
        description: 'Only available in evening',
        content: 'Evening content...',
        language: 'en',
        category: ContentCategory.CULTURAL,
        priority: 5,
        isActive: true,
        multimedia: [],
        interestTags: ['culture'],
        accessibility: {
          screenReaderFriendly: true,
          visualDescriptions: false,
          audioAvailable: false
        },
        contextualTriggers: {
          timeOfDay: ['evening', 'night']
        },
        offlineAvailable: true,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGeofenceService.getGeofencesNearLocation.mockResolvedValue([testGeofence]);
      await EnhancedLocationContentModel.create(eveningContent);

      const context = {
        location: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        timeOfDay: 'morning', // Should filter out evening content
        connectionQuality: 'good' as const
      };

      const result = await service.triggerContextualContent('test-user', context);

      expect(result.triggeredContent).toHaveLength(0);
      expect(result.reason).toContain('No relevant content');
    });

    it('should optimize content for poor connection quality', async () => {
      const testGeofence = {
        id: 'test-geofence-3',
        name: 'Test Site',
        center: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        radius: 100,
        isActive: true
      };

      const heavyContent = {
        id: 'heavy-content',
        geofenceId: 'test-geofence-3',
        title: 'Heavy Content',
        description: 'Content with large media',
        content: 'Heavy content...',
        language: 'en',
        category: ContentCategory.HISTORICAL,
        priority: 5,
        isActive: true,
        multimedia: [{
          type: 'video' as const,
          url: 'https://example.com/large-video.mp4',
          size: 50000000, // 50MB
          description: 'Large video'
        }],
        interestTags: ['history'],
        accessibility: {
          screenReaderFriendly: true,
          visualDescriptions: false,
          audioAvailable: false
        },
        contextualTriggers: {},
        offlineAvailable: false,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGeofenceService.getGeofencesNearLocation.mockResolvedValue([testGeofence]);
      await EnhancedLocationContentModel.create(heavyContent);

      const context = {
        location: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        timeOfDay: 'morning',
        connectionQuality: 'poor' as const
      };

      const result = await service.triggerContextualContent('test-user', context);

      expect(result.deliveryMethod).toBe('notification');
      if (result.triggeredContent.length > 0) {
        // Video should be filtered out for poor connection
        expect(result.triggeredContent[0].multimedia).not.toContain(
          expect.objectContaining({ type: 'video' })
        );
      }
    });
  });

  describe('createMultimediaContent', () => {
    it('should create enhanced content with multimedia', async () => {
      const contentData = {
        title: 'Temple Information',
        description: 'Learn about this ancient temple',
        content: 'This temple was built in...',
        category: ContentCategory.CULTURAL,
        language: 'en',
        multimedia: [{
          type: 'image' as const,
          url: 'https://example.com/temple.jpg',
          altText: 'Ancient temple exterior',
          description: 'Photo of the temple'
        }],
        interestTags: ['culture', 'religion', 'architecture'],
        contextualTriggers: {
          timeOfDay: ['morning', 'afternoon', 'evening']
        }
      };

      const result = await service.createMultimediaContent('test-geofence', contentData);

      expect(result.title).toBe('Temple Information');
      expect(result.multimedia).toHaveLength(1);
      expect(result.multimedia[0].type).toBe('image');
      expect(result.interestTags).toContain('culture');
      expect(result.accessibility.visualDescriptions).toBe(true);
      expect(result.offlineAvailable).toBe(true);
    });

    it('should determine offline availability based on multimedia', async () => {
      const contentWithVideo = {
        title: 'Video Content',
        description: 'Content with video',
        content: 'Video content...',
        category: ContentCategory.HISTORICAL,
        language: 'en',
        multimedia: [{
          type: 'video' as const,
          url: 'https://example.com/video.mp4',
          size: 10000000, // 10MB
          description: 'Historical video'
        }],
        interestTags: ['history']
      };

      const result = await service.createMultimediaContent('test-geofence', contentWithVideo);

      expect(result.offlineAvailable).toBe(false); // Large video not suitable for offline
    });
  });

  describe('testContentAccuracy', () => {
    it('should test content delivery accuracy and timing', async () => {
      const testGeofence = {
        id: 'accuracy-test-geofence',
        name: 'Accuracy Test Site',
        center: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        radius: 100,
        isActive: true
      };

      const expectedContent = {
        id: 'expected-content-1',
        geofenceId: 'accuracy-test-geofence',
        title: 'Expected Content',
        description: 'This should be delivered',
        content: 'Expected content...',
        language: 'en',
        category: ContentCategory.PRACTICAL,
        priority: 8,
        isActive: true,
        multimedia: [],
        interestTags: ['practical'],
        accessibility: {
          screenReaderFriendly: true,
          visualDescriptions: false,
          audioAvailable: false
        },
        contextualTriggers: {},
        offlineAvailable: true,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGeofenceService.getGeofencesNearLocation.mockResolvedValue([testGeofence]);
      await EnhancedLocationContentModel.create(expectedContent);

      const testLocation: GeoLocation = {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date()
      };

      const context = {
        location: testLocation,
        timeOfDay: 'morning',
        connectionQuality: 'good' as const
      };

      const result = await service.testContentAccuracy(
        testLocation,
        ['expected-content-1'],
        context
      );

      expect(result.accuracy).toBe(1); // 100% accuracy
      expect(result.timing).toBeGreaterThan(0);
      expect(result.deliveredContent).toContain('expected-content-1');
      expect(result.missedContent).toHaveLength(0);
    });

    it('should identify missed and unexpected content', async () => {
      const testGeofence = {
        id: 'accuracy-test-geofence-2',
        name: 'Accuracy Test Site 2',
        center: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        radius: 100,
        isActive: true
      };

      const unexpectedContent = {
        id: 'unexpected-content',
        geofenceId: 'accuracy-test-geofence-2',
        title: 'Unexpected Content',
        description: 'This was not expected',
        content: 'Unexpected content...',
        language: 'en',
        category: ContentCategory.SAFETY,
        priority: 9,
        isActive: true,
        multimedia: [],
        interestTags: ['safety'],
        accessibility: {
          screenReaderFriendly: true,
          visualDescriptions: false,
          audioAvailable: false
        },
        contextualTriggers: {},
        offlineAvailable: true,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGeofenceService.getGeofencesNearLocation.mockResolvedValue([testGeofence]);
      await EnhancedLocationContentModel.create(unexpectedContent);

      const testLocation: GeoLocation = {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date()
      };

      const context = {
        location: testLocation,
        timeOfDay: 'morning',
        connectionQuality: 'good' as const
      };

      const result = await service.testContentAccuracy(
        testLocation,
        ['expected-but-missing-content'], // This content doesn't exist
        context
      );

      expect(result.accuracy).toBe(0); // 0% accuracy (expected content not found)
      expect(result.missedContent).toContain('expected-but-missing-content');
      expect(result.unexpectedContent).toContain('unexpected-content');
    });
  });

  describe('getCachedContentForLocation', () => {
    it('should retrieve cached content for offline access', async () => {
      const testGeofence = {
        id: 'cache-test-geofence',
        name: 'Cache Test Site',
        center: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        radius: 100,
        isActive: true
      };

      const offlineContent = {
        id: 'offline-content',
        geofenceId: 'cache-test-geofence',
        title: 'Offline Content',
        description: 'Available offline',
        content: 'Offline content...',
        language: 'en',
        category: ContentCategory.HISTORICAL,
        priority: 7,
        isActive: true,
        multimedia: [{
          type: 'image' as const,
          url: 'https://example.com/small-image.jpg',
          size: 100000, // Small image suitable for offline
          description: 'Small image'
        }],
        interestTags: ['history'],
        accessibility: {
          screenReaderFriendly: true,
          visualDescriptions: true,
          audioAvailable: false
        },
        contextualTriggers: {},
        offlineAvailable: true,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGeofenceService.getGeofencesNearLocation.mockResolvedValue([testGeofence]);
      await EnhancedLocationContentModel.create(offlineContent);

      const location: GeoLocation = {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date()
      };

      const filter = {
        interests: ['history'],
        languages: ['en'],
        accessibilityNeeds: [],
        contentTypes: [ContentCategory.HISTORICAL],
        preferredMediaTypes: ['image', 'text']
      };

      const result = await service.getCachedContentForLocation(location, filter);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Offline Content');
      expect(result[0].offlineAvailable).toBe(true);
    });
  });

  describe('personalization', () => {
    it('should personalize content based on user interests', async () => {
      const testGeofence = {
        id: 'personalization-test',
        name: 'Personalization Test Site',
        center: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        radius: 100,
        isActive: true
      };

      // Create content with different interest tags
      const historyContent = {
        id: 'history-content',
        geofenceId: 'personalization-test',
        title: 'Historical Information',
        description: 'Historical content',
        content: 'History...',
        language: 'en',
        category: ContentCategory.HISTORICAL,
        priority: 5,
        isActive: true,
        multimedia: [],
        interestTags: ['history', 'culture'],
        accessibility: {
          screenReaderFriendly: true,
          visualDescriptions: false,
          audioAvailable: false
        },
        contextualTriggers: {},
        offlineAvailable: true,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const foodContent = {
        id: 'food-content',
        geofenceId: 'personalization-test',
        title: 'Food Information',
        description: 'Food content',
        content: 'Food...',
        language: 'en',
        category: ContentCategory.FOOD,
        priority: 5,
        isActive: true,
        multimedia: [],
        interestTags: ['food', 'dining'],
        accessibility: {
          screenReaderFriendly: true,
          visualDescriptions: false,
          audioAvailable: false
        },
        contextualTriggers: {},
        offlineAvailable: true,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGeofenceService.getGeofencesNearLocation.mockResolvedValue([testGeofence]);
      await EnhancedLocationContentModel.create([historyContent, foodContent]);

      // Create user with history interest
      await UserLocationPreferencesModel.create({
        userId: 'history-lover',
        interests: ['history'],
        language: 'en',
        contentCategories: [ContentCategory.HISTORICAL, ContentCategory.FOOD],
        preferredMediaTypes: ['text'],
        maxReadTime: 15,
        trackingEnabled: true,
        contentNotifications: true,
        geofenceRadius: 100,
        updateFrequency: 30
      });

      const context = {
        location: { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() },
        timeOfDay: 'morning',
        connectionQuality: 'good' as const
      };

      const result = await service.triggerContextualContent('history-lover', context);

      // Should prioritize history content over food content
      expect(result.triggeredContent.length).toBeGreaterThan(0);
      const historyContentDelivered = result.triggeredContent.find(c => c.id === 'history-content');
      expect(historyContentDelivered).toBeDefined();
    });
  });
});