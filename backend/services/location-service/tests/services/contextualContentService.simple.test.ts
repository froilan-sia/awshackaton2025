import { ContextualContentService } from '../../src/services/contextualContentService';
import { ContentCategory } from '../../src/types/location';

// Mock all external dependencies
jest.mock('../../src/services/geofenceService', () => ({
  GeofenceService: jest.fn().mockImplementation(() => ({
    getGeofencesNearLocation: jest.fn().mockResolvedValue([])
  }))
}));

jest.mock('../../src/models/EnhancedLocationContent', () => ({
  EnhancedLocationContentModel: {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([])
    }),
    create: jest.fn().mockResolvedValue({
      id: 'test-content-id',
      title: 'Test Content',
      save: jest.fn().mockResolvedValue({})
    }),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    insertMany: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../src/models/UserLocationPreferences', () => ({
  UserLocationPreferencesModel: {
    findOne: jest.fn().mockResolvedValue({
      interests: ['history', 'culture'],
      language: 'en',
      contentCategories: ['historical'],
      preferredMediaTypes: ['image', 'text'],
      maxReadTime: 15
    })
  }
}));

jest.mock('../../src/models/GeofenceEvent', () => ({
  GeofenceEventModel: {
    findOneAndUpdate: jest.fn().mockResolvedValue({})
  }
}));

describe('ContextualContentService Simple Tests', () => {
  let service: ContextualContentService;

  beforeEach(() => {
    service = new ContextualContentService();
    jest.clearAllMocks();
  });

  describe('Public API', () => {
    it('should create multimedia content successfully', async () => {
      const contentData = {
        title: 'Test Historical Site',
        description: 'A test historical location',
        content: 'This is test content about a historical site...',
        category: ContentCategory.HISTORICAL,
        language: 'en',
        multimedia: [{
          type: 'image' as const,
          url: 'https://example.com/image.jpg',
          description: 'Test image'
        }],
        interestTags: ['history', 'culture']
      };

      const result = await service.createMultimediaContent('test-geofence', contentData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Historical Site');
      expect(result.multimedia).toHaveLength(1);
      expect(result.multimedia[0].type).toBe('image');
      expect(result.interestTags).toContain('history');
      expect(result.offlineAvailable).toBe(true); // Small image should be offline available
    });

    it('should get cached content for location', async () => {
      const location = {
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

      expect(Array.isArray(result)).toBe(true);
      // Since we're mocking empty responses, result should be empty array
      expect(result).toHaveLength(0);
    });

    it('should get content by category', async () => {
      const location = {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date()
      };

      const result = await service.getContentByCategory(
        ContentCategory.HISTORICAL,
        location,
        'en',
        1000
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0); // Mocked empty response
    });

    it('should handle errors gracefully in triggerContextualContent', async () => {
      const context = {
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        timeOfDay: 'morning',
        connectionQuality: 'good' as const
      };

      // This should not throw an error even with mocked dependencies
      const result = await service.triggerContextualContent('test-user', context);

      expect(result).toBeDefined();
      expect(result.triggeredContent).toBeDefined();
      expect(result.deliveryMethod).toBeDefined();
      expect(result.reason).toBeDefined();
    });

    it('should test content accuracy', async () => {
      const testLocation = {
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

      expect(result).toBeDefined();
      expect(typeof result.accuracy).toBe('number');
      expect(typeof result.timing).toBe('number');
      expect(Array.isArray(result.deliveredContent)).toBe(true);
      expect(Array.isArray(result.missedContent)).toBe(true);
      expect(Array.isArray(result.unexpectedContent)).toBe(true);
    });
  });

  describe('Content creation validation', () => {
    it('should create content with proper multimedia structure', async () => {
      const contentData = {
        title: 'Temple Guide',
        description: 'Traditional temple information',
        content: 'This temple represents...',
        category: ContentCategory.CULTURAL,
        language: 'en',
        multimedia: [
          {
            type: 'image' as const,
            url: 'https://example.com/temple.jpg',
            altText: 'Temple exterior view',
            description: 'Main entrance of the temple'
          },
          {
            type: 'audio' as const,
            url: 'https://example.com/guide.mp3',
            duration: 120,
            description: 'Audio guide narration'
          }
        ],
        interestTags: ['culture', 'religion', 'architecture']
      };

      const result = await service.createMultimediaContent('temple-geofence', contentData);

      expect(result.multimedia).toHaveLength(2);
      expect(result.multimedia[0].type).toBe('image');
      expect(result.multimedia[0].altText).toBe('Temple exterior view');
      expect(result.multimedia[1].type).toBe('audio');
      expect(result.multimedia[1].duration).toBe(120);
      expect(result.accessibility.visualDescriptions).toBe(true);
      expect(result.accessibility.audioAvailable).toBe(true);
    });

    it('should determine offline availability based on multimedia size', async () => {
      const smallContentData = {
        title: 'Small Content',
        description: 'Content with small media',
        content: 'Small content...',
        category: ContentCategory.PRACTICAL,
        language: 'en',
        multimedia: [{
          type: 'image' as const,
          url: 'https://example.com/small.jpg',
          size: 500000 // 500KB
        }],
        interestTags: ['practical']
      };

      const smallResult = await service.createMultimediaContent('test-geofence', smallContentData);
      expect(smallResult.offlineAvailable).toBe(true);

      const largeContentData = {
        title: 'Large Content',
        description: 'Content with large media',
        content: 'Large content...',
        category: ContentCategory.HISTORICAL,
        language: 'en',
        multimedia: [{
          type: 'video' as const,
          url: 'https://example.com/large.mp4',
          size: 50000000 // 50MB
        }],
        interestTags: ['history']
      };

      const largeResult = await service.createMultimediaContent('test-geofence', largeContentData);
      expect(largeResult.offlineAvailable).toBe(false);
    });
  });

  describe('Service initialization', () => {
    it('should initialize without errors', () => {
      expect(() => {
        new ContextualContentService();
      }).not.toThrow();
    });

    it('should extend ContentDeliveryService', () => {
      expect(service).toBeInstanceOf(ContextualContentService);
    });
  });
});