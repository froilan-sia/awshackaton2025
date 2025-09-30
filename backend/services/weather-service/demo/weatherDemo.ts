import dotenv from 'dotenv';
import { WeatherService } from '../src/services/weatherService';
import { WeatherRecommendationService } from '../src/services/weatherRecommendationService';
import { WeatherAlertService } from '../src/services/weatherAlertService';

// Load environment variables
dotenv.config();

async function demonstrateWeatherService() {
  console.log('🌤️  Hong Kong Tourism Weather Service Demo\n');

  try {
    // Initialize services
    const weatherService = new WeatherService();
    const recommendationService = new WeatherRecommendationService();
    const alertService = new WeatherAlertService(weatherService, recommendationService);

    // Hong Kong coordinates
    const lat = 22.3193;
    const lon = 114.1694;

    console.log('📍 Location: Hong Kong (22.3193, 114.1694)\n');

    // 1. Get current weather
    console.log('1️⃣  Current Weather:');
    console.log('━'.repeat(50));
    const currentWeather = await weatherService.getCurrentWeather(lat, lon);
    console.log(`🌡️  Temperature: ${currentWeather.temperature}°C (feels like ${currentWeather.feelsLike}°C)`);
    console.log(`💧 Humidity: ${currentWeather.humidity}%`);
    console.log(`💨 Wind: ${currentWeather.windSpeed} m/s`);
    console.log(`👁️  Visibility: ${currentWeather.visibility} km`);
    console.log(`☁️  Conditions: ${currentWeather.conditions[0]?.description || 'Unknown'}`);
    console.log(`⏰ Last updated: ${currentWeather.timestamp.toLocaleString()}\n`);

    // 2. Get weather forecast
    console.log('2️⃣  5-Day Weather Forecast:');
    console.log('━'.repeat(50));
    const forecast = await weatherService.getWeatherForecast(lat, lon, 5);
    forecast.forEach((day, index) => {
      console.log(`Day ${index + 1} (${day.date.toDateString()}):`);
      console.log(`  🌡️  ${day.temperature.min}°C - ${day.temperature.max}°C`);
      console.log(`  ☁️  ${day.conditions[0]?.description || 'Unknown'}`);
      console.log(`  🌧️  Rain chance: ${day.precipitationChance}%`);
      console.log(`  💨 Wind: ${day.windSpeed} m/s`);
      console.log('');
    });

    // 3. Get weather alerts
    console.log('3️⃣  Weather Alerts:');
    console.log('━'.repeat(50));
    const alerts = await weatherService.getWeatherAlerts(currentWeather, forecast);
    if (alerts.length === 0) {
      console.log('✅ No weather alerts at this time\n');
    } else {
      alerts.forEach(alert => {
        console.log(`⚠️  ${alert.title} (${alert.severity.toUpperCase()})`);
        console.log(`   ${alert.description}`);
        console.log(`   Affected activities: ${alert.affectedActivities.join(', ')}`);
        console.log(`   Recommendations:`);
        alert.recommendations.forEach(rec => console.log(`   • ${rec}`));
        console.log('');
      });
    }

    // 4. Get weather-based recommendations
    console.log('4️⃣  Weather-Based Activity Recommendations:');
    console.log('━'.repeat(50));
    const recommendations = recommendationService.generateWeatherBasedRecommendations(
      currentWeather,
      forecast,
      alerts
    );

    console.log('🎯 Activity Suitability Scores:');
    recommendations.activitySuitability.forEach(activity => {
      const emoji = activity.suitabilityScore >= 70 ? '🟢' : 
                   activity.suitabilityScore >= 40 ? '🟡' : '🔴';
      console.log(`${emoji} ${activity.activityType.replace('_', ' ')}: ${activity.suitabilityScore}/100`);
      
      if (activity.alternatives && activity.alternatives.length > 0) {
        console.log(`   💡 Alternatives: ${activity.alternatives.join(', ')}`);
      }
    });

    console.log('\n📋 General Recommendations:');
    recommendations.generalRecommendations.forEach(rec => {
      console.log(`• ${rec}`);
    });

    // 5. Demonstrate specific activity suitability
    console.log('\n5️⃣  Specific Activity Analysis:');
    console.log('━'.repeat(50));
    const hikingActivity = recommendations.activitySuitability.find(a => a.activityType === 'outdoor_hiking');
    if (hikingActivity) {
      console.log('🥾 Outdoor Hiking Analysis:');
      console.log(`   Score: ${hikingActivity.suitabilityScore}/100`);
      console.log('   Current conditions:');
      hikingActivity.conditions.forEach(condition => {
        console.log(`   • ${condition}`);
      });
      console.log('   Recommendations:');
      hikingActivity.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    // 6. Demonstrate alert subscription (mock)
    console.log('\n6️⃣  Alert Subscription Demo:');
    console.log('━'.repeat(50));
    alertService.subscribe({
      userId: 'demo-user',
      alertTypes: ['extreme_heat', 'heavy_rain', 'strong_wind'],
      location: { lat, lon },
      callback: (alert) => {
        console.log(`🚨 ALERT for demo-user: ${alert.title}`);
        console.log(`   ${alert.description}`);
      }
    });
    console.log('✅ Subscribed demo-user to weather alerts');

    // Start alert monitoring for demo
    alertService.startAlertMonitoring();
    console.log('✅ Alert monitoring started');

    console.log('\n🎉 Weather service demo completed successfully!');
    console.log('\n💡 Tips for integration:');
    console.log('• Use the weather service to get real-time conditions');
    console.log('• Integrate activity recommendations into your tourism app');
    console.log('• Set up alert subscriptions for users based on their preferences');
    console.log('• Cache weather data to reduce API calls and improve performance');
    console.log('• Consider user location for personalized weather information');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      console.log('\n💡 To run this demo:');
      console.log('1. Get an API key from OpenWeatherMap (https://openweathermap.org/api)');
      console.log('2. Create a .env file with: OPENWEATHER_API_KEY=your_api_key_here');
      console.log('3. Run the demo again');
    }
  }
}

// Run the demo
if (require.main === module) {
  demonstrateWeatherService();
}

export { demonstrateWeatherService };