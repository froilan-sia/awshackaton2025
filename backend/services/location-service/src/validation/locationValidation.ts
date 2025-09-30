import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { PrivacyLevel, LocationSource, ContentCategory } from '../types/location';

const locationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().min(0).optional(),
  altitude: Joi.number().optional(),
  heading: Joi.number().min(0).max(360).optional(),
  speed: Joi.number().min(0).optional()
});

const locationUpdateSchema = Joi.object({
  location: locationSchema.required(),
  source: Joi.string().valid(...Object.values(LocationSource)).required(),
  privacyLevel: Joi.string().valid(...Object.values(PrivacyLevel)).optional(),
  preferences: Joi.array().items(Joi.string()).optional(),
  language: Joi.string().optional()
});

const locationPreferencesSchema = Joi.object({
  trackingEnabled: Joi.boolean().optional(),
  privacyLevel: Joi.string().valid(...Object.values(PrivacyLevel)).optional(),
  shareLocation: Joi.boolean().optional(),
  contentNotifications: Joi.boolean().optional(),
  geofenceRadius: Joi.number().min(10).max(1000).optional(),
  updateFrequency: Joi.number().min(10).max(300).optional()
});

const geofenceSchema = Joi.object({
  name: Joi.string().required(),
  center: locationSchema.required(),
  radius: Joi.number().min(1).max(10000).required(),
  contentId: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

const locationContentSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  content: Joi.string().required(),
  mediaUrls: Joi.array().items(Joi.string().uri()).optional(),
  language: Joi.string().default('en'),
  category: Joi.string().valid(...Object.values(ContentCategory)).required(),
  priority: Joi.number().min(1).max(10).default(5),
  isActive: Joi.boolean().default(true)
});

export const validateLocationUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { error } = locationUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  
  next();
};

export const validateLocationPreferences = (req: Request, res: Response, next: NextFunction) => {
  const { error } = locationPreferencesSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  
  next();
};

export const validateGeofence = (req: Request, res: Response, next: NextFunction) => {
  const { error } = geofenceSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  
  next();
};

export const validateLocationContent = (req: Request, res: Response, next: NextFunction) => {
  const { error } = locationContentSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  
  next();
};

export const validateLocationData = (location: any): { isValid: boolean; errors?: string[] } => {
  const { error } = locationSchema.validate(location);
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
};