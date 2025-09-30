import { AuthService } from '../../src/services/authService';
import { UserModel } from '../../src/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('AuthService', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    language: 'en'
  };

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await AuthService.register(testUser);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.language).toBe(testUser.language);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      // Verify user was saved to database
      const savedUser = await UserModel.findOne({ email: testUser.email });
      expect(savedUser).toBeDefined();
      expect(savedUser?.email).toBe(testUser.email);
    });

    it('should hash the password', async () => {
      await AuthService.register(testUser);

      const savedUser = await UserModel.findOne({ email: testUser.email });
      expect(savedUser?.password).not.toBe(testUser.password);
      
      const isValidPassword = await bcrypt.compare(testUser.password, savedUser!.password);
      expect(isValidPassword).toBe(true);
    });

    it('should throw error if email already exists', async () => {
      await AuthService.register(testUser);

      await expect(AuthService.register(testUser)).rejects.toMatchObject({
        message: 'Email already registered',
        statusCode: 409,
        code: 'EMAIL_EXISTS'
      });
    });

    it('should set default preferences and accessibility needs', async () => {
      const result = await AuthService.register(testUser);

      expect(result.user.preferences).toBeDefined();
      expect(result.user.preferences.budgetRange).toBe('medium');
      expect(result.user.preferences.groupType).toBe('solo');
      expect(result.user.preferences.activityLevel).toBe('moderate');
      expect(result.user.accessibilityNeeds).toBeDefined();
      expect(result.user.accessibilityNeeds.mobilityAssistance).toBe(false);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await AuthService.register(testUser);
    });

    it('should login user with correct credentials', async () => {
      const result = await AuthService.login({
        email: testUser.email,
        password: testUser.password
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw error with invalid email', async () => {
      await expect(AuthService.login({
        email: 'nonexistent@example.com',
        password: testUser.password
      })).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
        code: 'INVALID_CREDENTIALS'
      });
    });

    it('should throw error with invalid password', async () => {
      await expect(AuthService.login({
        email: testUser.email,
        password: 'wrongpassword'
      })).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
        code: 'INVALID_CREDENTIALS'
      });
    });

    it('should save refresh token to user', async () => {
      const result = await AuthService.login({
        email: testUser.email,
        password: testUser.password
      });

      const savedUser = await UserModel.findOne({ email: testUser.email });
      expect(savedUser?.refreshToken).toBe(result.tokens.refreshToken);
    });
  });

  describe('refreshToken', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const result = await AuthService.register(testUser);
      refreshToken = result.tokens.refreshToken;
      userId = result.user.id;
    });

    it('should generate new tokens with valid refresh token', async () => {
      const result = await AuthService.refreshToken(refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.accessToken).not.toBe(refreshToken);
    });

    it('should update refresh token in database', async () => {
      const result = await AuthService.refreshToken(refreshToken);

      const savedUser = await UserModel.findById(userId);
      expect(savedUser?.refreshToken).toBe(result.refreshToken);
    });

    it('should throw error with invalid refresh token', async () => {
      await expect(AuthService.refreshToken('invalid-token')).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN'
      });
    });

    it('should throw error if user not found', async () => {
      await UserModel.findByIdAndDelete(userId);

      await expect(AuthService.refreshToken(refreshToken)).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN'
      });
    });
  });

  describe('logout', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await AuthService.register(testUser);
      userId = result.user.id;
    });

    it('should remove refresh token from user', async () => {
      await AuthService.logout(userId);

      const savedUser = await UserModel.findById(userId);
      expect(savedUser?.refreshToken).toBeUndefined();
    });
  });

  describe('changePassword', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await AuthService.register(testUser);
      userId = result.user.id;
    });

    it('should change password successfully', async () => {
      const newPassword = 'newpassword123';
      
      await AuthService.changePassword(userId, testUser.password, newPassword);

      const savedUser = await UserModel.findById(userId);
      const isValidPassword = await bcrypt.compare(newPassword, savedUser!.password);
      expect(isValidPassword).toBe(true);
    });

    it('should invalidate refresh token after password change', async () => {
      const newPassword = 'newpassword123';
      
      await AuthService.changePassword(userId, testUser.password, newPassword);

      const savedUser = await UserModel.findById(userId);
      expect(savedUser?.refreshToken).toBeUndefined();
    });

    it('should throw error with incorrect current password', async () => {
      await expect(AuthService.changePassword(
        userId, 
        'wrongpassword', 
        'newpassword123'
      )).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CURRENT_PASSWORD'
      });
    });

    it('should throw error if user not found', async () => {
      await UserModel.findByIdAndDelete(userId);

      await expect(AuthService.changePassword(
        userId, 
        testUser.password, 
        'newpassword123'
      )).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND'
      });
    });
  });

  describe('token generation', () => {
    it('should generate valid JWT tokens', async () => {
      const result = await AuthService.register(testUser);

      // Verify access token
      const accessTokenPayload = jwt.verify(
        result.tokens.accessToken, 
        process.env.JWT_SECRET!
      ) as any;
      expect(accessTokenPayload.userId).toEqual(expect.any(String));
      expect(accessTokenPayload.email).toBe(result.user.email);

      // Verify refresh token
      const refreshTokenPayload = jwt.verify(
        result.tokens.refreshToken, 
        process.env.JWT_REFRESH_SECRET!
      ) as any;
      expect(refreshTokenPayload.userId).toEqual(expect.any(String));
    });
  });
});