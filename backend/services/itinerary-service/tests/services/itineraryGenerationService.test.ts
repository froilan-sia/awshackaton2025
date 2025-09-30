import { ItineraryGenerationService } from '../../src/services/itineraryGenerationService';
import { ItineraryRequest, GroupType, ActivityLevel, TransportationMode } from '../../src/types/itinerary';

describe('ItineraryGenerationService', () => {
  let service: ItineraryGenerationService;

  beforeEach(() => {
    service = new ItineraryGenerationService();
  });

  describe('generateItinerary', () => {
    const mockRequest: ItineraryRequest = {
      userId: 'user123',
      preferences: {
        interests: ['scenic', 'cultural', 'food'],
        budgetRange: { min: 100, max: 500, currency: 'HKD' },
        groupType: GroupType.COUPLE,
        dietaryRestrictions: [],
        activityLevel: ActivityLevel.MODERATE,
        accessibilityNeeds: [],
        language: 'en'
      },
      startDate: new Date('2024-03-15'),
      endDate: new Date('2024-03-17'),
      startLocation: { latitude: 22.2819, longitude: 114.1578 }
    };

    it('should generate a valid itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);

      expect(itinerary).toBeDefined();
      expect(itinerary.userId).toBe(mockRequest.userId);
      expect(itinerary.startDate).toEqual(mockRequest.startDate);
      expect(itinerary.endDate).toEqual(mockRequest.endDate);
      expect(itinerary.days).toHaveLength(3); // 3 days
      expect(itinerary.title).toContain('3-Day Hong Kong');
    });

    it('should include activities matching user interests', async () => {
      const itinerary = await service.generateItinerary(mockRequest);

      const allActivities = itinerary.days.flatMap(day => day.activities);
      const hasMatchingInterests = allActivities.some(activity => 
        mockRequest.preferences.interests.some(interest => 
          activity.category.includes(interest)
        )
      );

      expect(hasMatchingInterests).toBe(true);
    });

    it('should respect budget constraints', async () => {
      const itinerary = await service.generateItinerary(mockRequest);

      const dailyBudget = mockRequest.preferences.budgetRange.max;
      itinerary.days.forEach(day => {
        expect(day.estimatedCost).toBeLessThanOrEqual(dailyBudget);
      });
    });

    it('should include weather considerations', async () => {
      const itinerary = await service.generateItinerary(mockRequest);

      expect(itinerary.weatherConsiderations).toBeDefined();
      expect(itinerary.weatherConsiderations.length).toBeGreaterThan(0);
    });

    it('should handle single day itinerary', async () => {
      const singleDayRequest = {
        ...mockRequest,
        endDate: new Date('2024-03-15') // Same as start date
      };

      const itinerary = await service.generateItinerary(singleDayRequest);

      expect(itinerary.days).toHaveLength(1);
    });

    it('should handle different activity levels', async () => {
      const highActivityRequest = {
        ...mockRequest,
        preferences: {
          ...mockRequest.preferences,
          activityLevel: ActivityLevel.HIGH
        }
      };

      const itinerary = await service.generateItinerary(highActivityRequest);
      const avgActivitiesPerDay = itinerary.days.reduce((sum, day) => 
        sum + day.activities.length, 0) / itinerary.days.length;

      expect(avgActivitiesPerDay).toBeGreaterThan(3); // High activity should have more activities
    });

    it('should handle weather-dependent activity filtering', async () => {
      // This would test weather-based filtering
      // For now, we'll just ensure the service handles it without errors
      const itinerary = await service.generateItinerary(mockRequest);
      
      expect(itinerary).toBeDefined();
      expect(itinerary.days.every(day => day.activities.length > 0)).toBe(true);
    });

    it('should validate generated itinerary', async () => {
      const itinerary = await service.generateItinerary(mockRequest);
      
      // Check that activities don't overlap
      itinerary.days.forEach(day => {
        const sortedActivities = day.activities.sort((a, b) => 
          a.startTime.getTime() - b.startTime.getTime()
        );

        for (let i = 0; i < sortedActivities.length - 1; i++) {
          const current = sortedActivities[i];
          const next = sortedActivities[i + 1];
          expect(current.endTime.getTime()).toBeLessThanOrEqual(next.startTime.getTime());
        }
      });
    });

    it('should handle constraints', async () => {
      const constrainedRequest = {
        ...mockRequest,
        constraints: {
          maxDailyWalkingDistance: 5000, // 5km max
          preferredStartTime: '09:00',
          preferredEndTime: '18:00',
          mustIncludeAttractions: ['hk-001'], // Victoria Peak
          excludeAttractions: ['hk-002'],
          transportationModes: [TransportationMode.WALKING, TransportationMode.MTR]
        }
      };

      const itinerary = await service.generateItinerary(constrainedRequest);

      // Check that must-include attractions are included
      const allActivities = itinerary.days.flatMap(day => day.activities);
      const hasRequiredAttraction = allActivities.some(activity => 
        activity.attractionId === 'hk-001'
      );
      expect(hasRequiredAttraction).toBe(true);

      // Check that excluded attractions are not included
      const hasExcludedAttraction = allActivities.some(activity => 
        activity.attractionId === 'hk-002'
      );
      expect(hasExcludedAttraction).toBe(false);

      // Check walking distance constraints
      itinerary.days.forEach(day => {
        expect(day.totalWalkingDistance).toBeLessThanOrEqual(5000);
      });
    });

    it('should handle errors gracefully', async () => {
      const invalidRequest = {
        ...mockRequest,
        startDate: new Date('invalid-date')
      } as any;

      await expect(service.generateItinerary(invalidRequest))
        .rejects.toThrow('Failed to generate itinerary');
    });
  });
});