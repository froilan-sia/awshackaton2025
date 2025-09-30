import { BusinessVisitModel } from '../models/BusinessVisit';
import { LocalBusinessModel } from '../models/LocalBusiness';
import { BusinessVisit, VisitType, TransportationMode, SustainabilityMetrics } from '../types/sustainability';
import { v4 as uuidv4 } from 'uuid';

export class BusinessVisitTrackingService {
  private visits: Map<string, BusinessVisitModel> = new Map();
  private businesses: Map<string, LocalBusinessModel> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample local businesses
    const sampleBusinesses = [
      {
        id: 'bus-001',
        name: 'Tai Cheong Bakery',
        type: 'restaurant' as any,
        location: { latitude: 22.2783, longitude: 114.1747, district: 'Central', address: '35 Lyndhurst Terrace' },
        localOwnership: true,
        employeesCount: 8,
        certifications: ['Local Heritage', 'Traditional Craft']
      },
      {
        id: 'bus-002',
        name: 'Yau Ma Tei Theatre',
        type: 'cultural_site' as any,
        location: { latitude: 22.3080, longitude: 114.1696, district: 'Yau Ma Tei', address: '6 Waterloo Road' },
        localOwnership: true,
        employeesCount: 15,
        certifications: ['Cultural Heritage', 'Community Arts']
      }
    ];

    sampleBusinesses.forEach(business => {
      const businessModel = new LocalBusinessModel(business);
      businessModel.updateSustainabilityScore();
      this.businesses.set(business.id, businessModel);
    });
  }

  async trackVisit(visitData: {
    userId: string;
    businessId: string;
    duration: number;
    estimatedSpending: number;
    visitType: VisitType;
    transportationMode: TransportationMode;
    distance?: number;
  }): Promise<BusinessVisit> {
    const business = this.businesses.get(visitData.businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const visit = new BusinessVisitModel({
      id: uuidv4(),
      userId: visitData.userId,
      businessId: visitData.businessId,
      visitDate: new Date(),
      duration: visitData.duration,
      estimatedSpending: visitData.estimatedSpending,
      visitType: visitData.visitType,
      transportationMode: visitData.transportationMode
    });

    // Calculate metrics
    const distance = visitData.distance || 1; // Default 1km if not provided
    visit.updateMetrics(distance, business.localOwnership);

    this.visits.set(visit.id, visit);
    return visit.toJSON();
  }

  async getUserVisits(userId: string, startDate?: Date, endDate?: Date): Promise<BusinessVisit[]> {
    const userVisits = Array.from(this.visits.values())
      .filter(visit => visit.userId === userId)
      .filter(visit => {
        if (startDate && visit.visitDate < startDate) return false;
        if (endDate && visit.visitDate > endDate) return false;
        return true;
      });

    return userVisits.map(visit => visit.toJSON());
  }

  async getBusinessVisits(businessId: string, startDate?: Date, endDate?: Date): Promise<BusinessVisit[]> {
    const businessVisits = Array.from(this.visits.values())
      .filter(visit => visit.businessId === businessId)
      .filter(visit => {
        if (startDate && visit.visitDate < startDate) return false;
        if (endDate && visit.visitDate > endDate) return false;
        return true;
      });

    return businessVisits.map(visit => visit.toJSON());
  }

  async getUserSustainabilityMetrics(userId: string, startDate?: Date, endDate?: Date): Promise<SustainabilityMetrics> {
    const userVisits = await this.getUserVisits(userId, startDate, endDate);
    
    if (userVisits.length === 0) {
      return {
        totalVisits: 0,
        averageSustainabilityScore: 0,
        carbonSaved: 0,
        localEconomicImpact: 0,
        ecoTransportUsage: 0
      };
    }

    const totalCarbonFootprint = userVisits.reduce((sum, visit) => sum + visit.carbonFootprint, 0);
    const totalEconomicImpact = userVisits.reduce((sum, visit) => sum + visit.economicImpact, 0);
    
    // Calculate average sustainability score of visited businesses
    const businessScores = userVisits.map(visit => {
      const business = this.businesses.get(visit.businessId);
      return business ? business.sustainabilityScore : 0;
    });
    const averageSustainabilityScore = businessScores.reduce((sum, score) => sum + score, 0) / businessScores.length;

    // Calculate eco-friendly transport usage
    const ecoFriendlyModes = ['walking', 'cycling', 'public_transport', 'ferry'];
    const ecoFriendlyVisits = userVisits.filter(visit => ecoFriendlyModes.includes(visit.transportationMode));
    const ecoTransportUsage = (ecoFriendlyVisits.length / userVisits.length) * 100;

    // Calculate carbon saved compared to average tourist (assuming 5kg CO2 per day)
    const tripDays = this.calculateTripDays(userVisits);
    const averageTouristCarbon = tripDays * 5;
    const carbonSaved = Math.max(averageTouristCarbon - totalCarbonFootprint, 0);

    return {
      totalVisits: userVisits.length,
      averageSustainabilityScore: Math.round(averageSustainabilityScore),
      carbonSaved: Math.round(carbonSaved * 100) / 100,
      localEconomicImpact: Math.round(totalEconomicImpact * 100) / 100,
      ecoTransportUsage: Math.round(ecoTransportUsage)
    };
  }

  private calculateTripDays(visits: BusinessVisit[]): number {
    if (visits.length === 0) return 0;
    
    const dates = visits.map(visit => visit.visitDate.toDateString());
    const uniqueDates = new Set(dates);
    return uniqueDates.size;
  }

  async getLocalBusiness(businessId: string): Promise<LocalBusinessModel | null> {
    return this.businesses.get(businessId) || null;
  }

  async addLocalBusiness(businessData: Partial<LocalBusinessModel>): Promise<LocalBusinessModel> {
    const business = new LocalBusinessModel({
      ...businessData,
      id: businessData.id || uuidv4()
    });
    
    business.updateSustainabilityScore();
    this.businesses.set(business.id, business);
    return business;
  }

  async getLocalBusinesses(district?: string): Promise<LocalBusinessModel[]> {
    const businesses = Array.from(this.businesses.values());
    
    if (district) {
      return businesses.filter(business => business.location.district === district);
    }
    
    return businesses;
  }
}