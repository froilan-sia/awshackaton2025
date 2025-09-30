import { ContentDeliveryService } from '../../src/services/contentDeliveryService';
import { LocationContentModel } from '../../src/models/LocationContent';
import { GeofenceEventModel } from '../../src/models/GeofenceEvent';
import { GeofenceService } from '../../src/services/geofenceService';
import { GeofenceEventType, ContentCategory } from '../../src/types/location';

// Mock the models and services
jest.mock('../../src/models/LocationContent');
jest.mock('../../src/models/GeofenceEvent');
jest.mock('../../src/services/geofenceService');

const MockedLocationContentModel = LocationContentModel as jest.Mocked<typeof LocationContentModel>;
const MockedGeofenceEventModel = GeofenceEventModel as jest.Mocked<typeof GeofenceEventModel>;
const MockedGeofenceService = GeofenceService as jest.MockedClass<typeof GeofenceService>;

describe('ContentDeliveryService', () => {
  let contentDeliveryService: ContentDeliveryService;
  let mockGeofenceService: jest.Mocked<GeofenceService>;

  beforeEach(() => {
    contentDeliveryService = new ContentDeliveryService();
    mockGeofenceService = new MockedGeofenceService() as jest.Mocked<GeofenceService>;
    (contentDeliveryService as any).geofenceService = mockGeofenceService;
    jest.clearAllMocks();
  });

  describe('createLocationContent', () => {
    it('should create location content successfully', async () => {
      const contentData = {
        geofenceId: 'geofence123',
        title: 'Central District History',
        description: 'Learn about Central District',
        content: 'Central District is the heart of Hong Kong...',
        language: 'en',
        category: ContentCategory.HISTORICAL,
        priority: 8,
        isActive: true
      };

      const mockSavedContent = {
        ...contentData,
        id: 'content123',
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };

      MockedLocationContentModel.prototype.save = jest.fn().mockResolvedValue(mockSavedContent);

      const result = await contentDeliveryService.createLocationContent(contentData);

      expect(MockedLocationContentModel.prototype.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getContentForGeofence', () => {
    it('should return content for specific geofence', async () => {
      const geofenceId = 'geofence123';
      const language = 'en';
      const category = ContentCategory.HISTORICAL;

      const mockContent = [
        {
          id: 'content1',
          geofenceId,
          title: 'Historical Site',
          category: ContentCategory.HISTORICAL,
          priority: 9
        },
        {
          id: 'content2',
          geofenceId,
          title: 'Cultural Information',
          category: ContentCategory.CULTURAL,
          priority: 7
        }
      ];

      MockedLocationContentModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockContent)
      });

      const result = await contentDeliveryService.getContentForGeofence(
        geofenceId,
        language,
        category
      );

      expect(MockedLocationContentModel.find).toHaveBeenCalledWith({
        geofenceId,
        language,
        category,
        isActive: true
      });
      expect(result).toEqual(mockContent);
    });
  });

  describe('getTriggeredContent', () => {
    const mockUserId = 'user123';
    const mockGeofenceEvents = [
      {
        id: 'event1',
        userId: mockUserId,
        geofenceId: 'geofence123',
        eventType: GeofenceEventType.ENTER,
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        timestamp: new Date(),
        contentDelivered: false
      },
      {
        id: 'event2',
        userId: mockUserId,
        geofenceId: 'geofence456',
        eventType: GeofenceEventType.DWELL,
        location: {
          latitude: 22.3200,
          longitude: 114.1700,
          timestamp: new Date()
        },
        timestamp: new Date(),
        contentDelivered: false
      }
    ];

    it('should return triggered content for ENTER and DWELL events', async () => {
      const mockContent = [
        {
          id: 'content1',
          geofenceId: 'geofence123',
          title: 'Safety Tips',
          category: ContentCategory.SAFETY,
          priority: 10
        },
        {
          id: 'content2',
          geofenceId: 'geofence123',
          title: 'Etiquette Guide',
          category: ContentCategory.ETIQUETTE,
          priority: 8
        }
      ];

      // Mock getContentForGeofence calls
      jest.spyOn(contentDeliveryService, 'getContentForGeofence')
        .mockResolvedValue(mockContent as any);

      MockedGeofenceEventModel.findOneAndUpdate = jest.fn().mockResolvedValue({});

      const result = await contentDeliveryService.getTriggeredContent(
        mockUserId,
        mockGeofenceEvents,
        'en',
        ['safety', 'culture']
      );

      expect(result).toHaveLength(2); // Both ENTER and DWELL events
      expect(result[0].event.eventType).toBe(GeofenceEventType.ENTER);
      expect(result[1].event.eventType).toBe(GeofenceEventType.DWELL);
      expect(result[0].content).toHaveLength(2); // Limited to top 3, but we have 2
    });

    it('should prioritize practical content for ENTER events', async () => {
      const enterEvent = [{
        id: 'event1',
        userId: mockUserId,
        geofenceId: 'geofence123',
        eventType: GeofenceEventType.ENTER,
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        timestamp: new Date(),
        contentDelivered: false
      }];

      const mockContent = [
        {
          id: 'content1',
          geofenceId: 'geofence123',
          title: 'Historical Info',
          category: ContentCategory.HISTORICAL,
          priority: 9
        },
        {
          id: 'content2',
          geofenceId: 'geofence123',
          title: 'Safety Tips',
          category: ContentCategory.SAFETY,
          priority: 8
        },
        {
          id: 'content3',
          geofenceId: 'geofence123',
          title: 'Etiquette Guide',
          category: ContentCategory.ETIQUETTE,
          priority: 7
        }
      ];

      jest.spyOn(contentDeliveryService, 'getContentForGeofence')
        .mockResolvedValue(mockContent as any);

      MockedGeofenceEventModel.findOneAndUpdate = jest.fn().mockResolvedValue({});

      const result = await contentDeliveryService.getTriggeredContent(
        mockUserId,
        enterEvent,
        'en'
      );

      // Should prioritize practical content (safety, etiquette) for ENTER events
      expect(result[0].content[0].category).toBe(ContentCategory.SAFETY);
      expect(result[0].content[1].category).toBe(ContentCategory.ETIQUETTE);
    });

    it('should skip events that already have content delivered', async () => {
      const deliveredEvent = [{
        id: 'event1',
        userId: mockUserId,
        geofenceId: 'geofence123',
        eventType: GeofenceEventType.ENTER,
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        timestamp: new Date(),
        contentDelivered: true // Already delivered
      }];

      const result = await contentDeliveryService.getTriggeredContent(
        mockUserId,
        deliveredEvent,
        'en'
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getContextualContent', () => {
    it('should return contextual content for current location', async () => {
      const location = {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date()
      };

      const mockGeofences = [
        {
          id: 'geofence1',
          name: 'Central District',
          center: location,
          radius: 500,
          isActive: true
        }
      ];

      const mockContent = [
        {
          id: 'content1',
          geofenceId: 'geofence1',
          title: 'Central District Guide',
          category: ContentCategory.CULTURAL,
          priority: 9
        }
      ];

      mockGeofenceService.getGeofencesNearLocation = jest.fn().mockResolvedValue(mockGeofences as any);
      jest.spyOn(contentDeliveryService, 'getContentForGeofence')
        .mockResolvedValue(mockContent as any);

      const result = await contentDeliveryService.getContextualContent(
        location,
        'en',
        ['culture'],
        500
      );

      expect(result).toHaveLength(1);
      expect(result[0].geofenceName).toBe('Central District');
      expect(result[0].content).toHaveLength(1);
    });
  });

  describe('getContentByCategory', () => {
    it('should return content filtered by category and location', async () => {
      const location = {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date()
      };

      const mockGeofences = [
        { id: 'geofence1' },
        { id: 'geofence2' }
      ];

      const mockContent = [
        {
          id: 'content1',
          category: ContentCategory.SAFETY,
          priority: 10
        }
      ];

      mockGeofenceService.getGeofencesNearLocation = jest.fn().mockResolvedValue(mockGeofences as any);
      MockedLocationContentModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockContent)
      });

      const result = await contentDeliveryService.getContentByCategory(
        ContentCategory.SAFETY,
        location,
        'en',
        1000
      );

      expect(MockedLocationContentModel.find).toHaveBeenCalledWith({
        geofenceId: { $in: ['geofence1', 'geofence2'] },
        category: ContentCategory.SAFETY,
        language: 'en',
        isActive: true
      });
      expect(result).toEqual(mockContent);
    });
  });

  describe('getContentStatistics', () => {
    it('should return content statistics', async () => {
      const mockStats = [
        { _id: ContentCategory.HISTORICAL, count: 5 },
        { _id: ContentCategory.CULTURAL, count: 3 }
      ];

      const mockLanguageStats = [
        { _id: 'en', count: 6 },
        { _id: 'zh', count: 2 }
      ];

      MockedLocationContentModel.countDocuments = jest.fn()
        .mockResolvedValueOnce(8) // total content
        .mockResolvedValueOnce(7); // active content

      MockedLocationContentModel.aggregate = jest.fn()
        .mockResolvedValueOnce(mockStats) // category stats
        .mockResolvedValueOnce(mockLanguageStats); // language stats

      const result = await contentDeliveryService.getContentStatistics();

      expect(result.totalContent).toBe(8);
      expect(result.activeContent).toBe(7);
      expect(result.contentByCategory[ContentCategory.HISTORICAL]).toBe(5);
      expect(result.contentByLanguage['en']).toBe(6);
    });
  });

  describe('updateLocationContent', () => {
    it('should update location content successfully', async () => {
      const contentId = 'content123';
      const updates = { title: 'Updated Title', priority: 10 };

      const mockUpdatedContent = {
        id: contentId,
        title: 'Updated Title',
        priority: 10
      };

      MockedLocationContentModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpdatedContent);

      const result = await contentDeliveryService.updateLocationContent(contentId, updates);

      expect(MockedLocationContentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: contentId },
        updates,
        { new: true }
      );
      expect(result).toEqual(mockUpdatedContent);
    });
  });

  describe('deleteLocationContent', () => {
    it('should delete location content successfully', async () => {
      const contentId = 'content123';

      MockedLocationContentModel.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const result = await contentDeliveryService.deleteLocationContent(contentId);

      expect(MockedLocationContentModel.deleteOne).toHaveBeenCalledWith({ id: contentId });
      expect(result).toBe(true);
    });

    it('should return false when content not found', async () => {
      const contentId = 'nonexistent';

      MockedLocationContentModel.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });

      const result = await contentDeliveryService.deleteLocationContent(contentId);

      expect(result).toBe(false);
    });
  });
});