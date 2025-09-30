import { WeatherRecommendationModel } from '../models/WeatherRecommendation';
import { WeatherSpecificRecommendation, WeatherCondition, Priority } from '../types/practicalTips';

export class WeatherRecommendationService {
  private recommendations: Map<string, WeatherRecommendationModel> = new Map();

  constructor() {
    this.initializeWeatherRecommendations();
  }

  private initializeWeatherRecommendations(): void {
    const defaultRecommendations = this.getDefaultWeatherRecommendations();
    defaultRecommendations.forEach(rec => {
      const model = new WeatherRecommendationModel(rec);
      this.recommendations.set(model.id, model);
    });
  }

  public async getRecommendationsForWeather(
    weatherCondition: WeatherCondition,
    temperature?: number,
    humidity?: number
  ): Promise<WeatherSpecificRecommendation[]> {
    const applicableRecommendations = Array.from(this.recommendations.values())
      .filter(rec => rec.isApplicableForCondition(weatherCondition))
      .map(rec => rec.toJSON());

    // Sort by priority
    return this.sortByPriority(applicableRecommendations);
  }

  public async createWeatherRecommendation(
    data: Partial<WeatherSpecificRecommendation>
  ): Promise<WeatherSpecificRecommendation> {
    const recommendation = new WeatherRecommendationModel(data);
    this.recommendations.set(recommendation.id, recommendation);
    return recommendation.toJSON();
  }

  public async updateWeatherRecommendation(
    id: string,
    updates: Partial<WeatherSpecificRecommendation>
  ): Promise<WeatherSpecificRecommendation | null> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) return null;

    Object.assign(recommendation, updates);
    return recommendation.toJSON();
  }

  public async deleteWeatherRecommendation(id: string): Promise<boolean> {
    return this.recommendations.delete(id);
  }

  public async getAllWeatherRecommendations(): Promise<WeatherSpecificRecommendation[]> {
    return Array.from(this.recommendations.values()).map(rec => rec.toJSON());
  }

  public async getWeatherPreparationAdvice(
    currentWeather: WeatherCondition,
    forecastWeather: WeatherCondition[],
    activityType?: string
  ): Promise<{
    immediate: WeatherSpecificRecommendation[];
    upcoming: WeatherSpecificRecommendation[];
    activitySpecific: string[];
  }> {
    const immediate = await this.getRecommendationsForWeather(currentWeather);
    
    const upcomingRecommendations = new Map<string, WeatherSpecificRecommendation>();
    for (const weather of forecastWeather) {
      const recs = await this.getRecommendationsForWeather(weather);
      recs.forEach(rec => upcomingRecommendations.set(rec.id, rec));
    }

    const activitySpecific = this.getActivitySpecificAdvice(currentWeather, activityType);

    return {
      immediate,
      upcoming: Array.from(upcomingRecommendations.values()),
      activitySpecific
    };
  }

  private sortByPriority(recommendations: WeatherSpecificRecommendation[]): WeatherSpecificRecommendation[] {
    const priorityOrder = { 
      [Priority.CRITICAL]: 4, 
      [Priority.HIGH]: 3, 
      [Priority.MEDIUM]: 2, 
      [Priority.LOW]: 1 
    };
    
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  private getActivitySpecificAdvice(weather: WeatherCondition, activityType?: string): string[] {
    const advice: string[] = [];

    if (!activityType) return advice;

    const activityWeatherAdvice: Record<string, Partial<Record<WeatherCondition, string[]>>> = {
      hiking: {
        [WeatherCondition.RAINY]: [
          'Consider postponing hiking due to slippery trails',
          'If proceeding, wear waterproof boots with good grip',
          'Bring extra clothing in waterproof bags'
        ],
        [WeatherCondition.HOT_HUMID]: [
          'Start early morning to avoid peak heat',
          'Bring extra water (at least 2L per person)',
          'Take frequent breaks in shade'
        ],
        [WeatherCondition.TYPHOON]: [
          'Cancel all hiking plans immediately',
          'Stay indoors until typhoon passes'
        ]
      },
      sightseeing: {
        [WeatherCondition.RAINY]: [
          'Focus on indoor attractions like museums and malls',
          'Carry compact umbrella for short outdoor walks',
          'Wear waterproof shoes'
        ],
        [WeatherCondition.FOGGY]: [
          'Victoria Peak may have limited visibility',
          'Consider visiting on clearer days for better views'
        ]
      },
      shopping: {
        [WeatherCondition.RAINY]: [
          'Perfect weather for mall shopping',
          'Use covered walkways between buildings',
          'Many malls are connected via underground passages'
        ]
      }
    };

    return activityWeatherAdvice[activityType]?.[weather] || [];
  }

  private getDefaultWeatherRecommendations(): Partial<WeatherSpecificRecommendation>[] {
    return [
      {
        weatherCondition: WeatherCondition.RAINY,
        title: 'Rainy Day Essentials',
        description: 'Hong Kong\'s rainy season requires proper preparation for comfort and safety.',
        items: [
          'Compact umbrella (essential)',
          'Waterproof phone case',
          'Quick-dry towel',
          'Plastic bags for wet items',
          'Waterproof backpack cover'
        ],
        clothing: [
          'Waterproof jacket or raincoat',
          'Non-slip shoes with good grip',
          'Quick-dry clothing',
          'Avoid white or light-colored clothing'
        ],
        precautions: [
          'Watch for slippery surfaces, especially marble floors',
          'Be extra careful on escalators when wet',
          'Avoid outdoor hiking trails',
          'Check MTR service updates for delays'
        ],
        alternatives: [
          'Visit shopping malls with covered walkways',
          'Explore museums and indoor attractions',
          'Try indoor markets like IFC or Pacific Place',
          'Visit temples with covered areas'
        ],
        priority: Priority.HIGH
      },
      {
        weatherCondition: WeatherCondition.HOT_HUMID,
        title: 'Hot and Humid Weather Preparation',
        description: 'Hong Kong summers can be extremely hot and humid. Stay cool and hydrated.',
        items: [
          'Water bottle (minimum 1.5L)',
          'Electrolyte supplements',
          'Cooling towel',
          'Portable fan',
          'Sunscreen SPF 30+',
          'Sunglasses',
          'Wide-brimmed hat'
        ],
        clothing: [
          'Light-colored, loose-fitting clothes',
          'Breathable fabrics (cotton, linen)',
          'Moisture-wicking materials',
          'Comfortable walking shoes',
          'Light cardigan for air-conditioned spaces'
        ],
        precautions: [
          'Avoid outdoor activities 11 AM - 3 PM',
          'Take frequent breaks in air-conditioned spaces',
          'Watch for heat exhaustion symptoms',
          'Reapply sunscreen every 2 hours'
        ],
        alternatives: [
          'Visit air-conditioned malls during peak heat',
          'Explore underground shopping areas',
          'Take harbor cruises for sea breeze',
          'Visit indoor attractions like museums'
        ],
        priority: Priority.HIGH
      },
      {
        weatherCondition: WeatherCondition.TYPHOON,
        title: 'Typhoon Safety Measures',
        description: 'Typhoons require serious safety precautions. Stay informed and stay safe.',
        items: [
          'Emergency food supplies (3 days)',
          'Drinking water (3L per person)',
          'Flashlight and batteries',
          'Portable radio',
          'First aid kit',
          'Cash in small bills'
        ],
        clothing: [
          'Sturdy, closed-toe shoes',
          'Long pants and sleeves',
          'Waterproof jacket'
        ],
        precautions: [
          'Stay indoors at all times',
          'Avoid windows and glass doors',
          'Do not go outside during eye of storm',
          'Monitor official weather updates',
          'Charge all electronic devices',
          'Avoid elevators during power outages'
        ],
        alternatives: [
          'Hotel room activities and entertainment',
          'Indoor reading and relaxation',
          'Plan future activities for after typhoon',
          'Contact family to confirm safety'
        ],
        priority: Priority.CRITICAL
      },
      {
        weatherCondition: WeatherCondition.COOL_DRY,
        title: 'Cool and Dry Weather Enjoyment',
        description: 'Perfect weather for outdoor activities and sightseeing in Hong Kong.',
        items: [
          'Light jacket or sweater',
          'Comfortable walking shoes',
          'Camera for clear photos',
          'Water bottle'
        ],
        clothing: [
          'Layered clothing for temperature changes',
          'Comfortable walking shoes',
          'Light jacket for evening',
          'Long pants for hiking'
        ],
        precautions: [
          'Temperatures can drop in evening',
          'UV rays still strong, use sunscreen',
          'Stay hydrated even in cooler weather'
        ],
        alternatives: [
          'Perfect for hiking trails',
          'Ideal for outdoor markets',
          'Great for harbor walks',
          'Excellent for photography tours'
        ],
        priority: Priority.MEDIUM
      },
      {
        weatherCondition: WeatherCondition.FOGGY,
        title: 'Foggy Weather Considerations',
        description: 'Fog can limit visibility and affect transportation in Hong Kong.',
        items: [
          'Phone with GPS',
          'Backup transportation apps',
          'Extra time for travel'
        ],
        clothing: [
          'Bright or reflective clothing',
          'Non-slip shoes',
          'Light jacket (fog can be cool)'
        ],
        precautions: [
          'Allow extra travel time',
          'Check ferry and tram schedules',
          'Be extra careful crossing streets',
          'Visibility may be limited for photos'
        ],
        alternatives: [
          'Visit indoor attractions',
          'Explore covered markets',
          'Try local cafes and restaurants',
          'Visit museums with good indoor lighting'
        ],
        priority: Priority.MEDIUM
      }
    ];
  }
}