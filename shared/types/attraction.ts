export interface Attraction {
  id: string;
  name: string;
  location: GeoLocation;
  categories: string[];
  description: string;
  localPerspective: LocalInsight;
  practicalTips: PracticalTip[];
  crowdData: CrowdInfo;
  weatherDependency: WeatherDependency;
  operatingHours: OperatingHours;
  accessibility: AccessibilityInfo;
  pricing: PricingInfo;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  district: string;
  nearbyTransport: TransportInfo[];
}

export interface LocalInsight {
  localRating: number;
  localReviews: LocalReview[];
  authenticityScore: number;
  localRecommendations: string[];
  culturalContext: string;
  bestTimeToVisit: string;
  localTips: string[];
}

export interface LocalReview {
  id: string;
  userId: string;
  isLocalResident: boolean;
  rating: number;
  comment: string;
  tags: string[];
  timestamp: Date;
  helpfulVotes: number;
}

export interface PracticalTip {
  id: string;
  category: TipCategory;
  content: string;
  conditions: string[];
  priority: Priority;
  applicableWeather: WeatherCondition[];
  language: string;
}

export interface CrowdInfo {
  currentLevel: CrowdLevel;
  historicalData: CrowdHistoryPoint[];
  predictedLevels: CrowdPrediction[];
  peakHours: TimeRange[];
  alternatives: string[];
}

export interface WeatherDependency {
  isWeatherDependent: boolean;
  preferredWeather: WeatherCondition[];
  alternativesForBadWeather: string[];
  weatherWarnings: WeatherWarning[];
}

export interface OperatingHours {
  monday: TimeRange;
  tuesday: TimeRange;
  wednesday: TimeRange;
  thursday: TimeRange;
  friday: TimeRange;
  saturday: TimeRange;
  sunday: TimeRange;
  holidays: HolidayHours[];
}

export interface AccessibilityInfo {
  wheelchairAccessible: boolean;
  visuallyImpairedSupport: boolean;
  hearingImpairedSupport: boolean;
  elevatorAccess: boolean;
  accessibleParking: boolean;
  accessibleRestrooms: boolean;
  notes: string;
}

export interface PricingInfo {
  isFree: boolean;
  adultPrice?: number;
  childPrice?: number;
  seniorPrice?: number;
  groupDiscounts?: GroupDiscount[];
  currency: string;
}

export interface TransportInfo {
  type: TransportType;
  name: string;
  walkingTime: number;
  distance: number;
}

export interface CrowdHistoryPoint {
  timestamp: Date;
  level: CrowdLevel;
  waitTime: number;
}

export interface CrowdPrediction {
  timestamp: Date;
  predictedLevel: CrowdLevel;
  confidence: number;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface WeatherWarning {
  condition: WeatherCondition;
  warning: string;
  severity: WarningSeverity;
}

export interface HolidayHours {
  date: Date;
  hours: TimeRange;
  isClosed: boolean;
}

export interface GroupDiscount {
  minSize: number;
  discountPercentage: number;
  description: string;
}

export enum TipCategory {
  SAFETY = 'safety',
  ETIQUETTE = 'etiquette',
  PREPARATION = 'preparation',
  WEATHER = 'weather',
  CULTURAL = 'cultural',
  PRACTICAL = 'practical'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum CrowdLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum WeatherCondition {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  RAINY = 'rainy',
  STORMY = 'stormy',
  HOT = 'hot',
  HUMID = 'humid',
  COOL = 'cool',
  WINDY = 'windy'
}

export enum WarningSeverity {
  INFO = 'info',
  WARNING = 'warning',
  DANGER = 'danger'
}

export enum TransportType {
  MTR = 'mtr',
  BUS = 'bus',
  TRAM = 'tram',
  FERRY = 'ferry',
  TAXI = 'taxi',
  WALKING = 'walking'
}