export interface LocalResident {
  id: string;
  userId: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDate?: Date;
  verificationProof: string[];
  yearsInHongKong: number;
  districts: string[];
  languages: string[];
  specialties: string[]; // food, culture, history, nightlife, etc.
  credibilityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalInsight {
  id: string;
  authorId: string;
  locationId: string;
  locationType: 'attraction' | 'restaurant' | 'district' | 'activity';
  title: string;
  content: string;
  category: InsightCategory;
  tags: string[];
  authenticityScore: number;
  localRating: number;
  touristTrapWarning?: boolean;
  bestTimeToVisit?: string;
  localTips: string[];
  culturalContext?: string;
  language: string;
  upvotes: number;
  downvotes: number;
  reportCount: number;
  status: 'active' | 'flagged' | 'removed';
  createdAt: Date;
  updatedAt: Date;
}

export interface TouristReview {
  id: string;
  authorId: string;
  locationId: string;
  rating: number;
  content: string;
  visitDate: Date;
  groupType: 'solo' | 'couple' | 'family' | 'friends' | 'business';
  nationality?: string;
  language: string;
  helpfulVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalFoodInsight {
  id: string;
  authorId: string;
  restaurantId: string;
  dishName: string;
  description: string;
  localPrice: number;
  touristPrice?: number;
  orderingTips: string[];
  culturalSignificance?: string;
  seasonality?: string;
  authenticityScore: number;
  localPopularity: number;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CulturalInsight {
  id: string;
  authorId: string;
  category: CulturalCategory;
  title: string;
  content: string;
  context: string;
  doAndDonts: {
    dos: string[];
    donts: string[];
  };
  examples: string[];
  commonMistakes: string[];
  language: string;
  relevantLocations: string[];
  authenticityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticityMetrics {
  locationId: string;
  localVsTouristRatio: number;
  authenticityScore: number;
  touristTrapScore: number;
  localRecommendationScore: number;
  crowdingImpact: number;
  priceInflationScore: number;
  culturalPreservationScore: number;
  lastUpdated: Date;
}

export type InsightCategory = 
  | 'hidden_gem' 
  | 'tourist_trap_warning' 
  | 'local_favorite' 
  | 'cultural_context' 
  | 'practical_tip' 
  | 'food_recommendation' 
  | 'timing_advice' 
  | 'etiquette_guide';

export type CulturalCategory = 
  | 'dining_etiquette' 
  | 'temple_behavior' 
  | 'public_transport' 
  | 'shopping_customs' 
  | 'greeting_customs' 
  | 'gift_giving' 
  | 'business_etiquette' 
  | 'festival_participation';

export interface InsightFilter {
  category?: InsightCategory;
  locationId?: string;
  locationType?: string;
  language?: string;
  minAuthenticityScore?: number;
  tags?: string[];
  authorVerified?: boolean;
}

export interface ReviewComparison {
  locationId: string;
  localPerspective: {
    averageRating: number;
    totalReviews: number;
    commonThemes: string[];
    warnings: string[];
    recommendations: string[];
  };
  touristPerspective: {
    averageRating: number;
    totalReviews: number;
    commonThemes: string[];
    complaints: string[];
    highlights: string[];
  };
  discrepancyScore: number;
  authenticityIndicators: string[];
}