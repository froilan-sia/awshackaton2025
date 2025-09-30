import Joi from 'joi';
import { SupportedLanguage, TranslationProvider, EtiquetteCategory, ContentType } from '../types/translation';

export const translationRequestSchema = Joi.object({
  text: Joi.string().required().min(1).max(10000),
  targetLanguage: Joi.string().valid(...Object.values(SupportedLanguage)).required(),
  sourceLanguage: Joi.string().valid(...Object.values(SupportedLanguage)).optional(),
  context: Joi.string().optional().max(500)
});

export const batchTranslationRequestSchema = Joi.object({
  texts: Joi.array().items(Joi.string().min(1).max(10000)).required().min(1).max(100),
  targetLanguage: Joi.string().valid(...Object.values(SupportedLanguage)).required(),
  sourceLanguage: Joi.string().valid(...Object.values(SupportedLanguage)).optional(),
  context: Joi.string().optional().max(500)
});

export const languagePreferenceSchema = Joi.object({
  userId: Joi.string().required(),
  primaryLanguage: Joi.string().valid(...Object.values(SupportedLanguage)).required(),
  secondaryLanguages: Joi.array().items(Joi.string().valid(...Object.values(SupportedLanguage))).optional(),
  preferredTranslationProvider: Joi.string().valid(...Object.values(TranslationProvider)).optional(),
  autoTranslate: Joi.boolean().optional()
});

export const pronunciationGuideSchema = Joi.object({
  text: Joi.string().required().min(1).max(200),
  language: Joi.string().valid(...Object.values(SupportedLanguage)).required(),
  phonetic: Joi.string().required().min(1).max(500),
  audioUrl: Joi.string().uri().optional(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').required(),
  category: Joi.string().optional().max(50),
  usage: Joi.string().optional().max(1000)
});

export const culturalEtiquetteSchema = Joi.object({
  category: Joi.string().valid(...Object.values(EtiquetteCategory)).required(),
  title: Joi.string().required().min(1).max(200),
  content: Joi.string().required().min(1).max(5000),
  language: Joi.string().valid(...Object.values(SupportedLanguage)).required(),
  context: Joi.array().items(Joi.string().max(50)).optional(),
  importance: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  tags: Joi.array().items(Joi.string().max(30)).optional()
});

export const localizedContentSchema = Joi.object({
  id: Joi.string().required(),
  originalLanguage: Joi.string().valid(...Object.values(SupportedLanguage)).required(),
  translations: Joi.object().pattern(
    Joi.string().valid(...Object.values(SupportedLanguage)),
    Joi.string().min(1).max(10000)
  ).required(),
  contentType: Joi.string().valid(...Object.values(ContentType)).required()
});

export const bulkLocalizationSchema = Joi.object({
  contents: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      text: Joi.string().required().min(1).max(10000),
      originalLanguage: Joi.string().valid(...Object.values(SupportedLanguage)).required(),
      contentType: Joi.string().valid(...Object.values(ContentType)).required()
    })
  ).required().min(1).max(50),
  targetLanguages: Joi.array().items(Joi.string().valid(...Object.values(SupportedLanguage))).required().min(1)
});

export const validateTranslationRequest = (data: any) => {
  return translationRequestSchema.validate(data);
};

export const validateBatchTranslationRequest = (data: any) => {
  return batchTranslationRequestSchema.validate(data);
};

export const validateLanguagePreference = (data: any) => {
  return languagePreferenceSchema.validate(data);
};

export const validatePronunciationGuide = (data: any) => {
  return pronunciationGuideSchema.validate(data);
};

export const validateCulturalEtiquette = (data: any) => {
  return culturalEtiquetteSchema.validate(data);
};

export const validateLocalizedContent = (data: any) => {
  return localizedContentSchema.validate(data);
};

export const validateBulkLocalization = (data: any) => {
  return bulkLocalizationSchema.validate(data);
};