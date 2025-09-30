export interface Event {
    id: string;
    title: string;
    description: string;
    location: GeoLocation;
    startTime: Date;
    endTime: Date;
    source: EventSource;
    targetAudience: string[];
    weatherDependent: boolean;
    categories: EventCategory[];
    pricing: EventPricing;
    capacity: EventCapacity;
    organizer: EventOrganizer;
    images: string[];
    tags: string[];
    localPerspective: EventLocalInsight;
    practicalInfo: EventPracticalInfo;
    createdAt: Date;
    updatedAt: Date;
}
export interface GeoLocation {
    latitude: number;
    longitude: number;
    address: string;
    district: string;
    venue: string;
    nearbyTransport: TransportInfo[];
}
export interface EventPricing {
    isFree: boolean;
    ticketPrices: TicketPrice[];
    currency: string;
    bookingRequired: boolean;
    bookingUrl?: string;
    earlyBirdDiscount?: Discount;
}
export interface EventCapacity {
    maxAttendees?: number;
    currentRegistrations?: number;
    waitlistAvailable: boolean;
    isFullyBooked: boolean;
}
export interface EventOrganizer {
    name: string;
    type: OrganizerType;
    contact: ContactInfo;
    website?: string;
    socialMedia?: SocialMediaLinks;
}
export interface EventLocalInsight {
    localPopularity: number;
    localRecommendation: boolean;
    culturalSignificance: string;
    localTips: string[];
    authenticityScore: number;
}
export interface EventPracticalInfo {
    dressCode?: string;
    ageRestrictions?: AgeRestriction;
    languageSupport: string[];
    accessibility: AccessibilityInfo;
    weatherContingency?: string;
    whatToBring: string[];
    parkingInfo?: ParkingInfo;
}
export interface TicketPrice {
    category: string;
    price: number;
    description: string;
    ageGroup?: AgeGroup;
}
export interface Discount {
    percentage: number;
    validUntil: Date;
    conditions: string[];
}
export interface ContactInfo {
    email?: string;
    phone?: string;
    address?: string;
}
export interface SocialMediaLinks {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
}
export interface AgeRestriction {
    minAge?: number;
    maxAge?: number;
    requiresGuardian: boolean;
    description: string;
}
export interface AccessibilityInfo {
    wheelchairAccessible: boolean;
    signLanguageSupport: boolean;
    audioDescriptionAvailable: boolean;
    largeTextAvailable: boolean;
    specialAccommodations: string[];
}
export interface ParkingInfo {
    available: boolean;
    cost?: number;
    spaces?: number;
    restrictions?: string[];
}
export interface TransportInfo {
    type: TransportType;
    name: string;
    walkingTime: number;
    distance: number;
}
export declare enum EventSource {
    HKTB = "hktb",
    MALL = "mall",
    COMMUNITY = "community",
    GOVERNMENT = "government",
    PRIVATE = "private",
    CULTURAL_INSTITUTION = "cultural_institution"
}
export declare enum EventCategory {
    CULTURAL = "cultural",
    ENTERTAINMENT = "entertainment",
    FOOD_DRINK = "food_drink",
    SPORTS = "sports",
    EDUCATION = "education",
    FAMILY = "family",
    BUSINESS = "business",
    FESTIVAL = "festival",
    EXHIBITION = "exhibition",
    PERFORMANCE = "performance",
    WORKSHOP = "workshop",
    SEASONAL = "seasonal"
}
export declare enum OrganizerType {
    GOVERNMENT = "government",
    PRIVATE_COMPANY = "private_company",
    NON_PROFIT = "non_profit",
    CULTURAL_INSTITUTION = "cultural_institution",
    MALL = "mall",
    COMMUNITY_GROUP = "community_group"
}
export declare enum AgeGroup {
    CHILD = "child",
    ADULT = "adult",
    SENIOR = "senior",
    STUDENT = "student"
}
export declare enum TransportType {
    MTR = "mtr",
    BUS = "bus",
    TRAM = "tram",
    FERRY = "ferry",
    TAXI = "taxi",
    WALKING = "walking"
}
//# sourceMappingURL=event.d.ts.map