import Joi from 'joi';

export const crowdRequestSchema = Joi.object({
  locationIds: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one location ID is required',
      'array.max': 'Maximum 50 location IDs allowed',
      'any.required': 'Location IDs are required'
    })
});

export const routePointSchema = Joi.object({
  locationId: Joi.string().required(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).required(),
  estimatedArrivalTime: Joi.date().required(),
  estimatedDuration: Joi.number().min(0).max(1440).required(), // Max 24 hours
  crowdLevel: Joi.string().valid('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH').optional()
});

export const routeOptimizationSchema = Joi.object({
  userId: Joi.string().required(),
  route: Joi.array()
    .items(routePointSchema)
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one route point is required',
      'array.max': 'Maximum 20 route points allowed'
    })
});

export const subscriptionSchema = Joi.object({
  userId: Joi.string().required(),
  locationIds: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .max(100)
    .required()
});

export const crowdDataUpdateSchema = Joi.object({
  locationId: Joi.string().required(),
  locationName: Joi.string().optional(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).optional(),
  crowdLevel: Joi.string().valid('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH').optional(),
  estimatedWaitTime: Joi.number().min(0).max(600).optional(), // Max 10 hours
  capacity: Joi.number().min(1).max(1000000).optional(),
  currentOccupancy: Joi.number().min(0).optional(),
  dataSource: Joi.string().valid('MOCK', 'GOOGLE_PLACES', 'SOCIAL_MEDIA', 'SENSOR_DATA', 'USER_REPORTS').optional(),
  confidence: Joi.number().min(0).max(1).optional()
});

export function validateCrowdRequest(data: any) {
  return crowdRequestSchema.validate(data);
}

export function validateRouteOptimization(data: any) {
  return routeOptimizationSchema.validate(data);
}

export function validateSubscription(data: any) {
  return subscriptionSchema.validate(data);
}

export function validateCrowdDataUpdate(data: any) {
  return crowdDataUpdateSchema.validate(data);
}