export interface CrowdData {
  locationId: string;
  locationName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  crowdLevel: CrowdLevel;
  estimatedWaitTime: number; // in minutes
  capacity: number;
  currentOccupancy: number;
  timestamp: Date;
  dataSource: CrowdDataSource;
  confidence: number; // 0-1 scale
}

export enum CrowdLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export enum CrowdDataSource {
  MOCK = 'MOCK',
  GOOGLE_PLACES = 'GOOGLE_PLACES',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  SENSOR_DATA = 'SENSOR_DATA',
  USER_REPORTS = 'USER_REPORTS'
}

export interface CrowdPrediction {
  locationId: string;
  predictedCrowdLevel: CrowdLevel;
  predictedWaitTime: number;
  timeSlot: Date;
  confidence: number;
}

export interface AlternativeRecommendation {
  originalLocationId: string;
  alternatives: AlternativeLocation[];
  reason: string;
  generatedAt: Date;
}

export interface AlternativeLocation {
  locationId: string;
  locationName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance: number; // in meters
  crowdLevel: CrowdLevel;
  similarity: number; // 0-1 scale
  category: string;
  estimatedTravelTime: number; // in minutes
}

export interface CrowdAlert {
  id: string;
  locationId: string;
  alertType: CrowdAlertType;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  expiresAt: Date;
  alternatives?: AlternativeLocation[];
}

export enum CrowdAlertType {
  HIGH_CROWD = 'HIGH_CROWD',
  LONG_WAIT = 'LONG_WAIT',
  CAPACITY_REACHED = 'CAPACITY_REACHED',
  CROWD_INCREASING = 'CROWD_INCREASING'
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface RouteOptimization {
  userId: string;
  originalRoute: RoutePoint[];
  optimizedRoute: RoutePoint[];
  crowdAvoidanceScore: number;
  estimatedTimeSaved: number; // in minutes
  alternativesConsidered: number;
}

export interface RoutePoint {
  locationId: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  estimatedArrivalTime: Date;
  estimatedDuration: number; // in minutes
  crowdLevel: CrowdLevel;
}

export interface CrowdNotification {
  userId: string;
  locationId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  data: any;
  timestamp: Date;
  sent: boolean;
}

export enum NotificationType {
  CROWD_ALERT = 'CROWD_ALERT',
  ALTERNATIVE_SUGGESTION = 'ALTERNATIVE_SUGGESTION',
  OPTIMAL_TIME = 'OPTIMAL_TIME',
  ROUTE_UPDATE = 'ROUTE_UPDATE'
}