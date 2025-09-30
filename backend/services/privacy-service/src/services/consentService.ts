import { ConsentRecord, ConsentType, ConsentRequest, ConsentStatus, UserConsentProfile } from '../models/ConsentRecord';
import { v4 as uuidv4 } from 'uuid';

export class ConsentService {
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private readonly CONSENT_VERSION = '1.0';
  private readonly CONSENT_EXPIRY_MONTHS = 12;

  /**
   * Record user consent for a specific data usage type
   */
  async recordConsent(request: ConsentRequest, ipAddress?: string, userAgent?: string): Promise<ConsentRecord> {
    const consentRecord: ConsentRecord = {
      id: uuidv4(),
      userId: request.userId,
      consentType: request.consentType,
      granted: request.granted,
      timestamp: new Date(),
      version: this.CONSENT_VERSION,
      ipAddress,
      userAgent,
      expiresAt: this.calculateExpiryDate(),
      metadata: request.metadata
    };

    // Store consent record
    const userConsents = this.consentRecords.get(request.userId) || [];
    userConsents.push(consentRecord);
    this.consentRecords.set(request.userId, userConsents);

    return consentRecord;
  }

  /**
   * Check if user has granted consent for a specific type
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const userConsents = this.consentRecords.get(userId) || [];
    const latestConsent = this.getLatestConsent(userConsents, consentType);
    
    if (!latestConsent) {
      return false;
    }

    // Check if consent is still valid
    if (latestConsent.expiresAt && latestConsent.expiresAt < new Date()) {
      return false;
    }

    // Check if consent was withdrawn
    if (latestConsent.withdrawnAt) {
      return false;
    }

    return latestConsent.granted;
  }

  /**
   * Withdraw consent for a specific type
   */
  async withdrawConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const userConsents = this.consentRecords.get(userId) || [];
    const latestConsent = this.getLatestConsent(userConsents, consentType);
    
    if (!latestConsent || !latestConsent.granted) {
      return false;
    }

    // Mark consent as withdrawn
    latestConsent.withdrawnAt = new Date();
    
    return true;
  }

  /**
   * Get user's complete consent profile
   */
  async getUserConsentProfile(userId: string): Promise<UserConsentProfile> {
    const userConsents = this.consentRecords.get(userId) || [];
    const consentsByType = new Map<ConsentType, ConsentRecord>();

    // Get latest consent for each type
    userConsents.forEach(consent => {
      const existing = consentsByType.get(consent.consentType);
      if (!existing || consent.timestamp > existing.timestamp) {
        consentsByType.set(consent.consentType, consent);
      }
    });

    const consents: ConsentStatus[] = Array.from(consentsByType.values()).map(consent => ({
      consentType: consent.consentType,
      granted: consent.granted && !consent.withdrawnAt && (!consent.expiresAt || consent.expiresAt > new Date()),
      timestamp: consent.timestamp,
      version: consent.version,
      expiresAt: consent.expiresAt
    }));

    return {
      userId,
      consents,
      lastUpdated: userConsents.length > 0 ? 
        new Date(Math.max(...userConsents.map(c => c.timestamp.getTime()))) : 
        new Date(),
      gdprCompliant: this.isGDPRCompliant(consents)
    };
  }

  /**
   * Update multiple consents at once
   */
  async updateConsents(userId: string, requests: ConsentRequest[], ipAddress?: string, userAgent?: string): Promise<ConsentRecord[]> {
    const results: ConsentRecord[] = [];
    
    for (const request of requests) {
      const consent = await this.recordConsent(request, ipAddress, userAgent);
      results.push(consent);
    }
    
    return results;
  }

  /**
   * Get consent history for audit purposes
   */
  async getConsentHistory(userId: string, consentType?: ConsentType): Promise<ConsentRecord[]> {
    const userConsents = this.consentRecords.get(userId) || [];
    
    if (consentType) {
      return userConsents.filter(consent => consent.consentType === consentType);
    }
    
    return userConsents;
  }

  /**
   * Check if consents need renewal
   */
  async getExpiredConsents(userId: string): Promise<ConsentType[]> {
    const userConsents = this.consentRecords.get(userId) || [];
    const expiredTypes: ConsentType[] = [];
    const now = new Date();

    Object.values(ConsentType).forEach(type => {
      const latestConsent = this.getLatestConsent(userConsents, type);
      if (latestConsent && latestConsent.expiresAt && latestConsent.expiresAt < now) {
        expiredTypes.push(type);
      }
    });

    return expiredTypes;
  }

  private getLatestConsent(consents: ConsentRecord[], type: ConsentType): ConsentRecord | null {
    const typeConsents = consents.filter(c => c.consentType === type);
    if (typeConsents.length === 0) return null;
    
    return typeConsents.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  private calculateExpiryDate(): Date {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + this.CONSENT_EXPIRY_MONTHS);
    return expiry;
  }

  private isGDPRCompliant(consents: ConsentStatus[]): boolean {
    // Check if user has made explicit choices for key consent types
    const requiredTypes = [ConsentType.DATA_ANALYTICS, ConsentType.LOCATION_TRACKING];
    return requiredTypes.every(type => 
      consents.some(consent => consent.consentType === type)
    );
  }
}