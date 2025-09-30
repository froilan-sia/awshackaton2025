import { RouteOptimization, RoutePoint, CrowdLevel } from '../types/crowd';
import { CrowdTrackingService } from './crowdTrackingService';
import { AlternativeRecommendationService } from './alternativeRecommendationService';

export class SmartRoutingService {
  private crowdTrackingService: CrowdTrackingService;
  private alternativeService: AlternativeRecommendationService;

  constructor(
    crowdTrackingService: CrowdTrackingService,
    alternativeService: AlternativeRecommendationService
  ) {
    this.crowdTrackingService = crowdTrackingService;
    this.alternativeService = alternativeService;
  }

  /**
   * Optimize route to avoid overcrowded areas
   */
  public async optimizeRoute(userId: string, originalRoute: RoutePoint[]): Promise<RouteOptimization> {
    const optimizedRoute: RoutePoint[] = [];
    let crowdAvoidanceScore = 0;
    let estimatedTimeSaved = 0;
    let alternativesConsidered = 0;

    for (let i = 0; i < originalRoute.length; i++) {
      const point = originalRoute[i];
      const crowdData = await this.crowdTrackingService.getCrowdData(point.locationId);

      if (!crowdData) {
        // If no crowd data available, keep original point
        optimizedRoute.push(point);
        continue;
      }

      // Update point with current crowd level
      const updatedPoint: RoutePoint = {
        ...point,
        crowdLevel: crowdData.crowdLevel
      };

      // Check if location is overcrowded
      if (crowdData.isOvercrowded()) {
        alternativesConsidered++;
        
        // Try to find alternative
        const alternatives = await this.alternativeService.getAlternatives(point.locationId);
        
        if (alternatives && alternatives.alternatives.length > 0) {
          const bestAlternative = alternatives.alternatives[0];
          
          // Calculate time saved by avoiding crowds
          const originalWaitTime = crowdData.estimatedWaitTime;
          const alternativeCrowdData = await this.crowdTrackingService.getCrowdData(bestAlternative.locationId);
          const alternativeWaitTime = alternativeCrowdData?.estimatedWaitTime || 0;
          
          const timeSaved = originalWaitTime - alternativeWaitTime - bestAlternative.estimatedTravelTime;
          
          if (timeSaved > 0) {
            // Use alternative
            const alternativePoint: RoutePoint = {
              locationId: bestAlternative.locationId,
              coordinates: bestAlternative.coordinates,
              estimatedArrivalTime: new Date(point.estimatedArrivalTime.getTime() + bestAlternative.estimatedTravelTime * 60000),
              estimatedDuration: point.estimatedDuration,
              crowdLevel: bestAlternative.crowdLevel
            };
            
            optimizedRoute.push(alternativePoint);
            estimatedTimeSaved += timeSaved;
            crowdAvoidanceScore += this.getCrowdAvoidanceScore(crowdData.crowdLevel, bestAlternative.crowdLevel);
            
            // Adjust subsequent arrival times
            this.adjustSubsequentTimes(originalRoute, i + 1, bestAlternative.estimatedTravelTime);
            continue;
          }
        }
        
        // If no suitable alternative found, suggest optimal time
        const optimalTime = await this.findOptimalVisitTime(point.locationId, point.estimatedArrivalTime);
        if (optimalTime) {
          updatedPoint.estimatedArrivalTime = optimalTime;
          crowdAvoidanceScore += 0.3; // Partial score for time optimization
        }
      }

      optimizedRoute.push(updatedPoint);
    }

    // Recalculate total route efficiency
    crowdAvoidanceScore = crowdAvoidanceScore / Math.max(1, alternativesConsidered);

    return {
      userId,
      originalRoute,
      optimizedRoute,
      crowdAvoidanceScore,
      estimatedTimeSaved,
      alternativesConsidered
    };
  }

  /**
   * Find optimal visit time for a location
   */
  public async findOptimalVisitTime(locationId: string, preferredTime: Date): Promise<Date | null> {
    const predictions = await this.crowdTrackingService.getCrowdPredictions(locationId, 12);
    
    if (predictions.length === 0) return null;

    // Find the time slot with lowest crowd level within 4 hours of preferred time
    const timeWindow = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    const windowStart = new Date(preferredTime.getTime() - timeWindow / 2);
    const windowEnd = new Date(preferredTime.getTime() + timeWindow / 2);

    let bestTime: Date | null = null;
    let lowestCrowdLevel = 5; // Higher than any real crowd level

    for (const prediction of predictions) {
      if (prediction.timeSlot >= windowStart && prediction.timeSlot <= windowEnd) {
        const crowdValue = this.getCrowdLevelValue(prediction.predictedCrowdLevel);
        if (crowdValue < lowestCrowdLevel) {
          lowestCrowdLevel = crowdValue;
          bestTime = prediction.timeSlot;
        }
      }
    }

    return bestTime;
  }

  /**
   * Calculate route efficiency score
   */
  public calculateRouteEfficiency(route: RoutePoint[]): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const point of route) {
      const crowdPenalty = this.getCrowdLevelValue(point.crowdLevel) / 4; // 0-1 scale
      const efficiency = 1 - crowdPenalty;
      
      totalScore += efficiency * point.estimatedDuration;
      totalWeight += point.estimatedDuration;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Get recommended departure times to avoid crowds
   */
  public async getRecommendedDepartureTimes(locationIds: string[]): Promise<Map<string, Date[]>> {
    const recommendations = new Map<string, Date[]>();

    for (const locationId of locationIds) {
      const predictions = await this.crowdTrackingService.getCrowdPredictions(locationId, 24);
      const optimalTimes: Date[] = [];

      // Find times with low crowd levels
      for (const prediction of predictions) {
        if (prediction.predictedCrowdLevel === CrowdLevel.LOW || 
            prediction.predictedCrowdLevel === CrowdLevel.MODERATE) {
          optimalTimes.push(prediction.timeSlot);
        }
      }

      if (optimalTimes.length > 0) {
        recommendations.set(locationId, optimalTimes.slice(0, 5)); // Top 5 recommendations
      }
    }

    return recommendations;
  }

  /**
   * Calculate travel time between two points
   */
  private calculateTravelTime(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
    const distance = this.calculateDistance(from, to);
    // Assume average speed of 30 km/h in Hong Kong
    const speedKmh = 30;
    const speedMs = speedKmh * 1000 / 60; // meters per minute
    return Math.ceil(distance / speedMs);
  }

  /**
   * Calculate distance between two coordinates
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
   * Calculate crowd avoidance score
   */
  private getCrowdAvoidanceScore(originalLevel: CrowdLevel, newLevel: CrowdLevel): number {
    const originalValue = this.getCrowdLevelValue(originalLevel);
    const newValue = this.getCrowdLevelValue(newLevel);
    return Math.max(0, (originalValue - newValue) / 3); // 0-1 scale
  }

  /**
   * Adjust subsequent arrival times in route
   */
  private adjustSubsequentTimes(route: RoutePoint[], startIndex: number, additionalTime: number): void {
    for (let i = startIndex; i < route.length; i++) {
      route[i].estimatedArrivalTime = new Date(
        route[i].estimatedArrivalTime.getTime() + additionalTime * 60000
      );
    }
  }
}