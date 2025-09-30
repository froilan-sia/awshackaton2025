export interface User {
    id: string;
    email: string;
    preferences: UserPreferences;
    travelHistory: TravelRecord[];
    language: string;
    accessibilityNeeds: AccessibilityRequirements;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserPreferences {
    interests: string[];
    budgetRange: BudgetRange;
    groupType: GroupType;
    dietaryRestrictions: string[];
    activityLevel: ActivityLevel;
    weatherPreferences: WeatherPreference[];
}
export interface TravelRecord {
    id: string;
    destination: string;
    startDate: Date;
    endDate: Date;
    activities: string[];
    ratings: ActivityRating[];
}
export interface AccessibilityRequirements {
    mobilityAssistance: boolean;
    visualAssistance: boolean;
    hearingAssistance: boolean;
    cognitiveAssistance: boolean;
    specificNeeds: string[];
}
export interface ActivityRating {
    activityId: string;
    rating: number;
    feedback: string;
    timestamp: Date;
}
export declare enum BudgetRange {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    LUXURY = "luxury"
}
export declare enum GroupType {
    SOLO = "solo",
    COUPLE = "couple",
    FAMILY = "family",
    FRIENDS = "friends",
    BUSINESS = "business"
}
export declare enum ActivityLevel {
    LOW = "low",
    MODERATE = "moderate",
    HIGH = "high",
    EXTREME = "extreme"
}
export declare enum WeatherPreference {
    INDOOR_PREFERRED = "indoor_preferred",
    OUTDOOR_PREFERRED = "outdoor_preferred",
    WEATHER_FLEXIBLE = "weather_flexible"
}
//# sourceMappingURL=user.d.ts.map