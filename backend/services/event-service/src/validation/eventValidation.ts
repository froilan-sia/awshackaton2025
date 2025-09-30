import Joi from 'joi';
import { EventCategory, EventSource } from '../types/event';

export const eventFiltersSchema = Joi.object({
  categories: Joi.array().items(Joi.string().valid(...Object.values(EventCategory))),
  sources: Joi.array().items(Joi.string().valid(...Object.values(EventSource))),
  districts: Joi.array().items(Joi.string()),
  dateRange: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().min(Joi.ref('start')).required()
  }),
  isFree: Joi.boolean(),
  weatherDependent: Joi.boolean(),
  targetAudience: Joi.array().items(Joi.string()),
  maxDistance: Joi.number().positive(),
  userLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  })
});

export const userPreferencesSchema = Joi.object({
  interests: Joi.array().items(Joi.string()).required(),
  budgetRange: Joi.string().valid('low', 'medium', 'high').required(),
  groupType: Joi.string().valid('solo', 'couple', 'family', 'friends').required(),
  ageGroup: Joi.string().valid('child', 'adult', 'senior').required(),
  language: Joi.string().required(),
  accessibilityNeeds: Joi.array().items(Joi.string())
});

export const recommendationRequestSchema = Joi.object({
  userPreferences: userPreferencesSchema.required(),
  filters: eventFiltersSchema,
  limit: Joi.number().integer().positive().max(100).default(20)
});

export const coordinatesSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required()
});

export const nearbyEventsQuerySchema = Joi.object({
  radius: Joi.number().positive().max(50).default(5),
  limit: Joi.number().integer().positive().max(50).default(10)
});

export const searchQuerySchema = Joi.object({
  limit: Joi.number().integer().positive().max(100).default(20)
});

export const validateEventFilters = (filters: any) => {
  const { error, value } = eventFiltersSchema.validate(filters);
  if (error) {
    throw new Error(`Invalid event filters: ${error.details[0].message}`);
  }
  return value;
};

export const validateUserPreferences = (preferences: any) => {
  const { error, value } = userPreferencesSchema.validate(preferences);
  if (error) {
    throw new Error(`Invalid user preferences: ${error.details[0].message}`);
  }
  return value;
};

export const validateRecommendationRequest = (request: any) => {
  const { error, value } = recommendationRequestSchema.validate(request);
  if (error) {
    throw new Error(`Invalid recommendation request: ${error.details[0].message}`);
  }
  return value;
};

export const validateCoordinates = (coords: any) => {
  const { error, value } = coordinatesSchema.validate(coords);
  if (error) {
    throw new Error(`Invalid coordinates: ${error.details[0].message}`);
  }
  return value;
};