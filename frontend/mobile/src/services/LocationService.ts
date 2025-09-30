import * as Location from 'expo-location';
import { GeoLocation } from '../types';
import { ApiService } from './ApiService';

export interface ContextualContent {
  id: string;
  title: string;
  description: string;
  content: string;
  multimedia: MultimediaContent[];
  category: string;
  interestTags: string[];
  estimatedReadTime?: number;
  accessibility: {
    screenReaderFriendly: boolean;
    visualDescriptions: boolean;
    audioAvailable: boolean;
  };
  offlineAvailable: boolean;
}

export interface MultimediaContent {
  type: 'image' | 'video' | 'audio' | '360_image' | 'ar_content';
  url: string;
  thumbnail?: string;
  duration?: number;
  description?: string;
  altText?: string;
}

export interface ContentDeliveryResult {
  triggeredContent: ContextualContent[];
  deliveryMethod: 'immediate' | 'notification' | 'cached';
  reason: string;
}

export class LocationService {
  private static instance: LocationService;
  private currentLocation: Location.LocationObject | null = null;
  private watchId: Location.LocationSubscription | null = null;
  private locationCallbacks: ((location: GeoLocation) => void)[] = [];
  private contentCallbacks: ((content: ContentDeliveryResult) => void)[] = [];
  private apiService: ApiService;
  private lastContentTrigger: Date | null = null;
  private contentTriggerInterval = 30000; // 30 seconds minimum between triggers

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  private constructor() {
    this.apiService = ApiService.getInstance();
  }

  static async initialize(): Promise<void> {
    const instance = LocationService.getInstance();
    await instance.startLocationTracking();
  }

  async startLocationTracking(): Promise<void> {
    try {
      // Check permissions
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      this.currentLocation = location;
      this.notifyLocationCallbacks(this.formatLocation(location));

      // Start watching location changes
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 50, // Update when moved 50 meters
        },
        async (location) => {
          this.currentLocation = location;
          const geoLocation = this.formatLocation(location);
          this.notifyLocationCallbacks(geoLocation);
          
          // Trigger contextual content delivery
          await this.triggerContextualContent(geoLocation);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  stopLocationTracking(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  getCurrentLocation(): GeoLocation | null {
    if (!this.currentLocation) {
      return null;
    }
    return this.formatLocation(this.currentLocation);
  }

  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        return `${address.street || ''} ${address.district || ''} ${address.city || 'Hong Kong'}`.trim();
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Unknown location';
    }
  }

  subscribeToLocationUpdates(callback: (location: GeoLocation) => void): () => void {
    this.locationCallbacks.push(callback);
    
    // If we already have a location, call the callback immediately
    if (this.currentLocation) {
      callback(this.formatLocation(this.currentLocation));
    }

    // Return unsubscribe function
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
      }
    };
  }

  async calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): Promise<number> {
    // Haversine formula to calculate distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private formatLocation(location: Location.LocationObject): GeoLocation {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      address: '', // Will be populated by reverse geocoding
      district: '', // Will be populated by reverse geocoding
    };
  }

  private notifyLocationCallbacks(location: GeoLocation): void {
    this.locationCallbacks.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location callback:', error);
      }
    });
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Contextual Content Methods

  addContentCallback(callback: (content: ContentDeliveryResult) => void): () => void {
    this.contentCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.contentCallbacks.indexOf(callback);
      if (index > -1) {
        this.contentCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Trigger contextual content delivery based on current location
   */
  private async triggerContextualContent(location: GeoLocation): Promise<void> {
    try {
      // Rate limiting: don't trigger too frequently
      const now = new Date();
      if (this.lastContentTrigger && 
          (now.getTime() - this.lastContentTrigger.getTime()) < this.contentTriggerInterval) {
        return;
      }

      this.lastContentTrigger = now;

      // Get current context
      const context = await this.getCurrentContext(location);
      
      // Get user ID (this would come from authentication service)
      const userId = await this.getCurrentUserId();
      if (!userId) return;

      // Trigger content delivery
      const response = await this.apiService.post('/contextual-content/trigger', {
        userId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date()
        },
        context
      });

      if (response.success && response.data.triggeredContent.length > 0) {
        // Notify content callbacks
        this.contentCallbacks.forEach(callback => {
          try {
            callback(response.data);
          } catch (error) {
            console.error('Error in content callback:', error);
          }
        });
      }

    } catch (error) {
      console.error('Error triggering contextual content:', error);
    }
  }

  /**
   * Get cached content for offline access
   */
  async getCachedContent(
    location: GeoLocation,
    radius: number = 1000
  ): Promise<ContextualContent[]> {
    try {
      const response = await this.apiService.get('/contextual-content/cached', {
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        languages: ['en'], // This would come from user preferences
        interests: ['history', 'culture', 'food'] // This would come from user preferences
      });

      return response.success ? response.data.content : [];
    } catch (error) {
      console.error('Error getting cached content:', error);
      return [];
    }
  }

  /**
   * Get content by category
   */
  async getContentByCategory(
    category: string,
    location: GeoLocation,
    radius: number = 1000
  ): Promise<ContextualContent[]> {
    try {
      const response = await this.apiService.get(`/contextual-content/category/${category}`, {
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        language: 'en' // This would come from user preferences
      });

      return response.success ? response.data.content : [];
    } catch (error) {
      console.error('Error getting content by category:', error);
      return [];
    }
  }

  /**
   * Get enhanced content for a specific geofence
   */
  async getGeofenceContent(
    geofenceId: string,
    interests: string[] = [],
    languages: string[] = ['en']
  ): Promise<ContextualContent[]> {
    try {
      const response = await this.apiService.get(`/contextual-content/geofence/${geofenceId}`, {
        languages,
        interests,
        timeOfDay: this.getCurrentTimeOfDay()
      });

      return response.success ? response.data.content : [];
    } catch (error) {
      console.error('Error getting geofence content:', error);
      return [];
    }
  }

  // Private helper methods for contextual content

  private async getCurrentContext(location: GeoLocation) {
    return {
      location,
      timeOfDay: this.getCurrentTimeOfDay(),
      weather: await this.getCurrentWeather(location),
      connectionQuality: await this.getConnectionQuality(),
      batteryLevel: await this.getBatteryLevel()
    };
  }

  private getCurrentTimeOfDay(): string {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  private async getCurrentWeather(location: GeoLocation): Promise<string | undefined> {
    try {
      // This would integrate with weather service
      // For now, return undefined
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async getConnectionQuality(): Promise<'excellent' | 'good' | 'poor' | 'offline'> {
    try {
      // This would check actual network conditions
      // For now, return 'good' as default
      return 'good';
    } catch (error) {
      return 'poor';
    }
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    try {
      // This would get actual battery level
      // For now, return undefined
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      // This would get user ID from authentication service
      // For now, return a test user ID
      return 'current-user-id';
    } catch (error) {
      return null;
    }
  }
}

export default LocationService;