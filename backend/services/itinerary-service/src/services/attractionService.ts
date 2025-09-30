import { AttractionData, UserPreferences, GeoLocation, TipCategory, Priority } from '../types/itinerary';

export class AttractionService {
  private attractions: AttractionData[];

  constructor() {
    this.attractions = this.initializeMockAttractions();
  }

  /**
   * Get recommended attractions based on user preferences
   */
  async getRecommendedAttractions(preferences: UserPreferences): Promise<AttractionData[]> {
    try {
      // Filter attractions based on preferences
      let filteredAttractions = this.attractions.filter(attraction => {
        // Check interest matching
        const hasMatchingInterest = attraction.categories.some(category => 
          preferences.interests.includes(category)
        );

        // Check budget constraints
        const withinBudget = attraction.estimatedCost <= preferences.budgetRange.max * 0.3; // Max 30% of daily budget per attraction

        // Check accessibility needs
        const meetsAccessibility = this.checkAccessibilityRequirements(
          attraction, 
          preferences.accessibilityNeeds
        );

        return hasMatchingInterest && withinBudget && meetsAccessibility;
      });

      // If no matches found, return popular attractions
      if (filteredAttractions.length === 0) {
        filteredAttractions = this.getPopularAttractions();
      }

      // Sort by relevance score
      filteredAttractions.sort((a, b) => 
        this.calculateRelevanceScore(b, preferences) - this.calculateRelevanceScore(a, preferences)
      );

      return filteredAttractions;
    } catch (error) {
      console.error('Error getting recommended attractions:', error);
      return this.getPopularAttractions();
    }
  }

  /**
   * Get attraction by ID
   */
  async getAttractionById(id: string): Promise<AttractionData | null> {
    return this.attractions.find(attraction => attraction.id === id) || null;
  }

  /**
   * Get attractions by category
   */
  async getAttractionsByCategory(category: string): Promise<AttractionData[]> {
    return this.attractions.filter(attraction => 
      attraction.categories.includes(category)
    );
  }

  /**
   * Get attractions near a location
   */
  async getAttractionsNearLocation(
    location: GeoLocation, 
    radiusKm: number = 5
  ): Promise<AttractionData[]> {
    return this.attractions.filter(attraction => {
      const distance = this.calculateDistance(location, attraction.location);
      return distance <= radiusKm * 1000; // Convert km to meters
    });
  }

  /**
   * Calculate relevance score for an attraction based on user preferences
   */
  private calculateRelevanceScore(attraction: AttractionData, preferences: UserPreferences): number {
    let score = 0;

    // Interest matching (highest weight)
    const matchingInterests = attraction.categories.filter(category => 
      preferences.interests.includes(category)
    ).length;
    score += matchingInterests * 20;

    // Budget consideration
    const budgetRatio = attraction.estimatedCost / preferences.budgetRange.max;
    if (budgetRatio <= 0.1) score += 10; // Very affordable
    else if (budgetRatio <= 0.2) score += 5; // Affordable
    else if (budgetRatio > 0.5) score -= 5; // Expensive

    // Local insights bonus
    const avgLocalRating = attraction.localInsights.length > 0
      ? attraction.localInsights.reduce((sum, insight) => sum + insight.localRating, 0) / attraction.localInsights.length
      : 0;
    score += avgLocalRating * 2;

    // Activity level matching
    const durationScore = this.getDurationScore(attraction.averageDuration, preferences.activityLevel);
    score += durationScore;

    // Group type consideration
    score += this.getGroupTypeScore(attraction, preferences.groupType);

    return score;
  }

  /**
   * Get duration score based on activity level preference
   */
  private getDurationScore(duration: number, activityLevel: string): number {
    switch (activityLevel) {
      case 'low':
        return duration <= 120 ? 5 : duration <= 180 ? 0 : -5; // Prefer 2-3 hours max
      case 'moderate':
        return duration >= 60 && duration <= 240 ? 5 : 0; // Prefer 1-4 hours
      case 'high':
        return duration >= 120 ? 5 : 0; // Prefer 2+ hours
      default:
        return 0;
    }
  }

  /**
   * Get group type score for attraction suitability
   */
  private getGroupTypeScore(attraction: AttractionData, groupType: string): number {
    // This would be based on attraction metadata about group suitability
    // For now, we'll use simple heuristics based on categories
    
    if (groupType === 'family') {
      if (attraction.categories.includes('family') || 
          attraction.categories.includes('theme-park') ||
          attraction.categories.includes('zoo')) {
        return 10;
      }
    }
    
    if (groupType === 'couple') {
      if (attraction.categories.includes('romantic') || 
          attraction.categories.includes('scenic') ||
          attraction.categories.includes('dining')) {
        return 10;
      }
    }

    if (groupType === 'friends') {
      if (attraction.categories.includes('nightlife') || 
          attraction.categories.includes('adventure') ||
          attraction.categories.includes('shopping')) {
        return 10;
      }
    }

    return 0;
  }

  /**
   * Check if attraction meets accessibility requirements
   */
  private checkAccessibilityRequirements(
    attraction: AttractionData, 
    accessibilityNeeds: string[]
  ): boolean {
    if (!accessibilityNeeds || accessibilityNeeds.length === 0) {
      return true;
    }

    // This would check against attraction accessibility metadata
    // For now, we'll assume all attractions are accessible unless specified
    return true;
  }

  /**
   * Get popular attractions as fallback
   */
  private getPopularAttractions(): AttractionData[] {
    return this.attractions
      .sort((a, b) => {
        const aRating = a.localInsights.length > 0 
          ? a.localInsights.reduce((sum, insight) => sum + insight.localRating, 0) / a.localInsights.length
          : 0;
        const bRating = b.localInsights.length > 0 
          ? b.localInsights.reduce((sum, insight) => sum + insight.localRating, 0) / b.localInsights.length
          : 0;
        return bRating - aRating;
      })
      .slice(0, 20); // Top 20 popular attractions
  }

  /**
   * Calculate distance between two locations
   */
  private calculateDistance(
    loc1: GeoLocation,
    loc2: GeoLocation
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
   * Initialize mock attractions data
   */
  private initializeMockAttractions(): AttractionData[] {
    return [
      {
        id: 'hk-001',
        name: 'Victoria Peak',
        description: 'Iconic mountain peak offering panoramic views of Hong Kong skyline',
        location: { latitude: 22.2711, longitude: 114.1489 },
        categories: ['scenic', 'viewpoint', 'iconic'],
        averageDuration: 180, // 3 hours
        estimatedCost: 65, // HKD for Peak Tram
        weatherDependent: true,
        crowdPatterns: [
          { dayOfWeek: 0, hourlyLevels: [20,15,10,10,15,25,40,60,80,90,95,90,85,80,75,70,65,60,55,50,45,40,35,25] },
          { dayOfWeek: 6, hourlyLevels: [30,20,15,15,20,30,50,70,85,95,100,95,90,85,80,75,70,65,60,55,50,45,40,35] }
        ],
        openingHours: [
          { dayOfWeek: 0, openTime: '07:00', closeTime: '00:00', closed: false },
          { dayOfWeek: 1, openTime: '07:00', closeTime: '00:00', closed: false },
          { dayOfWeek: 2, openTime: '07:00', closeTime: '00:00', closed: false },
          { dayOfWeek: 3, openTime: '07:00', closeTime: '00:00', closed: false },
          { dayOfWeek: 4, openTime: '07:00', closeTime: '00:00', closed: false },
          { dayOfWeek: 5, openTime: '07:00', closeTime: '00:00', closed: false },
          { dayOfWeek: 6, openTime: '07:00', closeTime: '00:00', closed: false }
        ],
        practicalTips: [
          { category: TipCategory.WEATHER, content: 'Best visited on clear days for optimal views', conditions: ['clear'], priority: Priority.HIGH },
          { category: TipCategory.PREPARATION, content: 'Book Peak Tram tickets in advance to avoid queues', conditions: [], priority: Priority.MEDIUM }
        ],
        localInsights: [
          { type: 'local_tip', content: 'Visit during sunset for magical golden hour views', authenticityScore: 0.9, localRating: 4.5 },
          { type: 'local_perspective', content: 'Locals prefer the hiking trail to avoid tourist crowds', authenticityScore: 0.95, localRating: 4.2 }
        ]
      },
      {
        id: 'hk-002',
        name: 'Star Ferry',
        description: 'Historic ferry service across Victoria Harbour',
        location: { latitude: 22.2944, longitude: 114.1691 },
        categories: ['transport', 'historic', 'scenic', 'budget'],
        averageDuration: 45,
        estimatedCost: 3, // HKD
        weatherDependent: true,
        crowdPatterns: [
          { dayOfWeek: 0, hourlyLevels: [10,5,5,5,10,20,40,60,70,60,50,45,50,55,60,65,70,75,80,70,60,50,40,20] }
        ],
        openingHours: [
          { dayOfWeek: 0, openTime: '06:30', closeTime: '23:30', closed: false }
        ],
        practicalTips: [
          { category: TipCategory.ETIQUETTE, content: 'Stand on the right side of escalators', conditions: [], priority: Priority.MEDIUM },
          { category: TipCategory.WEATHER, content: 'Service may be suspended during typhoons', conditions: ['storm'], priority: Priority.HIGH }
        ],
        localInsights: [
          { type: 'local_tip', content: 'Upper deck offers better views but costs slightly more', authenticityScore: 0.8, localRating: 4.0 },
          { type: 'authentic_experience', content: 'A genuine piece of Hong Kong heritage still used by locals daily', authenticityScore: 0.95, localRating: 4.3 }
        ]
      },
      {
        id: 'hk-003',
        name: 'Temple Street Night Market',
        description: 'Bustling night market famous for street food and fortune telling',
        location: { latitude: 22.3112, longitude: 114.1696 },
        categories: ['market', 'food', 'nightlife', 'cultural', 'budget'],
        averageDuration: 120,
        estimatedCost: 150, // HKD for food and shopping
        weatherDependent: true,
        crowdPatterns: [
          { dayOfWeek: 0, hourlyLevels: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,30,60,80,90,85,70,40] }
        ],
        openingHours: [
          { dayOfWeek: 0, openTime: '18:00', closeTime: '00:00', closed: false }
        ],
        practicalTips: [
          { category: TipCategory.SAFETY, content: 'Keep valuables secure in crowded areas', conditions: [], priority: Priority.HIGH },
          { category: TipCategory.ETIQUETTE, content: 'Bargaining is expected at most stalls', conditions: [], priority: Priority.MEDIUM },
          { category: TipCategory.PREPARATION, content: 'Bring cash as most vendors don\'t accept cards', conditions: [], priority: Priority.HIGH }
        ],
        localInsights: [
          { type: 'local_food', content: 'Try the curry fish balls and stinky tofu - local favorites', authenticityScore: 0.9, localRating: 4.4 },
          { type: 'local_tip', content: 'Best time to visit is after 8 PM when it gets really lively', authenticityScore: 0.85, localRating: 4.1 }
        ]
      },
      {
        id: 'hk-004',
        name: 'Wong Tai Sin Temple',
        description: 'Famous Taoist temple known for fortune-telling and wish fulfillment',
        location: { latitude: 22.3422, longitude: 114.1938 },
        categories: ['temple', 'cultural', 'spiritual', 'traditional'],
        averageDuration: 90,
        estimatedCost: 0, // Free entry
        weatherDependent: false,
        crowdPatterns: [
          { dayOfWeek: 0, hourlyLevels: [20,15,10,10,15,25,40,60,80,90,85,80,75,70,65,60,55,50,45,40,35,30,25,20] }
        ],
        openingHours: [
          { dayOfWeek: 0, openTime: '07:00', closeTime: '17:30', closed: false }
        ],
        practicalTips: [
          { category: TipCategory.ETIQUETTE, content: 'Dress modestly and remove hats when entering temple halls', conditions: [], priority: Priority.HIGH },
          { category: TipCategory.CULTURAL, content: 'Bring incense sticks to make offerings (available for purchase)', conditions: [], priority: Priority.MEDIUM },
          { category: TipCategory.PREPARATION, content: 'Photography may be restricted in certain areas', conditions: [], priority: Priority.MEDIUM }
        ],
        localInsights: [
          { type: 'cultural_significance', content: 'Locals come here especially before important exams or business decisions', authenticityScore: 0.95, localRating: 4.6 },
          { type: 'local_practice', content: 'The fortune-telling stalls outside are popular with locals but negotiate prices first', authenticityScore: 0.8, localRating: 3.8 }
        ]
      },
      {
        id: 'hk-005',
        name: 'Tsim Sha Tsui Promenade',
        description: 'Waterfront walkway with stunning harbor views and Symphony of Lights show',
        location: { latitude: 22.2947, longitude: 114.1694 },
        categories: ['scenic', 'walkway', 'free', 'romantic', 'photography'],
        averageDuration: 60,
        estimatedCost: 0,
        weatherDependent: true,
        crowdPatterns: [
          { dayOfWeek: 0, hourlyLevels: [10,5,5,5,10,15,25,35,45,55,60,65,70,75,80,85,90,95,100,90,80,70,50,30] }
        ],
        openingHours: [
          { dayOfWeek: 0, openTime: '00:00', closeTime: '23:59', closed: false }
        ],
        practicalTips: [
          { category: TipCategory.TIMING, content: 'Visit at 8 PM for the Symphony of Lights show', conditions: [], priority: Priority.HIGH },
          { category: TipCategory.WEATHER, content: 'Can be very windy, especially in winter', conditions: ['windy'], priority: Priority.MEDIUM }
        ],
        localInsights: [
          { type: 'local_tip', content: 'Early morning offers the best photos with fewer crowds', authenticityScore: 0.7, localRating: 4.2 },
          { type: 'romantic_spot', content: 'Popular proposal location among locals', authenticityScore: 0.6, localRating: 4.0 }
        ]
      },
      {
        id: 'hk-006',
        name: 'Central Market',
        description: 'Revitalized historic market building with local food and crafts',
        location: { latitude: 22.2819, longitude: 114.1578 },
        categories: ['market', 'food', 'shopping', 'historic', 'indoor'],
        averageDuration: 90,
        estimatedCost: 100,
        weatherDependent: false,
        crowdPatterns: [
          { dayOfWeek: 0, hourlyLevels: [5,5,5,5,5,10,20,30,40,50,60,70,80,85,80,75,70,65,60,55,50,45,30,15] }
        ],
        openingHours: [
          { dayOfWeek: 0, openTime: '10:00', closeTime: '22:00', closed: false }
        ],
        practicalTips: [
          { category: TipCategory.PREPARATION, content: 'Air-conditioned venue, perfect for hot weather', conditions: ['hot'], priority: Priority.MEDIUM }
        ],
        localInsights: [
          { type: 'local_food', content: 'Great place to try various Hong Kong street foods in comfort', authenticityScore: 0.8, localRating: 4.1 }
        ]
      }
    ];
  }
}