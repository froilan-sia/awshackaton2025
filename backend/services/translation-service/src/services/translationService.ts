import axios from 'axios';
import { 
  TranslationRequest, 
  TranslationResponse, 
  BatchTranslationRequest, 
  BatchTranslationResponse,
  TranslationProvider,
  SupportedLanguage 
} from '../types/translation';

export class TranslationService {
  private googleApiKey: string;
  private azureKey: string;
  private azureRegion: string;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY || '';
    this.azureKey = process.env.AZURE_TRANSLATOR_KEY || '';
    this.azureRegion = process.env.AZURE_TRANSLATOR_REGION || '';
  }

  public async translateText(request: TranslationRequest, provider: TranslationProvider = TranslationProvider.GOOGLE): Promise<TranslationResponse> {
    try {
      switch (provider) {
        case TranslationProvider.GOOGLE:
          return await this.translateWithGoogle(request);
        case TranslationProvider.AZURE:
          return await this.translateWithAzure(request);
        default:
          throw new Error(`Unsupported translation provider: ${provider}`);
      }
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Translation failed');
    }
  }

  public async translateBatch(request: BatchTranslationRequest, provider: TranslationProvider = TranslationProvider.GOOGLE): Promise<BatchTranslationResponse> {
    try {
      const translations: TranslationResponse[] = [];
      
      for (const text of request.texts) {
        const translationRequest: TranslationRequest = {
          text,
          targetLanguage: request.targetLanguage,
          sourceLanguage: request.sourceLanguage,
          context: request.context
        };
        
        const translation = await this.translateText(translationRequest, provider);
        translations.push(translation);
      }

      return { translations };
    } catch (error) {
      console.error('Batch translation error:', error);
      throw new Error('Batch translation failed');
    }
  }

  private async translateWithGoogle(request: TranslationRequest): Promise<TranslationResponse> {
    if (!this.googleApiKey) {
      throw new Error('Google Translate API key not configured');
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${this.googleApiKey}`;
    
    const payload = {
      q: request.text,
      target: this.mapToGoogleLanguageCode(request.targetLanguage),
      source: request.sourceLanguage ? this.mapToGoogleLanguageCode(request.sourceLanguage) : undefined,
      format: 'text'
    };

    const response = await axios.post(url, payload);
    const translation = response.data.data.translations[0];

    return {
      translatedText: translation.translatedText,
      sourceLanguage: translation.detectedSourceLanguage || request.sourceLanguage || 'auto',
      targetLanguage: request.targetLanguage,
      confidence: 0.95 // Google doesn't provide confidence scores in basic API
    };
  }

  private async translateWithAzure(request: TranslationRequest): Promise<TranslationResponse> {
    if (!this.azureKey || !this.azureRegion) {
      throw new Error('Azure Translator credentials not configured');
    }

    const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${this.mapToAzureLanguageCode(request.targetLanguage)}`;
    
    const headers = {
      'Ocp-Apim-Subscription-Key': this.azureKey,
      'Ocp-Apim-Subscription-Region': this.azureRegion,
      'Content-Type': 'application/json'
    };

    const payload = [{
      text: request.text
    }];

    if (request.sourceLanguage) {
      // Add source language to URL if specified
      const urlWithSource = `${url}&from=${this.mapToAzureLanguageCode(request.sourceLanguage)}`;
      const response = await axios.post(urlWithSource, payload, { headers });
      const translation = response.data[0].translations[0];
      
      return {
        translatedText: translation.text,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: translation.confidence || 0.9
      };
    } else {
      const response = await axios.post(url, payload, { headers });
      const result = response.data[0];
      const translation = result.translations[0];
      
      return {
        translatedText: translation.text,
        sourceLanguage: result.detectedLanguage?.language || 'auto',
        targetLanguage: request.targetLanguage,
        confidence: result.detectedLanguage?.score || 0.9
      };
    }
  }

  private mapToGoogleLanguageCode(language: string): string {
    const mapping: Record<string, string> = {
      [SupportedLanguage.ENGLISH]: 'en',
      [SupportedLanguage.TRADITIONAL_CHINESE]: 'zh-TW',
      [SupportedLanguage.SIMPLIFIED_CHINESE]: 'zh-CN',
      [SupportedLanguage.CANTONESE]: 'zh',
      [SupportedLanguage.JAPANESE]: 'ja',
      [SupportedLanguage.KOREAN]: 'ko',
      [SupportedLanguage.SPANISH]: 'es',
      [SupportedLanguage.FRENCH]: 'fr',
      [SupportedLanguage.GERMAN]: 'de',
      [SupportedLanguage.ITALIAN]: 'it',
      [SupportedLanguage.PORTUGUESE]: 'pt',
      [SupportedLanguage.RUSSIAN]: 'ru',
      [SupportedLanguage.ARABIC]: 'ar',
      [SupportedLanguage.HINDI]: 'hi',
      [SupportedLanguage.THAI]: 'th',
      [SupportedLanguage.VIETNAMESE]: 'vi'
    };

    return mapping[language] || language;
  }

  private mapToAzureLanguageCode(language: string): string {
    const mapping: Record<string, string> = {
      [SupportedLanguage.ENGLISH]: 'en',
      [SupportedLanguage.TRADITIONAL_CHINESE]: 'zh-Hant',
      [SupportedLanguage.SIMPLIFIED_CHINESE]: 'zh-Hans',
      [SupportedLanguage.CANTONESE]: 'yue',
      [SupportedLanguage.JAPANESE]: 'ja',
      [SupportedLanguage.KOREAN]: 'ko',
      [SupportedLanguage.SPANISH]: 'es',
      [SupportedLanguage.FRENCH]: 'fr',
      [SupportedLanguage.GERMAN]: 'de',
      [SupportedLanguage.ITALIAN]: 'it',
      [SupportedLanguage.PORTUGUESE]: 'pt',
      [SupportedLanguage.RUSSIAN]: 'ru',
      [SupportedLanguage.ARABIC]: 'ar',
      [SupportedLanguage.HINDI]: 'hi',
      [SupportedLanguage.THAI]: 'th',
      [SupportedLanguage.VIETNAMESE]: 'vi'
    };

    return mapping[language] || language;
  }

  public getSupportedLanguages(): string[] {
    return Object.values(SupportedLanguage);
  }

  public isLanguageSupported(language: string): boolean {
    return Object.values(SupportedLanguage).includes(language as SupportedLanguage);
  }
}