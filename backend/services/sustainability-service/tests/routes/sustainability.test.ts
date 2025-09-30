import request from 'supertest';
import app from '../../src/index';
import { VisitType, TransportationMode, BusinessType } from '../../src/types/sustainability';

describe('Sustainability API Routes', () => {
  describe('POST /api/sustainability/visits', () => {
    it('should track a business visit successfully', async () => {
      const visitData = {
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      };

      const response = await request(app)
        .post('/api/sustainability/visits')
        .send(visitData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(visitData.userId);
      expect(response.body.data.businessId).toBe(visitData.businessId);
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        userId: 'user-123',
        // Missing required fields
        duration: -10 // Invalid duration
      };

      const response = await request(app)
        .post('/api/sustainability/visits')
        .send(invalidData)
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Validation error');
    });
  });

  describe('GET /api/sustainability/visits/user/:userId', () => {
    beforeEach(async () => {
      // Add a test visit
      await request(app)
        .post('/api/sustainability/visits')
        .send({
          userId: 'test-user',
          businessId: 'bus-001',
          duration: 60,
          estimatedSpending: 200,
          visitType: VisitType.DINING,
          transportationMode: TransportationMode.WALKING,
          distance: 1
        });
    });

    it('should return user visits', async () => {
      const response = await request(app)
        .get('/api/sustainability/visits/user/test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no visits', async () => {
      const response = await request(app)
        .get('/api/sustainability/visits/user/no-visits-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should filter visits by date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get('/api/sustainability/visits/user/test-user')
        .query({
          startDate: tomorrow.toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/sustainability/metrics/user/:userId', () => {
    beforeEach(async () => {
      // Add test visits
      await request(app)
        .post('/api/sustainability/visits')
        .send({
          userId: 'metrics-user',
          businessId: 'bus-001',
          duration: 60,
          estimatedSpending: 200,
          visitType: VisitType.DINING,
          transportationMode: TransportationMode.WALKING,
          distance: 1
        });

      await request(app)
        .post('/api/sustainability/visits')
        .send({
          userId: 'metrics-user',
          businessId: 'bus-002',
          duration: 90,
          estimatedSpending: 150,
          visitType: VisitType.SIGHTSEEING,
          transportationMode: TransportationMode.PUBLIC_TRANSPORT,
          distance: 5
        });
    });

    it('should return user sustainability metrics', async () => {
      const response = await request(app)
        .get('/api/sustainability/metrics/user/metrics-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalVisits).toBe(2);
      expect(response.body.data.ecoTransportUsage).toBe(100);
      expect(response.body.data.averageSustainabilityScore).toBeGreaterThan(0);
      expect(response.body.data.localEconomicImpact).toBeGreaterThan(0);
      expect(response.body.data.carbonSaved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /api/sustainability/businesses', () => {
    it('should add a local business successfully', async () => {
      const businessData = {
        name: 'Test Restaurant',
        type: BusinessType.RESTAURANT,
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Central',
          address: '123 Test Street'
        },
        localOwnership: true,
        employeesCount: 10,
        certifications: ['Local Heritage']
      };

      const response = await request(app)
        .post('/api/sustainability/businesses')
        .send(businessData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(businessData.name);
      expect(response.body.data.sustainabilityScore).toBeGreaterThan(0);
    });

    it('should return validation error for invalid business data', async () => {
      const invalidData = {
        name: '', // Empty name
        type: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/sustainability/businesses')
        .send(invalidData)
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Validation error');
    });
  });

  describe('GET /api/sustainability/businesses', () => {
    it('should return list of businesses', async () => {
      const response = await request(app)
        .get('/api/sustainability/businesses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter businesses by district', async () => {
      const response = await request(app)
        .get('/api/sustainability/businesses')
        .query({ district: 'Central' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should limit number of results', async () => {
      const response = await request(app)
        .get('/api/sustainability/businesses')
        .query({ limit: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/sustainability/businesses/:businessId', () => {
    let businessId: string;

    beforeEach(async () => {
      const businessResponse = await request(app)
        .post('/api/sustainability/businesses')
        .send({
          name: 'Test Business for Retrieval',
          type: BusinessType.RESTAURANT,
          location: {
            latitude: 22.2783,
            longitude: 114.1747,
            district: 'Central',
            address: '123 Test Street'
          },
          localOwnership: true,
          employeesCount: 10,
          certifications: ['Local Heritage']
        });

      businessId = businessResponse.body.data.id;
    });

    it('should return business with sustainability score', async () => {
      const response = await request(app)
        .get(`/api/sustainability/businesses/${businessId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.business).toBeDefined();
      expect(response.body.data.score).toBeDefined();
      expect(response.body.data.score.overallScore).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent business', async () => {
      const response = await request(app)
        .get('/api/sustainability/businesses/non-existent')
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Business not found');
    });
  });

  describe('POST /api/sustainability/transport/recommendations', () => {
    it('should return transport recommendations', async () => {
      const requestData = {
        from: 'Central',
        to: 'Admiralty',
        preferences: {
          maxCost: 100,
          prioritizeSustainability: true
        }
      };

      const response = await request(app)
        .post('/api/sustainability/transport/recommendations')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('type');
      expect(response.body.data[0]).toHaveProperty('carbonFootprint');
    });

    it('should return validation error for invalid request', async () => {
      const invalidData = {
        from: '', // Empty from
        to: 'Admiralty'
      };

      const response = await request(app)
        .post('/api/sustainability/transport/recommendations')
        .send(invalidData)
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Validation error');
    });
  });

  describe('POST /api/sustainability/transport/carbon-footprint', () => {
    it('should calculate carbon footprint', async () => {
      const requestData = {
        transportModes: [
          { mode: TransportationMode.WALKING, distance: 2 },
          { mode: TransportationMode.PUBLIC_TRANSPORT, distance: 10 },
          { mode: TransportationMode.TAXI, distance: 5 }
        ]
      };

      const response = await request(app)
        .post('/api/sustainability/transport/carbon-footprint')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalCarbonFootprint).toBe(1.5);
      expect(response.body.data.unit).toBe('kg CO2');
    });
  });

  describe('GET /api/sustainability/transport/:mode/tips', () => {
    it('should return sustainability tips for transport mode', async () => {
      const response = await request(app)
        .get('/api/sustainability/transport/walking/tips')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(typeof response.body.data[0]).toBe('string');
    });
  });

  describe('GET /api/sustainability/transport/:mode/impact', () => {
    it('should return transport mode impact information', async () => {
      const response = await request(app)
        .get('/api/sustainability/transport/walking/impact')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.carbonFootprint).toBe(0);
      expect(response.body.data.sustainabilityRating).toBe('Excellent');
      expect(response.body.data.description).toContain('Zero emissions');
    });
  });

  describe('POST /api/sustainability/trips/summary', () => {
    beforeEach(async () => {
      // Add visits for the trip
      await request(app)
        .post('/api/sustainability/visits')
        .send({
          userId: 'trip-user',
          businessId: 'bus-001',
          duration: 60,
          estimatedSpending: 200,
          visitType: VisitType.DINING,
          transportationMode: TransportationMode.WALKING,
          distance: 1
        });
    });

    it('should generate trip summary', async () => {
      const tripData = {
        userId: 'trip-user',
        tripId: 'test-trip',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-03')
      };

      const response = await request(app)
        .post('/api/sustainability/trips/summary')
        .send(tripData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(tripData.userId);
      expect(response.body.data.tripId).toBe(tripData.tripId);
      expect(response.body.data.sustainabilityScore).toBeGreaterThan(0);
    });
  });

  describe('GET /api/sustainability/trips/:tripId/summary', () => {
    let tripId: string;

    beforeEach(async () => {
      // Add visit and create trip summary
      await request(app)
        .post('/api/sustainability/visits')
        .send({
          userId: 'summary-user',
          businessId: 'bus-001',
          duration: 60,
          estimatedSpending: 200,
          visitType: VisitType.DINING,
          transportationMode: TransportationMode.WALKING,
          distance: 1
        });

      const tripResponse = await request(app)
        .post('/api/sustainability/trips/summary')
        .send({
          userId: 'summary-user',
          tripId: 'summary-trip',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-03')
        });

      tripId = tripResponse.body.data.tripId;
    });

    it('should return trip summary', async () => {
      const response = await request(app)
        .get(`/api/sustainability/trips/${tripId}/summary`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.tripId).toBe(tripId);
    });

    it('should return 404 for non-existent trip', async () => {
      const response = await request(app)
        .get('/api/sustainability/trips/non-existent/summary')
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Trip summary not found');
    });
  });

  describe('GET /api/sustainability/trips/user/:userId/summaries', () => {
    beforeEach(async () => {
      // Add visit and create trip summary
      await request(app)
        .post('/api/sustainability/visits')
        .send({
          userId: 'summaries-user',
          businessId: 'bus-001',
          duration: 60,
          estimatedSpending: 200,
          visitType: VisitType.DINING,
          transportationMode: TransportationMode.WALKING,
          distance: 1
        });

      await request(app)
        .post('/api/sustainability/trips/summary')
        .send({
          userId: 'summaries-user',
          tripId: 'user-trip-1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-03')
        });
    });

    it('should return user trip summaries', async () => {
      const response = await request(app)
        .get('/api/sustainability/trips/user/summaries-user/summaries')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/sustainability/insights/user/:userId', () => {
    beforeEach(async () => {
      // Add visits and trip for insights
      await request(app)
        .post('/api/sustainability/visits')
        .send({
          userId: 'insights-user',
          businessId: 'bus-001',
          duration: 60,
          estimatedSpending: 200,
          visitType: VisitType.DINING,
          transportationMode: TransportationMode.WALKING,
          distance: 1
        });

      await request(app)
        .post('/api/sustainability/trips/summary')
        .send({
          userId: 'insights-user',
          tripId: 'insights-trip',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-03')
        });
    });

    it('should return comprehensive sustainability insights', async () => {
      const response = await request(app)
        .get('/api/sustainability/insights/user/insights-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.overallScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.recentTrips).toBeDefined();
      expect(response.body.data.recommendations).toBeDefined();
      expect(response.body.data.achievements).toBeDefined();
      
      expect(Array.isArray(response.body.data.recentTrips)).toBe(true);
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      expect(Array.isArray(response.body.data.achievements)).toBe(true);
    });
  });

  describe('GET /api/sustainability/benchmarks', () => {
    it('should return sustainability benchmarks', async () => {
      const response = await request(app)
        .get('/api/sustainability/benchmarks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.averageOverallScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.averageLocalOwnershipScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.averageEnvironmentalScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.averageCommunityImpactScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.averageCulturalPreservationScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/sustainability/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/sustainability/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Sustainability service is healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/sustainability/non-existent-route')
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Route not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/sustainability/visits')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});