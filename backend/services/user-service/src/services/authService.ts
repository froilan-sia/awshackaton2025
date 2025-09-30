import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel, UserDocument } from '../models/User';
import { User } from '../types/user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  language?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  static async register(data: RegisterData): Promise<AuthResponse> {
    const { email, password, language = 'en' } = data;

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      const error = new Error('Email already registered') as any;
      error.statusCode = 409;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new UserModel({
      email,
      password: hashedPassword,
      language,
      preferences: {
        interests: [],
        budgetRange: 'medium',
        groupType: 'solo',
        dietaryRestrictions: [],
        activityLevel: 'moderate',
        weatherPreferences: []
      },
      accessibilityNeeds: {
        mobilityAssistance: false,
        visualAssistance: false,
        hearingAssistance: false,
        cognitiveAssistance: false,
        specificNeeds: []
      },
      travelHistory: []
    });

    await user.save();

    // Generate tokens
    const tokens = this.generateTokens(user);
    
    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      user: user.toJSON() as User,
      tokens
    };
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Find user
    const user = await UserModel.findOne({ email });
    if (!user) {
      const error = new Error('Invalid email or password') as any;
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const error = new Error('Invalid email or password') as any;
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Generate tokens
    const tokens = this.generateTokens(user);
    
    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      user: user.toJSON() as User,
      tokens
    };
  }

  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as { userId: string };
      
      // Find user with matching refresh token
      const user = await UserModel.findOne({ 
        _id: decoded.userId, 
        refreshToken 
      });
      
      if (!user) {
        const error = new Error('Invalid refresh token') as any;
        error.statusCode = 401;
        error.code = 'INVALID_REFRESH_TOKEN';
        throw error;
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);
      
      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      return tokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        const authError = new Error('Invalid refresh token') as any;
        authError.statusCode = 401;
        authError.code = 'INVALID_REFRESH_TOKEN';
        throw authError;
      }
      throw error;
    }
  }

  static async logout(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { 
      $unset: { refreshToken: 1 } 
    });
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      const error = new Error('Current password is incorrect') as any;
      error.statusCode = 401;
      error.code = 'INVALID_CURRENT_PASSWORD';
      throw error;
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and invalidate refresh tokens
    user.password = hashedPassword;
    user.refreshToken = undefined;
    await user.save();
  }

  private static generateTokens(user: UserDocument): AuthTokens {
    const payload = {
      userId: (user._id as any).toString(),
      email: user.email
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY
    });

    const refreshToken = jwt.sign(
      { userId: (user._id as any).toString() }, 
      this.JWT_REFRESH_SECRET, 
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
  }
}