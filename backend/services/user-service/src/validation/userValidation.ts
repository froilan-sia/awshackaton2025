import Joi from 'joi';
import { BudgetRange, GroupType, ActivityLevel, WeatherPreference } from '../types/user';

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required'
    }),
  language: Joi.string()
    .valid('en', 'zh-HK', 'zh-CN', 'ja', 'ko', 'es', 'fr', 'de')
    .optional()
    .default('en')
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password must not exceed 128 characters',
      'any.required': 'New password is required'
    })
});

export const updateProfileSchema = Joi.object({
  language: Joi.string()
    .valid('en', 'zh-HK', 'zh-CN', 'ja', 'ko', 'es', 'fr', 'de')
    .optional(),
  preferences: Joi.object({
    interests: Joi.array()
      .items(Joi.string())
      .optional(),
    budgetRange: Joi.string()
      .valid(...Object.values(BudgetRange))
      .optional(),
    groupType: Joi.string()
      .valid(...Object.values(GroupType))
      .optional(),
    dietaryRestrictions: Joi.array()
      .items(Joi.string())
      .optional(),
    activityLevel: Joi.string()
      .valid(...Object.values(ActivityLevel))
      .optional(),
    weatherPreferences: Joi.array()
      .items(Joi.string().valid(...Object.values(WeatherPreference)))
      .optional()
  }).optional(),
  accessibilityNeeds: Joi.object({
    mobilityAssistance: Joi.boolean().optional(),
    visualAssistance: Joi.boolean().optional(),
    hearingAssistance: Joi.boolean().optional(),
    cognitiveAssistance: Joi.boolean().optional(),
    specificNeeds: Joi.array()
      .items(Joi.string())
      .optional()
  }).optional()
});

export const updatePreferencesSchema = Joi.object({
  interests: Joi.array()
    .items(Joi.string())
    .optional(),
  budgetRange: Joi.string()
    .valid(...Object.values(BudgetRange))
    .optional(),
  groupType: Joi.string()
    .valid(...Object.values(GroupType))
    .optional(),
  dietaryRestrictions: Joi.array()
    .items(Joi.string())
    .optional(),
  activityLevel: Joi.string()
    .valid(...Object.values(ActivityLevel))
    .optional(),
  weatherPreferences: Joi.array()
    .items(Joi.string().valid(...Object.values(WeatherPreference)))
    .optional()
});

export const updateAccessibilitySchema = Joi.object({
  mobilityAssistance: Joi.boolean().optional(),
  visualAssistance: Joi.boolean().optional(),
  hearingAssistance: Joi.boolean().optional(),
  cognitiveAssistance: Joi.boolean().optional(),
  specificNeeds: Joi.array()
    .items(Joi.string())
    .optional()
});

export const addTravelRecordSchema = Joi.object({
  destination: Joi.string()
    .required()
    .messages({
      'any.required': 'Destination is required'
    }),
  startDate: Joi.date()
    .required()
    .messages({
      'any.required': 'Start date is required'
    }),
  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .required()
    .messages({
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required'
    }),
  activities: Joi.array()
    .items(Joi.string())
    .optional()
    .default([]),
  ratings: Joi.array()
    .items(Joi.object({
      activityId: Joi.string().required(),
      rating: Joi.number().min(1).max(5).required(),
      feedback: Joi.string().optional(),
      timestamp: Joi.date().optional().default(Date.now)
    }))
    .optional()
    .default([])
});

export const languageSchema = Joi.object({
  language: Joi.string()
    .valid('en', 'zh-HK', 'zh-CN', 'ja', 'ko', 'es', 'fr', 'de')
    .required()
    .messages({
      'any.required': 'Language is required',
      'any.only': 'Language must be one of: en, zh-HK, zh-CN, ja, ko, es, fr, de'
    })
});