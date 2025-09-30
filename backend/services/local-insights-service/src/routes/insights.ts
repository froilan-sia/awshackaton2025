import { Router, Request, Response } from 'express';
import { LocalInsightsService } from '../services/localInsightsService';
import { 
  validateInsightCreation, 
  validateInsightUpdate, 
  validateInsightFilter,
  validateReport,
  validateModerationAction
} from '../validation/localInsightsValidation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const insightsService = new LocalInsightsService();

// Create new insight
router.post('/', asyncHandler(async (req, res) => {
  const { error, value } = validateInsightCreation(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const insight = await insightsService.createInsight(value);
  
  res.status(201).json({
    success: true,
    data: insight
  });
}));

// Get insight by ID
router.get('/:insightId', asyncHandler(async (req, res) => {
  const insight = await insightsService.getInsightById(req.params.insightId);
  
  res.json({
    success: true,
    data: insight
  });
}));

// Get insights with filters
router.get('/', asyncHandler(async (req, res) => {
  const { error, value } = validateInsightFilter(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const insights = await insightsService.getInsightsWithFilters(value);
  
  res.json({
    success: true,
    data: insights
  });
}));

// Get insights by location
router.get('/location/:locationId', asyncHandler(async (req, res) => {
  const insights = await insightsService.getInsightsByLocation(req.params.locationId);
  
  res.json({
    success: true,
    data: insights
  });
}));

// Get top rated insights
router.get('/top/rated', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const insights = await insightsService.getTopRatedInsights(limit);
  
  res.json({
    success: true,
    data: insights
  });
}));

// Get high authenticity insights
router.get('/top/authentic', asyncHandler(async (req, res) => {
  const minScore = parseInt(req.query.minScore as string) || 80;
  const insights = await insightsService.getHighAuthenticityInsights(minScore);
  
  res.json({
    success: true,
    data: insights
  });
}));

// Get tourist trap warnings
router.get('/warnings/tourist-traps', asyncHandler(async (req, res) => {
  const insights = await insightsService.getTouristTrapWarnings();
  
  res.json({
    success: true,
    data: insights
  });
}));

// Update insight
router.put('/:insightId', asyncHandler(async (req, res) => {
  const { error, value } = validateInsightUpdate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  const insight = await insightsService.updateInsight(req.params.insightId, userId, value);
  
  res.json({
    success: true,
    data: insight
  });
}));

// Delete insight
router.delete('/:insightId', asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  const success = await insightsService.deleteInsight(req.params.insightId, userId);
  
  res.json({
    success,
    message: success ? 'Insight deleted successfully' : 'Failed to delete insight'
  });
}));

// Upvote insight
router.post('/:insightId/upvote', asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  const insight = await insightsService.upvoteInsight(req.params.insightId, userId);
  
  res.json({
    success: true,
    data: insight
  });
}));

// Downvote insight
router.post('/:insightId/downvote', asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  const insight = await insightsService.downvoteInsight(req.params.insightId, userId);
  
  res.json({
    success: true,
    data: insight
  });
}));

// Report insight
router.post('/:insightId/report', asyncHandler(async (req, res) => {
  const { error, value } = validateReport(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  const insight = await insightsService.reportInsight(req.params.insightId, userId, value.reason);
  
  res.json({
    success: true,
    data: insight
  });
}));

// Get insights by author
router.get('/author/:authorId', asyncHandler(async (req, res) => {
  const insights = await insightsService.getInsightsByAuthor(req.params.authorId);
  
  res.json({
    success: true,
    data: insights
  });
}));

// Get flagged insights (admin only)
router.get('/admin/flagged', asyncHandler(async (req, res) => {
  const insights = await insightsService.getFlaggedInsights();
  
  res.json({
    success: true,
    data: insights
  });
}));

// Moderate insight (admin only)
router.post('/:insightId/moderate', asyncHandler(async (req, res) => {
  const { error, value } = validateModerationAction(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const insight = await insightsService.moderateInsight(req.params.insightId, value.action);
  
  res.json({
    success: true,
    data: insight
  });
}));

export default router;