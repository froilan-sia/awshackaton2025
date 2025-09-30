import { TranslationService } from '../../src/services/translationService';
import { TranslationProvider, SupportedLanguage } from '../../src/types/translation';

// Mock axios
jest.mock('axios');
const mockedAxios = require('axios');

describe('TranslationService', () => {
  let translationService: TranslationService;

  beforeEach(() => {
    translationService = new TranslationService();
    jest.clearAllMocks();
  });

  describe('translateText', () => {
    it('should translate text using Google Translate', async () => {
      const mockResponse = {
        data: {
          data: {
            translations: [{
              translatedText: '你好',
              detectedSourceLanguage: 'en'
            }]
          }
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const request = {
        text: 'Hello',
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        sourceLanguage: SupportedLanguage.ENGLISH
      };

      const result = await translationService.translateText(request, TranslationProvider.GOOGLE);

      expect(result).toEqual({
        translatedText: '你好',
        sourceLanguage: 'en',
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        confidence: 0.95
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com'),
        expect.objectContaining({
          q: 'Hello',
          target: 'zh-TW',
          source: 'en'
        })
      );
    });

    it('should translate text using Azure Translator', async () => {
      process.env.AZURE_TRANSLATOR_KEY = 'test-key';
      process.env.AZURE_TRANSLATOR_REGION = 'test-region';

      const mockResponse = {
        data: [{
          translations: [{
            text: '你好',
            confidence: 0.98
          }]
        }]
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const request = {
        text: 'Hello',
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        sourceLanguage: SupportedLanguage.ENGLISH
      };

      const result = await translationService.translateText(request, TranslationProvider.AZURE);

      expect(result).toEqual({
        translatedText: '你好',
        sourceLanguage: SupportedLanguage.ENGLISH,
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        confidence: 0.98
      });
    });

    it('should handle translation errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const request = {
        text: 'Hello',
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE
      };

      await expect(translationService.translateText(request)).rejects.toThrow('Translation failed');
    });

    it('should throw error for unsupported provider', async () => {
      const request = {
        text: 'Hello',
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE
      };

      await expect(
        translationService.translateText(request, 'unsupported' as TranslationProvider)
      ).rejects.toThrow('Unsupported translation provider');
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      const mockResponse = {
        data: {
          data: {
            translations: [{
              translatedText: '你好',
              detectedSourceLanguage: 'en'
            }]
          }
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const request = {
        texts: ['Hello', 'Goodbye'],
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE
      };

      const result = await translationService.translateBatch(request);

      expect(result.translations).toHaveLength(2);
      expect(result.translations[0].translatedText).toBe('你好');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle batch translation errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const request = {
        texts: ['Hello'],
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE
      };

      await expect(translationService.translateBatch(request)).rejects.toThrow('Batch translation failed');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = translationService.getSupportedLanguages();
      
      expect(languages).toContain(SupportedLanguage.ENGLISH);
      expect(languages).toContain(SupportedLanguage.TRADITIONAL_CHINESE);
      expect(languages).toContain(SupportedLanguage.CANTONESE);
      expect(languages.length).toBeGreaterThan(0);
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(translationService.isLanguageSupported(SupportedLanguage.ENGLISH)).toBe(true);
      expect(translationService.isLanguageSupported(SupportedLanguage.CANTONESE)).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(translationService.isLanguageSupported('unsupported')).toBe(false);
    });
  });
});