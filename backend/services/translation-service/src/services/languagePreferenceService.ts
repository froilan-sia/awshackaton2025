import { LanguagePreference, SupportedLanguage, TranslationProvider } from '../types/translation';
import { LanguagePreferenceModel } from '../models/LanguagePreference';

export class LanguagePreferenceService {
  private preferences: Map<string, LanguagePreferenceModel> = new Map();

  public async createOrUpdatePreference(preference: Partial<LanguagePreference>): Promise<LanguagePreference> {
    if (!preference.userId) {
      throw new Error('User ID is required');
    }

    const model = new LanguagePreferenceModel(preference);
    const validation = model.validate();

    if (!validation.isValid) {
      throw new Error(`Invalid preference data: ${validation.errors.join(', ')}`);
    }

    this.preferences.set(preference.userId, model);
    return model.toJSON();
  }

  public async getPreference(userId: string): Promise<LanguagePreference | null> {
    const preference = this.preferences.get(userId);
    return preference ? preference.toJSON() : null;
  }

  public async getUserPreferredLanguage(userId: string): Promise<string> {
    const preference = await this.getPreference(userId);
    return preference?.primaryLanguage || SupportedLanguage.ENGLISH;
  }

  public async getUserTranslationProvider(userId: string): Promise<TranslationProvider> {
    const preference = await this.getPreference(userId);
    return preference?.preferredTranslationProvider || TranslationProvider.GOOGLE;
  }

  public async shouldAutoTranslate(userId: string): Promise<boolean> {
    const preference = await this.getPreference(userId);
    return preference?.autoTranslate !== undefined ? preference.autoTranslate : true;
  }

  public async updateLanguage(userId: string, language: string): Promise<LanguagePreference> {
    const existingPreference = await this.getPreference(userId);
    
    const updatedPreference: Partial<LanguagePreference> = {
      ...existingPreference,
      userId,
      primaryLanguage: language
    };

    return await this.createOrUpdatePreference(updatedPreference);
  }

  public async addSecondaryLanguage(userId: string, language: string): Promise<LanguagePreference> {
    const existingPreference = await this.getPreference(userId);
    const secondaryLanguages = existingPreference?.secondaryLanguages || [];
    
    if (!secondaryLanguages.includes(language)) {
      secondaryLanguages.push(language);
    }

    const updatedPreference: Partial<LanguagePreference> = {
      ...existingPreference,
      userId,
      secondaryLanguages
    };

    return await this.createOrUpdatePreference(updatedPreference);
  }

  public async removeSecondaryLanguage(userId: string, language: string): Promise<LanguagePreference> {
    const existingPreference = await this.getPreference(userId);
    const secondaryLanguages = existingPreference?.secondaryLanguages || [];
    
    const updatedSecondaryLanguages = secondaryLanguages.filter(lang => lang !== language);

    const updatedPreference: Partial<LanguagePreference> = {
      ...existingPreference,
      userId,
      secondaryLanguages: updatedSecondaryLanguages
    };

    return await this.createOrUpdatePreference(updatedPreference);
  }

  public async setTranslationProvider(userId: string, provider: TranslationProvider): Promise<LanguagePreference> {
    const existingPreference = await this.getPreference(userId);
    
    const updatedPreference: Partial<LanguagePreference> = {
      ...existingPreference,
      userId,
      preferredTranslationProvider: provider
    };

    return await this.createOrUpdatePreference(updatedPreference);
  }

  public async setAutoTranslate(userId: string, autoTranslate: boolean): Promise<LanguagePreference> {
    const existingPreference = await this.getPreference(userId);
    
    const updatedPreference: Partial<LanguagePreference> = {
      ...existingPreference,
      userId,
      autoTranslate
    };

    return await this.createOrUpdatePreference(updatedPreference);
  }

  public async getAllPreferences(): Promise<LanguagePreference[]> {
    return Array.from(this.preferences.values()).map(pref => pref.toJSON());
  }

  public async deletePreference(userId: string): Promise<boolean> {
    return this.preferences.delete(userId);
  }
}