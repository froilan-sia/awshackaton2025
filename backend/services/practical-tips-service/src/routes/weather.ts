import { Router, Request, Response } from 'express';
import { WeatherRecommendationService } from '../services/weatherRecommendationService';
import { validateWeatherRecommendation } from '../validation/practicalTipsValidation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { WeatherCondition } from '../types/practicalTips';

const router = Router();
const weatherRecommendationService = new WeatherRecommendationService();

// Get weather-specific recommendations
router.get('/recommendations/:condition', asyncHandler(async (req: Request, res: Response) => {
  const { condition } = req.params;
  const { temperature, humidity } = req.query;

  if (!Object.values(WeatherCondition).includes(condition as WeatherCondition)) {
    throw createError('Invalid weather condition', 400);
  }

  const recommendations = await weatherRecommendationService.getRecommendationsForWeather(
    condition as WeatherCondition,
    temperature ? Number(temperature) : undefined,
    humidity ? Number(humidity) : undefined
  );

  res.json({ recommendations });
}));

// Get comprehensive weather preparation advice
router.post('/preparation-advice', asyncHandler(async (req: Request, res: Response) => {
  const { currentWeather, forecastWeather, activityType } = req.body;

  if (!currentWeather || !Object.values(WeatherCondition).includes(currentWeather)) {
    throw createError('Valid current weather condition is required', 400);
  }

  if (forecastWeather && !Array.isArray(forecastWeather)) {
    throw createError('Forecast weather must be an array', 400);
  }

  const advice = await weatherRecommendationService.getWeatherPreparationAdvice(
    currentWeather,
    forecastWeather || [],
    activityType
  );

  res.json(advice);
}));

// Create weather recommendation
router.post('/recommendations', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = validateWeatherRecommendation(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const recommendation = await weatherRecommendationService.createWeatherRecommendation(value);
  res.status(201).json(recommendation);
}));

// Get all weather recommendations
router.get('/recommendations', asyncHandler(async (req: Request, res: Response) => {
  const recommendations = await weatherRecommendationService.getAllWeatherRecommendations();
  res.json({ recommendations });
}));

// Update weather recommendation
router.put('/recommendations/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = validateWeatherRecommendation(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const recommendation = await weatherRecommendationService.updateWeatherRecommendation(id, value);
  
  if (!recommendation) {
    throw createError('Weather recommendation not found', 404);
  }
  
  res.json(recommendation);
}));

// Delete weather recommendation
router.delete('/recommendations/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await weatherRecommendationService.deleteWeatherRecommendation(id);
  
  if (!deleted) {
    throw createError('Weather recommendation not found', 404);
  }
  
  res.status(204).send();
}));

export default router;