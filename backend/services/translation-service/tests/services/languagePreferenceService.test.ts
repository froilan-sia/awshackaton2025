import { LanguagePreferenceService } from '../../src/services/languagePreferenceService';
import { SupportedLanguage, TranslationProvider } from '../../src/types/translation';

describe('LanguagePreferenceService', () => {
  let service: LanguagePreferenceService;

  beforeEach(() => {
    service = new LanguagePreferenceService();
  });

  describe('createOrUpdatePreference', () => {
    it('should create a new language preference', async () => {
      const preferenceData = {
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH,
        secondaryLanguages: [SupportedLanguage.TRADITIONAL_CHINESE],
        preferredTranslationProvider: TranslationProvider.GOOGLE,
        autoTranslate: true
      };

      const result = await service.createOrUpdatePreference(preferenceData);

      expect(result).toEqual(preferenceData);
    });

    it('should update existing preference', async () => {
      const initialPreference = {
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH
      };

      await service.createOrUpdatePreference(initialPreference);

      const updatedPreference = {
        userId: 'user123',
        primaryLanguage: SupportedLanguage.TRADITIONAL_CHINESE,
        autoTranslate: false
      };

      const result = await service.createOrUpdatePreference(updatedPreference);

      expect(result.primaryLanguage).toBe(SupportedLanguage.TRADITIONAL_CHINESE);
      expect(result.autoTranslate).toBe(false);
    });

    it('should throw error for invalid preference data', async () => {
      const invalidPreference = {
        userId: '',
        primaryLanguage: 'invalid-language'
      };

      await expect(service.createOrUpdatePreference(invalidPreference))
        .rejects.toThrow('User ID is required');
    });

    it('should throw error when userId is missing', async () => {
      const preferenceWithoutUserId = {
        primaryLanguage: SupportedLanguage.ENGLISH
      };

      await expect(service.createOrUpdatePreference(preferenceWithoutUserId))
        .rejects.toThrow('User ID is required');
    });
  });

  describe('getPreference', () => {
    it('should return user preference if exists', async () => {
      const preferenceData = {
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH
      };

      await service.createOrUpdatePreference(preferenceData);
      const result = await service.getPreference('user123');

      expect(result).toBeTruthy();
      expect(result?.userId).toBe('user123');
      expect(result?.primaryLanguage).toBe(SupportedLanguage.ENGLISH);
    });

    it('should return null if preference does not exist', async () => {
      const result = await service.getPreference('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getUserPreferredLanguage', () => {
    it('should return user preferred language', async () => {
      await service.createOrUpdatePreference({
        userId: 'user123',
        primaryLanguage: SupportedLanguage.JAPANESE
      });

      const language = await service.getUserPreferredLanguage('user123');
      expect(language).toBe(SupportedLanguage.JAPANESE);
    });

    it('should return default language for non-existent user', async () => {
      const language = await service.getUserPreferredLanguage('nonexistent');
      expect(language).toBe(SupportedLanguage.ENGLISH);
    });
  });

  describe('updateLanguage', () => {
    it('should update primary language', async () => {
      await service.createOrUpdatePreference({
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH
      });

      const result = await service.updateLanguage('user123', SupportedLanguage.KOREAN);

      expect(result.primaryLanguage).toBe(SupportedLanguage.KOREAN);
    });
  });

  describe('addSecondaryLanguage', () => {
    it('should add secondary language', async () => {
      await service.createOrUpdatePreference({
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH,
        secondaryLanguages: []
      });

      const result = await service.addSecondaryLanguage('user123', SupportedLanguage.SPANISH);

      expect(result.secondaryLanguages).toContain(SupportedLanguage.SPANISH);
    });

    it('should not add duplicate secondary language', async () => {
      await service.createOrUpdatePreference({
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH,
        secondaryLanguages: [SupportedLanguage.SPANISH]
      });

      const result = await service.addSecondaryLanguage('user123', SupportedLanguage.SPANISH);

      expect(result.secondaryLanguages).toEqual([SupportedLanguage.SPANISH]);
    });
  });

  describe('removeSecondaryLanguage', () => {
    it('should remove secondary language', async () => {
      await service.createOrUpdatePreference({
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH,
        secondaryLanguages: [SupportedLanguage.SPANISH, SupportedLanguage.FRENCH]
      });

      const result = await service.removeSecondaryLanguage('user123', SupportedLanguage.SPANISH);

      expect(result.secondaryLanguages).not.toContain(SupportedLanguage.SPANISH);
      expect(result.secondaryLanguages).toContain(SupportedLanguage.FRENCH);
    });
  });

  describe('setTranslationProvider', () => {
    it('should update translation provider', async () => {
      await service.createOrUpdatePreference({
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH
      });

      const result = await service.setTranslationProvider('user123', TranslationProvider.AZURE);

      expect(result.preferredTranslationProvider).toBe(TranslationProvider.AZURE);
    });
  });

  describe('setAutoTranslate', () => {
    it('should update auto-translate setting', async () => {
      await service.createOrUpdatePreference({
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH
      });

      const result = await service.setAutoTranslate('user123', false);

      expect(result.autoTranslate).toBe(false);
    });
  });

  describe('deletePreference', () => {
    it('should delete user preference', async () => {
      await service.createOrUpdatePreference({
        userId: 'user123',
        primaryLanguage: SupportedLanguage.ENGLISH
      });

      const deleted = await service.deletePreference('user123');
      expect(deleted).toBe(true);

      const preference = await service.getPreference('user123');
      expect(preference).toBeNull();
    });

    it('should return false for non-existent preference', async () => {
      const deleted = await service.deletePreference('nonexistent');
      expect(deleted).toBe(false);
    });
  });
});