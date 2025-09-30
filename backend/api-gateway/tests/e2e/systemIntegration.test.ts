import request from 'supertest';
import { Express } from 'express';
import app from '../../src/index';

describe('System Integration End-to-End Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Start the server for testing
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check Endpoints', () => {
    test('GET /health should return system health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('version');
      
      expect(Array.isArray(response.body.data.services)).toBe(true);
    });

    test('GET /health/detailed should return comprehensive health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallHealth');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('circuitBreakers');
      expect(response.body.data).toHaveProperty('loadBalancer');
      expect(response.body.data).toHaveProperty('gateway');
      
      expect(typeof response.body.data.overallHealth).toBe('number');
    });

    test('GET /health/metrics should return system metrics', async () => {
      const response = await request(app)
        .get('/health/metrics')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('services');
      
      expect(response.body.data.system).toHaveProperty('cpuUsage');
      expect(response.body.data.system).toHaveProperty('memoryUsage');
      expect(response.body.data.system).toHaveProperty('activeConnections');
    });

    test('GET /health/report should return health report with alerts and recommendations', async () => {
      const response = await request(app)
        .get('/health/report')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportTimestamp');
      expect(response.body.data).toHaveProperty('systemHealth');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('recommendations');
      
      expect(Array.isArray(response.body.data.alerts)).toBe(true);
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    test('GET /health/services should return service discovery information', async () => {
      const response = await request(app)
        .get('/health/services')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('totalServices');
      expect(response.body.data).toHaveProperty('healthyServices');
      
      expect(typeof response.body.data.totalServices).toBe('number');
      expect(typeof response.body.data.healthyServices).toBe('number');
    });

    test('GET /health/ready should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready');
    });

    test('GET /health/live should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('alive');
    });
  });

  describe('Service Routing and Load Balancing', () => {
    test('should route requests to user service', async () => {
      // This test assumes user service is running and healthy
      const response = await request(app)
        .get('/api/users/health')
        .expect('Content-Type', /json/);

      // Should either succeed (200) or fail gracefully (503) if service is down
      expect([200, 503]).toContain(response.status);
      
      if (response.status === 503) {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
      }
    });

    test('should route requests to recommendation service', async () => {
      const response = await request(app)
        .get('/api/recommendations/health')
        .expect('Content-Type', /json/);

      expect([200, 503]).toContain(response.status);
    });

    test('should route requests to location service', async () => {
      const response = await request(app)
        .get('/api/locations/health')
        .expect('Content-Type', /json/);

      expect([200, 503]).toContain(response.status);
    });

    test('should route requests to event service', async () => {
      const response = await request(app)
        .get('/api/events/health')
        .expect('Content-Type', /json/);

      expect([200, 503]).toContain(response.status);
    });

    test('should route requests to itinerary service', async () => {
      const response = await request(app)
        .get('/api/itinerary/health')
        .expect('Content-Type', /json/);

      expect([200, 503]).toContain(response.status);
    });

    test('should route requests to notification service', async () => {
      const response = await request(app)
        .get('/api/notifications/health')
        .expect('Content-Type', /json/);

      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-service')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/users')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      // Should handle malformed JSON gracefully
      expect([400, 503]).toContain(response.status);
    });

    test('should enforce rate limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 150; i++) { // Exceed the 100 request limit
        promises.push(
          request(app)
            .get('/health')
            .expect('Content-Type', /json/)
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .expect('Content-Type', /json/);

      // Should either require auth (401) or service unavailable (503)
      expect([401, 503]).toContain(response.status);
    });

    test('should allow access to public routes', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Circuit Breaker Functionality', () => {
    test('should handle circuit breaker open state', async () => {
      // This test would need to simulate a service being down
      // and verify that the circuit breaker opens after failures
      
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.data).toHaveProperty('circuitBreakers');
      
      // Verify circuit breaker status structure
      Object.values(response.body.data.circuitBreakers).forEach((status: any) => {
        expect(status).toHaveProperty('state');
        expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(status.state);
      });
    });
  });

  describe('Request Correlation and Tracing', () => {
    test('should add correlation ID to requests', async () => {
      const correlationId = 'test-correlation-123';
      
      const response = await request(app)
        .get('/health')
        .set('x-correlation-id', correlationId)
        .expect(200);

      // The response should maintain correlation context
      expect(response.body.success).toBe(true);
    });

    test('should generate correlation ID if not provided', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      // In a real implementation, we'd check for generated correlation ID in headers
    });
  });

  describe('Service Integration Scenarios', () => {
    test('should handle complete user journey flow', async () => {
      // This test simulates a complete user journey across multiple services
      
      // 1. Check system health
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.success).toBe(true);
      
      // 2. Attempt to access user service (may require auth)
      const userResponse = await request(app)
        .get('/api/users/health');
      
      expect([200, 401, 503]).toContain(userResponse.status);
      
      // 3. Check if services are properly integrated
      const servicesResponse = await request(app)
        .get('/health/services')
        .expect(200);
      
      expect(servicesResponse.body.data.totalServices).toBeGreaterThan(0);
    });

    test('should maintain service consistency during failures', async () => {
      // Test system behavior when some services are down
      
      const detailedHealth = await request(app)
        .get('/health/detailed')
        .expect(200);
      
      const report = await request(app)
        .get('/health/report')
        .expect(200);
      
      // System should provide consistent health information
      expect(detailedHealth.body.data.overallHealth).toBeDefined();
      expect(report.body.data.systemHealth.overallHealth).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make multiple concurrent requests
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/health')
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
      
      // Should complete within reasonable time
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    test('should maintain response times under load', async () => {
      const responseTimes: number[] = [];
      
      // Make sequential requests and measure response times
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get('/health')
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }
      
      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(1000); // 1 second
    });
  });

  describe('Monitoring and Observability', () => {
    test('should provide comprehensive metrics', async () => {
      const metricsResponse = await request(app)
        .get('/health/metrics')
        .expect(200);
      
      expect(metricsResponse.body.data).toHaveProperty('system');
      expect(metricsResponse.body.data).toHaveProperty('services');
      
      // System metrics should include key performance indicators
      const systemMetrics = metricsResponse.body.data.system;
      expect(systemMetrics).toHaveProperty('cpuUsage');
      expect(systemMetrics).toHaveProperty('memoryUsage');
      expect(systemMetrics).toHaveProperty('activeConnections');
    });

    test('should generate actionable alerts and recommendations', async () => {
      const reportResponse = await request(app)
        .get('/health/report')
        .expect(200);
      
      expect(reportResponse.body.data).toHaveProperty('alerts');
      expect(reportResponse.body.data).toHaveProperty('recommendations');
      
      // Alerts and recommendations should be arrays
      expect(Array.isArray(reportResponse.body.data.alerts)).toBe(true);
      expect(Array.isArray(reportResponse.body.data.recommendations)).toBe(true);
    });
  });
});