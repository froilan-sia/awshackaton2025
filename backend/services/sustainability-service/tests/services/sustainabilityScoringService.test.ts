import { SustainabilityScoringService } from '../../src/services/sustainabilityScoringService';
import { LocalBusiness, BusinessType } from '../../src/types/sustainability';

describe('SustainabilityScoringService', () => {
  let service: SustainabilityScoringService;

  beforeEach(() => {
    service = new SustainabilityScoringService();
  });

  const createTestBusiness = (overrides: Partial<LocalBusiness> = {}): LocalBusiness => ({
    id: 'test-business',
    name: 'Test Business',
    type: BusinessType.RESTAURANT,
    location: {
      latitude: 22.2783,
      longitude: 114.1747,
      district: 'Central',
      address: '123 Test Street'
    },
    sustainabilityScore: 0,
    localOwnership: true,
    employeesCount: 10,
    certifications: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  describe('calculateBusinessScore', () => {
    it('should calculate score for locally-owned business', async () => {
      const business = createTestBusiness({
        localOwnership: true,
        employeesCount: 15,
        certifications: ['Green Certified', 'Local Heritage']
      });

      const score = await service.calculateBusinessScore(business);

      expect(score.overallScore).toBeGreaterThan(0);
      expect(score.localOwnershipScore).toBeGreaterThan(70);
      expect(score.businessId).toBe(business.id);
      expect(score.lastUpdated).toBeInstanceOf(Date);
    });

    it('should give higher scores to businesses in sustainable districts', async () => {
      const sustainableDistrictBusiness = createTestBusiness({
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Yau Ma Tei', // Sustainable district
          address: '123 Test Street'
        },
        localOwnership: true,
        employeesCount: 10
      });

      const touristyDistrictBusiness = createTestBusiness({
        location: {
          latitude: 22.2783,
          longitude: 114.1747,
          district: 'Tsim Sha Tsui', // More touristy
          address: '456 Test Street'
        },
        localOwnership: true,
        employeesCount: 10
      });

      const sustainableScore = await service.calculateBusinessScore(sustainableDistrictBusiness);
      const touristyScore = await service.calculateBusinessScore(touristyDistrictBusiness);

      expect(sustainableScore.environmentalScore).toBeGreaterThan(touristyScore.environmentalScore);
    });

    it('should reward environmental certifications', async () => {
      const certifiedBusiness = createTestBusiness({
        certifications: ['Green Certified', 'Eco-friendly', 'Sustainable Operations']
      });

      const uncertifiedBusiness = createTestBusiness({
        certifications: []
      });

      const certifiedScore = await service.calculateBusinessScore(certifiedBusiness);
      const uncertifiedScore = await service.calculateBusinessScore(uncertifiedBusiness);

      expect(certifiedScore.environmentalScore).toBeGreaterThan(uncertifiedScore.environmentalScore);
    });

    it('should reward cultural preservation certifications', async () => {
      const culturalBusiness = createTestBusiness({
        certifications: ['Heritage Site', 'Traditional Craft', 'Cultural Preservation']
      });

      const regularBusiness = createTestBusiness({
        certifications: []
      });

      const culturalScore = await service.calculateBusinessScore(culturalBusiness);
      const regularScore = await service.calculateBusinessScore(regularBusiness);

      expect(culturalScore.culturalPreservationScore).toBeGreaterThan(regularScore.culturalPreservationScore);
    });

    it('should consider business type in scoring', async () => {
      const culturalSite = createTestBusiness({
        type: BusinessType.CULTURAL_SITE,
        localOwnership: true
      });

      const accommodation = createTestBusiness({
        type: BusinessType.ACCOMMODATION,
        localOwnership: true
      });

      const culturalScore = await service.calculateBusinessScore(culturalSite);
      const accommodationScore = await service.calculateBusinessScore(accommodation);

      expect(culturalScore.culturalPreservationScore).toBeGreaterThan(accommodationScore.culturalPreservationScore);
    });

    it('should reward local employment', async () => {
      const highEmploymentBusiness = createTestBusiness({
        employeesCount: 50,
        localOwnership: true
      });

      const lowEmploymentBusiness = createTestBusiness({
        employeesCount: 2,
        localOwnership: true
      });

      const highEmploymentScore = await service.calculateBusinessScore(highEmploymentBusiness);
      const lowEmploymentScore = await service.calculateBusinessScore(lowEmploymentBusiness);

      expect(highEmploymentScore.communityImpactScore).toBeGreaterThan(lowEmploymentScore.communityImpactScore);
    });
  });

  describe('getBusinessScore', () => {
    it('should return null for non-existent business', async () => {
      const score = await service.getBusinessScore('non-existent');
      expect(score).toBeNull();
    });

    it('should return cached score for existing business', async () => {
      const business = createTestBusiness();
      const originalScore = await service.calculateBusinessScore(business);
      
      const cachedScore = await service.getBusinessScore(business.id);
      expect(cachedScore).toEqual(originalScore);
    });
  });

  describe('updateBusinessScore', () => {
    it('should recalculate and update business score', async () => {
      const business = createTestBusiness({
        certifications: []
      });

      const originalScore = await service.calculateBusinessScore(business);
      
      // Update business with more certifications
      const updatedBusiness = {
        ...business,
        certifications: ['Green Certified', 'Local Heritage']
      };

      const updatedScore = await service.updateBusinessScore(updatedBusiness);

      expect(updatedScore.overallScore).toBeGreaterThan(originalScore.overallScore);
      expect(updatedScore.lastUpdated.getTime()).toBeGreaterThan(originalScore.lastUpdated.getTime());
    });
  });

  describe('getTopSustainableBusinesses', () => {
    beforeEach(async () => {
      // Add multiple businesses with different scores
      const businesses = [
        createTestBusiness({
          id: 'high-score',
          localOwnership: true,
          employeesCount: 20,
          certifications: ['Green Certified', 'Local Heritage']
        }),
        createTestBusiness({
          id: 'medium-score',
          localOwnership: true,
          employeesCount: 10,
          certifications: ['Local Heritage']
        }),
        createTestBusiness({
          id: 'low-score',
          localOwnership: false,
          employeesCount: 5,
          certifications: []
        })
      ];

      for (const business of businesses) {
        await service.calculateBusinessScore(business);
      }
    });

    it('should return businesses sorted by sustainability score', async () => {
      const topBusinesses = await service.getTopSustainableBusinesses(3);

      expect(topBusinesses).toHaveLength(3);
      expect(topBusinesses[0].overallScore).toBeGreaterThanOrEqual(topBusinesses[1].overallScore);
      expect(topBusinesses[1].overallScore).toBeGreaterThanOrEqual(topBusinesses[2].overallScore);
    });

    it('should limit results to specified number', async () => {
      const topBusinesses = await service.getTopSustainableBusinesses(2);
      expect(topBusinesses).toHaveLength(2);
    });
  });

  describe('getBenchmarkScores', () => {
    beforeEach(async () => {
      const businesses = [
        createTestBusiness({
          id: 'business-1',
          localOwnership: true,
          employeesCount: 15,
          certifications: ['Green Certified']
        }),
        createTestBusiness({
          id: 'business-2',
          localOwnership: false,
          employeesCount: 8,
          certifications: []
        })
      ];

      for (const business of businesses) {
        await service.calculateBusinessScore(business);
      }
    });

    it('should calculate average benchmark scores', async () => {
      const benchmarks = await service.getBenchmarkScores();

      expect(benchmarks.averageOverallScore).toBeGreaterThan(0);
      expect(benchmarks.averageLocalOwnershipScore).toBeGreaterThan(0);
      expect(benchmarks.averageEnvironmentalScore).toBeGreaterThan(0);
      expect(benchmarks.averageCommunityImpactScore).toBeGreaterThan(0);
      expect(benchmarks.averageCulturalPreservationScore).toBeGreaterThan(0);
    });

    it('should return zero benchmarks when no businesses scored', async () => {
      const emptyService = new SustainabilityScoringService();
      const benchmarks = await emptyService.getBenchmarkScores();

      expect(benchmarks.averageOverallScore).toBe(0);
      expect(benchmarks.averageLocalOwnershipScore).toBe(0);
      expect(benchmarks.averageEnvironmentalScore).toBe(0);
      expect(benchmarks.averageCommunityImpactScore).toBe(0);
      expect(benchmarks.averageCulturalPreservationScore).toBe(0);
    });
  });

  describe('score calculation accuracy', () => {
    it('should ensure all scores are within valid range (0-100)', async () => {
      const extremeBusiness = createTestBusiness({
        localOwnership: true,
        employeesCount: 1000, // Very high
        certifications: Array(50).fill('Test Certification') // Many certifications
      });

      const score = await service.calculateBusinessScore(extremeBusiness);

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(score.localOwnershipScore).toBeLessThanOrEqual(100);
      expect(score.environmentalScore).toBeLessThanOrEqual(100);
      expect(score.communityImpactScore).toBeLessThanOrEqual(100);
      expect(score.culturalPreservationScore).toBeLessThanOrEqual(100);
    });

    it('should handle businesses with minimal attributes', async () => {
      const minimalBusiness = createTestBusiness({
        localOwnership: false,
        employeesCount: 0,
        certifications: []
      });

      const score = await service.calculateBusinessScore(minimalBusiness);

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.localOwnershipScore).toBeGreaterThanOrEqual(0);
      expect(score.environmentalScore).toBeGreaterThanOrEqual(0);
      expect(score.communityImpactScore).toBeGreaterThanOrEqual(0);
      expect(score.culturalPreservationScore).toBeGreaterThanOrEqual(0);
    });
  });
});