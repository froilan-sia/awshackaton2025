import { GDPRService } from '../../src/services/gdprService';
import { DataRequestType, DataRequestStatus } from '../../src/models/DataRequest';

describe('GDPRService', () => {
  let gdprService: GDPRService;

  beforeEach(() => {
    gdprService = new GDPRService();
  });

  describe('submitDataRequest', () => {
    it('should submit data export request', async () => {
      const request = await gdprService.submitDataRequest(
        'user123',
        DataRequestType.DATA_EXPORT,
        {
          dataTypes: ['personal_data', 'preferences'],
          format: 'json',
          includeMetadata: true
        }
      );

      expect(request.id).toBeDefined();
      expect(request.userId).toBe('user123');
      expect(request.requestType).toBe(DataRequestType.DATA_EXPORT);
      expect(request.status).toBe(DataRequestStatus.PENDING);
      expect(request.verificationToken).toBeDefined();
      expect(request.requestedAt).toBeInstanceOf(Date);
    });

    it('should submit data deletion request', async () => {
      const request = await gdprService.submitDataRequest(
        'user123',
        DataRequestType.DATA_DELETION,
        {
          dataTypes: ['activity_history', 'location_data'],
          reason: 'No longer using service'
        }
      );

      expect(request.requestType).toBe(DataRequestType.DATA_DELETION);
      expect(request.requestData).toEqual({
        dataTypes: ['activity_history', 'location_data'],
        reason: 'No longer using service'
      });
    });

    it('should submit data portability request', async () => {
      const request = await gdprService.submitDataRequest(
        'user123',
        DataRequestType.DATA_PORTABILITY
      );

      expect(request.requestType).toBe(DataRequestType.DATA_PORTABILITY);
      expect(request.status).toBe(DataRequestStatus.PENDING);
    });
  });

  describe('verifyDataRequest', () => {
    it('should verify request with valid token', async () => {
      const request = await gdprService.submitDataRequest(
        'user123',
        DataRequestType.DATA_EXPORT
      );

      const verified = await gdprService.verifyDataRequest(
        request.id,
        request.verificationToken!
      );

      expect(verified).toBe(true);
      
      const updatedRequest = await gdprService.getDataRequestStatus(request.id);
      expect(updatedRequest?.status).toBe(DataRequestStatus.VERIFIED);
    });

    it('should reject verification with invalid token', async () => {
      const request = await gdprService.submitDataRequest(
        'user123',
        DataRequestType.DATA_EXPORT
      );

      const verified = await gdprService.verifyDataRequest(
        request.id,
        'invalid-token'
      );

      expect(verified).toBe(false);
    });

    it('should reject verification for non-existent request', async () => {
      const verified = await gdprService.verifyDataRequest(
        'non-existent-id',
        'any-token'
      );

      expect(verified).toBe(false);
    });
  });

  describe('exportUserData', () => {
    it('should export user data in requested format', async () => {
      const exportRequest = {
        userId: 'user123',
        dataTypes: ['personal_data', 'preferences', 'activity_history'],
        format: 'json' as const,
        includeMetadata: true
      };

      const exportData = await gdprService.exportUserData('user123', exportRequest);

      expect(exportData.userId).toBe('user123');
      expect(exportData.dataTypes).toEqual(exportRequest.dataTypes);
      expect(exportData.metadata.exportFormat).toBe('json');
      expect(exportData.data.personalData).toBeDefined();
      expect(exportData.data.preferences).toBeDefined();
      expect(exportData.data.activityHistory).toBeDefined();
      expect(exportData.exportedAt).toBeInstanceOf(Date);
    });

    it('should export only requested data types', async () => {
      const exportRequest = {
        userId: 'user123',
        dataTypes: ['personal_data'],
        format: 'json' as const,
        includeMetadata: false
      };

      const exportData = await gdprService.exportUserData('user123', exportRequest);

      expect(exportData.data.personalData).toBeDefined();
      expect(exportData.data.preferences).toEqual({});
      expect(exportData.data.activityHistory).toEqual([]);
    });
  });

  describe('deleteUserData', () => {
    it('should delete allowed data types', async () => {
      const deletionRequest = {
        userId: 'user123',
        dataTypes: ['activity_history', 'location_data'],
        reason: 'User request'
      };

      const result = await gdprService.deleteUserData('user123', deletionRequest);

      expect(result.deletedDataTypes).toContain('activity_history');
      expect(result.deletedDataTypes).toContain('location_data');
      expect(result.deletionSummary).toBeDefined();
      expect(result.deletionSummary['activity_history'].status).toBe('deleted');
    });

    it('should retain legally required data', async () => {
      const deletionRequest = {
        userId: 'user123',
        dataTypes: ['consent_records', 'personal_data'],
        reason: 'User request'
      };

      const result = await gdprService.deleteUserData('user123', deletionRequest);

      expect(result.retainedDataTypes).toContain('consent_records');
      expect(result.deletedDataTypes).toContain('personal_data');
      expect(result.deletionSummary['consent_records'].status).toBe('retained');
    });

    it('should allow retention override for admin requests', async () => {
      const deletionRequest = {
        userId: 'user123',
        dataTypes: ['consent_records'],
        retentionOverride: true,
        reason: 'Admin override'
      };

      const result = await gdprService.deleteUserData('user123', deletionRequest);

      expect(result.deletedDataTypes).toContain('consent_records');
    });
  });

  describe('getUserDataRequests', () => {
    it('should return user data requests history', async () => {
      await gdprService.submitDataRequest('user123', DataRequestType.DATA_EXPORT);
      await gdprService.submitDataRequest('user123', DataRequestType.DATA_DELETION);

      const requests = await gdprService.getUserDataRequests('user123');

      expect(requests).toHaveLength(2);
      expect(requests[0].userId).toBe('user123');
      expect(requests[1].userId).toBe('user123');
      // Should be sorted by most recent first
      expect(requests[0].requestedAt.getTime()).toBeGreaterThanOrEqual(
        requests[1].requestedAt.getTime()
      );
    });

    it('should return empty array for user with no requests', async () => {
      const requests = await gdprService.getUserDataRequests('newuser');
      expect(requests).toHaveLength(0);
    });
  });

  describe('generatePortabilityReport', () => {
    it('should generate complete portability report', async () => {
      const report = await gdprService.generatePortabilityReport('user123');

      expect(report.userData).toBeDefined();
      expect(report.userData.userId).toBe('user123');
      expect(report.portabilityInfo).toBeDefined();
      expect(report.portabilityInfo.dataFormats).toContain('JSON');
      expect(report.portabilityInfo.transferMethods).toContain('Download');
      expect(report.portabilityInfo.technicalRequirements).toBeDefined();
    });
  });

  describe('checkRetentionCompliance', () => {
    it('should check data retention compliance', async () => {
      const compliance = await gdprService.checkRetentionCompliance('user123');

      expect(compliance.compliant).toBeDefined();
      expect(compliance.expiredData).toBeDefined();
      expect(compliance.upcomingExpirations).toBeDefined();
      expect(Array.isArray(compliance.expiredData)).toBe(true);
      expect(Array.isArray(compliance.upcomingExpirations)).toBe(true);
    });

    it('should identify upcoming expirations', async () => {
      const compliance = await gdprService.checkRetentionCompliance('user123');

      compliance.upcomingExpirations.forEach(expiration => {
        expect(expiration.dataType).toBeDefined();
        expect(expiration.expiresAt).toBeInstanceOf(Date);
      });
    });
  });
});