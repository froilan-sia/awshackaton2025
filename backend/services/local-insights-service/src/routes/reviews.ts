import { Router, Request, Response } from 'express';
import { TouristReviewModel } from '../models/TouristReview';
import { ReviewComparisonService } from '../services/reviewComparisonService';
import { validateTouristReview } from '../validation/localInsightsValidation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const reviewModel = new TouristReviewModel();
const comparisonService = new ReviewComparisonService();

// Create tourist review
router.post('/', asyncHandler(async (req, res) => {
  const { error, value } = validateTouristReview(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const review = await reviewModel.create(value);
  
  res.status(201).json({
    success: true,
    data: review
  });
}));

// Get review by ID
router.get('/:reviewId', asyncHandler(async (req, res) => {
  const review = await reviewModel.findById(req.params.reviewId);
  
  if (!review) {
    return res.status(404).json({
      success: false,
      error: 'Review not found'
    });
  }
  
  res.json({
    success: true,
    data: review
  });
}));

// Get reviews by location
router.get('/location/:locationId', asyncHandler(async (req, res) => {
  const reviews = await reviewModel.findByLocationId(req.params.locationId);
  
  res.json({
    success: true,
    data: reviews
  });
}));

// Get reviews by author
router.get('/author/:authorId', asyncHandler(async (req, res) => {
  const reviews = await reviewModel.findByAuthorId(req.params.authorId);
  
  res.json({
    success: true,
    data: reviews
  });
}));

// Get reviews by group type
router.get('/group/:groupType', asyncHandler(async (req, res) => {
  const reviews = await reviewModel.findByGroupType(req.params.groupType);
  
  res.json({
    success: true,
    data: reviews
  });
}));

// Get reviews by nationality
router.get('/nationality/:nationality', asyncHandler(async (req, res) => {
  const reviews = await reviewModel.findByNationality(req.params.nationality);
  
  res.json({
    success: true,
    data: reviews
  });
}));

// Get recent reviews for location
router.get('/location/:locationId/recent', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const reviews = await reviewModel.findRecentReviews(req.params.locationId, days);
  
  res.json({
    success: true,
    data: reviews
  });
}));

// Get average rating for location
router.get('/location/:locationId/rating', asyncHandler(async (req, res) => {
  const averageRating = await reviewModel.getAverageRating(req.params.locationId);
  const distribution = await reviewModel.getRatingDistribution(req.params.locationId);
  
  res.json({
    success: true,
    data: {
      averageRating,
      distribution
    }
  });
}));

// Get most helpful reviews for location
router.get('/location/:locationId/helpful', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const reviews = await reviewModel.getMostHelpful(req.params.locationId, limit);
  
  res.json({
    success: true,
    data: reviews
  });
}));

// Add helpful vote to review
router.post('/:reviewId/helpful', asyncHandler(async (req, res) => {
  const review = await reviewModel.addHelpfulVote(req.params.reviewId);
  
  if (!review) {
    return res.status(404).json({
      success: false,
      error: 'Review not found'
    });
  }
  
  res.json({
    success: true,
    data: review
  });
}));

// Update review
router.put('/:reviewId', asyncHandler(async (req, res) => {
  const { rating, content } = req.body;
  
  const updates: any = {};
  if (rating !== undefined) updates.rating = rating;
  if (content !== undefined) updates.content = content;
  
  const review = await reviewModel.update(req.params.reviewId, updates);
  
  if (!review) {
    return res.status(404).json({
      success: false,
      error: 'Review not found'
    });
  }
  
  res.json({
    success: true,
    data: review
  });
}));

// Delete review
router.delete('/:reviewId', asyncHandler(async (req, res) => {
  const success = await reviewModel.delete(req.params.reviewId);
  
  res.json({
    success,
    message: success ? 'Review deleted successfully' : 'Review not found'
  });
}));

// Get location comparison (local vs tourist perspectives)
router.get('/comparison/:locationId', asyncHandler(async (req, res) => {
  const comparison = await comparisonService.getLocationComparison(req.params.locationId);
  
  res.json({
    success: true,
    data: comparison
  });
}));

// Get multiple location comparisons
router.post('/comparison/multiple', asyncHandler(async (req, res) => {
  const { locationIds } = req.body;
  
  if (!Array.isArray(locationIds)) {
    return res.status(400).json({
      success: false,
      error: 'locationIds must be an array'
    });
  }
  
  const comparisons = await comparisonService.getMultipleLocationComparisons(locationIds);
  
  res.json({
    success: true,
    data: comparisons
  });
}));

// Get tourist trap indicators
router.get('/tourist-trap/:locationId', asyncHandler(async (req, res) => {
  const indicators = await comparisonService.getTouristTrapIndicators(req.params.locationId);
  
  res.json({
    success: true,
    data: indicators
  });
}));

// Get authenticity score
router.get('/authenticity/:locationId', asyncHandler(async (req, res) => {
  const authenticity = await comparisonService.getAuthenticityScore(req.params.locationId);
  
  res.json({
    success: true,
    data: authenticity
  });
}));

export default router;