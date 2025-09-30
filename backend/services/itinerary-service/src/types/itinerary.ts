export interface UserPreferences {
  interests: string[];
  budgetRange: BudgetRange;
  groupType: GroupType;
  dietaryRestrictions: string[];
  activityLevel: ActivityLevel;
  accessibilityNeeds: string[];
  language: string;
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
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
  HIGH = 'high'
}

export interface ItineraryRequest {
  userId: string;
  preferences: UserPreferences;
  startDate: Date;
  endDate: Date;
  startLocation?: GeoLocation;
  accommodationLocation?: GeoLocation;
  constraints?: ItineraryConstraints;
}

export interface ItineraryConstraints {
  maxDailyWalkingDistance?: number; // in meters
  preferredStartTime?: string; // HH:mm format
  preferredEndTime?: string; // HH:mm format
  mustIncludeAttractions?: string[];
  excludeAttractions?: string[];
  transportationModes?: TransportationMode[];
}

export enum TransportationMode {
  WALKING = 'walking',
  MTR = 'mtr',
  BUS = 'bus',
  TAXI = 'taxi',
  TRAM = 'tram',
  FERRY = 'ferry'
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Itinerary {
  id: string;
  userId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  days: ItineraryDay[];
  totalEstimatedCost: number;
  totalWalkingDistance: number;
  weatherConsiderations: WeatherConsideration[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ItineraryDay {
  date: Date;
  activities: ItineraryActivity[];
  totalDuration: number; // in minutes
  totalWalkingDistance: number; // in meters
  estimatedCost: number;
  weatherForecast?: WeatherInfo;
}

export interface ItineraryActivity {
  id: string;
  attractionId: string;
  name: string;
  description: string;
  location: GeoLocation;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  category: string;
  estimatedCost: number;
  weatherDependent: boolean;
  practicalTips: PracticalTip[];
  travelFromPrevious?: TravelInfo;
}

export interface TravelInfo {
  mode: TransportationMode;
  duration: number; // in minutes
  distance: number; // in meters
  cost: number;
  instructions: string[];
}

export interface PracticalTip {
  category: TipCategory;
  content: string;
  conditions: string[];
  priority: Priority;
}

export enum TipCategory {
  SAFETY = 'safety',
  ETIQUETTE = 'etiquette',
  PREPARATION = 'preparation',
  WEATHER = 'weather',
  TIMING = 'timing',
  CULTURAL = 'cultural'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface WeatherInfo {
  date: Date;
  temperature: {
    min: number;
    max: number;
  };
  humidity: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
  description: string;
}

export interface WeatherConsideration {
  date: Date;
  recommendation: string;
  alternativeActivities: string[];
  preparationTips: string[];
}

export interface ItineraryModification {
  type: ModificationType;
  activityId?: string;
  newActivity?: Partial<ItineraryActivity>;
  reason: string;
  timestamp: Date;
}

export enum ModificationType {
  ADD_ACTIVITY = 'add_activity',
  REMOVE_ACTIVITY = 'remove_activity',
  REPLACE_ACTIVITY = 'replace_activity',
  RESCHEDULE_ACTIVITY = 'reschedule_activity',
  WEATHER_ADJUSTMENT = 'weather_adjustment',
  CROWD_ADJUSTMENT = 'crowd_adjustment'
}

export interface OptimizationResult {
  score: number;
  factors: {
    userPreferenceMatch: number;
    weatherOptimization: number;
    travelEfficiency: number;
    timeUtilization: number;
    costEfficiency: number;
  };
  suggestions: string[];
}

export interface AttractionData {
  id: string;
  name: string;
  description: string;
  location: GeoLocation;
  categories: string[];
  averageDuration: number; // in minutes
  estimatedCost: number;
  weatherDependent: boolean;
  crowdPatterns: CrowdPattern[];
  openingHours: OpeningHours[];
  practicalTips: PracticalTip[];
  localInsights: LocalInsight[];
}

export interface CrowdPattern {
  dayOfWeek: number; // 0-6, Sunday = 0
  hourlyLevels: number[]; // 24 values, 0-100 scale
}

export interface OpeningHours {
  dayOfWeek: number;
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
  closed: boolean;
}

export interface LocalInsight {
  type: string;
  content: string;
  authenticityScore: number;
  localRating: number;
}