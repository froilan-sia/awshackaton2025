import { ReviewComparisonService } from '../../src/services/reviewComparisonService';
import { LocalInsightsService } from '../../src/services/localInsightsService';
import { LocalResidentService } from '../../src/services/localResidentService';
import { TouristReviewModel } from '../../src/models/TouristReview';

describe('ReviewComparisonService', () => {
  let comparisonService: ReviewComparisonService;
  let insightsService: LocalInsightsService;
  let residentService: LocalResidentService;
  let reviewModel: TouristReviewModel;
  let verifiedUserId: string;

  beforeEach(async () => {
    comparisonService = new ReviewComparisonService();
    insightsService = new LocalInsightsService();
    residentService = new LocalResidentService();
    reviewModel = new TouristReviewModel();

    // Create and verify a resident for testing
    const resident = await residentService.registerResident({
      userId: 'verified_user',
      verificationProof: ['proof.jpg'],
      yearsInHongKong: 5,
      districts: ['Central'],
      languages: ['English', 'Cantonese'],
      specialties: ['food', 'culture']
    });

    verifiedUserId = resident.userId;
    await residentService.verifyResident(resident.id, 'verified');
  });

  afterEach(async () => {
    await comparisonService.clearAllData();
    await residentService.clearAllResidents();
  });

  describe('getLocationComparison', () => {
    beforeEach(async () => {
      // Create local insights
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Local Favorite',
        content: 'This place is loved by locals. Great authentic food at reasonable prices.',
        category: 'local_favorite',
        tags: ['authentic', 'affordable'],
        localRating: 4.5,
        localTips: ['Order the special', 'Come early'],
        language: 'en'
      });

      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Tourist Trap Warning',
        content: 'This place has become too touristy and overpriced. Locals avoid it now.',
        category: 'tourist_trap_warning',
        tags: ['overpriced', 'touristy'],
        localRating: 2,
        touristTrapWarning: true,
        localTips: ['Avoid during peak hours'],
        language: 'en'
      });

      // Create tourist reviews
      await reviewModel.create({
        authorId: 'tourist1',
        locationId: 'location123',
        rating: 4,
        content: 'Nice place, a bit expensive but good food',
        visitDate: new Date('2023-10-01'),
        groupType: 'couple',
        nationality: 'US',
        language: 'en',
        helpfulVotes: 5
      });

      await reviewModel.create({
        authorId: 'tourist2',
        locationId: 'location123',
        rating: 5,
        content: 'Amazing experience! Worth the price',
        visitDate: new Date('2023-10-02'),
        groupType: 'family',
        nationality: 'UK',
        language: 'en',
        helpfulVotes: 3
      });
    });

    it('should return comprehensive location comparison', async () => {
      const comparison = await comparisonService.getLocationComparison('location123');

      expect(comparison.locationId).toBe('location123');
      expect(comparison.localPerspective).toBeDefined();
      expect(comparison.touristPerspective).toBeDefined();
      expect(comparison.discrepancyScore).toBeGreaterThan(0);
      expect(comparison.authenticityIndicators).toBeDefined();
    });

    it('should calculate local perspective correctly', async () => {
      const comparison = await comparisonService.getLocationComparison('location123');

      expect(comparison.localPerspective.totalReviews).toBe(2);
      expect(comparison.localPerspective.averageRating).toBe(3.25); // (4.5 + 2) / 2
      expect(comparison.localPerspective.warnings).toHaveLength(1);
      expect(comparison.localPerspective.recommendations).toContain('Local Favorite');
    });

    it('should calculate tourist perspective correctly', async () => {
      const comparison = await comparisonService.getLocationComparison('location123');

      expect(comparison.touristPerspective.totalReviews).toBe(2);
      expect(comparison.touristPerspective.averageRating).toBe(4.5); // (4 + 5) / 2
    });

    it('should calculate discrepancy score', async () => {
      const comparison = await comparisonService.getLocationComparison('location123');

      // Tourist average (4.5) vs Local average (3.25) = 1.25 difference
      // Plus tourist trap warning penalty
      expect(comparison.discrepancyScore).toBeGreaterThan(30);
    });

    it('should handle location with no data', async () => {
      const comparison = await comparisonService.getLocationComparison('empty_location');

      expect(comparison.localPerspective.totalReviews).toBe(0);
      expect(comparison.touristPerspective.totalReviews).toBe(0);
      expect(comparison.discrepancyScore).toBe(0);
    });
  });

  describe('getTouristTrapIndicators', () => {
    beforeEach(async () => {
      // Create tourist trap warning
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'trap_location',
        locationType: 'restaurant',
        title: 'Avoid This Place',
        content: 'This is a classic tourist trap. Overpriced food, poor service, locals never go here.',
        category: 'tourist_trap_warning',
        tags: ['tourist_trap', 'overpriced'],
        localRating: 1.5,
        touristTrapWarning: true,
        localTips: ['Find alternatives nearby'],
        language: 'en'
      });

      // Create tourist reviews with mixed ratings
      await reviewModel.create({
        authorId: 'tourist1',
        locationId: 'trap_location',
        rating: 4,
        content: 'Good location but very expensive',
        visitDate: new Date('2023-10-01'),
        groupType: 'couple',
        language: 'en',
        helpfulVotes: 2
      });

      await reviewModel.create({
        authorId: 'tourist2',
        locationId: 'trap_location',
        rating: 2,
        content: 'Overpriced and not worth it',
        visitDate: new Date('2023-10-02'),
        groupType: 'solo',
        language: 'en',
        helpfulVotes: 8
      });
    });

    it('should identify tourist trap correctly', async () => {
      const indicators = await comparisonService.getTouristTrapIndicators('trap_location');

      expect(indicators.isTouristTrap).toBe(true);
      expect(indicators.confidence).toBeGreaterThan(50);
      expect(indicators.indicators.length).toBeGreaterThan(0);
      expect(indicators.localWarnings.length).toBeGreaterThan(0);
    });

    it('should include specific indicators', async () => {
      const indicators = await comparisonService.getTouristTrapIndicators('trap_location');

      expect(indicators.indicators).toContain('1 local warning(s) about tourist trap');
    });
  });

  describe('getAuthenticityScore', () => {
    beforeEach(async () => {
      // Create high-quality local insight
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'authentic_location',
        locationType: 'restaurant',
        title: 'Authentic Local Gem',
        content: 'This family-run restaurant has been serving the community for 30 years. The recipes are traditional and the atmosphere is genuinely local.',
        category: 'local_favorite',
        tags: ['authentic', 'family_run', 'traditional'],
        localRating: 4.8,
        localTips: ['Try the house special', 'Speak some Cantonese if you can'],
        culturalContext: 'Traditional Cantonese family restaurant culture',
        language: 'en'
      });

      // Create consistent tourist reviews
      await reviewModel.create({
        authorId: 'tourist1',
        locationId: 'authentic_location',
        rating: 5,
        content: 'Authentic experience, loved the local atmosphere',
        visitDate: new Date('2023-10-01'),
        groupType: 'couple',
        language: 'en',
        helpfulVotes: 10
      });

      await reviewModel.create({
        authorId: 'tourist2',
        locationId: 'authentic_location',
        rating: 4,
        content: 'Great food, felt like a local place',
        visitDate: new Date('2023-10-02'),
        groupType: 'solo',
        language: 'en',
        helpfulVotes: 7
      });
    });

    it('should calculate high authenticity score', async () => {
      const authenticity = await comparisonService.getAuthenticityScore('authentic_location');

      expect(authenticity.score).toBeGreaterThan(70);
      expect(authenticity.factors.length).toBeGreaterThan(0);
    });

    it('should include positive factors', async () => {
      const authenticity = await comparisonService.getAuthenticityScore('authentic_location');

      const factorDescriptions = authenticity.factors.map(f => f.description);
      expect(factorDescriptions).toContain('Highly rated by local residents');
      expect(factorDescriptions).toContain('Consistent ratings between locals and tourists');
    });
  });

  describe('getMultipleLocationComparisons', () => {
    beforeEach(async () => {
      // Create data for multiple locations
      const locations = ['loc1', 'loc2', 'loc3'];
      
      for (const locationId of locations) {
        await insightsService.createInsight({
          authorId: verifiedUserId,
          locationId,
          locationType: 'restaurant',
          title: `Insight for ${locationId}`,
          content: `This is a local insight for ${locationId} with enough content to pass validation.`,
          category: 'local_favorite',
          tags: ['test'],
          localRating: 4,
          localTips: ['Test tip'],
          language: 'en'
        });

        await reviewModel.create({
          authorId: 'tourist1',
          locationId,
          rating: 4,
          content: `Tourist review for ${locationId}`,
          visitDate: new Date('2023-10-01'),
          groupType: 'couple',
          language: 'en',
          helpfulVotes: 1
        });
      }
    });

    it('should return comparisons for all locations', async () => {
      const comparisons = await comparisonService.getMultipleLocationComparisons(['loc1', 'loc2', 'loc3']);

      expect(comparisons).toHaveLength(3);
      expect(comparisons[0].locationId).toBe('loc1');
      expect(comparisons[1].locationId).toBe('loc2');
      expect(comparisons[2].locationId).toBe('loc3');
    });
  });
});