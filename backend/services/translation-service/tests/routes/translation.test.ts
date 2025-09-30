import request from 'supertest';
import express from 'express';
import translationRoutes from '../../src/routes/translation';
import { TranslationService } from '../../src/services/translationService';
import { SupportedLanguage, TranslationProvider } from '../../src/types/translation';

// Mock the TranslationService
jest.mock('../../src/services/translationService');
const MockedTranslationService = TranslationService as jest.MockedClass<typeof TranslationService>;

const app = express();
app.use(express.json());
app.use('/api/translation', translationRoutes);

describe('Translation Routes', () => {
  let mockTranslationService: jest.Mocked<TranslationService>;

  beforeEach(() => {
    mockTranslationService = new MockedTranslationService() as jest.Mocked<TranslationService>;
    // Mock the constructor to return our mocked instance
    (TranslationService as jest.MockedClass<typeof TranslationService>).mockImplementation(() => mockTranslationService);
  });

  describe('POST /api/translation/translate', () => {
    it('should translate text successfully', async () => {
      const mockResponse = {
        translatedText: '你好',
        sourceLanguage: SupportedLanguage.ENGLISH,
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        confidence: 0.95
      };

      mockTranslationService.translateText.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Hello',
          targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
          sourceLanguage: SupportedLanguage.ENGLISH
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(mockTranslationService.translateText).toHaveBeenCalledWith(
        {
          text: 'Hello',
          targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
          sourceLanguage: SupportedLanguage.ENGLISH
        },
        TranslationProvider.GOOGLE
      );
    });

    it('should use specified translation provider', async () => {
      const mockResponse = {
        translatedText: '你好',
        sourceLanguage: SupportedLanguage.ENGLISH,
        targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        confidence: 0.95
      };

      mockTranslationService.translateText.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/translation/translate?provider=azure')
        .send({
          text: 'Hello',
          targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE
        });

      expect(response.status).toBe(200);
      expect(mockTranslationService.translateText).toHaveBeenCalledWith(
        expect.any(Object),
        TranslationProvider.AZURE
      );
    });

    it('should return 400 for invalid request data', async () => {
      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: '', // Invalid: empty text
          targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should handle translation service errors', async () => {
      mockTranslationService.translateText.mockRejectedValue(new Error('Translation failed'));

      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Hello',
          targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/translation/translate/batch', () => {
    it('should translate multiple texts successfully', async () => {
      const mockResponse = {
        translations: [
          {
            translatedText: '你好',
            sourceLanguage: SupportedLanguage.ENGLISH,
            targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
            confidence: 0.95
          },
          {
            translatedText: '再見',
            sourceLanguage: SupportedLanguage.ENGLISH,
            targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
            confidence: 0.93
          }
        ]
      };

      mockTranslationService.translateBatch.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/translation/translate/batch')
        .send({
          texts: ['Hello', 'Goodbye'],
          targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
    });

    it('should return 400 for invalid batch request', async () => {
      const response = await request(app)
        .post('/api/translation/translate/batch')
        .send({
          texts: [], // Invalid: empty array
          targetLanguage: SupportedLanguage.TRADITIONAL_CHINESE
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/translation/languages', () => {
    it('should return supported languages', async () => {
      const mockLanguages = [
        SupportedLanguage.ENGLISH,
        SupportedLanguage.TRADITIONAL_CHINESE,
        SupportedLanguage.CANTONESE
      ];

      mockTranslationService.getSupportedLanguages.mockReturnValue(mockLanguages);

      const response = await request(app)
        .get('/api/translation/languages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.languages).toEqual(mockLanguages);
      expect(response.body.data.total).toBe(mockLanguages.length);
    });
  });

  describe('GET /api/translation/languages/:language/supported', () => {
    it('should return true for supported language', async () => {
      mockTranslationService.isLanguageSupported.mockReturnValue(true);

      const response = await request(app)
        .get(`/api/translation/languages/${SupportedLanguage.ENGLISH}/supported`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.supported).toBe(true);
      expect(response.body.data.language).toBe(SupportedLanguage.ENGLISH);
    });

    it('should return false for unsupported language', async () => {
      mockTranslationService.isLanguageSupported.mockReturnValue(false);

      const response = await request(app)
        .get('/api/translation/languages/unsupported/supported');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.supported).toBe(false);
    });
  });
});