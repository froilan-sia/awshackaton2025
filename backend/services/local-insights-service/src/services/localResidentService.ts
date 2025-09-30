import { LocalResident } from '../types/localInsights';
import { LocalResidentModel } from '../models/LocalResident';

export class LocalResidentService {
  private residentModel: LocalResidentModel;

  constructor() {
    this.residentModel = new LocalResidentModel();
  }

  async registerResident(residentData: {
    userId: string;
    verificationProof: string[];
    yearsInHongKong: number;
    districts: string[];
    languages: string[];
    specialties: string[];
  }): Promise<LocalResident> {
    // Validate input data
    if (residentData.yearsInHongKong < 1) {
      throw new Error('Must have lived in Hong Kong for at least 1 year');
    }

    if (residentData.districts.length === 0) {
      throw new Error('Must specify at least one district');
    }

    if (residentData.verificationProof.length === 0) {
      throw new Error('Must provide verification proof');
    }

    // Check if user is already registered
    const existingResident = await this.residentModel.findByUserId(residentData.userId);
    if (existingResident) {
      throw new Error('User is already registered as a local resident');
    }

    // Create new resident with initial credibility score
    const newResident = await this.residentModel.create({
      userId: residentData.userId,
      verificationStatus: 'pending',
      verificationProof: residentData.verificationProof,
      yearsInHongKong: residentData.yearsInHongKong,
      districts: residentData.districts,
      languages: residentData.languages,
      specialties: residentData.specialties,
      credibilityScore: this.calculateInitialCredibilityScore(residentData)
    });

    return newResident;
  }

  async verifyResident(residentId: string, status: 'verified' | 'rejected'): Promise<LocalResident> {
    const resident = await this.residentModel.findById(residentId);
    if (!resident) {
      throw new Error('Resident not found');
    }

    if (resident.verificationStatus !== 'pending') {
      throw new Error('Resident verification status is not pending');
    }

    const updatedResident = await this.residentModel.updateVerificationStatus(residentId, status);
    if (!updatedResident) {
      throw new Error('Failed to update verification status');
    }

    return updatedResident;
  }

  async getResidentProfile(residentId: string): Promise<LocalResident> {
    const resident = await this.residentModel.findById(residentId);
    if (!resident) {
      throw new Error('Resident not found');
    }
    return resident;
  }

  async getResidentByUserId(userId: string): Promise<LocalResident | null> {
    return await this.residentModel.findByUserId(userId);
  }

  async updateResidentProfile(
    residentId: string, 
    updates: Partial<Pick<LocalResident, 'districts' | 'languages' | 'specialties'>>
  ): Promise<LocalResident> {
    const resident = await this.residentModel.findById(residentId);
    if (!resident) {
      throw new Error('Resident not found');
    }

    const updatedResident = await this.residentModel.update(residentId, updates);
    if (!updatedResident) {
      throw new Error('Failed to update resident profile');
    }

    return updatedResident;
  }

  async adjustCredibilityScore(residentId: string, adjustment: number): Promise<LocalResident> {
    const resident = await this.residentModel.findById(residentId);
    if (!resident) {
      throw new Error('Resident not found');
    }

    const newScore = Math.max(0, Math.min(100, resident.credibilityScore + adjustment));
    const updatedResident = await this.residentModel.updateCredibilityScore(residentId, newScore);
    
    if (!updatedResident) {
      throw new Error('Failed to update credibility score');
    }

    return updatedResident;
  }

  async getVerifiedResidents(): Promise<LocalResident[]> {
    return await this.residentModel.findVerifiedResidents();
  }

  async getResidentsByDistrict(district: string): Promise<LocalResident[]> {
    return await this.residentModel.findByDistrict(district);
  }

  async getResidentsBySpecialty(specialty: string): Promise<LocalResident[]> {
    return await this.residentModel.findBySpecialty(specialty);
  }

  async getPendingVerifications(): Promise<LocalResident[]> {
    return await this.residentModel.getPendingVerifications();
  }

  async getResidentStats(residentId: string): Promise<{
    totalInsights: number;
    averageAuthenticityScore: number;
    totalUpvotes: number;
    credibilityScore: number;
  }> {
    const resident = await this.residentModel.findById(residentId);
    if (!resident) {
      throw new Error('Resident not found');
    }

    // This would typically query the insights database
    // For now, returning mock data structure
    return {
      totalInsights: 0,
      averageAuthenticityScore: 0,
      totalUpvotes: 0,
      credibilityScore: resident.credibilityScore
    };
  }

  private calculateInitialCredibilityScore(residentData: {
    yearsInHongKong: number;
    districts: string[];
    languages: string[];
    specialties: string[];
  }): number {
    let score = 50; // Base score

    // Years in Hong Kong (max 20 points)
    score += Math.min(20, residentData.yearsInHongKong * 2);

    // Number of districts known (max 10 points)
    score += Math.min(10, residentData.districts.length * 2);

    // Language diversity (max 10 points)
    score += Math.min(10, residentData.languages.length * 3);

    // Specialties (max 10 points)
    score += Math.min(10, residentData.specialties.length * 2);

    return Math.min(100, score);
  }

  // For testing purposes
  async clearAllResidents(): Promise<void> {
    await this.residentModel.clear();
  }
}