export interface User {
  id: string;
  email: string;
  preferences: UserPreferences;
  language: string;
  accessibilityNeeds?: AccessibilityRequirements;
}

export interface UserPreferences {
  interests: string[];
  budgetRange: BudgetRange;
  groupType: GroupType;
  dietaryRestrictions: string[];
  activityLevel: ActivityLevel;
}

export interface AccessibilityRequirements {
  wheelchairAccess: boolean;
  visualImpairment: boolean;
  hearingImpairment: boolean;
  mobilityAssistance: boolean;
}

export enum BudgetRange {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  LUXURY = 'luxury'
}

export enum GroupType {
  SOLO = 'solo',
  COUPLE = 'couple',
  FAMILY = 'family',
  FRIENDS = 'friends',
  BUSINESS = 'business'
}

export enum ActivityLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  EXTREME = 'extreme'
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  location: GeoLocation;
  rating: number;
  localRating?: number;
  crowdLevel: CrowdLevel;
  weatherSuitability: WeatherSuitability;
  practicalTips: PracticalTip[];
  estimatedDuration: number;
  priceRange: BudgetRange;
  images: string[];
  localInsights?: LocalInsight;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  district: string;
}

export enum CrowdLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface WeatherSuitability {
  indoor: boolean;
  outdoor: boolean;
  weatherDependent: boolean;
  bestWeatherConditions: string[];
}

export interface PracticalTip {
  category: TipCategory;
  content: string;
  priority: Priority;
  conditions?: string[];
}

export enum TipCategory {
  SAFETY = 'safety',
  ETIQUETTE = 'etiquette',
  PREPARATION = 'preparation',
  WEATHER = 'weather',
  CULTURAL = 'cultural'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface LocalInsight {
  localRating: number;
  authenticityScore: number;
  localRecommendations: string[];
  culturalContext: string;
  isHiddenGem: boolean;
}

export interface Itinerary {
  id: string;
  title: string;
  description: string;
  duration: number; // in days
  activities: ItineraryActivity[];
  totalEstimatedCost: number;
  weatherConsiderations: string[];
  practicalNotes: string[];
}

export interface ItineraryActivity {
  id: string;
  recommendationId: string;
  day: number;
  startTime: string;
  endTime: string;
  travelTime: number;
  notes?: string;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

export enum NotificationType {
  WEATHER_ALERT = 'weather_alert',
  CROWD_ALERT = 'crowd_alert',
  LOCATION_CONTENT = 'location_content',
  EVENT_REMINDER = 'event_reminder',
  ITINERARY_UPDATE = 'itinerary_update'
}