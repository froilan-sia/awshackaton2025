import express from 'express';
import { ContextualContentService } from '../services/contextualContentService';
import { ContentCategory, GeoLocation } from '../types/location';
import { validateLocationData } from '../validation/locationValidation';

const router = express.Router();
const contextualContentService = new ContextualContentService();

/**
 * Trigger contextual content delivery based on user location
 */
router.post('/trigger', async (req, res) => {
  try {
    const { userId, location, context, userPreferences } = req.body;

    // Validate required fields
    if (!userId || !location) {
      return res.status(400).json({
        error: 'Missing required fields: userId and location'
      });
    }

    // Validate location data
    const locationValidation = validateLocationData(location);
    if (!locationValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid location data',
        details: locationValidation.errors
      });
    }

    // Set default context values
    const deliveryContext = {
      location,
      timeOfDay: context?.timeOfDay || getCurrentTimeOfDay(),
      weather: context?.weather,
      crowdLevel: context?.crowdLevel,
      userActivity: context?.userActivity,
      connectionQuality: context?.connectionQuality || 'good',
      batteryLevel: context?.batteryLevel
    };

    const result = await contextualContentService.triggerContextualContent(
      userId,
      deliveryContext,
      userPreferences
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error triggering contextual content:', error);
    res.status(500).json({
      error: 'Failed to trigger contextual content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get enhanced content for a specific geofence
 */
router.get('/geofence/:geofenceId', async (req, res) => {
  try {
    const { geofenceId } = req.params;
    const { 
      languages = ['en'], 
      interests = [], 
      contentTypes = Object.values(ContentCategory),
      timeOfDay,
      weather,
      crowdLevel
    } = req.query;

    const filter = {
      interests: Array.isArray(interests) ? interests.map(String) : [String(interests)].filter(Boolean),
      languages: Array.isArray(languages) ? languages.map(String) : [String(languages)],
      accessibilityNeeds: [],
      contentTypes: Array.isArray(contentTypes) ? contentTypes.map(c => c as ContentCategory) : [contentTypes as ContentCategory],
      preferredMediaTypes: ['image', 'text', 'video', 'audio']
    };

    const context = {
      location: { latitude: 0, longitude: 0, timestamp: new Date() }, // Will be filtered by geofence
      timeOfDay: timeOfDay as string || getCurrentTimeOfDay(),
      weather: weather as string,
      crowdLevel: crowdLevel as string,
      connectionQuality: 'good' as const
    };

    const content = await contextualContentService.getEnhancedContentForGeofence(
      geofenceId,
      filter,
      context
    );

    res.json({
      success: true,
      data: {
        geofenceId,
        content,
        totalItems: content.length
      }
    });

  } catch (error) {
    console.error('Error getting geofence content:', error);
    res.status(500).json({
      error: 'Failed to get geofence content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create multimedia content for a location
 */
router.post('/multimedia', async (req, res) => {
  try {
    const {
      geofenceId,
      title,
      description,
      content,
      category,
      language = 'en',
      multimedia = [],
      interestTags = [],
      contextualTriggers = {}
    } = req.body;

    // Validate required fields
    if (!geofenceId || !title || !description || !content || !category) {
      return res.status(400).json({
        error: 'Missing required fields: geofenceId, title, description, content, category'
      });
    }

    // Validate category
    if (!Object.values(ContentCategory).includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        validCategories: Object.values(ContentCategory)
      });
    }

    const enhancedContent = await contextualContentService.createMultimediaContent(
      geofenceId,
      {
        title,
        description,
        content,
        category,
        language,
        multimedia,
        interestTags,
        contextualTriggers
      }
    );

    res.status(201).json({
      success: true,
      data: enhancedContent
    });

  } catch (error) {
    console.error('Error creating multimedia content:', error);
    res.status(500).json({
      error: 'Failed to create multimedia content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cached content for offline access
 */
router.get('/cached', async (req, res) => {
  try {
    const { 
      latitude, 
      longitude, 
      radius = 1000,
      languages = ['en'],
      interests = [],
      contentTypes = Object.values(ContentCategory)
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required parameters: latitude and longitude'
      });
    }

    const location: GeoLocation = {
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      timestamp: new Date()
    };

    const filter = {
      interests: Array.isArray(interests) ? interests.map(String) : [String(interests)].filter(Boolean),
      languages: Array.isArray(languages) ? languages.map(String) : [String(languages)],
      accessibilityNeeds: [],
      contentTypes: Array.isArray(contentTypes) ? contentTypes.map(c => c as ContentCategory) : [contentTypes as ContentCategory],
      preferredMediaTypes: ['image', 'text']
    };

    const cachedContent = await contextualContentService.getCachedContentForLocation(
      location,
      filter,
      parseInt(radius as string)
    );

    res.json({
      success: true,
      data: {
        location,
        radius: parseInt(radius as string),
        content: cachedContent,
        totalItems: cachedContent.length
      }
    });

  } catch (error) {
    console.error('Error getting cached content:', error);
    res.status(500).json({
      error: 'Failed to get cached content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test content accuracy and timing
 */
router.post('/test-accuracy', async (req, res) => {
  try {
    const { testLocation, expectedContentIds, context } = req.body;

    if (!testLocation || !expectedContentIds || !Array.isArray(expectedContentIds)) {
      return res.status(400).json({
        error: 'Missing required fields: testLocation, expectedContentIds (array)'
      });
    }

    const testContext = {
      location: testLocation,
      timeOfDay: context?.timeOfDay || getCurrentTimeOfDay(),
      weather: context?.weather,
      crowdLevel: context?.crowdLevel,
      userActivity: context?.userActivity,
      connectionQuality: context?.connectionQuality || 'good',
      batteryLevel: context?.batteryLevel
    };

    const testResults = await contextualContentService.testContentAccuracy(
      testLocation,
      expectedContentIds,
      testContext
    );

    res.json({
      success: true,
      data: testResults
    });

  } catch (error) {
    console.error('Error testing content accuracy:', error);
    res.status(500).json({
      error: 'Failed to test content accuracy',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get content by category and location
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { 
      latitude, 
      longitude, 
      radius = 1000,
      language = 'en'
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required parameters: latitude and longitude'
      });
    }

    if (!Object.values(ContentCategory).includes(category as ContentCategory)) {
      return res.status(400).json({
        error: 'Invalid category',
        validCategories: Object.values(ContentCategory)
      });
    }

    const location: GeoLocation = {
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      timestamp: new Date()
    };

    const content = await contextualContentService.getContentByCategory(
      category as ContentCategory,
      location,
      language as string,
      parseInt(radius as string)
    );

    res.json({
      success: true,
      data: {
        category,
        location,
        radius: parseInt(radius as string),
        content,
        totalItems: content.length
      }
    });

  } catch (error) {
    console.error('Error getting content by category:', error);
    res.status(500).json({
      error: 'Failed to get content by category',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to get current time of day
function getCurrentTimeOfDay(): string {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export default router;