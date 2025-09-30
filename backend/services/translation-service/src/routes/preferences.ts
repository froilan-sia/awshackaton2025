import { Router, Request, Response } from 'express';
import { LanguagePreferenceService } from '../services/languagePreferenceService';
import { validateLanguagePreference } from '../validation/translationValidation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TranslationProvider } from '../types/translation';

const router = Router();
const preferenceService = new LanguagePreferenceService();

// Create or update language preference
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateLanguagePreference(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const preference = await preferenceService.createOrUpdatePreference(value);
  
  res.json({
    success: true,
    data: preference
  });
}));

// Get user's language preference
router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const preference = await preferenceService.getPreference(userId);
  
  if (!preference) {
    throw createError('Language preference not found', 404);
  }
  
  res.json({
    success: true,
    data: preference
  });
}));

// Update primary language
router.patch('/:userId/language', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { language } = req.body;
  
  if (!language) {
    throw createError('Language is required', 400);
  }
  
  const preference = await preferenceService.updateLanguage(userId, language);
  
  res.json({
    success: true,
    data: preference
  });
}));

// Add secondary language
router.post('/:userId/secondary-languages', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { language } = req.body;
  
  if (!language) {
    throw createError('Language is required', 400);
  }
  
  const preference = await preferenceService.addSecondaryLanguage(userId, language);
  
  res.json({
    success: true,
    data: preference
  });
}));

// Remove secondary language
router.delete('/:userId/secondary-languages/:language', asyncHandler(async (req: Request, res: Response) => {
  const { userId, language } = req.params;
  
  const preference = await preferenceService.removeSecondaryLanguage(userId, language);
  
  res.json({
    success: true,
    data: preference
  });
}));

// Set translation provider
router.patch('/:userId/provider', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { provider } = req.body;
  
  if (!provider || !Object.values(TranslationProvider).includes(provider)) {
    throw createError('Valid translation provider is required', 400);
  }
  
  const preference = await preferenceService.setTranslationProvider(userId, provider);
  
  res.json({
    success: true,
    data: preference
  });
}));

// Set auto-translate preference
router.patch('/:userId/auto-translate', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { autoTranslate } = req.body;
  
  if (typeof autoTranslate !== 'boolean') {
    throw createError('autoTranslate must be a boolean', 400);
  }
  
  const preference = await preferenceService.setAutoTranslate(userId, autoTranslate);
  
  res.json({
    success: true,
    data: preference
  });
}));

// Get all preferences (admin endpoint)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const preferences = await preferenceService.getAllPreferences();
  
  res.json({
    success: true,
    data: preferences,
    total: preferences.length
  });
}));

// Delete user preference
router.delete('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const deleted = await preferenceService.deletePreference(userId);
  
  if (!deleted) {
    throw createError('Language preference not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Language preference deleted successfully'
  });
}));

export default router;