import { CulturalEtiquetteService } from '../../src/services/culturalEtiquetteService';
import { EtiquetteCategory, SupportedLanguage } from '../../src/types/translation';

describe('CulturalEtiquetteService', () => {
  let service: CulturalEtiquetteService;

  beforeEach(() => {
    service = new CulturalEtiquetteService();
  });

  describe('getEtiquetteByCategory', () => {
    it('should return dining etiquette content', async () => {
      const content = await service.getEtiquetteByCategory(EtiquetteCategory.DINING);
      
      expect(content.length).toBeGreaterThan(0);
      content.forEach(item => {
        expect(item.category).toBe(EtiquetteCategory.DINING);
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('content');
        expect(item).toHaveProperty('importance');
      });
    });

    it('should return transportation etiquette content', async () => {
      const content = await service.getEtiquetteByCategory(EtiquetteCategory.TRANSPORTATION);
      
      expect(content.length).toBeGreaterThan(0);
      expect(content.some(item => item.title.includes('MTR'))).toBe(true);
    });

    it('should return religious sites etiquette content', async () => {
      const content = await service.getEtiquetteByCategory(EtiquetteCategory.RELIGIOUS_SITES);
      
      expect(content.length).toBeGreaterThan(0);
      expect(content.some(item => item.title.includes('Temple'))).toBe(true);
    });
  });

  describe('getEtiquetteByContext', () => {
    it('should return content for restaurant context', async () => {
      const content = await service.getEtiquetteByContext('restaurant');
      
      expect(content.length).toBeGreaterThan(0);
      content.forEach(item => {
        expect(item.context).toContain('restaurant');
      });
    });

    it('should return content for MTR context', async () => {
      const content = await service.getEtiquetteByContext('mtr');
      
      expect(content.length).toBeGreaterThan(0);
      expect(content.some(item => item.title.includes('MTR'))).toBe(true);
    });

    it('should return empty array for non-existent context', async () => {
      const content = await service.getEtiquetteByContext('nonexistent');
      expect(content).toEqual([]);
    });
  });

  describe('getEtiquetteByImportance', () => {
    it('should return critical importance content', async () => {
      const content = await service.getEtiquetteByImportance('critical');
      
      expect(content.length).toBeGreaterThan(0);
      content.forEach(item => {
        expect(item.importance).toBe('critical');
      });
    });

    it('should return high importance content', async () => {
      const content = await service.getEtiquetteByImportance('high');
      
      expect(content.length).toBeGreaterThan(0);
      content.forEach(item => {
        expect(item.importance).toBe('high');
      });
    });

    it('should return medium importance content', async () => {
      const content = await service.getEtiquetteByImportance('medium');
      
      expect(content.length).toBeGreaterThan(0);
      content.forEach(item => {
        expect(item.importance).toBe('medium');
      });
    });
  });

  describe('getAllEtiquette', () => {
    it('should return all etiquette content', async () => {
      const content = await service.getAllEtiquette();
      
      expect(content.length).toBeGreaterThan(0);
      
      // Check that we have content from different categories
      const categories = new Set(content.map(item => item.category));
      expect(categories.size).toBeGreaterThan(1);
      expect(categories.has(EtiquetteCategory.DINING)).toBe(true);
      expect(categories.has(EtiquetteCategory.TRANSPORTATION)).toBe(true);
    });
  });

  describe('searchEtiquette', () => {
    it('should search by title', async () => {
      const results = await service.searchEtiquette('dim sum');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(item => item.title.toLowerCase().includes('dim sum'))).toBe(true);
    });

    it('should search by content', async () => {
      const results = await service.searchEtiquette('chopsticks');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(item => item.content.toLowerCase().includes('chopsticks'))).toBe(true);
    });

    it('should search by context', async () => {
      const results = await service.searchEtiquette('temple');
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', async () => {
      const results = await service.searchEtiquette('nonexistentterm');
      expect(results).toEqual([]);
    });
  });

  describe('addEtiquetteContent', () => {
    it('should add new etiquette content', async () => {
      const newContent = {
        category: EtiquetteCategory.SHOPPING,
        title: 'Test Etiquette',
        content: 'This is test etiquette content',
        language: SupportedLanguage.ENGLISH,
        context: ['test'],
        importance: 'medium' as const,
        tags: ['test']
      };

      const result = await service.addEtiquetteContent(newContent);

      expect(result.title).toBe('Test Etiquette');
      expect(result.category).toBe(EtiquetteCategory.SHOPPING);
      expect(result.importance).toBe('medium');
    });

    it('should throw error for invalid content', async () => {
      const invalidContent = {
        category: 'invalid' as any,
        title: '',
        content: '',
        language: SupportedLanguage.ENGLISH,
        context: [],
        importance: 'medium' as const
      };

      await expect(service.addEtiquetteContent(invalidContent))
        .rejects.toThrow('Invalid etiquette content');
    });
  });

  describe('translateEtiquetteContent', () => {
    it('should create translated version of content', async () => {
      // First add some content
      const originalContent = {
        category: EtiquetteCategory.DINING,
        title: 'Test Title',
        content: 'Test content',
        language: SupportedLanguage.ENGLISH,
        context: ['test'],
        importance: 'medium' as const
      };

      const added = await service.addEtiquetteContent(originalContent);

      // Then translate it
      const translated = await service.translateEtiquetteContent(
        added.id,
        SupportedLanguage.TRADITIONAL_CHINESE,
        '測試標題',
        '測試內容'
      );

      expect(translated.title).toBe('測試標題');
      expect(translated.content).toBe('測試內容');
      expect(translated.language).toBe(SupportedLanguage.TRADITIONAL_CHINESE);
      expect(translated.category).toBe(EtiquetteCategory.DINING);
    });

    it('should throw error for non-existent content', async () => {
      await expect(service.translateEtiquetteContent(
        'nonexistent',
        SupportedLanguage.TRADITIONAL_CHINESE,
        'Title',
        'Content'
      )).rejects.toThrow('Original content not found');
    });
  });

  describe('getAvailableCategories', () => {
    it('should return all available categories', () => {
      const categories = service.getAvailableCategories();
      
      expect(categories).toContain(EtiquetteCategory.DINING);
      expect(categories).toContain(EtiquetteCategory.TRANSPORTATION);
      expect(categories).toContain(EtiquetteCategory.RELIGIOUS_SITES);
      expect(categories).toContain(EtiquetteCategory.SHOPPING);
      expect(categories).toContain(EtiquetteCategory.SOCIAL_INTERACTION);
      expect(categories).toContain(EtiquetteCategory.CULTURAL_EVENTS);
    });
  });

  describe('getAvailableContexts', () => {
    it('should return available contexts', () => {
      const contexts = service.getAvailableContexts();
      
      expect(contexts.length).toBeGreaterThan(0);
      expect(contexts).toContain('restaurant');
      expect(contexts).toContain('mtr');
      expect(contexts).toContain('temple');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return supported languages', () => {
      const languages = service.getSupportedLanguages();
      
      expect(languages).toContain(SupportedLanguage.ENGLISH);
      expect(languages.length).toBeGreaterThan(0);
    });
  });
});