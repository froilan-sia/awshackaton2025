import { LocationService } from '../../src/services/locationService';
import { Location } from '../../src/models/Location';
import { UserLocationPreferencesModel } from '../../src/models/UserLocationPreferences';
import { LocationUpdate, PrivacyLevel, LocationSource } from '../../src/types/location';

// Mock the models
jest.mock('../../src/models/Location');
jest.mock('../../src/models/UserLocationPreferences');

const MockedLocation = Location as jest.Mocked<typeof Location>;
const MockedUserLocationPreferences = UserLocationPreferencesModel as jest.Mocked<typeof UserLocationPreferencesModel>;

describe('LocationService', () => {
  let locationService: LocationService;
  const mockUserId = 'user123';

  beforeEach(() => {
    locationService = new LocationService();
    jest.clearAllMocks();
  });

  describe('updateLocation', () => {
    const mockLocationUpdate: LocationUpdate = {
      userId: mockUserId,
      location: {
        latitude: 22.3193,
        longitude: 114.1694,
        accuracy: 10,
        timestamp: new Date()
      },
      privacyLevel: PrivacyLevel.MEDIUM,
      source: LocationSource.GPS
    };

    it('should update location successfully with valid data', async () => {
      // Mock user preferences
      const mockPreferences = {
        userId: mockUserId,
        trackingEnabled: true,
        privacyLevel: PrivacyLevel.MEDIUM,
        shareLocation: false,
        contentNotifications: true,
        geofenceRadius: 100,
        updateFrequency: 30
      };

      MockedUserLocationPreferences.findOne = jest.fn().mockResolvedValue(mockPreferences);
      MockedLocation.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(null)
        })
      }); // No previous location

      const mockSavedLocation = {
        ...mockLocationUpdate,
        _id: 'location123',
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };

      MockedLocation.prototype.save = jest.fn().mockResolvedValue(mockSavedLocation);

      const result = await locationService.updateLocation(mockLocationUpdate);

      expect(MockedUserLocationPreferences.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(MockedLocation.prototype.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error when tracking is disabled', async () => {
      const mockPreferences = {
        userId: mockUserId,
        trackingEnabled: false,
        privacyLevel: PrivacyLevel.MEDIUM,
        shareLocation: false,
        contentNotifications: true,
        geofenceRadius: 100,
        updateFrequency: 30
      };

      MockedUserLocationPreferences.findOne = jest.fn().mockResolvedValue(mockPreferences);

      await expect(locationService.updateLocation(mockLocationUpdate))
        .rejects.toThrow('Location tracking is disabled for this user');
    });

    it('should sanitize location based on privacy level', async () => {
      const mockPreferences = {
        userId: mockUserId,
        trackingEnabled: true,
        privacyLevel: PrivacyLevel.HIGH,
        shareLocation: false,
        contentNotifications: true,
        geofenceRadius: 100,
        updateFrequency: 30
      };

      MockedUserLocationPreferences.findOne = jest.fn().mockResolvedValue(mockPreferences);
      MockedLocation.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(null)
        })
      });

      let savedLocationData: any;
      MockedLocation.prototype.save = jest.fn().mockImplementation(function(this: any) {
        savedLocationData = this;
        return Promise.resolve(this);
      });

      await locationService.updateLocation(mockLocationUpdate);

      // Check that high privacy level reduces precision
      expect(savedLocationData.location.latitude).toBe(22.32); // Rounded to 2 decimal places
      expect(savedLocationData.location.longitude).toBe(114.17);
      expect(savedLocationData.location.accuracy).toBeUndefined();
    });
  });

  describe('getCurrentLocation', () => {
    it('should return current location for user', async () => {
      const mockLocation = {
        userId: mockUserId,
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
          timestamp: new Date()
        },
        privacyLevel: PrivacyLevel.MEDIUM,
        source: LocationSource.GPS
      };

      const mockPreferences = {
        userId: mockUserId,
        trackingEnabled: true,
        shareLocation: true
      };

      MockedUserLocationPreferences.findOne = jest.fn().mockResolvedValue(mockPreferences);
      MockedLocation.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockLocation)
        })
      });

      const result = await locationService.getCurrentLocation(mockUserId);

      expect(result).toEqual(mockLocation.location);
      expect(MockedLocation.findOne).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('should return null when no location data exists', async () => {
      const mockPreferences = {
        userId: mockUserId,
        trackingEnabled: true,
        shareLocation: true
      };

      MockedUserLocationPreferences.findOne = jest.fn().mockResolvedValue(mockPreferences);
      MockedLocation.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(null)
        })
      });

      const result = await locationService.getCurrentLocation(mockUserId);

      expect(result).toBeNull();
    });

    it('should throw error when location sharing is disabled for different requester', async () => {
      const mockPreferences = {
        userId: mockUserId,
        trackingEnabled: true,
        shareLocation: false
      };

      MockedUserLocationPreferences.findOne = jest.fn().mockResolvedValue(mockPreferences);

      await expect(locationService.getCurrentLocation(mockUserId, 'otherUser'))
        .rejects.toThrow('Location sharing is disabled for this user');
    });
  });

  describe('getUsersNearLocation', () => {
    it('should return nearby users who allow location sharing', async () => {
      const centerLocation = {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date()
      };

      const mockNearbyLocations = [
        {
          userId: 'user1',
          location: {
            latitude: 22.3195,
            longitude: 114.1696,
            timestamp: new Date()
          },
          privacyLevel: PrivacyLevel.MEDIUM
        },
        {
          userId: 'user2',
          location: {
            latitude: 22.3190,
            longitude: 114.1692,
            timestamp: new Date()
          },
          privacyLevel: PrivacyLevel.LOW
        }
      ];

      MockedLocation.find = jest.fn().mockResolvedValue(mockNearbyLocations);

      // Mock preferences for both users allowing location sharing
      MockedUserLocationPreferences.findOne = jest.fn()
        .mockResolvedValueOnce({ userId: 'user1', shareLocation: true })
        .mockResolvedValueOnce({ userId: 'user2', shareLocation: true });

      const result = await locationService.getUsersNearLocation(centerLocation, 100);

      expect(result).toEqual(['user1', 'user2']);
      expect(MockedLocation.find).toHaveBeenCalledWith({
        userId: { $ne: undefined },
        createdAt: { $gte: expect.any(Date) },
        privacyLevel: { $ne: PrivacyLevel.HIGH }
      });
    });
  });

  describe('getUserLocationPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPreferences = {
        userId: mockUserId,
        trackingEnabled: true,
        privacyLevel: PrivacyLevel.MEDIUM
      };

      MockedUserLocationPreferences.findOne = jest.fn().mockResolvedValue(mockPreferences);

      const result = await locationService.getUserLocationPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(MockedUserLocationPreferences.findOne).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('should create default preferences if none exist', async () => {
      MockedUserLocationPreferences.findOne = jest.fn().mockResolvedValue(null);
      
      const mockNewPreferences = {
        userId: mockUserId,
        trackingEnabled: true,
        privacyLevel: PrivacyLevel.MEDIUM,
        save: jest.fn().mockResolvedValue(true)
      };

      MockedUserLocationPreferences.prototype.save = jest.fn().mockResolvedValue(mockNewPreferences);

      const result = await locationService.getUserLocationPreferences(mockUserId);

      expect(MockedUserLocationPreferences.prototype.save).toHaveBeenCalled();
    });
  });

  describe('deleteUserLocationData', () => {
    it('should delete all user location data', async () => {
      MockedLocation.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });
      MockedUserLocationPreferences.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await locationService.deleteUserLocationData(mockUserId);

      expect(MockedLocation.deleteMany).toHaveBeenCalledWith({ userId: mockUserId });
      expect(MockedUserLocationPreferences.deleteOne).toHaveBeenCalledWith({ userId: mockUserId });
    });
  });
});