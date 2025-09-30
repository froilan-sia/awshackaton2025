import { AlternativeRecommendation, AlternativeLocation, CrowdLevel } from '../types/crowd';
import { CrowdDataModel } from '../models/CrowdData';
import { CrowdTrackingService } from './crowdTrackingService';

export class AlternativeRecommendationService {
  private crowdTrackingService: CrowdTrackingService;
  private locationDatabase: Map<string, LocationInfo> = new Map();

  constructor(crowdTrackingService: CrowdTrackingService) {
    this.crowdTrackingService = crowdTrackingService;
    this.initializeLocationDatabase();
  }

  /**
   * Get alternative recommendations for a crowded location
   */
  public async getAlternatives(locationId: string, maxDistance: number = 5000): Promise<AlternativeRecommendation | null> {
    const crowdData = await this.crowdTrackingService.getCrowdData(locationId);
    
    if (!crowdData || !crowdData.isOvercrowded()) {
      return null;
    }

    const originalLocation = this.locationDatabase.get(locationId);
    if (!originalLocation) {
      return null;
    }

    const alternatives = await this.findAlternativeLocations(
      originalLocation,
      maxDistance,
      crowdData.crowdLevel
    );

    if (alternatives.length === 0) {
      return null;
    }

    return {
      originalLocationId: locationId,
      alternatives: alternatives.slice(0, 5), // Return top 5 alternatives
      reason: this.generateReasonMessage(crowdData),
      generatedAt: new Date()
    };
  }

  /**
   * Get alternatives for multiple locations
   */
  public async getBulkAlternatives(locationIds: string[]): Promise<Map<string, AlternativeRecommendation>> {
    const results = new Map<string, AlternativeRecommendation>();

    for (const locationId of locationIds) {
      const alternatives = await this.getAlternatives(locationId);
      if (alternatives) {
        results.set(locationId, alternatives);
      }
    }

    return results;
  }

  /**
   * Find similar locations with lower crowd levels
   */
  private async findAlternativeLocations(
    originalLocation: LocationInfo,
    maxDistance: number,
    originalCrowdLevel: CrowdLevel
  ): Promise<AlternativeLocation[]> {
    const alternatives: AlternativeLocation[] = [];

    for (const [locationId, location] of this.locationDatabase) {
      if (locationId === originalLocation.id) continue;

      const distance = this.calculateDistance(
        originalLocation.coordinates,
        location.coordinates
      );

      if (distance > maxDistance) continue;

      const crowdData = await this.crowdTrackingService.getCrowdData(locationId);
      if (!crowdData) continue;

      // Only suggest locations with lower crowd levels
      if (this.getCrowdLevelValue(crowdData.crowdLevel) >= this.getCrowdLevelValue(originalCrowdLevel)) {
        continue;
      }

      const similarity = this.calculateSimilarity(originalLocation, location);
      if (similarity < 0.3) continue; // Minimum similarity threshold

      const travelTime = this.estimateTravelTime(distance);

      alternatives.push({
        locationId,
        locationName: location.name,
        coordinates: location.coordinates,
        distance,
        crowdLevel: crowdData.crowdLevel,
        similarity,
        category: location.category,
        estimatedTravelTime: travelTime
      });
    }

    // Sort by similarity and crowd level
    return alternatives.sort((a, b) => {
      const aScore = a.similarity * 0.6 + (1 - this.getCrowdLevelValue(a.crowdLevel) / 4) * 0.4;
      const bScore = b.similarity * 0.6 + (1 - this.getCrowdLevelValue(b.crowdLevel) / 4) * 0.4;
      return bScore - aScore;
    });
  }

  /**
   * Calculate similarity between two locations
   */
  private calculateSimilarity(location1: LocationInfo, location2: LocationInfo): number {
    let similarity = 0;

    // Category similarity
    if (location1.category === location2.category) {
      similarity += 0.4;
    } else if (this.areCategoriesRelated(location1.category, location2.category)) {
      similarity += 0.2;
    }

    // Tags similarity
    const commonTags = location1.tags.filter(tag => location2.tags.includes(tag));
    const tagSimilarity = commonTags.length / Math.max(location1.tags.length, location2.tags.length);
    similarity += tagSimilarity * 0.3;

    // Price range similarity
    const priceDiff = Math.abs(location1.priceRange - location2.priceRange);
    const priceSimilarity = Math.max(0, 1 - priceDiff / 4);
    similarity += priceSimilarity * 0.2;

    // Duration similarity
    const durationDiff = Math.abs(location1.typicalDuration - location2.typicalDuration);
    const durationSimilarity = Math.max(0, 1 - durationDiff / 240); // 4 hours max diff
    similarity += durationSimilarity * 0.1;

    return Math.min(1, similarity);
  }

  /**
   * Check if two categories are related
   */
  private areCategoriesRelated(category1: string, category2: string): boolean {
    const relatedCategories: { [key: string]: string[] } = {
      'theme-park': ['amusement-park', 'family-entertainment'],
      'museum': ['gallery', 'cultural-site', 'historical-site'],
      'shopping': ['mall', 'market', 'retail'],
      'restaurant': ['cafe', 'food-court', 'dining'],
      'nature': ['park', 'garden', 'outdoor'],
      'viewpoint': ['observation-deck', 'scenic-spot']
    };

    return relatedCategories[category1]?.includes(category2) || 
           relatedCategories[category2]?.includes(category1) || false;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(coord1: { latitude: number; longitude: number }, coord2: { latitude: number; longitude: number }): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Estimate travel time based on distance
   */
  private estimateTravelTime(distance: number): number {
    // Assume average speed of 30 km/h in Hong Kong (including walking + transport)
    const speedKmh = 30;
    const speedMs = speedKmh * 1000 / 60; // meters per minute
    return Math.ceil(distance / speedMs);
  }

  /**
   * Get numeric value for crowd level
   */
  private getCrowdLevelValue(crowdLevel: CrowdLevel): number {
    switch (crowdLevel) {
      case CrowdLevel.LOW: return 1;
      case CrowdLevel.MODERATE: return 2;
      case CrowdLevel.HIGH: return 3;
      case CrowdLevel.VERY_HIGH: return 4;
      default: return 1;
    }
  }

  /**
   * Generate reason message for alternatives
   */
  private generateReasonMessage(crowdData: CrowdDataModel): string {
    if (crowdData.crowdLevel === CrowdLevel.VERY_HIGH) {
      return `${crowdData.locationName} is extremely crowded with an estimated wait time of ${crowdData.estimatedWaitTime} minutes. Here are some great alternatives nearby.`;
    } else if (crowdData.crowdLevel === CrowdLevel.HIGH) {
      return `${crowdData.locationName} is quite busy right now. Consider these similar attractions with shorter wait times.`;
    }
    return `${crowdData.locationName} has moderate crowds. These alternatives might offer a more relaxed experience.`;
  }

  /**
   * Initialize location database with mock data
   */
  private initializeLocationDatabase(): void {
    const locations: LocationInfo[] = [
      {
        id: 'hk-disneyland',
        name: 'Hong Kong Disneyland',
        category: 'theme-park',
        coordinates: { latitude: 22.3129, longitude: 114.0413 },
        tags: ['family', 'entertainment', 'rides', 'characters'],
        priceRange: 4,
        typicalDuration: 480 // 8 hours
      },
      {
        id: 'ocean-park',
        name: 'Ocean Park',
        category: 'theme-park',
        coordinates: { latitude: 22.2462, longitude: 114.1766 },
        tags: ['family', 'entertainment', 'rides', 'animals'],
        priceRange: 4,
        typicalDuration: 420 // 7 hours
      },
      {
        id: 'victoria-peak',
        name: 'Victoria Peak',
        category: 'viewpoint',
        coordinates: { latitude: 22.2783, longitude: 114.1747 },
        tags: ['scenic', 'viewpoint', 'photography', 'iconic'],
        priceRange: 2,
        typicalDuration: 120 // 2 hours
      },
      {
        id: 'sky-terrace-428',
        name: 'Sky Terrace 428',
        category: 'viewpoint',
        coordinates: { latitude: 22.2708, longitude: 114.1501 },
        tags: ['scenic', 'viewpoint', 'photography', 'modern'],
        priceRange: 3,
        typicalDuration: 90 // 1.5 hours
      },
      {
        id: 'tsim-sha-tsui-promenade',
        name: 'Tsim Sha Tsui Promenade',
        category: 'scenic-spot',
        coordinates: { latitude: 22.2940, longitude: 114.1722 },
        tags: ['scenic', 'waterfront', 'photography', 'free'],
        priceRange: 1,
        typicalDuration: 60 // 1 hour
      },
      {
        id: 'avenue-of-stars',
        name: 'Avenue of Stars',
        category: 'scenic-spot',
        coordinates: { latitude: 22.2935, longitude: 114.1738 },
        tags: ['scenic', 'waterfront', 'entertainment', 'free'],
        priceRange: 1,
        typicalDuration: 45 // 45 minutes
      },
      {
        id: 'central-ifc-mall',
        name: 'IFC Mall Central',
        category: 'shopping',
        coordinates: { latitude: 22.2855, longitude: 114.1577 },
        tags: ['shopping', 'dining', 'luxury', 'indoor'],
        priceRange: 4,
        typicalDuration: 180 // 3 hours
      },
      {
        id: 'harbour-city',
        name: 'Harbour City',
        category: 'shopping',
        coordinates: { latitude: 22.2945, longitude: 114.1685 },
        tags: ['shopping', 'dining', 'variety', 'indoor'],
        priceRange: 3,
        typicalDuration: 240 // 4 hours
      },
      {
        id: 'hk-museum-of-history',
        name: 'Hong Kong Museum of History',
        category: 'museum',
        coordinates: { latitude: 22.3016, longitude: 114.1742 },
        tags: ['culture', 'history', 'educational', 'indoor'],
        priceRange: 1,
        typicalDuration: 120 // 2 hours
      },
      {
        id: 'hk-space-museum',
        name: 'Hong Kong Space Museum',
        category: 'museum',
        coordinates: { latitude: 22.2946, longitude: 114.1719 },
        tags: ['science', 'educational', 'planetarium', 'indoor'],
        priceRange: 2,
        typicalDuration: 90 // 1.5 hours
      }
    ];

    locations.forEach(location => {
      this.locationDatabase.set(location.id, location);
    });
  }
}

interface LocationInfo {
  id: string;
  name: string;
  category: string;
  coordinates: { latitude: number; longitude: number };
  tags: string[];
  priceRange: number; // 1-4 scale
  typicalDuration: number; // in minutes
}