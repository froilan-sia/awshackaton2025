import { ItineraryService } from '../src/services/itineraryService';
import { ItineraryRequest, GroupType, ActivityLevel, ModificationType, TransportationMode } from '../src/types/itinerary';

/**
 * Demo script showcasing the Itinerary Service functionality
 * This demonstrates the complete itinerary generation and modification workflow
 */

async function runItineraryDemo() {
  console.log('🎯 Hong Kong Tourism AI Platform - Itinerary Service Demo');
  console.log('=' .repeat(60));

  const itineraryService = new ItineraryService();

  try {
    // 1. Generate a personalized itinerary
    console.log('\n📋 Step 1: Generating Personalized Itinerary');
    console.log('-'.repeat(50));

    const itineraryRequest: ItineraryRequest = {
      userId: 'demo-user-123',
      preferences: {
        interests: ['scenic', 'cultural', 'food', 'historic'],
        budgetRange: { min: 200, max: 800, currency: 'HKD' },
        groupType: GroupType.COUPLE,
        dietaryRestrictions: [],
        activityLevel: ActivityLevel.MODERATE,
        accessibilityNeeds: [],
        language: 'en'
      },
      startDate: new Date('2024-04-15'),
      endDate: new Date('2024-04-17'), // 3-day trip
      startLocation: { latitude: 22.2819, longitude: 114.1578 }, // Central, Hong Kong
      accommodationLocation: { latitude: 22.2976, longitude: 114.1722 }, // Tsim Sha Tsui
      constraints: {
        maxDailyWalkingDistance: 8000, // 8km max per day
        preferredStartTime: '09:00',
        preferredEndTime: '20:00',
        mustIncludeAttractions: ['hk-001'], // Victoria Peak
        transportationModes: [TransportationMode.WALKING, TransportationMode.MTR, TransportationMode.FERRY]
      }
    };

    const itinerary = await itineraryService.generateItinerary(itineraryRequest);
    
    console.log(`✅ Generated itinerary: "${itinerary.title}"`);
    console.log(`📅 Duration: ${itinerary.days.length} days`);
    console.log(`💰 Total estimated cost: HK$${itinerary.totalEstimatedCost}`);
    console.log(`🚶 Total walking distance: ${Math.round(itinerary.totalWalkingDistance)}m`);
    
    // Display daily breakdown
    itinerary.days.forEach((day, index) => {
      console.log(`\n📆 Day ${index + 1} (${day.date.toDateString()}):`);
      console.log(`   Activities: ${day.activities.length}`);
      console.log(`   Duration: ${Math.round(day.totalDuration / 60)} hours`);
      console.log(`   Cost: HK$${day.estimatedCost}`);
      
      day.activities.forEach((activity, actIndex) => {
        const startTime = activity.startTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const endTime = activity.endTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        console.log(`     ${actIndex + 1}. ${activity.name} (${startTime} - ${endTime})`);
        
        if (activity.travelFromPrevious) {
          console.log(`        🚶 Travel: ${activity.travelFromPrevious.duration}min via ${activity.travelFromPrevious.mode}`);
        }
      });
    });

    // 2. Get itinerary statistics
    console.log('\n📊 Step 2: Analyzing Itinerary Statistics');
    console.log('-'.repeat(50));

    const stats = await itineraryService.getItineraryStats(itinerary.id);
    if (stats) {
      console.log(`📈 Statistics for "${itinerary.title}":`);
      console.log(`   Total activities: ${stats.totalActivities}`);
      console.log(`   Average activities per day: ${stats.avgActivitiesPerDay}`);
      console.log(`   Total duration: ${Math.round(stats.totalDuration / 60)} hours`);
      console.log(`   Category distribution:`, stats.categoryDistribution);
    }

    // 3. Validate the itinerary
    console.log('\n✅ Step 3: Validating Itinerary');
    console.log('-'.repeat(50));

    const validation = await itineraryService.validateItinerary(itinerary.id);
    console.log(`Validation result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (validation.issues.length > 0) {
      console.log('Issues found:');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    // 4. Get modification suggestions
    console.log('\n💡 Step 4: Getting Modification Suggestions');
    console.log('-'.repeat(50));

    const suggestions = await itineraryService.getModificationSuggestions(itinerary.id);
    console.log(`Found ${suggestions.length} suggestions:`);
    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion.type}: ${suggestion.reason}`);
    });

    // 5. Apply a modification
    console.log('\n🔧 Step 5: Applying Weather-Based Modification');
    console.log('-'.repeat(50));

    const weatherModification = {
      type: ModificationType.WEATHER_ADJUSTMENT,
      reason: 'Simulated rain forecast - adjusting outdoor activities',
      timestamp: new Date()
    };

    const modificationResult = await itineraryService.modifyItinerary(
      itinerary.id, 
      weatherModification
    );

    if (modificationResult.success) {
      console.log('✅ Weather adjustment applied successfully');
      console.log(`Updated itinerary has ${modificationResult.itinerary!.days[0].activities.length} activities on day 1`);
    } else {
      console.log(`❌ Modification failed: ${modificationResult.error}`);
    }

    // 6. Optimize the itinerary
    console.log('\n⚡ Step 6: Optimizing Itinerary');
    console.log('-'.repeat(50));

    const optimizationResult = await itineraryService.optimizeItinerary(
      itinerary.id,
      itineraryRequest.preferences
    );

    if (optimizationResult.success && optimizationResult.optimizationResult) {
      const score = optimizationResult.optimizationResult;
      console.log(`✅ Optimization completed with score: ${(score.score * 100).toFixed(1)}%`);
      console.log('Optimization factors:');
      console.log(`   User preference match: ${(score.factors.userPreferenceMatch * 100).toFixed(1)}%`);
      console.log(`   Weather optimization: ${(score.factors.weatherOptimization * 100).toFixed(1)}%`);
      console.log(`   Travel efficiency: ${(score.factors.travelEfficiency * 100).toFixed(1)}%`);
      console.log(`   Time utilization: ${(score.factors.timeUtilization * 100).toFixed(1)}%`);
      console.log(`   Cost efficiency: ${(score.factors.costEfficiency * 100).toFixed(1)}%`);
      
      if (score.suggestions.length > 0) {
        console.log('Optimization suggestions:');
        score.suggestions.forEach(suggestion => {
          console.log(`   - ${suggestion}`);
        });
      }
    }

    // 7. Export itinerary
    console.log('\n📤 Step 7: Exporting Itinerary');
    console.log('-'.repeat(50));

    // Export as JSON
    const jsonExport = await itineraryService.exportItinerary(itinerary.id, 'json');
    console.log('✅ JSON export completed');
    console.log(`   Export contains ${jsonExport.days.length} days with ${jsonExport.days.reduce((sum: number, day: any) => sum + day.activities.length, 0)} activities`);

    // Export as calendar
    const calendarExport = await itineraryService.exportItinerary(itinerary.id, 'calendar');
    console.log('✅ Calendar export completed');
    console.log(`   Generated ${calendarExport.events.length} calendar events`);

    // 8. Share itinerary
    console.log('\n🔗 Step 8: Sharing Itinerary');
    console.log('-'.repeat(50));

    const shareResult = await itineraryService.shareItinerary(itinerary.id, {
      publicLink: true,
      email: 'friend@example.com',
      permissions: ['view', 'comment']
    });

    if (shareResult.success) {
      console.log('✅ Itinerary shared successfully');
      console.log(`   Share URL: ${shareResult.shareUrl}`);
    }

    // 9. Demonstrate user itinerary management
    console.log('\n👤 Step 9: User Itinerary Management');
    console.log('-'.repeat(50));

    // Create another itinerary for the same user
    const secondItinerary = await itineraryService.generateItinerary({
      ...itineraryRequest,
      startDate: new Date('2024-05-01'),
      endDate: new Date('2024-05-02'),
      preferences: {
        ...itineraryRequest.preferences,
        interests: ['shopping', 'nightlife', 'food']
      }
    });

    console.log(`✅ Created second itinerary: "${secondItinerary.title}"`);

    // Get all user itineraries
    const userItineraries = await itineraryService.getUserItineraries('demo-user-123');
    console.log(`📋 User has ${userItineraries.length} itineraries:`);
    userItineraries.forEach((itin, index) => {
      console.log(`   ${index + 1}. ${itin.title} (${itin.days.length} days)`);
    });

    // 10. Demonstrate real-time modifications
    console.log('\n⚡ Step 10: Real-time Activity Management');
    console.log('-'.repeat(50));

    // Add a new activity
    const newActivityModification = {
      type: ModificationType.ADD_ACTIVITY,
      newActivity: {
        id: 'demo-activity-new',
        attractionId: 'hk-006',
        name: 'Central Market',
        description: 'Modern food hall in historic building',
        location: { latitude: 22.2819, longitude: 114.1578 },
        startTime: new Date('2024-04-15T15:00:00'),
        endTime: new Date('2024-04-15T16:30:00'),
        duration: 90,
        category: 'food',
        estimatedCost: 120,
        weatherDependent: false,
        practicalTips: []
      },
      reason: 'User requested to add food experience',
      timestamp: new Date()
    };

    const addResult = await itineraryService.modifyItinerary(
      itinerary.id,
      newActivityModification
    );

    if (addResult.success) {
      console.log('✅ Successfully added new activity');
      const updatedDay = addResult.itinerary!.days[0];
      console.log(`   Day 1 now has ${updatedDay.activities.length} activities`);
      console.log(`   Updated cost: HK$${updatedDay.estimatedCost}`);
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('=' .repeat(60));
    console.log('The Itinerary Service demonstrates:');
    console.log('✅ Personalized itinerary generation based on user preferences');
    console.log('✅ Weather-aware activity recommendations');
    console.log('✅ Time-based activity scheduling with travel calculations');
    console.log('✅ Real-time itinerary modifications');
    console.log('✅ Optimization algorithms for better user experience');
    console.log('✅ Comprehensive validation and quality assurance');
    console.log('✅ Multiple export formats and sharing capabilities');
    console.log('✅ User itinerary management and statistics');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Unknown error');
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runItineraryDemo().catch(console.error);
}

export { runItineraryDemo };