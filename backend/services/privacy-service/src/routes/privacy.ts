import { Router } from 'express';
import Joi from 'joi';
import { ConsentService } from '../services/consentService';
import { GDPRService } from '../services/gdprService';
import { AnonymizationService } from '../services/anonymizationService';
import { SecurityMiddleware, AuthenticatedRequest } from '../middleware/securityMiddleware';
import { ConsentType, ConsentRequest } from '../models/ConsentRecord';
import { DataRequestType } from '../models/DataRequest';

const router = Router();
const consentService = new ConsentService();
const gdprService = new GDPRService();
const anonymizationService = new AnonymizationService();
const security = new SecurityMiddleware(process.env.JWT_SECRET || 'default-secret');

// Validation schemas
const consentSchema = Joi.object({
  consentType: Joi.string().valid(...Object.values(ConsentType)).required(),
  granted: Joi.boolean().required(),
  metadata: Joi.object().optional()
});

const multipleConsentsSchema = Joi.object({
  consents: Joi.array().items(consentSchema).required()
});

const dataRequestSchema = Joi.object({
  requestType: Joi.string().valid(...Object.values(DataRequestType)).required(),
  dataTypes: Joi.array().items(Joi.string()).optional(),
  format: Joi.string().valid('json', 'csv', 'xml').optional(),
  includeMetadata: Joi.boolean().optional(),
  retentionOverride: Joi.boolean().optional(),
  reason: Joi.string().optional()
});

// Apply security middleware
router.use(security.securityHeaders());
router.use(security.rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
}));

/**
 * Record user consent
 */
router.post('/consent', 
  security.authenticateToken(),
  security.validateRequest(consentSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { consentType, granted, metadata } = req.body;
      const userId = req.user!.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const consentRequest: ConsentRequest = {
        userId,
        consentType,
        granted,
        metadata
      };

      const consentRecord = await consentService.recordConsent(
        consentRequest, 
        ipAddress, 
        userAgent
      );

      res.status(201).json({
        success: true,
        data: {
          consentId: consentRecord.id,
          consentType: consentRecord.consentType,
          granted: consentRecord.granted,
          timestamp: consentRecord.timestamp,
          expiresAt: consentRecord.expiresAt
        }
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'CONSENT_RECORDING_FAILED',
          message: 'Failed to record consent',
          details: String(error)
        }
      });
    }
  }
);

/**
 * Update multiple consents at once
 */
router.post('/consent/bulk',
  security.authenticateToken(),
  security.validateRequest(multipleConsentsSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { consents } = req.body;
      const userId = req.user!.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const consentRequests: ConsentRequest[] = consents.map((consent: any) => ({
        userId,
        consentType: consent.consentType,
        granted: consent.granted,
        metadata: consent.metadata
      }));

      const consentRecords = await consentService.updateConsents(
        userId,
        consentRequests,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: {
          updatedConsents: consentRecords.length,
          consents: consentRecords.map(record => ({
            consentId: record.id,
            consentType: record.consentType,
            granted: record.granted,
            timestamp: record.timestamp
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'BULK_CONSENT_UPDATE_FAILED',
          message: 'Failed to update consents',
          details: String(error)
        }
      });
    }
  }
);

/**
 * Get user consent profile
 */
router.get('/consent/profile',
  security.authenticateToken(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const profile = await consentService.getUserConsentProfile(userId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'CONSENT_PROFILE_FETCH_FAILED',
          message: 'Failed to fetch consent profile',
          details: String(error)
        }
      });
    }
  }
);

/**
 * Withdraw consent
 */
router.delete('/consent/:consentType',
  security.authenticateToken(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const consentType = req.params.consentType as ConsentType;

      if (!Object.values(ConsentType).includes(consentType)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CONSENT_TYPE',
            message: 'Invalid consent type'
          }
        });
      }

      const success = await consentService.withdrawConsent(userId, consentType);

      if (success) {
        res.json({
          success: true,
          message: 'Consent withdrawn successfully'
        });
      } else {
        res.status(404).json({
          error: {
            code: 'CONSENT_NOT_FOUND',
            message: 'No active consent found for this type'
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'CONSENT_WITHDRAWAL_FAILED',
          message: 'Failed to withdraw consent',
          details: String(error)
        }
      });
    }
  }
);

/**
 * Submit GDPR data request
 */
router.post('/gdpr/request',
  security.authenticateToken(),
  security.strictRateLimiter(),
  security.validateRequest(dataRequestSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { requestType, ...requestData } = req.body;

      const dataRequest = await gdprService.submitDataRequest(
        userId,
        requestType,
        requestData
      );

      res.status(201).json({
        success: true,
        data: {
          requestId: dataRequest.id,
          requestType: dataRequest.requestType,
          status: dataRequest.status,
          requestedAt: dataRequest.requestedAt,
          message: 'Verification email sent. Please check your email to verify the request.'
        }
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'GDPR_REQUEST_FAILED',
          message: 'Failed to submit GDPR request',
          details: String(error)
        }
      });
    }
  }
);

/**
 * Verify GDPR data request
 */
router.post('/gdpr/verify/:requestId',
  security.strictRateLimiter(),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Verification token is required'
          }
        });
      }

      const verified = await gdprService.verifyDataRequest(requestId, token);

      if (verified) {
        res.json({
          success: true,
          message: 'Request verified and processing started'
        });
      } else {
        res.status(400).json({
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Invalid or expired verification token'
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'VERIFICATION_ERROR',
          message: 'Failed to verify request',
          details: String(error)
        }
      });
    }
  }
);

/**
 * Get GDPR request status
 */
router.get('/gdpr/request/:requestId',
  security.authenticateToken(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { requestId } = req.params;
      const dataRequest = await gdprService.getDataRequestStatus(requestId);

      if (!dataRequest) {
        return res.status(404).json({
          error: {
            code: 'REQUEST_NOT_FOUND',
            message: 'Data request not found'
          }
        });
      }

      // Ensure user can only access their own requests
      if (dataRequest.userId !== req.user!.id) {
        return res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied to this request'
          }
        });
      }

      res.json({
        success: true,
        data: {
          requestId: dataRequest.id,
          requestType: dataRequest.requestType,
          status: dataRequest.status,
          requestedAt: dataRequest.requestedAt,
          processedAt: dataRequest.processedAt,
          completedAt: dataRequest.completedAt,
          responseData: dataRequest.responseData
        }
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'REQUEST_STATUS_FETCH_FAILED',
          message: 'Failed to fetch request status',
          details: String(error)
        }
      });
    }
  }
);

/**
 * Get user's GDPR requests history
 */
router.get('/gdpr/requests',
  security.authenticateToken(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const requests = await gdprService.getUserDataRequests(userId);

      res.json({
        success: true,
        data: {
          requests: requests.map(request => ({
            requestId: request.id,
            requestType: request.requestType,
            status: request.status,
            requestedAt: request.requestedAt,
            completedAt: request.completedAt
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'REQUESTS_FETCH_FAILED',
          message: 'Failed to fetch requests history',
          details: String(error)
        }
      });
    }
  }
);

/**
 * Check data retention compliance
 */
router.get('/gdpr/retention-compliance',
  security.authenticateToken(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const compliance = await gdprService.checkRetentionCompliance(userId);

      res.json({
        success: true,
        data: compliance
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'COMPLIANCE_CHECK_FAILED',
          message: 'Failed to check retention compliance',
          details: String(error)
        }
      });
    }
  }
);

/**
 * Anonymize data for analytics (admin only)
 */
router.post('/anonymize',
  security.authenticateToken(),
  security.requireRole('admin'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userData } = req.body;

      if (!userData) {
        return res.status(400).json({
          error: {
            code: 'MISSING_DATA',
            message: 'User data is required for anonymization'
          }
        });
      }

      const anonymizedData = await anonymizationService.anonymizeUserData(userData);

      res.json({
        success: true,
        data: anonymizedData
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'ANONYMIZATION_FAILED',
          message: 'Failed to anonymize data',
          details: String(error)
        }
      });
    }
  }
);

export default router;