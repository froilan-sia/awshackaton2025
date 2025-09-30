import mongoose from 'mongoose';
import { LocationService } from '../../src/services/locationService';
import { GeofenceService } from '../../src/services/geofenceService';
import { ContentDeliveryService } from '../../src/services/contentDeliveryService';
import { LocationSource, PrivacyLevel, ContentCategory, GeofenceEventType } from '../../src/types/location';

describe('Location Service Integration Tests', () => {
  let locationService: LocationService;
  let geofenceService: GeofenceService;
  let contentDeliveryService: ContentDeliveryService;

  const testUserId = 'test-user-123';
  const testLocation = {
    latitude: 22.3193,
    longitude: 114.1694,
    accuracy: 10,
    timestamp: new Date()
  };

  beforeEach(async () => {
    locationService = new LocationService();
    geofenceService = new GeofenceService();
    contentDeliveryService = new ContentDeliveryService();
  });

  describe('Location Tracking with Privacy Controls', () => {
    it('should track location with medium privacy level', async () => {
      const locationUpdate = {
        userId: testUserId,
        location: testLocation,
        privacyLevel: PrivacyLevel.MEDIUM,
        source: LocationSource.GPS
      };

      const result = await locationService.updateLocation(locationUpdate);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.location.latitude).toBe(22.319); // Medium privacy reduces to 3 decimal places
      expect(result.location.longitude).toBe(114.169);
      expect(result.privacyLevel).toBe(PrivacyLevel.MEDIUM);
    });

    it('should sanitize location data for high privacy level', async () => {
      const locationUpdate = {
        userId: testUserId,
        location: {
          ...testLocation,
          accuracy: 5,
          altitude: 100,
          heading: 45,
          speed: 10
        },
        privacyLevel: PrivacyLevel.HIGH,
        source: LocationSource.GPS
      };

      const result = await locationService.updateLocation(locationUpdate);

      expect(result).toBeDefined();
      // High privacy should reduce precision and remove sensitive data
      expect(result.location.latitude).toBe(22.32); // High privacy rounds to 2 decimal places
      expect(result.location.longitude).toBe(114.17);
      expect(result.location.accuracy).toBeUndefined();
      expect(result.location.altitude).toBeUndefined();
      expect(result.location.heading).toBeUndefined();
      expect(result.location.speed).toBeUndefined();
    });

    it('should retrieve current location', async () => {
      // First update location
      const locationUpdate = {
        userId: testUserId,
        location: testLocation,
        privacyLevel: PrivacyLevel.MEDIUM,
        source: LocationSource.GPS
      };

      await locationService.updateLocation(locationUpdate);

      // Then retrieve it
      const currentLocation = await locationService.getCurrentLocation(testUserId);

      expect(currentLocation).toBeDefined();
      expect(currentLocation!.latitude).toBe(22.319); // Medium privacy level
      expect(currentLocation!.longitude).toBe(114.169);
    });
  });

  describe('Geofencing System', () => {
    it('should create and retrieve geofences', async () => {
      const geofenceData = {
        name: 'Central District Test',
        center: testLocation,
        radius: 500,
        isActive: true
      };

      const createdGeofence = await geofenceService.createGeofence(geofenceData);

      expect(createdGeofence).toBeDefined();
      expect(createdGeofence.name).toBe(geofenceData.name);
      expect(createdGeofence.radius).toBe(geofenceData.radius);
      expect(createdGeofence.isActive).toBe(true);

      // Test retrieval
      const retrievedGeofence = await geofenceService.getGeofenceById(createdGeofence.id);
      expect(retrievedGeofence).toBeDefined();
      expect(retrievedGeofence!.name).toBe(geofenceData.name);
    });

    it('should detect geofence events', async () => {
      // Create a geofence
      const geofenceData = {
        name: 'Test Geofence',
        center: testLocation,
        radius: 100,
        isActive: true
      };

      const geofence = await geofenceService.createGeofence(geofenceData);

      // Test location inside geofence
      const insideLocation = {
        latitude: 22.3194, // Very close to center
        longitude: 114.1695,
        timestamp: new Date()
      };

      // Test location outside geofence
      const outsideLocation = {
        latitude: 22.3300, // Far from center
        longitude: 114.1800,
        timestamp: new Date()
      };

      // Check for ENTER event (from outside to inside)
      const enterEvents = await geofenceService.checkGeofenceEvents(
        testUserId,
        insideLocation,
        outsideLocation
      );

      expect(enterEvents).toHaveLength(1);
      expect(enterEvents[0].eventType).toBe(GeofenceEventType.ENTER);
      expect(enterEvents[0].geofenceId).toBe(geofence.id);

      // Check for EXIT event (from inside to outside)
      const exitEvents = await geofenceService.checkGeofenceEvents(
        testUserId,
        outsideLocation,
        insideLocation
      );

      expect(exitEvents).toHaveLength(1);
      expect(exitEvents[0].eventType).toBe(GeofenceEventType.EXIT);
    });
  });

  describe('Content Delivery System', () => {
    it('should create and retrieve location-based content', async () => {
      // First create a geofence
      const geofenceData = {
        name: 'Content Test Geofence',
        center: testLocation,
        radius: 200,
        isActive: true
      };

      const geofence = await geofenceService.createGeofence(geofenceData);

      // Create content for the geofence
      const contentData = {
        geofenceId: geofence.id,
        title: 'Welcome to Central',
        description: 'You are now in Central District',
        content: 'Central District is the heart of Hong Kong\'s business district...',
        language: 'en',
        category: ContentCategory.HISTORICAL,
        priority: 8,
        isActive: true
      };

      const createdContent = await contentDeliveryService.createLocationContent(contentData);

      expect(createdContent).toBeDefined();
      expect(createdContent.title).toBe(contentData.title);
      expect(createdContent.geofenceId).toBe(geofence.id);

      // Retrieve content for geofence
      const retrievedContent = await contentDeliveryService.getContentForGeofence(
        geofence.id,
        'en',
        ContentCategory.HISTORICAL
      );

      expect(retrievedContent).toHaveLength(1);
      expect(retrievedContent[0].title).toBe(contentData.title);
    });

    it('should get contextual content for location', async () => {
      // Create geofence and content
      const geofenceData = {
        name: 'Contextual Test Area',
        center: testLocation,
        radius: 300,
        isActive: true
      };

      const geofence = await geofenceService.createGeofence(geofenceData);

      const contentData = {
        geofenceId: geofence.id,
        title: 'Local Safety Tips',
        description: 'Important safety information for this area',
        content: 'Always be aware of your surroundings...',
        language: 'en',
        category: ContentCategory.SAFETY,
        priority: 10,
        isActive: true
      };

      await contentDeliveryService.createLocationContent(contentData);

      // Get contextual content for the location
      const contextualContent = await contentDeliveryService.getContextualContent(
        testLocation,
        'en',
        ['safety'],
        500
      );

      expect(contextualContent).toHaveLength(1);
      expect(contextualContent[0].geofenceName).toBe(geofenceData.name);
      expect(contextualContent[0].content).toHaveLength(1);
      expect(contextualContent[0].content[0].title).toBe(contentData.title);
    });
  });

  describe('User Preferences and Privacy', () => {
    it('should manage user location preferences', async () => {
      // Get default preferences
      const defaultPrefs = await locationService.getUserLocationPreferences(testUserId);

      expect(defaultPrefs).toBeDefined();
      expect(defaultPrefs.trackingEnabled).toBe(true);
      expect(defaultPrefs.privacyLevel).toBe(PrivacyLevel.MEDIUM);

      // Update preferences
      const updates = {
        trackingEnabled: false,
        privacyLevel: PrivacyLevel.HIGH,
        shareLocation: true
      };

      const updatedPrefs = await locationService.updateLocationPreferences(testUserId, updates);

      expect(updatedPrefs.trackingEnabled).toBe(false);
      expect(updatedPrefs.privacyLevel).toBe(PrivacyLevel.HIGH);
      expect(updatedPrefs.shareLocation).toBe(true);
    });

    it('should respect privacy settings when tracking is disabled', async () => {
      // Disable tracking
      await locationService.updateLocationPreferences(testUserId, {
        trackingEnabled: false
      });

      const locationUpdate = {
        userId: testUserId,
        location: testLocation,
        privacyLevel: PrivacyLevel.MEDIUM,
        source: LocationSource.GPS
      };

      // Should throw error when tracking is disabled
      await expect(locationService.updateLocation(locationUpdate))
        .rejects.toThrow('Location tracking is disabled for this user');
    });
  });

  describe('Data Management and GDPR Compliance', () => {
    it('should delete all user location data', async () => {
      // First create some data
      const locationUpdate = {
        userId: testUserId,
        location: testLocation,
        privacyLevel: PrivacyLevel.MEDIUM,
        source: LocationSource.GPS
      };

      await locationService.updateLocation(locationUpdate);

      // Verify data exists
      const currentLocation = await locationService.getCurrentLocation(testUserId);
      expect(currentLocation).toBeDefined();

      // Delete all user data
      await locationService.deleteUserLocationData(testUserId);

      // Verify data is deleted
      const deletedLocation = await locationService.getCurrentLocation(testUserId);
      expect(deletedLocation).toBeNull();
    });
  });
});