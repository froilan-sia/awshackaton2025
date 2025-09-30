// User types
export * from './user';

// Attraction types
export * from './attraction';

// Event types
export * from './event';

// Recommendation types
export * from './recommendation';

// Common types used across modules
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  fallbackAction?: string;
  retryAfter?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SearchFilters {
  categories?: string[];
  priceRange?: PriceRange;
  distance?: number;
  rating?: number;
  accessibility?: AccessibilityFilter;
  weather?: WeatherFilter;
  crowd?: CrowdFilter;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface AccessibilityFilter {
  wheelchairAccessible?: boolean;
  visualSupport?: boolean;
  hearingSupport?: boolean;
}

export interface WeatherFilter {
  preferredConditions: WeatherCondition[];
  avoidConditions: WeatherCondition[];
}

export interface CrowdFilter {
  maxCrowdLevel: CrowdLevel;
  preferredTimes: string[];
}

// Re-export enums for convenience
export {
  BudgetRange,
  GroupType,
  ActivityLevel,
  WeatherPreference,
  TipCategory,
  Priority,
  CrowdLevel,
  WeatherCondition,
  WarningSeverity,
  TransportType,
  EventSource,
  EventCategory,
  OrganizerType,
  AgeGroup,
  RecommendationType,
  ItemType,
  ContextType,
  ConsiderationCategory,
  WeatherImpact,
  CulturalCategory,
  RecommendationStatus
} from './user';

export {
  TipCategory as AttractionTipCategory,
  Priority as AttractionPriority,
  CrowdLevel as AttractionCrowdLevel,
  WeatherCondition as AttractionWeatherCondition,
  WarningSeverity as AttractionWarningSeverity,
  TransportType as AttractionTransportType
} from './attraction';

export {
  EventSource,
  EventCategory,
  OrganizerType,
  AgeGroup,
  TransportType as EventTransportType
} from './event';

export {
  RecommendationType,
  ItemType,
  ContextType,
  ConsiderationCategory,
  Priority as RecommendationPriority,
  WeatherCondition as RecommendationWeatherCondition,
  WeatherImpact,
  CulturalCategory,
  CrowdLevel as RecommendationCrowdLevel,
  TransportType as RecommendationTransportType,
  RecommendationStatus
} from './recommendation';