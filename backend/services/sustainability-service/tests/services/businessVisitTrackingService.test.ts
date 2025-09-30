import { BusinessVisitTrackingService } from '../../src/services/businessVisitTrackingService';
import { VisitType, TransportationMode, BusinessType } from '../../src/types/sustainability';

describe('BusinessVisitTrackingService', () => {
  let service: BusinessVisitTrackingService;

  beforeEach(() => {
    service = new BusinessVisitTrackingService();
  });

  describe('trackVisit', () => {
    it('should track a business visit successfully', async () => {
      const visitData = {
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 0.5
      };

      const visit = await service.trackVisit(visitData);

      expect(visit).toBeDefined();
      expect(visit.userId).toBe(visitData.userId);
      expect(visit.businessId).toBe(visitData.businessId);
      expect(visit.duration).toBe(visitData.duration);
      expect(visit.estimatedSpending).toBe(visitData.estimatedSpending);
      expect(visit.carbonFootprint).toBe(0); // Walking has 0 carbon footprint
      expect(visit.economicImpact).toBeGreaterThan(0);
    });

    it('should calculate carbon footprint correctly for different transport modes', async () => {
      const visitDataTaxi = {
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 30,
        estimatedSpending: 100,
        visitType: VisitType.SHOPPING,
        transportationMode: TransportationMode.TAXI,
        distance: 5
      };

      const visitTaxi = await service.trackVisit(visitDataTaxi);
      expect(visitTaxi.carbonFootprint).toBe(1.0); // 5km * 0.2 kg CO2/km

      const visitDataPublic = {
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 30,
        estimatedSpending: 100,
        visitType: VisitType.SHOPPING,
        transportationMode: TransportationMode.PUBLIC_TRANSPORT,
        distance: 5
      };

      const visitPublic = await service.trackVisit(visitDataPublic);
      expect(visitPublic.carbonFootprint).toBe(0.25); // 5km * 0.05 kg CO2/km
    });

    it('should throw error for non-existent business', async () => {
      const visitData = {
        userId: 'user-123',
        businessId: 'non-existent',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING
      };

      await expect(service.trackVisit(visitData)).rejects.toThrow('Business not found');
    });
  });

  describe('getUserVisits', () => {
    beforeEach(async () => {
      // Add some test visits
      await service.trackVisit({
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING
      });

      await service.trackVisit({
        userId: 'user-123',
        businessId: 'bus-002',
        duration: 90,
        estimatedSpending: 150,
        visitType: VisitType.SIGHTSEEING,
        transportationMode: TransportationMode.PUBLIC_TRANSPORT
      });
    });

    it('should return all visits for a user', async () => {
      const visits = await service.getUserVisits('user-123');
      expect(visits).toHaveLength(2);
      expect(visits[0].userId).toBe('user-123');
      expect(visits[1].userId).toBe('user-123');
    });

    it('should return empty array for user with no visits', async () => {
      const visits = await service.getUserVisits('user-456');
      expect(visits).toHaveLength(0);
    });

    it('should filter visits by date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const visits = await service.getUserVisits('user-123', tomorrow);
      expect(visits).toHaveLength(0);
    });
  });

  describe('getUserSustainabilityMetrics', () => {
    beforeEach(async () => {
      // Add test visits with different transport modes
      await service.trackVisit({
        userId: 'user-123',
        businessId: 'bus-001',
        duration: 60,
        estimatedSpending: 200,
        visitType: VisitType.DINING,
        transportationMode: TransportationMode.WALKING,
        distance: 1
      });

      await service.trackVisit({
        userId: 'user-123',
        businessId: 'bus-002',
        duration: 90,
        estimatedSpending: 150,
        visitType: VisitType.SIGHTSEEING,
        transportationMode: TransportationMode.TAXI,
        distance: 10
      });
    });

    it('should calculate sustainability metrics correctly', async () => {
      const metrics = await service.getUserSustainabilityMetrics('user-123');

      expect(metrics.totalVisits).toBe(2);
      expect(metrics.ecoTransportUsage).toBe(50); // 1 out of 2 visits used eco-friendly transport
      expect(metrics.carbonSaved).toBeGreaterThan(0);
      expect(metrics.localEconomicImpact).toBeGreaterThan(0);
      expect(metrics.averageSustainabilityScore).toBeGreaterThan(0);
    });

    it('should return zero metrics for user with no visits', async () => {
      const metrics = await service.getUserSustainabilityMetrics('user-456');

      expect(metrics.totalVisits).toBe(0);
      expect(metrics.ecoTransportUsage).toBe(0);
      expect(metrics.carbonSaved).toBe(0);
      expect(metrics.localEconomicImpact).toBe(0);
      expect(metrics.averageSustainabilityScore).toBe(0);
    });
  });

  describe('addLocalBusiness', () => {
    it('should add a local business successfully', async () => {
      const businessData = {
        name: 'Test Restaurant',
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

      const business = await service.addLocalBusiness(businessData);

      expect(business).toBeDefined();
      expect(business.name).toBe(businessData.name);
      expect(business.sustainabilityScore).toBeGreaterThan(0);
      expect(business.id).toBeDefined();
    });

    it('should calculate sustainability score based on business attributes', async () => {
      const localBusiness = await service.addLocalBusiness({
        name: 'Local Cafe',
        type: BusinessType.RESTAURANT,
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Yau Ma Tei', // Less touristy district
          address: '123 Local Street'
        },
        localOwnership: true,
        employeesCount: 15,
        certifications: ['Local Heritage', 'Traditional Craft']
      });

      const chainBusiness = await service.addLocalBusiness({
        name: 'Chain Restaurant',
        type: BusinessType.RESTAURANT,
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Central',
          address: '456 Chain Street'
        },
        localOwnership: false,
        employeesCount: 5,
        certifications: []
      });

      expect(localBusiness.sustainabilityScore).toBeGreaterThan(chainBusiness.sustainabilityScore);
    });
  });

  describe('getLocalBusinesses', () => {
    beforeEach(async () => {
      await service.addLocalBusiness({
        name: 'Central Restaurant',
        type: BusinessType.RESTAURANT,
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Central',
          address: '123 Central Street'
        },
        localOwnership: true,
        employeesCount: 10,
        certifications: []
      });

      await service.addLocalBusiness({
        name: 'Wan Chai Shop',
        type: BusinessType.SHOP,
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Wan Chai',
          address: '456 Wan Chai Street'
        },
        localOwnership: true,
        employeesCount: 5,
        certifications: []
      });
    });

    it('should return all businesses when no district filter', async () => {
      const businesses = await service.getLocalBusinesses();
      expect(businesses.length).toBeGreaterThanOrEqual(4); // Including sample data
    });

    it('should filter businesses by district', async () => {
      const centralBusinesses = await service.getLocalBusinesses('Central');
      expect(centralBusinesses.length).toBeGreaterThanOrEqual(1);
      expect(centralBusinesses.every(b => b.location.district === 'Central')).toBe(true);
    });
  });
});