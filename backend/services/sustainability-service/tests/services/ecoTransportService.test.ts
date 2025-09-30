import { EcoTransportService } from '../../src/services/ecoTransportService';
import { TransportationMode } from '../../src/types/sustainability';

describe('EcoTransportService', () => {
  let service: EcoTransportService;

  beforeEach(() => {
    service = new EcoTransportService();
  });

  describe('getEcoTransportOptions', () => {
    it('should return available transport options sorted by sustainability', async () => {
      const options = await service.getEcoTransportOptions('Central', 'Admiralty');

      expect(options.length).toBeGreaterThan(0);
      expect(options[0].availability).toBe(true);
      
      // Should be sorted by carbon footprint (most sustainable first)
      for (let i = 1; i < options.length; i++) {
        expect(options[i].carbonFootprint).toBeGreaterThanOrEqual(options[i-1].carbonFootprint);
      }
    });

    it('should only return available transport options', async () => {
      const options = await service.getEcoTransportOptions('Central', 'Admiralty');
      
      expect(options.every(option => option.availability === true)).toBe(true);
    });
  });

  describe('getRecommendedTransport', () => {
    it('should return top 3 recommendations by default', async () => {
      const recommendations = await service.getRecommendedTransport('Central', 'Admiralty');
      
      expect(recommendations.length).toBeLessThanOrEqual(3);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should filter by maximum cost', async () => {
      const recommendations = await service.getRecommendedTransport('Central', 'Admiralty', {
        maxCost: 10
      });

      expect(recommendations.every(option => option.cost <= 10)).toBe(true);
    });

    it('should filter by maximum duration', async () => {
      const recommendations = await service.getRecommendedTransport('Central', 'Admiralty', {
        maxDuration: 20
      });

      expect(recommendations.every(option => option.duration <= 20)).toBe(true);
    });

    it('should prioritize sustainability when requested', async () => {
      const sustainabilityPriority = await service.getRecommendedTransport('Central', 'Admiralty', {
        prioritizeSustainability: true
      });

      const balancedPriority = await service.getRecommendedTransport('Central', 'Admiralty', {
        prioritizeSustainability: false
      });

      // When prioritizing sustainability, first option should have lower carbon footprint
      if (sustainabilityPriority.length > 0 && balancedPriority.length > 0) {
        expect(sustainabilityPriority[0].carbonFootprint).toBeLessThanOrEqual(balancedPriority[0].carbonFootprint);
      }
    });

    it('should handle empty results when filters are too restrictive', async () => {
      const recommendations = await service.getRecommendedTransport('Central', 'Admiralty', {
        maxCost: 0,
        maxDuration: 1
      });

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('calculateTripCarbonFootprint', () => {
    it('should calculate carbon footprint for single transport mode', async () => {
      const transportModes = [
        { mode: TransportationMode.WALKING, distance: 2 }
      ];

      const footprint = await service.calculateTripCarbonFootprint(transportModes);
      expect(footprint).toBe(0); // Walking has 0 emissions
    });

    it('should calculate carbon footprint for multiple transport modes', async () => {
      const transportModes = [
        { mode: TransportationMode.WALKING, distance: 1 },
        { mode: TransportationMode.PUBLIC_TRANSPORT, distance: 10 },
        { mode: TransportationMode.TAXI, distance: 5 }
      ];

      const footprint = await service.calculateTripCarbonFootprint(transportModes);
      
      // Expected: 0 + (10 * 0.05) + (5 * 0.2) = 0 + 0.5 + 1.0 = 1.5
      expect(footprint).toBe(1.5);
    });

    it('should handle empty transport modes array', async () => {
      const footprint = await service.calculateTripCarbonFootprint([]);
      expect(footprint).toBe(0);
    });

    it('should use default factor for unknown transport modes', async () => {
      const transportModes = [
        { mode: 'unknown_mode' as TransportationMode, distance: 10 }
      ];

      const footprint = await service.calculateTripCarbonFootprint(transportModes);
      expect(footprint).toBe(2.0); // 10 * 0.2 (default taxi factor)
    });
  });

  describe('getSustainabilityTips', () => {
    it('should return tips for walking', async () => {
      const tips = await service.getSustainabilityTips(TransportationMode.WALKING);
      
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.toLowerCase().includes('sustainable'))).toBe(true);
    });

    it('should return tips for cycling', async () => {
      const tips = await service.getSustainabilityTips(TransportationMode.CYCLING);
      
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.toLowerCase().includes('cycling'))).toBe(true);
    });

    it('should return tips for public transport', async () => {
      const tips = await service.getSustainabilityTips(TransportationMode.PUBLIC_TRANSPORT);
      
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.toLowerCase().includes('mtr') || tip.toLowerCase().includes('bus'))).toBe(true);
    });

    it('should return tips for ferry', async () => {
      const tips = await service.getSustainabilityTips(TransportationMode.FERRY);
      
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.toLowerCase().includes('ferry'))).toBe(true);
    });

    it('should return tips for electric vehicle', async () => {
      const tips = await service.getSustainabilityTips(TransportationMode.ELECTRIC_VEHICLE);
      
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.toLowerCase().includes('electric'))).toBe(true);
    });

    it('should return tips for taxi', async () => {
      const tips = await service.getSustainabilityTips(TransportationMode.TAXI);
      
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.toLowerCase().includes('taxi'))).toBe(true);
    });

    it('should return tips for private car', async () => {
      const tips = await service.getSustainabilityTips(TransportationMode.PRIVATE_CAR);
      
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.toLowerCase().includes('car') || tip.toLowerCase().includes('private'))).toBe(true);
    });
  });

  describe('getTransportModeImpact', () => {
    it('should return correct impact for walking', async () => {
      const impact = await service.getTransportModeImpact(TransportationMode.WALKING);
      
      expect(impact.carbonFootprint).toBe(0);
      expect(impact.sustainabilityRating).toBe('Excellent');
      expect(impact.description).toContain('Zero emissions');
    });

    it('should return correct impact for cycling', async () => {
      const impact = await service.getTransportModeImpact(TransportationMode.CYCLING);
      
      expect(impact.carbonFootprint).toBe(0);
      expect(impact.sustainabilityRating).toBe('Excellent');
      expect(impact.description).toContain('Zero emissions');
    });

    it('should return correct impact for public transport', async () => {
      const impact = await service.getTransportModeImpact(TransportationMode.PUBLIC_TRANSPORT);
      
      expect(impact.carbonFootprint).toBe(0.05);
      expect(impact.sustainabilityRating).toBe('Excellent');
      expect(impact.description).toContain('Very low emissions');
    });

    it('should return correct impact for ferry', async () => {
      const impact = await service.getTransportModeImpact(TransportationMode.FERRY);
      
      expect(impact.carbonFootprint).toBe(0.08);
      expect(impact.sustainabilityRating).toBe('Good');
      expect(impact.description).toContain('Low emissions');
    });

    it('should return correct impact for electric vehicle', async () => {
      const impact = await service.getTransportModeImpact(TransportationMode.ELECTRIC_VEHICLE);
      
      expect(impact.carbonFootprint).toBe(0.1);
      expect(impact.sustainabilityRating).toBe('Good');
      expect(impact.description).toContain('Lower emissions');
    });

    it('should return correct impact for taxi', async () => {
      const impact = await service.getTransportModeImpact(TransportationMode.TAXI);
      
      expect(impact.carbonFootprint).toBe(0.2);
      expect(impact.sustainabilityRating).toBe('Fair');
      expect(impact.description).toContain('Moderate emissions');
    });

    it('should return correct impact for private car', async () => {
      const impact = await service.getTransportModeImpact(TransportationMode.PRIVATE_CAR);
      
      expect(impact.carbonFootprint).toBe(0.25);
      expect(impact.sustainabilityRating).toBe('Poor');
      expect(impact.description).toContain('Highest emissions');
    });
  });

  describe('transport scoring algorithm', () => {
    it('should give higher scores to more sustainable options', async () => {
      const walkingOptions = await service.getEcoTransportOptions('Central', 'Admiralty');
      const walkingOption = walkingOptions.find(opt => opt.type === TransportationMode.WALKING);
      const carOption = walkingOptions.find(opt => opt.type === TransportationMode.PRIVATE_CAR);

      if (walkingOption && carOption) {
        // Walking should score higher than private car in balanced scoring
        const recommendations = await service.getRecommendedTransport('Central', 'Admiralty', {
          prioritizeSustainability: false
        });

        const walkingIndex = recommendations.findIndex(opt => opt.type === TransportationMode.WALKING);
        const carIndex = recommendations.findIndex(opt => opt.type === TransportationMode.PRIVATE_CAR);

        if (walkingIndex !== -1 && carIndex !== -1) {
          expect(walkingIndex).toBeLessThan(carIndex);
        }
      }
    });
  });
});