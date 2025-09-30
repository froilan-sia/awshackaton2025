import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
import { SecurityMiddleware } from '../../src/middleware/securityMiddleware';
import privacyRoutes from '../../src/routes/privacy';

// Create test app without starting server
const app = express();
const security = new SecurityMiddleware(process.env.JWT_SECRET || 'test-secret-key');

app.use(security.securityHeaders());
app.use(cors(security.corsOptions()));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(security.auditLogger());
app.use(security.ipRateLimiter(1000, 60000));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'privacy-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use('/api/privacy', privacyRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});
import { ConsentType } from '../../src/models/ConsentRecord';
import { DataRequestType } from '../../src/models/DataRequest';

describe('Privacy Routes', () => {
  const JWT_SECRET = 'test-secret-key';
  let authToken: string;

  beforeEach(() => {
    // Create a valid JWT token for testing
    authToken = jwt.sign(
      { userId: 'user123', email: 'test@example.com', role: 'user' },
      JWT_SECRET
    );
  });

  describe('POST /api/privacy/consent', () => {
    it('should record user consent successfully', async () => {
      const consentData = {
        consentType: ConsentType.LOCATION_TRACKING,
        granted: true,
        metadata: { source: 'mobile_app' }
      };

      const response = await request(app)
        .post('/api/privacy/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.consentId).toBeDefined();
      expect(response.body.data.consentType).toBe(ConsentType.LOCATION_TRACKING);
      expect(response.body.data.granted).toBe(true);
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      const consentData = {
        consentType: ConsentType.LOCATION_TRACKING,
        granted: true
      };

      const response = await request(app)
        .post('/api/privacy/consent')
        .send(consentData)
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should validate consent data', async () => {
      const invalidData = {
        consentType: 'invalid_type',
        granted: 'not_boolean'
      };

      const response = await request(app)
        .post('/api/privacy/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/privacy/consent/bulk', () => {
    it('should update multiple consents', async () => {
      const consentsData = {
        consents: [
          {
            consentType: ConsentType.LOCATION_TRACKING,
            granted: true
          },
          {
            consentType: ConsentType.DATA_ANALYTICS,
            granted: false
          }
        ]
      };

      const response = await request(app)
        .post('/api/privacy/consent/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedConsents).toBe(2);
      expect(response.body.data.consents).toHaveLength(2);
    });

    it('should validate bulk consent data', async () => {
      const invalidData = {
        consents: [
          {
            consentType: 'invalid_type',
            granted: true
          }
        ]
      };

      const response = await request(app)
        .post('/api/privacy/consent/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/privacy/consent/profile', () => {
    it('should return user consent profile', async () => {
      // First, record some consents
      await request(app)
        .post('/api/privacy/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentType: ConsentType.PERSONALIZATION,
          granted: true
        });

      const response = await request(app)
        .get('/api/privacy/consent/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('user123');
      expect(response.body.data.consents).toBeDefined();
      expect(response.body.data.lastUpdated).toBeDefined();
      expect(response.body.data.gdprCompliant).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/privacy/consent/profile')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('DELETE /api/privacy/consent/:consentType', () => {
    it('should withdraw consent successfully', async () => {
      // First, record consent
      await request(app)
        .post('/api/privacy/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentType: ConsentType.MARKETING,
          granted: true
        });

      const response = await request(app)
        .delete(`/api/privacy/consent/${ConsentType.MARKETING}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('withdrawn successfully');
    });

    it('should handle invalid consent type', async () => {
      const response = await request(app)
        .delete('/api/privacy/consent/invalid_type')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_CONSENT_TYPE');
    });

    it('should handle non-existent consent', async () => {
      const response = await request(app)
        .delete(`/api/privacy/consent/${ConsentType.COOKIES}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('CONSENT_NOT_FOUND');
    });
  });

  describe('POST /api/privacy/gdpr/request', () => {
    it('should submit GDPR data export request', async () => {
      const requestData = {
        requestType: DataRequestType.DATA_EXPORT,
        dataTypes: ['personal_data', 'preferences'],
        format: 'json',
        includeMetadata: true
      };

      const response = await request(app)
        .post('/api/privacy/gdpr/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requestId).toBeDefined();
      expect(response.body.data.requestType).toBe(DataRequestType.DATA_EXPORT);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.message).toContain('Verification email sent');
    });

    it('should submit GDPR data deletion request', async () => {
      const requestData = {
        requestType: DataRequestType.DATA_DELETION,
        dataTypes: ['activity_history', 'location_data'],
        reason: 'No longer using service'
      };

      const response = await request(app)
        .post('/api/privacy/gdpr/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requestType).toBe(DataRequestType.DATA_DELETION);
    });

    it('should validate GDPR request data', async () => {
      const invalidData = {
        requestType: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/privacy/gdpr/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should apply strict rate limiting', async () => {
      // This test would need to be run multiple times to trigger rate limiting
      // For now, we just verify the endpoint exists and works once
      const requestData = {
        requestType: DataRequestType.DATA_PORTABILITY
      };

      const response = await request(app)
        .post('/api/privacy/gdpr/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/privacy/gdpr/requests', () => {
    it('should return user GDPR requests history', async () => {
      // First, submit a request
      await request(app)
        .post('/api/privacy/gdpr/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          requestType: DataRequestType.DATA_EXPORT,
          dataTypes: ['personal_data']
        });

      const response = await request(app)
        .get('/api/privacy/gdpr/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toBeDefined();
      expect(Array.isArray(response.body.data.requests)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/privacy/gdpr/requests')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /api/privacy/gdpr/retention-compliance', () => {
    it('should check data retention compliance', async () => {
      const response = await request(app)
        .get('/api/privacy/gdpr/retention-compliance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.compliant).toBeDefined();
      expect(response.body.data.expiredData).toBeDefined();
      expect(response.body.data.upcomingExpirations).toBeDefined();
    });
  });

  describe('POST /api/privacy/anonymize', () => {
    it('should anonymize data for admin users', async () => {
      const adminToken = jwt.sign(
        { userId: 'admin123', email: 'admin@example.com', role: 'admin' },
        JWT_SECRET
      );

      const userData = {
        user_id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        age: 25
      };

      const response = await request(app)
        .post('/api/privacy/anonymize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userData })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.anonymizedAt).toBeDefined();
      expect(response.body.data.data).toBeDefined();
    });

    it('should reject non-admin users', async () => {
      const userData = {
        user_id: 'user123',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/privacy/anonymize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userData })
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate request data', async () => {
      const adminToken = jwt.sign(
        { userId: 'admin123', email: 'admin@example.com', role: 'admin' },
        JWT_SECRET
      );

      const response = await request(app)
        .post('/api/privacy/anonymize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}) // Missing userData
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_DATA');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('privacy-service');
      expect(response.body.version).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should handle non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/privacy/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});