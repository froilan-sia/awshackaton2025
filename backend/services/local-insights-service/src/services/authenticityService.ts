import { AuthenticityMetrics } from '../types/localInsights';
import { LocalInsightModel } from '../models/LocalInsight';
import { TouristReviewModel } from '../models/TouristReview';
import { LocalResidentModel } from '../models/LocalResident';

export class AuthenticityService {
  private insightModel: LocalInsightModel;
  private reviewModel: TouristReviewModel;
  private residentModel: LocalResidentModel;
  private authenticityCache: Map<string, AuthenticityMetrics> = new Map();

  constructor(insightModel?: LocalInsightModel, reviewModel?: TouristReviewModel, residentModel?: LocalResidentModel) {
    this.insightModel = insightModel || new LocalInsightModel();
    this.reviewModel = reviewModel || new TouristReviewModel();
    this.residentModel = residentModel || new LocalResidentModel();
  }

  async calculateAuthenticityMetrics(locationId: string): Promise<AuthenticityMetrics> {
    // Check cache first
    const cached = this.authenticityCache.get(locationId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const localInsights = await this.insightModel.findByLocationId(locationId);
    const touristReviews = await this.reviewModel.findByLocationId(locationId);

    // Calculate individual metrics
    const localVsTouristRatio = this.calculateLocalVsTouristRatio(localInsights, touristReviews);
    const authenticityScore = await this.calculateLocationAuthenticityScore(locationId, localInsights);
    const touristTrapScore = this.calculateTouristTrapScore(localInsights, touristReviews);
    const localRecommendationScore = this.calculateLocalRecommendationScore(localInsights);
    const crowdingImpact = this.calculateCrowdingImpact(localInsights, touristReviews);
    const priceInflationScore = this.calculatePriceInflationScore(localInsights);
    const culturalPreservationScore = this.calculateCulturalPreservationScore(localInsights);

    const metrics: AuthenticityMetrics = {
      locationId,
      localVsTouristRatio,
      authenticityScore,
      touristTrapScore,
      localRecommendationScore,
      crowdingImpact,
      priceInflationScore,
      culturalPreservationScore,
      lastUpdated: new Date()
    };

    // Cache the results
    this.authenticityCache.set(locationId, metrics);

    return metrics;
  }

  async updateAuthenticityScore(locationId: string): Promise<AuthenticityMetrics> {
    // Force recalculation by removing from cache
    this.authenticityCache.delete(locationId);
    return await this.calculateAuthenticityMetrics(locationId);
  }

  async getAuthenticityRanking(locationIds: string[]): Promise<Array<{
    locationId: string;
    authenticityScore: number;
    rank: number;
  }>> {
    const metrics = await Promise.all(
      locationIds.map(id => this.calculateAuthenticityMetrics(id))
    );

    return metrics
      .map(metric => ({
        locationId: metric.locationId,
        authenticityScore: metric.authenticityScore,
        rank: 0
      }))
      .sort((a, b) => b.authenticityScore - a.authenticityScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  async getTouristTrapLocations(threshold: number = 70): Promise<Array<{
    locationId: string;
    touristTrapScore: number;
    warnings: string[];
  }>> {
    // This would typically query all locations, for now we'll work with cached data
    const touristTraps: Array<{
      locationId: string;
      touristTrapScore: number;
      warnings: string[];
    }> = [];

    for (const [locationId, metrics] of this.authenticityCache.entries()) {
      if (metrics.touristTrapScore >= threshold) {
        const localInsights = await this.insightModel.findByLocationId(locationId);
        const warnings = localInsights
          .filter(insight => insight.touristTrapWarning)
          .map(insight => insight.content);

        touristTraps.push({
          locationId,
          touristTrapScore: metrics.touristTrapScore,
          warnings
        });
      }
    }

    return touristTraps.sort((a, b) => b.touristTrapScore - a.touristTrapScore);
  }

  async getHighAuthenticityLocations(threshold: number = 80): Promise<Array<{
    locationId: string;
    authenticityScore: number;
    localRecommendations: string[];
  }>> {
    const authenticLocations: Array<{
      locationId: string;
      authenticityScore: number;
      localRecommendations: string[];
    }> = [];

    for (const [locationId, metrics] of this.authenticityCache.entries()) {
      if (metrics.authenticityScore >= threshold) {
        const localInsights = await this.insightModel.findByLocationId(locationId);
        const localRecommendations = localInsights
          .filter(insight => insight.localRating >= 4)
          .map(insight => insight.title);

        authenticLocations.push({
          locationId,
          authenticityScore: metrics.authenticityScore,
          localRecommendations
        });
      }
    }

    return authenticLocations.sort((a, b) => b.authenticityScore - a.authenticityScore);
  }

  async validateInsightAuthenticity(insightId: string): Promise<{
    isAuthentic: boolean;
    confidence: number;
    factors: string[];
  }> {
    const insight = await this.insightModel.findById(insightId);
    if (!insight) {
      throw new Error('Insight not found');
    }

    const resident = await this.residentModel.findByUserId(insight.authorId);
    if (!resident) {
      return {
        isAuthentic: false,
        confidence: 0,
        factors: ['Author is not a verified local resident']
      };
    }

    const factors: string[] = [];
    let confidence = 50; // Base confidence

    // Author verification status
    if (resident.verificationStatus === 'verified') {
      confidence += 20;
      factors.push('Author is verified local resident');
    }

    // Author credibility score
    if (resident.credibilityScore > 80) {
      confidence += 15;
      factors.push('Author has high credibility score');
    } else if (resident.credibilityScore < 40) {
      confidence -= 15;
      factors.push('Author has low credibility score');
    }

    // Content quality indicators
    if (insight.content.length > 200) {
      confidence += 5;
      factors.push('Detailed content provided');
    }

    if (insight.localTips.length > 2) {
      confidence += 5;
      factors.push('Multiple local tips provided');
    }

    if (insight.culturalContext) {
      confidence += 10;
      factors.push('Cultural context provided');
    }

    // Community validation
    const netVotes = insight.upvotes - insight.downvotes;
    if (netVotes > 5) {
      confidence += 10;
      factors.push('Positively received by community');
    } else if (netVotes < -2) {
      confidence -= 10;
      factors.push('Negatively received by community');
    }

    // Report count
    if (insight.reportCount > 0) {
      confidence -= insight.reportCount * 5;
      factors.push(`${insight.reportCount} report(s) against this insight`);
    }

    const finalConfidence = Math.max(0, Math.min(100, confidence));
    const isAuthentic = finalConfidence >= 60;

    return {
      isAuthentic,
      confidence: finalConfidence,
      factors
    };
  }

  private calculateLocalVsTouristRatio(localInsights: any[], touristReviews: any[]): number {
    const totalContent = localInsights.length + touristReviews.length;
    if (totalContent === 0) return 0;
    
    return (localInsights.length / totalContent) * 100;
  }

  private async calculateLocationAuthenticityScore(locationId: string, localInsights: any[]): Promise<number> {
    if (localInsights.length === 0) return 0;

    let totalScore = 0;
    let weightedSum = 0;

    for (const insight of localInsights) {
      const resident = await this.residentModel.findByUserId(insight.authorId);
      const weight = resident ? resident.credibilityScore / 100 : 0.5;
      
      totalScore += insight.authenticityScore * weight;
      weightedSum += weight;
    }

    return weightedSum > 0 ? totalScore / weightedSum : 0;
  }

  private calculateTouristTrapScore(localInsights: any[], touristReviews: any[]): number {
    let score = 0;

    // Tourist trap warnings from locals
    const touristTrapWarnings = localInsights.filter(insight => insight.touristTrapWarning);
    score += touristTrapWarnings.length * 25;

    // Rating discrepancy
    if (localInsights.length > 0 && touristReviews.length > 0) {
      const localAvg = localInsights.reduce((sum, insight) => sum + insight.localRating, 0) / localInsights.length;
      const touristAvg = touristReviews.reduce((sum, review) => sum + review.rating, 0) / touristReviews.length;
      
      if (touristAvg > localAvg + 1) {
        score += (touristAvg - localAvg) * 15;
      }
    }

    // High tourist volume indicators
    if (touristReviews.length > localInsights.length * 10) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private calculateLocalRecommendationScore(localInsights: any[]): number {
    if (localInsights.length === 0) return 0;

    const highRatedInsights = localInsights.filter(insight => insight.localRating >= 4);
    const positiveInsights = localInsights.filter(insight => 
      (insight.upvotes - insight.downvotes) > 0
    );

    const ratingScore = (highRatedInsights.length / localInsights.length) * 50;
    const communityScore = (positiveInsights.length / localInsights.length) * 50;

    return ratingScore + communityScore;
  }

  private calculateCrowdingImpact(localInsights: any[], touristReviews: any[]): number {
    // Look for crowding-related keywords in insights and reviews
    const crowdingKeywords = ['crowded', 'busy', 'packed', 'queue', 'wait', 'tourist'];
    
    let crowdingMentions = 0;
    let totalContent = 0;

    localInsights.forEach(insight => {
      totalContent++;
      if (crowdingKeywords.some(keyword => 
        insight.content.toLowerCase().includes(keyword) ||
        insight.localTips.some((tip: string) => tip.toLowerCase().includes(keyword))
      )) {
        crowdingMentions++;
      }
    });

    touristReviews.forEach(review => {
      totalContent++;
      if (crowdingKeywords.some(keyword => 
        review.content.toLowerCase().includes(keyword)
      )) {
        crowdingMentions++;
      }
    });

    return totalContent > 0 ? (crowdingMentions / totalContent) * 100 : 0;
  }

  private calculatePriceInflationScore(localInsights: any[]): number {
    // Look for price-related warnings in local insights
    const priceKeywords = ['expensive', 'overpriced', 'tourist price', 'inflated'];
    
    let priceWarnings = 0;
    
    localInsights.forEach(insight => {
      if (priceKeywords.some(keyword => 
        insight.content.toLowerCase().includes(keyword) ||
        insight.localTips.some((tip: string) => tip.toLowerCase().includes(keyword))
      )) {
        priceWarnings++;
      }
    });

    return localInsights.length > 0 ? (priceWarnings / localInsights.length) * 100 : 0;
  }

  private calculateCulturalPreservationScore(localInsights: any[]): number {
    if (localInsights.length === 0) return 0;

    const culturalInsights = localInsights.filter(insight => 
      insight.culturalContext || 
      insight.category === 'cultural_context' ||
      insight.tags.includes('culture') ||
      insight.tags.includes('tradition')
    );

    return (culturalInsights.length / localInsights.length) * 100;
  }

  private isCacheValid(metrics: AuthenticityMetrics): boolean {
    const cacheAge = Date.now() - metrics.lastUpdated.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return cacheAge < maxAge;
  }

  // For testing purposes
  async clearCache(): Promise<void> {
    this.authenticityCache.clear();
  }

  async clearAllData(): Promise<void> {
    await this.insightModel.clear();
    await this.reviewModel.clear();
    await this.residentModel.clear();
    this.authenticityCache.clear();
  }
}