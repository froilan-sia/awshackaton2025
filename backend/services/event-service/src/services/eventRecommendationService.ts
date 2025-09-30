import { EventModel } from '../models/Event';
import { Event, EventCategory, EventSource } from '../types/event';

export interface EventFilters {
  categories?: EventCategory[];
  sources?: EventSource[];
  districts?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  isFree?: boolean;
  weatherDependent?: boolean;
  targetAudience?: string[];
  maxDistance?: number; // in kilometers
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface UserPreferences {
  interests: string[];
  budgetRange: 'low' | 'medium' | 'high';
  groupType: 'solo' | 'couple' | 'family' | 'friends';
  ageGroup: 'child' | 'adult' | 'senior';
  language: string;
  accessibilityNeeds?: string[];
}

export interface RecommendationScore {
  event: Event;
  score: number;
  reasons: string[];
}

export class EventRecommendationService {
  /**
   * Get filtered events based on criteria
   */
  async getFilteredEvents(filters: EventFilters): Promise<Event[]> {
    const query: any = {};

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      query.categories = { $in: filters.categories };
    }

    // Source filter
    if (filters.sources && filters.sources.length > 0) {
      query.source = { $in: filters.sources };
    }

    // District filter
    if (filters.districts && filters.districts.length > 0) {
      query['location.district'] = { $in: filters.districts };
    }

    // Date range filter
    if (filters.dateRange) {
      query.$and = [
        { startTime: { $gte: filters.dateRange.start } },
        { endTime: { $lte: filters.dateRange.end } }
      ];
    }

    // Free events filter
    if (filters.isFree !== undefined) {
      query['pricing.isFree'] = filters.isFree;
    }

    // Weather dependent filter
    if (filters.weatherDependent !== undefined) {
      query.weatherDependent = filters.weatherDependent;
    }

    // Target audience filter
    if (filters.targetAudience && filters.targetAudience.length > 0) {
      query.targetAudience = { $in: filters.targetAudience };
    }

    let events = await EventModel.find(query).lean();

    // Distance filter (if user location provided)
    if (filters.userLocation && filters.maxDistance) {
      events = events.filter(event => {
        const distance = this.calculateDistance(
          filters.userLocation!.latitude,
          filters.userLocation!.longitude,
          event.location.latitude,
          event.location.longitude
        );
        return distance <= filters.maxDistance!;
      });
    }

    return events;
  }

  /**
   * Get personalized event recommendations
   */
  async getPersonalizedRecommendations(
    userPreferences: UserPreferences,
    filters?: EventFilters,
    limit: number = 20
  ): Promise<RecommendationScore[]> {
    // Get base filtered events
    const events = await this.getFilteredEvents(filters || {});
    
    // Score each event based on user preferences
    const scoredEvents = events.map(event => {
      const score = this.calculatePersonalizationScore(event, userPreferences);
      return score;
    });

    // Sort by score and return top recommendations
    return scoredEvents
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get events happening nearby a location
   */
  async getNearbyEvents(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 10
  ): Promise<Event[]> {
    const events = await EventModel.find({
      startTime: { $gte: new Date() }, // Only future events
      endTime: { $gte: new Date() }
    }).lean();

    // Filter by distance and sort by proximity
    const nearbyEvents = events
      .map(event => ({
        event,
        distance: this.calculateDistance(latitude, longitude, event.location.latitude, event.location.longitude)
      }))
      .filter(item => item.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(item => item.event);

    return nearbyEvents;
  }

  /**
   * Get events by category with local insights
   */
  async getEventsByCategory(
    category: EventCategory,
    includeLocalInsights: boolean = true
  ): Promise<Event[]> {
    const query: any = {
      categories: category,
      startTime: { $gte: new Date() }
    };

    let events = await EventModel.find(query).lean();

    if (includeLocalInsights) {
      // Sort by local popularity and authenticity score
      events = events.sort((a, b) => {
        const scoreA = (a.localPerspective.localPopularity + a.localPerspective.authenticityScore) / 2;
        const scoreB = (b.localPerspective.localPopularity + b.localPerspective.authenticityScore) / 2;
        return scoreB - scoreA;
      });
    }

    return events;
  }

  /**
   * Calculate personalization score for an event
   */
  private calculatePersonalizationScore(event: Event, preferences: UserPreferences): RecommendationScore {
    let score = 0;
    const reasons: string[] = [];

    // Interest matching (40% of score)
    const interestScore = this.calculateInterestScore(event, preferences.interests);
    score += interestScore * 0.4;
    if (interestScore > 0.7) {
      reasons.push('Matches your interests');
    }

    // Budget compatibility (20% of score)
    const budgetScore = this.calculateBudgetScore(event, preferences.budgetRange);
    score += budgetScore * 0.2;
    if (budgetScore > 0.8) {
      reasons.push('Within your budget range');
    }

    // Group type compatibility (20% of score)
    const groupScore = this.calculateGroupScore(event, preferences.groupType);
    score += groupScore * 0.2;
    if (groupScore > 0.7) {
      reasons.push(`Perfect for ${preferences.groupType} activities`);
    }

    // Local authenticity (10% of score)
    const authenticityScore = event.localPerspective.authenticityScore / 10;
    score += authenticityScore * 0.1;
    if (event.localPerspective.authenticityScore >= 8) {
      reasons.push('Highly authentic local experience');
    }

    // Local popularity (10% of score)
    const popularityScore = event.localPerspective.localPopularity / 10;
    score += popularityScore * 0.1;
    if (event.localPerspective.localPopularity >= 8) {
      reasons.push('Popular with locals');
    }

    // Accessibility bonus
    if (preferences.accessibilityNeeds && preferences.accessibilityNeeds.length > 0) {
      if (event.practicalInfo.accessibility.wheelchairAccessible) {
        score += 0.1;
        reasons.push('Wheelchair accessible');
      }
    }

    return {
      event,
      score: Math.min(score, 1), // Cap at 1.0
      reasons
    };
  }

  /**
   * Calculate interest matching score
   */
  private calculateInterestScore(event: Event, interests: string[]): number {
    if (interests.length === 0) return 0.5; // Neutral score if no interests specified

    const eventKeywords = [
      ...event.categories.map(cat => cat.toLowerCase()),
      ...event.tags.map(tag => tag.toLowerCase()),
      event.title.toLowerCase(),
      event.description.toLowerCase()
    ].join(' ');

    let matches = 0;
    for (const interest of interests) {
      if (eventKeywords.includes(interest.toLowerCase())) {
        matches++;
      }
    }

    return Math.min(matches / interests.length, 1);
  }

  /**
   * Calculate budget compatibility score
   */
  private calculateBudgetScore(event: Event, budgetRange: string): number {
    if (event.pricing.isFree) return 1.0; // Free events always score high

    const avgPrice = event.pricing.ticketPrices.length > 0
      ? event.pricing.ticketPrices.reduce((sum, ticket) => sum + ticket.price, 0) / event.pricing.ticketPrices.length
      : 0;

    switch (budgetRange) {
      case 'low':
        return avgPrice <= 100 ? 1.0 : avgPrice <= 200 ? 0.7 : 0.3;
      case 'medium':
        return avgPrice <= 300 ? 1.0 : avgPrice <= 500 ? 0.8 : 0.5;
      case 'high':
        return 1.0; // High budget users are flexible
      default:
        return 0.5;
    }
  }

  /**
   * Calculate group type compatibility score
   */
  private calculateGroupScore(event: Event, groupType: string): number {
    const targetAudience = event.targetAudience.map(audience => audience.toLowerCase());

    switch (groupType) {
      case 'family':
        return targetAudience.includes('families') || targetAudience.includes('children') ? 1.0 : 0.5;
      case 'couple':
        return targetAudience.includes('couples') || targetAudience.includes('adults') ? 1.0 : 0.7;
      case 'friends':
        return targetAudience.includes('young_adults') || targetAudience.includes('groups') ? 1.0 : 0.8;
      case 'solo':
        return targetAudience.includes('solo_travelers') || targetAudience.includes('general') ? 1.0 : 0.6;
      default:
        return 0.5;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}