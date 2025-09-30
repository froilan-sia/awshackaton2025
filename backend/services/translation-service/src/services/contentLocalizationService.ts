import { LocalizedContent, ContentType, SupportedLanguage, TranslationRequest } from '../types/translation';
import { TranslationService } from './translationService';

export class ContentLocalizationService {
  private localizedContent: Map<string, LocalizedContent> = new Map();
  private translationService: TranslationService;

  constructor() {
    this.translationService = new TranslationService();
  }

  public async localizeContent(
    contentId: string,
    originalText: string,
    originalLanguage: string,
    targetLanguages: string[],
    contentType: ContentType
  ): Promise<LocalizedContent> {
    const translations: Record<string, string> = {};
    translations[originalLanguage] = originalText;

    // Translate to each target language
    for (const targetLang of targetLanguages) {
      if (targetLang !== originalLanguage) {
        try {
          const translationRequest: TranslationRequest = {
            text: originalText,
            targetLanguage: targetLang,
            sourceLanguage: originalLanguage,
            context: this.getContextForContentType(contentType)
          };

          const translation = await this.translationService.translateText(translationRequest);
          translations[targetLang] = translation.translatedText;
        } catch (error) {
          console.error(`Failed to translate to ${targetLang}:`, error);
          // Keep original text as fallback
          translations[targetLang] = originalText;
        }
      }
    }

    const localizedContent: LocalizedContent = {
      id: contentId,
      originalLanguage,
      translations,
      lastUpdated: new Date(),
      contentType
    };

    this.localizedContent.set(contentId, localizedContent);
    return localizedContent;
  }

  public async getLocalizedContent(contentId: string, language: string): Promise<string | null> {
    const content = this.localizedContent.get(contentId);
    if (!content) {
      return null;
    }

    // Return translation in requested language, fallback to original, then English
    return content.translations[language] || 
           content.translations[content.originalLanguage] || 
           content.translations[SupportedLanguage.ENGLISH] || 
           null;
  }

  public async updateTranslation(contentId: string, language: string, translatedText: string): Promise<LocalizedContent | null> {
    const content = this.localizedContent.get(contentId);
    if (!content) {
      return null;
    }

    content.translations[language] = translatedText;
    content.lastUpdated = new Date();
    
    this.localizedContent.set(contentId, content);
    return content;
  }

  public async addTranslation(contentId: string, language: string, translatedText: string): Promise<LocalizedContent | null> {
    return await this.updateTranslation(contentId, language, translatedText);
  }

  public async getAvailableLanguages(contentId: string): Promise<string[]> {
    const content = this.localizedContent.get(contentId);
    return content ? Object.keys(content.translations) : [];
  }

  public async getAllLocalizedContent(): Promise<LocalizedContent[]> {
    return Array.from(this.localizedContent.values());
  }

  public async getContentByType(contentType: ContentType): Promise<LocalizedContent[]> {
    return Array.from(this.localizedContent.values())
      .filter(content => content.contentType === contentType);
  }

  public async deleteLocalizedContent(contentId: string): Promise<boolean> {
    return this.localizedContent.delete(contentId);
  }

  public async bulkLocalizeContent(
    contents: Array<{
      id: string;
      text: string;
      originalLanguage: string;
      contentType: ContentType;
    }>,
    targetLanguages: string[]
  ): Promise<LocalizedContent[]> {
    const results: LocalizedContent[] = [];

    for (const content of contents) {
      try {
        const localized = await this.localizeContent(
          content.id,
          content.text,
          content.originalLanguage,
          targetLanguages,
          content.contentType
        );
        results.push(localized);
      } catch (error) {
        console.error(`Failed to localize content ${content.id}:`, error);
      }
    }

    return results;
  }

  public async getTranslationStatus(contentId: string): Promise<{
    contentId: string;
    totalLanguages: number;
    translatedLanguages: number;
    missingLanguages: string[];
    lastUpdated: Date;
  } | null> {
    const content = this.localizedContent.get(contentId);
    if (!content) {
      return null;
    }

    const supportedLanguages = Object.values(SupportedLanguage);
    const translatedLanguages = Object.keys(content.translations);
    const missingLanguages = supportedLanguages.filter(lang => !translatedLanguages.includes(lang));

    return {
      contentId,
      totalLanguages: supportedLanguages.length,
      translatedLanguages: translatedLanguages.length,
      missingLanguages,
      lastUpdated: content.lastUpdated
    };
  }

  private getContextForContentType(contentType: ContentType): string {
    const contextMap: Record<ContentType, string> = {
      [ContentType.ATTRACTION_DESCRIPTION]: 'tourism attraction description',
      [ContentType.EVENT_DESCRIPTION]: 'event or activity description',
      [ContentType.RESTAURANT_MENU]: 'restaurant menu item',
      [ContentType.CULTURAL_TIP]: 'cultural advice or etiquette tip',
      [ContentType.SAFETY_INSTRUCTION]: 'safety instruction or warning',
      [ContentType.NAVIGATION_INSTRUCTION]: 'navigation or direction instruction'
    };

    return contextMap[contentType] || 'general tourism content';
  }

  public async refreshTranslations(contentId: string, targetLanguages?: string[]): Promise<LocalizedContent | null> {
    const content = this.localizedContent.get(contentId);
    if (!content) {
      return null;
    }

    const originalText = content.translations[content.originalLanguage];
    const languagesToRefresh = targetLanguages || Object.keys(content.translations).filter(lang => lang !== content.originalLanguage);

    for (const targetLang of languagesToRefresh) {
      if (targetLang !== content.originalLanguage) {
        try {
          const translationRequest: TranslationRequest = {
            text: originalText,
            targetLanguage: targetLang,
            sourceLanguage: content.originalLanguage,
            context: this.getContextForContentType(content.contentType)
          };

          const translation = await this.translationService.translateText(translationRequest);
          content.translations[targetLang] = translation.translatedText;
        } catch (error) {
          console.error(`Failed to refresh translation for ${targetLang}:`, error);
        }
      }
    }

    content.lastUpdated = new Date();
    this.localizedContent.set(contentId, content);
    return content;
  }
}