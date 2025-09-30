import request from 'supertest';
import app from '../../src/index';

describe('Residents Routes', () => {
  const validResidentData = {
    userId: 'user123',
    verificationProof: ['hkid_photo.jpg', 'utility_bill.pdf'],
    yearsInHongKong: 5,
    districts: ['Central', 'Wan Chai'],
    languages: ['English', 'Cantonese'],
    specialties: ['food', 'culture']
  };

  describe('POST /api/residents/register', () => {
    it('should register a new resident successfully', async () => {
      const response = await request(app)
        .post('/api/residents/register')
        .send(validResidentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(validResidentData.userId);
      expect(response.body.data.verificationStatus).toBe('pending');
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = { ...validResidentData, yearsInHongKong: 0 };

      const response = await request(app)
        .post('/api/residents/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('yearsInHongKong');
    });

    it('should return error for duplicate registration', async () => {
      // Register first time
      await request(app)
        .post('/api/residents/register')
        .send(validResidentData)
        .expect(201);

      // Try to register again
      const response = await request(app)
        .post('/api/residents/register')
        .send(validResidentData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/residents/:residentId', () => {
    let residentId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId: 'unique_user_' + Date.now() });
      residentId = response.body.data.id;
    });

    it('should get resident profile successfully', async () => {
      const response = await request(app)
        .get(`/api/residents/${residentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(residentId);
    });

    it('should return 404 for non-existent resident', async () => {
      const response = await request(app)
        .get('/api/residents/invalid_id')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/residents/user/:userId', () => {
    let userId: string;

    beforeEach(async () => {
      userId = 'unique_user_' + Date.now();
      await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId });
    });

    it('should get resident by user ID successfully', async () => {
      const response = await request(app)
        .get(`/api/residents/user/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(userId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/residents/user/non_existent_user')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/residents/:residentId', () => {
    let residentId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId: 'unique_user_' + Date.now() });
      residentId = response.body.data.id;
    });

    it('should update resident profile successfully', async () => {
      const updates = {
        districts: ['Central', 'Wan Chai', 'Tsim Sha Tsui'],
        specialties: ['food', 'culture', 'nightlife']
      };

      const response = await request(app)
        .put(`/api/residents/${residentId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.districts).toEqual(updates.districts);
      expect(response.body.data.specialties).toEqual(updates.specialties);
    });

    it('should return validation error for invalid updates', async () => {
      const invalidUpdates = { districts: [] };

      const response = await request(app)
        .put(`/api/residents/${residentId}`)
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/residents/:residentId/verify', () => {
    let residentId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId: 'unique_user_' + Date.now() });
      residentId = response.body.data.id;
    });

    it('should verify resident successfully', async () => {
      const response = await request(app)
        .post(`/api/residents/${residentId}/verify`)
        .send({ status: 'verified' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verificationStatus).toBe('verified');
    });

    it('should reject resident successfully', async () => {
      const response = await request(app)
        .post(`/api/residents/${residentId}/verify`)
        .send({ status: 'rejected' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verificationStatus).toBe('rejected');
    });

    it('should return validation error for invalid status', async () => {
      const response = await request(app)
        .post(`/api/residents/${residentId}/verify`)
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/residents', () => {
    beforeEach(async () => {
      // Create and verify some residents
      const resident1Response = await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId: 'user1_' + Date.now(), districts: ['Central'] });

      const resident2Response = await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId: 'user2_' + Date.now(), districts: ['Wan Chai'], specialties: ['nightlife'] });

      await request(app)
        .post(`/api/residents/${resident1Response.body.data.id}/verify`)
        .send({ status: 'verified' });

      await request(app)
        .post(`/api/residents/${resident2Response.body.data.id}/verify`)
        .send({ status: 'verified' });
    });

    it('should get all verified residents', async () => {
      const response = await request(app)
        .get('/api/residents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter residents by district', async () => {
      const response = await request(app)
        .get('/api/residents?district=Central')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].districts).toContain('Central');
    });

    it('should filter residents by specialty', async () => {
      const response = await request(app)
        .get('/api/residents?specialty=nightlife')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].specialties).toContain('nightlife');
    });
  });

  describe('GET /api/residents/admin/pending', () => {
    beforeEach(async () => {
      // Create some pending residents
      await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId: 'pending1_' + Date.now() });

      await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId: 'pending2_' + Date.now() });
    });

    it('should get pending verifications', async () => {
      const response = await request(app)
        .get('/api/residents/admin/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data[0].verificationStatus).toBe('pending');
    });
  });

  describe('GET /api/residents/:residentId/stats', () => {
    let residentId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId: 'stats_user_' + Date.now() });
      residentId = response.body.data.id;
    });

    it('should get resident stats', async () => {
      const response = await request(app)
        .get(`/api/residents/${residentId}/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalInsights');
      expect(response.body.data).toHaveProperty('averageAuthenticityScore');
      expect(response.body.data).toHaveProperty('totalUpvotes');
      expect(response.body.data).toHaveProperty('credibilityScore');
    });
  });

  describe('POST /api/residents/:residentId/credibility', () => {
    let residentId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/residents/register')
        .send({ ...validResidentData, userId: 'credibility_user_' + Date.now() });
      residentId = response.body.data.id;
    });

    it('should adjust credibility score', async () => {
      const response = await request(app)
        .post(`/api/residents/${residentId}/credibility`)
        .send({ adjustment: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.credibilityScore).toBeGreaterThan(0);
    });

    it('should return error for invalid adjustment', async () => {
      const response = await request(app)
        .post(`/api/residents/${residentId}/credibility`)
        .send({ adjustment: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});