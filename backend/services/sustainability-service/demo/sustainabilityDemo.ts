import { SustainabilityService } from '../src/services/sustainabilityService';
import { VisitType, TransportationMode, BusinessType } from '../src/types/sustainability';

async function runSustainabilityDemo() {
  console.log('🌱 Hong Kong Tourism Sustainability Service Demo\n');

  const service = new SustainabilityService();

  try {
    // 1. Add Local Businesses
    console.log('📍 Adding local businesses...');
    
    const localRestaurant = await service.addLocalBusiness({
      name: 'Tai Cheong Bakery',
      type: BusinessType.RESTAURANT,
      location: {
        latitude: 22.2783,
        longitude: 114.1747,
        district: 'Central',
        address: '35 Lyndhurst Terrace, Central'
      },
      localOwnership: true,
      employeesCount: 12,
      certifications: ['Local Heritage', 'Traditional Craft', 'Community Favorite']
    });

    const culturalSite = await service.addLocalBusiness({
      name: 'Yau Ma Tei Theatre',
      type: BusinessType.CULTURAL_SITE,
      location: {
        latitude: 22.3080,
        longitude: 114.1696,
        district: 'Yau Ma Tei',
        address: '6 Waterloo Road, Yau Ma Tei'
      },
      localOwnership: true,
      employeesCount: 25,
      certifications: ['Cultural Heritage', 'Community Arts', 'Traditional Performance']
    });

    const localShop = await service.addLocalBusiness({
      name: 'Wan Chai Local Market',
      type: BusinessType.SHOP,
      location: {
        latitude: 22.2783,
        longitude: 114.1747,
        district: 'Wan Chai',
        address: '123 Johnston Road, Wan Chai'
      },
      localOwnership: true,
      employeesCount: 8,
      certifications: ['Local Products', 'Sustainable Sourcing']
    });

    console.log(`✅ Added ${localRestaurant.name} (Score: ${localRestaurant.sustainabilityScore})`);
    console.log(`✅ Added ${culturalSite.name} (Score: ${culturalSite.sustainabilityScore})`);
    console.log(`✅ Added ${localShop.name} (Score: ${localShop.sustainabilityScore})\n`);

    // 2. Simulate Tourist Visits
    console.log('🚶‍♂️ Simulating sustainable tourist journey...');
    
    const userId = 'demo-tourist-123';
    
    // Day 1: Sustainable exploration
    await service.trackBusinessVisit({
      userId,
      businessId: localRestaurant.id,
      duration: 45,
      estimatedSpending: 180,
      visitType: VisitType.DINING,
      transportationMode: TransportationMode.WALKING,
      distance: 0.8
    });

    await service.trackBusinessVisit({
      userId,
      businessId: culturalSite.id,
      duration: 120,
      estimatedSpending: 80,
      visitType: VisitType.SIGHTSEEING,
      transportationMode: TransportationMode.PUBLIC_TRANSPORT,
      distance: 5.2
    });

    // Day 2: Mixed transportation
    await service.trackBusinessVisit({
      userId,
      businessId: localShop.id,
      duration: 60,
      estimatedSpending: 150,
      visitType: VisitType.SHOPPING,
      transportationMode: TransportationMode.FERRY,
      distance: 3.5
    });

    await service.trackBusinessVisit({
      userId,
      businessId: localRestaurant.id,
      duration: 30,
      estimatedSpending: 120,
      visitType: VisitType.DINING,
      transportationMode: TransportationMode.TAXI,
      distance: 4.0
    });

    console.log('✅ Tracked 4 business visits\n');

    // 3. Get User Sustainability Metrics
    console.log('📊 User Sustainability Metrics:');
    const metrics = await service.getUserSustainabilityMetrics(userId);
    
    console.log(`   Total Visits: ${metrics.totalVisits}`);
    console.log(`   Average Sustainability Score: ${metrics.averageSustainabilityScore}/100`);
    console.log(`   Eco-friendly Transport Usage: ${metrics.ecoTransportUsage}%`);
    console.log(`   Local Economic Impact: HK$${metrics.localEconomicImpact.toFixed(2)}`);
    console.log(`   Carbon Saved: ${metrics.carbonSaved.toFixed(2)} kg CO2\n`);

    // 4. Generate Trip Summary
    console.log('📋 Generating trip impact summary...');
    const tripStartDate = new Date('2024-01-15');
    const tripEndDate = new Date('2024-01-17');
    
    const tripSummary = await service.generateTripSummary(
      userId,
      'demo-trip-hk-2024',
      tripStartDate,
      tripEndDate
    );

    console.log(`   Trip ID: ${tripSummary.tripId}`);
    const tripDuration = Math.ceil((tripSummary.endDate.getTime() - tripSummary.startDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`   Duration: ${tripDuration} days`);
    console.log(`   Sustainability Score: ${tripSummary.sustainabilityScore}/100`);
    console.log(`   Local Businesses Visited: ${tripSummary.localBusinessesVisited}`);
    console.log(`   Total Carbon Footprint: ${tripSummary.totalCarbonFootprint.toFixed(2)} kg CO2`);
    console.log(`   Total Economic Impact: HK$${tripSummary.totalEconomicImpact.toFixed(2)}`);
    console.log(`   Eco-friendly Transport: ${tripSummary.ecoFriendlyTransportUsage}%\n`);

    // 5. Get Detailed Impact Report
    console.log('📈 Detailed Impact Report:');
    const detailedReport = await service.generateDetailedImpactReport(tripSummary.tripId);
    
    if (detailedReport) {
      console.log('   🌟 Sustainability Highlights:');
      detailedReport.breakdown.sustainabilityHighlights.forEach((highlight: string) => {
        console.log(`     ${highlight}`);
      });

      console.log('\n   💡 Improvement Suggestions:');
      detailedReport.breakdown.improvementSuggestions.forEach((suggestion: string) => {
        console.log(`     ${suggestion}`);
      });

      console.log('\n   🚗 Transportation Breakdown:');
      detailedReport.breakdown.transportationBreakdown.forEach((transport: any) => {
        console.log(`     ${transport.mode}: ${transport.usage}% usage, ${transport.emissions.toFixed(2)} kg CO2`);
      });

      console.log('\n   🏪 Economic Impact by District:');
      detailedReport.breakdown.economicImpactByDistrict.forEach((district: any) => {
        console.log(`     ${district.district}: HK$${district.impact.toFixed(2)}`);
      });
    }

    // 6. Get Eco-friendly Transport Recommendations
    console.log('\n🚌 Eco-friendly Transport Recommendations (Central to Admiralty):');
    const transportRecommendations = await service.getEcoTransportRecommendations(
      'Central',
      'Admiralty',
      { prioritizeSustainability: true, maxCost: 50 }
    );

    transportRecommendations.forEach((option, index) => {
      console.log(`   ${index + 1}. ${option.type.replace('_', ' ').toUpperCase()}`);
      console.log(`      Carbon Footprint: ${option.carbonFootprint} kg CO2/km`);
      console.log(`      Cost: HK$${option.cost}`);
      console.log(`      Duration: ${option.duration} minutes`);
      console.log(`      Benefit: ${option.sustainabilityBenefit}`);
    });

    // 7. Calculate Carbon Footprint for Mixed Journey
    console.log('\n🌍 Carbon Footprint Calculation for Mixed Journey:');
    const mixedJourney = [
      { mode: TransportationMode.WALKING, distance: 2 },
      { mode: TransportationMode.PUBLIC_TRANSPORT, distance: 8 },
      { mode: TransportationMode.FERRY, distance: 3 },
      { mode: TransportationMode.TAXI, distance: 5 }
    ];

    const totalFootprint = await service.calculateTripCarbonFootprint(mixedJourney);
    console.log(`   Total Carbon Footprint: ${totalFootprint.toFixed(2)} kg CO2`);
    
    mixedJourney.forEach(segment => {
      console.log(`   ${segment.mode}: ${segment.distance}km`);
    });

    // 8. Get Comprehensive Sustainability Insights
    console.log('\n🎯 Comprehensive Sustainability Insights:');
    const insights = await service.getSustainabilityInsights(userId);
    
    console.log(`   Overall Sustainability Score: ${insights.overallScore}/100`);
    console.log(`   Recent Trips: ${insights.recentTrips.length}`);
    
    console.log('\n   🏆 Achievements:');
    insights.achievements.forEach(achievement => {
      console.log(`     ${achievement}`);
    });

    console.log('\n   📝 Personalized Recommendations:');
    insights.recommendations.forEach(recommendation => {
      console.log(`     ${recommendation}`);
    });

    // 9. Compare with Benchmarks
    console.log('\n📊 Benchmark Comparison:');
    const benchmarkComparison = await service.compareWithBenchmarks(tripSummary.tripId);
    
    if (benchmarkComparison) {
      console.log(`   Your Score: ${benchmarkComparison.userScore}/100`);
      console.log(`   Average Score: ${benchmarkComparison.averageScore}/100`);
      console.log(`   Percentile: ${benchmarkComparison.percentile}th`);
      console.log(`   Performance: ${benchmarkComparison.comparison}`);
    }

    // 10. Get Transport Mode Impact Information
    console.log('\n🚗 Transport Mode Impact Comparison:');
    const transportModes = [
      TransportationMode.WALKING,
      TransportationMode.PUBLIC_TRANSPORT,
      TransportationMode.TAXI,
      TransportationMode.PRIVATE_CAR
    ];

    for (const mode of transportModes) {
      const impact = await service.getTransportModeImpact(mode);
      console.log(`   ${mode.replace('_', ' ').toUpperCase()}:`);
      console.log(`     Carbon: ${impact.carbonFootprint} kg CO2/km`);
      console.log(`     Rating: ${impact.sustainabilityRating}`);
      console.log(`     Impact: ${impact.description}`);
    }

    console.log('\n✅ Demo completed successfully!');
    console.log('\n🌱 This demo showcases how the sustainability service helps tourists:');
    console.log('   • Track visits to local businesses for economic impact');
    console.log('   • Calculate sustainability scores based on choices');
    console.log('   • Get eco-friendly transportation recommendations');
    console.log('   • Generate comprehensive trip impact reports');
    console.log('   • Receive personalized sustainability insights');
    console.log('   • Compare performance with other sustainable travelers');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runSustainabilityDemo();
}

export { runSustainabilityDemo };