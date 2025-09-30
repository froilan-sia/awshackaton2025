import request from 'supertest';
import express from 'express';
import weatherRoutes from '../../src/routes/weather';

// Mock the services
jest.mock('../../src/services/weatherService', () => ({
  WeatherService: jest.fn().mockImplementation(() => ({
    getCurrentWeather: jest.fn().mockResolvedValue({
      location: 'Hong Kong',
      temperature: 25,
      feelsLike: 27,
      humidity: 65,
      pressure: 1013,
      visibility: 10,
      windSpeed: 5,
      windDirection: 180,
      conditions: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
      timestamp: new Date()
    }),
    getWeatherForecast: jest.fn().mockResolvedValue([{
      date: new Date(),
      temperature: { min: 22, max: 28, morning: 23, day: 26, evening: 25, night: 22 },
      conditions: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
      humidity: 65,
      windSpeed: 5,
      precipitationChance: 10,
      precipitationAmount: 0
    }]),
    getWeatherAlerts: jest.fn().mockResolvedValue([])
  }))
}));

jest.mock('../../src/services/weatherRecommendationService', () => ({
  WeatherRecommendationService: jest.fn().mockImplementation(() => ({
    generateWeatherBasedRecommendations: jest.fn().mockReturnValue({
      currentWeather: {},
      forecast: [],
      alerts: [],
      activitySuitability: [{
        activityType: 'outdoor_hiking',
        suitabilityScore: 75,
        conditions: ['Temperature: 25°C'],
        recommendations: ['Perfect weather for hiking']
      }],
      generalRecommendations: ['Great weather today']
    }),
    getActivityAlternatives: jest.fn().mockReturnValue([])
  }))
}));

jest.mock('../../src/services/weatherAlertService', () => ({
  WeatherAlertService: jest.fn().mockImplementation(() => ({
    startAlertMonitoring: jest.fn(),
    getActiveAlerts: jest.fn().mockReturnValue([]),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }))
}));

const app = express();
app.use(express.json());
app.use('/api/weather', weatherRoutes);

describe('Weather Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/weather/current', () => {
    it('should return current weather data', async () => {
      const response = await request(app)
        .get('/api/weather/current')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should accept lat/lon parameters', async () => {
      const response = await request(app)
        .get('/api/weather/current?lat=22.3193&lon=114.1694')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/weather/current?lat=invalid&lon=114.1694')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid latitude or longitude parameters');
    });
  });

  describe('GET /api/weather/forecast', () => {
    it('should return weather forecast data', async () => {
      const response = await request(app)
        .get('/api/weather/forecast')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should accept days parameter', async () => {
      const response = await request(app)
        .get('/api/weather/forecast?days=3')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid days parameter', async () => {
      const response = await request(app)
        .get('/api/weather/forecast?days=10')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Days parameter must be between 1 and 5');
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/weather/forecast?lat=invalid&lon=114.1694')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid latitude or longitude parameters');
    });
  });

  describe('GET /api/weather/recommendations', () => {
    it('should return weather-based recommendations', async () => {
      const response = await request(app)
        .get('/api/weather/recommendations')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should accept lat/lon parameters', async () => {
      const response = await request(app)
        .get('/api/weather/recommendations?lat=22.3193&lon=114.1694')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/weather/recommendations?lat=invalid&lon=114.1694')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid latitude or longitude parameters');
    });
  });

  describe('GET /api/weather/alerts', () => {
    it('should return active weather alerts', async () => {
      const response = await request(app)
        .get('/api/weather/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should accept optional lat/lon parameters', async () => {
      const response = await request(app)
        .get('/api/weather/alerts?lat=22.3193&lon=114.1694')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/weather/alerts?lat=invalid&lon=114.1694')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid latitude or longitude parameters');
    });
  });

  describe('GET /api/weather/activity-suitability/:activityType', () => {
    it('should return activity suitability data', async () => {
      const response = await request(app)
        .get('/api/weather/activity-suitability/outdoor_hiking')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('activityType', 'outdoor_hiking');
      expect(response.body.data).toHaveProperty('suitabilityScore');
      expect(response.body.data).toHaveProperty('currentWeather');
    });

    it('should return 404 for unknown activity type', async () => {
      const response = await request(app)
        .get('/api/weather/activity-suitability/unknown_activity')
        .expect(404);

      expect(response.body).toHaveProperty('error', "Activity type 'unknown_activity' not found");
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/weather/activity-suitability/outdoor_hiking?lat=invalid&lon=114.1694')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid latitude or longitude parameters');
    });
  });

  describe('POST /api/weather/alerts/subscribe', () => {
    it('should subscribe user to weather alerts', async () => {
      const subscriptionData = {
        userId: 'user123',
        alertTypes: ['extreme_heat', 'heavy_rain'],
        location: { lat: 22.3193, lon: 114.1694 }
      };

      const response = await request(app)
        .post('/api/weather/alerts/subscribe')
        .send(subscriptionData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Successfully subscribed to weather alerts');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        userId: 'user123'
        // Missing alertTypes and location
      };

      const response = await request(app)
        .post('/api/weather/alerts/subscribe')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields: userId, alertTypes, location');
    });

    it('should return 400 for invalid alertTypes', async () => {
      const invalidData = {
        userId: 'user123',
        alertTypes: [], // Empty array
        location: { lat: 22.3193, lon: 114.1694 }
      };

      const response = await request(app)
        .post('/api/weather/alerts/subscribe')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'alertTypes must be a non-empty array');
    });

    it('should return 400 for invalid location', async () => {
      const invalidData = {
        userId: 'user123',
        alertTypes: ['extreme_heat'],
        location: { lat: 22.3193 } // Missing lon
      };

      const response = await request(app)
        .post('/api/weather/alerts/subscribe')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Location must include lat and lon coordinates');
    });
  });

  describe('DELETE /api/weather/alerts/unsubscribe/:userId', () => {
    it('should unsubscribe user from weather alerts', async () => {
      const response = await request(app)
        .delete('/api/weather/alerts/unsubscribe/user123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Successfully unsubscribed from weather alerts');
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      const WeatherService = require('../../src/services/weatherService').WeatherService;
      WeatherService.prototype.getCurrentWeather = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/weather/current')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to fetch current weather data');
    });
  });
});