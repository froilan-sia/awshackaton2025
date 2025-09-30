import { 
  Itinerary, 
  ItineraryModification, 
  ModificationType, 
  ItineraryActivity,
  WeatherInfo,
  AttractionData,
  TransportationMode
} from '../types/itinerary';
import { ItineraryModel } from '../models/Itinerary';
import { WeatherService } from './weatherService';
import { AttractionService } from './attractionService';
import { TravelCalculationService } from './travelCalculationService';
import { addMinutes, isAfter, isBefore } from 'date-fns';

export class ItineraryModificationService {
  private weatherService: WeatherService;
  private attractionService: AttractionService;
  private travelService: TravelCalculationService;

  constructor() {
    this.weatherService = new WeatherService();
    this.attractionService = new AttractionService();
    this.travelService = new TravelCalculationService();
  }

  /**
   * Apply a modification to an itinerary
   */
  async applyModification(
    itinerary: ItineraryModel,
    modification: ItineraryModification
  ): Promise<{ success: boolean; updatedItinerary?: ItineraryModel; error?: string }> {
    try {
      const updatedItinerary = new ItineraryModel(itinerary);

      switch (modification.type) {
        case ModificationType.ADD_ACTIVITY:
          await this.addActivity(updatedItinerary, modification);
          break;
        
        case ModificationType.REMOVE_ACTIVITY:
          await this.removeActivity(updatedItinerary, modification);
          break;
        
        case ModificationType.REPLACE_ACTIVITY:
          await this.replaceActivity(updatedItinerary, modification);
          break;
        
        case ModificationType.RESCHEDULE_ACTIVITY:
          await this.rescheduleActivity(updatedItinerary, modification);
          break;
        
        case ModificationType.WEATHER_ADJUSTMENT:
          await this.applyWeatherAdjustment(updatedItinerary, modification);
          break;
        
        case ModificationType.CROWD_ADJUSTMENT:
          await this.applyCrowdAdjustment(updatedItinerary, modification);
          break;
        
        default:
          throw new Error(`Unknown modification type: ${modification.type}`);
      }

      // Validate the modified itinerary
      const validation = updatedItinerary.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: `Modification would create invalid itinerary: ${validation.issues.join(', ')}`
        };
      }

      return {
        success: true,
        updatedItinerary
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Suggest modifications based on real-time conditions
   */
  async suggestModifications(itinerary: ItineraryModel): Promise<ItineraryModification[]> {
    const suggestions: ItineraryModification[] = [];

    try {
      // Check weather conditions for upcoming activities
      const weatherSuggestions = await this.suggestWeatherModifications(itinerary);
      suggestions.push(...weatherSuggestions);

      // Check for crowd-related modifications
      const crowdSuggestions = await this.suggestCrowdModifications(itinerary);
      suggestions.push(...crowdSuggestions);

      // Check for time optimization opportunities
      const timeSuggestions = await this.suggestTimeOptimizations(itinerary);
      suggestions.push(...timeSuggestions);

      return suggestions;
    } catch (error) {
      console.error('Error generating modification suggestions:', error);
      return [];
    }
  }

  /**
   * Add a new activity to the itinerary
   */
  private async addActivity(
    itinerary: ItineraryModel,
    modification: ItineraryModification
  ): Promise<void> {
    if (!modification.newActivity) {
      throw new Error('New activity data required for ADD_ACTIVITY modification');
    }

    const newActivity = modification.newActivity as ItineraryActivity;
    
    // Find the appropriate day
    const targetDay = itinerary.days.find(day => 
      day.date.toDateString() === newActivity.startTime.toDateString()
    );

    if (!targetDay) {
      throw new Error('Target day not found in itinerary');
    }

    // Check for time conflicts
    const hasConflict = targetDay.activities.some(activity => 
      this.activitiesOverlap(activity, newActivity)
    );

    if (hasConflict) {
      // Try to reschedule the new activity
      const rescheduledActivity = await this.findAvailableTimeSlot(targetDay, newActivity);
      if (rescheduledActivity) {
        targetDay.activities.push(rescheduledActivity);
      } else {
        throw new Error('Cannot add activity - no available time slots');
      }
    } else {
      targetDay.activities.push(newActivity);
    }

    // Sort activities by start time
    targetDay.activities.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Recalculate travel times
    await this.recalculateTravelTimes(targetDay);
  }

  /**
   * Remove an activity from the itinerary
   */
  private async removeActivity(
    itinerary: ItineraryModel,
    modification: ItineraryModification
  ): Promise<void> {
    if (!modification.activityId) {
      throw new Error('Activity ID required for REMOVE_ACTIVITY modification');
    }

    const removed = itinerary.removeActivity(modification.activityId);
    if (!removed) {
      throw new Error('Activity not found');
    }

    // Recalculate travel times for affected days
    for (const day of itinerary.days) {
      await this.recalculateTravelTimes(day);
    }
  }

  /**
   * Replace an activity with another
   */
  private async replaceActivity(
    itinerary: ItineraryModel,
    modification: ItineraryModification
  ): Promise<void> {
    if (!modification.activityId || !modification.newActivity) {
      throw new Error('Activity ID and new activity data required for REPLACE_ACTIVITY modification');
    }

    // Find the activity to replace
    let targetDay = null;
    let targetActivity = null;

    for (const day of itinerary.days) {
      const activity = day.activities.find(a => a.id === modification.activityId);
      if (activity) {
        targetDay = day;
        targetActivity = activity;
        break;
      }
    }

    if (!targetDay || !targetActivity) {
      throw new Error('Activity to replace not found');
    }

    // Create new activity with same timing
    const newActivity: ItineraryActivity = {
      ...modification.newActivity as ItineraryActivity,
      startTime: targetActivity.startTime,
      endTime: addMinutes(targetActivity.startTime, modification.newActivity.duration || targetActivity.duration)
    };

    // Replace the activity
    const activityIndex = targetDay.activities.findIndex(a => a.id === modification.activityId);
    targetDay.activities[activityIndex] = newActivity;

    // Recalculate travel times
    await this.recalculateTravelTimes(targetDay);
  }

  /**
   * Reschedule an activity to a different time
   */
  private async rescheduleActivity(
    itinerary: ItineraryModel,
    modification: ItineraryModification
  ): Promise<void> {
    if (!modification.activityId || !modification.newActivity?.startTime) {
      throw new Error('Activity ID and new start time required for RESCHEDULE_ACTIVITY modification');
    }

    // Find the activity
    let targetDay = null;
    let targetActivity = null;

    for (const day of itinerary.days) {
      const activity = day.activities.find(a => a.id === modification.activityId);
      if (activity) {
        targetDay = day;
        targetActivity = activity;
        break;
      }
    }

    if (!targetDay || !targetActivity) {
      throw new Error('Activity to reschedule not found');
    }

    // Update timing
    const newStartTime = modification.newActivity.startTime;
    const newEndTime = addMinutes(newStartTime, targetActivity.duration);

    // Check for conflicts
    const hasConflict = targetDay.activities.some(activity => 
      activity.id !== modification.activityId && 
      this.activitiesOverlap(activity, { ...targetActivity, startTime: newStartTime, endTime: newEndTime })
    );

    if (hasConflict) {
      throw new Error('Cannot reschedule - time conflict with other activities');
    }

    // Update the activity
    targetActivity.startTime = newStartTime;
    targetActivity.endTime = newEndTime;

    // Sort activities by start time
    targetDay.activities.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Recalculate travel times
    await this.recalculateTravelTimes(targetDay);
  }

  /**
   * Apply weather-based adjustments
   */
  private async applyWeatherAdjustment(
    itinerary: ItineraryModel,
    modification: ItineraryModification
  ): Promise<void> {
    // Get current weather
    const currentWeather = await this.weatherService.getCurrentWeather();
    
    // Find weather-dependent activities that need adjustment
    for (const day of itinerary.days) {
      if (day.date.toDateString() === new Date().toDateString()) {
        const weatherDependentActivities = day.activities.filter(activity => activity.weatherDependent);
        
        for (const activity of weatherDependentActivities) {
          if (!this.weatherService.isOutdoorFriendly(currentWeather)) {
            // Suggest indoor alternatives
            const alternatives = await this.attractionService.getAttractionsByCategory('indoor');
            if (alternatives.length > 0) {
              const alternative = alternatives[0];
              
              // Replace with indoor alternative
              const newActivity: ItineraryActivity = {
                ...activity,
                attractionId: alternative.id,
                name: alternative.name,
                description: alternative.description,
                location: alternative.location,
                weatherDependent: false
              };

              const activityIndex = day.activities.findIndex(a => a.id === activity.id);
              day.activities[activityIndex] = newActivity;
            }
          }
        }
      }
    }

    // Recalculate travel times for affected days
    for (const day of itinerary.days) {
      await this.recalculateTravelTimes(day);
    }
  }

  /**
   * Apply crowd-based adjustments
   */
  private async applyCrowdAdjustment(
    itinerary: ItineraryModel,
    modification: ItineraryModification
  ): Promise<void> {
    // This would integrate with crowd monitoring service
    // For now, we'll implement basic logic
    
    const currentHour = new Date().getHours();
    const isRushHour = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 19);
    
    if (isRushHour) {
      // Suggest avoiding popular attractions during rush hours
      for (const day of itinerary.days) {
        if (day.date.toDateString() === new Date().toDateString()) {
          for (const activity of day.activities) {
            // Check if activity is during rush hour
            const activityHour = activity.startTime.getHours();
            if (activityHour >= 8 && activityHour <= 10 || activityHour >= 17 && activityHour <= 19) {
              // Suggest rescheduling to off-peak hours
              const newStartTime = new Date(activity.startTime);
              newStartTime.setHours(activityHour < 12 ? 11 : 15); // Move to 11 AM or 3 PM
              
              activity.startTime = newStartTime;
              activity.endTime = addMinutes(newStartTime, activity.duration);
            }
          }
          
          // Sort activities by start time
          day.activities.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
          
          // Recalculate travel times
          await this.recalculateTravelTimes(day);
        }
      }
    }
  }

  /**
   * Suggest weather-based modifications
   */
  private async suggestWeatherModifications(itinerary: ItineraryModel): Promise<ItineraryModification[]> {
    const suggestions: ItineraryModification[] = [];
    
    try {
      const currentWeather = await this.weatherService.getCurrentWeather();
      
      if (!this.weatherService.isOutdoorFriendly(currentWeather)) {
        // Find upcoming outdoor activities
        const today = new Date();
        const todayActivities = itinerary.getActivitiesForDate(today);
        
        for (const activity of todayActivities) {
          if (activity.weatherDependent && isAfter(activity.startTime, new Date())) {
            suggestions.push({
              type: ModificationType.WEATHER_ADJUSTMENT,
              activityId: activity.id,
              reason: `Weather conditions not suitable for outdoor activity: ${currentWeather.description}`,
              timestamp: new Date()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error generating weather suggestions:', error);
    }
    
    return suggestions;
  }

  /**
   * Suggest crowd-based modifications
   */
  private async suggestCrowdModifications(itinerary: ItineraryModel): Promise<ItineraryModification[]> {
    const suggestions: ItineraryModification[] = [];
    
    // This would integrate with real crowd monitoring
    // For now, we'll suggest avoiding peak hours at popular attractions
    
    const currentHour = new Date().getHours();
    const isPeakHour = currentHour >= 10 && currentHour <= 16; // Tourist peak hours
    
    if (isPeakHour) {
      const today = new Date();
      const todayActivities = itinerary.getActivitiesForDate(today);
      
      for (const activity of todayActivities) {
        // Check if it's a popular attraction during peak hours
        if (activity.name.includes('Peak') || activity.name.includes('Temple') || activity.name.includes('Market')) {
          if (activity.startTime.getHours() >= 10 && activity.startTime.getHours() <= 16) {
            suggestions.push({
              type: ModificationType.CROWD_ADJUSTMENT,
              activityId: activity.id,
              reason: 'High crowd levels expected at this time. Consider visiting earlier or later.',
              timestamp: new Date()
            });
          }
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Suggest time optimization modifications
   */
  private async suggestTimeOptimizations(itinerary: ItineraryModel): Promise<ItineraryModification[]> {
    const suggestions: ItineraryModification[] = [];
    
    // Look for inefficient travel routes
    for (const day of itinerary.days) {
      for (let i = 0; i < day.activities.length - 1; i++) {
        const current = day.activities[i];
        const next = day.activities[i + 1];
        
        if (current.travelFromPrevious && current.travelFromPrevious.duration > 60) {
          // Suggest reordering if travel time is too long
          suggestions.push({
            type: ModificationType.RESCHEDULE_ACTIVITY,
            activityId: next.id,
            reason: `Long travel time (${current.travelFromPrevious.duration} minutes) between activities. Consider reordering.`,
            timestamp: new Date()
          });
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Check if two activities overlap in time
   */
  private activitiesOverlap(activity1: ItineraryActivity, activity2: ItineraryActivity): boolean {
    return (
      (activity1.startTime < activity2.endTime && activity1.endTime > activity2.startTime) ||
      (activity2.startTime < activity1.endTime && activity2.endTime > activity1.startTime)
    );
  }

  /**
   * Find an available time slot for an activity
   */
  private async findAvailableTimeSlot(
    day: any,
    activity: ItineraryActivity
  ): Promise<ItineraryActivity | null> {
    const sortedActivities = [...day.activities].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );

    // Try to fit the activity between existing activities
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i];
      const next = sortedActivities[i + 1];
      
      const availableTime = next.startTime.getTime() - current.endTime.getTime();
      const requiredTime = activity.duration * 60000; // Convert minutes to milliseconds
      
      if (availableTime >= requiredTime) {
        // Found a slot
        const newStartTime = new Date(current.endTime);
        const newEndTime = addMinutes(newStartTime, activity.duration);
        
        return {
          ...activity,
          startTime: newStartTime,
          endTime: newEndTime
        };
      }
    }

    // Try to fit at the end of the day
    if (sortedActivities.length > 0) {
      const lastActivity = sortedActivities[sortedActivities.length - 1];
      const newStartTime = new Date(lastActivity.endTime);
      const newEndTime = addMinutes(newStartTime, activity.duration);
      
      // Check if it fits within reasonable hours (before 10 PM)
      if (newEndTime.getHours() < 22) {
        return {
          ...activity,
          startTime: newStartTime,
          endTime: newEndTime
        };
      }
    }

    return null; // No available slot found
  }

  /**
   * Recalculate travel times for a day's activities
   */
  private async recalculateTravelTimes(day: any): Promise<void> {
    for (let i = 1; i < day.activities.length; i++) {
      const previous = day.activities[i - 1];
      const current = day.activities[i];
      
      // Calculate travel from previous activity
      const travelInfo = await this.travelService.calculateTravel(
        previous.location,
        current.location,
        [TransportationMode.WALKING, TransportationMode.MTR] // Default transportation modes
      );
      
      current.travelFromPrevious = travelInfo;
    }
    
    // Clear travel info for first activity
    if (day.activities.length > 0) {
      day.activities[0].travelFromPrevious = undefined;
    }
  }
}