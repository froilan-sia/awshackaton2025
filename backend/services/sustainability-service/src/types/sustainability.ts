export interface LocalBusiness {
  id: string;
  name: string;
  type: BusinessType;
  location: {
    latitude: number;
    longitude: number;
    district: string;
    address: string;
  };
  sustainabilityScore: number;
  localOwnership: boolean;
  employeesCount: number;
  certifications: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessVisit {
  id: string;
  userId: string;
  businessId: string;
  visitDate: Date;
  duration: number; // in minutes
  estimatedSpending: number;
  visitType: VisitType;
  transportationMode: TransportationMode;
  carbonFootprint: number; // in kg CO2
  economicImpact: number;
  createdAt: Date;
}

export interface SustainabilityScore {
  businessId: string;
  overallScore: number;
  localOwnershipScore: number;
  environmentalScore: number;
  communityImpactScore: number;
  culturalPreservationScore: number;
  lastUpdated: Date;
}

export interface TripImpactSummary {
  id: string;
  userId: string;
  tripId: string;
  startDate: Date;
  endDate: Date;
  totalCarbonFootprint: number;
  totalEconomicImpact: number;
  localBusinessesVisited: number;
  sustainabilityScore: number;
  ecoFriendlyTransportUsage: number; // percentage
  recommendations: string[];
  createdAt: Date;
}

export interface EcoTransportOption {
  id: string;
  type: TransportationMode;
  route: {
    from: string;
    to: string;
  };
  carbonFootprint: number; // per km
  cost: number;
  duration: number; // in minutes
  availability: boolean;
  sustainabilityBenefit: string;
}

export enum BusinessType {
  RESTAURANT = 'restaurant',
  SHOP = 'shop',
  ATTRACTION = 'attraction',
  ACCOMMODATION = 'accommodation',
  TOUR_OPERATOR = 'tour_operator',
  CULTURAL_SITE = 'cultural_site'
}

export enum VisitType {
  DINING = 'dining',
  SHOPPING = 'shopping',
  SIGHTSEEING = 'sightseeing',
  ACCOMMODATION = 'accommodation',
  ACTIVITY = 'activity'
}

export enum TransportationMode {
  WALKING = 'walking',
  CYCLING = 'cycling',
  PUBLIC_TRANSPORT = 'public_transport',
  TAXI = 'taxi',
  PRIVATE_CAR = 'private_car',
  ELECTRIC_VEHICLE = 'electric_vehicle',
  FERRY = 'ferry'
}

export interface SustainabilityMetrics {
  totalVisits: number;
  averageSustainabilityScore: number;
  carbonSaved: number;
  localEconomicImpact: number;
  ecoTransportUsage: number;
}