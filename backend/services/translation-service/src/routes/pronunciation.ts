import { Router, Request, Response } from 'express';
import { PronunciationService } from '../services/pronunciationService';
import { validatePronunciationGuide } from '../validation/translationValidation';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const pronunciationService = new PronunciationService();

// Get pronunciation guides by language
router.get('/:language', asyncHandler(async (req: Request, res: Response) => {
  const { language } = req.params;
  const { category } = req.query;
  
  const guides = await pronunciationService.getPronunciationGuides(
    language, 
    category as string
  );
  
  res.json({
    success: true,
    data: guides,
    total: guides.length
  });
}));

// Get pronunciation by specific text
router.get('/:language/text/:text', asyncHandler(async (req: Request, res: Response) => {
  const { language, text } = req.params;
  const decodedText = decodeURIComponent(text);
  
  const guide = await pronunciationService.getPronunciationByText(decodedText, language);
  
  if (!guide) {
    throw createError('Pronunciation guide not found', 404);
  }
  
  res.json({
    success: true,
    data: guide
  });
}));

// Get guides by difficulty
router.get('/:language/difficulty/:difficulty', asyncHandler(async (req: Request, res: Response) => {
  const { language, difficulty } = req.params;
  
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    throw createError('Invalid difficulty level', 400);
  }
  
  const guides = await pronunciationService.getGuidesByDifficulty(
    language, 
    difficulty as 'easy' | 'medium' | 'hard'
  );
  
  res.json({
    success: true,
    data: guides,
    total: guides.length
  });
}));

// Get guides by category
router.get('/:language/category/:category', asyncHandler(async (req: Request, res: Response) => {
  const { language, category } = req.params;
  
  const guides = await pronunciationService.getGuidesByCategory(language, category);
  
  res.json({
    success: true,
    data: guides,
    total: guides.length
  });
}));

// Search pronunciation guides
router.get('/:language/search', asyncHandler(async (req: Request, res: Response) => {
  const { language } = req.params;
  const { q } = req.query;
  
  if (!q || typeof q !== 'string') {
    throw createError('Search query is required', 400);
  }
  
  const guides = await pronunciationService.searchGuides(language, q);
  
  res.json({
    success: true,
    data: guides,
    total: guides.length,
    query: q
  });
}));

// Add new pronunciation guide
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validatePronunciationGuide(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const guide = await pronunciationService.addPronunciationGuide(value);
  
  res.status(201).json({
    success: true,
    data: guide
  });
}));

// Get available categories for a language
router.get('/:language/categories', asyncHandler(async (req: Request, res: Response) => {
  const { language } = req.params;
  
  const categories = pronunciationService.getAvailableCategories(language);
  
  res.json({
    success: true,
    data: categories,
    total: categories.length
  });
}));

// Get supported languages
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const languages = pronunciationService.getSupportedLanguages();
  
  res.json({
    success: true,
    data: languages,
    total: languages.length
  });
}));

export default router;