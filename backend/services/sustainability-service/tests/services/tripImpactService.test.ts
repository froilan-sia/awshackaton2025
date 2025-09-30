import { TripImpactService } from '../../src/services/tripImpactService';
import { BusinessVisitTrackingService } from '../../src/services/businessVisitTrackingService';
import { VisitType, TransportationMode } from '../../src/types/sustainability';

describe('TripImpactService', () => {
  let tripImpactService: TripImpactService;
  let businessVisitService: BusinessVisitTrackingService;

  beforeEach(() => {
    businessVisitService = new BusinessVisitTrackingService();
    tripImpactService = new TripImpactService(businessVisitService);
  });

  const setupTestVisits = async (userId: string, tripStartDate: Date) => {
    const visits = [
      {
        userId,
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 0.5
      },
      {
        userId,
        businessId: 'bus-002',
        duration: 90,
        estimatedSpending: 150,
        visitType: VisitType.SIGHTSEEING,
        transportationMode: TransportationMode.PUBLIC_TRANSPORT,
        distance: 5
      },
      {
        userId,
        businessId: 'bus-001',
        duration: 45,
        estimatedSpending: 100,
        visitType: VisitType.SHOPPING,
        transportationMode: TransportationMode.TAXI,
        distance: 3
      }
    ];

    for (const visit of visits) {
      await businessVisitService.trackVisit(visit);
    }
  };

  describe('generateTripSummary', () => {
    it('should generate trip summary with correct metrics', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      await setupTestVisits(userId, startDate);

      const summary = await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      expect(summary).toBeDefined();
      expect(summary.userId).toBe(userId);
      expect(summary.tripId).toBe(tripId);
      expect(summary.startDate).toEqual(startDate);
      expect(summary.endDate).toEqual(endDate);
      expect(summary.localBusinessesVisited).toBe(2); // bus-001 and bus-002
      expect(summary.totalCarbonFootprint).toBeGreaterThan(0);
      expect(summary.totalEconomicImpact).toBeGreaterThan(0);
      expect(summary.sustainabilityScore).toBeGreaterThan(0);
      expect(summary.ecoFriendlyTransportUsage).toBeGreaterThan(0);
      expect(summary.recommendations).toBeDefined();
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });

    it('should calculate eco-friendly transport usage correctly', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      await setupTestVisits(userId, startDate);

      const summary = await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      // 2 out of 3 visits used eco-friendly transport (walking, public transport)
      expect(summary.ecoFriendlyTransportUsage).toBe(67); // Rounded to 67%
    });

    it('should handle empty trip period', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-03');

      const summary = await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      expect(summary.localBusinessesVisited).toBe(0);
      expect(summary.totalCarbonFootprint).toBe(0);
      expect(summary.totalEconomicImpact).toBe(0);
      expect(summary.ecoFriendlyTransportUsage).toBe(0);
    });
  });

  describe('getTripSummary', () => {
    it('should retrieve existing trip summary', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      await setupTestVisits(userId, startDate);
      const originalSummary = await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      const retrievedSummary = await tripImpactService.getTripSummary(tripId);

      expect(retrievedSummary).toEqual(originalSummary);
    });

    it('should return null for non-existent trip', async () => {
      const summary = await tripImpactService.getTripSummary('non-existent-trip');
      expect(summary).toBeNull();
    });
  });

  describe('getUserTripSummaries', () => {
    it('should return all trip summaries for a user', async () => {
      const userId = 'user-123';
      
      await setupTestVisits(userId, new Date('2024-01-01'));
      await tripImpactService.generateTripSummary(userId, 'trip-1', new Date('2024-01-01'), new Date('2024-01-03'));
      await tripImpactService.generateTripSummary(userId, 'trip-2', new Date('2024-02-01'), new Date('2024-02-03'));

      const summaries = await tripImpactService.getUserTripSummaries(userId);

      expect(summaries).toHaveLength(2);
      expect(summaries[0].userId).toBe(userId);
      expect(summaries[1].userId).toBe(userId);
      
      // Should be sorted by start date (most recent first)
      expect(summaries[0].startDate.getTime()).toBeGreaterThan(summaries[1].startDate.getTime());
    });

    it('should return empty array for user with no trips', async () => {
      const summaries = await tripImpactService.getUserTripSummaries('user-456');
      expect(summaries).toHaveLength(0);
    });
  });

  describe('generateDetailedImpactReport', () => {
    it('should generate detailed impact report', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      await setupTestVisits(userId, startDate);
      await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      const report = await tripImpactService.generateDetailedImpactReport(tripId);

      expect(report).toBeDefined();
      expect(report!.summary).toBeDefined();
      expect(report!.breakdown).toBeDefined();
      expect(report!.breakdown.carbonFootprintByDay).toBeDefined();
      expect(report!.breakdown.economicImpactByDistrict).toBeDefined();
      expect(report!.breakdown.transportationBreakdown).toBeDefined();
      expect(report!.breakdown.sustainabilityHighlights).toBeDefined();
      expect(report!.breakdown.improvementSuggestions).toBeDefined();
      
      expect(Array.isArray(report!.breakdown.carbonFootprintByDay)).toBe(true);
      expect(Array.isArray(report!.breakdown.economicImpactByDistrict)).toBe(true);
      expect(Array.isArray(report!.breakdown.transportationBreakdown)).toBe(true);
      expect(Array.isArray(report!.breakdown.sustainabilityHighlights)).toBe(true);
      expect(Array.isArray(report!.breakdown.improvementSuggestions)).toBe(true);
    });

    it('should return null for non-existent trip', async () => {
      const report = await tripImpactService.generateDetailedImpactReport('non-existent-trip');
      expect(report).toBeNull();
    });

    it('should include transportation breakdown with correct percentages', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      await setupTestVisits(userId, startDate);
      await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      const report = await tripImpactService.generateDetailedImpactReport(tripId);

      const transportBreakdown = report!.breakdown.transportationBreakdown;
      const totalUsage = transportBreakdown.reduce((sum, item) => sum + item.usage, 0);
      
      expect(totalUsage).toBe(100); // Should sum to 100%
      
      // Check that each mode has correct usage percentage
      const walkingUsage = transportBreakdown.find(item => item.mode === 'walking')?.usage || 0;
      const publicTransportUsage = transportBreakdown.find(item => item.mode === 'public_transport')?.usage || 0;
      const taxiUsage = transportBreakdown.find(item => item.mode === 'taxi')?.usage || 0;
      
      expect(walkingUsage + publicTransportUsage + taxiUsage).toBe(100);
    });
  });

  describe('compareWithBenchmarks', () => {
    it('should compare trip with benchmarks', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      await setupTestVisits(userId, startDate);
      await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      const comparison = await tripImpactService.compareWithBenchmarks(tripId);

      expect(comparison).toBeDefined();
      expect(comparison!.userScore).toBeGreaterThanOrEqual(0);
      expect(comparison!.averageScore).toBeGreaterThanOrEqual(0);
      expect(comparison!.percentile).toBeGreaterThanOrEqual(0);
      expect(comparison!.percentile).toBeLessThanOrEqual(100);
      expect(['Above Average', 'Average', 'Below Average']).toContain(comparison!.comparison);
    });

    it('should return null for non-existent trip', async () => {
      const comparison = await tripImpactService.compareWithBenchmarks('non-existent-trip');
      expect(comparison).toBeNull();
    });

    it('should handle single trip scenario', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      await setupTestVisits(userId, startDate);
      await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      const comparison = await tripImpactService.compareWithBenchmarks(tripId);

      expect(comparison!.percentile).toBe(50); // Should be 50th percentile when only one trip
      expect(comparison!.comparison).toBe('Average');
    });
  });

  describe('sustainability scoring accuracy', () => {
    it('should give higher scores to more sustainable trips', async () => {
      const userId1 = 'user-sustainable';
      const userId2 = 'user-unsustainable';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      // Sustainable trip - walking and public transport only
      await businessVisitService.trackVisit({
        userId: userId1,
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      });

      await businessVisitService.trackVisit({
        userId: userId1,
        businessId: 'bus-002',
        duration: 90,
        estimatedSpending: 150,
        visitType: VisitType.SIGHTSEEING,
        transportationMode: TransportationMode.PUBLIC_TRANSPORT,
        distance: 5
      });

      // Unsustainable trip - private car and taxi
      await businessVisitService.trackVisit({
        userId: userId2,
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.PRIVATE_CAR,
        distance: 10
      });

      await businessVisitService.trackVisit({
        userId: userId2,
        businessId: 'bus-002',
        duration: 90,
        estimatedSpending: 150,
        visitType: VisitType.SIGHTSEEING,
        transportationMode: TransportationMode.TAXI,
        distance: 8
      });

      const sustainableTrip = await tripImpactService.generateTripSummary(userId1, 'trip-sustainable', startDate, endDate);
      const unsustainableTrip = await tripImpactService.generateTripSummary(userId2, 'trip-unsustainable', startDate, endDate);

      expect(sustainableTrip.sustainabilityScore).toBeGreaterThan(unsustainableTrip.sustainabilityScore);
      expect(sustainableTrip.ecoFriendlyTransportUsage).toBeGreaterThan(unsustainableTrip.ecoFriendlyTransportUsage);
      expect(sustainableTrip.totalCarbonFootprint).toBeLessThan(unsustainableTrip.totalCarbonFootprint);
    });
  });

  describe('recommendation generation', () => {
    it('should generate appropriate recommendations based on trip performance', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      // Create a trip with room for improvement
      await businessVisitService.trackVisit({
        userId,
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 50, // Low spending
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.TAXI, // High carbon transport
        distance: 10
      });

      const summary = await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      expect(summary.recommendations.length).toBeGreaterThan(0);
      
      // Should include recommendations for improvement
      const recommendationText = summary.recommendations.join(' ').toLowerCase();
      expect(
        recommendationText.includes('transport') || 
        recommendationText.includes('business') || 
        recommendationText.includes('sustainable')
      ).toBe(true);
    });

    it('should generate positive feedback for excellent trips', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      // Create multiple visits with sustainable transport and good spending
      for (let i = 0; i < 6; i++) {
        await businessVisitService.trackVisit({
          userId,
          businessId: i < 3 ? 'bus-001' : 'bus-002',
          duration: 60,
          estimatedSpending: 300,
          visitType: VisitType.DINING,
          transportationMode: TransportationMode.WALKING,
          distance: 1
        });
      }

      const summary = await tripImpactService.generateTripSummary(userId, tripId, startDate, endDate);

      expect(summary.sustainabilityScore).toBeGreaterThan(70);
      expect(summary.recommendations.length).toBeGreaterThan(0);
      
      // Should include positive feedback
      const recommendationText = summary.recommendations.join(' ').toLowerCase();
      expect(recommendationText.includes('great') || recommendationText.includes('good')).toBe(true);
    });
  });
});