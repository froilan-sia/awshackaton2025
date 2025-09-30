export enum TipCategory {
  SAFETY = 'safety',
  ETIQUETTE = 'etiquette',
  PREPARATION = 'preparation',
  WEATHER = 'weather',
  CULTURAL = 'cultural',
  TRANSPORTATION = 'transportation'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum VenueType {
  TEMPLE = 'temple',
  MUSEUM = 'museum',
  RESTAURANT = 'restaurant',
  SHOPPING_MALL = 'shopping_mall',
  HIKING_TRAIL = 'hiking_trail',
  BEACH = 'beach',
  MARKET = 'market',
  TRANSPORTATION_HUB = 'transportation_hub',
  CULTURAL_SITE = 'cultural_site',
  NIGHTLIFE = 'nightlife',
  BUSINESS_DISTRICT = 'business_district'
}

export enum WeatherCondition {
  SUNNY = 'sunny',
  RAINY = 'rainy',
  TYPHOON = 'typhoon',
  HOT_HUMID = 'hot_humid',
  COOL_DRY = 'cool_dry',
  FOGGY = 'foggy'
}

export interface PracticalTip {
  id: string;
  category: TipCategory;
  title: string;
  content: string;
  priority: Priority;
  conditions: TipCondition[];
  applicableVenues: VenueType[];
  weatherConditions: WeatherCondition[];
  language: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TipCondition {
  type: 'location' | 'weather' | 'time' | 'venue' | 'user_profile';
  value: any;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range';
}

export interface ContextualTipRequest {
  userId?: string;
  location: {
    latitude: number;
    longitude: number;
    venueType?: VenueType;
    venueName?: string;
  };
  weather?: {
    condition: WeatherCondition;
    temperature: number;
    humidity: number;
    windSpeed: number;
  };
  userProfile?: {
    interests: string[];
    accessibilityNeeds: string[];
    language: string;
    groupType: 'solo' | 'couple' | 'family' | 'group';
  };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  categories?: TipCategory[];
}

export interface TipDeliveryResponse {
  tips: PracticalTip[];
  totalCount: number;
  contextualRelevance: number;
  deliveryMethod: 'immediate' | 'scheduled' | 'on_demand';
}

export interface WeatherSpecificRecommendation {
  id: string;
  weatherCondition: WeatherCondition;
  title: string;
  description: string;
  items: string[];
  clothing: string[];
  precautions: string[];
  alternatives: string[];
  priority: Priority;
}

export interface CulturalEtiquetteGuide {
  id: string;
  venueType: VenueType;
  title: string;
  description: string;
  dosList: string[];
  dontsList: string[];
  dresscode?: string;
  behaviorGuidelines: string[];
  commonMistakes: string[];
  localCustoms: string[];
  language: string;
}

export interface LocationBasedTip {
  id: string;
  location: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
    name: string;
    venueType: VenueType;
  };
  tips: PracticalTip[];
  triggerConditions: TipCondition[];
  isActive: boolean;
}