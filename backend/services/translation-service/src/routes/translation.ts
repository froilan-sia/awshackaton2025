import { Router, Request, Response } from 'express';
import { TranslationService } from '../services/translationService';
import { validateTranslationRequest, validateBatchTranslationRequest } from '../validation/translationValidation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TranslationProvider } from '../types/translation';

const router = Router();
const translationService = new TranslationService();

// Translate single text
router.post('/translate', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateTranslationRequest(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const provider = req.query.provider as TranslationProvider || TranslationProvider.GOOGLE;
  const result = await translationService.translateText(value, provider);

  res.json({
    success: true,
    data: result
  });
}));

// Translate multiple texts
router.post('/translate/batch', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateBatchTranslationRequest(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const provider = req.query.provider as TranslationProvider || TranslationProvider.GOOGLE;
  const result = await translationService.translateBatch(value, provider);

  res.json({
    success: true,
    data: result
  });
}));

// Get supported languages
router.get('/languages', asyncHandler(async (req: Request, res: Response) => {
  const languages = translationService.getSupportedLanguages();
  
  res.json({
    success: true,
    data: {
      languages,
      total: languages.length
    }
  });
}));

// Check if language is supported
router.get('/languages/:language/supported', asyncHandler(async (req: Request, res: Response) => {
  const { language } = req.params;
  const isSupported = translationService.isLanguageSupported(language);
  
  res.json({
    success: true,
    data: {
      language,
      supported: isSupported
    }
  });
}));

export default router;