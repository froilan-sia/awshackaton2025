export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface LocationUpdate {
  userId: string;
  location: GeoLocation;
  privacyLevel: PrivacyLevel;
  source: LocationSource;
}

export interface Geofence {
  id: string;
  name: string;
  center: GeoLocation;
  radius: number; // in meters
  contentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeofenceEvent {
  id: string;
  userId: string;
  geofenceId: string;
  eventType: GeofenceEventType;
  location: GeoLocation;
  timestamp: Date;
  contentDelivered?: boolean;
}

export interface LocationContent {
  id: string;
  geofenceId: string;
  title: string;
  description: string;
  content: string;
  mediaUrls?: string[];
  language: string;
  category: ContentCategory;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLocationPreferences {
  userId: string;
  trackingEnabled: boolean;
  privacyLevel: PrivacyLevel;
  shareLocation: boolean;
  contentNotifications: boolean;
  geofenceRadius: number;
  updateFrequency: number; // in seconds
}

export enum PrivacyLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum LocationSource {
  GPS = 'gps',
  NETWORK = 'network',
  MANUAL = 'manual'
}

export enum GeofenceEventType {
  ENTER = 'enter',
  EXIT = 'exit',
  DWELL = 'dwell'
}

export enum ContentCategory {
  HISTORICAL = 'historical',
  CULTURAL = 'cultural',
  PRACTICAL = 'practical',
  SAFETY = 'safety',
  ETIQUETTE = 'etiquette',
  FOOD = 'food',
  SHOPPING = 'shopping',
  TRANSPORTATION = 'transportation'
}