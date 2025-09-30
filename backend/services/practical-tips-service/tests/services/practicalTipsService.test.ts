import { PracticalTipsService } from '../../src/services/practicalTipsService';
import { TipCategory, Priority, VenueType, WeatherCondition } from '../../src/types/practicalTips';

describe('PracticalTipsService', () => {
  let service: PracticalTipsService;

  beforeEach(() => {
    service = new PracticalTipsService();
  });

  describe('createTip', () => {
    it('should create a new tip successfully', async () => {
      const tipData = {
        category: TipCategory.SAFETY,
        title: 'Test Safety Tip',
        content: 'This is a test safety tip for hiking.',
        priority: Priority.HIGH,
        applicableVenues: [VenueType.HIKING_TRAIL],
        weatherConditions: [WeatherCondition.SUNNY],
        language: 'en',
        tags: ['test', 'safety']
      };

      const tip = await service.createTip(tipData);

      expect(tip).toBeDefined();
      expect(tip.id).toBeDefined();
      expect(tip.category).toBe(TipCategory.SAFETY);
      expect(tip.title).toBe('Test Safety Tip');
      expect(tip.priority).toBe(Priority.HIGH);
    });

    it('should assign default values when not provided', async () => {
      const tipData = {
        category: TipCategory.PREPARATION,
        title: 'Minimal Tip',
        content: 'Basic content'
      };

      const tip = await service.createTip(tipData);

      expect(tip.priority).toBe(Priority.MEDIUM);
      expect(tip.language).toBe('en');
      expect(tip.conditions).toEqual([]);
      expect(tip.tags).toEqual([]);
    });
  });

  describe('getTipById', () => {
    it('should retrieve a tip by ID', async () => {
      const tipData = {
        category: TipCategory.ETIQUETTE,
        title: 'Temple Etiquette',
        content: 'Respect temple customs',
        priority: Priority.HIGH
      };

      const createdTip = await service.createTip(tipData);
      const retrievedTip = await service.getTipById(createdTip.id);

      expect(retrievedTip).toBeDefined();
      expect(retrievedTip!.id).toBe(createdTip.id);
      expect(retrievedTip!.title).toBe('Temple Etiquette');
    });

    it('should return null for non-existent tip', async () => {
      const tip = await service.getTipById('non-existent-id');
      expect(tip).toBeNull();
    });
  });

  describe('getTipsByCategory', () => {
    beforeEach(async () => {
      await service.createTip({
        category: TipCategory.SAFETY,
        title: 'Safety Tip 1',
        content: 'Content 1',
        priority: Priority.HIGH,
        language: 'en'
      });

      await service.createTip({
        category: TipCategory.SAFETY,
        title: 'Safety Tip 2',
        content: 'Content 2',
        priority: Priority.CRITICAL,
        language: 'en'
      });

      await service.createTip({
        category: TipCategory.ETIQUETTE,
        title: 'Etiquette Tip',
        content: 'Content 3',
        priority: Priority.MEDIUM,
        language: 'en'
      });
    });

    it('should return tips filtered by category', async () => {
      const safetyTips = await service.getTipsByCategory(TipCategory.SAFETY);
      
      expect(safetyTips).toHaveLength(2);
      expect(safetyTips.every(tip => tip.category === TipCategory.SAFETY)).toBe(true);
    });

    it('should return tips sorted by priority', async () => {
      const safetyTips = await service.getTipsByCategory(TipCategory.SAFETY);
      
      expect(safetyTips[0].priority).toBe(Priority.CRITICAL);
      expect(safetyTips[1].priority).toBe(Priority.HIGH);
    });

    it('should filter by language', async () => {
      await service.createTip({
        category: TipCategory.SAFETY,
        title: 'Chinese Safety Tip',
        content: 'Chinese content',
        priority: Priority.MEDIUM,
        language: 'zh'
      });

      const englishTips = await service.getTipsByCategory(TipCategory.SAFETY, 'en');
      const chineseTips = await service.getTipsByCategory(TipCategory.SAFETY, 'zh');

      expect(englishTips).toHaveLength(2);
      expect(chineseTips).toHaveLength(1);
      expect(chineseTips[0].language).toBe('zh');
    });
  });

  describe('getContextualTips', () => {
    beforeEach(async () => {
      await service.createTip({
        category: TipCategory.SAFETY,
        title: 'Hiking Safety',
        content: 'Hiking safety content',
        priority: Priority.HIGH,
        applicableVenues: [VenueType.HIKING_TRAIL],
        weatherConditions: [WeatherCondition.SUNNY],
        language: 'en',
        tags: ['hiking', 'outdoor']
      });

      await service.createTip({
        category: TipCategory.PREPARATION,
        title: 'Rainy Day Prep',
        content: 'Rainy day preparation',
        priority: Priority.MEDIUM,
        weatherConditions: [WeatherCondition.RAINY],
        language: 'en',
        tags: ['rain', 'preparation']
      });

      await service.createTip({
        category: TipCategory.ETIQUETTE,
        title: 'Temple Respect',
        content: 'Temple etiquette',
        priority: Priority.HIGH,
        applicableVenues: [VenueType.TEMPLE],
        language: 'en',
        tags: ['temple', 'respect']
      });
    });

    it('should return contextually relevant tips', async () => {
      const request = {
        location: {
          latitude: 22.2711,
          longitude: 114.1489,
          venueType: VenueType.HIKING_TRAIL
        },
        weather: {
          condition: WeatherCondition.SUNNY,
          temperature: 25,
          humidity: 70,
          windSpeed: 10
        },
        timeOfDay: 'morning' as const,
        userProfile: {
          interests: ['hiking', 'outdoor'],
          accessibilityNeeds: [],
          language: 'en',
          groupType: 'solo' as const
        }
      };

      const response = await service.getContextualTips(request);

      expect(response.tips).toBeDefined();
      expect(response.tips.length).toBeGreaterThan(0);
      expect(response.contextualRelevance).toBeGreaterThan(0);
      expect(response.deliveryMethod).toBeDefined();
    });

    it('should filter by venue type', async () => {
      const request = {
        location: {
          latitude: 22.2711,
          longitude: 114.1489,
          venueType: VenueType.TEMPLE
        },
        timeOfDay: 'afternoon' as const
      };

      const response = await service.getContextualTips(request);
      const templeTips = response.tips.filter(tip => 
        tip.applicableVenues.includes(VenueType.TEMPLE) || 
        tip.applicableVenues.length === 0
      );

      expect(templeTips.length).toBeGreaterThan(0);
    });

    it('should filter by weather condition', async () => {
      const request = {
        location: {
          latitude: 22.2711,
          longitude: 114.1489
        },
        weather: {
          condition: WeatherCondition.RAINY,
          temperature: 20,
          humidity: 90,
          windSpeed: 15
        },
        timeOfDay: 'afternoon' as const
      };

      const response = await service.getContextualTips(request);
      const rainyTips = response.tips.filter(tip => 
        tip.weatherConditions.includes(WeatherCondition.RAINY) || 
        tip.weatherConditions.length === 0
      );

      expect(rainyTips.length).toBeGreaterThan(0);
    });

    it('should limit results to 10 tips', async () => {
      // Create many tips
      for (let i = 0; i < 15; i++) {
        await service.createTip({
          category: TipCategory.PREPARATION,
          title: `Tip ${i}`,
          content: `Content ${i}`,
          priority: Priority.MEDIUM,
          language: 'en'
        });
      }

      const request = {
        location: {
          latitude: 22.2711,
          longitude: 114.1489
        },
        timeOfDay: 'morning' as const
      };

      const response = await service.getContextualTips(request);
      expect(response.tips.length).toBeLessThanOrEqual(10);
    });

    it('should determine appropriate delivery method', async () => {
      const criticalTipData = {
        category: TipCategory.SAFETY,
        title: 'Critical Safety',
        content: 'Critical safety content',
        priority: Priority.CRITICAL,
        language: 'en'
      };

      await service.createTip(criticalTipData);

      const request = {
        location: {
          latitude: 22.2711,
          longitude: 114.1489
        },
        timeOfDay: 'morning' as const
      };

      const response = await service.getContextualTips(request);
      
      // Should be immediate delivery if critical tips are present
      const hasCritical = response.tips.some(tip => tip.priority === Priority.CRITICAL);
      if (hasCritical) {
        expect(response.deliveryMethod).toBe('immediate');
      }
    });
  });

  describe('updateTip', () => {
    it('should update an existing tip', async () => {
      const tipData = {
        category: TipCategory.PREPARATION,
        title: 'Original Title',
        content: 'Original content',
        priority: Priority.MEDIUM
      };

      const createdTip = await service.createTip(tipData);
      const updates = {
        title: 'Updated Title',
        priority: Priority.HIGH
      };

      const updatedTip = await service.updateTip(createdTip.id, updates);

      expect(updatedTip).toBeDefined();
      expect(updatedTip!.title).toBe('Updated Title');
      expect(updatedTip!.priority).toBe(Priority.HIGH);
      expect(updatedTip!.content).toBe('Original content'); // Unchanged
    });

    it('should return null for non-existent tip', async () => {
      const result = await service.updateTip('non-existent-id', { title: 'New Title' });
      expect(result).toBeNull();
    });
  });

  describe('deleteTip', () => {
    it('should delete an existing tip', async () => {
      const tipData = {
        category: TipCategory.CULTURAL,
        title: 'To Be Deleted',
        content: 'This tip will be deleted',
        priority: Priority.LOW
      };

      const createdTip = await service.createTip(tipData);
      const deleted = await service.deleteTip(createdTip.id);

      expect(deleted).toBe(true);

      const retrievedTip = await service.getTipById(createdTip.id);
      expect(retrievedTip).toBeNull();
    });

    it('should return false for non-existent tip', async () => {
      const deleted = await service.deleteTip('non-existent-id');
      expect(deleted).toBe(false);
    });
  });
});