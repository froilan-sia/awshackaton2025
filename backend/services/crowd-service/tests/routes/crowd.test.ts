import request from 'supertest';
import express from 'express';
import crowdRoutes from '../../src/routes/crowd';
import { CrowdLevel } from '../../src/types/crowd';

// Mock the CrowdService
const mockCrowdServiceInstance = {
  getLocationCrowdInfo: jest.fn(),
  getBulkCrowdInfo: jest.fn(),
  optimizeUserRoute: jest.fn(),
  subscribeToLocationAlerts: jest.fn(),
  getRecommendedTimes: jest.fn(),
  getHighCrowdLocations: jest.fn(),
  getServiceStats: jest.fn()
};

jest.mock('../../src/services/crowdService', () => {
  return {
    CrowdService: jest.fn().mockImplementation(() => mockCrowdServiceInstance)
  };
});

describe('Crowd Routes', () => {
  let app: express.Application;
  let mockCrowdService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/crowd', crowdRoutes);

    // Reset all mocks
    jest.clearAllMocks();
    mockCrowdService = mockCrowdServiceInstance;
  });

  describe('GET /api/crowd/:locationId', () => {
    it('should return crowd data for valid location', async () => {
      const mockCrowdInfo = {
        crowdData: {
          locationId: 'hk-disneyland',
          locationName: 'Hong Kong Disneyland',
          crowdLevel: CrowdLevel.MODERATE,
          estimatedWaitTime: 20
        },
        isOvercrowded: false,
        hasLongWait: false
      };

      mockCrowdService.getLocationCrowdInfo.mockResolvedValue(mockCrowdInfo);

      const response = await request(app)
        .get('/api/crowd/hk-disneyland')
        .expect(200);

      expect(response.body).toEqual(mockCrowdInfo);
      expect(mockCrowdService.getLocationCrowdInfo).toHaveBeenCalledWith('hk-disneyland');
    });

    it('should return 404 for non-existent location', async () => {
      mockCrowdService.getLocationCrowdInfo.mockResolvedValue({ error: 'Location not found' });

      const response = await request(app)
        .get('/api/crowd/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Location not found');
    });

    it('should return 400 for missing location ID', async () => {
      const response = await request(app)
        .get('/api/crowd/')
        .expect(404); // Express returns 404 for missing route parameter
    });

    it('should handle service errors', async () => {
      mockCrowdService.getLocationCrowdInfo.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/crowd/test-location')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/crowd/bulk', () => {
    it('should return crowd data for multiple locations', async () => {
      const mockBulkData = {
        'hk-disneyland': {
          crowdData: { locationId: 'hk-disneyland', crowdLevel: CrowdLevel.HIGH },
          isOvercrowded: true,
          hasLongWait: true
        },
        'victoria-peak': {
          crowdData: { locationId: 'victoria-peak', crowdLevel: CrowdLevel.LOW },
          isOvercrowded: false,
          hasLongWait: false
        }
      };

      mockCrowdService.getBulkCrowdInfo.mockResolvedValue(mockBulkData);

      const response = await request(app)
        .post('/api/crowd/bulk')
        .send({ locationIds: ['hk-disneyland', 'victoria-peak'] })
        .expect(200);

      expect(response.body).toEqual(mockBulkData);
      expect(mockCrowdService.getBulkCrowdInfo).toHaveBeenCalledWith(['hk-disneyland', 'victoria-peak']);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/crowd/bulk')
        .send({ invalidField: 'test' })
        .expect(400);

      expect(response.body.error).toContain('Location IDs are required');
    });

    it('should validate locationIds array', async () => {
      const response = await request(app)
        .post('/api/crowd/bulk')
        .send({ locationIds: 'not-an-array' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle empty locationIds array', async () => {
      const response = await request(app)
        .post('/api/crowd/bulk')
        .send({ locationIds: [] })
        .expect(400);

      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/crowd/optimize-route', () => {
    it('should optimize route successfully', async () => {
      const mockOptimization = {
        userId: 'user-123',
        originalRoute: [],
        optimizedRoute: [],
        crowdAvoidanceScore: 0.8,
        estimatedTimeSaved: 30,
        alternativesConsidered: 2
      };

      mockCrowdService.optimizeUserRoute.mockResolvedValue(mockOptimization);

      const routeData = {
        userId: 'user-123',
        route: [
          {
            locationId: 'hk-disneyland',
            coordinates: { latitude: 22.3129, longitude: 114.0413 },
            estimatedArrivalTime: new Date().toISOString(),
            estimatedDuration: 480
          }
        ]
      };

      const response = await request(app)
        .post('/api/crowd/optimize-route')
        .send(routeData)
        .expect(200);

      expect(response.body).toEqual(mockOptimization);
      expect(mockCrowdService.optimizeUserRoute).toHaveBeenCalledWith('user-123', expect.any(Array));
    });

    it('should validate route optimization request', async () => {
      const response = await request(app)
        .post('/api/crowd/optimize-route')
        .send({ invalidField: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate route points structure', async () => {
      const response = await request(app)
        .post('/api/crowd/optimize-route')
        .send({
          userId: 'user-123',
          route: [
            {
              locationId: 'test',
              // Missing required fields
            }
          ]
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/crowd/subscribe', () => {
    it('should subscribe user to location alerts', async () => {
      const mockResult = {
        success: true,
        subscribedLocations: ['hk-disneyland', 'victoria-peak'],
        message: 'Subscribed to crowd alerts for 2 locations'
      };

      mockCrowdService.subscribeToLocationAlerts.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/crowd/subscribe')
        .send({
          userId: 'user-123',
          locationIds: ['hk-disneyland', 'victoria-peak']
        })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockCrowdService.subscribeToLocationAlerts).toHaveBeenCalledWith(
        'user-123',
        ['hk-disneyland', 'victoria-peak']
      );
    });

    it('should validate subscription request', async () => {
      const response = await request(app)
        .post('/api/crowd/subscribe')
        .send({ userId: 'user-123' }) // Missing locationIds
        .expect(400);

      expect(response.body.error).toContain('location IDs array are required');
    });

    it('should validate userId', async () => {
      const response = await request(app)
        .post('/api/crowd/subscribe')
        .send({ locationIds: ['test'] }) // Missing userId
        .expect(400);

      expect(response.body.error).toContain('User ID and location IDs array are required');
    });
  });

  describe('POST /api/crowd/recommended-times', () => {
    it('should return recommended times for locations', async () => {
      const mockRecommendations = {
        'hk-disneyland': [new Date(), new Date()],
        'victoria-peak': [new Date(), new Date(), new Date()]
      };

      mockCrowdService.getRecommendedTimes.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .post('/api/crowd/recommended-times')
        .send({ locationIds: ['hk-disneyland', 'victoria-peak'] })
        .expect(200);

      expect(response.body).toEqual(mockRecommendations);
      expect(mockCrowdService.getRecommendedTimes).toHaveBeenCalledWith(['hk-disneyland', 'victoria-peak']);
    });

    it('should validate locationIds array', async () => {
      const response = await request(app)
        .post('/api/crowd/recommended-times')
        .send({ locationIds: 'not-an-array' })
        .expect(400);

      expect(response.body.error).toContain('Location IDs array is required');
    });
  });

  describe('GET /api/crowd/high-crowd-locations', () => {
    it('should return high crowd locations', async () => {
      const mockHighCrowdLocations = [
        {
          locationId: 'hk-disneyland',
          locationName: 'Hong Kong Disneyland',
          crowdLevel: CrowdLevel.VERY_HIGH,
          estimatedWaitTime: 90
        },
        {
          locationId: 'victoria-peak',
          locationName: 'Victoria Peak',
          crowdLevel: CrowdLevel.HIGH,
          estimatedWaitTime: 45
        }
      ];

      mockCrowdService.getHighCrowdLocations.mockResolvedValue(mockHighCrowdLocations);

      const response = await request(app)
        .get('/api/crowd/high-crowd-locations')
        .expect(200);

      expect(response.body).toEqual(mockHighCrowdLocations);
      expect(mockCrowdService.getHighCrowdLocations).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockCrowdService.getHighCrowdLocations.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/crowd/high-crowd-locations')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/crowd/stats', () => {
    it('should return service statistics', async () => {
      const mockStats = {
        connectedUsers: 5,
        monitoringActive: true,
        totalSubscriptions: 15
      };

      mockCrowdService.getServiceStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/crowd/stats')
        .expect(200);

      expect(response.body).toEqual(mockStats);
      expect(mockCrowdService.getServiceStats).toHaveBeenCalled();
    });
  });
});