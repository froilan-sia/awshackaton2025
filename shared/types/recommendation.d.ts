export interface Recommendation {
    id: string;
    userId: string;
    type: RecommendationType;
    content: RecommendationContent;
    personalizedScore: number;
    contextualFactors: ContextualFactor[];
    practicalConsiderations: PracticalConsideration[];
    generatedAt: Date;
    validUntil: Date;
    status: RecommendationStatus;
    feedback?: RecommendationFeedback;
}
export interface RecommendationContent {
    title: string;
    description: string;
    primaryItem: RecommendationItem;
    alternatives: RecommendationItem[];
    itinerary?: ItineraryItem[];
    estimatedDuration: number;
    estimatedCost: CostEstimate;
    weatherConsiderations: WeatherConsideration[];
    culturalTips: CulturalTip[];
}
export interface RecommendationItem {
    id: string;
    type: ItemType;
    name: string;
    location: GeoLocation;
    description: string;
    rating: number;
    images: string[];
    practicalInfo: PracticalInfo;
    localInsight: LocalInsight;
}
export interface ContextualFactor {
    type: ContextType;
    value: any;
    impact: number;
    confidence: number;
    description: string;
}
export interface PracticalConsideration {
    category: ConsiderationCategory;
    title: string;
    description: string;
    priority: Priority;
    actionRequired: boolean;
    tips: string[];
}
export interface ItineraryItem {
    order: number;
    item: RecommendationItem;
    startTime: Date;
    endTime: Date;
    travelTime: number;
    transportMethod: TransportMethod;
    notes: string[];
}
export interface CostEstimate {
    min: number;
    max: number;
    currency: string;
    breakdown: CostBreakdown[];
    budgetTips: string[];
}
export interface WeatherConsideration {
    condition: WeatherCondition;
    impact: WeatherImpact;
    alternatives: string[];
    preparation: string[];
}
export interface CulturalTip {
    category: CulturalCategory;
    tip: string;
    importance: Priority;
    context: string;
}
export interface PracticalInfo {
    openingHours: OperatingHours;
    accessibility: AccessibilityInfo;
    crowdLevel: CrowdLevel;
    bestTimeToVisit: string;
    whatToBring: string[];
    dressCode?: string;
}
export interface LocalInsight {
    localRating: number;
    authenticityScore: number;
    localTips: string[];
    culturalContext: string;
    hiddenGems: string[];
}
export interface GeoLocation {
    latitude: number;
    longitude: number;
    address: string;
    district: string;
    nearbyLandmarks: string[];
}
export interface CostBreakdown {
    category: string;
    amount: number;
    description: string;
    isOptional: boolean;
}
export interface TransportMethod {
    type: TransportType;
    duration: number;
    cost: number;
    instructions: string[];
}
export interface OperatingHours {
    [key: string]: TimeRange;
}
export interface TimeRange {
    start: string;
    end: string;
}
export interface AccessibilityInfo {
    wheelchairAccessible: boolean;
    visualSupport: boolean;
    hearingSupport: boolean;
    notes: string[];
}
export interface RecommendationFeedback {
    rating: number;
    liked: boolean;
    visited: boolean;
    comments: string;
    improvements: string[];
    timestamp: Date;
}
export declare enum RecommendationType {
    ATTRACTION = "attraction",
    RESTAURANT = "restaurant",
    EVENT = "event",
    ITINERARY = "itinerary",
    ACTIVITY = "activity",
    EXPERIENCE = "experience",
    SHOPPING = "shopping",
    NIGHTLIFE = "nightlife"
}
export declare enum ItemType {
    ATTRACTION = "attraction",
    RESTAURANT = "restaurant",
    EVENT = "event",
    ACTIVITY = "activity",
    SHOP = "shop",
    ACCOMMODATION = "accommodation"
}
export declare enum ContextType {
    WEATHER = "weather",
    CROWD = "crowd",
    TIME = "time",
    LOCATION = "location",
    SEASON = "season",
    USER_HISTORY = "user_history",
    SOCIAL_TRENDS = "social_trends"
}
export declare enum ConsiderationCategory {
    WEATHER = "weather",
    CROWD = "crowd",
    CULTURAL = "cultural",
    SAFETY = "safety",
    ACCESSIBILITY = "accessibility",
    BUDGET = "budget",
    TIME = "time",
    TRANSPORT = "transport"
}
export declare enum Priority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum WeatherCondition {
    SUNNY = "sunny",
    CLOUDY = "cloudy",
    RAINY = "rainy",
    STORMY = "stormy",
    HOT = "hot",
    HUMID = "humid",
    COOL = "cool",
    WINDY = "windy"
}
export declare enum WeatherImpact {
    POSITIVE = "positive",
    NEUTRAL = "neutral",
    NEGATIVE = "negative",
    BLOCKING = "blocking"
}
export declare enum CulturalCategory {
    ETIQUETTE = "etiquette",
    CUSTOMS = "customs",
    LANGUAGE = "language",
    BEHAVIOR = "behavior",
    DRESS = "dress",
    DINING = "dining",
    RELIGIOUS = "religious"
}
export declare enum CrowdLevel {
    VERY_LOW = "very_low",
    LOW = "low",
    MODERATE = "moderate",
    HIGH = "high",
    VERY_HIGH = "very_high"
}
export declare enum TransportType {
    MTR = "mtr",
    BUS = "bus",
    TRAM = "tram",
    FERRY = "ferry",
    TAXI = "taxi",
    WALKING = "walking",
    UBER = "uber"
}
export declare enum RecommendationStatus {
    ACTIVE = "active",
    EXPIRED = "expired",
    DISMISSED = "dismissed",
    COMPLETED = "completed"
}
//# sourceMappingURL=recommendation.d.ts.map