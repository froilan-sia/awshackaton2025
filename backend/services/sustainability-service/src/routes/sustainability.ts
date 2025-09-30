import { Router, Request, Response } from 'express';
import { SustainabilityService } from '../services/sustainabilityService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import {
  validateBusinessVisit,
  validateLocalBusiness,
  validateTripSummary,
  validateEcoTransportRequest,
  validateCarbonFootprintCalculation,
  validateUserMetricsQuery,
  validateBusinessQuery
} from '../validation/sustainabilityValidation';

const router = Router();
const sustainabilityService = new SustainabilityService();

// Business Visit Tracking Routes
router.post('/visits', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validateBusinessVisit(req.body);
  const visit = await sustainabilityService.trackBusinessVisit(validatedData);
  
  res.status(201).json({
    success: true,
    data: visit
  });
}));

router.get('/visits/user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;
  
  const queryData = validateUserMetricsQuery({
    userId,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined
  });
  
  const visits = await sustainabilityService.getUserVisits(
    queryData.userId,
    queryData.startDate,
    queryData.endDate
  );
  
  res.json({
    success: true,
    data: visits
  });
}));

router.get('/metrics/user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;
  
  const queryData = validateUserMetricsQuery({
    userId,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined
  });
  
  const metrics = await sustainabilityService.getUserSustainabilityMetrics(
    queryData.userId,
    queryData.startDate,
    queryData.endDate
  );
  
  res.json({
    success: true,
    data: metrics
  });
}));

// Local Business Management Routes
router.post('/businesses', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validateLocalBusiness(req.body);
  const business = await sustainabilityService.addLocalBusiness(validatedData);
  
  res.status(201).json({
    success: true,
    data: business
  });
}));

router.get('/businesses', asyncHandler(async (req: Request, res: Response) => {
  const { district, limit } = req.query;
  const queryData = validateBusinessQuery({ district, limit });
  
  const businesses = await sustainabilityService.getLocalBusinesses(queryData.district);
  
  res.json({
    success: true,
    data: businesses.slice(0, queryData.limit)
  });
}));

router.get('/businesses/:businessId', asyncHandler(async (req: Request, res: Response) => {
  const { businessId } = req.params;
  const businessWithScore = await sustainabilityService.getBusinessWithScore(businessId);
  
  if (!businessWithScore) {
    throw createError('Business not found', 404);
  }
  
  res.json({
    success: true,
    data: businessWithScore
  });
}));

router.get('/businesses/top-sustainable', asyncHandler(async (req: Request, res: Response) => {
  const { district, limit } = req.query;
  const queryData = validateBusinessQuery({ district, limit });
  
  const topBusinesses = await sustainabilityService.getTopSustainableBusinesses(
    queryData.limit,
    queryData.district
  );
  
  res.json({
    success: true,
    data: topBusinesses
  });
}));

// Eco-friendly Transportation Routes
router.post('/transport/recommendations', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validateEcoTransportRequest(req.body);
  const recommendations = await sustainabilityService.getEcoTransportRecommendations(
    validatedData.from,
    validatedData.to,
    validatedData.preferences || {}
  );
  
  res.json({
    success: true,
    data: recommendations
  });
}));

router.post('/transport/carbon-footprint', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validateCarbonFootprintCalculation(req.body);
  const carbonFootprint = await sustainabilityService.calculateTripCarbonFootprint(
    validatedData.transportModes
  );
  
  res.json({
    success: true,
    data: {
      totalCarbonFootprint: carbonFootprint,
      unit: 'kg CO2'
    }
  });
}));

router.get('/transport/:mode/tips', asyncHandler(async (req: Request, res: Response) => {
  const { mode } = req.params;
  const tips = await sustainabilityService.getTransportSustainabilityTips(mode as any);
  
  res.json({
    success: true,
    data: tips
  });
}));

router.get('/transport/:mode/impact', asyncHandler(async (req: Request, res: Response) => {
  const { mode } = req.params;
  const impact = await sustainabilityService.getTransportModeImpact(mode as any);
  
  res.json({
    success: true,
    data: impact
  });
}));

// Trip Impact Summary Routes
router.post('/trips/summary', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = validateTripSummary(req.body);
  const summary = await sustainabilityService.generateTripSummary(
    validatedData.userId,
    validatedData.tripId,
    validatedData.startDate,
    validatedData.endDate
  );
  
  res.status(201).json({
    success: true,
    data: summary
  });
}));

router.get('/trips/:tripId/summary', asyncHandler(async (req: Request, res: Response) => {
  const { tripId } = req.params;
  const summary = await sustainabilityService.getTripSummary(tripId);
  
  if (!summary) {
    throw createError('Trip summary not found', 404);
  }
  
  res.json({
    success: true,
    data: summary
  });
}));

router.get('/trips/user/:userId/summaries', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const summaries = await sustainabilityService.getUserTripSummaries(userId);
  
  res.json({
    success: true,
    data: summaries
  });
}));

router.get('/trips/:tripId/detailed-report', asyncHandler(async (req: Request, res: Response) => {
  const { tripId } = req.params;
  const report = await sustainabilityService.generateDetailedImpactReport(tripId);
  
  if (!report) {
    throw createError('Trip report not found', 404);
  }
  
  res.json({
    success: true,
    data: report
  });
}));

router.get('/trips/:tripId/benchmarks', asyncHandler(async (req: Request, res: Response) => {
  const { tripId } = req.params;
  const benchmarks = await sustainabilityService.compareWithBenchmarks(tripId);
  
  if (!benchmarks) {
    throw createError('Trip benchmarks not found', 404);
  }
  
  res.json({
    success: true,
    data: benchmarks
  });
}));

// Comprehensive Insights Routes
router.get('/insights/user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const insights = await sustainabilityService.getSustainabilityInsights(userId);
  
  res.json({
    success: true,
    data: insights
  });
}));

router.get('/benchmarks', asyncHandler(async (req: Request, res: Response) => {
  const benchmarks = await sustainabilityService.getSustainabilityBenchmarks();
  
  res.json({
    success: true,
    data: benchmarks
  });
}));

// Health check route
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Sustainability service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;