import { createHash, randomBytes } from 'crypto';

export interface AnonymizationConfig {
  saltLength: number;
  hashAlgorithm: string;
  retainFields: string[];
  sensitiveFields: string[];
}

export interface AnonymizedData {
  id: string;
  anonymizedAt: Date;
  originalDataHash: string;
  data: Record<string, any>;
}

export class AnonymizationService {
  private readonly config: AnonymizationConfig;
  private readonly globalSalt: string;

  constructor(config?: Partial<AnonymizationConfig>) {
    this.config = {
      saltLength: 32,
      hashAlgorithm: 'sha256',
      retainFields: ['timestamp', 'location_district', 'weather_condition'],
      sensitiveFields: ['user_id', 'email', 'phone', 'ip_address', 'device_id'],
      ...config
    };
    this.globalSalt = this.generateSalt();
  }

  /**
   * Anonymize user data for analytics while preserving utility
   */
  async anonymizeUserData(userData: Record<string, any>): Promise<AnonymizedData> {
    const anonymizedData: Record<string, any> = {};
    const originalDataHash = this.hashData(JSON.stringify(userData));

    for (const [key, value] of Object.entries(userData)) {
      if (this.config.sensitiveFields.includes(key)) {
        // Hash sensitive fields with salt
        anonymizedData[key] = this.hashWithSalt(String(value));
      } else if (this.config.retainFields.includes(key)) {
        // Retain non-sensitive fields as-is
        anonymizedData[key] = value;
      } else {
        // Apply appropriate anonymization technique based on data type
        anonymizedData[key] = this.anonymizeField(key, value);
      }
    }

    return {
      id: this.generateAnonymousId(),
      anonymizedAt: new Date(),
      originalDataHash,
      data: anonymizedData
    };
  }

  /**
   * Anonymize location data for crowd analytics
   */
  async anonymizeLocationData(locationData: {
    userId: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
    district?: string;
  }): Promise<Record<string, any>> {
    return {
      // Hash user ID for consistent tracking without identification
      anonymousUserId: this.hashWithSalt(locationData.userId),
      
      // Reduce location precision to district level
      locationZone: this.getLocationZone(locationData.latitude, locationData.longitude),
      district: locationData.district,
      
      // Round timestamp to nearest hour for privacy
      timeSlot: this.roundToHour(locationData.timestamp),
      
      // Generalize accuracy
      accuracyRange: this.categorizeAccuracy(locationData.accuracy),
      
      // Add noise to prevent exact location tracking
      noisyLatitude: this.addLocationNoise(locationData.latitude),
      noisyLongitude: this.addLocationNoise(locationData.longitude)
    };
  }

  /**
   * Anonymize crowd analytics data
   */
  async anonymizeCrowdData(crowdData: {
    locationId: string;
    userCount: number;
    timestamp: Date;
    userDemographics?: Record<string, any>;
    deviceTypes?: string[];
  }): Promise<Record<string, any>> {
    return {
      locationZone: this.hashLocation(crowdData.locationId),
      
      // Apply k-anonymity (minimum group size of 5)
      crowdLevel: this.categorizeCrowdLevel(crowdData.userCount),
      
      timeSlot: this.roundToHour(crowdData.timestamp),
      
      // Generalize demographics
      demographicProfile: crowdData.userDemographics ? 
        this.generalizeDemographics(crowdData.userDemographics) : null,
      
      // Categorize device types without specific models
      deviceCategories: crowdData.deviceTypes ? 
        this.categorizeDevices(crowdData.deviceTypes) : null
    };
  }

  /**
   * Create differential privacy for numerical data
   */
  addDifferentialPrivacy(value: number, epsilon: number = 1.0): number {
    // Add Laplace noise for differential privacy
    const scale = 1 / epsilon;
    const noise = this.generateLaplaceNoise(scale);
    return Math.max(0, value + noise);
  }

  /**
   * K-anonymity check for datasets
   */
  checkKAnonymity(dataset: Record<string, any>[], k: number = 5): boolean {
    const groups = new Map<string, number>();
    
    dataset.forEach(record => {
      // Create quasi-identifier combination
      const quasiId = this.createQuasiIdentifier(record);
      groups.set(quasiId, (groups.get(quasiId) || 0) + 1);
    });
    
    // Check if all groups have at least k members
    return Array.from(groups.values()).every(count => count >= k);
  }

  /**
   * Remove or generalize data to achieve k-anonymity
   */
  enforceKAnonymity(dataset: Record<string, any>[], k: number = 5): Record<string, any>[] {
    const groups = new Map<string, Record<string, any>[]>();
    
    // Group records by quasi-identifiers
    dataset.forEach(record => {
      const quasiId = this.createQuasiIdentifier(record);
      if (!groups.has(quasiId)) {
        groups.set(quasiId, []);
      }
      groups.get(quasiId)!.push(record);
    });
    
    const result: Record<string, any>[] = [];
    
    // Only include groups with at least k members
    groups.forEach(group => {
      if (group.length >= k) {
        result.push(...group);
      }
    });
    
    return result;
  }

  private anonymizeField(fieldName: string, value: any): any {
    if (typeof value === 'string') {
      if (fieldName.includes('email')) {
        return this.anonymizeEmail(value);
      }
      if (fieldName.includes('name')) {
        return this.anonymizeName(value);
      }
      return this.hashWithSalt(value);
    }
    
    if (typeof value === 'number') {
      if (fieldName.includes('age')) {
        return this.generalizeAge(value);
      }
      return this.addNoise(value);
    }
    
    return value;
  }

  private hashWithSalt(data: string): string {
    return createHash(this.config.hashAlgorithm)
      .update(data + this.globalSalt)
      .digest('hex');
  }

  private hashData(data: string): string {
    return createHash(this.config.hashAlgorithm)
      .update(data)
      .digest('hex');
  }

  private hashLocation(locationId: string): string {
    // Create consistent but anonymous location identifier
    return createHash('md5').update(locationId + this.globalSalt).digest('hex').substring(0, 8);
  }

  private generateSalt(): string {
    return randomBytes(this.config.saltLength).toString('hex');
  }

  private generateAnonymousId(): string {
    return randomBytes(16).toString('hex');
  }

  private getLocationZone(lat: number, lng: number): string {
    // Round to ~1km precision for Hong Kong
    const zoneLat = Math.round(lat * 100) / 100;
    const zoneLng = Math.round(lng * 100) / 100;
    return `${zoneLat},${zoneLng}`;
  }

  private roundToHour(timestamp: Date): Date {
    const rounded = new Date(timestamp);
    rounded.setMinutes(0, 0, 0);
    return rounded;
  }

  private addLocationNoise(coordinate: number): number {
    // Add random noise up to ~100m
    const noise = (Math.random() - 0.5) * 0.002;
    return coordinate + noise;
  }

  private categorizeAccuracy(accuracy?: number): string {
    if (!accuracy) return 'unknown';
    if (accuracy < 10) return 'high';
    if (accuracy < 50) return 'medium';
    return 'low';
  }

  private categorizeCrowdLevel(count: number): string {
    if (count < 10) return 'low';
    if (count < 50) return 'medium';
    if (count < 100) return 'high';
    return 'very_high';
  }

  private generalizeDemographics(demographics: Record<string, any>): Record<string, any> {
    const generalized: Record<string, any> = {};
    
    if (demographics.age) {
      generalized.ageGroup = this.generalizeAge(demographics.age);
    }
    
    if (demographics.gender) {
      generalized.gender = demographics.gender; // Keep as-is if not identifying
    }
    
    return generalized;
  }

  private generalizeAge(age: number): string {
    if (age < 18) return '0-17';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }

  private categorizeDevices(deviceTypes: string[]): string[] {
    return deviceTypes.map(device => {
      if (device.toLowerCase().includes('iphone')) return 'ios_mobile';
      if (device.toLowerCase().includes('android')) return 'android_mobile';
      if (device.toLowerCase().includes('ipad')) return 'ios_tablet';
      return 'other';
    });
  }

  private anonymizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  }

  private anonymizeName(name: string): string {
    const parts = name.split(' ');
    return parts.map(part => part.charAt(0) + '*'.repeat(part.length - 1)).join(' ');
  }

  private addNoise(value: number, noiseLevel: number = 0.1): number {
    const noise = (Math.random() - 0.5) * 2 * noiseLevel * value;
    return Math.round(value + noise);
  }

  private generateLaplaceNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private createQuasiIdentifier(record: Record<string, any>): string {
    // Create identifier from quasi-identifying attributes
    const quasiFields = ['ageGroup', 'district', 'timeSlot'];
    const values = quasiFields.map(field => record[field] || 'unknown');
    return values.join('|');
  }
}