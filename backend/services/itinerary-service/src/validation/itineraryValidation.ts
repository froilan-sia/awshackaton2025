import Joi from 'joi';

export const userPreferencesSchema = Joi.object({
  interests: Joi.array().items(Joi.string()).min(1).required(),
  budgetRange: Joi.object({
    min: Joi.number().min(0).required(),
    max: Joi.number().min(Joi.ref('min')).required(),
    currency: Joi.string().default('HKD')
  }).required(),
  groupType: Joi.string().valid('solo', 'couple', 'family', 'friends', 'business').required(),
  dietaryRestrictions: Joi.array().items(Joi.string()).default([]),
  activityLevel: Joi.string().valid('low', 'moderate', 'high').required(),
  accessibilityNeeds: Joi.array().items(Joi.string()).default([]),
  language: Joi.string().default('en')
});

export const geoLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  address: Joi.string().optional()
});

export const itineraryConstraintsSchema = Joi.object({
  maxDailyWalkingDistance: Joi.number().min(0).optional(),
  preferredStartTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  preferredEndTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  mustIncludeAttractions: Joi.array().items(Joi.string()).optional(),
  excludeAttractions: Joi.array().items(Joi.string()).optional(),
  transportationModes: Joi.array().items(
    Joi.string().valid('walking', 'mtr', 'bus', 'taxi', 'tram', 'ferry')
  ).optional()
});

export const itineraryRequestSchema = Joi.object({
  userId: Joi.string().required(),
  preferences: userPreferencesSchema.required(),
  startDate: Joi.date().min('now').required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  startLocation: geoLocationSchema.optional(),
  accommodationLocation: geoLocationSchema.optional(),
  constraints: itineraryConstraintsSchema.optional()
});

export const practicalTipSchema = Joi.object({
  category: Joi.string().valid('safety', 'etiquette', 'preparation', 'weather').required(),
  content: Joi.string().required(),
  conditions: Joi.array().items(Joi.string()).default([]),
  priority: Joi.string().valid('low', 'medium', 'high').required()
});

export const travelInfoSchema = Joi.object({
  mode: Joi.string().valid('walking', 'mtr', 'bus', 'taxi', 'tram', 'ferry').required(),
  duration: Joi.number().min(0).required(),
  distance: Joi.number().min(0).required(),
  cost: Joi.number().min(0).required(),
  instructions: Joi.array().items(Joi.string()).required()
});

export const itineraryActivitySchema = Joi.object({
  id: Joi.string().required(),
  attractionId: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  location: geoLocationSchema.required(),
  startTime: Joi.date().required(),
  endTime: Joi.date().min(Joi.ref('startTime')).required(),
  duration: Joi.number().min(1).required(),
  category: Joi.string().required(),
  estimatedCost: Joi.number().min(0).required(),
  weatherDependent: Joi.boolean().required(),
  practicalTips: Joi.array().items(practicalTipSchema).default([]),
  travelFromPrevious: travelInfoSchema.optional()
});

export const weatherInfoSchema = Joi.object({
  date: Joi.date().required(),
  temperature: Joi.object({
    min: Joi.number().required(),
    max: Joi.number().min(Joi.ref('min')).required()
  }).required(),
  humidity: Joi.number().min(0).max(100).required(),
  precipitation: Joi.number().min(0).required(),
  windSpeed: Joi.number().min(0).required(),
  condition: Joi.string().required(),
  description: Joi.string().required()
});

export const itineraryDaySchema = Joi.object({
  date: Joi.date().required(),
  activities: Joi.array().items(itineraryActivitySchema).required(),
  totalDuration: Joi.number().min(0).required(),
  totalWalkingDistance: Joi.number().min(0).required(),
  estimatedCost: Joi.number().min(0).required(),
  weatherForecast: weatherInfoSchema.optional()
});

export const weatherConsiderationSchema = Joi.object({
  date: Joi.date().required(),
  recommendation: Joi.string().required(),
  alternativeActivities: Joi.array().items(Joi.string()).default([]),
  preparationTips: Joi.array().items(Joi.string()).default([])
});

export const itinerarySchema = Joi.object({
  id: Joi.string().required(),
  userId: Joi.string().required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  days: Joi.array().items(itineraryDaySchema).min(1).required(),
  totalEstimatedCost: Joi.number().min(0).required(),
  totalWalkingDistance: Joi.number().min(0).required(),
  weatherConsiderations: Joi.array().items(weatherConsiderationSchema).default([]),
  createdAt: Joi.date().required(),
  updatedAt: Joi.date().required()
});

export const itineraryModificationSchema = Joi.object({
  type: Joi.string().valid(
    'add_activity', 
    'remove_activity', 
    'replace_activity', 
    'reschedule_activity', 
    'weather_adjustment', 
    'crowd_adjustment'
  ).required(),
  activityId: Joi.string().when('type', {
    is: Joi.valid('remove_activity', 'replace_activity', 'reschedule_activity'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  newActivity: Joi.object().when('type', {
    is: Joi.valid('add_activity', 'replace_activity', 'reschedule_activity'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  reason: Joi.string().required(),
  timestamp: Joi.date().required()
});

export const itineraryUpdateSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  days: Joi.array().items(itineraryDaySchema).optional(),
  weatherConsiderations: Joi.array().items(weatherConsiderationSchema).optional()
});

export const shareOptionsSchema = Joi.object({
  email: Joi.string().email().optional(),
  publicLink: Joi.boolean().default(false),
  permissions: Joi.array().items(Joi.string().valid('view', 'edit', 'comment')).default(['view'])
});

export const exportFormatSchema = Joi.string().valid('json', 'pdf', 'calendar').required();

// Validation helper functions
export const validateItineraryRequest = (data: any) => {
  return itineraryRequestSchema.validate(data, { abortEarly: false });
};

export const validateItinerary = (data: any) => {
  return itinerarySchema.validate(data, { abortEarly: false });
};

export const validateItineraryModification = (data: any) => {
  return itineraryModificationSchema.validate(data, { abortEarly: false });
};

export const validateItineraryUpdate = (data: any) => {
  return itineraryUpdateSchema.validate(data, { abortEarly: false });
};

export const validateShareOptions = (data: any) => {
  return shareOptionsSchema.validate(data, { abortEarly: false });
};

export const validateExportFormat = (data: any) => {
  return exportFormatSchema.validate(data);
};

// Custom validation functions
export const validateDateRange = (startDate: Date, endDate: Date): boolean => {
  const now = new Date();
  const maxDays = 30; // Maximum 30-day itinerary
  
  if (startDate < now) return false;
  if (endDate <= startDate) return false;
  
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > maxDays) return false;
  
  return true;
};

export const validateBudgetRange = (budgetRange: any): boolean => {
  if (!budgetRange || typeof budgetRange !== 'object') return false;
  if (budgetRange.min < 0 || budgetRange.max < 0) return false;
  if (budgetRange.min >= budgetRange.max) return false;
  if (budgetRange.max > 10000) return false; // Maximum HKD 10,000 per day
  
  return true;
};

export const validateGeoLocation = (location: any): boolean => {
  if (!location || typeof location !== 'object') return false;
  
  const { latitude, longitude } = location;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  
  // Check if location is within Hong Kong bounds (approximately)
  const hkBounds = {
    north: 22.5,
    south: 22.1,
    east: 114.5,
    west: 113.8
  };
  
  if (latitude < hkBounds.south || latitude > hkBounds.north) return false;
  if (longitude < hkBounds.west || longitude > hkBounds.east) return false;
  
  return true;
};

export const validateActivityTiming = (activities: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Sort activities by start time
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  
  // Check for overlaps
  for (let i = 0; i < sortedActivities.length - 1; i++) {
    const current = sortedActivities[i];
    const next = sortedActivities[i + 1];
    
    const currentEnd = new Date(current.endTime);
    const nextStart = new Date(next.startTime);
    
    if (currentEnd > nextStart) {
      errors.push(`Activity "${current.name}" overlaps with "${next.name}"`);
    }
    
    // Check for reasonable gaps (minimum 15 minutes for travel)
    const gap = nextStart.getTime() - currentEnd.getTime();
    if (gap < 15 * 60 * 1000 && gap > 0) {
      errors.push(`Insufficient time between "${current.name}" and "${next.name}" for travel`);
    }
  }
  
  // Check for reasonable daily duration (max 16 hours)
  if (sortedActivities.length > 0) {
    const firstStart = new Date(sortedActivities[0].startTime);
    const lastEnd = new Date(sortedActivities[sortedActivities.length - 1].endTime);
    const totalDuration = lastEnd.getTime() - firstStart.getTime();
    
    if (totalDuration > 16 * 60 * 60 * 1000) {
      errors.push('Daily itinerary exceeds 16 hours - consider reducing activities');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};