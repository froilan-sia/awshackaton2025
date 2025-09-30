import express, { Request } from 'express';
import { GeofenceService } from '../services/geofenceService';
import { ContentDeliveryService } from '../services/contentDeliveryService';
import { validateGeofence, validateLocationContent } from '../validation/locationValidation';
import { authMiddleware } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

const router = express.Router();
const geofenceService = new GeofenceService();
const contentDeliveryService = new ContentDeliveryService();

/**
 * Get geofences near location
 */
router.get('/nearby', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const location = {
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      timestamp: new Date()
    };

    const geofences = await geofenceService.getGeofencesNearLocation(
      location,
      parseInt(radius as string)
    );

    res.json({
      success: true,
      data: { geofences }
    });
  } catch (error) {
    console.error('Get nearby geofences error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get nearby geofences'
    });
  }
});

/**
 * Get all active geofences
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const geofences = await geofenceService.getActiveGeofences();

    res.json({
      success: true,
      data: { geofences }
    });
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get geofences'
    });
  }
});

/**
 * Get geofence by ID
 */
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const geofence = await geofenceService.getGeofenceById(id);

    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: 'Geofence not found'
      });
    }

    res.json({
      success: true,
      data: { geofence }
    });
  } catch (error) {
    console.error('Get geofence error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get geofence'
    });
  }
});

/**
 * Create geofence (admin only)
 */
router.post('/', authMiddleware, validateGeofence, async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Add admin role check
    const geofenceData = req.body;
    const geofence = await geofenceService.createGeofence(geofenceData);

    res.status(201).json({
      success: true,
      data: { geofence }
    });
  } catch (error) {
    console.error('Create geofence error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create geofence'
    });
  }
});

/**
 * Update geofence (admin only)
 */
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Add admin role check
    const { id } = req.params;
    const updates = req.body;

    const geofence = await geofenceService.updateGeofence(id, updates);

    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: 'Geofence not found'
      });
    }

    res.json({
      success: true,
      data: { geofence }
    });
  } catch (error) {
    console.error('Update geofence error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update geofence'
    });
  }
});

/**
 * Delete geofence (admin only)
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Add admin role check
    const { id } = req.params;
    const deleted = await geofenceService.deleteGeofence(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Geofence not found'
      });
    }

    res.json({
      success: true,
      message: 'Geofence deleted successfully'
    });
  } catch (error) {
    console.error('Delete geofence error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete geofence'
    });
  }
});

/**
 * Get content for geofence
 */
router.get('/:id/content', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { language = 'en', category } = req.query;

    const content = await contentDeliveryService.getContentForGeofence(
      id,
      language as string,
      category as any
    );

    res.json({
      success: true,
      data: { content }
    });
  } catch (error) {
    console.error('Get geofence content error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get geofence content'
    });
  }
});

/**
 * Create content for geofence (admin only)
 */
router.post('/:id/content', authMiddleware, validateLocationContent, async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Add admin role check
    const { id } = req.params;
    const contentData = {
      ...req.body,
      geofenceId: id
    };

    const content = await contentDeliveryService.createLocationContent(contentData);

    res.status(201).json({
      success: true,
      data: { content }
    });
  } catch (error) {
    console.error('Create geofence content error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create geofence content'
    });
  }
});

export default router;