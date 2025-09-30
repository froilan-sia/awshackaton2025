import { PracticalTipModel } from '../models/PracticalTip';
import { 
  PracticalTip, 
  ContextualTipRequest, 
  TipDeliveryResponse, 
  TipCategory, 
  Priority,
  VenueType,
  WeatherCondition 
} from '../types/practicalTips';

export class PracticalTipsService {
  private tips: Map<string, PracticalTipModel> = new Map();

  constructor() {
    this.initializeDefaultTips();
  }

  private initializeDefaultTips(): void {
    const defaultTips = this.getDefaultTips();
    defaultTips.forEach(tip => {
      const tipModel = new PracticalTipModel(tip);
      this.tips.set(tipModel.id, tipModel);
    });
  }

  public async createTip(tipData: Partial<PracticalTip>): Promise<PracticalTip> {
    const tip = new PracticalTipModel(tipData);
    this.tips.set(tip.id, tip);
    return tip.toJSON();
  }

  public async getTipById(id: string): Promise<PracticalTip | null> {
    const tip = this.tips.get(id);
    return tip ? tip.toJSON() : null;
  }

  public async getTipsByCategory(category: TipCategory, language: string = 'en'): Promise<PracticalTip[]> {
    const filteredTips = Array.from(this.tips.values())
      .filter(tip => tip.category === category && tip.language === language)
      .map(tip => tip.toJSON());
    
    return this.sortByPriority(filteredTips);
  }

  public async getContextualTips(request: ContextualTipRequest): Promise<TipDeliveryResponse> {
    const allTips = Array.from(this.tips.values());
    const language = request.userProfile?.language || 'en';
    
    let relevantTips = allTips.filter(tip => {
      // Language filter
      if (tip.language !== language) return false;
      
      // Category filter
      if (request.categories && request.categories.length > 0) {
        if (!request.categories.includes(tip.category)) return false;
      }
      
      // Venue type filter
      if (request.location.venueType) {
        if (!tip.isApplicableForVenue(request.location.venueType)) return false;
      }
      
      // Weather condition filter
      if (request.weather?.condition) {
        if (!tip.isApplicableForWeather(request.weather.condition)) return false;
      }
      
      // Context conditions filter
      if (!tip.matchesConditions(request)) return false;
      
      return true;
    });

    // Sort by priority and relevance
    relevantTips = this.sortByPriorityAndRelevance(relevantTips, request);
    
    const tips = relevantTips.slice(0, 10).map(tip => tip.toJSON()); // Limit to top 10
    const contextualRelevance = this.calculateContextualRelevance(tips, request);
    
    return {
      tips,
      totalCount: relevantTips.length,
      contextualRelevance,
      deliveryMethod: this.determineDeliveryMethod(tips, request)
    };
  }

  public async updateTip(id: string, updates: Partial<PracticalTip>): Promise<PracticalTip | null> {
    const tip = this.tips.get(id);
    if (!tip) return null;
    
    Object.assign(tip, updates);
    tip.updatedAt = new Date();
    
    return tip.toJSON();
  }

  public async deleteTip(id: string): Promise<boolean> {
    return this.tips.delete(id);
  }

  private sortByPriority(tips: PracticalTip[]): PracticalTip[] {
    const priorityOrder = { 
      [Priority.CRITICAL]: 4, 
      [Priority.HIGH]: 3, 
      [Priority.MEDIUM]: 2, 
      [Priority.LOW]: 1 
    };
    
    return tips.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  private sortByPriorityAndRelevance(tips: PracticalTipModel[], request: ContextualTipRequest): PracticalTipModel[] {
    return tips.sort((a, b) => {
      const priorityOrder = { 
        [Priority.CRITICAL]: 4, 
        [Priority.HIGH]: 3, 
        [Priority.MEDIUM]: 2, 
        [Priority.LOW]: 1 
      };
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by relevance (more conditions matched = higher relevance)
      const aRelevance = this.calculateTipRelevance(a, request);
      const bRelevance = this.calculateTipRelevance(b, request);
      
      return bRelevance - aRelevance;
    });
  }

  private calculateTipRelevance(tip: PracticalTipModel, request: ContextualTipRequest): number {
    let relevance = 0;
    
    // Venue type match
    if (request.location.venueType && tip.applicableVenues.includes(request.location.venueType)) {
      relevance += 3;
    }
    
    // Weather condition match
    if (request.weather?.condition && tip.weatherConditions.includes(request.weather.condition)) {
      relevance += 2;
    }
    
    // User interests match
    if (request.userProfile?.interests) {
      const matchingTags = tip.tags.filter(tag => 
        request.userProfile!.interests.some(interest => 
          interest.toLowerCase().includes(tag.toLowerCase())
        )
      );
      relevance += matchingTags.length;
    }
    
    return relevance;
  }

  private calculateContextualRelevance(tips: PracticalTip[], request: ContextualTipRequest): number {
    if (tips.length === 0) return 0;
    
    const totalRelevance = tips.reduce((sum, tip) => {
      const tipModel = this.tips.get(tip.id);
      return sum + (tipModel ? this.calculateTipRelevance(tipModel, request) : 0);
    }, 0);
    
    return Math.min(totalRelevance / tips.length / 5, 1); // Normalize to 0-1
  }

  private determineDeliveryMethod(tips: PracticalTip[], request: ContextualTipRequest): 'immediate' | 'scheduled' | 'on_demand' {
    const hasCriticalTips = tips.some(tip => tip.priority === Priority.CRITICAL);
    const hasHighPriorityTips = tips.some(tip => tip.priority === Priority.HIGH);
    
    if (hasCriticalTips) return 'immediate';
    if (hasHighPriorityTips) return 'scheduled';
    return 'on_demand';
  }

  private getDefaultTips(): Partial<PracticalTip>[] {
    return [
      // Safety Tips
      {
        category: TipCategory.SAFETY,
        title: 'Hiking Safety in Hong Kong',
        content: 'Always inform someone of your hiking plans and expected return time. Carry plenty of water, wear proper hiking shoes, and check weather conditions before heading out.',
        priority: Priority.HIGH,
        applicableVenues: [VenueType.HIKING_TRAIL],
        weatherConditions: [WeatherCondition.SUNNY, WeatherCondition.HOT_HUMID],
        tags: ['hiking', 'outdoor', 'safety'],
        language: 'en'
      },
      {
        category: TipCategory.SAFETY,
        title: 'Typhoon Safety',
        content: 'During typhoon warnings, avoid outdoor activities and stay indoors. Keep emergency supplies ready and monitor official weather updates.',
        priority: Priority.CRITICAL,
        weatherConditions: [WeatherCondition.TYPHOON],
        tags: ['typhoon', 'emergency', 'weather'],
        language: 'en'
      },
      
      // Etiquette Tips
      {
        category: TipCategory.ETIQUETTE,
        title: 'Temple Etiquette',
        content: 'Remove hats and sunglasses when entering temples. Dress modestly, speak quietly, and avoid pointing at religious statues or artifacts.',
        priority: Priority.HIGH,
        applicableVenues: [VenueType.TEMPLE],
        tags: ['temple', 'respect', 'culture'],
        language: 'en'
      },
      {
        category: TipCategory.ETIQUETTE,
        title: 'MTR Etiquette',
        content: 'Stand on the right side of escalators, give up priority seats to those in need, and avoid eating or drinking on trains.',
        priority: Priority.MEDIUM,
        applicableVenues: [VenueType.TRANSPORTATION_HUB],
        tags: ['mtr', 'transport', 'courtesy'],
        language: 'en'
      },
      
      // Preparation Tips
      {
        category: TipCategory.PREPARATION,
        title: 'Rainy Day Essentials',
        content: 'Always carry a compact umbrella during rainy season (May-September). Wear non-slip shoes and bring a waterproof bag for electronics.',
        priority: Priority.HIGH,
        weatherConditions: [WeatherCondition.RAINY],
        tags: ['rain', 'umbrella', 'preparation'],
        language: 'en'
      },
      {
        category: TipCategory.PREPARATION,
        title: 'Summer Heat Preparation',
        content: 'Wear light, breathable clothing, use sunscreen, carry water, and plan indoor activities during peak heat hours (11am-3pm).',
        priority: Priority.HIGH,
        weatherConditions: [WeatherCondition.HOT_HUMID],
        tags: ['summer', 'heat', 'hydration'],
        language: 'en'
      },
      
      // Cultural Tips
      {
        category: TipCategory.CULTURAL,
        title: 'Dining Etiquette',
        content: 'Wait to be seated at restaurants, use chopsticks properly, and it\'s polite to try a bit of everything when sharing dishes.',
        priority: Priority.MEDIUM,
        applicableVenues: [VenueType.RESTAURANT],
        tags: ['dining', 'chopsticks', 'sharing'],
        language: 'en'
      },
      {
        category: TipCategory.CULTURAL,
        title: 'Market Shopping Tips',
        content: 'Bargaining is acceptable at street markets but not in malls. Bring cash as many vendors don\'t accept cards.',
        priority: Priority.MEDIUM,
        applicableVenues: [VenueType.MARKET],
        tags: ['shopping', 'bargaining', 'cash'],
        language: 'en'
      }
    ];
  }
}