import { NotificationService } from './notificationService';
import { 
  NotificationType, 
  NotificationPriority, 
  CrowdAlertData 
} from '../types/notification';

interface CrowdData {
  locationId: string;
  locationName: string;
  crowdLevel: 'low' | 'medium' | 'high' | 'very_high';
  currentCapacity: number;
  maxCapacity: number;
  estimatedWaitTime: number;
  timestamp: Date;
}

interface UserLocation {
  userId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  intendedDestinations: string[]; // location IDs
}

interface Alternative {
  id: string;
  name: string;
  crowdLevel: string;
  distance: number; // in meters
  estimatedTravelTime: number; // in minutes
  type: string;
}

export class CrowdAlertService {
  private notificationService: NotificationService;
  private crowdServiceUrl: string;
  private crowdThresholds = {
    high: 0.8,      // 80% capacity
    very_high: 0.95 // 95% capacity
  };

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
    this.crowdServiceUrl = process.env.CROWD_SERVICE_URL || 'http://localhost:3003';
  }

  public async checkCrowdLevelsAndNotify(userLocations: UserLocation[]): Promise<void> {
    try {
      const allLocationIds = new Set<string>();
      userLocations.forEach(ul => ul.intendedDestinations.forEach(id => allLocationIds.add(id)));
      
      const crowdData = await this.getCrowdData(Array.from(allLocationIds));
      
      for (const userLocation of userLocations) {
        await this.evaluateUserDestinations(userLocation, crowdData);
      }
    } catch (error) {
      console.error('Error checking crowd levels for notifications:', error);
    }
  }

  public async monitorLocationCrowdLevel(locationId: string, userId: string): Promise<void> {
    try {
      const crowdData = await this.getCrowdData([locationId]);
      const locationCrowd = crowdData.find(cd => cd.locationId === locationId);
      
      if (locationCrowd && this.shouldSendCrowdAlert(locationCrowd)) {
        await this.sendCrowdAlert(userId, locationCrowd);
      }
    } catch (error) {
      console.error('Error monitoring crowd level:', error);
    }
  }

  private async evaluateUserDestinations(
    userLocation: UserLocation, 
    crowdData: CrowdData[]
  ): Promise<void> {
    for (const destinationId of userLocation.intendedDestinations) {
      const locationCrowd = crowdData.find(cd => cd.locationId === destinationId);
      
      if (locationCrowd && this.shouldSendCrowdAlert(locationCrowd)) {
        await this.sendCrowdAlert(userLocation.userId, locationCrowd, userLocation.currentLocation);
      }
    }
  }

  private shouldSendCrowdAlert(crowdData: CrowdData): boolean {
    const capacityRatio = crowdData.currentCapacity / crowdData.maxCapacity;
    return capacityRatio >= this.crowdThresholds.high || 
           crowdData.crowdLevel === 'high' || 
           crowdData.crowdLevel === 'very_high';
  }

  private async sendCrowdAlert(
    userId: string, 
    crowdData: CrowdData,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<void> {
    const alternatives = await this.findAlternatives(crowdData.locationId, userLocation);
    
    const alertData: CrowdAlertData = {
      locationId: crowdData.locationId,
      locationName: crowdData.locationName,
      crowdLevel: this.formatCrowdLevel(crowdData.crowdLevel),
      estimatedWaitTime: crowdData.estimatedWaitTime,
      alternatives: alternatives.map(alt => ({
        id: alt.id,
        name: alt.name,
        crowdLevel: alt.crowdLevel,
        distance: alt.distance
      }))
    };

    const priority = this.determineCrowdPriority(crowdData.crowdLevel, crowdData.estimatedWaitTime);

    await this.notificationService.createFromTemplate(
      NotificationType.CROWD_ALERT,
      userId,
      {
        locationName: crowdData.locationName,
        crowdLevel: this.formatCrowdLevel(crowdData.crowdLevel),
        waitTime: crowdData.estimatedWaitTime,
        alternativeCount: alternatives.length,
        bestAlternative: alternatives.length > 0 ? alternatives[0].name : 'nearby locations'
      },
      {
        priority,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // Expire in 2 hours
      }
    );
  }

  private determineCrowdPriority(crowdLevel: string, waitTime: number): NotificationPriority {
    if (crowdLevel === 'very_high' || waitTime > 60) {
      return NotificationPriority.HIGH;
    }
    
    if (crowdLevel === 'high' || waitTime > 30) {
      return NotificationPriority.NORMAL;
    }
    
    return NotificationPriority.LOW;
  }

  private formatCrowdLevel(level: string): string {
    switch (level) {
      case 'low': return 'not busy';
      case 'medium': return 'moderately busy';
      case 'high': return 'very busy';
      case 'very_high': return 'extremely crowded';
      default: return level;
    }
  }

  private async getCrowdData(locationIds: string[]): Promise<CrowdData[]> {
    try {
      const response = await fetch(`${this.crowdServiceUrl}/api/crowd/levels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locationIds })
      });
      
      const data = await response.json() as { crowdData?: CrowdData[] };
      return data.crowdData || [];
    } catch (error) {
      console.error('Error fetching crowd data:', error);
      return [];
    }
  }

  private async findAlternatives(
    locationId: string, 
    userLocation?: { latitude: number; longitude: number }
  ): Promise<Alternative[]> {
    try {
      const params = new URLSearchParams({
        locationId,
        limit: '5'
      });
      
      if (userLocation) {
        params.append('latitude', userLocation.latitude.toString());
        params.append('longitude', userLocation.longitude.toString());
      }
      
      const response = await fetch(`${this.crowdServiceUrl}/api/crowd/alternatives?${params}`);
      const data = await response.json() as { alternatives?: any[] };
      
      return data.alternatives?.map((alt: any) => ({
        id: alt.id,
        name: alt.name,
        crowdLevel: this.formatCrowdLevel(alt.crowdLevel),
        distance: alt.distance || 0,
        estimatedTravelTime: alt.estimatedTravelTime || 0,
        type: alt.type || 'attraction'
      })) || [];
    } catch (error) {
      console.error('Error finding alternatives:', error);
      return this.getDefaultAlternatives();
    }
  }

  private getDefaultAlternatives(): Alternative[] {
    return [
      {
        id: 'default_1',
        name: 'Nearby Cultural Center',
        crowdLevel: 'not busy',
        distance: 500,
        estimatedTravelTime: 5,
        type: 'cultural'
      },
      {
        id: 'default_2',
        name: 'Local Park',
        crowdLevel: 'not busy',
        distance: 300,
        estimatedTravelTime: 3,
        type: 'outdoor'
      },
      {
        id: 'default_3',
        name: 'Shopping Mall',
        crowdLevel: 'moderately busy',
        distance: 800,
        estimatedTravelTime: 8,
        type: 'shopping'
      }
    ];
  }

  public async subscribeToCrowdUpdates(userId: string, locationIds: string[]): Promise<void> {
    // This would typically set up real-time subscriptions
    // For now, we'll store the subscription info
    console.log(`User ${userId} subscribed to crowd updates for locations: ${locationIds.join(', ')}`);
  }

  public async unsubscribeFromCrowdUpdates(userId: string, locationIds?: string[]): Promise<void> {
    // Remove subscriptions
    console.log(`User ${userId} unsubscribed from crowd updates${locationIds ? ` for locations: ${locationIds.join(', ')}` : ''}`);
  }

  public async getCrowdPrediction(locationId: string, targetTime: Date): Promise<CrowdData | null> {
    try {
      const response = await fetch(`${this.crowdServiceUrl}/api/crowd/prediction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          locationId, 
          targetTime: targetTime.toISOString() 
        })
      });
      
      const data = await response.json() as { prediction?: CrowdData };
      return data.prediction || null;
    } catch (error) {
      console.error('Error fetching crowd prediction:', error);
      return null;
    }
  }

  public async sendProactiveCrowdAlert(
    userId: string, 
    locationId: string, 
    scheduledTime: Date
  ): Promise<void> {
    const prediction = await this.getCrowdPrediction(locationId, scheduledTime);
    
    if (prediction && this.shouldSendCrowdAlert(prediction)) {
      const alternatives = await this.findAlternatives(locationId);
      
      await this.notificationService.createFromTemplate(
        NotificationType.CROWD_ALERT,
        userId,
        {
          locationName: prediction.locationName,
          crowdLevel: this.formatCrowdLevel(prediction.crowdLevel),
          waitTime: prediction.estimatedWaitTime,
          scheduledTime: scheduledTime.toLocaleTimeString(),
          alternativeCount: alternatives.length
        },
        {
          priority: NotificationPriority.NORMAL,
          scheduledFor: new Date(scheduledTime.getTime() - 60 * 60 * 1000), // 1 hour before
          expiresAt: new Date(scheduledTime.getTime() + 60 * 60 * 1000) // 1 hour after
        }
      );
    }
  }
}