import { Router, Request, Response } from 'express';
import { LocalResidentService } from '../services/localResidentService';
import { 
  validateResidentRegistration, 
  validateResidentUpdate, 
  validateVerificationStatus 
} from '../validation/localInsightsValidation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const residentService = new LocalResidentService();

// Register as local resident
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateResidentRegistration(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const resident = await residentService.registerResident(value);
  
  res.status(201).json({
    success: true,
    data: resident
  });
}));

// Get resident profile
router.get('/:residentId', asyncHandler(async (req, res) => {
  const resident = await residentService.getResidentProfile(req.params.residentId);
  
  res.json({
    success: true,
    data: resident
  });
}));

// Get resident by user ID
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const resident = await residentService.getResidentByUserId(req.params.userId);
  
  if (!resident) {
    return res.status(404).json({
      success: false,
      error: 'Resident not found'
    });
  }
  
  res.json({
    success: true,
    data: resident
  });
}));

// Update resident profile
router.put('/:residentId', asyncHandler(async (req, res) => {
  const { error, value } = validateResidentUpdate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const resident = await residentService.updateResidentProfile(req.params.residentId, value);
  
  res.json({
    success: true,
    data: resident
  });
}));

// Verify resident (admin only)
router.post('/:residentId/verify', asyncHandler(async (req, res) => {
  const { error, value } = validateVerificationStatus(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const resident = await residentService.verifyResident(req.params.residentId, value.status);
  
  res.json({
    success: true,
    data: resident
  });
}));

// Get verified residents
router.get('/', asyncHandler(async (req, res) => {
  const { district, specialty } = req.query;
  
  let residents;
  if (district) {
    residents = await residentService.getResidentsByDistrict(district as string);
  } else if (specialty) {
    residents = await residentService.getResidentsBySpecialty(specialty as string);
  } else {
    residents = await residentService.getVerifiedResidents();
  }
  
  res.json({
    success: true,
    data: residents
  });
}));

// Get pending verifications (admin only)
router.get('/admin/pending', asyncHandler(async (req, res) => {
  const residents = await residentService.getPendingVerifications();
  
  res.json({
    success: true,
    data: residents
  });
}));

// Get resident stats
router.get('/:residentId/stats', asyncHandler(async (req, res) => {
  const stats = await residentService.getResidentStats(req.params.residentId);
  
  res.json({
    success: true,
    data: stats
  });
}));

// Adjust credibility score (admin only)
router.post('/:residentId/credibility', asyncHandler(async (req, res) => {
  const { adjustment } = req.body;
  
  if (typeof adjustment !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Adjustment must be a number'
    });
  }

  const resident = await residentService.adjustCredibilityScore(req.params.residentId, adjustment);
  
  res.json({
    success: true,
    data: resident
  });
}));

export default router;