import { CrowdTrackingService } from './crowdTrackingService';
import { AlternativeRecommendationService } from './alternativeRecommendationService';
import { NotificationService } from './notificationService';
import { SmartRoutingService } from './smartRoutingService';
import { CrowdDataModel } from '../models/CrowdData';
import { CrowdLevel, RoutePoint, CrowdAlert } from '../types/crowd';
import * as cron from 'node-cron';

export class CrowdService {
  private crowdTrackingService: CrowdTrackingService;
  private alternativeService: AlternativeRecommendationService;
  private notificationService: NotificationService;
  private smartRoutingService: SmartRoutingService;
  private monitoringActive: boolean = false;

  constructor() {
    this.crowdTrackingService = new CrowdTrackingService();
    this.alternativeService = new AlternativeRecommendationService(this.crowdTrackingService);
    this.notificationService = new NotificationService();
    this.smartRoutingService = new SmartRoutingService(this.crowdTrackingService, this.alternativeService);
    
    this.startCrowdMonitoring();
  }

  /**
   * Get crowd data for a location with alternatives if overcrowded
   */
  public async getLocationCrowdInfo(locationId: string) {
    const crowdData = await this.crowdTrackingService.getCrowdData(locationId);
    if (!crowdData) {
      return { error: 'Location not found' };
    }

    const result: any = {
      crowdData: crowdData.toJSON(),
      isOvercrowded: crowdData.isOvercrowded(),
      hasLongWait: crowdData.hasLongWait()
    };

    // If overcrowded, get alternatives
    if (crowdData.isOvercrowded()) {
      const alternatives = await this.alternativeService.getAlternatives(locationId);
      if (alternatives) {
        result.alternatives = alternatives;
      }

      // Get optimal visit times
      const optimalTime = await this.smartRoutingService.findOptimalVisitTime(
        locationId, 
        new Date()
      );
      if (optimalTime) {
        result.optimalVisitTime = optimalTime;
      }
    }

    return result;
  }

  /**
   * Get crowd data for multiple locations
   */
  public async getBulkCrowdInfo(locationIds: string[]) {
    const crowdDataMap = await this.crowdTrackingService.getBulkCrowdData(locationIds);
    const alternativesMap = await this.alternativeService.getBulkAlternatives(locationIds);

    const results: any = {};

    for (const locationId of locationIds) {
      const crowdData = crowdDataMap.get(locationId);
      if (crowdData) {
        results[locationId] = {
          crowdData: crowdData.toJSON(),
          isOvercrowded: crowdData.isOvercrowded(),
          hasLongWait: crowdData.hasLongWait()
        };

        const alternatives = alternativesMap.get(locationId);
        if (alternatives) {
          results[locationId].alternatives = alternatives;
        }
      }
    }

    return results;
  }

  /**
   * Optimize user route to avoid crowds
   */
  public async optimizeUserRoute(userId: string, route: RoutePoint[]) {
    const optimization = await this.smartRoutingService.optimizeRoute(userId, route);
    
    // Send notification if route was significantly improved
    if (optimization.estimatedTimeSaved > 15) { // More than 15 minutes saved
      await this.notificationService.sendRouteUpdate(userId, {
        timeSaved: optimization.estimatedTimeSaved,
        alternativesUsed: optimization.alternativesConsidered,
        efficiency: optimization.crowdAvoidanceScore
      });
    }

    return optimization;
  }

  /**
   * Subscribe user to crowd alerts for specific locations
   */
  public async subscribeToLocationAlerts(userId: string, locationIds: string[]) {
    // Store user subscriptions (in production, this would be in a database)
    const subscriptions = this.getUserSubscriptions(userId);
    locationIds.forEach(locationId => subscriptions.add(locationId));
    
    return { 
      success: true, 
      subscribedLocations: Array.from(subscriptions),
      message: `Subscribed to crowd alerts for ${locationIds.length} locations`
    };
  }

  /**
   * Get recommended departure times for locations
   */
  public async getRecommendedTimes(locationIds: string[]) {
    const recommendations = await this.smartRoutingService.getRecommendedDepartureTimes(locationIds);
    
    const result: any = {};
    for (const [locationId, times] of recommendations) {
      result[locationId] = times;
    }
    
    return result;
  }

  /**
   * Get current high crowd locations
   */
  public async getHighCrowdLocations() {
    const highCrowdLocations = await this.crowdTrackingService.getHighCrowdLocations();
    return highCrowdLocations.map(location => ({
      ...location.toJSON(),
      alternatives: null // Will be populated if requested
    }));
  }

  /**
   * Start continuous crowd monitoring
   */
  private startCrowdMonitoring(): void {
    if (this.monitoringActive) return;

    // Monitor crowd levels every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.checkCrowdLevelsAndAlert();
    });

    // Process queued notifications every minute
    cron.schedule('* * * * *', async () => {
      await this.notificationService.processQueuedNotifications();
    });

    this.monitoringActive = true;
    console.log('Crowd monitoring started');
  }

  /**
   * Check crowd levels and send alerts
   */
  private async checkCrowdLevelsAndAlert(): Promise<void> {
    try {
      const highCrowdLocations = await this.crowdTrackingService.getHighCrowdLocations();
      
      for (const crowdData of highCrowdLocations) {
        const alert = this.notificationService.createCrowdAlert(crowdData);
        
        // Get alternatives for the alert
        const alternatives = await this.alternativeService.getAlternatives(crowdData.locationId);
        if (alternatives) {
          alert.alternatives = alternatives.alternatives;
        }

        // Broadcast alert to users subscribed to this location
        const subscribedUsers = this.getLocationSubscribers(crowdData.locationId);
        for (const userId of subscribedUsers) {
          await this.notificationService.sendCrowdAlert(userId, alert);
        }
      }
    } catch (error) {
      console.error('Error in crowd monitoring:', error);
    }
  }

  /**
   * Get user subscriptions (mock implementation)
   */
  private getUserSubscriptions(userId: string): Set<string> {
    // In production, this would be stored in a database
    if (!this.userSubscriptions) {
      this.userSubscriptions = new Map();
    }
    
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    
    return this.userSubscriptions.get(userId)!;
  }

  /**
   * Get location subscribers (mock implementation)
   */
  private getLocationSubscribers(locationId: string): string[] {
    // In production, this would query a database
    const subscribers: string[] = [];
    
    if (this.userSubscriptions) {
      for (const [userId, subscriptions] of this.userSubscriptions) {
        if (subscriptions.has(locationId)) {
          subscribers.push(userId);
        }
      }
    }
    
    return subscribers;
  }

  /**
   * Get service statistics
   */
  public getServiceStats() {
    return {
      connectedUsers: this.notificationService.getConnectedUsersCount(),
      monitoringActive: this.monitoringActive,
      totalSubscriptions: this.userSubscriptions ? 
        Array.from(this.userSubscriptions.values()).reduce((total, subs) => total + subs.size, 0) : 0
    };
  }

  /**
   * Shutdown service
   */
  public shutdown(): void {
    this.notificationService.close();
    this.monitoringActive = false;
    console.log('Crowd service shutdown');
  }

  private userSubscriptions?: Map<string, Set<string>>;
}