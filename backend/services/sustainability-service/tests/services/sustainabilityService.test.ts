import { SustainabilityService } from '../../src/services/sustainabilityService';
import { VisitType, TransportationMode, BusinessType } from '../../src/types/sustainability';

describe('SustainabilityService', () => {
  let service: SustainabilityService;

  beforeEach(() => {
    service = new SustainabilityService();
  });

  describe('trackBusinessVisit', () => {
    it('should track a business visit successfully', async () => {
      const visitData = {
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      };

      const visit = await service.trackBusinessVisit(visitData);

      expect(visit).toBeDefined();
      expect(visit.userId).toBe(visitData.userId);
      expect(visit.businessId).toBe(visitData.businessId);
      expect(visit.carbonFootprint).toBe(0); // Walking has 0 emissions
    });
  });

  describe('getUserSustainabilityMetrics', () => {
    beforeEach(async () => {
      // Add some test visits
      await service.trackBusinessVisit({
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      });

      await service.trackBusinessVisit({
        userId: 'user-123',
        businessId: 'bus-002',
        duration: 90,
        estimatedSpending: 150,
        visitType: VisitType.SIGHTSEEING,
        transportationMode: TransportationMode.PUBLIC_TRANSPORT,
        distance: 5
      });
    });

    it('should return comprehensive sustainability metrics', async () => {
      const metrics = await service.getUserSustainabilityMetrics('user-123');

      expect(metrics.totalVisits).toBe(2);
      expect(metrics.ecoTransportUsage).toBe(100); // Both visits used eco-friendly transport
      expect(metrics.averageSustainabilityScore).toBeGreaterThan(0);
      expect(metrics.localEconomicImpact).toBeGreaterThan(0);
      expect(metrics.carbonSaved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addLocalBusiness', () => {
    it('should add a local business and calculate sustainability score', async () => {
      const businessData = {
        name: 'Test Local Restaurant',
        type: BusinessType.RESTAURANT,
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Yau Ma Tei',
          address: '123 Local Street'
        },
        localOwnership: true,
        employeesCount: 15,
        certifications: ['Local Heritage', 'Green Certified']
      };

      const business = await service.addLocalBusiness(businessData);

      expect(business).toBeDefined();
      expect(business.name).toBe(businessData.name);
      expect(business.sustainabilityScore).toBeGreaterThan(0);
      expect(business.id).toBeDefined();
    });
  });

  describe('getBusinessWithScore', () => {
    it('should return business with sustainability score', async () => {
      const businessData = {
        name: 'Test Business',
        type: BusinessType.RESTAURANT,
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Central',
          address: '123 Test Street'
        },
        localOwnership: true,
        employeesCount: 10,
        certifications: ['Local Heritage']
      };

      const addedBusiness = await service.addLocalBusiness(businessData);
      const businessWithScore = await service.getBusinessWithScore(addedBusiness.id);

      expect(businessWithScore).toBeDefined();
      expect(businessWithScore!.business).toBeDefined();
      expect(businessWithScore!.score).toBeDefined();
      expect(businessWithScore!.score.overallScore).toBeGreaterThan(0);
    });

    it('should return null for non-existent business', async () => {
      const result = await service.getBusinessWithScore('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getEcoTransportRecommendations', () => {
    it('should return eco-friendly transport recommendations', async () => {
      const recommendations = await service.getEcoTransportRecommendations('Central', 'Admiralty');

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('carbonFootprint');
      expect(recommendations[0]).toHaveProperty('sustainabilityBenefit');
    });

    it('should filter recommendations by preferences', async () => {
      const recommendations = await service.getEcoTransportRecommendations('Central', 'Admiralty', {
        maxCost: 10,
        prioritizeSustainability: true
      });

      expect(recommendations.every(rec => rec.cost <= 10)).toBe(true);
    });
  });

  describe('calculateTripCarbonFootprint', () => {
    it('should calculate carbon footprint for mixed transport modes', async () => {
      const transportModes = [
        { mode: TransportationMode.WALKING, distance: 2 },
        { mode: TransportationMode.PUBLIC_TRANSPORT, distance: 10 },
        { mode: TransportationMode.TAXI, distance: 5 }
      ];

      const footprint = await service.calculateTripCarbonFootprint(transportModes);

      // Expected: 0 + (10 * 0.05) + (5 * 0.2) = 1.5
      expect(footprint).toBe(1.5);
    });
  });

  describe('generateTripSummary', () => {
    beforeEach(async () => {
      // Add some visits for the trip
      await service.trackBusinessVisit({
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      });

      await service.trackBusinessVisit({
        userId: 'user-123',
        businessId: 'bus-002',
        duration: 90,
        estimatedSpending: 150,
        visitType: VisitType.SIGHTSEEING,
        transportationMode: TransportationMode.PUBLIC_TRANSPORT,
        distance: 5
      });
    });

    it('should generate comprehensive trip summary', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      const summary = await service.generateTripSummary('user-123', 'trip-456', startDate, endDate);

      expect(summary).toBeDefined();
      expect(summary.userId).toBe('user-123');
      expect(summary.tripId).toBe('trip-456');
      expect(summary.localBusinessesVisited).toBe(2);
      expect(summary.sustainabilityScore).toBeGreaterThan(0);
      expect(summary.ecoFriendlyTransportUsage).toBe(100);
      expect(summary.recommendations).toBeDefined();
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });
  });

  describe('generateDetailedImpactReport', () => {
    beforeEach(async () => {
      await service.trackBusinessVisit({
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      });

      await service.generateTripSummary('user-123', 'trip-456', new Date('2024-01-01'), new Date('2024-01-03'));
    });

    it('should generate detailed impact report', async () => {
      const report = await service.generateDetailedImpactReport('trip-456');

      expect(report).toBeDefined();
      expect(report!.summary).toBeDefined();
      expect(report!.breakdown).toBeDefined();
      expect(report!.breakdown.carbonFootprintByDay).toBeDefined();
      expect(report!.breakdown.economicImpactByDistrict).toBeDefined();
      expect(report!.breakdown.transportationBreakdown).toBeDefined();
      expect(report!.breakdown.sustainabilityHighlights).toBeDefined();
      expect(report!.breakdown.improvementSuggestions).toBeDefined();
    });
  });

  describe('getSustainabilityInsights', () => {
    beforeEach(async () => {
      // Create multiple visits and trips for comprehensive insights
      await service.trackBusinessVisit({
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      });

      await service.trackBusinessVisit({
        userId: 'user-123',
        businessId: 'bus-002',
        duration: 90,
        estimatedSpending: 150,
        visitType: VisitType.SIGHTSEEING,
        transportationMode: TransportationMode.PUBLIC_TRANSPORT,
        distance: 5
      });

      await service.generateTripSummary('user-123', 'trip-1', new Date('2024-01-01'), new Date('2024-01-03'));
    });

    it('should provide comprehensive sustainability insights', async () => {
      const insights = await service.getSustainabilityInsights('user-123');

      expect(insights).toBeDefined();
      expect(insights.overallScore).toBeGreaterThanOrEqual(0);
      expect(insights.overallScore).toBeLessThanOrEqual(100);
      expect(insights.metrics).toBeDefined();
      expect(insights.recentTrips).toBeDefined();
      expect(insights.recommendations).toBeDefined();
      expect(insights.achievements).toBeDefined();
      
      expect(Array.isArray(insights.recentTrips)).toBe(true);
      expect(Array.isArray(insights.recommendations)).toBe(true);
      expect(Array.isArray(insights.achievements)).toBe(true);
    });

    it('should generate personalized recommendations', async () => {
      const insights = await service.getSustainabilityInsights('user-123');

      expect(insights.recommendations.length).toBeGreaterThan(0);
      expect(typeof insights.recommendations[0]).toBe('string');
    });

    it('should generate achievements for good performance', async () => {
      // Add more visits to trigger achievements
      for (let i = 0; i < 10; i++) {
        await service.trackBusinessVisit({
          userId: 'user-123',
          businessId: i % 2 === 0 ? 'bus-001' : 'bus-002',
          duration: 60,
          estimatedSpending: 200,
          visitType: VisitType.DINING,
          transportationMode: TransportationMode.WALKING,
          distance: 1
        });
      }

      const insights = await service.getSustainabilityInsights('user-123');

      expect(insights.achievements.length).toBeGreaterThan(0);
      expect(insights.achievements.some(achievement => achievement.includes('🚶‍♂️'))).toBe(true); // Eco transport achievement
    });
  });

  describe('getTransportSustainabilityTips', () => {
    it('should return tips for each transport mode', async () => {
      const walkingTips = await service.getTransportSustainabilityTips(TransportationMode.WALKING);
      const cyclingTips = await service.getTransportSustainabilityTips(TransportationMode.CYCLING);
      const publicTransportTips = await service.getTransportSustainabilityTips(TransportationMode.PUBLIC_TRANSPORT);

      expect(walkingTips.length).toBeGreaterThan(0);
      expect(cyclingTips.length).toBeGreaterThan(0);
      expect(publicTransportTips.length).toBeGreaterThan(0);

      expect(typeof walkingTips[0]).toBe('string');
      expect(typeof cyclingTips[0]).toBe('string');
      expect(typeof publicTransportTips[0]).toBe('string');
    });
  });

  describe('getTransportModeImpact', () => {
    it('should return impact information for transport modes', async () => {
      const walkingImpact = await service.getTransportModeImpact(TransportationMode.WALKING);
      const taxiImpact = await service.getTransportModeImpact(TransportationMode.TAXI);

      expect(walkingImpact.carbonFootprint).toBe(0);
      expect(walkingImpact.sustainabilityRating).toBe('Excellent');
      expect(walkingImpact.description).toContain('Zero emissions');

      expect(taxiImpact.carbonFootprint).toBeGreaterThan(0);
      expect(taxiImpact.sustainabilityRating).toBe('Fair');
      expect(taxiImpact.description).toContain('Moderate emissions');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete user journey from visit tracking to insights', async () => {
      const userId = 'integration-user';

      // 1. Add a local business
      const business = await service.addLocalBusiness({
        name: 'Integration Test Restaurant',
        type: BusinessType.RESTAURANT,
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Central',
          address: '123 Integration Street'
        },
        localOwnership: true,
        employeesCount: 10,
        certifications: ['Local Heritage']
      });

      // 2. Track visits
      await service.trackBusinessVisit({
        userId,
        businessId: business.id,
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      });

      // 3. Generate trip summary
      const tripSummary = await service.generateTripSummary(
        userId,
        'integration-trip',
        new Date('2024-01-01'),
        new Date('2024-01-03')
      );

      // 4. Get detailed report
      const detailedReport = await service.generateDetailedImpactReport('integration-trip');

      // 5. Get comprehensive insights
      const insights = await service.getSustainabilityInsights(userId);

      // Verify all components work together
      expect(business.id).toBeDefined();
      expect(tripSummary.localBusinessesVisited).toBe(1);
      expect(detailedReport).toBeDefined();
      expect(insights.overallScore).toBeGreaterThan(0);
      expect(insights.metrics.totalVisits).toBe(1);
    });

    it('should maintain data consistency across services', async () => {
      const userId = 'consistency-user';

      // Track multiple visits
      await service.trackBusinessVisit({
        userId,
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      });

      await service.trackBusinessVisit({
        userId,
        businessId: 'bus-002',
        duration: 90,
        estimatedSpending: 150,
        visitType: VisitType.SIGHTSEEING,
        transportationMode: TransportationMode.PUBLIC_TRANSPORT,
        distance: 5
      });

      // Get metrics and visits
      const metrics = await service.getUserSustainabilityMetrics(userId);
      const visits = await service.getUserVisits(userId);

      // Generate trip summary
      const tripSummary = await service.generateTripSummary(
        userId,
        'consistency-trip',
        new Date('2024-01-01'),
        new Date('2024-01-03')
      );

      // Verify consistency
      expect(visits.length).toBe(2);
      expect(metrics.totalVisits).toBe(2);
      expect(tripSummary.localBusinessesVisited).toBe(2);
      
      const totalSpending = visits.reduce((sum, visit) => sum + visit.estimatedSpending, 0);
      const totalEconomicImpact = visits.reduce((sum, visit) => sum + visit.economicImpact, 0);
      
      expect(tripSummary.totalEconomicImpact).toBe(totalEconomicImpact);
    });
  });
});