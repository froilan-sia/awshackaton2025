import { ConsentService } from '../src/services/consentService';
import { GDPRService } from '../src/services/gdprService';
import { AnonymizationService } from '../src/services/anonymizationService';
import { ConsentType, ConsentRequest } from '../src/models/ConsentRecord';
import { DataRequestType } from '../src/models/DataRequest';

async function demonstratePrivacyService() {
  console.log('🔒 Privacy Service Demo');
  console.log('========================\n');

  // Initialize services
  const consentService = new ConsentService();
  const gdprService = new GDPRService();
  const anonymizationService = new AnonymizationService();

  const userId = 'demo-user-123';

  // 1. Consent Management Demo
  console.log('1. 📋 Consent Management');
  console.log('-------------------------');

  // Record various consents
  const consentRequests: ConsentRequest[] = [
    {
      userId,
      consentType: ConsentType.LOCATION_TRACKING,
      granted: true,
      metadata: { source: 'mobile_app', version: '1.0' }
    },
    {
      userId,
      consentType: ConsentType.DATA_ANALYTICS,
      granted: true,
      metadata: { source: 'web_app' }
    },
    {
      userId,
      consentType: ConsentType.MARKETING,
      granted: false,
      metadata: { source: 'mobile_app' }
    },
    {
      userId,
      consentType: ConsentType.PERSONALIZATION,
      granted: true
    }
  ];

  console.log('Recording user consents...');
  for (const request of consentRequests) {
    const consent = await consentService.recordConsent(request, '192.168.1.100', 'DemoApp/1.0');
    console.log(`✅ ${consent.consentType}: ${consent.granted ? 'GRANTED' : 'DENIED'}`);
  }

  // Check consent status
  console.log('\nChecking consent status:');
  for (const consentType of Object.values(ConsentType)) {
    const hasConsent = await consentService.hasConsent(userId, consentType);
    console.log(`${hasConsent ? '✅' : '❌'} ${consentType}: ${hasConsent ? 'GRANTED' : 'NOT GRANTED'}`);
  }

  // Get complete consent profile
  const profile = await consentService.getUserConsentProfile(userId);
  console.log('\n📊 User Consent Profile:');
  console.log(`User ID: ${profile.userId}`);
  console.log(`GDPR Compliant: ${profile.gdprCompliant ? '✅' : '❌'}`);
  console.log(`Last Updated: ${profile.lastUpdated.toISOString()}`);
  console.log(`Active Consents: ${profile.consents.filter(c => c.granted).length}/${profile.consents.length}`);

  // 2. Data Anonymization Demo
  console.log('\n\n2. 🎭 Data Anonymization');
  console.log('-------------------------');

  // Anonymize user data
  const userData = {
    user_id: userId,
    email: 'john.doe@example.com',
    phone: '+852-9876-5432',
    name: 'John Doe',
    age: 28,
    timestamp: new Date(),
    location_district: 'Central',
    interests: ['food', 'culture', 'nature']
  };

  console.log('Original user data:');
  console.log(JSON.stringify(userData, null, 2));

  const anonymizedData = await anonymizationService.anonymizeUserData(userData);
  console.log('\n🎭 Anonymized data:');
  console.log(JSON.stringify(anonymizedData.data, null, 2));

  // Anonymize location data for crowd analytics
  const locationData = {
    userId,
    latitude: 22.3193,
    longitude: 114.1694,
    timestamp: new Date(),
    accuracy: 8,
    district: 'Central'
  };

  console.log('\nOriginal location data:');
  console.log(JSON.stringify(locationData, null, 2));

  const anonymizedLocation = await anonymizationService.anonymizeLocationData(locationData);
  console.log('\n📍 Anonymized location data:');
  console.log(JSON.stringify(anonymizedLocation, null, 2));

  // Demonstrate crowd data anonymization
  const crowdData = {
    locationId: 'tsim-sha-tsui-promenade',
    userCount: 85,
    timestamp: new Date(),
    userDemographics: {
      age: 32,
      gender: 'female'
    },
    deviceTypes: ['iPhone 14', 'android phone', 'iPad Pro']
  };

  console.log('\nOriginal crowd data:');
  console.log(JSON.stringify(crowdData, null, 2));

  const anonymizedCrowd = await anonymizationService.anonymizeCrowdData(crowdData);
  console.log('\n👥 Anonymized crowd data:');
  console.log(JSON.stringify(anonymizedCrowd, null, 2));

  // 3. GDPR Compliance Demo
  console.log('\n\n3. ⚖️ GDPR Compliance');
  console.log('----------------------');

  // Submit data export request
  console.log('Submitting GDPR data export request...');
  const exportRequest = await gdprService.submitDataRequest(
    userId,
    DataRequestType.DATA_EXPORT,
    {
      dataTypes: ['personal_data', 'preferences', 'activity_history', 'consent_history'],
      format: 'json',
      includeMetadata: true
    }
  );

  console.log(`📤 Export request submitted: ${exportRequest.id}`);
  console.log(`Status: ${exportRequest.status}`);
  console.log(`Verification token: ${exportRequest.verificationToken?.substring(0, 8)}...`);

  // Verify the request (simulate email verification)
  console.log('\nVerifying GDPR request...');
  const verified = await gdprService.verifyDataRequest(
    exportRequest.id,
    exportRequest.verificationToken!
  );

  console.log(`✅ Request verified: ${verified}`);

  // Check request status
  const requestStatus = await gdprService.getDataRequestStatus(exportRequest.id);
  console.log(`📋 Request status: ${requestStatus?.status}`);

  // Wait a moment for processing to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  const finalStatus = await gdprService.getDataRequestStatus(exportRequest.id);
  console.log(`📋 Final status: ${finalStatus?.status}`);

  if (finalStatus?.responseData) {
    const exportData = finalStatus.responseData as any;
    console.log('\n📦 Exported data summary:');
    console.log(`- User ID: ${exportData.userId}`);
    console.log(`- Export format: ${exportData.metadata?.exportFormat}`);
    console.log(`- Data types: ${exportData.dataTypes?.join(', ')}`);
    console.log(`- Personal data fields: ${Object.keys(exportData.data?.personalData || {}).length}`);
    console.log(`- Activity records: ${exportData.data?.activityHistory?.length || 0}`);
  }

  // Submit data deletion request
  console.log('\nSubmitting GDPR data deletion request...');
  const deletionRequest = await gdprService.submitDataRequest(
    userId,
    DataRequestType.DATA_DELETION,
    {
      dataTypes: ['activity_history', 'location_data'],
      reason: 'User no longer wants to use the service'
    }
  );

  console.log(`🗑️ Deletion request submitted: ${deletionRequest.id}`);

  // Verify and process deletion
  await gdprService.verifyDataRequest(
    deletionRequest.id,
    deletionRequest.verificationToken!
  );

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 100));

  const deletionStatus = await gdprService.getDataRequestStatus(deletionRequest.id);
  if (deletionStatus?.responseData) {
    const deletionResult = deletionStatus.responseData as any;
    console.log('\n🗑️ Deletion results:');
    console.log(`- Deleted data types: ${deletionResult.deletedDataTypes?.join(', ')}`);
    console.log(`- Retained data types: ${deletionResult.retainedDataTypes?.join(', ')}`);
  }

  // Check data retention compliance
  console.log('\nChecking data retention compliance...');
  const compliance = await gdprService.checkRetentionCompliance(userId);
  console.log(`📊 Retention compliance: ${compliance.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
  console.log(`- Expired data types: ${compliance.expiredData.length}`);
  console.log(`- Upcoming expirations: ${compliance.upcomingExpirations.length}`);

  // 4. K-Anonymity Demo
  console.log('\n\n4. 🔢 K-Anonymity Protection');
  console.log('-----------------------------');

  // Create sample dataset
  const dataset = [
    { ageGroup: '25-34', district: 'Central', timeSlot: '14:00', activity: 'shopping' },
    { ageGroup: '25-34', district: 'Central', timeSlot: '14:00', activity: 'dining' },
    { ageGroup: '25-34', district: 'Central', timeSlot: '14:00', activity: 'sightseeing' },
    { ageGroup: '25-34', district: 'Central', timeSlot: '14:00', activity: 'shopping' },
    { ageGroup: '25-34', district: 'Central', timeSlot: '14:00', activity: 'dining' },
    { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00', activity: 'business' },
    { ageGroup: '35-44', district: 'Wan Chai', timeSlot: '15:00', activity: 'dining' },
    { ageGroup: '18-24', district: 'Tsim Sha Tsui', timeSlot: '16:00', activity: 'entertainment' }
  ];

  console.log(`Original dataset size: ${dataset.length} records`);

  const isKAnonymous = anonymizationService.checkKAnonymity(dataset, 5);
  console.log(`K-anonymous (k=5): ${isKAnonymous ? '✅ YES' : '❌ NO'}`);

  if (!isKAnonymous) {
    const kAnonymousDataset = anonymizationService.enforceKAnonymity(dataset, 5);
    console.log(`After enforcing k-anonymity: ${kAnonymousDataset.length} records`);
    console.log(`Now k-anonymous: ${anonymizationService.checkKAnonymity(kAnonymousDataset, 5) ? '✅ YES' : '❌ NO'}`);
  }

  // 5. Differential Privacy Demo
  console.log('\n\n5. 🎲 Differential Privacy');
  console.log('---------------------------');

  const originalValue = 150; // e.g., number of visitors
  console.log(`Original value: ${originalValue}`);

  for (let i = 0; i < 5; i++) {
    const noisyValue = anonymizationService.addDifferentialPrivacy(originalValue, 1.0);
    console.log(`With differential privacy (ε=1.0): ${Math.round(noisyValue)}`);
  }

  console.log('\n✅ Privacy Service Demo Complete!');
  console.log('==================================');
  console.log('The privacy service provides:');
  console.log('• ✅ Comprehensive consent management');
  console.log('• ✅ GDPR-compliant data export and deletion');
  console.log('• ✅ Advanced data anonymization techniques');
  console.log('• ✅ K-anonymity protection for datasets');
  console.log('• ✅ Differential privacy for statistical data');
  console.log('• ✅ Secure API authentication and rate limiting');
  console.log('• ✅ Comprehensive audit logging');
}

// Run the demo
if (require.main === module) {
  demonstratePrivacyService().catch(console.error);
}

export { demonstratePrivacyService };