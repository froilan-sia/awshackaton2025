import express from 'express';
import { UserService } from '../services/userService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { 
  updateProfileSchema, 
  updatePreferencesSchema, 
  updateAccessibilitySchema,
  addTravelRecordSchema,
  languageSchema
} from '../validation/userValidation';

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const user = await UserService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    return res.json({
      user
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
    }

    const user = await UserService.updateUserProfile(req.user.id, value);
    
    return res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const { error, value } = updatePreferencesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
    }

    const user = await UserService.updateUserPreferences(req.user.id, value);
    
    return res.json({
      message: 'Preferences updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Update accessibility needs
router.put('/accessibility', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const { error, value } = updateAccessibilitySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
    }

    const user = await UserService.updateAccessibilityNeeds(req.user.id, value);
    
    return res.json({
      message: 'Accessibility needs updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Update language preference
router.put('/language', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const { error, value } = languageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
    }

    const user = await UserService.updateLanguagePreference(req.user.id, value.language);
    
    return res.json({
      message: 'Language preference updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Add travel record
router.post('/travel-history', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const { error, value } = addTravelRecordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        }
      });
    }

    const user = await UserService.addTravelRecord(req.user.id, value);
    
    return res.status(201).json({
      message: 'Travel record added successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Get travel history
router.get('/travel-history', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const travelHistory = await UserService.getTravelHistory(req.user.id);
    
    return res.json({
      travelHistory
    });
  } catch (error) {
    next(error);
  }
});

// Delete user account
router.delete('/profile', authenticateToken, async (req: AuthRequest, res, next): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    await UserService.deleteUser(req.user.id);
    
    return res.json({
      message: 'User account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get users by interests (for recommendation system)
router.get('/by-interests', async (req, res, next): Promise<any> => {
  try {
    const interests = req.query.interests as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!interests) {
      return res.status(400).json({
        error: {
          code: 'MISSING_INTERESTS',
          message: 'Interests parameter is required'
        }
      });
    }

    const interestsArray = interests.split(',').map(i => i.trim());
    const users = await UserService.getUsersByInterests(interestsArray, limit);
    
    return res.json({
      users
    });
  } catch (error) {
    next(error);
  }
});

export default router;