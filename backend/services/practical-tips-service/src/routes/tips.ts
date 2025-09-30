import { Router, Request, Response } from 'express';
import { PracticalTipsService } from '../services/practicalTipsService';
import { 
  validateCreateTip, 
  validateUpdateTip, 
  validateContextualTipRequest 
} from '../validation/practicalTipsValidation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TipCategory } from '../types/practicalTips';

const router = Router();
const practicalTipsService = new PracticalTipsService();

// Get contextual tips based on location, weather, and user context
router.post('/contextual', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateContextualTipRequest(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const tips = await practicalTipsService.getContextualTips(value);
  res.json(tips);
}));

// Get tips by category
router.get('/category/:category', asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { language = 'en' } = req.query;

  if (!Object.values(TipCategory).includes(category as TipCategory)) {
    throw createError('Invalid category', 400);
  }

  const tips = await practicalTipsService.getTipsByCategory(
    category as TipCategory, 
    language as string
  );
  res.json({ tips });
}));

// Create a new tip
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateCreateTip(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const tip = await practicalTipsService.createTip(value);
  res.status(201).json(tip);
}));

// Get tip by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tip = await practicalTipsService.getTipById(id);
  
  if (!tip) {
    throw createError('Tip not found', 404);
  }
  
  res.json(tip);
}));

// Update tip
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = validateUpdateTip(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const tip = await practicalTipsService.updateTip(id, value);
  
  if (!tip) {
    throw createError('Tip not found', 404);
  }
  
  res.json(tip);
}));

// Delete tip
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await practicalTipsService.deleteTip(id);
  
  if (!deleted) {
    throw createError('Tip not found', 404);
  }
  
  res.status(204).send();
}));

export default router;