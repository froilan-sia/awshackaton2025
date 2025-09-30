import { CulturalEtiquetteService } from '../../src/services/culturalEtiquetteService';
import { VenueType } from '../../src/types/practicalTips';

describe('CulturalEtiquetteService', () => {
  let service: CulturalEtiquetteService;

  beforeEach(() => {
    service = new CulturalEtiquetteService();
  });

  describe('getEtiquetteForVenue', () => {
    it('should return etiquette guides for temple venues', async () => {
      const guides = await service.getEtiquetteForVenue(VenueType.TEMPLE);
      
      expect(guides).toBeDefined();
      expect(guides.length).toBeGreaterThan(0);
      expect(guides.every(guide => guide.venueType === VenueType.TEMPLE)).toBe(true);
      
      const templeGuide = guides[0];
      expect(templeGuide.dosList).toBeDefined();
      expect(templeGuide.dontsList).toBeDefined();
      expect(templeGuide.behaviorGuidelines).toBeDefined();
      expect(templeGuide.commonMistakes).toBeDefined();
      expect(templeGuide.localCustoms).toBeDefined();
    });

    it('should return etiquette guides for restaurant venues', async () => {
      const guides = await service.getEtiquetteForVenue(VenueType.RESTAURANT);
      
      expect(guides).toBeDefined();
      expect(guides.length).toBeGreaterThan(0);
      expect(guides.every(guide => guide.venueType === VenueType.RESTAURANT)).toBe(true);
      
      const restaurantGuide = guides[0];
      expect(restaurantGuide.title).toContain('Dining');
      expect(restaurantGuide.dosList.some(item => item.includes('chopsticks'))).toBe(true);
      expect(restaurantGuide.dontsList.some(item => item.includes('chopsticks'))).toBe(true);
    });

    it('should return etiquette guides for transportation hubs', async () => {
      const guides = await service.getEtiquetteForVenue(VenueType.TRANSPORTATION_HUB);
      
      expect(guides).toBeDefined();
      expect(guides.length).toBeGreaterThan(0);
      expect(guides.every(guide => guide.venueType === VenueType.TRANSPORTATION_HUB)).toBe(true);
      
      const transportGuide = guides[0];
      expect(transportGuide.dosList.some(item => item.includes('escalator'))).toBe(true);
      expect(transportGuide.dontsList.some(item => item.includes('eat'))).toBe(true);
    });

    it('should filter by language', async () => {
      // Create a guide in Chinese
      await service.createEtiquetteGuide({
        venueType: VenueType.MUSEUM,
        title: 'Chinese Museum Guide',
        description: 'Chinese description',
        dosList: ['Chinese do'],
        dontsList: ['Chinese dont'],
        behaviorGuidelines: ['Chinese behavior'],
        commonMistakes: ['Chinese mistake'],
        localCustoms: ['Chinese custom'],
        language: 'zh'
      });

      const englishGuides = await service.getEtiquetteForVenue(VenueType.MUSEUM, 'en');
      const chineseGuides = await service.getEtiquetteForVenue(VenueType.MUSEUM, 'zh');

      expect(englishGuides.every(guide => guide.language === 'en')).toBe(true);
      expect(chineseGuides.every(guide => guide.language === 'zh')).toBe(true);
      expect(chineseGuides.some(guide => guide.title === 'Chinese Museum Guide')).toBe(true);
    });

    it('should return empty array for venue types without guides', async () => {
      const guides = await service.getEtiquetteForVenue(VenueType.BEACH);
      
      // Should return empty array if no guides exist for this venue type
      expect(Array.isArray(guides)).toBe(true);
    });
  });

  describe('createEtiquetteGuide', () => {
    it('should create a new etiquette guide', async () => {
      const guideData = {
        venueType: VenueType.SHOPPING_MALL,
        title: 'Shopping Mall Etiquette',
        description: 'Guidelines for shopping mall behavior',
        dosList: ['Be polite to staff', 'Keep noise levels down'],
        dontsList: ['Don\'t run in corridors', 'Don\'t litter'],
        dresscode: 'Casual appropriate clothing',
        behaviorGuidelines: ['Walk on the right side', 'Hold doors for others'],
        commonMistakes: ['Blocking escalators', 'Loud phone conversations'],
        localCustoms: ['Queuing culture', 'Respect for personal space'],
        language: 'en'
      };

      const guide = await service.createEtiquetteGuide(guideData);

      expect(guide).toBeDefined();
      expect(guide.id).toBeDefined();
      expect(guide.venueType).toBe(VenueType.SHOPPING_MALL);
      expect(guide.title).toBe('Shopping Mall Etiquette');
      expect(guide.dosList).toEqual(['Be polite to staff', 'Keep noise levels down']);
      expect(guide.dresscode).toBe('Casual appropriate clothing');
    });

    it('should assign default values when not provided', async () => {
      const minimalGuideData = {
        venueType: VenueType.NIGHTLIFE,
        title: 'Minimal Guide',
        description: 'Basic description'
      };

      const guide = await service.createEtiquetteGuide(minimalGuideData);

      expect(guide.language).toBe('en');
      expect(guide.dosList).toEqual([]);
      expect(guide.dontsList).toEqual([]);
      expect(guide.behaviorGuidelines).toEqual([]);
      expect(guide.commonMistakes).toEqual([]);
      expect(guide.localCustoms).toEqual([]);
    });
  });

  describe('updateEtiquetteGuide', () => {
    it('should update an existing etiquette guide', async () => {
      const guideData = {
        venueType: VenueType.CULTURAL_SITE,
        title: 'Original Cultural Guide',
        description: 'Original description',
        dosList: ['Original do'],
        dontsList: ['Original dont'],
        language: 'en'
      };

      const created = await service.createEtiquetteGuide(guideData);
      const updates = {
        title: 'Updated Cultural Guide',
        dosList: ['Updated do', 'Another do'],
        dresscode: 'Respectful attire required'
      };

      const updated = await service.updateEtiquetteGuide(created.id, updates);

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Updated Cultural Guide');
      expect(updated!.dosList).toEqual(['Updated do', 'Another do']);
      expect(updated!.dresscode).toBe('Respectful attire required');
      expect(updated!.description).toBe('Original description'); // Unchanged
    });

    it('should return null for non-existent guide', async () => {
      const result = await service.updateEtiquetteGuide('non-existent-id', {
        title: 'New Title'
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteEtiquetteGuide', () => {
    it('should delete an existing etiquette guide', async () => {
      const guideData = {
        venueType: VenueType.BUSINESS_DISTRICT,
        title: 'To Be Deleted',
        description: 'This guide will be deleted',
        language: 'en'
      };

      const created = await service.createEtiquetteGuide(guideData);
      const deleted = await service.deleteEtiquetteGuide(created.id);

      expect(deleted).toBe(true);

      const allGuides = await service.getAllEtiquetteGuides();
      const foundGuide = allGuides.find(guide => guide.id === created.id);
      expect(foundGuide).toBeUndefined();
    });

    it('should return false for non-existent guide', async () => {
      const deleted = await service.deleteEtiquetteGuide('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('getGeneralEtiquetteGuidelines', () => {
    it('should return comprehensive general etiquette guidelines', async () => {
      const guidelines = await service.getGeneralEtiquetteGuidelines();

      expect(guidelines).toBeDefined();
      expect(guidelines.general).toBeDefined();
      expect(guidelines.transportation).toBeDefined();
      expect(guidelines.dining).toBeDefined();
      expect(guidelines.shopping).toBeDefined();
      expect(guidelines.religious).toBeDefined();

      expect(Array.isArray(guidelines.general)).toBe(true);
      expect(Array.isArray(guidelines.transportation)).toBe(true);
      expect(Array.isArray(guidelines.dining)).toBe(true);
      expect(Array.isArray(guidelines.shopping)).toBe(true);
      expect(Array.isArray(guidelines.religious)).toBe(true);

      expect(guidelines.general.length).toBeGreaterThan(0);
      expect(guidelines.transportation.length).toBeGreaterThan(0);
      expect(guidelines.dining.length).toBeGreaterThan(0);
      expect(guidelines.shopping.length).toBeGreaterThan(0);
      expect(guidelines.religious.length).toBeGreaterThan(0);
    });

    it('should include specific cultural guidelines', async () => {
      const guidelines = await service.getGeneralEtiquetteGuidelines();

      // Check for specific Hong Kong cultural elements
      const allGuidelines = [
        ...guidelines.general,
        ...guidelines.transportation,
        ...guidelines.dining,
        ...guidelines.shopping,
        ...guidelines.religious
      ].join(' ').toLowerCase();

      expect(allGuidelines).toContain('chopsticks');
      expect(allGuidelines).toContain('escalator');
      expect(allGuidelines).toContain('temple');
      expect(allGuidelines).toContain('mtr');
    });
  });

  describe('getAllEtiquetteGuides', () => {
    it('should return all etiquette guides for specified language', async () => {
      const guides = await service.getAllEtiquetteGuides('en');

      expect(Array.isArray(guides)).toBe(true);
      expect(guides.length).toBeGreaterThan(0);
      expect(guides.every(guide => guide.language === 'en')).toBe(true);

      // Should include default guides
      const venueTypes = guides.map(guide => guide.venueType);
      expect(venueTypes).toContain(VenueType.TEMPLE);
      expect(venueTypes).toContain(VenueType.RESTAURANT);
      expect(venueTypes).toContain(VenueType.TRANSPORTATION_HUB);
    });

    it('should filter by language correctly', async () => {
      // Create guides in different languages
      await service.createEtiquetteGuide({
        venueType: VenueType.HIKING_TRAIL,
        title: 'English Hiking Guide',
        description: 'English description',
        language: 'en'
      });

      await service.createEtiquetteGuide({
        venueType: VenueType.HIKING_TRAIL,
        title: 'Chinese Hiking Guide',
        description: 'Chinese description',
        language: 'zh'
      });

      const englishGuides = await service.getAllEtiquetteGuides('en');
      const chineseGuides = await service.getAllEtiquetteGuides('zh');

      expect(englishGuides.every(guide => guide.language === 'en')).toBe(true);
      expect(chineseGuides.every(guide => guide.language === 'zh')).toBe(true);
      
      expect(englishGuides.some(guide => guide.title === 'English Hiking Guide')).toBe(true);
      expect(chineseGuides.some(guide => guide.title === 'Chinese Hiking Guide')).toBe(true);
    });
  });

  describe('getEtiquetteById', () => {
    it('should retrieve etiquette guide by ID', async () => {
      const guideData = {
        venueType: VenueType.MARKET,
        title: 'Market Etiquette Guide',
        description: 'Guide for market behavior',
        language: 'en'
      };

      const created = await service.createEtiquetteGuide(guideData);
      const retrieved = await service.getEtiquetteById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Market Etiquette Guide');
      expect(retrieved!.venueType).toBe(VenueType.MARKET);
    });

    it('should return null for non-existent guide', async () => {
      const guide = await service.getEtiquetteById('non-existent-id');
      expect(guide).toBeNull();
    });
  });
});