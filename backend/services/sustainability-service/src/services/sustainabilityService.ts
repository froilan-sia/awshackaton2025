import { BusinessVisitTrackingService } from './businessVisitTrackingService';
import { SustainabilityScoringService } from './sustainabilityScoringService';
import { EcoTransportService } from './ecoTransportService';
import { TripImpactService } from './tripImpactService';
import { 
  BusinessVisit, 
  LocalBusiness, 
  TripImpactSummary, 
  EcoTransportOption,
  SustainabilityMetrics,
  VisitType,
  TransportationMode
} from '../types/sustainability';

export class SustainabilityService {
  private businessVisitService: BusinessVisitTrackingService;
  private scoringService: SustainabilityScoringService;
  private ecoTransportService: EcoTransportService;
  private tripImpactService: TripImpactService;

  constructor() {
    this.businessVisitService = new BusinessVisitTrackingService();
    this.scoringService = new SustainabilityScoringService();
    this.ecoTransportService = new EcoTransportService();
    this.tripImpactService = new TripImpactService(this.businessVisitService);
  }

  // Business Visit Tracking
  async trackBusinessVisit(visitData: {
    userId: string;
    businessId: string;
    duration: number;
    estimatedSpending: number;
    visitType: VisitType;
    transportationMode: TransportationMode;
    distance?: number;
  }): Promise<BusinessVisit> {
    return await this.businessVisitService.trackVisit(visitData);
  }

  async getUserVisits(userId: string, startDate?: Date, endDate?: Date): Promise<BusinessVisit[]> {
    return await this.businessVisitService.getUserVisits(userId, startDate, endDate);
  }

  async getUserSustainabilityMetrics(userId: string, startDate?: Date, endDate?: Date): Promise<SustainabilityMetrics> {
    return await this.businessVisitService.getUserSustainabilityMetrics(userId, startDate, endDate);
  }

  // Local Business Management
  async addLocalBusiness(businessData: Partial<LocalBusiness>): Promise<LocalBusiness> {
    const business = await this.businessVisitService.addLocalBusiness(businessData);
    
    // Calculate sustainability score
    await this.scoringService.calculateBusinessScore(business.toJSON());
    
    return business.toJSON();
  }

  async getLocalBusinesses(district?: string): Promise<LocalBusiness[]> {
    const businesses = await this.businessVisitService.getLocalBusinesses(district);
    return businesses.map(business => business.toJSON());
  }

  async getBusinessWithScore(businessId: string): Promise<{
    business: LocalBusiness;
    score: any;
  } | null> {
    const business = await this.businessVisitService.getLocalBusiness(businessId);
    if (!business) return null;

    const score = await this.scoringService.getBusinessScore(businessId) || 
                  await this.scoringService.calculateBusinessScore(business.toJSON());

    return {
      business: business.toJSON(),
      score
    };
  }

  // Sustainability Scoring
  async getTopSustainableBusinesses(limit: number = 10, district?: string): Promise<any[]> {
    return await this.scoringService.getTopSustainableBusinesses(limit, district);
  }

  async getSustainabilityBenchmarks(): Promise<any> {
    return await this.scoringService.getBenchmarkScores();
  }

  // Eco-friendly Transportation
  async getEcoTransportRecommendations(
    from: string,
    to: string,
    preferences: {
      maxCost?: number;
      maxDuration?: number;
      prioritizeSustainability?: boolean;
    } = {}
  ): Promise<EcoTransportOption[]> {
    return await this.ecoTransportService.getRecommendedTransport(from, to, preferences);
  }

  async calculateTripCarbonFootprint(
    transportModes: { mode: TransportationMode; distance: number }[]
  ): Promise<number> {
    return await this.ecoTransportService.calculateTripCarbonFootprint(transportModes);
  }

  async getTransportSustainabilityTips(mode: TransportationMode): Promise<string[]> {
    return await this.ecoTransportService.getSustainabilityTips(mode);
  }

  async getTransportModeImpact(mode: TransportationMode): Promise<any> {
    return await this.ecoTransportService.getTransportModeImpact(mode);
  }

  // Trip Impact Summary and Reporting
  async generateTripSummary(
    userId: string,
    tripId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TripImpactSummary> {
    return await this.tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);
  }

  async getTripSummary(tripId: string): Promise<TripImpactSummary | null> {
    return await this.tripImpactService.getTripSummary(tripId);
  }

  async getUserTripSummaries(userId: string): Promise<TripImpactSummary[]> {
    return await this.tripImpactService.getUserTripSummaries(userId);
  }

  async generateDetailedImpactReport(tripId: string): Promise<any> {
    return await this.tripImpactService.generateDetailedImpactReport(tripId);
  }

  async compareWithBenchmarks(tripId: string): Promise<any> {
    return await this.tripImpactService.compareWithBenchmarks(tripId);
  }

  // Comprehensive Sustainability Insights
  async getSustainabilityInsights(userId: string): Promise<{
    overallScore: number;
    metrics: SustainabilityMetrics;
    recentTrips: TripImpactSummary[];
    recommendations: string[];
    achievements: string[];
  }> {
    const metrics = await this.getUserSustainabilityMetrics(userId);
    const recentTrips = (await this.getUserTripSummaries(userId)).slice(0, 3);
    
    const recommendations = this.generatePersonalizedRecommendations(metrics, recentTrips);
    const achievements = this.generateAchievements(metrics, recentTrips);
    
    // Calculate overall sustainability score
    const overallScore = this.calculateOverallSustainabilityScore(metrics, recentTrips);

    return {
      overallScore,
      metrics,
      recentTrips,
      recommendations,
      achievements
    };
  }

  private generatePersonalizedRecommendations(
    metrics: SustainabilityMetrics,
    recentTrips: TripImpactSummary[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.ecoTransportUsage < 60) {
      recommendations.push('Try using MTR, walking, or cycling more often to reduce your carbon footprint');
    }

    if (metrics.averageSustainabilityScore < 70) {
      recommendations.push('Look for locally-owned businesses and eco-certified attractions');
    }

    if (metrics.totalVisits > 0 && metrics.localEconomicImpact / metrics.totalVisits < 100) {
      recommendations.push('Consider spending more at local businesses to increase community impact');
    }

    const avgTripScore = recentTrips.reduce((sum, trip) => sum + trip.sustainabilityScore, 0) / recentTrips.length;
    if (avgTripScore < 65) {
      recommendations.push('Explore different districts to distribute tourism benefits more evenly');
    }

    if (recommendations.length === 0) {
      recommendations.push('You\'re doing great! Keep exploring Hong Kong sustainably');
    }

    return recommendations;
  }

  private generateAchievements(
    metrics: SustainabilityMetrics,
    recentTrips: TripImpactSummary[]
  ): string[] {
    const achievements: string[] = [];

    if (metrics.ecoTransportUsage >= 80) {
      achievements.push('🚶‍♂️ Eco Transport Champion - 80%+ sustainable transportation');
    }

    if (metrics.localEconomicImpact >= 1000) {
      achievements.push('💰 Community Supporter - HK$1000+ local economic impact');
    }

    if (metrics.carbonSaved >= 10) {
      achievements.push('🌱 Carbon Saver - Saved 10kg+ CO2 compared to average tourist');
    }

    if (metrics.totalVisits >= 20) {
      achievements.push('🏪 Local Explorer - Visited 20+ local businesses');
    }

    if (recentTrips.some(trip => trip.sustainabilityScore >= 90)) {
      achievements.push('⭐ Sustainability Star - Achieved 90+ trip sustainability score');
    }

    return achievements;
  }

  private calculateOverallSustainabilityScore(
    metrics: SustainabilityMetrics,
    recentTrips: TripImpactSummary[]
  ): number {
    if (metrics.totalVisits === 0) return 0;

    let score = 0;

    // Business sustainability (30%)
    score += (metrics.averageSustainabilityScore / 100) * 30;

    // Transport sustainability (25%)
    score += (metrics.ecoTransportUsage / 100) * 25;

    // Economic impact (20%)
    const avgEconomicImpact = metrics.localEconomicImpact / metrics.totalVisits;
    score += Math.min(avgEconomicImpact / 200, 1) * 20;

    // Carbon efficiency (15%)
    const carbonEfficiency = Math.max(1 - (metrics.carbonSaved / 50), 0);
    score += carbonEfficiency * 15;

    // Recent trip performance (10%)
    if (recentTrips.length > 0) {
      const avgRecentScore = recentTrips.reduce((sum, trip) => sum + trip.sustainabilityScore, 0) / recentTrips.length;
      score += (avgRecentScore / 100) * 10;
    }

    return Math.round(score);
  }
}