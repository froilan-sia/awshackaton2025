import { Router, Request, Response } from 'express';
import { LocationBasedTipService } from '../services/locationBasedTipService';
import { PracticalTipsService } from '../services/practicalTipsService';
import { validateLocationBasedTip, validateContextualTipRequest } from '../validation/practicalTipsValidation';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const practicalTipsService = new PracticalTipsService();
const locationBasedTipService = new LocationBasedTipService(practicalTipsService);

// Get tips for specific location
router.post('/tips', asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, ...contextualRequest } = req.body;

  if (!latitude || !longitude) {
    throw createError('Latitude and longitude are required', 400);
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw createError('Invalid coordinates', 400);
  }

  // Validate the full contextual request
  const { error, value } = validateContextualTipRequest({
    location: { latitude, longitude },
    ...contextualRequest
  });

  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const tips = await locationBasedTipService.getTipsForLocation(
    latitude,
    longitude,
    value
  );

  res.json(tips);
}));

// Create location-based tip
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateLocationBasedTip(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const locationTip = await locationBasedTipService.addLocationBasedTip(value);
  res.status(201).json(locationTip);
}));

// Get all location-based tips
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const locationTips = await locationBasedTipService.getLocationBasedTips();
  res.json({ locationTips });
}));

// Update location-based tip
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = validateLocationBasedTip(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const locationTip = await locationBasedTipService.updateLocationBasedTip(id, value);
  
  if (!locationTip) {
    throw createError('Location-based tip not found', 404);
  }
  
  res.json(locationTip);
}));

// Delete location-based tip
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await locationBasedTipService.deleteLocationBasedTip(id);
  
  if (!deleted) {
    throw createError('Location-based tip not found', 404);
  }
  
  res.status(204).send();
}));

export default router;