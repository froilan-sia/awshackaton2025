import { UserModel } from '../models/User';
import { User, UserPreferences, AccessibilityRequirements, TravelRecord } from '../types/user';

export interface UpdateUserProfileData {
  language?: string;
  preferences?: Partial<UserPreferences>;
  accessibilityNeeds?: Partial<AccessibilityRequirements>;
}

export class UserService {
  static async getUserById(userId: string): Promise<User | null> {
    const user = await UserModel.findById(userId);
    return user ? user.toJSON() as User : null;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email });
    return user ? user.toJSON() as User : null;
  }

  static async updateUserProfile(userId: string, updateData: UpdateUserProfileData): Promise<User> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Update language
    if (updateData.language) {
      user.language = updateData.language;
    }

    // Update preferences
    if (updateData.preferences) {
      user.preferences = {
        ...(user.preferences as any).toObject(),
        ...updateData.preferences
      };
    }

    // Update accessibility needs
    if (updateData.accessibilityNeeds) {
      user.accessibilityNeeds = {
        ...(user.accessibilityNeeds as any).toObject(),
        ...updateData.accessibilityNeeds
      };
    }

    await user.save();
    return user.toJSON() as User;
  }

  static async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<User> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    user.preferences = {
      ...(user.preferences as any).toObject(),
      ...preferences
    };

    await user.save();
    return user.toJSON() as User;
  }

  static async updateAccessibilityNeeds(userId: string, accessibilityNeeds: Partial<AccessibilityRequirements>): Promise<User> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    user.accessibilityNeeds = {
      ...(user.accessibilityNeeds as any).toObject(),
      ...accessibilityNeeds
    };

    await user.save();
    return user.toJSON() as User;
  }

  static async addTravelRecord(userId: string, travelRecord: Omit<TravelRecord, 'id'>): Promise<User> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    const newTravelRecord: TravelRecord = {
      ...travelRecord,
      id: new Date().getTime().toString() // Simple ID generation
    };

    user.travelHistory.push(newTravelRecord);
    await user.save();
    return user.toJSON() as User;
  }

  static async getTravelHistory(userId: string): Promise<TravelRecord[]> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return user.travelHistory;
  }

  static async deleteUser(userId: string): Promise<void> {
    const result = await UserModel.findByIdAndDelete(userId);
    if (!result) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
  }

  static async getUsersByInterests(interests: string[], limit: number = 10): Promise<User[]> {
    const users = await UserModel.find({
      'preferences.interests': { $in: interests }
    })
    .limit(limit)
    .select('-password -refreshToken');

    return users.map(user => user.toJSON() as User);
  }

  static async updateLanguagePreference(userId: string, language: string): Promise<User> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    user.language = language;
    await user.save();
    return user.toJSON() as User;
  }
}