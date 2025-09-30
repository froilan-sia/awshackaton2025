import { LocalInsightsService } from '../../src/services/localInsightsService';
import { LocalResidentService } from '../../src/services/localResidentService';

describe('LocalInsightsService', () => {
  let insightsService: LocalInsightsService;
  let residentService: LocalResidentService;
  let verifiedResidentId: string;
  let verifiedUserId: string;

  beforeEach(async () => {
    insightsService = new LocalInsightsService();
    residentService = new LocalResidentService();

    // Create and verify a resident for testing
    const resident = await residentService.registerResident({
      userId: 'verified_user',
      verificationProof: ['proof.jpg'],
      yearsInHongKong: 5,
      districts: ['Central'],
      languages: ['English', 'Cantonese'],
      specialties: ['food', 'culture']
    });

    verifiedResidentId = resident.id;
    verifiedUserId = resident.userId;
    await residentService.verifyResident(verifiedResidentId, 'verified');
  });

  afterEach(async () => {
    await insightsService.clearAllInsights();
    await residentService.clearAllResidents();
  });

  describe('createInsight', () => {
    const validInsightData = {
      authorId: 'verified_user',
      locationId: 'location123',
      locationType: 'restaurant' as const,
      title: 'Amazing Local Dim Sum Place',
      content: 'This is a hidden gem that locals love. The har gow here is exceptional and the prices are very reasonable compared to tourist places.',
      category: 'local_favorite' as const,
      tags: ['dim_sum', 'affordable', 'authentic'],
      localRating: 4.5,
      touristTrapWarning: false,
      bestTimeToVisit: 'Weekday mornings before 11am',
      localTips: ['Order the har gow first', 'Ask for tea recommendations'],
      culturalContext: 'Traditional dim sum culture in Hong Kong',
      language: 'en'
    };

    it('should create insight successfully for verified resident', async () => {
      const insight = await insightsService.createInsight(validInsightData);

      expect(insight).toBeDefined();
      expect(insight.authorId).toBe(validInsightData.authorId);
      expect(insight.title).toBe(validInsightData.title);
      expect(insight.authenticityScore).toBeGreaterThan(0);
      expect(insight.status).toBe('active');
      expect(insight.upvotes).toBe(0);
      expect(insight.downvotes).toBe(0);
    });

    it('should calculate authenticity score based on author credibility', async () => {
      const insight = await insightsService.createInsight(validInsightData);

      // Should be > 50 due to verified resident with good credibility
      expect(insight.authenticityScore).toBeGreaterThan(50);
    });

    it('should throw error for unverified resident', async () => {
      const unverifiedData = { ...validInsightData, authorId: 'unverified_user' };

      await expect(insightsService.createInsight(unverifiedData))
        .rejects.toThrow('Only verified local residents can create insights');
    });

    it('should throw error for invalid rating', async () => {
      const invalidData = { ...validInsightData, localRating: 6 };

      await expect(insightsService.createInsight(invalidData))
        .rejects.toThrow('Local rating must be between 1 and 5');
    });

    it('should throw error for short content', async () => {
      const invalidData = { ...validInsightData, content: 'Too short' };

      await expect(insightsService.createInsight(invalidData))
        .rejects.toThrow('Insight content must be at least 50 characters long');
    });
  });

  describe('getInsightById', () => {
    it('should return insight by ID', async () => {
      const createdInsight = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Test Insight',
        content: 'This is a test insight with enough content to pass validation requirements.',
        category: 'local_favorite',
        tags: ['test'],
        localRating: 4,
        localTips: ['Test tip'],
        language: 'en'
      });

      const foundInsight = await insightsService.getInsightById(createdInsight.id);

      expect(foundInsight).toEqual(createdInsight);
    });

    it('should throw error for non-existent insight', async () => {
      await expect(insightsService.getInsightById('invalid_id'))
        .rejects.toThrow('Insight not found');
    });
  });

  describe('getInsightsByLocation', () => {
    it('should return insights for specific location', async () => {
      const insight1 = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Insight 1',
        content: 'This is the first insight with enough content to pass validation.',
        category: 'local_favorite',
        tags: ['test'],
        localRating: 4,
        localTips: ['Tip 1'],
        language: 'en'
      });

      const insight2 = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location456',
        locationType: 'attraction',
        title: 'Insight 2',
        content: 'This is the second insight with enough content to pass validation.',
        category: 'hidden_gem',
        tags: ['test'],
        localRating: 5,
        localTips: ['Tip 2'],
        language: 'en'
      });

      const locationInsights = await insightsService.getInsightsByLocation('location123');

      expect(locationInsights).toHaveLength(1);
      expect(locationInsights[0].id).toBe(insight1.id);
    });
  });

  describe('upvoteInsight', () => {
    let insightId: string;

    beforeEach(async () => {
      const insight = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Test Insight',
        content: 'This is a test insight with enough content to pass validation requirements.',
        category: 'local_favorite',
        tags: ['test'],
        localRating: 4,
        localTips: ['Test tip'],
        language: 'en'
      });
      insightId = insight.id;
    });

    it('should upvote insight successfully', async () => {
      const updatedInsight = await insightsService.upvoteInsight(insightId, 'different_user');

      expect(updatedInsight.upvotes).toBe(1);
    });

    it('should throw error when author tries to upvote own insight', async () => {
      await expect(insightsService.upvoteInsight(insightId, verifiedUserId))
        .rejects.toThrow('Cannot vote on your own insight');
    });

    it('should throw error for non-existent insight', async () => {
      await expect(insightsService.upvoteInsight('invalid_id', 'user123'))
        .rejects.toThrow('Insight not found');
    });
  });

  describe('downvoteInsight', () => {
    let insightId: string;

    beforeEach(async () => {
      const insight = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Test Insight',
        content: 'This is a test insight with enough content to pass validation requirements.',
        category: 'local_favorite',
        tags: ['test'],
        localRating: 4,
        localTips: ['Test tip'],
        language: 'en'
      });
      insightId = insight.id;
    });

    it('should downvote insight successfully', async () => {
      const updatedInsight = await insightsService.downvoteInsight(insightId, 'different_user');

      expect(updatedInsight.downvotes).toBe(1);
    });

    it('should throw error when author tries to downvote own insight', async () => {
      await expect(insightsService.downvoteInsight(insightId, verifiedUserId))
        .rejects.toThrow('Cannot vote on your own insight');
    });
  });

  describe('reportInsight', () => {
    let insightId: string;

    beforeEach(async () => {
      const insight = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Test Insight',
        content: 'This is a test insight with enough content to pass validation requirements.',
        category: 'local_favorite',
        tags: ['test'],
        localRating: 4,
        localTips: ['Test tip'],
        language: 'en'
      });
      insightId = insight.id;
    });

    it('should report insight successfully', async () => {
      const updatedInsight = await insightsService.reportInsight(insightId, 'reporter_user', 'Inappropriate content');

      expect(updatedInsight.reportCount).toBe(1);
    });

    it('should flag insight after multiple reports', async () => {
      // Report multiple times to trigger flagging
      await insightsService.reportInsight(insightId, 'user1', 'Reason 1');
      await insightsService.reportInsight(insightId, 'user2', 'Reason 2');
      await insightsService.reportInsight(insightId, 'user3', 'Reason 3');
      await insightsService.reportInsight(insightId, 'user4', 'Reason 4');
      const flaggedInsight = await insightsService.reportInsight(insightId, 'user5', 'Reason 5');

      expect(flaggedInsight.status).toBe('flagged');
      expect(flaggedInsight.reportCount).toBe(5);
    });
  });

  describe('updateInsight', () => {
    let insightId: string;

    beforeEach(async () => {
      const insight = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Original Title',
        content: 'This is the original content with enough characters to pass validation.',
        category: 'local_favorite',
        tags: ['original'],
        localRating: 4,
        localTips: ['Original tip'],
        language: 'en'
      });
      insightId = insight.id;
    });

    it('should update insight successfully by author', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'This is the updated content with enough characters to pass validation requirements.',
        tags: ['updated', 'modified']
      };

      const updatedInsight = await insightsService.updateInsight(insightId, verifiedUserId, updates);

      expect(updatedInsight.title).toBe(updates.title);
      expect(updatedInsight.content).toBe(updates.content);
      expect(updatedInsight.tags).toEqual(updates.tags);
    });

    it('should throw error when non-author tries to update', async () => {
      const updates = { title: 'Unauthorized Update' };

      await expect(insightsService.updateInsight(insightId, 'different_user', updates))
        .rejects.toThrow('Only the author can update this insight');
    });
  });

  describe('deleteInsight', () => {
    let insightId: string;

    beforeEach(async () => {
      const insight = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Test Insight',
        content: 'This is a test insight with enough content to pass validation requirements.',
        category: 'local_favorite',
        tags: ['test'],
        localRating: 4,
        localTips: ['Test tip'],
        language: 'en'
      });
      insightId = insight.id;
    });

    it('should delete insight successfully by author', async () => {
      const success = await insightsService.deleteInsight(insightId, verifiedUserId);

      expect(success).toBe(true);
    });

    it('should throw error when non-author tries to delete', async () => {
      await expect(insightsService.deleteInsight(insightId, 'different_user'))
        .rejects.toThrow('Only the author can delete this insight');
    });
  });

  describe('getInsightsWithFilters', () => {
    beforeEach(async () => {
      // Create multiple insights for filtering tests
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Food Insight',
        content: 'This is a food-related insight with enough content to pass validation.',
        category: 'food_recommendation',
        tags: ['dim_sum', 'authentic'],
        localRating: 5,
        localTips: ['Food tip'],
        language: 'en'
      });

      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location456',
        locationType: 'attraction',
        title: 'Cultural Insight',
        content: 'This is a cultural insight with enough content to pass validation requirements.',
        category: 'cultural_context',
        tags: ['temple', 'tradition'],
        localRating: 4,
        localTips: ['Cultural tip'],
        language: 'zh'
      });
    });

    it('should filter by category', async () => {
      const insights = await insightsService.getInsightsWithFilters({ category: 'food_recommendation' });

      expect(insights).toHaveLength(1);
      expect(insights[0].category).toBe('food_recommendation');
    });

    it('should filter by location type', async () => {
      const insights = await insightsService.getInsightsWithFilters({ locationType: 'restaurant' });

      expect(insights).toHaveLength(1);
      expect(insights[0].locationType).toBe('restaurant');
    });

    it('should filter by language', async () => {
      const insights = await insightsService.getInsightsWithFilters({ language: 'zh' });

      expect(insights).toHaveLength(1);
      expect(insights[0].language).toBe('zh');
    });

    it('should filter by tags', async () => {
      const insights = await insightsService.getInsightsWithFilters({ tags: ['authentic'] });

      expect(insights).toHaveLength(1);
      expect(insights[0].tags).toContain('authentic');
    });
  });

  describe('getTouristTrapWarnings', () => {
    it('should return only insights with tourist trap warnings', async () => {
      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Tourist Trap Warning',
        content: 'This place is overpriced and caters mainly to tourists. Locals avoid it.',
        category: 'tourist_trap_warning',
        tags: ['overpriced'],
        localRating: 2,
        touristTrapWarning: true,
        localTips: ['Avoid this place'],
        language: 'en'
      });

      await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location456',
        locationType: 'restaurant',
        title: 'Good Local Place',
        content: 'This is a genuine local favorite with reasonable prices and good food.',
        category: 'local_favorite',
        tags: ['authentic'],
        localRating: 5,
        touristTrapWarning: false,
        localTips: ['Try the special'],
        language: 'en'
      });

      const warnings = await insightsService.getTouristTrapWarnings();

      expect(warnings).toHaveLength(1);
      expect(warnings[0].touristTrapWarning).toBe(true);
    });
  });

  describe('moderateInsight', () => {
    let insightId: string;

    beforeEach(async () => {
      const insight = await insightsService.createInsight({
        authorId: verifiedUserId,
        locationId: 'location123',
        locationType: 'restaurant',
        title: 'Test Insight',
        content: 'This is a test insight with enough content to pass validation requirements.',
        category: 'local_favorite',
        tags: ['test'],
        localRating: 4,
        localTips: ['Test tip'],
        language: 'en'
      });
      insightId = insight.id;

      // Flag the insight first
      await insightsService.reportInsight(insightId, 'user1', 'Test report');
      await insightsService.reportInsight(insightId, 'user2', 'Test report');
      await insightsService.reportInsight(insightId, 'user3', 'Test report');
      await insightsService.reportInsight(insightId, 'user4', 'Test report');
      await insightsService.reportInsight(insightId, 'user5', 'Test report');
    });

    it('should approve flagged insight', async () => {
      const moderatedInsight = await insightsService.moderateInsight(insightId, 'approve');

      expect(moderatedInsight.status).toBe('active');
    });

    it('should remove flagged insight', async () => {
      const moderatedInsight = await insightsService.moderateInsight(insightId, 'remove');

      expect(moderatedInsight.status).toBe('removed');
    });
  });
});