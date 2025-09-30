import { TripImpactSummaryModel } from '../models/TripImpactSummary';
import { BusinessVisitTrackingService } from './businessVisitTrackingService';
import { TripImpactSummary, BusinessVisit, TransportationMode } from '../types/sustainability';
import { v4 as uuidv4 } from 'uuid';

export class TripImpactService {
  private tripSummaries: Map<string, TripImpactSummaryModel> = new Map();
  private businessVisitService: BusinessVisitTrackingService;

  constructor(businessVisitService: BusinessVisitTrackingService) {
    this.businessVisitService = businessVisitService;
  }

  async generateTripSummary(
    userId: string,
    tripId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TripImpactSummary> {
    // Get all visits during the trip period
    const visits = await this.businessVisitService.getUserVisits(userId, startDate, endDate);
    
    // Calculate metrics
    const totalCarbonFootprint = visits.reduce((sum, visit) => sum + visit.carbonFootprint, 0);
    const totalEconomicImpact = visits.reduce((sum, visit) => sum + visit.economicImpact, 0);
    const localBusinessesVisited = new Set(visits.map(visit => visit.businessId)).size;
    const ecoFriendlyTransportUsage = this.calculateEcoFriendlyTransportUsage(visits);

    const tripSummary = new TripImpactSummaryModel({
      id: uuidv4(),
      userId,
      tripId,
      startDate,
      endDate,
      totalCarbonFootprint,
      totalEconomicImpact,
      localBusinessesVisited,
      ecoFriendlyTransportUsage
    });

    tripSummary.updateMetrics();
    this.tripSummaries.set(tripSummary.id, tripSummary);

    return tripSummary.toJSON();
  }

  private calculateEcoFriendlyTransportUsage(visits: BusinessVisit[]): number {
    if (visits.length === 0) return 0;

    const ecoFriendlyModes = [
      TransportationMode.WALKING,
      TransportationMode.CYCLING,
      TransportationMode.PUBLIC_TRANSPORT,
      TransportationMode.FERRY
    ];

    const ecoFriendlyVisits = visits.filter(visit => 
      ecoFriendlyModes.includes(visit.transportationMode)
    );

    return Math.round((ecoFriendlyVisits.length / visits.length) * 100);
  }

  async getTripSummary(tripId: string): Promise<TripImpactSummary | null> {
    const summary = Array.from(this.tripSummaries.values())
      .find(summary => summary.tripId === tripId);
    
    return summary ? summary.toJSON() : null;
  }

  async getUserTripSummaries(userId: string): Promise<TripImpactSummary[]> {
    const userSummaries = Array.from(this.tripSummaries.values())
      .filter(summary => summary.userId === userId)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    return userSummaries.map(summary => summary.toJSON());
  }

  async generateDetailedImpactReport(tripId: string): Promise<{
    summary: TripImpactSummary;
    breakdown: {
      carbonFootprintByDay: { date: string; footprint: number }[];
      economicImpactByDistrict: { district: string; impact: number }[];
      transportationBreakdown: { mode: string; usage: number; emissions: number }[];
      sustainabilityHighlights: string[];
      improvementSuggestions: string[];
    };
  } | null> {
    const summary = await this.getTripSummary(tripId);
    if (!summary) return null;

    const visits = await this.businessVisitService.getUserVisits(
      summary.userId,
      summary.startDate,
      summary.endDate
    );

    // Carbon footprint by day
    const carbonByDay = this.groupVisitsByDay(visits).map(dayData => ({
      date: dayData.date,
      footprint: dayData.visits.reduce((sum, visit) => sum + visit.carbonFootprint, 0)
    }));

    // Economic impact by district
    const impactByDistrict = await this.calculateEconomicImpactByDistrict(visits);

    // Transportation breakdown
    const transportBreakdown = this.calculateTransportationBreakdown(visits);

    // Sustainability highlights
    const highlights = this.generateSustainabilityHighlights(summary, visits);

    // Improvement suggestions
    const suggestions = this.generateImprovementSuggestions(summary, visits);

    return {
      summary,
      breakdown: {
        carbonFootprintByDay: carbonByDay,
        economicImpactByDistrict: impactByDistrict,
        transportationBreakdown: transportBreakdown,
        sustainabilityHighlights: highlights,
        improvementSuggestions: suggestions
      }
    };
  }

  private groupVisitsByDay(visits: BusinessVisit[]): { date: string; visits: BusinessVisit[] }[] {
    const visitsByDay = new Map<string, BusinessVisit[]>();

    visits.forEach(visit => {
      const dateKey = visit.visitDate.toISOString().split('T')[0];
      if (!visitsByDay.has(dateKey)) {
        visitsByDay.set(dateKey, []);
      }
      visitsByDay.get(dateKey)!.push(visit);
    });

    return Array.from(visitsByDay.entries()).map(([date, visits]) => ({
      date,
      visits
    }));
  }

  private async calculateEconomicImpactByDistrict(visits: BusinessVisit[]): Promise<{ district: string; impact: number }[]> {
    const impactByDistrict = new Map<string, number>();

    for (const visit of visits) {
      const business = await this.businessVisitService.getLocalBusiness(visit.businessId);
      if (business) {
        const district = business.location.district;
        const currentImpact = impactByDistrict.get(district) || 0;
        impactByDistrict.set(district, currentImpact + visit.economicImpact);
      }
    }

    return Array.from(impactByDistrict.entries())
      .map(([district, impact]) => ({ district, impact }))
      .sort((a, b) => b.impact - a.impact);
  }

  private calculateTransportationBreakdown(visits: BusinessVisit[]): { mode: string; usage: number; emissions: number }[] {
    const transportData = new Map<string, { count: number; emissions: number }>();

    visits.forEach(visit => {
      const mode = visit.transportationMode;
      const current = transportData.get(mode) || { count: 0, emissions: 0 };
      transportData.set(mode, {
        count: current.count + 1,
        emissions: current.emissions + visit.carbonFootprint
      });
    });

    const totalVisits = visits.length;
    return Array.from(transportData.entries()).map(([mode, data]) => ({
      mode,
      usage: Math.round((data.count / totalVisits) * 100),
      emissions: Math.round(data.emissions * 100) / 100
    }));
  }

  private generateSustainabilityHighlights(summary: TripImpactSummary, visits: BusinessVisit[]): string[] {
    const highlights: string[] = [];

    if (summary.sustainabilityScore >= 80) {
      highlights.push('🌟 Excellent sustainability performance! You\'re a responsible tourism champion.');
    }

    if (summary.ecoFriendlyTransportUsage >= 70) {
      highlights.push('🚶‍♂️ Great job using eco-friendly transportation for most of your journey!');
    }

    if (summary.localBusinessesVisited >= 5) {
      highlights.push('🏪 You supported the local economy by visiting multiple local businesses.');
    }

    if (summary.totalCarbonFootprint < 10) {
      highlights.push('🌱 Low carbon footprint achieved - you traveled sustainably!');
    }

    const avgSpending = visits.reduce((sum, v) => sum + v.estimatedSpending, 0) / visits.length;
    if (avgSpending > 0 && summary.totalEconomicImpact / (avgSpending * visits.length) > 0.6) {
      highlights.push('💰 High local economic impact - your spending directly benefited local communities.');
    }

    return highlights.length > 0 ? highlights : ['🌍 Every sustainable choice makes a difference for Hong Kong\'s future!'];
  }

  private generateImprovementSuggestions(summary: TripImpactSummary, visits: BusinessVisit[]): string[] {
    const suggestions: string[] = [];

    if (summary.ecoFriendlyTransportUsage < 50) {
      suggestions.push('Try using more public transport, walking, or cycling for your next visit');
    }

    if (summary.localBusinessesVisited < 3) {
      suggestions.push('Explore more local businesses to increase your positive community impact');
    }

    if (summary.sustainabilityScore < 60) {
      suggestions.push('Look for eco-certified attractions and locally-owned restaurants');
    }

    const districts = new Set(visits.map(async visit => {
      const business = await this.businessVisitService.getLocalBusiness(visit.businessId);
      return business?.location.district;
    }));

    if (districts.size < 3) {
      suggestions.push('Visit different districts to distribute tourism benefits more widely');
    }

    const hasHighCarbonTransport = visits.some(visit => 
      [TransportationMode.TAXI, TransportationMode.PRIVATE_CAR].includes(visit.transportationMode)
    );

    if (hasHighCarbonTransport) {
      suggestions.push('Consider alternatives to taxis and private cars for shorter distances');
    }

    return suggestions.length > 0 ? suggestions : ['You\'re doing great! Keep up the sustainable travel practices.'];
  }

  async compareWithBenchmarks(tripId: string): Promise<{
    userScore: number;
    averageScore: number;
    percentile: number;
    comparison: 'Above Average' | 'Average' | 'Below Average';
  } | null> {
    const summary = await this.getTripSummary(tripId);
    if (!summary) return null;

    // Calculate benchmarks from all trip summaries
    const allSummaries = Array.from(this.tripSummaries.values());
    if (allSummaries.length === 0) {
      return {
        userScore: summary.sustainabilityScore,
        averageScore: summary.sustainabilityScore,
        percentile: 50,
        comparison: 'Average'
      };
    }

    const scores = allSummaries.map(s => s.sustainabilityScore).sort((a, b) => a - b);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const userRank = scores.filter(score => score < summary.sustainabilityScore).length;
    const percentile = Math.round((userRank / scores.length) * 100);

    let comparison: 'Above Average' | 'Average' | 'Below Average';
    if (summary.sustainabilityScore > averageScore + 10) {
      comparison = 'Above Average';
    } else if (summary.sustainabilityScore < averageScore - 10) {
      comparison = 'Below Average';
    } else {
      comparison = 'Average';
    }

    return {
      userScore: summary.sustainabilityScore,
      averageScore: Math.round(averageScore),
      percentile,
      comparison
    };
  }
}