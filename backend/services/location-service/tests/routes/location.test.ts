import request from 'supertest';
import express from 'express';
import locationRoutes from '../../src/routes/location';
import { LocationService } from '../../src/services/locationService';
import { GeofenceService } from '../../src/services/geofenceService';
import { ContentDeliveryService } from '../../src/services/contentDeliveryService';

// Mock the services
jest.mock('../../src/services/locationService');
jest.mock('../../src/services/geofenceService');
jest.mock('../../src/services/contentDeliveryService');

const MockedLocationService = LocationService as jest.MockedClass<typeof LocationService>;
const MockedGeofenceService = GeofenceService as jest.MockedClass<typeof GeofenceService>;
const MockedContentDeliveryService = ContentDeliveryService as jest.MockedClass<typeof ContentDeliveryService>;

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'user123', email: 'test@example.com' };
    next();
  }
}));

describe('Location Routes', () => {
  let app: express.Application;
  let mockLocationService: jest.Mocked<LocationService>;
  let mockGeofenceService: jest.Mocked<GeofenceService>;
  let mockContentDeliveryService: jest.Mocked<ContentDeliveryService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/location', locationRoutes);

    mockLocationService = new MockedLocationService() as jest.Mocked<LocationService>;
    mockGeofenceService = new MockedGeofenceService() as jest.Mocked<GeofenceService>;
    mockContentDeliveryService = new MockedContentDeliveryService() as jest.Mocked<ContentDeliveryService>;

    jest.clearAllMocks();
  });

  describe('POST /api/location/update', () => {
    const validLocationUpdate = {
      location: {
        latitude: 22.3193,
        longitude: 114.1694,
        accuracy: 10
      },
      source: 'gps',
      privacyLevel: 'medium',
      language: 'en'
    };

    it('should update location successfully', async () => {
      const mockUpdatedLocation = {
        userId: 'user123',
        location: {
          ...validLocationUpdate.location,
          timestamp: new Date()
        },
        privacyLevel: 'medium',
        source: 'gps'
      };

      const mockGeofenceEvents = [
        {
          id: 'event1',
          userId: 'user123',
          geofenceId: 'geofence123',
          eventType: 'enter',
          location: validLocationUpdate.location,
          timestamp: new Date()
        }
      ];

      const mockTriggeredContent = [
        {
          event: mockGeofenceEvents[0],
          content: [
            {
              id: 'content1',
              title: 'Welcome to Central',
              description: 'You are now in Central District'
            }
          ]
        }
      ];

      mockLocationService.updateLocation = jest.fn().mockResolvedValue(mockUpdatedLocation);
      mockLocationService.getCurrentLocation = jest.fn().mockResolvedValue(null);
      mockGeofenceService.checkGeofenceEvents = jest.fn().mockResolvedValue(mockGeofenceEvents);
      mockContentDeliveryService.getTriggeredContent = jest.fn().mockResolvedValue(mockTriggeredContent);

      const response = await request(app)
        .post('/api/location/update')
        .send(validLocationUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toEqual(mockUpdatedLocation);
      expect(response.body.data.geofenceEvents).toEqual(mockGeofenceEvents);
      expect(response.body.data.triggeredContent).toEqual(mockTriggeredContent);
    });

    it('should return 400 for invalid location data', async () => {
      const invalidLocationUpdate = {
        location: {
          latitude: 91, // Invalid latitude
          longitude: 114.1694
        },
        source: 'gps'
      };

      const response = await request(app)
        .post('/api/location/update')
        .send(invalidLocationUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('latitude');
    });

    it('should handle location service errors', async () => {
      mockLocationService.updateLocation = jest.fn().mockRejectedValue(
        new Error('Location tracking is disabled')
      );

      const response = await request(app)
        .post('/api/location/update')
        .send(validLocationUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Location tracking is disabled');
    });
  });

  describe('GET /api/location/current', () => {
    it('should return current location', async () => {
      const mockLocation = {
        latitude: 22.3193,
        longitude: 114.1694,
        accuracy: 10,
        timestamp: new Date()
      };

      mockLocationService.getCurrentLocation = jest.fn().mockResolvedValue(mockLocation);

      const response = await request(app)
        .get('/api/location/current')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toEqual(mockLocation);
    });

    it('should return 404 when no location data found', async () => {
      mockLocationService.getCurrentLocation = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/location/current')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No location data found');
    });
  });

  describe('GET /api/location/history', () => {
    it('should return location history', async () => {
      const mockHistory = [
        {
          userId: 'user123',
          location: {
            latitude: 22.3193,
            longitude: 114.1694,
            timestamp: new Date()
          },
          createdAt: new Date()
        }
      ];

      mockLocationService.getLocationHistory = jest.fn().mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/location/history')
        .query({
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          limit: '50'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toEqual(mockHistory);
      expect(mockLocationService.getLocationHistory).toHaveBeenCalledWith(
        'user123',
        new Date('2023-01-01'),
        new Date('2023-12-31'),
        50
      );
    });
  });

  describe('GET /api/location/content', () => {
    it('should return contextual content for current location', async () => {
      const mockLocation = {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date()
      };

      const mockContextualContent = [
        {
          geofenceId: 'geofence123',
          geofenceName: 'Central District',
          content: [
            {
              id: 'content1',
              title: 'Central District History',
              description: 'Learn about the history of Central'
            }
          ]
        }
      ];

      mockLocationService.getCurrentLocation = jest.fn().mockResolvedValue(mockLocation);
      mockContentDeliveryService.getContextualContent = jest.fn().mockResolvedValue(mockContextualContent);

      const response = await request(app)
        .get('/api/location/content')
        .query({
          language: 'en',
          radius: '500',
          preferences: 'history,culture'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toEqual(mockLocation);
      expect(response.body.data.content).toEqual(mockContextualContent);
      expect(mockContentDeliveryService.getContextualContent).toHaveBeenCalledWith(
        mockLocation,
        'en',
        ['history', 'culture'],
        500
      );
    });

    it('should return 404 when no location data found', async () => {
      mockLocationService.getCurrentLocation = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/location/content')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No location data found');
    });
  });

  describe('GET /api/location/preferences', () => {
    it('should return user location preferences', async () => {
      const mockPreferences = {
        userId: 'user123',
        trackingEnabled: true,
        privacyLevel: 'medium',
        shareLocation: false,
        contentNotifications: true,
        geofenceRadius: 100,
        updateFrequency: 30
      };

      mockLocationService.getUserLocationPreferences = jest.fn().mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get('/api/location/preferences')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toEqual(mockPreferences);
    });
  });

  describe('PUT /api/location/preferences', () => {
    it('should update location preferences', async () => {
      const updates = {
        trackingEnabled: false,
        privacyLevel: 'high',
        shareLocation: true
      };

      const mockUpdatedPreferences = {
        userId: 'user123',
        ...updates,
        contentNotifications: true,
        geofenceRadius: 100,
        updateFrequency: 30
      };

      mockLocationService.updateLocationPreferences = jest.fn().mockResolvedValue(mockUpdatedPreferences);

      const response = await request(app)
        .put('/api/location/preferences')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toEqual(mockUpdatedPreferences);
      expect(mockLocationService.updateLocationPreferences).toHaveBeenCalledWith('user123', updates);
    });

    it('should return 400 for invalid preferences', async () => {
      const invalidUpdates = {
        trackingEnabled: 'invalid', // Should be boolean
        geofenceRadius: -10 // Should be positive
      };

      const response = await request(app)
        .put('/api/location/preferences')
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/location/geofence-events', () => {
    it('should return user geofence events', async () => {
      const mockEvents = [
        {
          id: 'event1',
          userId: 'user123',
          geofenceId: 'geofence123',
          eventType: 'enter',
          timestamp: new Date()
        }
      ];

      mockGeofenceService.getUserGeofenceEvents = jest.fn().mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/location/geofence-events')
        .query({
          startDate: '2023-01-01',
          limit: '50'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toEqual(mockEvents);
      expect(mockGeofenceService.getUserGeofenceEvents).toHaveBeenCalledWith(
        'user123',
        new Date('2023-01-01'),
        undefined,
        50
      );
    });
  });

  describe('DELETE /api/location/data', () => {
    it('should delete user location data', async () => {
      mockLocationService.deleteUserLocationData = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/location/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Location data deleted successfully');
      expect(mockLocationService.deleteUserLocationData).toHaveBeenCalledWith('user123');
    });
  });
});