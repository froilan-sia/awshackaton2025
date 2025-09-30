import { DataRequest, DataRequestType, DataRequestStatus, DataExportRequest, DataDeletionRequest } from '../models/DataRequest';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';

export interface GDPRDataExport {
  userId: string;
  exportedAt: Date;
  dataTypes: string[];
  data: {
    personalData: Record<string, any>;
    preferences: Record<string, any>;
    activityHistory: Record<string, any>[];
    consentHistory: Record<string, any>[];
    locationData: Record<string, any>[];
  };
  metadata: {
    exportFormat: string;
    dataVersion: string;
    retentionPeriods: Record<string, string>;
  };
}

export class GDPRService {
  private dataRequests: Map<string, DataRequest> = new Map();
  private readonly VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly DATA_RETENTION_PERIODS = {
    'user_profile': '7 years',
    'location_data': '2 years',
    'preferences': '5 years',
    'consent_records': '7 years',
    'activity_logs': '3 years',
    'analytics_data': '2 years'
  };

  /**
   * Submit a GDPR data request
   */
  async submitDataRequest(
    userId: string, 
    requestType: DataRequestType, 
    requestData?: Record<string, any>
  ): Promise<DataRequest> {
    const request: DataRequest = {
      id: uuidv4(),
      userId,
      requestType,
      status: DataRequestStatus.PENDING,
      requestedAt: new Date(),
      requestData,
      verificationToken: this.generateVerificationToken()
    };

    this.dataRequests.set(request.id, request);

    // Send verification email (mock implementation)
    await this.sendVerificationEmail(userId, request);

    return request;
  }

  /**
   * Verify data request with token
   */
  async verifyDataRequest(requestId: string, token: string): Promise<boolean> {
    const request = this.dataRequests.get(requestId);
    
    if (!request || request.status !== DataRequestStatus.PENDING) {
      return false;
    }

    if (request.verificationToken !== token) {
      return false;
    }

    // Check if token is expired
    const tokenAge = Date.now() - request.requestedAt.getTime();
    if (tokenAge > this.VERIFICATION_TOKEN_EXPIRY) {
      request.status = DataRequestStatus.EXPIRED;
      return false;
    }

    request.status = DataRequestStatus.VERIFIED;
    request.processedAt = new Date();

    // Start processing the request asynchronously
    setImmediate(() => this.processDataRequest(request));

    return true;
  }

  /**
   * Export user data in GDPR-compliant format
   */
  async exportUserData(userId: string, exportRequest: DataExportRequest): Promise<GDPRDataExport> {
    const exportData: GDPRDataExport = {
      userId,
      exportedAt: new Date(),
      dataTypes: exportRequest.dataTypes,
      data: {
        personalData: {},
        preferences: {},
        activityHistory: [],
        consentHistory: [],
        locationData: []
      },
      metadata: {
        exportFormat: exportRequest.format,
        dataVersion: '1.0',
        retentionPeriods: this.DATA_RETENTION_PERIODS
      }
    };

    // Collect personal data
    if (exportRequest.dataTypes.includes('personal_data')) {
      exportData.data.personalData = await this.collectPersonalData(userId);
    }

    // Collect preferences
    if (exportRequest.dataTypes.includes('preferences')) {
      exportData.data.preferences = await this.collectPreferences(userId);
    }

    // Collect activity history
    if (exportRequest.dataTypes.includes('activity_history')) {
      exportData.data.activityHistory = await this.collectActivityHistory(userId);
    }

    // Collect consent history
    if (exportRequest.dataTypes.includes('consent_history')) {
      exportData.data.consentHistory = await this.collectConsentHistory(userId);
    }

    // Collect location data
    if (exportRequest.dataTypes.includes('location_data')) {
      exportData.data.locationData = await this.collectLocationData(userId);
    }

    return exportData;
  }

  /**
   * Delete user data according to GDPR right to erasure
   */
  async deleteUserData(userId: string, deletionRequest: DataDeletionRequest): Promise<{
    deletedDataTypes: string[];
    retainedDataTypes: string[];
    deletionSummary: Record<string, any>;
  }> {
    const deletedDataTypes: string[] = [];
    const retainedDataTypes: string[] = [];
    const deletionSummary: Record<string, any> = {};

    for (const dataType of deletionRequest.dataTypes) {
      try {
        const canDelete = await this.canDeleteDataType(userId, dataType, deletionRequest.retentionOverride);
        
        if (canDelete) {
          const deletionResult = await this.deleteDataType(userId, dataType);
          deletedDataTypes.push(dataType);
          deletionSummary[dataType] = deletionResult;
        } else {
          retainedDataTypes.push(dataType);
          deletionSummary[dataType] = {
            status: 'retained',
            reason: 'Legal retention requirement or legitimate interest'
          };
        }
      } catch (error) {
        retainedDataTypes.push(dataType);
        deletionSummary[dataType] = {
          status: 'error',
          reason: `Deletion failed: ${error}`
        };
      }
    }

    // Log deletion for audit purposes
    await this.logDataDeletion(userId, deletedDataTypes, retainedDataTypes, deletionRequest.reason);

    return {
      deletedDataTypes,
      retainedDataTypes,
      deletionSummary
    };
  }

  /**
   * Get data request status
   */
  async getDataRequestStatus(requestId: string): Promise<DataRequest | null> {
    return this.dataRequests.get(requestId) || null;
  }

  /**
   * Get user's data requests history
   */
  async getUserDataRequests(userId: string): Promise<DataRequest[]> {
    return Array.from(this.dataRequests.values())
      .filter(request => request.userId === userId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * Generate data portability report
   */
  async generatePortabilityReport(userId: string): Promise<{
    userData: GDPRDataExport;
    portabilityInfo: {
      dataFormats: string[];
      transferMethods: string[];
      technicalRequirements: string[];
    };
  }> {
    const userData = await this.exportUserData(userId, {
      userId,
      dataTypes: ['personal_data', 'preferences', 'activity_history', 'consent_history'],
      format: 'json',
      includeMetadata: true
    });

    return {
      userData,
      portabilityInfo: {
        dataFormats: ['JSON', 'CSV', 'XML'],
        transferMethods: ['Download', 'Email', 'API'],
        technicalRequirements: [
          'Standard web browser for download',
          'JSON/CSV reader for data viewing',
          'API client for programmatic access'
        ]
      }
    };
  }

  /**
   * Check data retention compliance
   */
  async checkRetentionCompliance(userId: string): Promise<{
    compliant: boolean;
    expiredData: string[];
    upcomingExpirations: Array<{ dataType: string; expiresAt: Date }>;
  }> {
    const expiredData: string[] = [];
    const upcomingExpirations: Array<{ dataType: string; expiresAt: Date }> = [];
    
    // Check each data type against retention periods
    for (const [dataType, retentionPeriod] of Object.entries(this.DATA_RETENTION_PERIODS)) {
      const dataAge = await this.getDataAge(userId, dataType);
      const maxAge = this.parseRetentionPeriod(retentionPeriod);
      
      if (dataAge > maxAge) {
        expiredData.push(dataType);
      } else if (dataAge > maxAge * 0.9) { // 90% of retention period
        const expiresAt = new Date(Date.now() + (maxAge - dataAge));
        upcomingExpirations.push({ dataType, expiresAt });
      }
    }

    return {
      compliant: expiredData.length === 0,
      expiredData,
      upcomingExpirations
    };
  }

  private async processDataRequest(request: DataRequest): Promise<void> {
    request.status = DataRequestStatus.PROCESSING;

    try {
      switch (request.requestType) {
        case DataRequestType.DATA_EXPORT:
          const exportData = await this.exportUserData(
            request.userId, 
            request.requestData as DataExportRequest
          );
          request.responseData = exportData;
          break;

        case DataRequestType.DATA_DELETION:
          const deletionResult = await this.deleteUserData(
            request.userId,
            request.requestData as DataDeletionRequest
          );
          request.responseData = deletionResult;
          break;

        case DataRequestType.DATA_PORTABILITY:
          const portabilityData = await this.generatePortabilityReport(request.userId);
          request.responseData = portabilityData;
          break;

        default:
          throw new Error(`Unsupported request type: ${request.requestType}`);
      }

      request.status = DataRequestStatus.COMPLETED;
      request.completedAt = new Date();
    } catch (error) {
      request.status = DataRequestStatus.REJECTED;
      request.responseData = { error: String(error) };
    }
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async sendVerificationEmail(userId: string, request: DataRequest): Promise<void> {
    // Mock email sending - in production, integrate with email service
    console.log(`Verification email sent for request ${request.id} to user ${userId}`);
    console.log(`Verification token: ${request.verificationToken}`);
  }

  private async collectPersonalData(userId: string): Promise<Record<string, any>> {
    // Mock data collection - in production, query actual databases
    return {
      userId,
      email: 'user@example.com',
      name: 'John Doe',
      createdAt: new Date(),
      lastLoginAt: new Date()
    };
  }

  private async collectPreferences(userId: string): Promise<Record<string, any>> {
    return {
      language: 'en',
      interests: ['culture', 'food', 'nature'],
      notifications: {
        email: true,
        push: false
      }
    };
  }

  private async collectActivityHistory(userId: string): Promise<Record<string, any>[]> {
    return [
      {
        action: 'view_attraction',
        timestamp: new Date(),
        data: { attractionId: 'attr_123' }
      }
    ];
  }

  private async collectConsentHistory(userId: string): Promise<Record<string, any>[]> {
    return [
      {
        consentType: 'location_tracking',
        granted: true,
        timestamp: new Date()
      }
    ];
  }

  private async collectLocationData(userId: string): Promise<Record<string, any>[]> {
    return [
      {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date(),
        accuracy: 10
      }
    ];
  }

  private async canDeleteDataType(userId: string, dataType: string, retentionOverride?: boolean): Promise<boolean> {
    // Check legal retention requirements
    const legalRetentionTypes = ['consent_records', 'financial_records'];
    
    if (legalRetentionTypes.includes(dataType) && !retentionOverride) {
      return false;
    }

    // Check if data is needed for legitimate interests
    const legitimateInterestTypes = ['security_logs', 'fraud_prevention'];
    
    if (legitimateInterestTypes.includes(dataType)) {
      return false;
    }

    return true;
  }

  private async deleteDataType(userId: string, dataType: string): Promise<Record<string, any>> {
    // Mock deletion - in production, delete from actual databases
    console.log(`Deleting ${dataType} for user ${userId}`);
    
    return {
      status: 'deleted',
      deletedAt: new Date(),
      recordsDeleted: Math.floor(Math.random() * 100) + 1
    };
  }

  private async logDataDeletion(
    userId: string, 
    deletedTypes: string[], 
    retainedTypes: string[], 
    reason?: string
  ): Promise<void> {
    const logEntry = {
      userId,
      action: 'data_deletion',
      timestamp: new Date(),
      deletedTypes,
      retainedTypes,
      reason,
      requestId: uuidv4()
    };

    console.log('Data deletion audit log:', JSON.stringify(logEntry));
  }

  private async getDataAge(userId: string, dataType: string): Promise<number> {
    // Mock implementation - in production, query actual data creation dates
    return Math.random() * 365 * 24 * 60 * 60 * 1000; // Random age up to 1 year
  }

  private parseRetentionPeriod(period: string): number {
    const match = period.match(/(\d+)\s*(year|month|day)s?/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'year': return value * 365 * 24 * 60 * 60 * 1000;
      case 'month': return value * 30 * 24 * 60 * 60 * 1000;
      case 'day': return value * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }
}