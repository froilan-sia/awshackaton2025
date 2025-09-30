import { UserService } from '../../src/services/userService';
import { AuthService } from '../../src/services/authService';
import { UserModel } from '../../src/models/User';
import { BudgetRange, GroupType, ActivityLevel, WeatherPreference } from '../../src/types/user';

describe('UserService', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    language: 'en'
  };

  let userId: string;

  beforeEach(async () => {
    const result = await AuthService.register(testUser);
    userId = result.user.id;
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const user = await UserService.getUserById(userId);

      expect(user).toBeDefined();
      expect(user?.id).toEqual(userId);
      expect(user?.email).toBe(testUser.email);
    });

    it('should return null for non-existent user', async () => {
      const user = await UserService.getUserById('507f1f77bcf86cd799439011');
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const user = await UserService.getUserByEmail(testUser.email);

      expect(user).toBeDefined();
      expect(user?.id).toEqual(userId);
      expect(user?.email).toBe(testUser.email);
    });

    it('should return null for non-existent email', async () => {
      const user = await UserService.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user language', async () => {
      const updatedUser = await UserService.updateUserProfile(userId, {
        language: 'zh-HK'
      });

      expect(updatedUser.language).toBe('zh-HK');
    });

    it('should update user preferences', async () => {
      const preferences = {
        interests: ['food', 'culture'],
        budgetRange: BudgetRange.HIGH,
        groupType: GroupType.COUPLE
      };

      const updatedUser = await UserService.updateUserProfile(userId, {
        preferences
      });

      expect(updatedUser.preferences.interests).toEqual(['food', 'culture']);
      expect(updatedUser.preferences.budgetRange).toBe(BudgetRange.HIGH);
      expect(updatedUser.preferences.groupType).toBe(GroupType.COUPLE);
    });

    it('should update accessibility needs', async () => {
      const accessibilityNeeds = {
        mobilityAssistance: true,
        visualAssistance: true,
        specificNeeds: ['wheelchair access']
      };

      const updatedUser = await UserService.updateUserProfile(userId, {
        accessibilityNeeds
      });

      expect(updatedUser.accessibilityNeeds.mobilityAssistance).toBe(true);
      expect(updatedUser.accessibilityNeeds.visualAssistance).toBe(true);
      expect(updatedUser.accessibilityNeeds.specificNeeds).toEqual(['wheelchair access']);
    });

    it('should throw error for non-existent user', async () => {
      await expect(UserService.updateUserProfile('507f1f77bcf86cd799439011', {
        language: 'zh-HK'
      })).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND'
      });
    });
  });

  describe('updateUserPreferences', () => {
    it('should update specific preferences', async () => {
      const preferences = {
        interests: ['hiking', 'photography'],
        activityLevel: ActivityLevel.HIGH,
        weatherPreferences: [WeatherPreference.OUTDOOR_PREFERRED]
      };

      const updatedUser = await UserService.updateUserPreferences(userId, preferences);

      expect(updatedUser.preferences.interests).toEqual(['hiking', 'photography']);
      expect(updatedUser.preferences.activityLevel).toBe(ActivityLevel.HIGH);
      expect(updatedUser.preferences.weatherPreferences).toEqual([WeatherPreference.OUTDOOR_PREFERRED]);
    });

    it('should preserve existing preferences when updating partial', async () => {
      // First set some preferences
      await UserService.updateUserPreferences(userId, {
        interests: ['food'],
        budgetRange: BudgetRange.LUXURY
      });

      // Then update only interests
      const updatedUser = await UserService.updateUserPreferences(userId, {
        interests: ['culture', 'history']
      });

      expect(updatedUser.preferences.interests).toEqual(['culture', 'history']);
      expect(updatedUser.preferences.budgetRange).toBe(BudgetRange.LUXURY);
    });
  });

  describe('updateAccessibilityNeeds', () => {
    it('should update accessibility needs', async () => {
      const accessibilityNeeds = {
        hearingAssistance: true,
        cognitiveAssistance: true,
        specificNeeds: ['sign language interpreter', 'large text']
      };

      const updatedUser = await UserService.updateAccessibilityNeeds(userId, accessibilityNeeds);

      expect(updatedUser.accessibilityNeeds.hearingAssistance).toBe(true);
      expect(updatedUser.accessibilityNeeds.cognitiveAssistance).toBe(true);
      expect(updatedUser.accessibilityNeeds.specificNeeds).toEqual(['sign language interpreter', 'large text']);
    });
  });

  describe('addTravelRecord', () => {
    it('should add travel record to user', async () => {
      const travelRecord = {
        destination: 'Hong Kong',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        activities: ['dim sum', 'peak tram'],
        ratings: [{
          activityId: 'activity1',
          rating: 5,
          feedback: 'Amazing experience',
          timestamp: new Date()
        }]
      };

      const updatedUser = await UserService.addTravelRecord(userId, travelRecord);

      expect(updatedUser.travelHistory).toHaveLength(1);
      expect(updatedUser.travelHistory[0].destination).toBe('Hong Kong');
      expect(updatedUser.travelHistory[0].activities).toEqual(['dim sum', 'peak tram']);
      expect(updatedUser.travelHistory[0].id).toBeDefined();
    });
  });

  describe('getTravelHistory', () => {
    it('should return user travel history', async () => {
      const travelRecord = {
        destination: 'Hong Kong',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        activities: ['dim sum'],
        ratings: []
      };

      await UserService.addTravelRecord(userId, travelRecord);
      const travelHistory = await UserService.getTravelHistory(userId);

      expect(travelHistory).toHaveLength(1);
      expect(travelHistory[0].destination).toBe('Hong Kong');
    });

    it('should return empty array for user with no travel history', async () => {
      const travelHistory = await UserService.getTravelHistory(userId);
      expect(travelHistory).toEqual([]);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      await UserService.deleteUser(userId);

      const user = await UserModel.findById(userId);
      expect(user).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(UserService.deleteUser('507f1f77bcf86cd799439011')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND'
      });
    });
  });

  describe('getUsersByInterests', () => {
    beforeEach(async () => {
      // Create additional test users with different interests
      await AuthService.register({
        email: 'user1@example.com',
        password: 'password123'
      });
      
      await AuthService.register({
        email: 'user2@example.com',
        password: 'password123'
      });

      // Update their preferences
      const user1 = await UserModel.findOne({ email: 'user1@example.com' });
      const user2 = await UserModel.findOne({ email: 'user2@example.com' });

      if (user1) {
        await UserService.updateUserPreferences((user1._id as any).toString(), {
          interests: ['food', 'culture']
        });
      }

      if (user2) {
        await UserService.updateUserPreferences((user2._id as any).toString(), {
          interests: ['hiking', 'nature']
        });
      }
    });

    it('should return users with matching interests', async () => {
      const users = await UserService.getUsersByInterests(['food']);

      expect(users).toHaveLength(1);
      expect(users[0].preferences.interests).toContain('food');
    });

    it('should return users with any matching interests', async () => {
      const users = await UserService.getUsersByInterests(['food', 'hiking']);

      expect(users).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      const users = await UserService.getUsersByInterests(['food', 'hiking'], 1);

      expect(users).toHaveLength(1);
    });

    it('should return empty array for no matching interests', async () => {
      const users = await UserService.getUsersByInterests(['nonexistent']);

      expect(users).toEqual([]);
    });
  });

  describe('updateLanguagePreference', () => {
    it('should update user language preference', async () => {
      const updatedUser = await UserService.updateLanguagePreference(userId, 'ja');

      expect(updatedUser.language).toBe('ja');
    });

    it('should throw error for non-existent user', async () => {
      await expect(UserService.updateLanguagePreference('507f1f77bcf86cd799439011', 'ja')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND'
      });
    });
  });
});