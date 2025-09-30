import { Router, Request, Response } from 'express';
import { CulturalEtiquetteService } from '../services/culturalEtiquetteService';
import { validateCulturalEtiquette } from '../validation/translationValidation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EtiquetteCategory } from '../types/translation';

const router = Router();
const etiquetteService = new CulturalEtiquetteService();

// Get all etiquette content for a language
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { language = 'en' } = req.query;
  
  const content = await etiquetteService.getAllEtiquette(language as string);
  
  res.json({
    success: true,
    data: content,
    total: content.length
  });
}));

// Get etiquette by category
router.get('/category/:category', asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { language = 'en' } = req.query;
  
  if (!Object.values(EtiquetteCategory).includes(category as EtiquetteCategory)) {
    throw createError('Invalid etiquette category', 400);
  }
  
  const content = await etiquetteService.getEtiquetteByCategory(
    category as EtiquetteCategory, 
    language as string
  );
  
  res.json({
    success: true,
    data: content,
    total: content.length
  });
}));

// Get etiquette by context
router.get('/context/:context', asyncHandler(async (req: Request, res: Response) => {
  const { context } = req.params;
  const { language = 'en' } = req.query;
  
  const content = await etiquetteService.getEtiquetteByContext(
    context, 
    language as string
  );
  
  res.json({
    success: true,
    data: content,
    total: content.length
  });
}));

// Get etiquette by importance level
router.get('/importance/:importance', asyncHandler(async (req: Request, res: Response) => {
  const { importance } = req.params;
  const { language = 'en' } = req.query;
  
  if (!['low', 'medium', 'high', 'critical'].includes(importance)) {
    throw createError('Invalid importance level', 400);
  }
  
  const content = await etiquetteService.getEtiquetteByImportance(
    importance as 'low' | 'medium' | 'high' | 'critical',
    language as string
  );
  
  res.json({
    success: true,
    data: content,
    total: content.length
  });
}));

// Search etiquette content
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { q, language = 'en' } = req.query;
  
  if (!q || typeof q !== 'string') {
    throw createError('Search query is required', 400);
  }
  
  const content = await etiquetteService.searchEtiquette(q, language as string);
  
  res.json({
    success: true,
    data: content,
    total: content.length,
    query: q
  });
}));

// Add new etiquette content
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateCulturalEtiquette(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const content = await etiquetteService.addEtiquetteContent(value);
  
  res.status(201).json({
    success: true,
    data: content
  });
}));

// Translate etiquette content
router.post('/:contentId/translate', asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { targetLanguage, translatedTitle, translatedContent } = req.body;
  
  if (!targetLanguage || !translatedTitle || !translatedContent) {
    throw createError('Target language, translated title, and translated content are required', 400);
  }
  
  const translatedEtiquette = await etiquetteService.translateEtiquetteContent(
    contentId,
    targetLanguage,
    translatedTitle,
    translatedContent
  );
  
  res.status(201).json({
    success: true,
    data: translatedEtiquette
  });
}));

// Get available categories
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const categories = etiquetteService.getAvailableCategories();
  
  res.json({
    success: true,
    data: categories,
    total: categories.length
  });
}));

// Get available contexts for a language
router.get('/contexts', asyncHandler(async (req: Request, res: Response) => {
  const { language = 'en' } = req.query;
  
  const contexts = etiquetteService.getAvailableContexts(language as string);
  
  res.json({
    success: true,
    data: contexts,
    total: contexts.length
  });
}));

// Get supported languages
router.get('/languages', asyncHandler(async (req: Request, res: Response) => {
  const languages = etiquetteService.getSupportedLanguages();
  
  res.json({
    success: true,
    data: languages,
    total: languages.length
  });
}));

export default router;