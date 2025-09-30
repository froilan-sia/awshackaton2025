import { ContentLocalizationService } from '../../src/services/contentLocalizationService';
import { TranslationService } from '../../src/services/translationService';
import { ContentType, SupportedLanguage } from '../../src/types/translation';

// Mock the TranslationService
jest.mock('../../src/services/translationService');
const MockedTranslationService = TranslationService as jest.MockedClass<typeof TranslationService>;

describe('ContentLocalizationService', () => {
  let service: ContentLocalizationService;
  let mockTranslationService: jest.Mocked<TranslationService>;

  beforeEach(() => {
    mockTranslationService = new MockedTranslationService() as jest.Mocked<TranslationService>;
    service = new ContentLocalizationService();
    // Replace the internal translation service with our mock
    (service as any).translationService = mockTranslationService;
  });

  describe('localizeContent', () => {
    it('should localize content to multiple languages', async () => {
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: '你好世界',
        sourceLanguage: SupportedLanguage.ENGLISH,
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        confidence: 0.95
      });

      const result = await service.localizeContent(
        'content1',
        'Hello World',
        SupportedLanguage.ENGLISH,
        [SupportedLanguage.TRADITIONAL_CHINESE, SupportedLanguage.JAPANESE],
        ContentType.ATTRACTION_DESCRIPTION
      );

      expect(result.id).toBe('content1');
      expect(result.originalLanguage).toBe(SupportedLanguage.ENGLISH);
      expect(result.translations[SupportedLanguage.ENGLISH]).toBe('Hello World');
      expect(result.translations[SupportedLanguage.TRADITIONAL_CHINESE]).toBe('你好世界');
      expect(result.contentType).toBe(ContentType.ATTRACTION_DESCRIPTION);
      expect(mockTranslationService.translateText).toHaveBeenCalledTimes(2);
    });

    it('should handle translation failures gracefully', async () => {
      mockTranslationService.translateText
        .mockResolvedValueOnce({
          translatedText: '你好世界',
          sourceLanguage: SupportedLanguage.ENGLISH,
          targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
          confidence: 0.95
        })
        .mockRejectedValueOnce(new Error('Translation failed'));

      const result = await service.localizeContent(
        'content1',
        'Hello World',
        SupportedLanguage.ENGLISH,
        [SupportedLanguage.TRADITIONAL_CHINESE, SupportedLanguage.JAPANESE],
        ContentType.ATTRACTION_DESCRIPTION
      );

      expect(result.translations[SupportedLanguage.TRADITIONAL_CHINESE]).toBe('你好世界');
      expect(result.translations[SupportedLanguage.JAPANESE]).toBe('Hello World'); // Fallback to original
    });
  });

  describe('getLocalizedContent', () => {
    it('should return content in requested language', async () => {
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: '你好世界',
        sourceLanguage: SupportedLanguage.ENGLISH,
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        confidence: 0.95
      });

      await service.localizeContent(
        'content1',
        'Hello World',
        SupportedLanguage.ENGLISH,
        [SupportedLanguage.TRADITIONAL_CHINESE],
        ContentType.ATTRACTION_DESCRIPTION
      );

      const content = await service.getLocalizedContent('content1', SupportedLanguage.TRADITIONAL_CHINESE);
      expect(content).toBe('你好世界');
    });

    it('should return null for non-existent content', async () => {
      const content = await service.getLocalizedContent('nonexistent', SupportedLanguage.ENGLISH);
      expect(content).toBeNull();
    });

    it('should fallback to original language if requested language not available', async () => {
      await service.localizeContent(
        'content1',
        'Hello World',
        SupportedLanguage.ENGLISH,
        [],
        ContentType.ATTRACTION_DESCRIPTION
      );

      const content = await service.getLocalizedContent('content1', SupportedLanguage.JAPANESE);
      expect(content).toBe('Hello World'); // Fallback to original
    });
  });

  describe('updateTranslation', () => {
    it('should update existing translation', async () => {
      await service.localizeContent(
        'content1',
        'Hello World',
        SupportedLanguage.ENGLISH,
        [],
        ContentType.ATTRACTION_DESCRIPTION
      );

      const result = await service.updateTranslation('content1', SupportedLanguage.JAPANESE, 'こんにちは世界');

      expect(result).toBeTruthy();
      expect(result?.translations[SupportedLanguage.JAPANESE]).toBe('こんにちは世界');
    });

    it('should return null for non-existent content', async () => {
      const result = await service.updateTranslation('nonexistent', SupportedLanguage.JAPANESE, 'test');
      expect(result).toBeNull();
    });
  });

  describe('getAvailableLanguages', () => {
    it('should return available languages for content', async () => {
      await service.localizeContent(
        'content1',
        'Hello World',
        SupportedLanguage.ENGLISH,
        [SupportedLanguage.TRADITIONAL_CHINESE],
        ContentType.ATTRACTION_DESCRIPTION
      );

      const languages = await service.getAvailableLanguages('content1');
      expect(languages).toContain(SupportedLanguage.ENGLISH);
      expect(languages.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent content', async () => {
      const languages = await service.getAvailableLanguages('nonexistent');
      expect(languages).toEqual([]);
    });
  });

  describe('bulkLocalizeContent', () => {
    it('should localize multiple contents', async () => {
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: '翻譯文本',
        sourceLanguage: SupportedLanguage.ENGLISH,
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        confidence: 0.95
      });

      const contents = [
        {
          id: 'content1',
          text: 'Hello',
          originalLanguage: SupportedLanguage.ENGLISH,
          contentType: ContentType.ATTRACTION_DESCRIPTION
        },
        {
          id: 'content2',
          text: 'World',
          originalLanguage: SupportedLanguage.ENGLISH,
          contentType: ContentType.EVENT_DESCRIPTION
        }
      ];

      const results = await service.bulkLocalizeContent(contents, [SupportedLanguage.TRADITIONAL_CHINESE]);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('content1');
      expect(results[1].id).toBe('content2');
    });

    it('should handle individual failures in bulk operation', async () => {
      mockTranslationService.translateText.mockRejectedValue(new Error('Translation failed'));

      const contents = [
        {
          id: 'content1',
          text: 'Hello',
          originalLanguage: SupportedLanguage.ENGLISH,
          contentType: ContentType.ATTRACTION_DESCRIPTION
        }
      ];

      const results = await service.bulkLocalizeContent(contents, [SupportedLanguage.TRADITIONAL_CHINESE]);

      expect(results).toHaveLength(0); // Failed content is not included
    });
  });

  describe('getTranslationStatus', () => {
    it('should return translation status', async () => {
      await service.localizeContent(
        'content1',
        'Hello World',
        SupportedLanguage.ENGLISH,
        [SupportedLanguage.TRADITIONAL_CHINESE],
        ContentType.ATTRACTION_DESCRIPTION
      );

      const status = await service.getTranslationStatus('content1');

      expect(status).toBeTruthy();
      expect(status?.contentId).toBe('content1');
      expect(status?.translatedLanguages).toBeGreaterThan(0);
      expect(status?.totalLanguages).toBeGreaterThan(0);
      expect(Array.isArray(status?.missingLanguages)).toBe(true);
    });

    it('should return null for non-existent content', async () => {
      const status = await service.getTranslationStatus('nonexistent');
      expect(status).toBeNull();
    });
  });

  describe('refreshTranslations', () => {
    it('should refresh translations', async () => {
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: '更新的翻譯',
        sourceLanguage: SupportedLanguage.ENGLISH,
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        confidence: 0.95
      });

      await service.localizeContent(
        'content1',
        'Hello World',
        SupportedLanguage.ENGLISH,
        [SupportedLanguage.TRADITIONAL_CHINESE],
        ContentType.ATTRACTION_DESCRIPTION
      );

      const result = await service.refreshTranslations('content1');

      expect(result).toBeTruthy();
      expect(mockTranslationService.translateText).toHaveBeenCalled();
    });

    it('should return null for non-existent content', async () => {
      const result = await service.refreshTranslations('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('deleteLocalizedContent', () => {
    it('should delete localized content', async () => {
      await service.localizeContent(
        'content1',
        'Hello World',
        SupportedLanguage.ENGLISH,
        [],
        ContentType.ATTRACTION_DESCRIPTION
      );

      const deleted = await service.deleteLocalizedContent('content1');
      expect(deleted).toBe(true);

      const content = await service.getLocalizedContent('content1', SupportedLanguage.ENGLISH);
      expect(content).toBeNull();
    });

    it('should return false for non-existent content', async () => {
      const deleted = await service.deleteLocalizedContent('nonexistent');
      expect(deleted).toBe(false);
    });
  });
});