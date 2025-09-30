import { TranslationService } from '../src/services/translationService';
import { LanguagePreferenceService } from '../src/services/languagePreferenceService';
import { PronunciationService } from '../src/services/pronunciationService';
import { CulturalEtiquetteService } from '../src/services/culturalEtiquetteService';
import { ContentLocalizationService } from '../src/services/contentLocalizationService';
import { 
  SupportedLanguage, 
  TranslationProvider, 
  EtiquetteCategory,
  ContentType 
} from '../src/types/translation';

async function demonstrateTranslationService() {
  console.log('🌐 Translation Service Demo');
  console.log('==========================\n');

  const translationService = new TranslationService();
  const preferenceService = new LanguagePreferenceService();
  const pronunciationService = new PronunciationService();
  const etiquetteService = new CulturalEtiquetteService();
  const localizationService = new ContentLocalizationService();

  try {
    // 1. Language Preferences Demo
    console.log('1. 👤 Language Preferences Demo');
    console.log('--------------------------------');
    
    const userPreference = await preferenceService.createOrUpdatePreference({
      userId: 'tourist123',
      primaryLanguage: SupportedLanguage.ENGLISH,
      secondaryLanguages: [SupportedLanguage.TRADITIONAL_CHINESE, SupportedLanguage.JAPANESE],
      preferredTranslationProvider: TranslationProvider.GOOGLE,
      autoTranslate: true
    });
    
    console.log('✅ Created user preference:', JSON.stringify(userPreference, null, 2));
    
    const userLanguage = await preferenceService.getUserPreferredLanguage('tourist123');
    console.log(`📱 User's preferred language: ${userLanguage}\n`);

    // 2. Pronunciation Guides Demo
    console.log('2. 🗣️  Cantonese Pronunciation Guides Demo');
    console.log('------------------------------------------');
    
    const greetingGuides = await pronunciationService.getGuidesByCategory(SupportedLanguage.CANTONESE, 'greetings');
    console.log('👋 Greeting phrases:');
    greetingGuides.forEach(guide => {
      console.log(`   ${guide.text} (${guide.phonetic}) - ${guide.usage}`);
    });
    
    const diningGuides = await pronunciationService.getGuidesByCategory(SupportedLanguage.CANTONESE, 'dining');
    console.log('\n🍽️  Dining phrases:');
    diningGuides.forEach(guide => {
      console.log(`   ${guide.text} (${guide.phonetic}) - ${guide.usage}`);
    });
    
    // Search for specific phrase
    const helloGuide = await pronunciationService.getPronunciationByText('你好', SupportedLanguage.CANTONESE);
    if (helloGuide) {
      console.log(`\n🔍 Found pronunciation for "你好": ${helloGuide.phonetic} (${helloGuide.difficulty} difficulty)\n`);
    }

    // 3. Cultural Etiquette Demo
    console.log('3. 🎭 Cultural Etiquette Demo');
    console.log('-----------------------------');
    
    const diningEtiquette = await etiquetteService.getEtiquetteByCategory(EtiquetteCategory.DINING);
    console.log('🍽️  Dining Etiquette:');
    diningEtiquette.forEach(etiquette => {
      console.log(`   📋 ${etiquette.title} (${etiquette.importance} importance)`);
      console.log(`      ${etiquette.content.substring(0, 100)}...\n`);
    });
    
    const mtrEtiquette = await etiquetteService.getEtiquetteByContext('mtr');
    console.log('🚇 MTR Etiquette:');
    mtrEtiquette.forEach(etiquette => {
      console.log(`   📋 ${etiquette.title}`);
      console.log(`      ${etiquette.content.substring(0, 100)}...\n`);
    });

    // 4. Content Localization Demo
    console.log('4. 🌍 Content Localization Demo');
    console.log('--------------------------------');
    
    const attractionContent = await localizationService.localizeContent(
      'attraction_001',
      'Victoria Peak offers stunning panoramic views of Hong Kong\'s skyline and harbor. Take the historic Peak Tram for an unforgettable journey to the top.',
      SupportedLanguage.ENGLISH,
      [SupportedLanguage.TRADITIONAL_CHINESE, SupportedLanguage.JAPANESE, SupportedLanguage.KOREAN],
      ContentType.ATTRACTION_DESCRIPTION
    );
    
    console.log('🏔️  Localized attraction content:');
    console.log(`   Original (${attractionContent.originalLanguage}): ${attractionContent.translations[SupportedLanguage.ENGLISH]}`);
    
    // Get localized versions
    const chineseContent = await localizationService.getLocalizedContent('attraction_001', SupportedLanguage.TRADITIONAL_CHINESE);
    if (chineseContent) {
      console.log(`   Chinese: ${chineseContent}`);
    }
    
    const translationStatus = await localizationService.getTranslationStatus('attraction_001');
    if (translationStatus) {
      console.log(`   📊 Translation Status: ${translationStatus.translatedLanguages}/${translationStatus.totalLanguages} languages`);
      console.log(`   ❌ Missing: ${translationStatus.missingLanguages.join(', ')}\n`);
    }

    // 5. Practical Usage Scenarios
    console.log('5. 🎯 Practical Usage Scenarios');
    console.log('--------------------------------');
    
    // Scenario 1: Tourist needs help at restaurant
    console.log('📱 Scenario 1: Tourist needs help at restaurant');
    const restaurantEtiquette = await etiquetteService.getEtiquetteByContext('restaurant');
    const restaurantPhrases = await pronunciationService.getGuidesByCategory(SupportedLanguage.CANTONESE, 'dining');
    
    console.log('   🍽️  Key etiquette tips:');
    restaurantEtiquette.slice(0, 1).forEach(tip => {
      console.log(`      • ${tip.title}: ${tip.content.substring(0, 80)}...`);
    });
    
    console.log('   🗣️  Useful phrases:');
    restaurantPhrases.slice(0, 3).forEach(phrase => {
      console.log(`      • ${phrase.text} (${phrase.phonetic}) - ${phrase.usage}`);
    });
    
    // Scenario 2: Tourist using MTR
    console.log('\n🚇 Scenario 2: Tourist using MTR');
    const mtrEtiquetteRules = await etiquetteService.getEtiquetteByContext('mtr');
    const transportPhrases = await pronunciationService.getGuidesByCategory(SupportedLanguage.CANTONESE, 'transportation');
    
    console.log('   📋 Critical etiquette:');
    mtrEtiquetteRules.forEach(rule => {
      if (rule.importance === 'critical') {
        console.log(`      • ${rule.title}: ${rule.content.substring(0, 80)}...`);
      }
    });
    
    console.log('   🗣️  Transportation phrases:');
    transportPhrases.forEach(phrase => {
      console.log(`      • ${phrase.text} (${phrase.phonetic}) - ${phrase.usage}`);
    });

    // 6. Multi-language Support Summary
    console.log('\n6. 📊 Multi-language Support Summary');
    console.log('------------------------------------');
    
    const supportedLanguages = translationService.getSupportedLanguages();
    console.log(`🌐 Supported Languages (${supportedLanguages.length}):`, supportedLanguages.join(', '));
    
    const pronunciationLanguages = pronunciationService.getSupportedLanguages();
    console.log(`🗣️  Pronunciation Guides: ${pronunciationLanguages.join(', ')}`);
    
    const etiquetteLanguages = etiquetteService.getSupportedLanguages();
    console.log(`🎭 Cultural Etiquette: ${etiquetteLanguages.join(', ')}`);
    
    const categories = etiquetteService.getAvailableCategories();
    console.log(`📚 Etiquette Categories (${categories.length}):`, categories.join(', '));

    console.log('\n✅ Translation Service Demo completed successfully!');
    console.log('🎉 The service provides comprehensive multi-language support for:');
    console.log('   • Real-time translation with multiple providers');
    console.log('   • User language preferences and settings');
    console.log('   • Cantonese pronunciation guides for tourists');
    console.log('   • Cultural etiquette content in multiple languages');
    console.log('   • Content localization for attractions, events, and tips');
    console.log('   • Contextual cultural guidance for different situations');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
if (require.main === module) {
  demonstrateTranslationService();
}

export { demonstrateTranslationService };