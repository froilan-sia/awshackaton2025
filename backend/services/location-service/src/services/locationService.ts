import { Location, ILocationDocument } from '../models/Location';
import { UserLocationPreferencesModel } from '../models/UserLocationPreferences';
import { 
  LocationUpdate, 
  GeoLocation, 
  PrivacyLevel, 
  UserLocationPreferences 
} from '../types/location';
import { getDistance } from 'geolib';

export class LocationService {
  /**
   * Update user location with privacy controls
   */
  async updateLocation(locationUpdate: LocationUpdate): Promise<ILocationDocument> {
    // Get user preferences to validate privacy settings
    const preferences = await this.getUserLocationPreferences(locationUpdate.userId);
    
    if (!preferences.trackingEnabled) {
      throw new Error('Location tracking is disabled for this user');
    }

    // Apply privacy level filtering - use the higher privacy level between request and user preferences
    const effectivePrivacyLevel = this.getEffectivePrivacyLevel(
      locationUpdate.privacyLevel || preferences.privacyLevel,
      preferences.privacyLevel
    );
    
    const sanitizedLocation = this.sanitizeLocationByPrivacy(
      locationUpdate.location, 
      effectivePrivacyLevel
    );

    // Check if location update is significant enough to store
    const lastLocation = await this.getLastLocation(locationUpdate.userId);
    if (lastLocation && !this.isSignificantLocationChange(lastLocation.location, sanitizedLocation)) {
      return lastLocation;
    }

    const locationDoc = new Location({
      userId: locationUpdate.userId,
      location: sanitizedLocation,
      privacyLevel: effectivePrivacyLevel,
      source: locationUpdate.source
    });

    return await locationDoc.save();
  }

  /**
   * Get user's current location with privacy controls
   */
  async getCurrentLocation(userId: string, requesterId?: string): Promise<GeoLocation | null> {
    const preferences = await this.getUserLocationPreferences(userId);
    
    // Check if location can be shared
    if (requesterId && requesterId !== userId && !preferences.shareLocation) {
      throw new Error('Location sharing is disabled for this user');
    }

    const locationDoc = await Location.findOne({ userId })
      .sort({ createdAt: -1 })
      .limit(1);

    if (!locationDoc) {
      return null;
    }

    // Apply privacy filtering based on requester
    if (requesterId && requesterId !== userId) {
      return this.sanitizeLocationByPrivacy(locationDoc.location, PrivacyLevel.HIGH);
    }

    return locationDoc.location;
  }

  /**
   * Get location history for a user
   */
  async getLocationHistory(
    userId: string, 
    startDate?: Date, 
    endDate?: Date, 
    limit: number = 100
  ): Promise<ILocationDocument[]> {
    const query: any = { userId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    return await Location.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Get users near a specific location
   */
  async getUsersNearLocation(
    center: GeoLocation, 
    radiusInMeters: number,
    excludeUserId?: string
  ): Promise<string[]> {
    const recentLocations = await Location.find({
      userId: { $ne: excludeUserId },
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 minutes
      privacyLevel: { $ne: PrivacyLevel.HIGH }
    });

    const nearbyUsers: string[] = [];
    
    for (const location of recentLocations) {
      const distance = getDistance(
        { latitude: center.latitude, longitude: center.longitude },
        { 
          latitude: location.location.latitude, 
          longitude: location.location.longitude 
        }
      );

      if (distance <= radiusInMeters) {
        // Check if user allows location sharing
        const preferences = await this.getUserLocationPreferences(location.userId);
        if (preferences.shareLocation) {
          nearbyUsers.push(location.userId);
        }
      }
    }

    return nearbyUsers;
  }

  /**
   * Get or create user location preferences
   */
  async getUserLocationPreferences(userId: string): Promise<UserLocationPreferences> {
    let preferences = await UserLocationPreferencesModel.findOne({ userId });
    
    if (!preferences) {
      preferences = new UserLocationPreferencesModel({ userId });
      await preferences.save();
    }

    return preferences;
  }

  /**
   * Update user location preferences
   */
  async updateLocationPreferences(
    userId: string, 
    updates: Partial<UserLocationPreferences>
  ): Promise<UserLocationPreferences> {
    const preferences = await UserLocationPreferencesModel.findOneAndUpdate(
      { userId },
      updates,
      { new: true, upsert: true }
    );

    return preferences!;
  }

  /**
   * Delete user location data (GDPR compliance)
   */
  async deleteUserLocationData(userId: string): Promise<void> {
    await Promise.all([
      Location.deleteMany({ userId }),
      UserLocationPreferencesModel.deleteOne({ userId })
    ]);
  }

  /**
   * Get last known location for a user
   */
  private async getLastLocation(userId: string): Promise<ILocationDocument | null> {
    return await Location.findOne({ userId })
      .sort({ createdAt: -1 })
      .limit(1);
  }

  /**
   * Sanitize location data based on privacy level
   */
  private sanitizeLocationByPrivacy(location: GeoLocation, privacyLevel: PrivacyLevel): GeoLocation {
    const sanitized = { ...location };

    switch (privacyLevel) {
      case PrivacyLevel.HIGH:
        // Reduce precision to ~1km accuracy
        sanitized.latitude = Math.round(location.latitude * 100) / 100;
        sanitized.longitude = Math.round(location.longitude * 100) / 100;
        delete (sanitized as any).accuracy;
        delete (sanitized as any).altitude;
        delete (sanitized as any).heading;
        delete (sanitized as any).speed;
        break;
        
      case PrivacyLevel.MEDIUM:
        // Reduce precision to ~100m accuracy
        sanitized.latitude = Math.round(location.latitude * 1000) / 1000;
        sanitized.longitude = Math.round(location.longitude * 1000) / 1000;
        delete (sanitized as any).heading;
        delete (sanitized as any).speed;
        break;
        
      case PrivacyLevel.LOW:
        // Keep full precision
        break;
    }

    return sanitized;
  }

  /**
   * Get the effective privacy level (use the higher privacy level)
   */
  private getEffectivePrivacyLevel(
    requestPrivacyLevel: PrivacyLevel,
    userPrivacyLevel: PrivacyLevel
  ): PrivacyLevel {
    const privacyOrder = {
      [PrivacyLevel.LOW]: 1,
      [PrivacyLevel.MEDIUM]: 2,
      [PrivacyLevel.HIGH]: 3
    };

    return privacyOrder[requestPrivacyLevel] >= privacyOrder[userPrivacyLevel] 
      ? requestPrivacyLevel 
      : userPrivacyLevel;
  }

  /**
   * Check if location change is significant enough to store
   */
  private isSignificantLocationChange(
    oldLocation: GeoLocation, 
    newLocation: GeoLocation,
    minDistanceMeters: number = 10
  ): boolean {
    const distance = getDistance(
      { latitude: oldLocation.latitude, longitude: oldLocation.longitude },
      { latitude: newLocation.latitude, longitude: newLocation.longitude }
    );

    const timeDiff = newLocation.timestamp.getTime() - oldLocation.timestamp.getTime();
    const minTimeMs = 30 * 1000; // 30 seconds

    return distance >= minDistanceMeters || timeDiff >= minTimeMs;
  }
}