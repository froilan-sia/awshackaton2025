import { Router, Request, Response } from 'express';
import { CrowdService } from '../services/crowdService';
import { validateCrowdRequest, validateRouteOptimization } from '../validation/crowdValidation';

const router = Router();
const crowdService = new CrowdService();

/**
 * GET /api/crowd/:locationId
 * Get crowd data for a specific location
 */
router.get('/:locationId', async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    const crowdInfo = await crowdService.getLocationCrowdInfo(locationId);
    
    if (crowdInfo.error) {
      return res.status(404).json(crowdInfo);
    }

    res.json(crowdInfo);
  } catch (error) {
    console.error('Error getting crowd data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/crowd/bulk
 * Get crowd data for multiple locations
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { error } = validateCrowdRequest(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { locationIds } = req.body;
    const crowdInfo = await crowdService.getBulkCrowdInfo(locationIds);
    
    res.json(crowdInfo);
  } catch (error) {
    console.error('Error getting bulk crowd data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/crowd/optimize-route
 * Optimize route to avoid crowded areas
 */
router.post('/optimize-route', async (req: Request, res: Response) => {
  try {
    const { error } = validateRouteOptimization(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { userId, route } = req.body;
    const optimization = await crowdService.optimizeUserRoute(userId, route);
    
    res.json(optimization);
  } catch (error) {
    console.error('Error optimizing route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/crowd/subscribe
 * Subscribe to crowd alerts for specific locations
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { userId, locationIds } = req.body;
    
    if (!userId || !Array.isArray(locationIds)) {
      return res.status(400).json({ error: 'User ID and location IDs array are required' });
    }

    const result = await crowdService.subscribeToLocationAlerts(userId, locationIds);
    res.json(result);
  } catch (error) {
    console.error('Error subscribing to alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/crowd/recommended-times
 * Get recommended departure times for locations
 */
router.post('/recommended-times', async (req: Request, res: Response) => {
  try {
    const { locationIds } = req.body;
    
    if (!Array.isArray(locationIds)) {
      return res.status(400).json({ error: 'Location IDs array is required' });
    }

    const recommendations = await crowdService.getRecommendedTimes(locationIds);
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommended times:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/crowd/high-crowd-locations
 * Get locations with high crowd levels
 */
router.get('/high-crowd-locations', async (req: Request, res: Response) => {
  try {
    const highCrowdLocations = await crowdService.getHighCrowdLocations();
    res.json(highCrowdLocations);
  } catch (error) {
    console.error('Error getting high crowd locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/crowd/stats
 * Get service statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = crowdService.getServiceStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting service stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;