import request from 'supertest';
import app from '../../src/index';
import { BudgetRange, GroupType, ActivityLevel } from '../../src/types/user';

describe('User Routes', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    language: 'en'
  };

  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    accessToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        language: 'zh-HK',
        preferences: {
          interests: ['food', 'culture'],
          budgetRange: BudgetRange.HIGH
        },
        accessibilityNeeds: {
          mobilityAssistance: true,
          specificNeeds: ['wheelchair access']
        }
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.language).toBe('zh-HK');
      expect(response.body.user.preferences.interests).toEqual(['food', 'culture']);
      expect(response.body.user.preferences.budgetRange).toBe(BudgetRange.HIGH);
      expect(response.body.user.accessibilityNeeds.mobilityAssistance).toBe(true);
    });

    it('should validate language', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ language: 'invalid-language' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ language: 'zh-HK' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/preferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        interests: ['hiking', 'photography'],
        budgetRange: BudgetRange.LUXURY,
        groupType: GroupType.FAMILY,
        activityLevel: ActivityLevel.HIGH
      };

      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(preferences);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Preferences updated successfully');
      expect(response.body.user.preferences.interests).toEqual(['hiking', 'photography']);
      expect(response.body.user.preferences.budgetRange).toBe(BudgetRange.LUXURY);
      expect(response.body.user.preferences.groupType).toBe(GroupType.FAMILY);
    });

    it('should validate budget range', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ budgetRange: 'invalid-budget' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/users/accessibility', () => {
    it('should update accessibility needs', async () => {
      const accessibilityNeeds = {
        visualAssistance: true,
        hearingAssistance: true,
        specificNeeds: ['large text', 'audio descriptions']
      };

      const response = await request(app)
        .put('/api/users/accessibility')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(accessibilityNeeds);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Accessibility needs updated successfully');
      expect(response.body.user.accessibilityNeeds.visualAssistance).toBe(true);
      expect(response.body.user.accessibilityNeeds.hearingAssistance).toBe(true);
      expect(response.body.user.accessibilityNeeds.specificNeeds).toEqual(['large text', 'audio descriptions']);
    });
  });

  describe('PUT /api/users/language', () => {
    it('should update language preference', async () => {
      const response = await request(app)
        .put('/api/users/language')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ language: 'ja' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Language preference updated successfully');
      expect(response.body.user.language).toBe('ja');
    });

    it('should validate language', async () => {
      const response = await request(app)
        .put('/api/users/language')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ language: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/users/travel-history', () => {
    it('should add travel record', async () => {
      const travelRecord = {
        destination: 'Hong Kong',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        activities: ['dim sum', 'peak tram'],
        ratings: [{
          activityId: 'activity1',
          rating: 5,
          feedback: 'Amazing experience'
        }]
      };

      const response = await request(app)
        .post('/api/users/travel-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(travelRecord);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Travel record added successfully');
      expect(response.body.user.travelHistory).toHaveLength(1);
      expect(response.body.user.travelHistory[0].destination).toBe('Hong Kong');
    });

    it('should validate date range', async () => {
      const travelRecord = {
        destination: 'Hong Kong',
        startDate: '2024-01-07',
        endDate: '2024-01-01'
      };

      const response = await request(app)
        .post('/api/users/travel-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(travelRecord);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/users/travel-history', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/users/travel-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destination: 'Hong Kong',
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          activities: ['dim sum']
        });
    });

    it('should get travel history', async () => {
      const response = await request(app)
        .get('/api/users/travel-history')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.travelHistory).toHaveLength(1);
      expect(response.body.travelHistory[0].destination).toBe('Hong Kong');
    });
  });

  describe('DELETE /api/users/profile', () => {
    it('should delete user account', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User account deleted successfully');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/users/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/by-interests', () => {
    beforeEach(async () => {
      // Create additional users with different interests
      const user1Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'password123'
        });

      await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${user1Response.body.tokens.accessToken}`)
        .send({ interests: ['food', 'culture'] });

      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'password123'
        });

      await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${user2Response.body.tokens.accessToken}`)
        .send({ interests: ['hiking', 'nature'] });
    });

    it('should get users by interests', async () => {
      const response = await request(app)
        .get('/api/users/by-interests')
        .query({ interests: 'food,culture' });

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].preferences.interests).toContain('food');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/users/by-interests')
        .query({ interests: 'food,hiking', limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
    });

    it('should require interests parameter', async () => {
      const response = await request(app)
        .get('/api/users/by-interests');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_INTERESTS');
    });
  });
});