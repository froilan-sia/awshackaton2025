import { ContextualContentService } from '../../src/services/contextualContentService';

// Mock all external dependencies
jest.mock('../../src/services/geofenceService');
jest.mock('../../src/models/EnhancedLocationContent');
jest.mock('../../src/models/UserLocationPreferences');
jest.mock('../../src/models/GeofenceEvent');

describe('ContextualContentService Unit Tests', () => {
  let service: ContextualContentService;

  beforeEach(() => {
    service = new ContextualContentService();
  });

  describe('Content filtering and optimization', () => {
    it('should determine time of day correctly', () => {
      // Test morning
      const originalDate = Date;
      global.Date = jest.fn(() => ({
        getHours: () => 9
      })) as any;

      const timeOfDay = (service as any).getCurrentTimeOfDay();
      expect(timeOfDay).toBe('morning');

      // Restore original Date
      global.Date = originalDate;
    });

    it('should calculate relevance score correctly', () => {
      const content = {
        id: 'test-content',
        priority: 5,
        interestTags: ['history', 'culture'],
        multimedia: [{ type: 'image' as const, url: 'test.jpg' }]
      };

      const filter = {
        interests: ['history'],
        preferredMediaTypes: ['image']
      };

      const score = (service as any).calculateRelevanceScore(content, filter);
      expect(score).toBeGreaterThan(5); // Should be boosted due to matching interests and media
    });

    it('should determine offline availability correctly', () => {
      // Content with small images should be offline available
      const smallImageContent = [
        { type: 'image' as const, url: 'test.jpg', size: 500000 } // 500KB
      ];
      
      const isOfflineAvailable = (service as any).determineOfflineAvailability(smallImageContent);
      expect(isOfflineAvailable).toBe(true);

      // Content with large videos should not be offline available
      const largeVideoContent = [
        { type: 'video' as const, url: 'test.mp4', size: 50000000 } // 50MB
      ];
      
      const isNotOfflineAvailable = (service as any).determineOfflineAvailability(largeVideoContent);
      expect(isNotOfflineAvailable).toBe(false);
    });

    it('should detect media type correctly', () => {
      expect((service as any).detectMediaType('test.jpg')).toBe('image');
      expect((service as any).detectMediaType('test.mp4')).toBe('video');
      expect((service as any).detectMediaType('test.mp3')).toBe('audio');
      expect((service as any).detectMediaType('test.unknown')).toBe('image'); // default
    });

    it('should optimize content for device constraints', () => {
      const content = [
        {
          id: 'content1',
          multimedia: [
            { type: 'video' as const, url: 'large.mp4', size: 50000000 },
            { type: 'image' as const, url: 'small.jpg', size: 100000 }
          ]
        },
        {
          id: 'content2',
          multimedia: [
            { type: 'image' as const, url: 'medium.jpg', size: 500000 }
          ]
        }
      ];

      const poorConnectionContext = {
        location: { latitude: 0, longitude: 0, timestamp: new Date() },
        timeOfDay: 'morning',
        connectionQuality: 'poor' as const,
        batteryLevel: 80
      };

      const optimized = (service as any).optimizeContentForDevice(content, poorConnectionContext);
      
      // Should limit content and filter out heavy multimedia
      expect(optimized.length).toBeLessThanOrEqual(2);
      
      // Should not contain large videos
      const hasLargeVideo = optimized.some((item: any) => 
        item.multimedia.some((m: any) => m.type === 'video' && m.size > 10000000)
      );
      expect(hasLargeVideo).toBe(false);
    });

    it('should determine delivery method based on context', () => {
      const offlineContext = {
        location: { latitude: 0, longitude: 0, timestamp: new Date() },
        timeOfDay: 'morning',
        connectionQuality: 'offline' as const
      };

      const deliveryMethod = (service as any).determineDeliveryMethod(offlineContext, []);
      expect(deliveryMethod).toBe('cached');

      const poorConnectionContext = {
        ...offlineContext,
        connectionQuality: 'poor' as const,
        batteryLevel: 15
      };

      const poorDeliveryMethod = (service as any).determineDeliveryMethod(poorConnectionContext, []);
      expect(poorDeliveryMethod).toBe('notification');

      const goodContext = {
        ...offlineContext,
        connectionQuality: 'good' as const,
        batteryLevel: 80
      };

      const goodDeliveryMethod = (service as any).determineDeliveryMethod(goodContext, []);
      expect(goodDeliveryMethod).toBe('immediate');
    });
  });

  describe('Content personalization', () => {
    it('should filter content by contextual triggers', () => {
      const content = [
        {
          id: 'morning-content',
          contextualTriggers: {
            timeOfDay: ['morning', 'afternoon']
          }
        },
        {
          id: 'evening-content',
          contextualTriggers: {
            timeOfDay: ['evening', 'night']
          }
        },
        {
          id: 'weather-content',
          contextualTriggers: {
            weather: ['sunny']
          }
        },
        {
          id: 'no-triggers',
          contextualTriggers: {}
        }
      ];

      const morningContext = {
        location: { latitude: 0, longitude: 0, timestamp: new Date() },
        timeOfDay: 'morning',
        weather: 'rainy',
        connectionQuality: 'good' as const
      };

      const filtered = (service as any).filterByContext(content, morningContext);
      
      // Should include morning content and content with no triggers
      // Should exclude evening content and sunny weather content
      expect(filtered).toHaveLength(2);
      expect(filtered.map((c: any) => c.id)).toContain('morning-content');
      expect(filtered.map((c: any) => c.id)).toContain('no-triggers');
      expect(filtered.map((c: any) => c.id)).not.toContain('evening-content');
      expect(filtered.map((c: any) => c.id)).not.toContain('weather-content');
    });

    it('should personalize content based on user interests', () => {
      const content = [
        {
          id: 'history-content',
          interestTags: ['history', 'culture'],
          title: 'Historical Site',
          description: 'Ancient temple',
          priority: 5,
          estimatedReadTime: 5
        },
        {
          id: 'food-content',
          interestTags: ['food', 'dining'],
          title: 'Local Restaurant',
          description: 'Traditional cuisine',
          priority: 5,
          estimatedReadTime: 3
        },
        {
          id: 'long-content',
          interestTags: ['history'],
          title: 'Long Article',
          description: 'Detailed history',
          priority: 5,
          estimatedReadTime: 20
        }
      ];

      const filter = {
        interests: ['history'],
        languages: ['en'],
        accessibilityNeeds: [],
        contentTypes: [],
        maxReadTime: 10,
        preferredMediaTypes: ['text']
      };

      const personalized = (service as any).personalizeContent(content, filter);
      
      // Should include history content but exclude long content due to read time
      expect(personalized).toHaveLength(1);
      expect(personalized[0].id).toBe('history-content');
    });
  });

  describe('Error handling and fallbacks', () => {
    it('should provide meaningful delivery reasons', () => {
      const goodContext = {
        location: { latitude: 0, longitude: 0, timestamp: new Date() },
        timeOfDay: 'morning',
        connectionQuality: 'good' as const
      };

      const reasonWithContent = (service as any).getDeliveryReason(goodContext, 3);
      expect(reasonWithContent).toContain('3');
      expect(reasonWithContent).toContain('contextually relevant');

      const reasonNoContent = (service as any).getDeliveryReason(goodContext, 0);
      expect(reasonNoContent).toContain('No relevant content');

      const offlineContext = {
        ...goodContext,
        connectionQuality: 'offline' as const
      };

      const offlineReason = (service as any).getDeliveryReason(offlineContext, 2);
      expect(offlineReason).toContain('cached content');
    });

    it('should extract interest tags from content', () => {
      const content = {
        category: 'historical',
        title: 'Ancient Temple Architecture',
        description: 'Beautiful art and culture showcase'
      };

      const tags = (service as any).extractInterestTags(content);
      
      expect(tags).toContain('historical');
      expect(tags).toContain('art');
      expect(tags).toContain('culture');
      expect(tags).toContain('architecture');
    });
  });

  describe('Content accuracy testing', () => {
    it('should calculate accuracy metrics correctly', async () => {
      // Mock the triggerContextualContent method
      const mockTriggerContent = jest.fn().mockResolvedValue({
        triggeredContent: [
          { id: 'expected-1' },
          { id: 'unexpected-1' }
        ]
      });

      (service as any).triggerContextualContent = mockTriggerContent;

      const testLocation = { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() };
      const expectedIds = ['expected-1', 'expected-2'];
      const context = {
        location: testLocation,
        timeOfDay: 'morning',
        connectionQuality: 'good' as const
      };

      const result = await service.testContentAccuracy(testLocation, expectedIds, context);

      expect(result.accuracy).toBe(0.5); // 1 out of 2 expected items delivered
      expect(result.deliveredContent).toContain('expected-1');
      expect(result.deliveredContent).toContain('unexpected-1');
      expect(result.missedContent).toContain('expected-2');
      expect(result.unexpectedContent).toContain('unexpected-1');
      expect(result.timing).toBeGreaterThan(0);
    });
  });
});