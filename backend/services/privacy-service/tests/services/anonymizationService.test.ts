import { AnonymizationService } from '../../src/services/anonymizationService';

describe('AnonymizationService', () => {
  let anonymizationService: AnonymizationService;

  beforeEach(() => {
    anonymizationService = new AnonymizationService();
  });

  describe('anonymizeUserData', () => {
    it('should anonymize sensitive user data', async () => {
      const userData = {
        user_id: 'user123',
        email: 'john.doe@example.com',
        phone: '+852-1234-5678',
        name: 'John Doe',
        age: 25,
        timestamp: new Date(),
        location_district: 'Central'
      };

      const result = await anonymizationService.anonymizeUserData(userData);

      expect(result.id).toBeDefined();
      expect(result.anonymizedAt).toBeInstanceOf(Date);
      expect(result.originalDataHash).toBeDefined();
      
      // Sensitive fields should be hashed
      expect(result.data.user_id).not.toBe('user123');
      expect(result.data.email).not.toBe('john.doe@example.com');
      expect(result.data.phone).not.toBe('+852-1234-5678');
      
      // Retained fields should be preserved
      expect(result.data.location_district).toBe('Central');
      expect(result.data.timestamp).toEqual(userData.timestamp);
      
      // Age should be generalized
      expect(result.data.age).toBe('25-34');
    });

    it('should handle empty user data', async () => {
      const userData = {};
      const result = await anonymizationService.anonymizeUserData(userData);

      expect(result.id).toBeDefined();
      expect(result.data).toEqual({});
    });
  });

  describe('anonymizeLocationData', () => {
    it('should anonymize location data for crowd analytics', async () => {
      const locationData = {
        userId: 'user123',
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date('2023-07-15T14:30:00Z'),
        accuracy: 5,
        district: 'Central'
      };

      const result = await anonymizationService.anonymizeLocationData(locationData);

      expect(result.anonymousUserId).toBeDefined();
      expect(result.anonymousUserId).not.toBe('user123');
      expect(result.locationZone).toBeDefined();
      expect(result.district).toBe('Central');
      expect(result.timeSlot).toEqual(new Date('2023-07-15T14:00:00Z'));
      expect(result.accuracyRange).toBe('high');
      expect(result.noisyLatitude).not.toBe(22.3193);
      expect(result.noisyLongitude).not.toBe(114.1694);
    });

    it('should categorize accuracy correctly', async () => {
      const highAccuracy = {
        userId: 'user1',
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date(),
        accuracy: 5
      };

      const mediumAccuracy = {
        userId: 'user2',
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date(),
        accuracy: 25
      };

      const lowAccuracy = {
        userId: 'user3',
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date(),
        accuracy: 100
      };

      const highResult = await anonymizationService.anonymizeLocationData(highAccuracy);
      const mediumResult = await anonymizationService.anonymizeLocationData(mediumAccuracy);
      const lowResult = await anonymizationService.anonymizeLocationData(lowAccuracy);

      expect(highResult.accuracyRange).toBe('high');
      expect(mediumResult.accuracyRange).toBe('medium');
      expect(lowResult.accuracyRange).toBe('low');
    });
  });

  describe('anonymizeCrowdData', () => {
    it('should anonymize crowd analytics data', async () => {
      const crowdData = {
        locationId: 'location123',
        userCount: 75,
        timestamp: new Date('2023-07-15T14:30:00Z'),
        userDemographics: {
          age: 28,
          gender: 'male'
        },
        deviceTypes: ['iPhone 14', 'android phone', 'iPad Pro']
      };

      const result = await anonymizationService.anonymizeCrowdData(crowdData);

      expect(result.locationZone).toBeDefined();
      expect(result.locationZone).not.toBe('location123');
      expect(result.crowdLevel).toBe('high');
      expect(result.timeSlot).toEqual(new Date('2023-07-15T14:00:00Z'));
      expect(result.demographicProfile.ageGroup).toBe('25-34');
      expect(result.demographicProfile.gender).toBe('male');
      expect(result.deviceCategories).toContain('ios_mobile');
      expect(result.deviceCategories).toContain('android_mobile');
      expect(result.deviceCategories).toContain('ios_tablet');
    });

    it('should categorize crowd levels correctly', async () => {
      const testCases = [
        { userCount: 5, expected: 'low' },
        { userCount: 25, expected: 'medium' },
        { userCount: 75, expected: 'high' },
        { userCount: 150, expected: 'very_high' }
      ];

      for (const testCase of testCases) {
        const crowdData = {
          locationId: 'location123',
          userCount: testCase.userCount,
          timestamp: new Date()
        };

        const result = await anonymizationService.anonymizeCrowdData(crowdData);
        expect(result.crowdLevel).toBe(testCase.expected);
      }
    });
  });

  describe('addDifferentialPrivacy', () => {
    it('should add noise to numerical values', () => {
      const originalValue = 100;
      const noisyValue = anonymizationService.addDifferentialPrivacy(originalValue, 1.0);

      expect(noisyValue).toBeGreaterThanOrEqual(0);
      expect(noisyValue).not.toBe(originalValue);
    });

    it('should preserve non-negative values', () => {
      const originalValue = 5;
      const noisyValue = anonymizationService.addDifferentialPrivacy(originalValue, 0.5);

      expect(noisyValue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkKAnonymity', () => {
    it('should return true for k-anonymous dataset', () => {
      const dataset = [
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' }
      ];

      const isKAnonymous = anonymizationService.checkKAnonymity(dataset, 5);
      expect(isKAnonymous).toBe(true);
    });

    it('should return false for non-k-anonymous dataset', () => {
      const dataset = [
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' }
      ];

      const isKAnonymous = anonymizationService.checkKAnonymity(dataset, 5);
      expect(isKAnonymous).toBe(false);
    });
  });

  describe('enforceKAnonymity', () => {
    it('should remove groups smaller than k', () => {
      const dataset = [
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' }
      ];

      const kAnonymousDataset = anonymizationService.enforceKAnonymity(dataset, 5);
      
      expect(kAnonymousDataset).toHaveLength(5);
      expect(kAnonymousDataset.every(record => record.ageGroup === '25-34')).toBe(true);
    });

    it('should preserve groups with k or more members', () => {
      const dataset = [
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '25-34', district: 'Central', timeSlot: '14:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' },
        { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00' }
      ];

      const kAnonymousDataset = anonymizationService.enforceKAnonymity(dataset, 5);
      
      expect(kAnonymousDataset).toHaveLength(10);
      expect(anonymizationService.checkKAnonymity(kAnonymousDataset, 5)).toBe(true);
    });
  });
});