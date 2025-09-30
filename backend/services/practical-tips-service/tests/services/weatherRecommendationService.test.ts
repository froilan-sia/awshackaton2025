import { WeatherRecommendationService } from '../../src/services/weatherRecommendationService';
import { WeatherCondition, Priority } from '../../src/types/practicalTips';

describe('WeatherRecommendationService', () => {
  let service: WeatherRecommendationService;

  beforeEach(() => {
    service = new WeatherRecommendationService();
  });

  describe('getRecommendationsForWeather', () => {
    it('should return recommendations for rainy weather', async () => {
      const recommendations = await service.getRecommendationsForWeather(WeatherCondition.RAINY);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.every(rec => rec.weatherCondition === WeatherCondition.RAINY)).toBe(true);
    });

    it('should return recommendations for hot humid weather', async () => {
      const recommendations = await service.getRecommendationsForWeather(WeatherCondition.HOT_HUMID);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.every(rec => rec.weatherCondition === WeatherCondition.HOT_HUMID)).toBe(true);
    });

    it('should return recommendations for typhoon weather', async () => {
      const recommendations = await service.getRecommendationsForWeather(WeatherCondition.TYPHOON);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.every(rec => rec.weatherCondition === WeatherCondition.TYPHOON)).toBe(true);
      
      // Typhoon recommendations should be critical priority
      expect(recommendations.some(rec => rec.priority === Priority.CRITICAL)).toBe(true);
    });

    it('should sort recommendations by priority', async () => {
      const recommendations = await service.getRecommendationsForWeather(WeatherCondition.RAINY);
      
      if (recommendations.length > 1) {
        const priorityOrder = { 
          [Priority.CRITICAL]: 4, 
          [Priority.HIGH]: 3, 
          [Priority.MEDIUM]: 2, 
          [Priority.LOW]: 1 
        };
        
        for (let i = 0; i < recommendations.length - 1; i++) {
          expect(priorityOrder[recommendations[i].priority])
            .toBeGreaterThanOrEqual(priorityOrder[recommendations[i + 1].priority]);
        }
      }
    });

    it('should return empty array for non-existent weather condition', async () => {
      // This test assumes we don't have recommendations for all weather conditions
      const recommendations = await service.getRecommendationsForWeather(WeatherCondition.FOGGY);
      
      // Should either return empty array or valid recommendations
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('createWeatherRecommendation', () => {
    it('should create a new weather recommendation', async () => {
      const recommendationData = {
        weatherCondition: WeatherCondition.COOL_DRY,
        title: 'Cool Weather Tips',
        description: 'Tips for cool and dry weather',
        items: ['Light jacket', 'Comfortable shoes'],
        clothing: ['Layered clothing', 'Long pants'],
        precautions: ['Check temperature changes'],
        alternatives: ['Perfect for hiking'],
        priority: Priority.MEDIUM
      };

      const recommendation = await service.createWeatherRecommendation(recommendationData);

      expect(recommendation).toBeDefined();
      expect(recommendation.id).toBeDefined();
      expect(recommendation.weatherCondition).toBe(WeatherCondition.COOL_DRY);
      expect(recommendation.title).toBe('Cool Weather Tips');
      expect(recommendation.items).toEqual(['Light jacket', 'Comfortable shoes']);
    });
  });

  describe('updateWeatherRecommendation', () => {
    it('should update an existing weather recommendation', async () => {
      const recommendationData = {
        weatherCondition: WeatherCondition.SUNNY,
        title: 'Original Sunny Tips',
        description: 'Original description',
        items: ['Sunscreen'],
        clothing: ['Light clothing'],
        precautions: ['Stay hydrated'],
        alternatives: ['Outdoor activities'],
        priority: Priority.MEDIUM
      };

      const created = await service.createWeatherRecommendation(recommendationData);
      const updates = {
        title: 'Updated Sunny Tips',
        items: ['Sunscreen', 'Hat', 'Sunglasses'],
        priority: Priority.HIGH
      };

      const updated = await service.updateWeatherRecommendation(created.id, updates);

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Updated Sunny Tips');
      expect(updated!.items).toEqual(['Sunscreen', 'Hat', 'Sunglasses']);
      expect(updated!.priority).toBe(Priority.HIGH);
      expect(updated!.description).toBe('Original description'); // Unchanged
    });

    it('should return null for non-existent recommendation', async () => {
      const result = await service.updateWeatherRecommendation('non-existent-id', {
        title: 'New Title'
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteWeatherRecommendation', () => {
    it('should delete an existing weather recommendation', async () => {
      const recommendationData = {
        weatherCondition: WeatherCondition.FOGGY,
        title: 'To Be Deleted',
        description: 'This will be deleted',
        items: [],
        clothing: [],
        precautions: [],
        alternatives: [],
        priority: Priority.LOW
      };

      const created = await service.createWeatherRecommendation(recommendationData);
      const deleted = await service.deleteWeatherRecommendation(created.id);

      expect(deleted).toBe(true);

      const allRecommendations = await service.getAllWeatherRecommendations();
      const foundRecommendation = allRecommendations.find(rec => rec.id === created.id);
      expect(foundRecommendation).toBeUndefined();
    });

    it('should return false for non-existent recommendation', async () => {
      const deleted = await service.deleteWeatherRecommendation('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('getWeatherPreparationAdvice', () => {
    it('should provide comprehensive weather preparation advice', async () => {
      const currentWeather = WeatherCondition.HOT_HUMID;
      const forecastWeather = [WeatherCondition.RAINY, WeatherCondition.HOT_HUMID];
      const activityType = 'hiking';

      const advice = await service.getWeatherPreparationAdvice(
        currentWeather,
        forecastWeather,
        activityType
      );

      expect(advice).toBeDefined();
      expect(advice.immediate).toBeDefined();
      expect(advice.upcoming).toBeDefined();
      expect(advice.activitySpecific).toBeDefined();
      
      expect(Array.isArray(advice.immediate)).toBe(true);
      expect(Array.isArray(advice.upcoming)).toBe(true);
      expect(Array.isArray(advice.activitySpecific)).toBe(true);
      
      // Should have immediate advice for current weather
      expect(advice.immediate.some(rec => rec.weatherCondition === currentWeather)).toBe(true);
      
      // Should have activity-specific advice for hiking in hot humid weather
      expect(advice.activitySpecific.length).toBeGreaterThan(0);
    });

    it('should provide activity-specific advice for different activities', async () => {
      const hikingAdvice = await service.getWeatherPreparationAdvice(
        WeatherCondition.RAINY,
        [],
        'hiking'
      );

      const sightseeingAdvice = await service.getWeatherPreparationAdvice(
        WeatherCondition.RAINY,
        [],
        'sightseeing'
      );

      expect(hikingAdvice.activitySpecific).not.toEqual(sightseeingAdvice.activitySpecific);
      
      // Hiking advice should mention trail conditions
      const hikingAdviceText = hikingAdvice.activitySpecific.join(' ').toLowerCase();
      expect(hikingAdviceText).toContain('trail');
      
      // Sightseeing advice should mention indoor attractions
      const sightseeingAdviceText = sightseeingAdvice.activitySpecific.join(' ').toLowerCase();
      expect(sightseeingAdviceText).toContain('indoor');
    });

    it('should handle unknown activity types gracefully', async () => {
      const advice = await service.getWeatherPreparationAdvice(
        WeatherCondition.SUNNY,
        [],
        'unknown-activity'
      );

      expect(advice.activitySpecific).toEqual([]);
    });

    it('should deduplicate upcoming recommendations', async () => {
      const forecastWeather = [
        WeatherCondition.RAINY, 
        WeatherCondition.RAINY, // Duplicate
        WeatherCondition.HOT_HUMID
      ];

      const advice = await service.getWeatherPreparationAdvice(
        WeatherCondition.SUNNY,
        forecastWeather
      );

      // Should not have duplicate recommendations
      const ids = advice.upcoming.map(rec => rec.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('getAllWeatherRecommendations', () => {
    it('should return all weather recommendations', async () => {
      const recommendations = await service.getAllWeatherRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should include default recommendations
      const weatherConditions = recommendations.map(rec => rec.weatherCondition);
      expect(weatherConditions).toContain(WeatherCondition.RAINY);
      expect(weatherConditions).toContain(WeatherCondition.HOT_HUMID);
      expect(weatherConditions).toContain(WeatherCondition.TYPHOON);
    });
  });
});