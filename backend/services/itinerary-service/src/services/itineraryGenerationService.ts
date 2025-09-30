import { 
  ItineraryRequest, 
  Itinerary, 
  ItineraryDay, 
  ItineraryActivity, 
  AttractionData,
  WeatherInfo,
  TravelInfo,
  TransportationMode,
  OptimizationResult,
  UserPreferences
} from '../types/itinerary';
import { ItineraryModel } from '../models/Itinerary';
import { WeatherService } from './weatherService';
import { AttractionService } from './attractionService';
import { TravelCalculationService } from './travelCalculationService';
import { addDays, differenceInDays, format, startOfDay } from 'date-fns';

export class ItineraryGenerationService {
  private weatherService: WeatherService;
  private attractionService: AttractionService;
  private travelService: TravelCalculationService;

  constructor() {
    this.weatherService = new WeatherService();
    this.attractionService = new AttractionService();
    this.travelService = new TravelCalculationService();
  }

  /**
   * Generate a personalized itinerary based on user preferences and constraints
   */
  async generateItinerary(request: ItineraryRequest): Promise<Itinerary> {
    try {
      // Get weather forecast for the travel period
      const weatherForecast = await this.weatherService.getForecast(
        request.startDate,
        request.endDate
      );

      // Get available attractions based on preferences
      const availableAttractions = await this.attractionService.getRecommendedAttractions(
        request.preferences
      );

      // Calculate number of days
      const numberOfDays = differenceInDays(request.endDate, request.startDate) + 1;
      
      // Generate daily itineraries
      const days: ItineraryDay[] = [];
      let currentDate = startOfDay(request.startDate);

      for (let dayIndex = 0; dayIndex < numberOfDays; dayIndex++) {
        const dayWeather = weatherForecast.find(w => 
          w.date.toDateString() === currentDate.toDateString()
        );

        const dayItinerary = await this.generateDayItinerary(
          currentDate,
          request,
          availableAttractions,
          dayWeather,
          dayIndex === 0 ? request.startLocation : undefined
        );

        days.push(dayItinerary);
        currentDate = addDays(currentDate, 1);
      }

      // Create itinerary model
      const itinerary = new ItineraryModel({
        userId: request.userId,
        title: this.generateItineraryTitle(request),
        description: this.generateItineraryDescription(request),
        startDate: request.startDate,
        endDate: request.endDate,
        days: days,
        weatherConsiderations: this.generateWeatherConsiderations(weatherForecast)
      });

      // Optimize the itinerary
      await this.optimizeItinerary(itinerary, request);

      return itinerary;
    } catch (error) {
      throw new Error(`Failed to generate itinerary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate itinerary for a single day
   */
  private async generateDayItinerary(
    date: Date,
    request: ItineraryRequest,
    availableAttractions: AttractionData[],
    weather: WeatherInfo | undefined,
    startLocation?: { latitude: number; longitude: number }
  ): Promise<ItineraryDay> {
    
    // Filter attractions based on weather conditions
    const weatherAppropriateAttractions = this.filterAttractionsByWeather(
      availableAttractions,
      weather
    );

    // Select attractions for the day based on preferences and constraints
    const selectedAttractions = await this.selectDayAttractions(
      weatherAppropriateAttractions,
      request.preferences,
      request.constraints
    );

    // Create activities with scheduling
    const activities = await this.scheduleActivities(
      selectedAttractions,
      date,
      request,
      startLocation
    );

    // Calculate day totals
    const totalDuration = activities.reduce((sum, activity) => 
      sum + activity.duration + (activity.travelFromPrevious?.duration || 0), 0
    );
    
    const estimatedCost = activities.reduce((sum, activity) => 
      sum + activity.estimatedCost + (activity.travelFromPrevious?.cost || 0), 0
    );

    const totalWalkingDistance = activities.reduce((sum, activity) => {
      const walkingDistance = activity.travelFromPrevious?.mode === TransportationMode.WALKING 
        ? activity.travelFromPrevious.distance 
        : 0;
      return sum + walkingDistance;
    }, 0);

    return {
      date,
      activities,
      totalDuration,
      totalWalkingDistance,
      estimatedCost,
      weatherForecast: weather
    };
  }

  /**
   * Filter attractions based on weather conditions
   */
  private filterAttractionsByWeather(
    attractions: AttractionData[],
    weather: WeatherInfo | undefined
  ): AttractionData[] {
    if (!weather) return attractions;

    // If it's raining or very hot/cold, prioritize indoor attractions
    const isUnfavorableWeather = 
      weather.precipitation > 5 || 
      weather.temperature.max > 35 || 
      weather.temperature.min < 10;

    if (isUnfavorableWeather) {
      // Prioritize indoor attractions but don't completely exclude outdoor ones
      return attractions.sort((a, b) => {
        if (a.weatherDependent && !b.weatherDependent) return 1;
        if (!a.weatherDependent && b.weatherDependent) return -1;
        return 0;
      });
    }

    return attractions;
  }

  /**
   * Select attractions for a single day
   */
  private async selectDayAttractions(
    attractions: AttractionData[],
    preferences: UserPreferences,
    constraints?: any
  ): Promise<AttractionData[]> {
    const maxActivitiesPerDay = this.getMaxActivitiesPerDay(preferences.activityLevel);
    const selectedAttractions: AttractionData[] = [];

    // Score attractions based on preferences
    const scoredAttractions = attractions.map(attraction => ({
      attraction,
      score: this.scoreAttraction(attraction, preferences)
    })).sort((a, b) => b.score - a.score);

    // Select top attractions up to the daily limit
    for (const { attraction } of scoredAttractions) {
      if (selectedAttractions.length >= maxActivitiesPerDay) break;
      
      // Check constraints
      if (constraints?.excludeAttractions?.includes(attraction.id)) continue;
      
      selectedAttractions.push(attraction);
    }

    // Add must-include attractions
    if (constraints?.mustIncludeAttractions) {
      for (const attractionId of constraints.mustIncludeAttractions) {
        const attraction = attractions.find(a => a.id === attractionId);
        if (attraction && !selectedAttractions.find(a => a.id === attractionId)) {
          selectedAttractions.push(attraction);
        }
      }
    }

    return selectedAttractions;
  }

  /**
   * Schedule activities with optimal timing and travel calculations
   */
  private async scheduleActivities(
    attractions: AttractionData[],
    date: Date,
    request: ItineraryRequest,
    startLocation?: { latitude: number; longitude: number }
  ): Promise<ItineraryActivity[]> {
    const activities: ItineraryActivity[] = [];
    
    // Start time (default 9:00 AM or user preference)
    const startTime = new Date(date);
    const preferredStartHour = request.constraints?.preferredStartTime 
      ? parseInt(request.constraints.preferredStartTime.split(':')[0])
      : 9;
    startTime.setHours(preferredStartHour, 0, 0, 0);

    let currentTime = new Date(startTime);
    let currentLocation = startLocation;

    // Sort attractions by optimal visiting order (considering location and opening hours)
    const optimizedOrder = await this.optimizeVisitingOrder(
      attractions,
      currentLocation,
      currentTime
    );

    for (let i = 0; i < optimizedOrder.length; i++) {
      const attraction = optimizedOrder[i];
      
      // Calculate travel from previous location
      let travelInfo: TravelInfo | undefined;
      if (currentLocation) {
        travelInfo = await this.travelService.calculateTravel(
          currentLocation,
          attraction.location,
          request.constraints?.transportationModes || [TransportationMode.WALKING, TransportationMode.MTR]
        );
        
        // Add travel time to current time
        currentTime = new Date(currentTime.getTime() + (travelInfo.duration * 60000));
      }

      // Create activity
      const activity: ItineraryActivity = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        attractionId: attraction.id,
        name: attraction.name,
        description: attraction.description,
        location: attraction.location,
        startTime: new Date(currentTime),
        endTime: new Date(currentTime.getTime() + (attraction.averageDuration * 60000)),
        duration: attraction.averageDuration,
        category: attraction.categories[0] || 'general',
        estimatedCost: attraction.estimatedCost,
        weatherDependent: attraction.weatherDependent,
        practicalTips: attraction.practicalTips,
        travelFromPrevious: travelInfo
      };

      activities.push(activity);

      // Update current time and location
      currentTime = new Date(activity.endTime);
      currentLocation = attraction.location;
    }

    return activities;
  }

  /**
   * Optimize the order of visiting attractions
   */
  private async optimizeVisitingOrder(
    attractions: AttractionData[],
    startLocation?: { latitude: number; longitude: number },
    startTime?: Date
  ): Promise<AttractionData[]> {
    if (attractions.length <= 1) return attractions;

    // Simple nearest-neighbor optimization
    // In a production system, this would use more sophisticated algorithms
    const optimized: AttractionData[] = [];
    const remaining = [...attractions];
    let currentLocation = startLocation;

    while (remaining.length > 0) {
      let nextAttraction: AttractionData;
      
      if (!currentLocation) {
        // If no current location, pick the first attraction
        nextAttraction = remaining[0];
      } else {
        // Find the nearest attraction
        nextAttraction = remaining.reduce((nearest, attraction) => {
          const nearestDistance = this.calculateDistance(currentLocation!, nearest.location);
          const attractionDistance = this.calculateDistance(currentLocation!, attraction.location);
          return attractionDistance < nearestDistance ? attraction : nearest;
        });
      }

      optimized.push(nextAttraction);
      currentLocation = nextAttraction.location;
      remaining.splice(remaining.indexOf(nextAttraction), 1);
    }

    return optimized;
  }

  /**
   * Calculate distance between two locations (simplified)
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
   * Score an attraction based on user preferences
   */
  private scoreAttraction(attraction: AttractionData, preferences: UserPreferences): number {
    let score = 0;

    // Interest matching
    const matchingInterests = attraction.categories.filter(category => 
      preferences.interests.includes(category)
    ).length;
    score += matchingInterests * 10;

    // Budget consideration
    if (attraction.estimatedCost <= preferences.budgetRange.max * 0.2) {
      score += 5; // Bonus for affordable attractions
    }

    // Local insights bonus
    const avgLocalRating = attraction.localInsights.reduce((sum, insight) => 
      sum + insight.localRating, 0) / attraction.localInsights.length;
    score += avgLocalRating || 0;

    return score;
  }

  /**
   * Get maximum activities per day based on activity level
   */
  private getMaxActivitiesPerDay(activityLevel: string): number {
    switch (activityLevel) {
      case 'low': return 2;
      case 'moderate': return 4;
      case 'high': return 6;
      default: return 3;
    }
  }

  /**
   * Generate weather considerations for the itinerary
   */
  private generateWeatherConsiderations(weatherForecast: WeatherInfo[]): any[] {
    return weatherForecast.map(weather => ({
      date: weather.date,
      recommendation: this.getWeatherRecommendation(weather),
      alternativeActivities: this.getWeatherAlternatives(weather),
      preparationTips: this.getWeatherPreparationTips(weather)
    }));
  }

  /**
   * Get weather-based recommendation
   */
  private getWeatherRecommendation(weather: WeatherInfo): string {
    if (weather.precipitation > 10) {
      return 'Heavy rain expected - consider indoor activities';
    } else if (weather.precipitation > 5) {
      return 'Light rain possible - bring an umbrella';
    } else if (weather.temperature.max > 35) {
      return 'Very hot day - stay hydrated and seek shade';
    } else if (weather.temperature.min < 10) {
      return 'Cool weather - dress warmly';
    }
    return 'Good weather for outdoor activities';
  }

  /**
   * Get weather-based alternative activities
   */
  private getWeatherAlternatives(weather: WeatherInfo): string[] {
    const alternatives: string[] = [];
    
    if (weather.precipitation > 5) {
      alternatives.push('Visit shopping malls', 'Explore museums', 'Indoor dining experiences');
    }
    
    if (weather.temperature.max > 35) {
      alternatives.push('Air-conditioned attractions', 'Indoor markets', 'Subway shopping areas');
    }

    return alternatives;
  }

  /**
   * Get weather preparation tips
   */
  private getWeatherPreparationTips(weather: WeatherInfo): string[] {
    const tips: string[] = [];
    
    if (weather.precipitation > 0) {
      tips.push('Bring waterproof clothing', 'Pack an umbrella');
    }
    
    if (weather.temperature.max > 30) {
      tips.push('Wear light, breathable clothing', 'Bring sunscreen', 'Stay hydrated');
    }
    
    if (weather.temperature.min < 15) {
      tips.push('Dress in layers', 'Bring a warm jacket');
    }

    return tips;
  }

  /**
   * Optimize the entire itinerary
   */
  private async optimizeItinerary(itinerary: ItineraryModel, request: ItineraryRequest): Promise<void> {
    // This would implement more sophisticated optimization algorithms
    // For now, we'll do basic optimizations

    // Ensure activities don't exceed daily time limits
    for (const day of itinerary.days) {
      if (day.totalDuration > 12 * 60) { // More than 12 hours
        // Remove least important activities
        day.activities = day.activities.slice(0, -1);
      }
    }

    // Recalculate totals after optimization
    itinerary['recalculateTotals']();
  }

  /**
   * Generate itinerary title
   */
  private generateItineraryTitle(request: ItineraryRequest): string {
    const days = differenceInDays(request.endDate, request.startDate) + 1;
    const interests = request.preferences.interests.slice(0, 2).join(' & ');
    return `${days}-Day Hong Kong ${interests} Adventure`;
  }

  /**
   * Generate itinerary description
   */
  private generateItineraryDescription(request: ItineraryRequest): string {
    const days = differenceInDays(request.endDate, request.startDate) + 1;
    return `A personalized ${days}-day itinerary for Hong Kong, tailored to your interests in ${request.preferences.interests.join(', ')} with weather-aware recommendations and local insights.`;
  }
}