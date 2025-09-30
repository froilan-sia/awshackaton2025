import { PracticalTipsService } from '../src/services/practicalTipsService';
import { LocationBasedTipService } from '../src/services/locationBasedTipService';
import { WeatherRecommendationService } from '../src/services/weatherRecommendationService';
import { CulturalEtiquetteService } from '../src/services/culturalEtiquetteService';
import { 
  TipCategory, 
  Priority, 
  VenueType, 
  WeatherCondition,
  ContextualTipRequest 
} from '../src/types/practicalTips';

async function demonstratePracticalTipsService() {
  console.log('🎯 Practical Tips Service Demo');
  console.log('================================\n');

  // Initialize services
  const practicalTipsService = new PracticalTipsService();
  const locationBasedTipService = new LocationBasedTipService(practicalTipsService);
  const weatherRecommendationService = new WeatherRecommendationService();
  const culturalEtiquetteService = new CulturalEtiquetteService();

  // Demo 1: Get contextual tips for a tourist at Victoria Peak
  console.log('📍 Demo 1: Contextual Tips for Victoria Peak Visit');
  console.log('--------------------------------------------------');
  
  const victoriaPeakRequest: ContextualTipRequest = {
    userId: 'tourist_123',
    location: {
      latitude: 22.2711,
      longitude: 114.1489,
      venueType: VenueType.CULTURAL_SITE,
      venueName: 'Victoria Peak'
    },
    weather: {
      condition: WeatherCondition.COOL_DRY,
      temperature: 18,
      humidity: 65,
      windSpeed: 12
    },
    userProfile: {
      interests: ['sightseeing', 'photography', 'culture'],
      accessibilityNeeds: [],
      language: 'en',
      groupType: 'couple'
    },
    timeOfDay: 'evening'
  };

  const peakTips = await practicalTipsService.getContextualTips(victoriaPeakRequest);
  console.log(`Found ${peakTips.tips.length} contextual tips:`);
  peakTips.tips.slice(0, 3).forEach((tip, index) => {
    console.log(`${index + 1}. [${tip.category.toUpperCase()}] ${tip.title}`);
    console.log(`   ${tip.content.substring(0, 100)}...`);
    console.log(`   Priority: ${tip.priority}, Relevance: ${peakTips.contextualRelevance.toFixed(2)}\n`);
  });

  // Demo 2: Weather-specific recommendations
  console.log('🌧️ Demo 2: Weather-Specific Recommendations');
  console.log('--------------------------------------------');
  
  const rainyWeatherRecs = await weatherRecommendationService.getRecommendationsForWeather(
    WeatherCondition.RAINY
  );
  
  console.log(`Rainy weather recommendations (${rainyWeatherRecs.length} found):`);
  rainyWeatherRecs.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.title} (Priority: ${rec.priority})`);
    console.log(`   Items to bring: ${rec.items.slice(0, 3).join(', ')}`);
    console.log(`   Clothing: ${rec.clothing.slice(0, 2).join(', ')}`);
    console.log(`   Key precaution: ${rec.precautions[0] || 'None specified'}\n`);
  });

  // Demo 3: Cultural etiquette for different venues
  console.log('🏛️ Demo 3: Cultural Etiquette Guidelines');
  console.log('----------------------------------------');
  
  const templeEtiquette = await culturalEtiquetteService.getEtiquetteForVenue(VenueType.TEMPLE);
  const restaurantEtiquette = await culturalEtiquetteService.getEtiquetteForVenue(VenueType.RESTAURANT);
  
  console.log('Temple Etiquette:');
  if (templeEtiquette.length > 0) {
    const guide = templeEtiquette[0];
    console.log(`  Do's: ${guide.dosList.slice(0, 3).join(', ')}`);
    console.log(`  Don'ts: ${guide.dontsList.slice(0, 3).join(', ')}`);
    console.log(`  Dress code: ${guide.dresscode || 'Not specified'}\n`);
  }
  
  console.log('Restaurant Etiquette:');
  if (restaurantEtiquette.length > 0) {
    const guide = restaurantEtiquette[0];
    console.log(`  Do's: ${guide.dosList.slice(0, 3).join(', ')}`);
    console.log(`  Don'ts: ${guide.dontsList.slice(0, 3).join(', ')}`);
    console.log(`  Common mistakes: ${guide.commonMistakes.slice(0, 2).join(', ')}\n`);
  }

  // Demo 4: Location-based tips
  console.log('📍 Demo 4: Location-Based Tips');
  console.log('------------------------------');
  
  const tsimshatsuiRequest: ContextualTipRequest = {
    location: {
      latitude: 22.2988,
      longitude: 114.1722,
      venueType: VenueType.CULTURAL_SITE,
      venueName: 'Tsim Sha Tsui Waterfront'
    },
    timeOfDay: 'evening',
    userProfile: {
      interests: ['photography', 'sightseeing'],
      accessibilityNeeds: [],
      language: 'en',
      groupType: 'family'
    }
  };

  const locationTips = await locationBasedTipService.getTipsForLocation(
    tsimshatsuiRequest.location.latitude,
    tsimshatsuiRequest.location.longitude,
    tsimshatsuiRequest
  );

  console.log(`Location-based tips for Tsim Sha Tsui (${locationTips.tips.length} found):`);
  locationTips.tips.slice(0, 3).forEach((tip, index) => {
    console.log(`${index + 1}. [${tip.category.toUpperCase()}] ${tip.title}`);
    console.log(`   ${tip.content.substring(0, 120)}...`);
    console.log(`   Tags: ${tip.tags.join(', ')}\n`);
  });

  // Demo 5: Comprehensive weather preparation advice
  console.log('🌦️ Demo 5: Comprehensive Weather Preparation');
  console.log('--------------------------------------------');
  
  const weatherAdvice = await weatherRecommendationService.getWeatherPreparationAdvice(
    WeatherCondition.HOT_HUMID,
    [WeatherCondition.RAINY, WeatherCondition.HOT_HUMID],
    'hiking'
  );

  console.log('Current weather (Hot & Humid) - Immediate recommendations:');
  weatherAdvice.immediate.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.title}`);
    console.log(`   Key items: ${rec.items.slice(0, 3).join(', ')}`);
  });

  console.log('\nActivity-specific advice for hiking:');
  weatherAdvice.activitySpecific.forEach((advice, index) => {
    console.log(`${index + 1}. ${advice}`);
  });

  // Demo 6: Tips by category
  console.log('\n🛡️ Demo 6: Safety Tips');
  console.log('---------------------');
  
  const safetyTips = await practicalTipsService.getTipsByCategory(TipCategory.SAFETY);
  console.log(`Safety tips available (${safetyTips.length} found):`);
  safetyTips.slice(0, 3).forEach((tip, index) => {
    console.log(`${index + 1}. ${tip.title} (Priority: ${tip.priority})`);
    console.log(`   ${tip.content.substring(0, 100)}...`);
    console.log(`   Applicable venues: ${tip.applicableVenues.join(', ') || 'All venues'}\n`);
  });

  // Demo 7: General etiquette guidelines
  console.log('🤝 Demo 7: General Etiquette Guidelines');
  console.log('--------------------------------------');
  
  const generalGuidelines = await culturalEtiquetteService.getGeneralEtiquetteGuidelines();
  
  console.log('Transportation etiquette:');
  generalGuidelines.transportation.slice(0, 3).forEach((guideline, index) => {
    console.log(`${index + 1}. ${guideline}`);
  });
  
  console.log('\nDining etiquette:');
  generalGuidelines.dining.slice(0, 3).forEach((guideline, index) => {
    console.log(`${index + 1}. ${guideline}`);
  });

  console.log('\n✅ Demo completed successfully!');
  console.log('The Practical Tips Service provides comprehensive contextual guidance for tourists visiting Hong Kong.');
}

// Run the demo
if (require.main === module) {
  demonstratePracticalTipsService().catch(console.error);
}

export { demonstratePracticalTipsService };