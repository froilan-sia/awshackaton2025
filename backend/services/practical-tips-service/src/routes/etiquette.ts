import { Router, Request, Response } from 'express';
import { CulturalEtiquetteService } from '../services/culturalEtiquetteService';
import { validateCulturalEtiquette } from '../validation/practicalTipsValidation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { VenueType } from '../types/practicalTips';

const router = Router();
const culturalEtiquetteService = new CulturalEtiquetteService();

// Get etiquette guidelines for specific venue type
router.get('/venue/:venueType', asyncHandler(async (req: Request, res: Response) => {
  const { venueType } = req.params;
  const { language = 'en' } = req.query;

  if (!Object.values(VenueType).includes(venueType as VenueType)) {
    throw createError('Invalid venue type', 400);
  }

  const etiquetteGuides = await culturalEtiquetteService.getEtiquetteForVenue(
    venueType as VenueType,
    language as string
  );

  res.json({ etiquetteGuides });
}));

// Get general etiquette guidelines
router.get('/general', asyncHandler(async (req: Request, res: Response) => {
  const { language = 'en' } = req.query;

  const guidelines = await culturalEtiquetteService.getGeneralEtiquetteGuidelines(
    language as string
  );

  res.json(guidelines);
}));

// Create etiquette guide
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateCulturalEtiquette(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const guide = await culturalEtiquetteService.createEtiquetteGuide(value);
  res.status(201).json(guide);
}));

// Get all etiquette guides
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { language = 'en' } = req.query;
  const guides = await culturalEtiquetteService.getAllEtiquetteGuides(language as string);
  res.json({ guides });
}));

// Get etiquette guide by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const guide = await culturalEtiquetteService.getEtiquetteById(id);
  
  if (!guide) {
    throw createError('Etiquette guide not found', 404);
  }
  
  res.json(guide);
}));

// Update etiquette guide
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = validateCulturalEtiquette(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const guide = await culturalEtiquetteService.updateEtiquetteGuide(id, value);
  
  if (!guide) {
    throw createError('Etiquette guide not found', 404);
  }
  
  res.json(guide);
}));

// Delete etiquette guide
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await culturalEtiquetteService.deleteEtiquetteGuide(id);
  
  if (!deleted) {
    throw createError('Etiquette guide not found', 404);
  }
  
  res.status(204).send();
}));

export default router;