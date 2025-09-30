import { GeofenceService } from '../../src/services/geofenceService';
import { GeofenceModel } from '../../src/models/Geofence';
import { GeofenceEventModel } from '../../src/models/GeofenceEvent';
import { GeofenceEventType } from '../../src/types/location';

// Mock the models
jest.mock('../../src/models/Geofence');
jest.mock('../../src/models/GeofenceEvent');

const MockedGeofenceModel = GeofenceModel as jest.Mocked<typeof GeofenceModel>;
const MockedGeofenceEventModel = GeofenceEventModel as jest.Mocked<typeof GeofenceEventModel>;

describe('GeofenceService', () => {
  let geofenceService: GeofenceService;
  const mockUserId = 'user123';

  beforeEach(() => {
    geofenceService = new GeofenceService();
    jest.clearAllMocks();
  });

  describe('createGeofence', () => {
    it('should create a new geofence successfully', async () => {
      const geofenceData = {
        name: 'Central District',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 500,
        isActive: true
      };

      const mockSavedGeofence = {
        ...geofenceData,
        id: 'geofence123',
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };

      MockedGeofenceModel.prototype.save = jest.fn().mockResolvedValue(mockSavedGeofence);

      const result = await geofenceService.createGeofence(geofenceData);

      expect(MockedGeofenceModel.prototype.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getActiveGeofences', () => {
    it('should return all active geofences', async () => {
      const mockGeofences = [
        {
          id: 'geofence1',
          name: 'Central',
          isActive: true
        },
        {
          id: 'geofence2',
          name: 'Tsim Sha Tsui',
          isActive: true
        }
      ];

      MockedGeofenceModel.find = jest.fn().mockResolvedValue(mockGeofences);

      const result = await geofenceService.getActiveGeofences();

      expect(MockedGeofenceModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockGeofences);
    });
  });

  describe('checkGeofenceEvents', () => {
    const currentLocation = {
      latitude: 22.3193,
      longitude: 114.1694,
      timestamp: new Date()
    };

    const previousLocation = {
      latitude: 22.3200,
      longitude: 114.1700,
      timestamp: new Date(Date.now() - 60000) // 1 minute ago
    };

    it('should detect ENTER event when user enters geofence', async () => {
      const mockGeofence = {
        id: 'geofence123',
        name: 'Central District',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 100,
        isActive: true
      };

      // Mock geofences near location
      jest.spyOn(geofenceService, 'getGeofencesNearLocation')
        .mockResolvedValue([mockGeofence] as any);

      // Mock that user was not previously in geofence but is now
      const mockSavedEvent = {
        id: 'event123',
        userId: mockUserId,
        geofenceId: 'geofence123',
        eventType: GeofenceEventType.ENTER,
        location: currentLocation,
        timestamp: new Date(),
        toObject: jest.fn().mockReturnValue({
          id: 'event123',
          userId: mockUserId,
          geofenceId: 'geofence123',
          eventType: GeofenceEventType.ENTER,
          location: currentLocation,
          timestamp: new Date()
        })
      };

      MockedGeofenceEventModel.prototype.save = jest.fn().mockResolvedValue(mockSavedEvent);

      const events = await geofenceService.checkGeofenceEvents(
        mockUserId,
        currentLocation,
        { ...previousLocation, latitude: 22.3300 } // Far from geofence
      );

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(GeofenceEventType.ENTER);
      expect(MockedGeofenceEventModel.prototype.save).toHaveBeenCalled();
    });

    it('should detect EXIT event when user leaves geofence', async () => {
      const mockGeofence = {
        id: 'geofence123',
        name: 'Central District',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 100,
        isActive: true
      };

      jest.spyOn(geofenceService, 'getGeofencesNearLocation')
        .mockResolvedValue([mockGeofence] as any);

      const mockSavedEvent = {
        id: 'event123',
        userId: mockUserId,
        geofenceId: 'geofence123',
        eventType: GeofenceEventType.EXIT,
        location: currentLocation,
        timestamp: new Date(),
        toObject: jest.fn().mockReturnValue({
          id: 'event123',
          userId: mockUserId,
          geofenceId: 'geofence123',
          eventType: GeofenceEventType.EXIT,
          location: currentLocation,
          timestamp: new Date()
        })
      };

      MockedGeofenceEventModel.prototype.save = jest.fn().mockResolvedValue(mockSavedEvent);

      // Current location is far from geofence, previous was inside
      const events = await geofenceService.checkGeofenceEvents(
        mockUserId,
        { ...currentLocation, latitude: 22.3300 }, // Far from geofence
        currentLocation // Was inside geofence
      );

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(GeofenceEventType.EXIT);
    });

    it('should detect DWELL event when user stays in geofence', async () => {
      const mockGeofence = {
        id: 'geofence123',
        name: 'Central District',
        center: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        radius: 100,
        isActive: true
      };

      jest.spyOn(geofenceService, 'getGeofencesNearLocation')
        .mockResolvedValue([mockGeofence] as any);

      // Mock no recent dwell event
      MockedGeofenceEventModel.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(null)
      });

      const mockSavedEvent = {
        id: 'event123',
        userId: mockUserId,
        geofenceId: 'geofence123',
        eventType: GeofenceEventType.DWELL,
        location: currentLocation,
        timestamp: new Date(),
        toObject: jest.fn().mockReturnValue({
          id: 'event123',
          userId: mockUserId,
          geofenceId: 'geofence123',
          eventType: GeofenceEventType.DWELL,
          location: currentLocation,
          timestamp: new Date()
        })
      };

      MockedGeofenceEventModel.prototype.save = jest.fn().mockResolvedValue(mockSavedEvent);

      const events = await geofenceService.checkGeofenceEvents(
        mockUserId,
        currentLocation,
        currentLocation // Both current and previous are inside geofence
      );

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(GeofenceEventType.DWELL);
    });
  });

  describe('getGeofencesNearLocation', () => {
    it('should return geofences within search radius', async () => {
      const location = {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date()
      };

      const mockGeofences = [
        {
          id: 'geofence1',
          name: 'Nearby Geofence',
          center: {
            latitude: 22.3195,
            longitude: 114.1696,
            timestamp: new Date()
          },
          radius: 100,
          isActive: true
        },
        {
          id: 'geofence2',
          name: 'Far Geofence',
          center: {
            latitude: 22.4000,
            longitude: 114.2000,
            timestamp: new Date()
          },
          radius: 100,
          isActive: true
        }
      ];

      jest.spyOn(geofenceService, 'getActiveGeofences')
        .mockResolvedValue(mockGeofences as any);

      const result = await geofenceService.getGeofencesNearLocation(location, 1000);

      // Should only return the nearby geofence
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('geofence1');
    });
  });

  describe('getUserGeofenceEvents', () => {
    it('should return user geofence events with date filtering', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const mockEvents = [
        {
          id: 'event1',
          userId: mockUserId,
          eventType: GeofenceEventType.ENTER,
          timestamp: new Date('2023-06-01'),
          toObject: jest.fn().mockReturnValue({
            id: 'event1',
            userId: mockUserId,
            eventType: GeofenceEventType.ENTER,
            timestamp: new Date('2023-06-01')
          })
        }
      ];

      MockedGeofenceEventModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockEvents)
        })
      });

      const result = await geofenceService.getUserGeofenceEvents(
        mockUserId,
        startDate,
        endDate,
        50
      );

      expect(MockedGeofenceEventModel.find).toHaveBeenCalledWith({
        userId: mockUserId,
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateGeofence', () => {
    it('should update geofence successfully', async () => {
      const geofenceId = 'geofence123';
      const updates = { name: 'Updated Name', radius: 200 };

      const mockUpdatedGeofence = {
        id: geofenceId,
        name: 'Updated Name',
        radius: 200
      };

      MockedGeofenceModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpdatedGeofence);

      const result = await geofenceService.updateGeofence(geofenceId, updates);

      expect(MockedGeofenceModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: geofenceId },
        updates,
        { new: true }
      );
      expect(result).toEqual(mockUpdatedGeofence);
    });
  });

  describe('deleteGeofence', () => {
    it('should delete geofence successfully', async () => {
      const geofenceId = 'geofence123';

      MockedGeofenceModel.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const result = await geofenceService.deleteGeofence(geofenceId);

      expect(MockedGeofenceModel.deleteOne).toHaveBeenCalledWith({ id: geofenceId });
      expect(result).toBe(true);
    });

    it('should return false when geofence not found', async () => {
      const geofenceId = 'nonexistent';

      MockedGeofenceModel.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });

      const result = await geofenceService.deleteGeofence(geofenceId);

      expect(result).toBe(false);
    });
  });
});