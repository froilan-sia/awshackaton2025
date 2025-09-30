import mongoose from 'mongoose';
import { LocationService } from '../src/services/locationService';
import { GeofenceService } from '../src/services/geofenceService';
import { ContentDeliveryService } from '../src/services/contentDeliveryService';
import { LocationSource, PrivacyLevel, ContentCategory } from '../src/types/location';

async function demonstrateLocationServices() {
  console.log('🚀 Starting Hong Kong Tourism Location Services Demo\n');

  // Connect to MongoDB
  await mongoose.connect('mongodb://localhost:27017/hk-tourism-location-demo');
  console.log('✅ Connected to MongoDB\n');

  const locationService = new LocationService();
  const geofenceService = new GeofenceService();
  const contentDeliveryService = new ContentDeliveryService();

  const demoUserId = 'demo-tourist-123';

  try {
    // 1. Create geofences for popular Hong Kong locations
    console.log('📍 Creating geofences for Hong Kong attractions...');
    
    const centralGeofence = await geofenceService.createGeofence({
      name: 'Central District',
      center: {
        latitude: 22.2819,
        longitude: 114.1577,
        timestamp: new Date()
      },
      radius: 500,
      isActive: true
    });

    const tsmGeofence = await geofenceService.createGeofence({
      name: 'Tsim Sha Tsui',
      center: {
        latitude: 22.2976,
        longitude: 114.1722,
        timestamp: new Date()
      },
      radius: 400,
      isActive: true
    });

    console.log(`✅ Created geofence: ${centralGeofence.name} (${centralGeofence.id})`);
    console.log(`✅ Created geofence: ${tsmGeofence.name} (${tsmGeofence.id})\n`);

    // 2. Add location-based content
    console.log('📝 Adding location-based content...');

    await contentDeliveryService.createLocationContent({
      geofenceId: centralGeofence.id,
      title: 'Welcome to Central District',
      description: 'You are now in Hong Kong\'s financial heart',
      content: 'Central District is the business and financial center of Hong Kong. Here you\'ll find towering skyscrapers, luxury shopping, and excellent dining options. Don\'t miss the historic Man Mo Temple and the scenic Peak Tram station.',
      language: 'en',
      category: ContentCategory.CULTURAL,
      priority: 9,
      isActive: true
    });

    await contentDeliveryService.createLocationContent({
      geofenceId: centralGeofence.id,
      title: 'Safety Tips for Central',
      description: 'Important safety information',
      content: 'Central is generally very safe, but be aware of heavy pedestrian traffic during rush hours. Keep your belongings secure in crowded areas and follow traffic signals carefully.',
      language: 'en',
      category: ContentCategory.SAFETY,
      priority: 10,
      isActive: true
    });

    await contentDeliveryService.createLocationContent({
      geofenceId: tsmGeofence.id,
      title: 'Tsim Sha Tsui Waterfront',
      description: 'Enjoy the stunning harbor views',
      content: 'Tsim Sha Tsui offers some of the best views of Victoria Harbour. Visit the Avenue of Stars, take photos with the Hong Kong skyline, and don\'t miss the Symphony of Lights show at 8 PM every evening.',
      language: 'en',
      category: ContentCategory.CULTURAL,
      priority: 8,
      isActive: true
    });

    console.log('✅ Added location-based content for all geofences\n');

    // 3. Simulate tourist movement and location tracking
    console.log('🚶 Simulating tourist movement...');

    // Tourist starts near Central
    const centralLocation = {
      latitude: 22.2820,
      longitude: 114.1580,
      accuracy: 5,
      timestamp: new Date()
    };

    console.log('📍 Tourist location update: Near Central District');
    const locationUpdate1 = await locationService.updateLocation({
      userId: demoUserId,
      location: centralLocation,
      privacyLevel: PrivacyLevel.MEDIUM,
      source: LocationSource.GPS
    });

    // Check for geofence events
    const events1 = await geofenceService.checkGeofenceEvents(
      demoUserId,
      centralLocation
    );

    if (events1.length > 0) {
      console.log(`🎯 Geofence event detected: ${events1[0].eventType} - ${events1[0].geofenceId}`);
      
      // Get triggered content
      const triggeredContent = await contentDeliveryService.getTriggeredContent(
        demoUserId,
        events1,
        'en',
        ['culture', 'safety']
      );

      if (triggeredContent.length > 0) {
        console.log('📱 Content delivered to tourist:');
        triggeredContent.forEach(tc => {
          tc.content.forEach(content => {
            console.log(`   📄 ${content.title}: ${content.description}`);
          });
        });
      }
    }

    console.log('');

    // Tourist moves to Tsim Sha Tsui
    const tsmLocation = {
      latitude: 22.2978,
      longitude: 114.1725,
      accuracy: 8,
      timestamp: new Date()
    };

    console.log('📍 Tourist location update: Moving to Tsim Sha Tsui');
    const locationUpdate2 = await locationService.updateLocation({
      userId: demoUserId,
      location: tsmLocation,
      privacyLevel: PrivacyLevel.MEDIUM,
      source: LocationSource.GPS
    });

    // Check for geofence events
    const events2 = await geofenceService.checkGeofenceEvents(
      demoUserId,
      tsmLocation,
      centralLocation
    );

    if (events2.length > 0) {
      console.log(`🎯 Geofence events detected: ${events2.length} events`);
      events2.forEach(event => {
        console.log(`   - ${event.eventType} event for geofence ${event.geofenceId}`);
      });

      // Get triggered content
      const triggeredContent2 = await contentDeliveryService.getTriggeredContent(
        demoUserId,
        events2,
        'en'
      );

      if (triggeredContent2.length > 0) {
        console.log('📱 New content delivered:');
        triggeredContent2.forEach(tc => {
          tc.content.forEach(content => {
            console.log(`   📄 ${content.title}: ${content.description}`);
          });
        });
      }
    }

    console.log('');

    // 4. Demonstrate privacy controls
    console.log('🔒 Demonstrating privacy controls...');
    
    // Update with high privacy
    const highPrivacyLocation = {
      latitude: 22.3000,
      longitude: 114.1800,
      accuracy: 3,
      altitude: 50,
      heading: 180,
      speed: 5,
      timestamp: new Date()
    };

    const highPrivacyUpdate = await locationService.updateLocation({
      userId: demoUserId,
      location: highPrivacyLocation,
      privacyLevel: PrivacyLevel.HIGH,
      source: LocationSource.GPS
    });

    console.log('Original location:', highPrivacyLocation.latitude, highPrivacyLocation.longitude);
    console.log('Sanitized location (HIGH privacy):', 
      highPrivacyUpdate.location.latitude, 
      highPrivacyUpdate.location.longitude
    );
    console.log('Sensitive data removed:', {
      accuracy: highPrivacyUpdate.location.accuracy,
      altitude: highPrivacyUpdate.location.altitude,
      heading: highPrivacyUpdate.location.heading,
      speed: highPrivacyUpdate.location.speed
    });

    console.log('');

    // 5. Show contextual content delivery
    console.log('🎯 Getting contextual content for current location...');
    const contextualContent = await contentDeliveryService.getContextualContent(
      tsmLocation,
      'en',
      ['culture', 'historical'],
      1000
    );

    console.log(`Found ${contextualContent.length} relevant content areas:`);
    contextualContent.forEach(area => {
      console.log(`📍 ${area.geofenceName}:`);
      area.content.forEach(content => {
        console.log(`   📄 ${content.title} (Priority: ${content.priority})`);
      });
    });

    console.log('');

    // 6. Show user preferences management
    console.log('⚙️ Managing user preferences...');
    const preferences = await locationService.getUserLocationPreferences(demoUserId);
    console.log('Current preferences:', {
      trackingEnabled: preferences.trackingEnabled,
      privacyLevel: preferences.privacyLevel,
      shareLocation: preferences.shareLocation,
      contentNotifications: preferences.contentNotifications
    });

    // Update preferences
    await locationService.updateLocationPreferences(demoUserId, {
      privacyLevel: PrivacyLevel.HIGH,
      shareLocation: false,
      contentNotifications: true
    });

    console.log('✅ Updated user preferences to high privacy\n');

    // 7. Show location history
    console.log('📊 Location history summary...');
    const history = await locationService.getLocationHistory(demoUserId, undefined, undefined, 5);
    console.log(`Found ${history.length} location records:`);
    history.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.location.latitude}, ${record.location.longitude} (${record.privacyLevel} privacy) - ${record.createdAt.toISOString()}`);
    });

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the demo
if (require.main === module) {
  demonstrateLocationServices().catch(console.error);
}

export { demonstrateLocationServices };