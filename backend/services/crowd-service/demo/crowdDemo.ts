import { CrowdService } from '../src/services/crowdService';
import { CrowdLevel, RoutePoint } from '../src/types/crowd';

/**
 * Demo script showcasing the crowd management and real-time data processing functionality
 */
async function runCrowdDemo() {
  console.log('🚀 Starting Crowd Management Demo...\n');

  const crowdService = new CrowdService();

  try {
    // Demo 1: Get crowd data for popular Hong Kong attractions
    console.log('📊 Demo 1: Getting crowd data for popular attractions');
    console.log('=' .repeat(60));

    const popularLocations = ['hk-disneyland', 'victoria-peak', 'tsim-sha-tsui-promenade', 'central-ifc-mall'];
    
    for (const locationId of popularLocations) {
      const crowdInfo = await crowdService.getLocationCrowdInfo(locationId);
      
      if (!crowdInfo.error) {
        console.log(`📍 ${crowdInfo.crowdData.locationName}:`);
        console.log(`   Crowd Level: ${crowdInfo.crowdData.crowdLevel}`);
        console.log(`   Wait Time: ${crowdInfo.crowdData.estimatedWaitTime} minutes`);
        console.log(`   Occupancy: ${crowdInfo.crowdData.currentOccupancy}/${crowdInfo.crowdData.capacity} (${Math.round((crowdInfo.crowdData.currentOccupancy / crowdInfo.crowdData.capacity) * 100)}%)`);
        
        if (crowdInfo.isOvercrowded) {
          console.log(`   ⚠️  OVERCROWDED - Consider alternatives!`);
          
          if (crowdInfo.alternatives) {
            console.log(`   🔄 Alternatives available: ${crowdInfo.alternatives.alternatives.length}`);
            crowdInfo.alternatives.alternatives.slice(0, 2).forEach((alt: any, index: number) => {
              console.log(`      ${index + 1}. ${alt.locationName} (${alt.distance}m away, ${alt.crowdLevel} crowd)`);
            });
          }
          
          if (crowdInfo.optimalVisitTime) {
            console.log(`   ⏰ Better time to visit: ${crowdInfo.optimalVisitTime.toLocaleTimeString()}`);
          }
        } else {
          console.log(`   ✅ Good time to visit!`);
        }
        console.log('');
      }
    }

    // Demo 2: Bulk crowd data retrieval
    console.log('\n📦 Demo 2: Bulk crowd data retrieval');
    console.log('=' .repeat(60));

    const bulkCrowdInfo = await crowdService.getBulkCrowdInfo(popularLocations);
    console.log(`Retrieved crowd data for ${Object.keys(bulkCrowdInfo).length} locations simultaneously`);
    
    const overcrowdedCount = Object.values(bulkCrowdInfo).filter((info: any) => info.isOvercrowded).length;
    console.log(`${overcrowdedCount} locations are currently overcrowded\n`);

    // Demo 3: Route optimization
    console.log('🗺️  Demo 3: Smart route optimization');
    console.log('=' .repeat(60));

    const sampleRoute: RoutePoint[] = [
      {
        locationId: 'hk-disneyland',
        coordinates: { latitude: 22.3129, longitude: 114.0413 },
        estimatedArrivalTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        estimatedDuration: 480, // 8 hours
        crowdLevel: CrowdLevel.LOW
      },
      {
        locationId: 'victoria-peak',
        coordinates: { latitude: 22.2783, longitude: 114.1747 },
        estimatedArrivalTime: new Date(Date.now() + 11 * 60 * 60 * 1000), // 11 hours from now
        estimatedDuration: 120, // 2 hours
        crowdLevel: CrowdLevel.LOW
      },
      {
        locationId: 'tsim-sha-tsui-promenade',
        coordinates: { latitude: 22.2940, longitude: 114.1722 },
        estimatedArrivalTime: new Date(Date.now() + 14 * 60 * 60 * 1000), // 14 hours from now
        estimatedDuration: 60, // 1 hour
        crowdLevel: CrowdLevel.LOW
      }
    ];

    console.log('Original route:');
    sampleRoute.forEach((point, index) => {
      console.log(`  ${index + 1}. ${point.locationId} at ${point.estimatedArrivalTime.toLocaleTimeString()}`);
    });

    const optimization = await crowdService.optimizeUserRoute('demo-user', sampleRoute);
    
    console.log('\nRoute optimization results:');
    console.log(`  Alternatives considered: ${optimization.alternativesConsidered}`);
    console.log(`  Time saved: ${optimization.estimatedTimeSaved} minutes`);
    console.log(`  Crowd avoidance score: ${(optimization.crowdAvoidanceScore * 100).toFixed(1)}%`);
    
    if (optimization.estimatedTimeSaved > 0) {
      console.log('\nOptimized route:');
      optimization.optimizedRoute.forEach((point, index) => {
        console.log(`  ${index + 1}. ${point.locationId} at ${point.estimatedArrivalTime.toLocaleTimeString()}`);
      });
    } else {
      console.log('  ✅ Original route is already optimal!');
    }

    // Demo 4: Subscription to crowd alerts
    console.log('\n🔔 Demo 4: Crowd alert subscriptions');
    console.log('=' .repeat(60));

    const subscriptionResult = await crowdService.subscribeToLocationAlerts('demo-user', popularLocations);
    console.log(`Subscription result: ${subscriptionResult.message}`);
    console.log(`Subscribed to alerts for: ${subscriptionResult.subscribedLocations.join(', ')}`);

    // Demo 5: Recommended visit times
    console.log('\n⏰ Demo 5: Recommended visit times');
    console.log('=' .repeat(60));

    const recommendedTimes = await crowdService.getRecommendedTimes(['hk-disneyland', 'victoria-peak']);
    
    for (const [locationId, times] of Object.entries(recommendedTimes)) {
      console.log(`📍 ${locationId}:`);
      if (Array.isArray(times) && times.length > 0) {
        console.log('   Best times to visit:');
        times.slice(0, 3).forEach((time: Date, index: number) => {
          console.log(`   ${index + 1}. ${time.toLocaleString()}`);
        });
      } else {
        console.log('   No specific recommendations available');
      }
      console.log('');
    }

    // Demo 6: High crowd locations monitoring
    console.log('🚨 Demo 6: High crowd locations monitoring');
    console.log('=' .repeat(60));

    const highCrowdLocations = await crowdService.getHighCrowdLocations();
    
    if (highCrowdLocations.length > 0) {
      console.log(`Found ${highCrowdLocations.length} locations with high crowd levels:`);
      highCrowdLocations.forEach((location, index) => {
        console.log(`  ${index + 1}. ${location.locationName}`);
        console.log(`     Crowd Level: ${location.crowdLevel}`);
        console.log(`     Wait Time: ${location.estimatedWaitTime} minutes`);
        console.log(`     Occupancy: ${Math.round((location.currentOccupancy / location.capacity) * 100)}%`);
      });
    } else {
      console.log('✅ No locations with high crowd levels at the moment');
    }

    // Demo 7: Service statistics
    console.log('\n📈 Demo 7: Service statistics');
    console.log('=' .repeat(60));

    const stats = crowdService.getServiceStats();
    console.log(`Connected users: ${stats.connectedUsers}`);
    console.log(`Monitoring active: ${stats.monitoringActive ? 'Yes' : 'No'}`);
    console.log(`Total subscriptions: ${stats.totalSubscriptions}`);

    console.log('\n✅ Demo completed successfully!');
    console.log('\nKey features demonstrated:');
    console.log('  ✓ Real-time crowd density tracking with mock data');
    console.log('  ✓ Alternative recommendations for overcrowded locations');
    console.log('  ✓ Smart route optimization to avoid crowds');
    console.log('  ✓ Real-time notification system setup');
    console.log('  ✓ Crowd-based alert subscriptions');
    console.log('  ✓ Optimal visit time recommendations');
    console.log('  ✓ High crowd location monitoring');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    // Cleanup
    crowdService.shutdown();
    console.log('\n🔄 Service shutdown complete');
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runCrowdDemo().catch(console.error);
}

export { runCrowdDemo };