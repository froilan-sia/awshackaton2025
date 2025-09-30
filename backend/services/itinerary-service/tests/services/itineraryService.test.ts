import { ItineraryService } from '../../src/services/itineraryService';
import { ItineraryRequest, GroupType, ActivityLevel, ModificationType } from '../../src/types/itinerary';

describe('ItineraryService', () => {
  let service: ItineraryService;

  beforeEach(() => {
    service = new ItineraryService();
  });

  const mockRequest: ItineraryRequest = {
    userId: 'user123',
    preferences: {
      interests: ['scenic', 'cultural'],
      budgetRange: { min: 100, max: 500, currency: 'HKD' },
      groupType: GroupType.COUPLE,
      dietaryRestrictions: [],
      activityLevel: ActivityLevel.MODERATE,
      accessibilityNeeds: [],
      language: 'en'
    },
    startDate: new Date('2024-03-15'),
    endDate: new Date('2024-03-16')
  };

  describe('generateItinerary', () => {
    it('should generate and store an itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);

      expect(itinerary).toBeDefined();
      expect(itinerary.id).toBeDefined();
      expect(itinerary.userId).toBe(mockRequest.userId);

      // Verify it's stored
      const retrieved = await service.getItinerary(itinerary.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(itinerary.id);
    });

    it('should handle generation errors', async () => {
      const invalidRequest = {
        ...mockRequest,
        preferences: null as any
      };

      await expect(service.generateItinerary(invalidRequest))
        .rejects.toThrow('Failed to generate itinerary');
    });
  });

  describe('getItinerary', () => {
    it('should return null for non-existent itinerary', async () => {
      const result = await service.getItinerary('non-existent');
      expect(result).toBeNull();
    });

    it('should return existing itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      const retrieved = await service.getItinerary(itinerary.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(itinerary.id);
    });
  });

  describe('getUserItineraries', () => {
    it('should return user itineraries sorted by creation date', async () => {
      const itinerary1 = await service.generateItinerary(mockRequest);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const itinerary2 = await service.generateItinerary({
        ...mockRequest,
        startDate: new Date('2024-03-20'),
        endDate: new Date('2024-03-21')
      });

      const userItineraries = await service.getUserItineraries('user123');

      expect(userItineraries).toHaveLength(2);
      expect(userItineraries[0].createdAt.getTime())
        .toBeGreaterThanOrEqual(userItineraries[1].createdAt.getTime());
    });

    it('should return empty array for user with no itineraries', async () => {
      const userItineraries = await service.getUserItineraries('non-existent-user');
      expect(userItineraries).toHaveLength(0);
    });
  });

  describe('updateItinerary', () => {
    it('should update existing itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      const originalUpdatedAt = itinerary.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const updates = {
        title: 'Updated Title',
        description: 'Updated Description'
      };

      const updated = await service.updateItinerary(itinerary.id, updates);

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.description).toBe('Updated Description');
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should return null for non-existent itinerary', async () => {
      const result = await service.updateItinerary('non-existent', { title: 'New Title' });
      expect(result).toBeNull();
    });
  });

  describe('deleteItinerary', () => {
    it('should delete existing itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      
      const deleted = await service.deleteItinerary(itinerary.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getItinerary(itinerary.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent itinerary', async () => {
      const deleted = await service.deleteItinerary('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('modifyItinerary', () => {
    it('should apply modification successfully', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      
      const modification = {
        type: ModificationType.WEATHER_ADJUSTMENT,
        reason: 'Rain expected',
        timestamp: new Date()
      };

      const result = await service.modifyItinerary(itinerary.id, modification);

      expect(result.success).toBe(true);
      expect(result.itinerary).toBeDefined();
    });

    it('should handle non-existent itinerary', async () => {
      const modification = {
        type: ModificationType.WEATHER_ADJUSTMENT,
        reason: 'Test',
        timestamp: new Date()
      };

      const result = await service.modifyItinerary('non-existent', modification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Itinerary not found');
    });
  });

  describe('getModificationSuggestions', () => {
    it('should return suggestions for existing itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      const suggestions = await service.getModificationSuggestions(itinerary.id);

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return empty array for non-existent itinerary', async () => {
      const suggestions = await service.getModificationSuggestions('non-existent');
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('optimizeItinerary', () => {
    it('should optimize existing itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      
      const result = await service.optimizeItinerary(itinerary.id, mockRequest.preferences);

      expect(result.success).toBe(true);
      expect(result.itinerary).toBeDefined();
      expect(result.optimizationResult).toBeDefined();
      expect(result.optimizationResult!.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-existent itinerary', async () => {
      const result = await service.optimizeItinerary('non-existent', mockRequest.preferences);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Itinerary not found');
    });
  });

  describe('validateItinerary', () => {
    it('should validate existing itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      const validation = await service.validateItinerary(itinerary.id);

      expect(validation.isValid).toBe(true);
      expect(Array.isArray(validation.issues)).toBe(true);
    });

    it('should handle non-existent itinerary', async () => {
      const validation = await service.validateItinerary('non-existent');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Itinerary not found');
    });
  });

  describe('getItineraryStats', () => {
    it('should return stats for existing itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      const stats = await service.getItineraryStats(itinerary.id);

      expect(stats).toBeDefined();
      expect(typeof stats.totalActivities).toBe('number');
      expect(typeof stats.totalDuration).toBe('number');
      expect(typeof stats.totalCost).toBe('number');
      expect(typeof stats.totalWalkingDistance).toBe('number');
      expect(Array.isArray(stats.dailyStats)).toBe(true);
    });

    it('should return null for non-existent itinerary', async () => {
      const stats = await service.getItineraryStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('exportItinerary', () => {
    it('should export itinerary in JSON format', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      const exported = await service.exportItinerary(itinerary.id, 'json');

      expect(exported).toBeDefined();
      expect(exported.id).toBe(itinerary.id);
    });

    it('should export itinerary in PDF format', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      const exported = await service.exportItinerary(itinerary.id, 'pdf');

      expect(exported).toBeDefined();
      expect(exported.format).toBe('pdf');
    });

    it('should export itinerary in calendar format', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      const exported = await service.exportItinerary(itinerary.id, 'calendar');

      expect(exported).toBeDefined();
      expect(exported.format).toBe('ics');
      expect(Array.isArray(exported.events)).toBe(true);
    });

    it('should handle unsupported format', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      
      await expect(service.exportItinerary(itinerary.id, 'unsupported' as any))
        .rejects.toThrow('Unsupported export format');
    });

    it('should handle non-existent itinerary', async () => {
      await expect(service.exportItinerary('non-existent', 'json'))
        .rejects.toThrow('Itinerary not found');
    });
  });

  describe('shareItinerary', () => {
    it('should share itinerary with public link', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      
      const result = await service.shareItinerary(itinerary.id, { publicLink: true });

      expect(result.success).toBe(true);
      expect(result.shareUrl).toBeDefined();
      expect(result.shareUrl).toContain(itinerary.id);
    });

    it('should share itinerary via email', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      
      const result = await service.shareItinerary(itinerary.id, { 
        email: 'test@example.com',
        publicLink: true 
      });

      expect(result.success).toBe(true);
      expect(result.shareUrl).toBeDefined();
    });

    it('should handle non-existent itinerary', async () => {
      const result = await service.shareItinerary('non-existent', { publicLink: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Itinerary not found');
    });
  });
});