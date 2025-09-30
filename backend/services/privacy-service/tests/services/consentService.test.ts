import { ConsentService } from '../../src/services/consentService';
import { ConsentType, ConsentRequest } from '../../src/models/ConsentRecord';

describe('ConsentService', () => {
  let consentService: ConsentService;

  beforeEach(() => {
    consentService = new ConsentService();
  });

  describe('recordConsent', () => {
    it('should record user consent successfully', async () => {
      const request: ConsentRequest = {
        userId: 'user123',
        consentType: ConsentType.LOCATION_TRACKING,
        granted: true,
        metadata: { source: 'mobile_app' }
      };

      const result = await consentService.recordConsent(request, '192.168.1.1', 'TestAgent');

      expect(result.id).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.consentType).toBe(ConsentType.LOCATION_TRACKING);
      expect(result.granted).toBe(true);
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('TestAgent');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should record consent withdrawal', async () => {
      const request: ConsentRequest = {
        userId: 'user123',
        consentType: ConsentType.DATA_ANALYTICS,
        granted: false
      };

      const result = await consentService.recordConsent(request);

      expect(result.granted).toBe(false);
      expect(result.consentType).toBe(ConsentType.DATA_ANALYTICS);
    });
  });

  describe('hasConsent', () => {
    it('should return true for granted consent', async () => {
      const request: ConsentRequest = {
        userId: 'user123',
        consentType: ConsentType.PERSONALIZATION,
        granted: true
      };

      await consentService.recordConsent(request);
      const hasConsent = await consentService.hasConsent('user123', ConsentType.PERSONALIZATION);

      expect(hasConsent).toBe(true);
    });

    it('should return false for denied consent', async () => {
      const request: ConsentRequest = {
        userId: 'user123',
        consentType: ConsentType.MARKETING,
        granted: false
      };

      await consentService.recordConsent(request);
      const hasConsent = await consentService.hasConsent('user123', ConsentType.MARKETING);

      expect(hasConsent).toBe(false);
    });

    it('should return false for non-existent consent', async () => {
      const hasConsent = await consentService.hasConsent('user123', ConsentType.COOKIES);
      expect(hasConsent).toBe(false);
    });

    it('should return false for withdrawn consent', async () => {
      const request: ConsentRequest = {
        userId: 'user123',
        consentType: ConsentType.PUSH_NOTIFICATIONS,
        granted: true
      };

      await consentService.recordConsent(request);
      await consentService.withdrawConsent('user123', ConsentType.PUSH_NOTIFICATIONS);
      
      const hasConsent = await consentService.hasConsent('user123', ConsentType.PUSH_NOTIFICATIONS);
      expect(hasConsent).toBe(false);
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw existing consent', async () => {
      const request: ConsentRequest = {
        userId: 'user123',
        consentType: ConsentType.THIRD_PARTY_SHARING,
        granted: true
      };

      await consentService.recordConsent(request);
      const withdrawn = await consentService.withdrawConsent('user123', ConsentType.THIRD_PARTY_SHARING);

      expect(withdrawn).toBe(true);
      
      const hasConsent = await consentService.hasConsent('user123', ConsentType.THIRD_PARTY_SHARING);
      expect(hasConsent).toBe(false);
    });

    it('should return false for non-existent consent', async () => {
      const withdrawn = await consentService.withdrawConsent('user123', ConsentType.LOCATION_TRACKING);
      expect(withdrawn).toBe(false);
    });
  });

  describe('getUserConsentProfile', () => {
    it('should return complete consent profile', async () => {
      const requests: ConsentRequest[] = [
        {
          userId: 'user123',
          consentType: ConsentType.LOCATION_TRACKING,
          granted: true
        },
        {
          userId: 'user123',
          consentType: ConsentType.DATA_ANALYTICS,
          granted: false
        }
      ];

      for (const request of requests) {
        await consentService.recordConsent(request);
      }

      const profile = await consentService.getUserConsentProfile('user123');

      expect(profile.userId).toBe('user123');
      expect(profile.consents).toHaveLength(2);
      expect(profile.lastUpdated).toBeInstanceOf(Date);
      expect(profile.gdprCompliant).toBe(true);
    });

    it('should handle empty consent profile', async () => {
      const profile = await consentService.getUserConsentProfile('newuser');

      expect(profile.userId).toBe('newuser');
      expect(profile.consents).toHaveLength(0);
      expect(profile.gdprCompliant).toBe(false);
    });
  });

  describe('updateConsents', () => {
    it('should update multiple consents at once', async () => {
      const requests: ConsentRequest[] = [
        {
          userId: 'user123',
          consentType: ConsentType.LOCATION_TRACKING,
          granted: true
        },
        {
          userId: 'user123',
          consentType: ConsentType.PERSONALIZATION,
          granted: true
        },
        {
          userId: 'user123',
          consentType: ConsentType.MARKETING,
          granted: false
        }
      ];

      const results = await consentService.updateConsents('user123', requests);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.userId === 'user123')).toBe(true);
      
      const hasLocation = await consentService.hasConsent('user123', ConsentType.LOCATION_TRACKING);
      const hasPersonalization = await consentService.hasConsent('user123', ConsentType.PERSONALIZATION);
      const hasMarketing = await consentService.hasConsent('user123', ConsentType.MARKETING);

      expect(hasLocation).toBe(true);
      expect(hasPersonalization).toBe(true);
      expect(hasMarketing).toBe(false);
    });
  });

  describe('getConsentHistory', () => {
    it('should return consent history for user', async () => {
      const request: ConsentRequest = {
        userId: 'user123',
        consentType: ConsentType.COOKIES,
        granted: true
      };

      await consentService.recordConsent(request);
      
      // Update consent
      request.granted = false;
      await consentService.recordConsent(request);

      const history = await consentService.getConsentHistory('user123');
      expect(history).toHaveLength(2);
      expect(history[0].consentType).toBe(ConsentType.COOKIES);
      expect(history[1].consentType).toBe(ConsentType.COOKIES);
    });

    it('should filter history by consent type', async () => {
      const requests: ConsentRequest[] = [
        {
          userId: 'user123',
          consentType: ConsentType.LOCATION_TRACKING,
          granted: true
        },
        {
          userId: 'user123',
          consentType: ConsentType.DATA_ANALYTICS,
          granted: true
        }
      ];

      for (const request of requests) {
        await consentService.recordConsent(request);
      }

      const locationHistory = await consentService.getConsentHistory('user123', ConsentType.LOCATION_TRACKING);
      expect(locationHistory).toHaveLength(1);
      expect(locationHistory[0].consentType).toBe(ConsentType.LOCATION_TRACKING);
    });
  });
});