import Joi from 'joi';
import { BusinessType, VisitType, TransportationMode } from '../types/sustainability';

export const businessVisitSchema = Joi.object({
  userId: Joi.string().required(),
  businessId: Joi.string().required(),
  duration: Joi.number().min(1).max(1440).required(), // 1 minute to 24 hours
  estimatedSpending: Joi.number().min(0).max(100000).required(),
  visitType: Joi.string().valid(...Object.values(VisitType)).required(),
  transportationMode: Joi.string().valid(...Object.values(TransportationMode)).required(),
  distance: Joi.number().min(0).max(1000).optional() // 0 to 1000km
});

export const localBusinessSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  type: Joi.string().valid(...Object.values(BusinessType)).required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    district: Joi.string().min(1).max(100).required(),
    address: Joi.string().min(1).max(500).required()
  }).required(),
  localOwnership: Joi.boolean().required(),
  employeesCount: Joi.number().min(0).max(10000).required(),
  certifications: Joi.array().items(Joi.string().max(100)).max(20).default([])
});

export const tripSummarySchema = Joi.object({
  userId: Joi.string().required(),
  tripId: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required()
});

export const ecoTransportRequestSchema = Joi.object({
  from: Joi.string().min(1).max(100).required(),
  to: Joi.string().min(1).max(100).required(),
  preferences: Joi.object({
    maxCost: Joi.number().min(0).max(10000).optional(),
    maxDuration: Joi.number().min(1).max(1440).optional(), // 1 minute to 24 hours
    prioritizeSustainability: Joi.boolean().optional()
  }).optional()
});

export const carbonFootprintCalculationSchema = Joi.object({
  transportModes: Joi.array().items(
    Joi.object({
      mode: Joi.string().valid(...Object.values(TransportationMode)).required(),
      distance: Joi.number().min(0).max(1000).required()
    })
  ).min(1).max(50).required()
});

export const userMetricsQuerySchema = Joi.object({
  userId: Joi.string().required(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional()
});

export const businessQuerySchema = Joi.object({
  district: Joi.string().min(1).max(100).optional(),
  limit: Joi.number().min(1).max(100).default(10)
});

export const validateBusinessVisit = (data: any) => {
  const { error, value } = businessVisitSchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};

export const validateLocalBusiness = (data: any) => {
  const { error, value } = localBusinessSchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};

export const validateTripSummary = (data: any) => {
  const { error, value } = tripSummarySchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};

export const validateEcoTransportRequest = (data: any) => {
  const { error, value } = ecoTransportRequestSchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};

export const validateCarbonFootprintCalculation = (data: any) => {
  const { error, value } = carbonFootprintCalculationSchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};

export const validateUserMetricsQuery = (data: any) => {
  const { error, value } = userMetricsQuerySchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};

export const validateBusinessQuery = (data: any) => {
  const { error, value } = businessQuerySchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};