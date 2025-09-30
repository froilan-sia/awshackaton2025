import { GeofenceModel, IGeofenceDocument } from '../models/Geofence';
import { GeofenceEventModel } from '../models/GeofenceEvent';
import { LocationContentModel } from '../models/LocationContent';
import { 
  Geofence, 
  GeofenceEvent, 
  GeofenceEventType, 
  GeoLocation, 
  LocationContent 
} from '../types/location';
import { getDistance } from 'geolib';
const { v4: uuidv4 } = require('uuid');

export class GeofenceService {
  /**
   * Create a new geofence
   */
  async createGeofence(geofenceData: Omit<Geofence, 'id' | 'createdAt' | 'updatedAt'>): Promise<IGeofenceDocument> {
    const geofence = new GeofenceModel({
      ...geofenceData,
      id: uuidv4()
    });

    return await geofence.save();
  }

  /**
   * Get all active geofences
   */
  async getActiveGeofences(): Promise<IGeofenceDocument[]> {
    return await GeofenceModel.find({ isActive: true });
  }

  /**
   * Get geofences near a location
   */
  async getGeofencesNearLocation(
    location: GeoLocation, 
    searchRadiusMeters: number = 5000
  ): Promise<IGeofenceDocument[]> {
    const allGeofences = await this.getActiveGeofences();
    const nearbyGeofences: IGeofenceDocument[] = [];

    for (const geofence of allGeofences) {
      const distance = getDistance(
        { latitude: location.latitude, longitude: location.longitude },
        { 
          latitude: geofence.center.latitude, 
          longitude: geofence.center.longitude 
        }
      );

      // Include geofences within search radius + their own radius
      if (distance <= searchRadiusMeters + geofence.radius) {
        nearbyGeofences.push(geofence);
      }
    }

    return nearbyGeofences;
  }

  /**
   * Check if a location is within any geofences and trigger events
   */
  async checkGeofenceEvents(
    userId: string, 
    currentLocation: GeoLocation,
    previousLocation?: GeoLocation
  ): Promise<GeofenceEvent[]> {
    const nearbyGeofences = await this.getGeofencesNearLocation(currentLocation);
    const events: GeofenceEvent[] = [];

    for (const geofence of nearbyGeofences) {
      const currentlyInside = this.isLocationInGeofence(currentLocation, geofence);
      const previouslyInside = previousLocation ? 
        this.isLocationInGeofence(previousLocation, geofence) : false;

      let eventType: GeofenceEventType | null = null;

      if (currentlyInside && !previouslyInside) {
        eventType = GeofenceEventType.ENTER;
      } else if (!currentlyInside && previouslyInside) {
        eventType = GeofenceEventType.EXIT;
      } else if (currentlyInside && previouslyInside) {
        // Check for dwell event (user has been in geofence for a while)
        const lastDwellEvent = await this.getLastGeofenceEvent(
          userId, 
          geofence.id, 
          GeofenceEventType.DWELL
        );
        
        const dwellThresholdMs = 5 * 60 * 1000; // 5 minutes
        const now = new Date();
        
        if (!lastDwellEvent || 
            (now.getTime() - lastDwellEvent.timestamp.getTime()) > dwellThresholdMs) {
          eventType = GeofenceEventType.DWELL;
        }
      }

      if (eventType) {
        const event = await this.createGeofenceEvent(
          userId,
          geofence.id,
          eventType,
          currentLocation
        );
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Create a geofence event
   */
  async createGeofenceEvent(
    userId: string,
    geofenceId: string,
    eventType: GeofenceEventType,
    location: GeoLocation
  ): Promise<GeofenceEvent> {
    const event = new GeofenceEventModel({
      id: uuidv4(),
      userId,
      geofenceId,
      eventType,
      location,
      timestamp: new Date()
    });

    const savedEvent = await event.save();
    return savedEvent.toObject();
  }

  /**
   * Get geofence events for a user
   */
  async getUserGeofenceEvents(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<GeofenceEvent[]> {
    const query: any = { userId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const events = await GeofenceEventModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);

    return events.map(event => event.toObject());
  }

  /**
   * Update geofence
   */
  async updateGeofence(
    geofenceId: string, 
    updates: Partial<Geofence>
  ): Promise<IGeofenceDocument | null> {
    return await GeofenceModel.findOneAndUpdate(
      { id: geofenceId },
      updates,
      { new: true }
    );
  }

  /**
   * Delete geofence
   */
  async deleteGeofence(geofenceId: string): Promise<boolean> {
    const result = await GeofenceModel.deleteOne({ id: geofenceId });
    return result.deletedCount > 0;
  }

  /**
   * Get geofence by ID
   */
  async getGeofenceById(geofenceId: string): Promise<IGeofenceDocument | null> {
    return await GeofenceModel.findOne({ id: geofenceId });
  }

  /**
   * Check if location is within geofence
   */
  private isLocationInGeofence(location: GeoLocation, geofence: IGeofenceDocument): boolean {
    const distance = getDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { 
        latitude: geofence.center.latitude, 
        longitude: geofence.center.longitude 
      }
    );

    return distance <= geofence.radius;
  }

  /**
   * Get last geofence event of specific type
   */
  private async getLastGeofenceEvent(
    userId: string,
    geofenceId: string,
    eventType: GeofenceEventType
  ): Promise<GeofenceEvent | null> {
    const event = await GeofenceEventModel.findOne({
      userId,
      geofenceId,
      eventType
    }).sort({ timestamp: -1 });

    return event ? event.toObject() : null;
  }

  /**
   * Get geofences by area (for admin/management)
   */
  async getGeofencesByArea(
    centerLat: number,
    centerLng: number,
    radiusKm: number
  ): Promise<IGeofenceDocument[]> {
    const radiusMeters = radiusKm * 1000;
    const allGeofences = await GeofenceModel.find({ isActive: true });
    
    return allGeofences.filter(geofence => {
      const distance = getDistance(
        { latitude: centerLat, longitude: centerLng },
        { 
          latitude: geofence.center.latitude, 
          longitude: geofence.center.longitude 
        }
      );
      return distance <= radiusMeters;
    });
  }

  /**
   * Bulk create geofences (for initial setup)
   */
  async bulkCreateGeofences(geofences: Omit<Geofence, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<IGeofenceDocument[]> {
    const geofenceDocuments = geofences.map(geofence => ({
      ...geofence,
      id: uuidv4()
    }));

    return await GeofenceModel.insertMany(geofenceDocuments);
  }
}