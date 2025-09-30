import { LocalResidentService } from '../src/services/localResidentService';
import { LocalInsightsService } from '../src/services/localInsightsService';
import { ReviewComparisonService } from '../src/services/reviewComparisonService';
import { AuthenticityService } from '../src/services/authenticityService';
import { TouristReviewModel } from '../src/models/TouristReview';

async function runLocalInsightsDemo() {
  console.log('🏠 Local Insights and Community Content System Demo');
  console.log('='.repeat(60));

  const residentService = new LocalResidentService();
  const reviewModel = new TouristReviewModel();
  
  // Use shared model instances
  const insightsService = new LocalInsightsService(residentService['residentModel']);
  const comparisonService = new ReviewComparisonService(insightsService['insightModel'], reviewModel);
  const authenticityService = new AuthenticityService(insightsService['insightModel'], reviewModel, residentService['residentModel']);

  try {
    // 1. Register Local Residents
    console.log('\n1. 👥 Registering Local Residents');
    console.log('-'.repeat(40));

    const resident1 = await residentService.registerResident({
      userId: 'alice_wong',
      verificationProof: ['hkid_alice.jpg', 'utility_bill_alice.pdf'],
      yearsInHongKong: 25,
      districts: ['Central', 'Wan Chai', 'Sheung Wan'],
      languages: ['Cantonese', 'English', 'Mandarin'],
      specialties: ['food', 'culture', 'history']
    });

    const resident2 = await residentService.registerResident({
      userId: 'david_chan',
      verificationProof: ['hkid_david.jpg', 'lease_agreement.pdf'],
      yearsInHongKong: 15,
      districts: ['Tsim Sha Tsui', 'Yau Ma Tei'],
      languages: ['Cantonese', 'English'],
      specialties: ['nightlife', 'shopping', 'local_life']
    });

    console.log(`✅ Registered resident: ${resident1.userId} (Credibility: ${resident1.credibilityScore})`);
    console.log(`✅ Registered resident: ${resident2.userId} (Credibility: ${resident2.credibilityScore})`);

    // 2. Verify Residents
    console.log('\n2. ✅ Verifying Residents');
    console.log('-'.repeat(40));

    await residentService.verifyResident(resident1.id, 'verified');
    await residentService.verifyResident(resident2.id, 'verified');

    console.log('✅ Both residents verified successfully');

    // 3. Create Local Insights
    console.log('\n3. 💡 Creating Local Insights');
    console.log('-'.repeat(40));

    const insight1 = await insightsService.createInsight({
      authorId: 'alice_wong',
      locationId: 'dim_sum_restaurant_123',
      locationType: 'restaurant',
      title: 'Hidden Dim Sum Gem in Sheung Wan',
      content: 'This family-run dim sum restaurant has been serving the local community for over 30 years. The har gow (shrimp dumplings) are made fresh every morning using a recipe passed down from the owner\'s grandmother. Unlike the touristy places in Central, this spot maintains authentic flavors and reasonable prices that locals actually pay.',
      category: 'local_favorite',
      tags: ['dim_sum', 'authentic', 'family_run', 'affordable'],
      localRating: 4.8,
      bestTimeToVisit: 'Weekday mornings between 8-10am for freshest selection',
      localTips: [
        'Order the har gow first - they sell out quickly',
        'Try the siu mai with extra fish roe',
        'Ask for jasmine tea, not the tourist-oriented oolong',
        'Bring cash - they don\'t accept cards'
      ],
      culturalContext: 'Traditional dim sum culture where locals gather for morning tea (yum cha) to catch up on community news and socialize',
      language: 'en'
    });

    const insight2 = await insightsService.createInsight({
      authorId: 'alice_wong',
      locationId: 'tourist_trap_restaurant_456',
      locationType: 'restaurant',
      title: 'Tourist Trap Warning - Overpriced "Authentic" Restaurant',
      content: 'This restaurant markets itself as "authentic Hong Kong cuisine" but it\'s actually a tourist trap. The prices are 3x higher than what locals pay elsewhere, the food is mediocre, and the staff clearly cater only to tourists. Real locals never eat here - it\'s always empty except for tour groups.',
      category: 'tourist_trap_warning',
      tags: ['tourist_trap', 'overpriced', 'avoid'],
      localRating: 1.5,
      touristTrapWarning: true,
      localTips: [
        'Walk 2 blocks east to find authentic local restaurants',
        'If you see tour buses outside, it\'s probably overpriced',
        'Check if locals are eating there - if not, avoid'
      ],
      language: 'en'
    });

    const insight3 = await insightsService.createInsight({
      authorId: 'david_chan',
      locationId: 'night_market_789',
      locationType: 'district',
      title: 'Temple Street Night Market - Local Perspective',
      content: 'While Temple Street is touristy, there are still authentic experiences if you know where to look. The fortune tellers at the north end are genuine locals, and the street food stalls run by families who\'ve been there for decades still serve real Hong Kong flavors. Avoid the souvenir shops and focus on the food and cultural experiences.',
      category: 'cultural_context',
      tags: ['night_market', 'street_food', 'culture', 'fortune_telling'],
      localRating: 3.8,
      bestTimeToVisit: 'After 8pm when it gets lively, but before 10pm to avoid drunk crowds',
      localTips: [
        'Try the curry fish balls from the stall with the longest local queue',
        'Fortune tellers charge locals HK$50, tourists HK$200 - negotiate',
        'The singing performances start around 9pm',
        'Stick to the main street after 11pm for safety'
      ],
      culturalContext: 'Traditional night market culture representing old Hong Kong street life and community gathering',
      language: 'en'
    });

    console.log(`✅ Created insight: "${insight1.title}" (Authenticity: ${insight1.authenticityScore})`);
    console.log(`⚠️  Created warning: "${insight2.title}" (Tourist trap warning)`);
    console.log(`🌃 Created cultural insight: "${insight3.title}"`);

    // 4. Create Tourist Reviews for Comparison
    console.log('\n4. 🧳 Adding Tourist Reviews for Comparison');
    console.log('-'.repeat(40));

    await reviewModel.create({
      authorId: 'tourist_john',
      locationId: 'dim_sum_restaurant_123',
      rating: 4,
      content: 'Good dim sum, though hard to find and no English menu',
      visitDate: new Date('2023-10-15'),
      groupType: 'couple',
      nationality: 'US',
      language: 'en',
      helpfulVotes: 3
    });

    await reviewModel.create({
      authorId: 'tourist_sarah',
      locationId: 'tourist_trap_restaurant_456',
      rating: 4,
      content: 'Nice restaurant with English menu, convenient location near hotel',
      visitDate: new Date('2023-10-16'),
      groupType: 'family',
      nationality: 'UK',
      language: 'en',
      helpfulVotes: 2
    });

    await reviewModel.create({
      authorId: 'tourist_mike',
      locationId: 'night_market_789',
      rating: 5,
      content: 'Amazing night market experience! So authentic and vibrant',
      visitDate: new Date('2023-10-17'),
      groupType: 'solo',
      nationality: 'AU',
      language: 'en',
      helpfulVotes: 8
    });

    console.log('✅ Added tourist reviews for comparison analysis');

    // 5. Demonstrate Community Interaction
    console.log('\n5. 👍 Demonstrating Community Interaction');
    console.log('-'.repeat(40));

    await insightsService.upvoteInsight(insight1.id, 'user_123');
    await insightsService.upvoteInsight(insight1.id, 'user_456');
    await insightsService.upvoteInsight(insight1.id, 'user_789');

    await insightsService.upvoteInsight(insight3.id, 'user_abc');
    await insightsService.upvoteInsight(insight3.id, 'user_def');

    console.log('✅ Community members upvoted quality insights');

    // 6. Review Comparison Analysis
    console.log('\n6. 📊 Local vs Tourist Review Comparison');
    console.log('-'.repeat(40));

    const comparison1 = await comparisonService.getLocationComparison('dim_sum_restaurant_123');
    console.log(`\n🥟 Dim Sum Restaurant Analysis:`);
    console.log(`   Local Rating: ${comparison1.localPerspective.averageRating.toFixed(1)}/5`);
    console.log(`   Tourist Rating: ${comparison1.touristPerspective.averageRating.toFixed(1)}/5`);
    console.log(`   Discrepancy Score: ${comparison1.discrepancyScore.toFixed(1)}/100`);
    console.log(`   Authenticity Indicators: ${comparison1.authenticityIndicators.join(', ')}`);

    const comparison2 = await comparisonService.getLocationComparison('tourist_trap_restaurant_456');
    console.log(`\n⚠️  Tourist Trap Restaurant Analysis:`);
    console.log(`   Local Rating: ${comparison2.localPerspective.averageRating.toFixed(1)}/5`);
    console.log(`   Tourist Rating: ${comparison2.touristPerspective.averageRating.toFixed(1)}/5`);
    console.log(`   Discrepancy Score: ${comparison2.discrepancyScore.toFixed(1)}/100`);

    const touristTrapIndicators = await comparisonService.getTouristTrapIndicators('tourist_trap_restaurant_456');
    console.log(`   Tourist Trap Confidence: ${touristTrapIndicators.confidence.toFixed(1)}%`);
    console.log(`   Warning Indicators: ${touristTrapIndicators.indicators.join(', ')}`);

    // 7. Authenticity Scoring
    console.log('\n7. 🎯 Authenticity Scoring System');
    console.log('-'.repeat(40));

    const metrics1 = await authenticityService.calculateAuthenticityMetrics('dim_sum_restaurant_123');
    console.log(`\n🥟 Dim Sum Restaurant Authenticity Metrics:`);
    console.log(`   Overall Authenticity Score: ${metrics1.authenticityScore.toFixed(1)}/100`);
    console.log(`   Local vs Tourist Ratio: ${metrics1.localVsTouristRatio.toFixed(1)}%`);
    console.log(`   Tourist Trap Score: ${metrics1.touristTrapScore.toFixed(1)}/100`);
    console.log(`   Cultural Preservation Score: ${metrics1.culturalPreservationScore.toFixed(1)}/100`);

    const metrics2 = await authenticityService.calculateAuthenticityMetrics('tourist_trap_restaurant_456');
    console.log(`\n⚠️  Tourist Trap Restaurant Authenticity Metrics:`);
    console.log(`   Overall Authenticity Score: ${metrics2.authenticityScore.toFixed(1)}/100`);
    console.log(`   Tourist Trap Score: ${metrics2.touristTrapScore.toFixed(1)}/100`);

    // 8. Insight Authenticity Validation
    console.log('\n8. 🔍 Insight Authenticity Validation');
    console.log('-'.repeat(40));

    const validation1 = await authenticityService.validateInsightAuthenticity(insight1.id);
    console.log(`\n✅ High-Quality Insight Validation:`);
    console.log(`   Is Authentic: ${validation1.isAuthentic}`);
    console.log(`   Confidence: ${validation1.confidence.toFixed(1)}%`);
    console.log(`   Factors: ${validation1.factors.join(', ')}`);

    // 9. Get Recommendations
    console.log('\n9. 🌟 Getting Recommendations');
    console.log('-'.repeat(40));

    const topInsights = await insightsService.getTopRatedInsights(3);
    console.log(`\nTop Rated Local Insights:`);
    topInsights.forEach((insight, index) => {
      console.log(`   ${index + 1}. "${insight.title}" (Rating: ${insight.localRating}, Upvotes: ${insight.upvotes})`);
    });

    const touristTrapWarnings = await insightsService.getTouristTrapWarnings();
    console.log(`\nTourist Trap Warnings:`);
    touristTrapWarnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. "${warning.title}"`);
    });

    const highAuthenticityInsights = await insightsService.getHighAuthenticityInsights(70);
    console.log(`\nHigh Authenticity Insights (>70 score):`);
    highAuthenticityInsights.forEach((insight, index) => {
      console.log(`   ${index + 1}. "${insight.title}" (Authenticity: ${insight.authenticityScore.toFixed(1)})`);
    });

    // 10. Filtering and Search
    console.log('\n10. 🔍 Filtering and Search Capabilities');
    console.log('-'.repeat(40));

    const foodInsights = await insightsService.getInsightsWithFilters({ 
      tags: ['dim_sum', 'food'] 
    });
    console.log(`\nFood-related insights: ${foodInsights.length} found`);

    const culturalInsights = await insightsService.getInsightsWithFilters({ 
      category: 'cultural_context' 
    });
    console.log(`Cultural context insights: ${culturalInsights.length} found`);

    const restaurantInsights = await insightsService.getInsightsWithFilters({ 
      locationType: 'restaurant' 
    });
    console.log(`Restaurant insights: ${restaurantInsights.length} found`);

    // 11. Resident Statistics
    console.log('\n11. 📈 Resident Statistics');
    console.log('-'.repeat(40));

    const verifiedResidents = await residentService.getVerifiedResidents();
    console.log(`\nTotal verified residents: ${verifiedResidents.length}`);

    const foodExperts = await residentService.getResidentsBySpecialty('food');
    console.log(`Food experts: ${foodExperts.length}`);

    const centralResidents = await residentService.getResidentsByDistrict('Central');
    console.log(`Central district residents: ${centralResidents.length}`);

    console.log('\n🎉 Local Insights Demo Completed Successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    // Clean up
    await residentService.clearAllResidents();
    await insightsService.clearAllInsights();
    await comparisonService.clearAllData();
    await authenticityService.clearAllData();
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runLocalInsightsDemo().catch(console.error);
}

export { runLocalInsightsDemo };