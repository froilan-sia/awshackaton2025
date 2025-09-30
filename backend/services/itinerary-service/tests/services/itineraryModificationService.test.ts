import { ItineraryModificationService } from '../../src/services/itineraryModificationService';
import { ItineraryModel } from '../../src/models/Itinerary';
import { ModificationType, ItineraryActivity } from '../../src/types/itinerary';

describe('ItineraryModificationService', () => {
  let service: ItineraryModificationService;
  let mockItinerary: ItineraryModel;

  beforeEach(() => {
    service = new ItineraryModificationService();
    
    // Create a mock itinerary
    mockItinerary = new ItineraryModel({
      id: 'itinerary123',
      userId: 'user123',
      title: 'Test Itinerary',
      description: 'Test description',
      startDate: new Date('2024-03-15'),
      endDate: new Date('2024-03-15'),
      days: [{
        date: new Date('2024-03-15'),
        activities: [{
          id: 'activity1',
          attractionId: 'hk-001',
          name: 'Victoria Peak',
          description: 'Scenic viewpoint',
          location: { latitude: 22.2711, longitude: 114.1489 },
          startTime: new Date('2024-03-15T09:00:00'),
          endTime: new Date('2024-03-15T12:00:00'),
          duration: 180,
          category: 'scenic',
          estimatedCost: 65,
          weatherDependent: true,
          practicalTips: []
        }],
        totalDuration: 180,
        totalWalkingDistance: 0,
        estimatedCost: 65
      }]
    });
  });

  describe('applyModification', () => {
    it('should add a new activity successfully', async () => {
      const newActivity: Partial<ItineraryActivity> = {
        id: 'activity2',
        attractionId: 'hk-002',
        name: 'Star Ferry',
        description: 'Historic ferry service',
        location: { latitude: 22.2944, longitude: 114.1691 },
        startTime: new Date('2024-03-15T14:00:00'),
        endTime: new Date('2024-03-15T15:00:00'),
        duration: 60,
        category: 'transport',
        estimatedCost: 3,
        weatherDependent: false,
        practicalTips: []
      };

      const modification = {
        type: ModificationType.ADD_ACTIVITY,
        newActivity,
        reason: 'User requested addition',
        timestamp: new Date()
      };

      const result = await service.applyModification(mockItinerary, modification);

      expect(result.success).toBe(true);
      expect(result.updatedItinerary).toBeDefined();
      expect(result.updatedItinerary!.days[0].activities).toHaveLength(2);
    });

    it('should remove an activity successfully', async () => {
      const modification = {
        type: ModificationType.REMOVE_ACTIVITY,
        activityId: 'activity1',
        reason: 'User requested removal',
        timestamp: new Date()
      };

      const result = await service.applyModification(mockItinerary, modification);

      expect(result.success).toBe(true);
      expect(result.updatedItinerary).toBeDefined();
      expect(result.updatedItinerary!.days[0].activities).toHaveLength(0);
    });

    it('should replace an activity successfully', async () => {
      const newActivity: Partial<ItineraryActivity> = {
        attractionId: 'hk-003',
        name: 'Temple Street Night Market',
        description: 'Night market',
        location: { latitude: 22.3112, longitude: 114.1696 },
        duration: 120,
        category: 'market',
        estimatedCost: 150,
        weatherDependent: true,
        practicalTips: []
      };

      const modification = {
        type: ModificationType.REPLACE_ACTIVITY,
        activityId: 'activity1',
        newActivity,
        reason: 'Better alternative',
        timestamp: new Date()
      };

      const result = await service.applyModification(mockItinerary, modification);

      expect(result.success).toBe(true);
      expect(result.updatedItinerary).toBeDefined();
      expect(result.updatedItinerary!.days[0].activities[0].name).toBe('Temple Street Night Market');
    });

    it('should reschedule an activity successfully', async () => {
      const newStartTime = new Date('2024-03-15T15:00:00');
      
      const modification = {
        type: ModificationType.RESCHEDULE_ACTIVITY,
        activityId: 'activity1',
        newActivity: { startTime: newStartTime },
        reason: 'Better timing',
        timestamp: new Date()
      };

      const result = await service.applyModification(mockItinerary, modification);

      expect(result.success).toBe(true);
      expect(result.updatedItinerary).toBeDefined();
      expect(result.updatedItinerary!.days[0].activities[0].startTime).toEqual(newStartTime);
    });

    it('should handle weather adjustments', async () => {
      const modification = {
        type: ModificationType.WEATHER_ADJUSTMENT,
        reason: 'Rain expected',
        timestamp: new Date()
      };

      const result = await service.applyModification(mockItinerary, modification);

      expect(result.success).toBe(true);
      expect(result.updatedItinerary).toBeDefined();
    });

    it('should handle crowd adjustments', async () => {
      const modification = {
        type: ModificationType.CROWD_ADJUSTMENT,
        reason: 'High crowd levels',
        timestamp: new Date()
      };

      const result = await service.applyModification(mockItinerary, modification);

      expect(result.success).toBe(true);
      expect(result.updatedItinerary).toBeDefined();
    });

    it('should reject invalid modifications', async () => {
      const modification = {
        type: ModificationType.ADD_ACTIVITY,
        // Missing newActivity
        reason: 'Invalid modification',
        timestamp: new Date()
      };

      const result = await service.applyModification(mockItinerary, modification);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should prevent time conflicts when adding activities', async () => {
      const conflictingActivity: Partial<ItineraryActivity> = {
        id: 'activity2',
        attractionId: 'hk-002',
        name: 'Conflicting Activity',
        description: 'This conflicts with existing activity',
        location: { latitude: 22.2944, longitude: 114.1691 },
        startTime: new Date('2024-03-15T10:00:00'), // Conflicts with activity1
        endTime: new Date('2024-03-15T11:00:00'),
        duration: 60,
        category: 'test',
        estimatedCost: 0,
        weatherDependent: false,
        practicalTips: []
      };

      const modification = {
        type: ModificationType.ADD_ACTIVITY,
        newActivity: conflictingActivity,
        reason: 'Test conflict handling',
        timestamp: new Date()
      };

      const result = await service.applyModification(mockItinerary, modification);

      // Should either succeed by rescheduling or fail gracefully
      if (result.success) {
        // If successful, the activity should be rescheduled to avoid conflict
        const activities = result.updatedItinerary!.days[0].activities;
        expect(activities).toHaveLength(2);
        
        // Check that activities don't overlap
        const sortedActivities = activities.sort((a, b) => 
          a.startTime.getTime() - b.startTime.getTime()
        );
        expect(sortedActivities[0].endTime.getTime())
          .toBeLessThanOrEqual(sortedActivities[1].startTime.getTime());
      } else {
        expect(result.error).toContain('conflict');
      }
    });
  });

  describe('suggestModifications', () => {
    it('should suggest weather-based modifications', async () => {
      const suggestions = await service.suggestModifications(mockItinerary);

      expect(Array.isArray(suggestions)).toBe(true);
      // Suggestions may be empty if weather is good, but should not throw
    });

    it('should suggest crowd-based modifications', async () => {
      const suggestions = await service.suggestModifications(mockItinerary);

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should suggest time optimizations', async () => {
      // Add another activity with long travel time to trigger optimization suggestions
      mockItinerary.days[0].activities.push({
        id: 'activity2',
        attractionId: 'hk-002',
        name: 'Distant Activity',
        description: 'Far away activity',
        location: { latitude: 22.5, longitude: 114.5 }, // Far location
        startTime: new Date('2024-03-15T13:00:00'),
        endTime: new Date('2024-03-15T14:00:00'),
        duration: 60,
        category: 'test',
        estimatedCost: 0,
        weatherDependent: false,
        practicalTips: [],
        travelFromPrevious: {
          mode: 'walking' as any,
          duration: 90, // Long travel time
          distance: 5000,
          cost: 0,
          instructions: ['Walk very far']
        }
      });

      const suggestions = await service.suggestModifications(mockItinerary);

      expect(Array.isArray(suggestions)).toBe(true);
      // Should suggest reordering due to long travel time
      const hasTimeOptimization = suggestions.some(s => 
        s.reason.includes('travel time') || s.reason.includes('reordering')
      );
      expect(hasTimeOptimization).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Create an invalid itinerary
      const invalidItinerary = new ItineraryModel({
        id: 'invalid',
        userId: 'user123',
        title: 'Invalid',
        description: 'Invalid itinerary',
        startDate: new Date('invalid'),
        endDate: new Date('invalid'),
        days: []
      });

      const suggestions = await service.suggestModifications(invalidItinerary);

      expect(Array.isArray(suggestions)).toBe(true);
      // Should return empty array instead of throwing
    });
  });
});