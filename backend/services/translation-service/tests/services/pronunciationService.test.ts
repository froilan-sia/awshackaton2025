import { PronunciationService } from '../../src/services/pronunciationService';
import { SupportedLanguage } from '../../src/types/translation';

describe('PronunciationService', () => {
  let service: PronunciationService;

  beforeEach(() => {
    service = new PronunciationService();
  });

  describe('getPronunciationGuides', () => {
    it('should return Cantonese pronunciation guides', async () => {
      const guides = await service.getPronunciationGuides(SupportedLanguage.CANTONESE);
      
      expect(guides.length).toBeGreaterThan(0);
      expect(guides[0]).toHaveProperty('text');
      expect(guides[0]).toHaveProperty('phonetic');
      expect(guides[0]).toHaveProperty('difficulty');
    });

    it('should filter guides by category', async () => {
      const diningGuides = await service.getPronunciationGuides(SupportedLanguage.CANTONESE, 'dining');
      
      expect(diningGuides.length).toBeGreaterThan(0);
      diningGuides.forEach(guide => {
        expect(guide.text).toBeDefined();
      });
    });

    it('should return empty array for unsupported language', async () => {
      const guides = await service.getPronunciationGuides('unsupported-language');
      expect(guides).toEqual([]);
    });
  });

  describe('getPronunciationByText', () => {
    it('should return pronunciation for specific text', async () => {
      const guide = await service.getPronunciationByText('你好', SupportedLanguage.CANTONESE);
      
      expect(guide).toBeTruthy();
      expect(guide?.text).toBe('你好');
      expect(guide?.phonetic).toBe('nei5 hou2');
      expect(guide?.difficulty).toBe('easy');
    });

    it('should return null for non-existent text', async () => {
      const guide = await service.getPronunciationByText('nonexistent', SupportedLanguage.CANTONESE);
      expect(guide).toBeNull();
    });
  });

  describe('getGuidesByDifficulty', () => {
    it('should return guides filtered by difficulty', async () => {
      const easyGuides = await service.getGuidesByDifficulty(SupportedLanguage.CANTONESE, 'easy');
      
      expect(easyGuides.length).toBeGreaterThan(0);
      easyGuides.forEach(guide => {
        expect(guide.difficulty).toBe('easy');
      });
    });

    it('should return medium difficulty guides', async () => {
      const mediumGuides = await service.getGuidesByDifficulty(SupportedLanguage.CANTONESE, 'medium');
      
      expect(mediumGuides.length).toBeGreaterThan(0);
      mediumGuides.forEach(guide => {
        expect(guide.difficulty).toBe('medium');
      });
    });

    it('should return hard difficulty guides', async () => {
      const hardGuides = await service.getGuidesByDifficulty(SupportedLanguage.CANTONESE, 'hard');
      
      expect(hardGuides.length).toBeGreaterThan(0);
      hardGuides.forEach(guide => {
        expect(guide.difficulty).toBe('hard');
      });
    });
  });

  describe('getGuidesByCategory', () => {
    it('should return guides for greetings category', async () => {
      const greetingGuides = await service.getGuidesByCategory(SupportedLanguage.CANTONESE, 'greetings');
      
      expect(greetingGuides.length).toBeGreaterThan(0);
      expect(greetingGuides.some(guide => guide.text === '你好')).toBe(true);
    });

    it('should return guides for dining category', async () => {
      const diningGuides = await service.getGuidesByCategory(SupportedLanguage.CANTONESE, 'dining');
      
      expect(diningGuides.length).toBeGreaterThan(0);
      expect(diningGuides.some(guide => guide.text === '埋單')).toBe(true);
    });
  });

  describe('searchGuides', () => {
    it('should search guides by text', async () => {
      const results = await service.searchGuides(SupportedLanguage.CANTONESE, '你好');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(guide => guide.text.includes('你好'))).toBe(true);
    });

    it('should search guides by phonetic', async () => {
      const results = await service.searchGuides(SupportedLanguage.CANTONESE, 'nei5');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(guide => guide.phonetic.includes('nei5'))).toBe(true);
    });

    it('should search guides by usage', async () => {
      const results = await service.searchGuides(SupportedLanguage.CANTONESE, 'greeting');
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', async () => {
      const results = await service.searchGuides(SupportedLanguage.CANTONESE, 'nonexistentterm');
      expect(results).toEqual([]);
    });
  });

  describe('addPronunciationGuide', () => {
    it('should add new pronunciation guide', async () => {
      const newGuide = {
        text: '測試',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'caak1 si3',
        difficulty: 'medium' as const,
        category: 'test',
        usage: 'Test phrase for testing'
      };

      const result = await service.addPronunciationGuide(newGuide);

      expect(result.text).toBe('測試');
      expect(result.phonetic).toBe('caak1 si3');
      expect(result.difficulty).toBe('medium');
    });

    it('should throw error for invalid guide data', async () => {
      const invalidGuide = {
        text: '',
        language: SupportedLanguage.CANTONESE,
        phonetic: '',
        difficulty: 'invalid' as any
      };

      await expect(service.addPronunciationGuide(invalidGuide))
        .rejects.toThrow('Invalid pronunciation guide');
    });
  });

  describe('getAvailableCategories', () => {
    it('should return available categories for Cantonese', () => {
      const categories = service.getAvailableCategories(SupportedLanguage.CANTONESE);
      
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('greetings');
      expect(categories).toContain('dining');
      expect(categories).toContain('transportation');
    });

    it('should return empty array for unsupported language', () => {
      const categories = service.getAvailableCategories('unsupported');
      expect(categories).toEqual([]);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return supported languages', () => {
      const languages = service.getSupportedLanguages();
      
      expect(languages).toContain(SupportedLanguage.CANTONESE);
      expect(languages.length).toBeGreaterThan(0);
    });
  });
});