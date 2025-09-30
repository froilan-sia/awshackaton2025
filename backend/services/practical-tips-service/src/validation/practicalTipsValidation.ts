import Joi from 'joi';
import { TipCategory, Priority, VenueType, WeatherCondition } from '../types/practicalTips';

export const createTipSchema = Joi.object({
  category: Joi.string().valid(...Object.values(TipCategory)).required(),
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).max(2000).required(),
  priority: Joi.string().valid(...Object.values(Priority)).required(),
  conditions: Joi.array().items(Joi.object({
    type: Joi.string().valid('location', 'weather', 'time', 'venue', 'user_profile').required(),
    value: Joi.any().required(),
    operator: Joi.string().valid('equals', 'contains', 'greater_than', 'less_than', 'in_range').required()
  })).default([]),
  applicableVenues: Joi.array().items(Joi.string().valid(...Object.values(VenueType))).default([]),
  weatherConditions: Joi.array().items(Joi.string().valid(...Object.values(WeatherCondition))).default([]),
  language: Joi.string().min(2).max(5).default('en'),
  tags: Joi.array().items(Joi.string().min(1).max(50)).default([])
});

export const updateTipSchema = Joi.object({
  category: Joi.string().valid(...Object.values(TipCategory)),
  title: Joi.string().min(1).max(200),
  content: Joi.string().min(1).max(2000),
  priority: Joi.string().valid(...Object.values(Priority)),
  conditions: Joi.array().items(Joi.object({
    type: Joi.string().valid('location', 'weather', 'time', 'venue', 'user_profile').required(),
    value: Joi.any().required(),
    operator: Joi.string().valid('equals', 'contains', 'greater_than', 'less_than', 'in_range').required()
  })),
  applicableVenues: Joi.array().items(Joi.string().valid(...Object.values(VenueType))),
  weatherConditions: Joi.array().items(Joi.string().valid(...Object.values(WeatherCondition))),
  language: Joi.string().min(2).max(5),
  tags: Joi.array().items(Joi.string().min(1).max(50))
});

export const contextualTipRequestSchema = Joi.object({
  userId: Joi.string().optional(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    venueType: Joi.string().valid(...Object.values(VenueType)).optional(),
    venueName: Joi.string().max(200).optional()
  }).required(),
  weather: Joi.object({
    condition: Joi.string().valid(...Object.values(WeatherCondition)).required(),
    temperature: Joi.number().min(-50).max(60).required(),
    humidity: Joi.number().min(0).max(100).required(),
    windSpeed: Joi.number().min(0).max(200).required()
  }).optional(),
  userProfile: Joi.object({
    interests: Joi.array().items(Joi.string().max(100)).default([]),
    accessibilityNeeds: Joi.array().items(Joi.string().max(100)).default([]),
    language: Joi.string().min(2).max(5).default('en'),
    groupType: Joi.string().valid('solo', 'couple', 'family', 'group').default('solo')
  }).optional(),
  timeOfDay: Joi.string().valid('morning', 'afternoon', 'evening', 'night').required(),
  categories: Joi.array().items(Joi.string().valid(...Object.values(TipCategory))).optional()
});

export const weatherRecommendationSchema = Joi.object({
  weatherCondition: Joi.string().valid(...Object.values(WeatherCondition)).required(),
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(1).max(1000).required(),
  items: Joi.array().items(Joi.string().min(1).max(200)).default([]),
  clothing: Joi.array().items(Joi.string().min(1).max(200)).default([]),
  precautions: Joi.array().items(Joi.string().min(1).max(300)).default([]),
  alternatives: Joi.array().items(Joi.string().min(1).max(300)).default([]),
  priority: Joi.string().valid(...Object.values(Priority)).required()
});

export const culturalEtiquetteSchema = Joi.object({
  venueType: Joi.string().valid(...Object.values(VenueType)).required(),
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(1).max(1000).required(),
  dosList: Joi.array().items(Joi.string().min(1).max(300)).default([]),
  dontsList: Joi.array().items(Joi.string().min(1).max(300)).default([]),
  dresscode: Joi.string().max(500).optional(),
  behaviorGuidelines: Joi.array().items(Joi.string().min(1).max(300)).default([]),
  commonMistakes: Joi.array().items(Joi.string().min(1).max(300)).default([]),
  localCustoms: Joi.array().items(Joi.string().min(1).max(300)).default([]),
  language: Joi.string().min(2).max(5).default('en')
});

export const locationBasedTipSchema = Joi.object({
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(1).max(10000).required(),
    name: Joi.string().min(1).max(200).required(),
    venueType: Joi.string().valid(...Object.values(VenueType)).required()
  }).required(),
  tips: Joi.array().items(Joi.object()).min(1).required(),
  triggerConditions: Joi.array().items(Joi.object({
    type: Joi.string().valid('location', 'weather', 'time', 'venue', 'user_profile').required(),
    value: Joi.any().required(),
    operator: Joi.string().valid('equals', 'contains', 'greater_than', 'less_than', 'in_range').required()
  })).default([]),
  isActive: Joi.boolean().default(true)
});

export const validateCreateTip = (data: any) => {
  return createTipSchema.validate(data);
};

export const validateUpdateTip = (data: any) => {
  return updateTipSchema.validate(data);
};

export const validateContextualTipRequest = (data: any) => {
  return contextualTipRequestSchema.validate(data);
};

export const validateWeatherRecommendation = (data: any) => {
  return weatherRecommendationSchema.validate(data);
};

export const validateCulturalEtiquette = (data: any) => {
  return culturalEtiquetteSchema.validate(data);
};

export const validateLocationBasedTip = (data: any) => {
  return locationBasedTipSchema.validate(data);
};