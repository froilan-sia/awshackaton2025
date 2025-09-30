import express, { Request } from 'express';
import { LocationService } from '../services/locationService';
import { GeofenceService } from '../services/geofenceService';
import { ContentDeliveryService } from '../services/contentDeliveryService';
import { validateLocationUpdate, validateLocationPreferences } from '../validation/locationValidation';
import { authMiddleware } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

const router = express.Router();
const locationService = new LocationService();
const geofenceService = new GeofenceService();
const contentDeliveryService = new ContentDeliveryService();

/**
 * Update user location
 */
router.post('/update', authMiddleware, validateLocationUpdate, async (req: AuthenticatedRequest, res) => {
  try {
    const { location, source } = req.body;
    const userId = req.user!.id;

    const locationUpdate = {
      userId,
      location: {
        ...location,
        timestamp: new Date()
      },
      privacyLevel: req.body.privacyLevel,
      source
    };

    // Update location
    const updatedLocation = await locationService.updateLocation(locationUpdate);

    // Check for geofence events
    const previousLocation = await locationService.getCurrentLocation(userId);
    const geofenceEvents = await geofenceService.checkGeofenceEvents(
      userId,
      locationUpdate.location,
      previousLocation || undefined
    );

    // Get triggered content if there are geofence events
    let triggeredContent: any[] = [];
    if (geofenceEvents.length > 0) {
      const userPreferences = req.body.preferences || [];
      const language = req.body.language || 'en';
      
      triggeredContent = await contentDeliveryService.getTriggeredContent(
        userId,
        geofenceEvents,
        language,
        userPreferences
      );
    }

    res.json({
      success: true,
      data: {
        location: updatedLocation,
        geofenceEvents,
        triggeredContent
      }
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update location'
    });
  }
});

/**
 * Get current location
 */
router.get('/current', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const location = await locationService.getCurrentLocation(userId);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'No location data found'
      });
    }

    res.json({
      success: true,
      data: { location }
    });
  } catch (error) {
    console.error('Get current location error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get current location'
    });
  }
});

/**
 * Get location history
 */
router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, limit } = req.query;

    const history = await locationService.getLocationHistory(
      userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: { history }
    });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get location history'
    });
  }
});

/**
 * Get contextual content for current location
 */
router.get('/content', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { language = 'en', radius = 500 } = req.query;

    const currentLocation = await locationService.getCurrentLocation(userId);
    if (!currentLocation) {
      return res.status(404).json({
        success: false,
        error: 'No location data found'
      });
    }

    // Get user preferences (this would typically come from user service)
    const userPreferences = req.query.preferences ? 
      (req.query.preferences as string).split(',') : undefined;

    const contextualContent = await contentDeliveryService.getContextualContent(
      currentLocation,
      language as string,
      userPreferences,
      parseInt(radius as string)
    );

    res.json({
      success: true,
      data: { 
        location: currentLocation,
        content: contextualContent 
      }
    });
  } catch (error) {
    console.error('Get contextual content error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get contextual content'
    });
  }
});

/**
 * Get location preferences
 */
router.get('/preferences', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const preferences = await locationService.getUserLocationPreferences(userId);

    res.json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    console.error('Get location preferences error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get location preferences'
    });
  }
});

/**
 * Update location preferences
 */
router.put('/preferences', authMiddleware, validateLocationPreferences, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const updates = req.body;

    const preferences = await locationService.updateLocationPreferences(userId, updates);

    res.json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    console.error('Update location preferences error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update location preferences'
    });
  }
});

/**
 * Get geofence events for user
 */
router.get('/geofence-events', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, limit } = req.query;

    const events = await geofenceService.getUserGeofenceEvents(
      userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    console.error('Get geofence events error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get geofence events'
    });
  }
});

/**
 * Delete user location data (GDPR compliance)
 */
router.delete('/data', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    await locationService.deleteUserLocationData(userId);

    res.json({
      success: true,
      message: 'Location data deleted successfully'
    });
  } catch (error) {
    console.error('Delete location data error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete location data'
    });
  }
});

export default router;