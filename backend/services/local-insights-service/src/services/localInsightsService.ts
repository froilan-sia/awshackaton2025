import { LocalInsight, InsightFilter, InsightCategory } from '../types/localInsights';
import { LocalInsightModel } from '../models/LocalInsight';
import { LocalResidentModel } from '../models/LocalResident';

export class LocalInsightsService {
  private insightModel: LocalInsightModel;
  private residentModel: LocalResidentModel;

  constructor(residentModel?: LocalResidentModel) {
    this.insightModel = new LocalInsightModel();
    this.residentModel = residentModel || new LocalResidentModel();
  }

  async createInsight(insightData: {
    authorId: string;
    locationId: string;
    locationType: 'attraction' | 'restaurant' | 'district' | 'activity';
    title: string;
    content: string;
    category: InsightCategory;
    tags: string[];
    localRating: number;
    touristTrapWarning?: boolean;
    bestTimeToVisit?: string;
    localTips: string[];
    culturalContext?: string;
    language: string;
  }): Promise<LocalInsight> {
    // Verify author is a verified local resident
    const resident = await this.residentModel.findByUserId(insightData.authorId);
    if (!resident || resident.verificationStatus !== 'verified') {
      throw new Error('Only verified local residents can create insights');
    }

    // Validate input data
    if (insightData.localRating < 1 || insightData.localRating > 5) {
      throw new Error('Local rating must be between 1 and 5');
    }

    if (insightData.content.length < 50) {
      throw new Error('Insight content must be at least 50 characters long');
    }

    // Calculate initial authenticity score based on author credibility
    const authenticityScore = this.calculateAuthenticityScore(resident, insightData);

    const newInsight = await this.insightModel.create({
      authorId: insightData.authorId,
      locationId: insightData.locationId,
      locationType: insightData.locationType,
      title: insightData.title,
      content: insightData.content,
      category: insightData.category,
      tags: insightData.tags,
      authenticityScore,
      localRating: insightData.localRating,
      touristTrapWarning: insightData.touristTrapWarning || false,
      bestTimeToVisit: insightData.bestTimeToVisit,
      localTips: insightData.localTips,
      culturalContext: insightData.culturalContext,
      language: insightData.language,
      upvotes: 0,
      downvotes: 0,
      reportCount: 0,
      status: 'active'
    });

    return newInsight;
  }

  async getInsightById(insightId: string): Promise<LocalInsight> {
    const insight = await this.insightModel.findById(insightId);
    if (!insight) {
      throw new Error('Insight not found');
    }
    return insight;
  }

  async getInsightsByLocation(locationId: string): Promise<LocalInsight[]> {
    return await this.insightModel.findByLocationId(locationId);
  }

  async getInsightsWithFilters(filters: InsightFilter): Promise<LocalInsight[]> {
    return await this.insightModel.findWithFilters(filters);
  }

  async getTopRatedInsights(limit: number = 10): Promise<LocalInsight[]> {
    return await this.insightModel.findTopRated(limit);
  }

  async getHighAuthenticityInsights(minScore: number = 80): Promise<LocalInsight[]> {
    return await this.insightModel.findByAuthenticityScore(minScore);
  }

  async getTouristTrapWarnings(): Promise<LocalInsight[]> {
    return await this.insightModel.findTouristTrapWarnings();
  }

  async upvoteInsight(insightId: string, userId: string): Promise<LocalInsight> {
    const insight = await this.insightModel.findById(insightId);
    if (!insight) {
      throw new Error('Insight not found');
    }

    if (insight.authorId === userId) {
      throw new Error('Cannot vote on your own insight');
    }

    const updatedInsight = await this.insightModel.upvote(insightId);
    if (!updatedInsight) {
      throw new Error('Failed to upvote insight');
    }

    // Increase author's credibility score slightly
    const resident = await this.residentModel.findByUserId(insight.authorId);
    if (resident) {
      await this.residentModel.updateCredibilityScore(
        resident.id, 
        resident.credibilityScore + 0.1
      );
    }

    return updatedInsight;
  }

  async downvoteInsight(insightId: string, userId: string): Promise<LocalInsight> {
    const insight = await this.insightModel.findById(insightId);
    if (!insight) {
      throw new Error('Insight not found');
    }

    if (insight.authorId === userId) {
      throw new Error('Cannot vote on your own insight');
    }

    const updatedInsight = await this.insightModel.downvote(insightId);
    if (!updatedInsight) {
      throw new Error('Failed to downvote insight');
    }

    // Decrease author's credibility score slightly
    const resident = await this.residentModel.findByUserId(insight.authorId);
    if (resident) {
      await this.residentModel.updateCredibilityScore(
        resident.id, 
        Math.max(0, resident.credibilityScore - 0.2)
      );
    }

    return updatedInsight;
  }

  async reportInsight(insightId: string, userId: string, reason: string): Promise<LocalInsight> {
    const insight = await this.insightModel.findById(insightId);
    if (!insight) {
      throw new Error('Insight not found');
    }

    const updatedInsight = await this.insightModel.report(insightId);
    if (!updatedInsight) {
      throw new Error('Failed to report insight');
    }

    // If insight gets flagged, decrease author's credibility
    if (updatedInsight.status === 'flagged') {
      const resident = await this.residentModel.findByUserId(insight.authorId);
      if (resident) {
        await this.residentModel.updateCredibilityScore(
          resident.id, 
          Math.max(0, resident.credibilityScore - 5)
        );
      }
    }

    return updatedInsight;
  }

  async updateInsight(
    insightId: string, 
    userId: string, 
    updates: Partial<Pick<LocalInsight, 'title' | 'content' | 'tags' | 'localTips' | 'culturalContext'>>
  ): Promise<LocalInsight> {
    const insight = await this.insightModel.findById(insightId);
    if (!insight) {
      throw new Error('Insight not found');
    }

    if (insight.authorId !== userId) {
      throw new Error('Only the author can update this insight');
    }

    const updatedInsight = await this.insightModel.update(insightId, updates);
    if (!updatedInsight) {
      throw new Error('Failed to update insight');
    }

    return updatedInsight;
  }

  async deleteInsight(insightId: string, userId: string): Promise<boolean> {
    const insight = await this.insightModel.findById(insightId);
    if (!insight) {
      throw new Error('Insight not found');
    }

    if (insight.authorId !== userId) {
      throw new Error('Only the author can delete this insight');
    }

    return await this.insightModel.delete(insightId);
  }

  async getInsightsByAuthor(authorId: string): Promise<LocalInsight[]> {
    return await this.insightModel.findByAuthorId(authorId);
  }

  async getFlaggedInsights(): Promise<LocalInsight[]> {
    return await this.insightModel.getFlaggedContent();
  }

  async moderateInsight(insightId: string, action: 'approve' | 'remove'): Promise<LocalInsight> {
    const insight = await this.insightModel.findById(insightId);
    if (!insight) {
      throw new Error('Insight not found');
    }

    let updatedInsight: LocalInsight | null;
    
    if (action === 'approve') {
      updatedInsight = await this.insightModel.restoreContent(insightId);
    } else {
      updatedInsight = await this.insightModel.removeContent(insightId);
      
      // Significantly decrease author's credibility for removed content
      const resident = await this.residentModel.findByUserId(insight.authorId);
      if (resident) {
        await this.residentModel.updateCredibilityScore(
          resident.id, 
          Math.max(0, resident.credibilityScore - 10)
        );
      }
    }

    if (!updatedInsight) {
      throw new Error('Failed to moderate insight');
    }

    return updatedInsight;
  }

  private calculateAuthenticityScore(resident: any, insightData: any): number {
    let score = 50; // Base score

    // Author credibility (max 30 points)
    score += (resident.credibilityScore / 100) * 30;

    // Years in Hong Kong (max 10 points)
    score += Math.min(10, resident.yearsInHongKong * 1);

    // Relevant specialty (max 10 points)
    const relevantSpecialties = ['food', 'culture', 'history', 'local_life'];
    if (resident.specialties.some((s: string) => relevantSpecialties.includes(s))) {
      score += 10;
    }

    // Content quality indicators (max 10 points)
    if (insightData.content.length > 200) score += 3;
    if (insightData.localTips.length > 2) score += 3;
    if (insightData.culturalContext) score += 4;

    return Math.min(100, Math.max(0, score));
  }

  // For testing purposes
  async clearAllInsights(): Promise<void> {
    await this.insightModel.clear();
  }
}