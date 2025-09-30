import Joi from 'joi';

export const residentRegistrationSchema = Joi.object({
  userId: Joi.string().required(),
  verificationProof: Joi.array().items(Joi.string()).min(1).required(),
  yearsInHongKong: Joi.number().integer().min(1).max(100).required(),
  districts: Joi.array().items(Joi.string()).min(1).required(),
  languages: Joi.array().items(Joi.string()).min(1).required(),
  specialties: Joi.array().items(Joi.string()).min(1).required()
});

export const insightCreationSchema = Joi.object({
  authorId: Joi.string().required(),
  locationId: Joi.string().required(),
  locationType: Joi.string().valid('attraction', 'restaurant', 'district', 'activity').required(),
  title: Joi.string().min(10).max(200).required(),
  content: Joi.string().min(50).max(2000).required(),
  category: Joi.string().valid(
    'hidden_gem',
    'tourist_trap_warning',
    'local_favorite',
    'cultural_context',
    'practical_tip',
    'food_recommendation',
    'timing_advice',
    'etiquette_guide'
  ).required(),
  tags: Joi.array().items(Joi.string()).max(10).required(),
  localRating: Joi.number().min(1).max(5).required(),
  touristTrapWarning: Joi.boolean().optional(),
  bestTimeToVisit: Joi.string().max(200).optional(),
  localTips: Joi.array().items(Joi.string().max(500)).max(10).required(),
  culturalContext: Joi.string().max(1000).optional(),
  language: Joi.string().required()
});

export const insightUpdateSchema = Joi.object({
  title: Joi.string().min(10).max(200).optional(),
  content: Joi.string().min(50).max(2000).optional(),
  tags: Joi.array().items(Joi.string()).max(10).optional(),
  localTips: Joi.array().items(Joi.string().max(500)).max(10).optional(),
  culturalContext: Joi.string().max(1000).optional()
});

export const touristReviewSchema = Joi.object({
  authorId: Joi.string().required(),
  locationId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  content: Joi.string().min(20).max(1000).required(),
  visitDate: Joi.date().max('now').required(),
  groupType: Joi.string().valid('solo', 'couple', 'family', 'friends', 'business').required(),
  nationality: Joi.string().optional(),
  language: Joi.string().required()
});

export const insightFilterSchema = Joi.object({
  category: Joi.string().valid(
    'hidden_gem',
    'tourist_trap_warning',
    'local_favorite',
    'cultural_context',
    'practical_tip',
    'food_recommendation',
    'timing_advice',
    'etiquette_guide'
  ).optional(),
  locationId: Joi.string().optional(),
  locationType: Joi.string().valid('attraction', 'restaurant', 'district', 'activity').optional(),
  language: Joi.string().optional(),
  minAuthenticityScore: Joi.number().min(0).max(100).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  authorVerified: Joi.boolean().optional()
});

export const residentUpdateSchema = Joi.object({
  districts: Joi.array().items(Joi.string()).min(1).optional(),
  languages: Joi.array().items(Joi.string()).min(1).optional(),
  specialties: Joi.array().items(Joi.string()).min(1).optional()
});

export const verificationStatusSchema = Joi.object({
  status: Joi.string().valid('verified', 'rejected').required()
});

export const moderationActionSchema = Joi.object({
  action: Joi.string().valid('approve', 'remove').required()
});

export const reportSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required()
});

// Validation helper functions
export const validateResidentRegistration = (data: any) => {
  return residentRegistrationSchema.validate(data);
};

export const validateInsightCreation = (data: any) => {
  return insightCreationSchema.validate(data);
};

export const validateInsightUpdate = (data: any) => {
  return insightUpdateSchema.validate(data);
};

export const validateTouristReview = (data: any) => {
  return touristReviewSchema.validate(data);
};

export const validateInsightFilter = (data: any) => {
  return insightFilterSchema.validate(data);
};

export const validateResidentUpdate = (data: any) => {
  return residentUpdateSchema.validate(data);
};

export const validateVerificationStatus = (data: any) => {
  return verificationStatusSchema.validate(data);
};

export const validateModerationAction = (data: any) => {
  return moderationActionSchema.validate(data);
};

export const validateReport = (data: any) => {
  return reportSchema.validate(data);
};