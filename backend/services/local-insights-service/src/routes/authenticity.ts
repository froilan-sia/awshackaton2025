import { Router, Request, Response } from 'express';
import { AuthenticityService } from '../services/authenticityService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const authenticityService = new AuthenticityService();

// Get authenticity metrics for a location
router.get('/metrics/:locationId', asyncHandler(async (req, res) => {
  const metrics = await authenticityService.calculateAuthenticityMetrics(req.params.locationId);
  
  res.json({
    success: true,
    data: metrics
  });
}));

// Update authenticity score for a location
router.post('/metrics/:locationId/update', asyncHandler(async (req, res) => {
  const metrics = await authenticityService.updateAuthenticityScore(req.params.locationId);
  
  res.json({
    success: true,
    data: metrics
  });
}));

// Get authenticity ranking for multiple locations
router.post('/ranking', asyncHandler(async (req, res) => {
  const { locationIds } = req.body;
  
  if (!Array.isArray(locationIds)) {
    return res.status(400).json({
      success: false,
      error: 'locationIds must be an array'
    });
  }
  
  const ranking = await authenticityService.getAuthenticityRanking(locationIds);
  
  res.json({
    success: true,
    data: ranking
  });
}));

// Get tourist trap locations
router.get('/tourist-traps', asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold as string) || 70;
  const touristTraps = await authenticityService.getTouristTrapLocations(threshold);
  
  res.json({
    success: true,
    data: touristTraps
  });
}));

// Get high authenticity locations
router.get('/authentic-locations', asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold as string) || 80;
  const authenticLocations = await authenticityService.getHighAuthenticityLocations(threshold);
  
  res.json({
    success: true,
    data: authenticLocations
  });
}));

// Validate insight authenticity
router.get('/validate-insight/:insightId', asyncHandler(async (req, res) => {
  const validation = await authenticityService.validateInsightAuthenticity(req.params.insightId);
  
  res.json({
    success: true,
    data: validation
  });
}));

// Get authenticity summary for dashboard
router.get('/summary', asyncHandler(async (req, res) => {
  // This would typically aggregate data across all locations
  // For now, returning a basic structure
  const summary = {
    totalLocationsAnalyzed: 0,
    averageAuthenticityScore: 0,
    touristTrapCount: 0,
    highAuthenticityCount: 0,
    lastUpdated: new Date()
  };
  
  res.json({
    success: true,
    data: summary
  });
}));

// Clear authenticity cache (admin only)
router.post('/cache/clear', asyncHandler(async (req, res) => {
  await authenticityService.clearCache();
  
  res.json({
    success: true,
    message: 'Authenticity cache cleared successfully'
  });
}));

export default router;