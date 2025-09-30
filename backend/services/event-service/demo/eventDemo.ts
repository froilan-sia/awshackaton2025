import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EventService } from '../src/services/eventService';
import { EventCategory, EventSource } from '../src/types/event';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hk-tourism-events';

async function runEventDemo() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const eventService = new EventService();

    console.log('\n=== Hong Kong Tourism Event Service Demo ===\n');

    // 1. Sync events from all sources
    console.log('1. Syncing events from all sources...');
    const syncResult = await eventService.syncAllEvents();
    console.log('Sync Result:', syncResult);

    // 2. Get upcoming events
    console.log('\n2. Getting upcoming events...');
    const upcomingEvents = await eventService.getUpcomingEvents(5);
    console.log(`Found ${upcomingEvents.length} upcoming events:`);
    upcomingEvents.forEach(event => {
      console.log(`- ${event.title} (${event.source}) - ${event.location.district}`);
    });

    // 3. Get events by source
    console.log('\n3. Getting HKTB events...');
    const hktbEvents = await eventService.getEventsBySource(EventSource.HKTB, 3);
    console.log(`Found ${hktbEvents.length} HKTB events:`);
    hktbEvents.forEach(event => {
      console.log(`- ${event.title} - ${event.startTime.toDateString()}`);
    });

    console.log('\n4. Getting Mall events...');
    const mallEvents = await eventService.getEventsBySource(EventSource.MALL, 3);
    console.log(`Found ${mallEvents.length} Mall events:`);
    mallEvents.forEach(event => {
      console.log(`- ${event.title} at ${event.location.venue}`);
    });

    // 4. Search events
    console.log('\n5. Searching for art events...');
    const artEvents = await eventService.searchEvents('art', 3);
    console.log(`Found ${artEvents.length} art-related events:`);
    artEvents.forEach(event => {
      console.log(`- ${event.title} - ${event.description.substring(0, 50)}...`);
    });

    // 5. Get nearby events
    console.log('\n6. Getting events near Central (22.2783, 114.1747)...');
    const nearbyEvents = await eventService.getNearbyEvents(22.2783, 114.1747, 5, 3);
    console.log(`Found ${nearbyEvents.length} nearby events:`);
    nearbyEvents.forEach(event => {
      console.log(`- ${event.title} at ${event.location.venue} (${event.location.district})`);
    });

    // 6. Get personalized recommendations
    console.log('\n7. Getting personalized recommendations for art lover...');
    const userPreferences = {
      interests: ['art', 'culture', 'exhibition'],
      budgetRange: 'medium' as const,
      groupType: 'couple' as const,
      ageGroup: 'adult' as const,
      language: 'en'
    };

    const recommendations = await eventService.getPersonalizedRecommendations(userPreferences, undefined, 3);
    console.log(`Found ${recommendations.length} personalized recommendations:`);
    recommendations.forEach(rec => {
      console.log(`- ${rec.event.title} (Score: ${rec.score.toFixed(2)})`);
      console.log(`  Reasons: ${rec.reasons.join(', ')}`);
      console.log(`  Local Authenticity: ${rec.event.localPerspective.authenticityScore}/10`);
    });

    // 7. Get filtered events
    console.log('\n8. Getting free family events...');
    const familyEvents = await eventService.getEvents({
      categories: [EventCategory.FAMILY],
      isFree: true
    });
    console.log(`Found ${familyEvents.length} free family events:`);
    familyEvents.forEach(event => {
      console.log(`- ${event.title} - ${event.targetAudience.join(', ')}`);
    });

    // 8. Get event statistics
    console.log('\n9. Getting event statistics...');
    const stats = await eventService.getEventStatistics();
    console.log('Event Statistics:');
    console.log(`- Total events: ${stats.total}`);
    console.log(`- Upcoming events: ${stats.upcoming}`);
    console.log(`- Events this week: ${stats.thisWeek}`);
    console.log('- By source:', stats.bySource);
    console.log('- By category:', stats.byCategory);

    // 9. Demonstrate local insights
    console.log('\n10. Showcasing local insights...');
    const culturalEvents = await eventService.getEvents({
      categories: [EventCategory.CULTURAL]
    });
    
    if (culturalEvents.length > 0) {
      const event = culturalEvents[0];
      console.log(`Event: ${event.title}`);
      console.log(`Local Perspective:`);
      console.log(`- Local Popularity: ${event.localPerspective.localPopularity}/10`);
      console.log(`- Authenticity Score: ${event.localPerspective.authenticityScore}/10`);
      console.log(`- Local Recommendation: ${event.localPerspective.localRecommendation ? 'Yes' : 'No'}`);
      console.log(`- Cultural Significance: ${event.localPerspective.culturalSignificance}`);
      if (event.localPerspective.localTips.length > 0) {
        console.log(`- Local Tips: ${event.localPerspective.localTips.join('; ')}`);
      }
    }

    // 10. Demonstrate practical information
    console.log('\n11. Showcasing practical information...');
    if (upcomingEvents.length > 0) {
      const event = upcomingEvents[0];
      console.log(`Event: ${event.title}`);
      console.log(`Practical Information:`);
      console.log(`- Languages supported: ${event.practicalInfo.languageSupport.join(', ')}`);
      console.log(`- Wheelchair accessible: ${event.practicalInfo.accessibility.wheelchairAccessible ? 'Yes' : 'No'}`);
      console.log(`- Weather dependent: ${event.weatherDependent ? 'Yes' : 'No'}`);
      if (event.practicalInfo.whatToBring.length > 0) {
        console.log(`- What to bring: ${event.practicalInfo.whatToBring.join(', ')}`);
      }
      if (event.practicalInfo.parkingInfo?.available) {
        console.log(`- Parking available: Yes (Cost: $${event.practicalInfo.parkingInfo.cost}/hour)`);
      }
    }

    console.log('\n=== Demo completed successfully! ===');

  } catch (error) {
    console.error('Demo error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the demo
if (require.main === module) {
  runEventDemo();
}

export { runEventDemo };