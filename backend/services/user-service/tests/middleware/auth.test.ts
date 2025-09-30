import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/index';
import { AuthService } from '../../src/services/authService';
import { UserModel } from '../../src/models/User';

describe('Auth Middleware', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123'
  };

  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    const result = await AuthService.register(testUser);
    accessToken = result.tokens.accessToken;
    userId = result.user.id;
  });

  describe('authenticateToken', () => {
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId, email: testUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject request if user no longer exists', async () => {
      await UserModel.findByIdAndDelete(userId);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('token verification endpoint', () => {
    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.id).toEqual(expect.any(String));
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});