import { ReviewComparison } from '../types/localInsights';
import { LocalInsightModel } from '../models/LocalInsight';
import { TouristReviewModel } from '../models/TouristReview';

export class ReviewComparisonService {
  private insightModel: LocalInsightModel;
  private reviewModel: TouristReviewModel;

  constructor(insightModel?: LocalInsightModel, reviewModel?: TouristReviewModel) {
    this.insightModel = insightModel || new LocalInsightModel();
    this.reviewModel = reviewModel || new TouristReviewModel();
  }

  async getLocationComparison(locationId: string): Promise<ReviewComparison> {
    // Get local insights for the location
    const localInsights = await this.insightModel.findByLocationId(locationId);
    
    // Get tourist reviews for the location
    const touristReviews = await this.reviewModel.findByLocationId(locationId);

    // Calculate local perspective metrics
    const localPerspective = this.calculateLocalPerspective(localInsights);
    
    // Calculate tourist perspective metrics
    const touristPerspective = this.calculateTouristPerspective(touristReviews);

    // Calculate discrepancy score
    const discrepancyScore = this.calculateDiscrepancyScore(localPerspective, touristPerspective);

    // Generate authenticity indicators
    const authenticityIndicators = this.generateAuthenticityIndicators(
      localInsights, 
      touristReviews, 
      discrepancyScore
    );

    return {
      locationId,
      localPerspective,
      touristPerspective,
      discrepancyScore,
      authenticityIndicators
    };
  }

  async getMultipleLocationComparisons(locationIds: string[]): Promise<ReviewComparison[]> {
    const comparisons = await Promise.all(
      locationIds.map(id => this.getLocationComparison(id))
    );
    return comparisons;
  }

  async getTouristTrapIndicators(locationId: string): Promise<{
    isTouristTrap: boolean;
    confidence: number;
    indicators: string[];
    localWarnings: string[];
  }> {
    const comparison = await this.getLocationComparison(locationId);
    const localInsights = await this.insightModel.findByLocationId(locationId);

    const touristTrapWarnings = localInsights.filter(insight => insight.touristTrapWarning);
    const isTouristTrap = touristTrapWarnings.length > 0 || comparison.discrepancyScore > 70;
    
    const indicators: string[] = [];
    const localWarnings: string[] = [];

    // Check for tourist trap indicators
    if (comparison.discrepancyScore > 70) {
      indicators.push('Significant rating discrepancy between locals and tourists');
    }

    if (comparison.localPerspective.averageRating < 3 && comparison.touristPerspective.averageRating > 4) {
      indicators.push('Locals rate much lower than tourists');
    }

    if (touristTrapWarnings.length > 0) {
      indicators.push(`${touristTrapWarnings.length} local warning(s) about tourist trap`);
      localWarnings.push(...touristTrapWarnings.map(w => w.content));
    }

    // Check for overpricing indicators
    const pricingComplaints = comparison.touristPerspective.complaints.filter(
      complaint => complaint.toLowerCase().includes('expensive') || 
                  complaint.toLowerCase().includes('overpriced')
    );
    
    if (pricingComplaints.length > comparison.touristPerspective.totalReviews * 0.3) {
      indicators.push('Frequent complaints about high prices');
    }

    const confidence = Math.min(100, 
      (indicators.length * 25) + 
      (touristTrapWarnings.length * 20) + 
      (comparison.discrepancyScore * 0.5)
    );

    return {
      isTouristTrap,
      confidence,
      indicators,
      localWarnings
    };
  }

  async getAuthenticityScore(locationId: string): Promise<{
    score: number;
    factors: Array<{ factor: string; impact: number; description: string }>;
  }> {
    const comparison = await this.getLocationComparison(locationId);
    const localInsights = await this.insightModel.findByLocationId(locationId);

    let score = 50; // Base score
    const factors: Array<{ factor: string; impact: number; description: string }> = [];

    // Local endorsement factor
    if (comparison.localPerspective.averageRating >= 4) {
      const impact = 20;
      score += impact;
      factors.push({
        factor: 'Local Endorsement',
        impact,
        description: 'Highly rated by local residents'
      });
    }

    // Tourist trap warnings
    const touristTrapWarnings = localInsights.filter(insight => insight.touristTrapWarning);
    if (touristTrapWarnings.length > 0) {
      const impact = -30;
      score += impact;
      factors.push({
        factor: 'Tourist Trap Warnings',
        impact,
        description: `${touristTrapWarnings.length} local warning(s) about tourist trap`
      });
    }

    // Rating consistency
    if (comparison.discrepancyScore < 20) {
      const impact = 15;
      score += impact;
      factors.push({
        factor: 'Rating Consistency',
        impact,
        description: 'Consistent ratings between locals and tourists'
      });
    } else if (comparison.discrepancyScore > 50) {
      const impact = -15;
      score += impact;
      factors.push({
        factor: 'Rating Discrepancy',
        impact,
        description: 'Significant difference in local vs tourist ratings'
      });
    }

    // Local insights quality
    const highQualityInsights = localInsights.filter(insight => insight.authenticityScore > 80);
    if (highQualityInsights.length > 0) {
      const impact = 10;
      score += impact;
      factors.push({
        factor: 'Quality Local Insights',
        impact,
        description: `${highQualityInsights.length} high-quality local insight(s)`
      });
    }

    // Cultural context provided
    const culturalInsights = localInsights.filter(insight => insight.culturalContext);
    if (culturalInsights.length > 0) {
      const impact = 5;
      score += impact;
      factors.push({
        factor: 'Cultural Context',
        impact,
        description: 'Local cultural context provided'
      });
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors
    };
  }

  private calculateLocalPerspective(insights: any[]) {
    if (insights.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        commonThemes: [],
        warnings: [],
        recommendations: []
      };
    }

    const averageRating = insights.reduce((sum, insight) => sum + insight.localRating, 0) / insights.length;
    const warnings = insights.filter(insight => insight.touristTrapWarning).map(insight => insight.content);
    const recommendations = insights.filter(insight => insight.localRating >= 4).map(insight => insight.title);
    
    // Extract common themes from tags
    const allTags = insights.flatMap(insight => insight.tags);
    const tagCounts = allTags.reduce((acc: Record<string, number>, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});
    
    const commonThemes = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      averageRating,
      totalReviews: insights.length,
      commonThemes,
      warnings,
      recommendations
    };
  }

  private calculateTouristPerspective(reviews: any[]) {
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        commonThemes: [],
        complaints: [],
        highlights: []
      };
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    // Simple sentiment analysis based on rating
    const complaints = reviews
      .filter(review => review.rating <= 2)
      .map(review => review.content)
      .slice(0, 5);
    
    const highlights = reviews
      .filter(review => review.rating >= 4)
      .map(review => review.content)
      .slice(0, 5);

    // Extract common themes from group types
    const groupTypes = reviews.map(review => review.groupType);
    const groupCounts = groupTypes.reduce((acc: Record<string, number>, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    const commonThemes = Object.entries(groupCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => `Popular with ${type} travelers`);

    return {
      averageRating,
      totalReviews: reviews.length,
      commonThemes,
      complaints,
      highlights
    };
  }

  private calculateDiscrepancyScore(localPerspective: any, touristPerspective: any): number {
    if (localPerspective.totalReviews === 0 || touristPerspective.totalReviews === 0) {
      return 0;
    }

    // Calculate rating difference (0-100 scale)
    const ratingDifference = Math.abs(localPerspective.averageRating - touristPerspective.averageRating);
    const ratingDiscrepancy = (ratingDifference / 4) * 100; // Max difference is 4 points

    // Factor in warning indicators
    const warningPenalty = localPerspective.warnings.length * 20;

    return Math.min(100, ratingDiscrepancy + warningPenalty);
  }

  private generateAuthenticityIndicators(
    localInsights: any[], 
    touristReviews: any[], 
    discrepancyScore: number
  ): string[] {
    const indicators: string[] = [];

    if (localInsights.length > 0) {
      indicators.push(`${localInsights.length} local insight(s) available`);
    }

    if (discrepancyScore < 20) {
      indicators.push('Consistent ratings between locals and tourists');
    } else if (discrepancyScore > 50) {
      indicators.push('Significant rating discrepancy - investigate further');
    }

    const touristTrapWarnings = localInsights.filter(insight => insight.touristTrapWarning);
    if (touristTrapWarnings.length > 0) {
      indicators.push(`${touristTrapWarnings.length} tourist trap warning(s) from locals`);
    }

    const highAuthenticityInsights = localInsights.filter(insight => insight.authenticityScore > 80);
    if (highAuthenticityInsights.length > 0) {
      indicators.push(`${highAuthenticityInsights.length} high-authenticity local insight(s)`);
    }

    return indicators;
  }

  // For testing purposes
  async clearAllData(): Promise<void> {
    await this.insightModel.clear();
    await this.reviewModel.clear();
  }
}