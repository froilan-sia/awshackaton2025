import { Router, Request, Response } from 'express';
import { ContentLocalizationService } from '../services/contentLocalizationService';
import { validateLocalizedContent, validateBulkLocalization } from '../validation/translationValidation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { ContentType } from '../types/translation';

const router = Router();
const localizationService = new ContentLocalizationService();

// Localize content to multiple languages
router.post('/localize', asyncHandler(async (req: Request, res: Response) => {
  const { contentId, originalText, originalLanguage, targetLanguages, contentType } = req.body;
  
  if (!contentId || !originalText || !originalLanguage || !targetLanguages || !contentType) {
    throw createError('Content ID, original text, original language, target languages, and content type are required', 400);
  }
  
  if (!Array.isArray(targetLanguages)) {
    throw createError('Target languages must be an array', 400);
  }
  
  if (!Object.values(ContentType).includes(contentType)) {
    throw createError('Invalid content type', 400);
  }
  
  const localizedContent = await localizationService.localizeContent(
    contentId,
    originalText,
    originalLanguage,
    targetLanguages,
    contentType
  );
  
  res.status(201).json({
    success: true,
    data: localizedContent
  });
}));

// Get localized content
router.get('/:contentId', asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { language } = req.query;
  
  if (!language) {
    throw createError('Language parameter is required', 400);
  }
  
  const content = await localizationService.getLocalizedContent(contentId, language as string);
  
  if (!content) {
    throw createError('Localized content not found', 404);
  }
  
  res.json({
    success: true,
    data: {
      contentId,
      language,
      content
    }
  });
}));

// Update translation for specific language
router.patch('/:contentId/translations/:language', asyncHandler(async (req: Request, res: Response) => {
  const { contentId, language } = req.params;
  const { translatedText } = req.body;
  
  if (!translatedText) {
    throw createError('Translated text is required', 400);
  }
  
  const updatedContent = await localizationService.updateTranslation(
    contentId,
    language,
    translatedText
  );
  
  if (!updatedContent) {
    throw createError('Content not found', 404);
  }
  
  res.json({
    success: true,
    data: updatedContent
  });
}));

// Add new translation
router.post('/:contentId/translations/:language', asyncHandler(async (req: Request, res: Response) => {
  const { contentId, language } = req.params;
  const { translatedText } = req.body;
  
  if (!translatedText) {
    throw createError('Translated text is required', 400);
  }
  
  const updatedContent = await localizationService.addTranslation(
    contentId,
    language,
    translatedText
  );
  
  if (!updatedContent) {
    throw createError('Content not found', 404);
  }
  
  res.json({
    success: true,
    data: updatedContent
  });
}));

// Get available languages for content
router.get('/:contentId/languages', asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  
  const languages = await localizationService.getAvailableLanguages(contentId);
  
  res.json({
    success: true,
    data: languages,
    total: languages.length
  });
}));

// Get all localized content
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const content = await localizationService.getAllLocalizedContent();
  
  res.json({
    success: true,
    data: content,
    total: content.length
  });
}));

// Get content by type
router.get('/type/:contentType', asyncHandler(async (req: Request, res: Response) => {
  const { contentType } = req.params;
  
  if (!Object.values(ContentType).includes(contentType as ContentType)) {
    throw createError('Invalid content type', 400);
  }
  
  const content = await localizationService.getContentByType(contentType as ContentType);
  
  res.json({
    success: true,
    data: content,
    total: content.length
  });
}));

// Bulk localize content
router.post('/bulk-localize', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateBulkLocalization(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }
  
  const { contents, targetLanguages } = value;
  
  const results = await localizationService.bulkLocalizeContent(contents, targetLanguages);
  
  res.status(201).json({
    success: true,
    data: results,
    total: results.length
  });
}));

// Get translation status
router.get('/:contentId/status', asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  
  const status = await localizationService.getTranslationStatus(contentId);
  
  if (!status) {
    throw createError('Content not found', 404);
  }
  
  res.json({
    success: true,
    data: status
  });
}));

// Refresh translations
router.post('/:contentId/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { targetLanguages } = req.body;
  
  const refreshedContent = await localizationService.refreshTranslations(
    contentId,
    targetLanguages
  );
  
  if (!refreshedContent) {
    throw createError('Content not found', 404);
  }
  
  res.json({
    success: true,
    data: refreshedContent
  });
}));

// Delete localized content
router.delete('/:contentId', asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  
  const deleted = await localizationService.deleteLocalizedContent(contentId);
  
  if (!deleted) {
    throw createError('Content not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Localized content deleted successfully'
  });
}));

export default router;