export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  context?: string;
}

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence?: number;
}

export interface BatchTranslationRequest {
  texts: string[];
  targetLanguage: string;
  sourceLanguage?: string;
  context?: string;
}

export interface BatchTranslationResponse {
  translations: TranslationResponse[];
}

export interface LanguagePreference {
  userId: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
  preferredTranslationProvider: TranslationProvider;
  autoTranslate: boolean;
}

export interface PronunciationGuide {
  text: string;
  language: string;
  phonetic: string;
  audioUrl?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  usage?: string;
}

export interface CulturalEtiquetteContent {
  id: string;
  category: EtiquetteCategory;
  title: string;
  content: string;
  language: string;
  context: string[];
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface LocalizedContent {
  id: string;
  originalLanguage: string;
  translations: Record<string, string>;
  lastUpdated: Date;
  contentType: ContentType;
}

export enum SupportedLanguage {
  ENGLISH = 'en',
  TRADITIONAL_CHINESE = 'zh-TW',
  SIMPLIFIED_CHINESE = 'zh-CN',
  CANTONESE = 'yue',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  RUSSIAN = 'ru',
  ARABIC = 'ar',
  HINDI = 'hi',
  THAI = 'th',
  VIETNAMESE = 'vi'
}

export enum TranslationProvider {
  GOOGLE = 'google',
  AZURE = 'azure',
  DEEPL = 'deepl'
}

export enum EtiquetteCategory {
  DINING = 'dining',
  TRANSPORTATION = 'transportation',
  RELIGIOUS_SITES = 'religious_sites',
  SHOPPING = 'shopping',
  SOCIAL_INTERACTION = 'social_interaction',
  BUSINESS = 'business',
  CULTURAL_EVENTS = 'cultural_events'
}

export enum ContentType {
  ATTRACTION_DESCRIPTION = 'attraction_description',
  EVENT_DESCRIPTION = 'event_description',
  RESTAURANT_MENU = 'restaurant_menu',
  CULTURAL_TIP = 'cultural_tip',
  SAFETY_INSTRUCTION = 'safety_instruction',
  NAVIGATION_INSTRUCTION = 'navigation_instruction'
}