import { SustainabilityScore, LocalBusiness, BusinessType } from '../types/sustainability';
import { LocalBusinessModel } from '../models/LocalBusiness';

export class SustainabilityScoringService {
  private scores: Map<string, SustainabilityScore> = new Map();

  async calculateBusinessScore(business: LocalBusiness): Promise<SustainabilityScore> {
    const localOwnershipScore = this.calculateLocalOwnershipScore(business);
    const environmentalScore = this.calculateEnvironmentalScore(business);
    const communityImpactScore = this.calculateCommunityImpactScore(business);
    const culturalPreservationScore = this.calculateCulturalPreservationScore(business);

    const overallScore = Math.round(
      (localOwnershipScore * 0.3) +
      (environmentalScore * 0.25) +
      (communityImpactScore * 0.25) +
      (culturalPreservationScore * 0.2)
    );

    const score: SustainabilityScore = {
      businessId: business.id,
      overallScore,
      localOwnershipScore,
      environmentalScore,
      communityImpactScore,
      culturalPreservationScore,
      lastUpdated: new Date()
    };

    this.scores.set(business.id, score);
    return score;
  }

  private calculateLocalOwnershipScore(business: LocalBusiness): number {
    let score = 0;

    // Local ownership is the primary factor
    if (business.localOwnership) {
      score += 70;
    } else {
      score += 20; // Some points for operating locally even if not locally owned
    }

    // Employee count indicates local job creation
    score += Math.min(business.employeesCount * 2, 30);

    return Math.min(score, 100);
  }

  private calculateEnvironmentalScore(business: LocalBusiness): number {
    let score = 40; // Base score for existing businesses

    // Certifications bonus
    const envCertifications = business.certifications.filter(cert =>
      cert.toLowerCase().includes('green') ||
      cert.toLowerCase().includes('eco') ||
      cert.toLowerCase().includes('sustainable') ||
      cert.toLowerCase().includes('organic')
    );
    score += envCertifications.length * 15;

    // Business type environmental impact
    const lowImpactTypes = [BusinessType.CULTURAL_SITE, BusinessType.TOUR_OPERATOR];
    const mediumImpactTypes = [BusinessType.RESTAURANT, BusinessType.SHOP];
    
    if (lowImpactTypes.includes(business.type)) {
      score += 20;
    } else if (mediumImpactTypes.includes(business.type)) {
      score += 10;
    }

    // Location bonus for less touristy areas (reduces overtourism)
    const sustainableDistricts = ['Yau Ma Tei', 'Sham Shui Po', 'Wan Chai', 'Sheung Wan'];
    if (sustainableDistricts.includes(business.location.district)) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private calculateCommunityImpactScore(business: LocalBusiness): number {
    let score = 30; // Base score

    // Local ownership strongly indicates community benefit
    if (business.localOwnership) {
      score += 40;
    }

    // Employee count indicates community employment
    score += Math.min(business.employeesCount * 3, 30);

    // Community-focused certifications
    const communityCertifications = business.certifications.filter(cert =>
      cert.toLowerCase().includes('community') ||
      cert.toLowerCase().includes('local') ||
      cert.toLowerCase().includes('heritage') ||
      cert.toLowerCase().includes('traditional')
    );
    score += communityCertifications.length * 10;

    return Math.min(score, 100);
  }

  private calculateCulturalPreservationScore(business: LocalBusiness): number {
    let score = 20; // Base score

    // Cultural and heritage certifications
    const culturalCertifications = business.certifications.filter(cert =>
      cert.toLowerCase().includes('heritage') ||
      cert.toLowerCase().includes('traditional') ||
      cert.toLowerCase().includes('cultural') ||
      cert.toLowerCase().includes('authentic')
    );
    score += culturalCertifications.length * 20;

    // Business types that preserve culture
    const culturalTypes = [BusinessType.CULTURAL_SITE, BusinessType.RESTAURANT];
    if (culturalTypes.includes(business.type)) {
      score += 30;
    }

    // Traditional districts bonus
    const culturalDistricts = ['Central', 'Sheung Wan', 'Yau Ma Tei', 'Mong Kok'];
    if (culturalDistricts.includes(business.location.district)) {
      score += 20;
    }

    // Local ownership preserves authentic practices
    if (business.localOwnership) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  async getBusinessScore(businessId: string): Promise<SustainabilityScore | null> {
    return this.scores.get(businessId) || null;
  }

  async updateBusinessScore(business: LocalBusiness): Promise<SustainabilityScore> {
    return await this.calculateBusinessScore(business);
  }

  async getTopSustainableBusinesses(limit: number = 10, district?: string): Promise<SustainabilityScore[]> {
    let scores = Array.from(this.scores.values());

    // Filter by district if specified
    if (district) {
      // This would require business data - simplified for now
      scores = scores.filter(score => {
        // In a real implementation, we'd join with business data
        return true;
      });
    }

    return scores
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  async getBenchmarkScores(): Promise<{
    averageOverallScore: number;
    averageLocalOwnershipScore: number;
    averageEnvironmentalScore: number;
    averageCommunityImpactScore: number;
    averageCulturalPreservationScore: number;
  }> {
    const scores = Array.from(this.scores.values());
    
    if (scores.length === 0) {
      return {
        averageOverallScore: 0,
        averageLocalOwnershipScore: 0,
        averageEnvironmentalScore: 0,
        averageCommunityImpactScore: 0,
        averageCulturalPreservationScore: 0
      };
    }

    const totals = scores.reduce((acc, score) => ({
      overallScore: acc.overallScore + score.overallScore,
      localOwnershipScore: acc.localOwnershipScore + score.localOwnershipScore,
      environmentalScore: acc.environmentalScore + score.environmentalScore,
      communityImpactScore: acc.communityImpactScore + score.communityImpactScore,
      culturalPreservationScore: acc.culturalPreservationScore + score.culturalPreservationScore
    }), {
      overallScore: 0,
      localOwnershipScore: 0,
      environmentalScore: 0,
      communityImpactScore: 0,
      culturalPreservationScore: 0
    });

    const count = scores.length;
    return {
      averageOverallScore: Math.round(totals.overallScore / count),
      averageLocalOwnershipScore: Math.round(totals.localOwnershipScore / count),
      averageEnvironmentalScore: Math.round(totals.environmentalScore / count),
      averageCommunityImpactScore: Math.round(totals.communityImpactScore / count),
      averageCulturalPreservationScore: Math.round(totals.culturalPreservationScore / count)
    };
  }
}