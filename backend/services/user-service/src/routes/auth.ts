import express from 'express';
import { AuthService } from '../services/authService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema, 
  changePasswordSchema 
} from '../validation/userValidation';

const router = express.Router();

// Register new user
router.post('/register', async (req, res, next): Promise<any> => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
    }

    const result = await AuthService.register(value);
    
    return res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      tokens: result.tokens
    });
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', async (req, res, next): Promise<any> => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
    }

    const result = await AuthService.login(value);
    
    return res.json({
      message: 'Login successful',
      user: result.user,
      tokens: result.tokens
    });
  } catch (error) {
    next(error);
  }
});

// Refresh access token
router.post('/refresh', async (req, res, next): Promise<any> => {
  try {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
    }

    const tokens = await AuthService.refreshToken(value.refreshToken);
    
    return res.json({
      message: 'Token refreshed successfully',
      tokens
    });
  } catch (error) {
    next(error);
  }
});

// Logout user
router.post('/logout', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    await AuthService.logout(req.user.id);
    
    return res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
    }

    await AuthService.changePassword(
      req.user.id,
      value.currentPassword,
      value.newPassword
    );
    
    return res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Verify token (for other services)
router.get('/verify', authenticateToken, async (req: AuthRequest, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

export default router;