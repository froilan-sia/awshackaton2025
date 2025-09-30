import { Router, Request, Response } from 'express';
import { WeatherService } from '../services/weatherService';
import { WeatherRecommendationService } from '../services/weatherRecommendationService';
import { WeatherAlertService } from '../services/weatherAlertService';

const router = Router();

// Initialize services
const weatherService = new WeatherService();
const recommendationService = new WeatherRecommendationService();
const alertService = new WeatherAlertService(weatherService, recommendationService);

// Start alert monitoring
alertService.startAlertMonitoring();

/**
 * GET /weather/current
 * Get current weather conditions
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;
    
    const latitude = lat ? parseFloat(lat as string) : 22.3193; // Default to Hong Kong
    const longitude = lon ? parseFloat(lon as string) : 114.1694;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude parameters'
      });
    }

    const currentWeather = await weatherService.getCurrentWeather(latitude, longitude);
    
    res.json({
      success: true,
      data: currentWeather
    });
  } catch (error) {
    console.error('Error fetching current weather:', error);
    res.status(500).json({
      error: 'Failed to fetch current weather data'
    });
  }
});

/**
 * GET /weather/forecast
 * Get weather forecast
 */
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const { lat, lon, days } = req.query;
    
    const latitude = lat ? parseFloat(lat as string) : 22.3193;
    const longitude = lon ? parseFloat(lon as string) : 114.1694;
    const forecastDays = days ? parseInt(days as string) : 5;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude parameters'
      });
    }

    if (isNaN(forecastDays) || forecastDays < 1 || forecastDays > 5) {
      return res.status(400).json({
        error: 'Days parameter must be between 1 and 5'
      });
    }

    const forecast = await weatherService.getWeatherForecast(latitude, longitude, forecastDays);
    
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    res.status(500).json({
      error: 'Failed to fetch weather forecast data'
    });
  }
});

/**
 * GET /weather/recommendations
 * Get weather-based activity recommendations
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;
    
    const latitude = lat ? parseFloat(lat as string) : 22.3193;
    const longitude = lon ? parseFloat(lon as string) : 114.1694;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude parameters'
      });
    }

    const currentWeather = await weatherService.getCurrentWeather(latitude, longitude);
    const forecast = await weatherService.getWeatherForecast(latitude, longitude, 5);
    const alerts = await weatherService.getWeatherAlerts(currentWeather, forecast);

    const recommendations = recommendationService.generateWeatherBasedRecommendations(
      currentWeather,
      forecast,
      alerts
    );
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error generating weather recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate weather-based recommendations'
    });
  }
});

/**
 * GET /weather/alerts
 * Get active weather alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;
    
    const latitude = lat ? parseFloat(lat as string) : undefined;
    const longitude = lon ? parseFloat(lon as string) : undefined;

    if ((latitude && isNaN(latitude)) || (longitude && isNaN(longitude))) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude parameters'
      });
    }

    const alerts = alertService.getActiveAlerts(latitude, longitude);
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching weather alerts:', error);
    res.status(500).json({
      error: 'Failed to fetch weather alerts'
    });
  }
});

/**
 * GET /weather/activity-suitability/:activityType
 * Get weather suitability for specific activity
 */
router.get('/activity-suitability/:activityType', async (req: Request, res: Response) => {
  try {
    const { activityType } = req.params;
    const { lat, lon } = req.query;
    
    const latitude = lat ? parseFloat(lat as string) : 22.3193;
    const longitude = lon ? parseFloat(lon as string) : 114.1694;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude parameters'
      });
    }

    const currentWeather = await weatherService.getCurrentWeather(latitude, longitude);
    const forecast = await weatherService.getWeatherForecast(latitude, longitude, 1);
    const alerts = await weatherService.getWeatherAlerts(currentWeather, forecast);

    const recommendations = recommendationService.generateWeatherBasedRecommendations(
      currentWeather,
      forecast,
      alerts
    );

    const activitySuitability = recommendations.activitySuitability.find(
      activity => activity.activityType === activityType
    );

    if (!activitySuitability) {
      return res.status(404).json({
        error: `Activity type '${activityType}' not found`
      });
    }

    const alternatives = recommendationService.getActivityAlternatives(
      activityType,
      activitySuitability.suitabilityScore
    );

    res.json({
      success: true,
      data: {
        ...activitySuitability,
        alternatives,
        currentWeather: {
          temperature: currentWeather.temperature,
          conditions: currentWeather.conditions[0]?.description || 'Unknown',
          windSpeed: currentWeather.windSpeed,
          humidity: currentWeather.humidity
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity suitability:', error);
    res.status(500).json({
      error: 'Failed to fetch activity weather suitability'
    });
  }
});

/**
 * POST /weather/alerts/subscribe
 * Subscribe to weather alerts
 */
router.post('/alerts/subscribe', async (req: Request, res: Response) => {
  try {
    const { userId, alertTypes, location } = req.body;

    if (!userId || !alertTypes || !location) {
      return res.status(400).json({
        error: 'Missing required fields: userId, alertTypes, location'
      });
    }

    if (!Array.isArray(alertTypes) || alertTypes.length === 0) {
      return res.status(400).json({
        error: 'alertTypes must be a non-empty array'
      });
    }

    if (!location.lat || !location.lon) {
      return res.status(400).json({
        error: 'Location must include lat and lon coordinates'
      });
    }

    // In a real implementation, you'd store this subscription in a database
    // and implement a proper notification system (push notifications, webhooks, etc.)
    alertService.subscribe({
      userId,
      alertTypes,
      location,
      callback: (alert) => {
        console.log(`Alert for user ${userId}:`, alert);
        // Here you would send push notification, email, etc.
      }
    });

    res.json({
      success: true,
      message: 'Successfully subscribed to weather alerts'
    });
  } catch (error) {
    console.error('Error subscribing to weather alerts:', error);
    res.status(500).json({
      error: 'Failed to subscribe to weather alerts'
    });
  }
});

/**
 * DELETE /weather/alerts/unsubscribe/:userId
 * Unsubscribe from weather alerts
 */
router.delete('/alerts/unsubscribe/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    alertService.unsubscribe(userId);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from weather alerts'
    });
  } catch (error) {
    console.error('Error unsubscribing from weather alerts:', error);
    res.status(500).json({
      error: 'Failed to unsubscribe from weather alerts'
    });
  }
});

export default router;