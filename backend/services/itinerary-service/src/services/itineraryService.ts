import { 
  ItineraryRequest, 
  Itinerary, 
  ItineraryModification,
  OptimizationResult,
  UserPreferences
} from '../types/itinerary';
import { ItineraryModel } from '../models/Itinerary';
import { ItineraryGenerationService } from './itineraryGenerationService';
import { ItineraryModificationService } from './itineraryModificationService';

export class ItineraryService {
  private generationService: ItineraryGenerationService;
  private modificationService: ItineraryModificationService;
  private itineraries: Map<string, ItineraryModel>; // In-memory storage for demo

  constructor() {
    this.generationService = new ItineraryGenerationService();
    this.modificationService = new ItineraryModificationService();
    this.itineraries = new Map();
  }

  /**
   * Generate a new personalized itinerary
   */
  async generateItinerary(request: ItineraryRequest): Promise<Itinerary> {
    try {
      const itinerary = await this.generationService.generateItinerary(request);
      
      // Store the itinerary
      this.itineraries.set(itinerary.id, itinerary as ItineraryModel);
      
      return itinerary;
    } catch (error) {
      throw new Error(`Failed to generate itinerary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get an existing itinerary by ID
   */
  async getItinerary(itineraryId: string): Promise<Itinerary | null> {
    const itinerary = this.itineraries.get(itineraryId);
    return itinerary || null;
  }

  /**
   * Get all itineraries for a user
   */
  async getUserItineraries(userId: string): Promise<Itinerary[]> {
    const userItineraries: Itinerary[] = [];
    
    for (const itinerary of this.itineraries.values()) {
      if (itinerary.userId === userId) {
        userItineraries.push(itinerary);
      }
    }
    
    return userItineraries.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Update an existing itinerary
   */
  async updateItinerary(
    itineraryId: string, 
    updates: Partial<Itinerary>
  ): Promise<Itinerary | null> {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) {
      return null;
    }

    // Apply updates
    Object.assign(itinerary, updates);
    itinerary.updatedAt = new Date();

    return itinerary;
  }

  /**
   * Delete an itinerary
   */
  async deleteItinerary(itineraryId: string): Promise<boolean> {
    return this.itineraries.delete(itineraryId);
  }

  /**
   * Apply a modification to an itinerary
   */
  async modifyItinerary(
    itineraryId: string,
    modification: ItineraryModification
  ): Promise<{ success: boolean; itinerary?: Itinerary; error?: string }> {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) {
      return {
        success: false,
        error: 'Itinerary not found'
      };
    }

    const result = await this.modificationService.applyModification(itinerary, modification);
    
    if (result.success && result.updatedItinerary) {
      // Update the stored itinerary
      this.itineraries.set(itineraryId, result.updatedItinerary);
      
      return {
        success: true,
        itinerary: result.updatedItinerary
      };
    }

    return {
      success: false,
      error: result.error
    };
  }

  /**
   * Get modification suggestions for an itinerary
   */
  async getModificationSuggestions(itineraryId: string): Promise<ItineraryModification[]> {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) {
      return [];
    }

    return await this.modificationService.suggestModifications(itinerary);
  }

  /**
   * Optimize an existing itinerary
   */
  async optimizeItinerary(
    itineraryId: string,
    preferences: UserPreferences
  ): Promise<{ success: boolean; itinerary?: Itinerary; optimizationResult?: OptimizationResult; error?: string }> {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) {
      return {
        success: false,
        error: 'Itinerary not found'
      };
    }

    try {
      // Get current optimization score
      const currentScore = itinerary.getOptimizationScore(preferences);
      
      // Apply optimizations (this would be more sophisticated in production)
      await this.applyOptimizations(itinerary, preferences);
      
      // Get new optimization score
      const newScore = itinerary.getOptimizationScore(preferences);
      
      return {
        success: true,
        itinerary,
        optimizationResult: newScore
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate an itinerary for feasibility
   */
  async validateItinerary(itineraryId: string): Promise<{ isValid: boolean; issues: string[] }> {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) {
      return {
        isValid: false,
        issues: ['Itinerary not found']
      };
    }

    return itinerary.validate();
  }

  /**
   * Get itinerary statistics
   */
  async getItineraryStats(itineraryId: string): Promise<any> {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) {
      return null;
    }

    const totalActivities = itinerary.days.reduce((sum, day) => sum + day.activities.length, 0);
    const totalDuration = itinerary.getTotalDuration();
    const avgActivitiesPerDay = totalActivities / itinerary.days.length;
    
    // Calculate category distribution
    const categoryCount: { [key: string]: number } = {};
    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        categoryCount[activity.category] = (categoryCount[activity.category] || 0) + 1;
      }
    }

    // Calculate daily stats
    const dailyStats = itinerary.days.map(day => ({
      date: day.date,
      activities: day.activities.length,
      duration: day.totalDuration,
      cost: day.estimatedCost,
      walkingDistance: day.totalWalkingDistance
    }));

    return {
      totalActivities,
      totalDuration,
      totalCost: itinerary.totalEstimatedCost,
      totalWalkingDistance: itinerary.totalWalkingDistance,
      avgActivitiesPerDay: Math.round(avgActivitiesPerDay * 10) / 10,
      categoryDistribution: categoryCount,
      dailyStats
    };
  }

  /**
   * Export itinerary to different formats
   */
  async exportItinerary(
    itineraryId: string, 
    format: 'json' | 'pdf' | 'calendar'
  ): Promise<any> {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) {
      throw new Error('Itinerary not found');
    }

    switch (format) {
      case 'json':
        return itinerary.toJSON();
      
      case 'pdf':
        // This would generate a PDF document
        return this.generatePDFExport(itinerary);
      
      case 'calendar':
        // This would generate calendar events
        return this.generateCalendarExport(itinerary);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Share an itinerary with others
   */
  async shareItinerary(
    itineraryId: string,
    shareOptions: { email?: string; publicLink?: boolean; permissions?: string[] }
  ): Promise<{ success: boolean; shareUrl?: string; error?: string }> {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) {
      return {
        success: false,
        error: 'Itinerary not found'
      };
    }

    try {
      // Generate share URL (in production, this would create a secure sharing mechanism)
      const shareUrl = `https://hk-tourism-ai.com/shared/${itineraryId}`;
      
      // If email sharing is requested
      if (shareOptions.email) {
        await this.sendItineraryByEmail(itinerary, shareOptions.email);
      }

      return {
        success: true,
        shareUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Apply optimizations to an itinerary
   */
  private async applyOptimizations(
    itinerary: ItineraryModel,
    preferences: UserPreferences
  ): Promise<void> {
    // This would implement sophisticated optimization algorithms
    // For now, we'll do basic optimizations

    for (const day of itinerary.days) {
      // Remove activities that don't match preferences well
      day.activities = day.activities.filter(activity => {
        const matchingInterests = preferences.interests.some(interest => 
          activity.category.includes(interest)
        );
        return matchingInterests || activity.estimatedCost === 0; // Keep free activities
      });

      // Optimize activity order for minimal travel time
      if (day.activities.length > 1) {
        day.activities = await this.optimizeActivityOrder(day.activities);
      }
    }

    // Recalculate totals
    itinerary['recalculateTotals']();
  }

  /**
   * Optimize the order of activities to minimize travel time
   */
  private async optimizeActivityOrder(activities: any[]): Promise<any[]> {
    if (activities.length <= 2) return activities;

    // Simple nearest-neighbor optimization
    const optimized = [activities[0]]; // Start with first activity
    const remaining = activities.slice(1);

    while (remaining.length > 0) {
      const current = optimized[optimized.length - 1];
      
      // Find nearest remaining activity
      let nearestIndex = 0;
      let minDistance = this.calculateDistance(current.location, remaining[0].location);

      for (let i = 1; i < remaining.length; i++) {
        const distance = this.calculateDistance(current.location, remaining[i].location);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      optimized.push(remaining[nearestIndex]);
      remaining.splice(nearestIndex, 1);
    }

    return optimized;
  }

  /**
   * Calculate distance between two locations
   */
  private calculateDistance(
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Return distance in meters
  }

  /**
   * Generate PDF export (placeholder)
   */
  private generatePDFExport(itinerary: ItineraryModel): any {
    // This would use a PDF generation library
    return {
      format: 'pdf',
      content: `PDF export for itinerary: ${itinerary.title}`,
      downloadUrl: `/api/itinerary/${itinerary.id}/export.pdf`
    };
  }

  /**
   * Generate calendar export (placeholder)
   */
  private generateCalendarExport(itinerary: ItineraryModel): any {
    // This would generate ICS calendar format
    const events = [];
    
    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        events.push({
          title: activity.name,
          start: activity.startTime.toISOString(),
          end: activity.endTime.toISOString(),
          description: activity.description,
          location: activity.location.address || `${activity.location.latitude},${activity.location.longitude}`
        });
      }
    }

    return {
      format: 'ics',
      events,
      downloadUrl: `/api/itinerary/${itinerary.id}/export.ics`
    };
  }

  /**
   * Send itinerary by email (placeholder)
   */
  private async sendItineraryByEmail(itinerary: ItineraryModel, email: string): Promise<void> {
    // This would integrate with an email service
    console.log(`Sending itinerary ${itinerary.title} to ${email}`);
    
    // Email would contain:
    // - Itinerary summary
    // - Daily schedules
    // - Practical tips
    // - Weather considerations
    // - Contact information
  }
}