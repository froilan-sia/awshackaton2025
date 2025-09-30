import { LocationBasedTip, ContextualTipRequest, TipDeliveryResponse, VenueType } from '../types/practicalTips';
import { PracticalTipsService } from './practicalTipsService';

export class LocationBasedTipService {
  private locationTips: Map<string, LocationBasedTip> = new Map();
  private practicalTipsService: PracticalTipsService;

  constructor(practicalTipsService: PracticalTipsService) {
    this.practicalTipsService = practicalTipsService;
    this.initializeLocationBasedTips();
  }

  private initializeLocationBasedTips(): void {
    const defaultLocationTips = this.getDefaultLocationTips();
    defaultLocationTips.forEach(locationTip => {
      this.locationTips.set(locationTip.id, locationTip);
    });
  }

  public async getTipsForLocation(
    latitude: number, 
    longitude: number, 
    request: ContextualTipRequest
  ): Promise<TipDeliveryResponse> {
    // Find location-based tips within range
    const nearbyLocationTips = this.findNearbyLocationTips(latitude, longitude);
    
    // Get contextual tips from the main service
    const contextualResponse = await this.practicalTipsService.getContextualTips(request);
    
    // Combine and deduplicate tips
    const combinedTips = this.combineAndDeduplicateTips(nearbyLocationTips, contextualResponse.tips);
    
    return {
      tips: combinedTips,
      totalCount: combinedTips.length,
      contextualRelevance: this.calculateLocationRelevance(latitude, longitude, nearbyLocationTips),
      deliveryMethod: 'immediate'
    };
  }

  public async addLocationBasedTip(locationTip: Omit<LocationBasedTip, 'id'>): Promise<LocationBasedTip> {
    const id = this.generateLocationTipId();
    const newLocationTip: LocationBasedTip = {
      ...locationTip,
      id
    };
    
    this.locationTips.set(id, newLocationTip);
    return newLocationTip;
  }

  public async updateLocationBasedTip(id: string, updates: Partial<LocationBasedTip>): Promise<LocationBasedTip | null> {
    const locationTip = this.locationTips.get(id);
    if (!locationTip) return null;
    
    const updatedTip = { ...locationTip, ...updates };
    this.locationTips.set(id, updatedTip);
    return updatedTip;
  }

  public async deleteLocationBasedTip(id: string): Promise<boolean> {
    return this.locationTips.delete(id);
  }

  public async getLocationBasedTips(): Promise<LocationBasedTip[]> {
    return Array.from(this.locationTips.values()).filter(tip => tip.isActive);
  }

  private findNearbyLocationTips(latitude: number, longitude: number): LocationBasedTip[] {
    return Array.from(this.locationTips.values()).filter(locationTip => {
      if (!locationTip.isActive) return false;
      
      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        locationTip.location.latitude, 
        locationTip.location.longitude
      );
      
      return distance <= locationTip.location.radius;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private combineAndDeduplicateTips(locationTips: LocationBasedTip[], contextualTips: any[]): any[] {
    const allTips = new Map();
    
    // Add location-based tips
    locationTips.forEach(locationTip => {
      locationTip.tips.forEach(tip => {
        allTips.set(tip.id, tip);
      });
    });
    
    // Add contextual tips (avoiding duplicates)
    contextualTips.forEach(tip => {
      if (!allTips.has(tip.id)) {
        allTips.set(tip.id, tip);
      }
    });
    
    return Array.from(allTips.values());
  }

  private calculateLocationRelevance(
    userLat: number, 
    userLon: number, 
    nearbyTips: LocationBasedTip[]
  ): number {
    if (nearbyTips.length === 0) return 0;
    
    const totalRelevance = nearbyTips.reduce((sum, locationTip) => {
      const distance = this.calculateDistance(
        userLat, 
        userLon, 
        locationTip.location.latitude, 
        locationTip.location.longitude
      );
      
      // Closer locations have higher relevance
      const proximityScore = Math.max(0, 1 - (distance / locationTip.location.radius));
      return sum + proximityScore;
    }, 0);
    
    return Math.min(totalRelevance / nearbyTips.length, 1);
  }

  private generateLocationTipId(): string {
    return `loc_tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultLocationTips(): LocationBasedTip[] {
    return [
      {
        id: 'loc_tip_victoria_peak',
        location: {
          latitude: 22.2711,
          longitude: 114.1489,
          radius: 500,
          name: 'Victoria Peak',
          venueType: VenueType.CULTURAL_SITE
        },
        tips: [
          {
            id: 'tip_peak_weather',
            category: 'preparation' as any,
            title: 'Victoria Peak Weather Preparation',
            content: 'It can be 5-10°C cooler at the Peak. Bring a light jacket even on warm days, and check visibility conditions before going up.',
            priority: 'high' as any,
            conditions: [],
            applicableVenues: [VenueType.CULTURAL_SITE],
            weatherConditions: [],
            language: 'en',
            tags: ['peak', 'weather', 'jacket'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        triggerConditions: [
          {
            type: 'location',
            value: { venueType: VenueType.CULTURAL_SITE },
            operator: 'equals'
          }
        ],
        isActive: true
      },
      {
        id: 'loc_tip_tsim_sha_tsui',
        location: {
          latitude: 22.2988,
          longitude: 114.1722,
          radius: 800,
          name: 'Tsim Sha Tsui Waterfront',
          venueType: VenueType.CULTURAL_SITE
        },
        tips: [
          {
            id: 'tip_tst_crowds',
            category: 'safety' as any,
            title: 'Tsim Sha Tsui Crowd Management',
            content: 'This area gets very crowded during evenings and weekends. Keep valuables secure and be aware of your surroundings.',
            priority: 'medium' as any,
            conditions: [],
            applicableVenues: [VenueType.CULTURAL_SITE],
            weatherConditions: [],
            language: 'en',
            tags: ['crowds', 'safety', 'valuables'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        triggerConditions: [
          {
            type: 'time',
            value: ['evening', 'night'],
            operator: 'contains'
          }
        ],
        isActive: true
      },
      {
        id: 'loc_tip_temple_street',
        location: {
          latitude: 22.3113,
          longitude: 114.1719,
          radius: 300,
          name: 'Temple Street Night Market',
          venueType: VenueType.MARKET
        },
        tips: [
          {
            id: 'tip_temple_street_night',
            category: 'cultural' as any,
            title: 'Temple Street Night Market Tips',
            content: 'The market comes alive after 7 PM. Bargaining is expected, and cash is preferred. Try the street food but choose busy stalls for freshness.',
            priority: 'medium' as any,
            conditions: [],
            applicableVenues: [VenueType.MARKET],
            weatherConditions: [],
            language: 'en',
            tags: ['night market', 'bargaining', 'street food'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        triggerConditions: [
          {
            type: 'time',
            value: ['evening', 'night'],
            operator: 'contains'
          }
        ],
        isActive: true
      }
    ];
  }
}