import { AuthenticityService } from '../../src/services/authenticityService';
import { LocalInsightsService } from '../../src/services/localInsightsService';
import { LocalResidentService } from '../../src/services/localResidentService';
import { TouristReviewModel } from '../../src/models/TouristReview';

describe('AuthenticityService', () => {
  let authenticityService: AuthenticityService;
  let insightsService: LocalInsightsService;
  let residentService: LocalResidentService;
  let reviewModel: TouristReviewModel;
  let verifiedUserId: string;
  let verifiedResidentId: string;

  beforeEach(async () => {
    authenticityService = new AuthenticityService();
    insightsService = new LocalInsightsService();
    residentService = new LocalResidentService();
    reviewModel = new TouristReviewModel();

    // Create and verify a resident for testing
    const resident = await residentService.registerResident({
      userId: 'verified_user',
      verificationProof: ['proof.jpg'],
      yearsInHongKong: 8,
      districts: ['Central', 'Wan Chai'],
      languages: ['English', 'Cantonese', 'Mandarin'],
      specialties: ['food', 'culture', 'history']
    });

    verifiedUserId = resident.userId;
    verifiedResidentId = resident.id;
    await residentService.verifyResident(resident.id, 'verified');
    await residentService.adjustCredibilityScore(resident.id, 15); // Boost to 85
  });

  afterEach(async () => {
    await authenticityService.clearAllData();
  });

  describe('calculateAuthenticityMetrics', () => {
    beforeEach(async () => {
      // Create high-quality local insights
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'test_location',
        locationType: 'restaurant',
        title: 'Authentic Local Gem',
        content: 'This family restaurant has been serving traditional Cantonese cuisine for over 40 years. The owner still uses recipes passed down from his grandmother.',
        category: 'local_favorite',
        tags: ['authentic', 'traditional', 'family_run'],
        localRating: 4.8,
        localTips: ['Order the steamed fish', 'Come before 7pm for best selection', 'Try to speak some Cantonese'],
        culturalContext: 'Traditional Cantonese family restaurant representing old Hong Kong dining culture',
        language: 'en'
      });

      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'test_location',
        locationType: 'restaurant',
        title: 'Cultural Significance',
        content: 'This place represents the disappearing traditional tea house culture of Hong Kong. It is where locals gather for morning tea and discuss community matters.',
        category: 'cultural_context',
        tags: ['culture', 'tradition', 'community'],
        localRating: 4.5,
        localTips: ['Join the morning tea crowd', 'Respect the elderly patrons'],
        culturalContext: 'Traditional tea house culture and community gathering place',
        language: 'en'
      });

      // Create tourist reviews
      await reviewModel.create({
        authorId: 'tourist1',
        locationId: 'test_location',
        rating: 4,
        content: 'Great authentic experience, felt like stepping back in time',
        visitDate: new Date('2023-10-01'),
        groupType: 'couple',
        nationality: 'US',
        language: 'en',
        helpfulVotes: 8
      });

      await reviewModel.create({
        authorId: 'tourist2',
        locationId: 'test_location',
        rating: 5,
        content: 'Amazing local atmosphere, highly recommend',
        visitDate: new Date('2023-10-02'),
        groupType: 'family',
        nationality: 'UK',
        language: 'en',
        helpfulVotes: 12
      });
    });

    it('should calculate comprehensive authenticity metrics', async () => {
      const metrics = await authenticityService.calculateAuthenticityMetrics('test_location');

      expect(metrics.locationId).toBe('test_location');
      expect(metrics.localVsTouristRatio).toBeGreaterThan(0);
      expect(metrics.authenticityScore).toBeGreaterThan(0);
      expect(metrics.touristTrapScore).toBeGreaterThanOrEqual(0);
      expect(metrics.localRecommendationScore).toBeGreaterThan(0);
      expect(metrics.crowdingImpact).toBeGreaterThanOrEqual(0);
      expect(metrics.priceInflationScore).toBeGreaterThanOrEqual(0);
      expect(metrics.culturalPreservationScore).toBeGreaterThan(0);
      expect(metrics.lastUpdated).toBeDefined();
    });

    it('should calculate high authenticity score for quality content', async () => {
      const metrics = await authenticityService.calculateAuthenticityMetrics('test_location');

      // Should be high due to verified author with high credibility and quality content
      expect(metrics.authenticityScore).toBeGreaterThan(70);
    });

    it('should calculate local vs tourist ratio correctly', async () => {
      const metrics = await authenticityService.calculateAuthenticityMetrics('test_location');

      // 2 local insights, 2 tourist reviews = 50%
      expect(metrics.localVsTouristRatio).toBe(50);
    });

    it('should calculate cultural preservation score', async () => {
      const metrics = await authenticityService.calculateAuthenticityMetrics('test_location');

      // Both insights have cultural context
      expect(metrics.culturalPreservationScore).toBe(100);
    });

    it('should cache results', async () => {
      const metrics1 = await authenticityService.calculateAuthenticityMetrics('test_location');
      const metrics2 = await authenticityService.calculateAuthenticityMetrics('test_location');

      expect(metrics1.lastUpdated).toEqual(metrics2.lastUpdated);
    });
  });

  describe('calculateAuthenticityMetrics with tourist trap', () => {
    beforeEach(async () => {
      // Create tourist trap warning
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'trap_location',
        locationType: 'restaurant',
        title: 'Tourist Trap Warning',
        content: 'This place used to be good but now it is overpriced and caters only to tourists. The quality has declined significantly.',
        category: 'tourist_trap_warning',
        tags: ['tourist_trap', 'overpriced', 'declined'],
        localRating: 2,
        touristTrapWarning: true,
        localTips: ['Avoid this place', 'Try the restaurant next door instead'],
        language: 'en'
      });

      // Create tourist reviews with higher ratings
      await reviewModel.create({
        authorId: 'tourist1',
        locationId: 'trap_location',
        rating: 4,
        content: 'Nice location, good for photos',
        visitDate: new Date('2023-10-01'),
        groupType: 'couple',
        language: 'en',
        helpfulVotes: 3
      });

      await reviewModel.create({
        authorId: 'tourist2',
        locationId: 'trap_location',
        rating: 5,
        content: 'Great tourist spot, worth visiting',
        visitDate: new Date('2023-10-02'),
        groupType: 'family',
        language: 'en',
        helpfulVotes: 5
      });
    });

    it('should calculate high tourist trap score', async () => {
      const metrics = await authenticityService.calculateAuthenticityMetrics('trap_location');

      expect(metrics.touristTrapScore).toBeGreaterThan(50);
    });

    it('should calculate lower authenticity score for tourist trap', async () => {
      const metrics = await authenticityService.calculateAuthenticityMetrics('trap_location');

      expect(metrics.authenticityScore).toBeLessThan(50);
    });
  });

  describe('getAuthenticityRanking', () => {
    beforeEach(async () => {
      // Create data for multiple locations with different authenticity levels
      const locations = [
        { id: 'high_auth', rating: 4.8, warning: false },
        { id: 'medium_auth', rating: 3.5, warning: false },
        { id: 'low_auth', rating: 2.0, warning: true }
      ];

      for (const location of locations) {
        await insightsService.createInsight({
          authorId: verifiedUserId,
          locationId: location.id,
          locationType: 'restaurant',
          title: `Insight for ${location.id}`,
          content: `This is an insight for ${location.id} with enough content to pass validation requirements.`,
          category: location.warning ? 'tourist_trap_warning' : 'local_favorite',
          tags: ['test'],
          localRating: location.rating,
          touristTrapWarning: location.warning,
          localTips: ['Test tip'],
          language: 'en'
        });
      }
    });

    it('should return ranked locations by authenticity score', async () => {
      const ranking = await authenticityService.getAuthenticityRanking(['high_auth', 'medium_auth', 'low_auth']);

      expect(ranking).toHaveLength(3);
      expect(ranking[0].rank).toBe(1);
      expect(ranking[1].rank).toBe(2);
      expect(ranking[2].rank).toBe(3);
      
      // High authenticity should be ranked first
      expect(ranking[0].authenticityScore).toBeGreaterThan(ranking[1].authenticityScore);
      expect(ranking[1].authenticityScore).toBeGreaterThan(ranking[2].authenticityScore);
    });
  });

  describe('getTouristTrapLocations', () => {
    beforeEach(async () => {
      // Create tourist trap location
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'trap1',
        locationType: 'restaurant',
        title: 'Avoid This Tourist Trap',
        content: 'This place is a classic tourist trap with inflated prices and poor quality food.',
        category: 'tourist_trap_warning',
        tags: ['tourist_trap'],
        localRating: 1.5,
        touristTrapWarning: true,
        localTips: ['Avoid completely'],
        language: 'en'
      });

      // Force calculation to populate cache
      await authenticityService.calculateAuthenticityMetrics('trap1');
    });

    it('should identify tourist trap locations', async () => {
      const touristTraps = await authenticityService.getTouristTrapLocations(50);

      expect(touristTraps.length).toBeGreaterThan(0);
      expect(touristTraps[0].locationId).toBe('trap1');
      expect(touristTraps[0].touristTrapScore).toBeGreaterThan(50);
      expect(touristTraps[0].warnings.length).toBeGreaterThan(0);
    });
  });

  describe('getHighAuthenticityLocations', () => {
    beforeEach(async () => {
      // Create high authenticity location
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'authentic1',
        locationType: 'restaurant',
        title: 'Authentic Local Gem',
        content: 'This is a genuine local favorite with traditional recipes and reasonable prices that locals actually visit regularly.',
        category: 'local_favorite',
        tags: ['authentic', 'traditional'],
        localRating: 4.8,
        localTips: ['Order the house special', 'Come early'],
        culturalContext: 'Traditional local dining culture',
        language: 'en'
      });

      // Force calculation to populate cache
      await authenticityService.calculateAuthenticityMetrics('authentic1');
    });

    it('should identify high authenticity locations', async () => {
      const authenticLocations = await authenticityService.getHighAuthenticityLocations(70);

      expect(authenticLocations.length).toBeGreaterThan(0);
      expect(authenticLocations[0].locationId).toBe('authentic1');
      expect(authenticLocations[0].authenticityScore).toBeGreaterThan(70);
      expect(authenticLocations[0].localRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('validateInsightAuthenticity', () => {
    let insightId: string;

    beforeEach(async () => {
      const insight = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'test_location',
        locationType: 'restaurant',
        title: 'High Quality Insight',
        content: 'This is a very detailed insight with lots of useful information about the location, including cultural context and practical tips for visitors.',
        category: 'local_favorite',
        tags: ['authentic', 'detailed'],
        localRating: 4.5,
        localTips: ['Tip 1', 'Tip 2', 'Tip 3'],
        culturalContext: 'Important cultural context about this location',
        language: 'en'
      });
      insightId = insight.id;

      // Add some upvotes
      await insightsService.upvoteInsight(insightId, 'user1');
      await insightsService.upvoteInsight(insightId, 'user2');
      await insightsService.upvoteInsight(insightId, 'user3');
      await insightsService.upvoteInsight(insightId, 'user4');
      await insightsService.upvoteInsight(insightId, 'user5');
      await insightsService.upvoteInsight(insightId, 'user6');
    });

    it('should validate authentic insight', async () => {
      const validation = await authenticityService.validateInsightAuthenticity(insightId);

      expect(validation.isAuthentic).toBe(true);
      expect(validation.confidence).toBeGreaterThan(60);
      expect(validation.factors).toContain('Author is verified local resident');
      expect(validation.factors).toContain('Author has high credibility score');
      expect(validation.factors).toContain('Detailed content provided');
      expect(validation.factors).toContain('Multiple local tips provided');
      expect(validation.factors).toContain('Cultural context provided');
      expect(validation.factors).toContain('Positively received by community');
    });

    it('should handle non-existent insight', async () => {
      await expect(authenticityService.validateInsightAuthenticity('invalid_id'))
        .rejects.toThrow('Insight not found');
    });
  });

  describe('updateAuthenticityScore', () => {
    beforeEach(async () => {
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'update_test',
        locationType: 'restaurant',
        title: 'Test Insight',
        content: 'This is a test insight with enough content to pass validation requirements.',
        category: 'local_favorite',
        tags: ['test'],
        localRating: 4,
        localTips: ['Test tip'],
        language: 'en'
      });

      // Calculate initial metrics
      await authenticityService.calculateAuthenticityMetrics('update_test');
    });

    it('should force recalculation of authenticity metrics', async () => {
      const initialMetrics = await authenticityService.calculateAuthenticityMetrics('update_test');
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updatedMetrics = await authenticityService.updateAuthenticityScore('update_test');

      expect(updatedMetrics.lastUpdated.getTime()).toBeGreaterThan(initialMetrics.lastUpdated.getTime());
    });
  });

  describe('clearCache', () => {
    it('should clear authenticity cache', async () => {
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'cache_test',
        locationType: 'restaurant',
        title: 'Test Insight',
        content: 'This is a test insight with enough content to pass validation requirements.',
        category: 'local_favorite',
        tags: ['test'],
        localRating: 4,
        localTips: ['Test tip'],
        language: 'en'
      });

      // Calculate metrics to populate cache
      await authenticityService.calculateAuthenticityMetrics('cache_test');
      
      // Clear cache
      await authenticityService.clearCache();
      
      // This should work without errors
      const metrics = await authenticityService.calculateAuthenticityMetrics('cache_test');
      expect(metrics).toBeDefined();
    });
  });
});