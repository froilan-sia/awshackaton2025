import { NotificationService } from '../src/services/notificationService';
import { PushNotificationService } from '../src/services/pushNotificationService';
import { WeatherNotificationService } from '../src/services/weatherNotificationService';
import { CrowdAlertService } from '../src/services/crowdAlertService';
import { EventReminderService } from '../src/services/eventReminderService';
import { 
  NotificationType, 
  NotificationPriority,
  UserNotificationPreferences 
} from '../src/types/notification';

async function demonstrateNotificationService() {
  console.log('🔔 Hong Kong Tourism AI Platform - Notification Service Demo\n');

  // Initialize services
  const pushService = new PushNotificationService();
  const notificationService = new NotificationService(pushService);
  const weatherNotificationService = new WeatherNotificationService(notificationService);
  const crowdAlertService = new CrowdAlertService(notificationService);
  const eventReminderService = new EventReminderService(notificationService);

  // Demo user
  const userId = 'demo-user-123';
  const deviceToken = 'demo-device-token-456';

  console.log('1. 📱 Registering device token for push notifications');
  pushService.registerUserToken(userId, deviceToken);
  console.log(`   ✅ Registered token for user: ${userId}\n`);

  console.log('2. ⚙️ Setting user notification preferences');
  const preferences: UserNotificationPreferences = {
    userId,
    enabledTypes: [
      NotificationType.WEATHER_ALERT,
      NotificationType.CROWD_ALERT,
      NotificationType.EVENT_REMINDER,
      NotificationType.ACTIVITY_REMINDER
    ],
    quietHours: { start: '22:00', end: '08:00' },
    timezone: 'Asia/Hong_Kong',
    language: 'en'
  };
  notificationService.setUserPreferences(preferences);
  console.log('   ✅ User preferences configured\n');

  console.log('3. 🌦️ Creating weather alert notification');
  const weatherAlert = await notificationService.createFromTemplate(
    NotificationType.WEATHER_ALERT,
    userId,
    {
      weatherCondition: 'Heavy rain with thunderstorms',
      alternativeCount: 4,
      activityName: 'Dragon\'s Back Hiking',
      timeUntil: '2 hours',
      issues: 'heavy rain expected, strong winds'
    },
    {
      priority: NotificationPriority.HIGH,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
    }
  );
  console.log(`   ✅ Weather alert created: ${weatherAlert?.title}`);
  console.log(`   📝 Message: ${weatherAlert?.body}\n`);

  console.log('4. 👥 Creating crowd alert notification');
  const crowdAlert = await notificationService.createFromTemplate(
    NotificationType.CROWD_ALERT,
    userId,
    {
      locationName: 'Victoria Peak',
      crowdLevel: 'extremely crowded',
      waitTime: 75,
      alternativeCount: 3,
      bestAlternative: 'Sky Terrace 428'
    },
    {
      priority: NotificationPriority.NORMAL
    }
  );
  console.log(`   ✅ Crowd alert created: ${crowdAlert?.title}`);
  console.log(`   📝 Message: ${crowdAlert?.body}\n`);

  console.log('5. 🎭 Creating event reminder notification');
  const eventReminder = await notificationService.createFromTemplate(
    NotificationType.EVENT_REMINDER,
    userId,
    {
      eventName: 'Hong Kong Arts Festival Opening',
      timeUntil: '1 hour',
      location: 'Hong Kong Cultural Centre',
      preparationTips: 'Arrive 30 minutes early, Smart casual dress code',
      weatherInfo: 'Clear skies, 24°C'
    },
    {
      priority: NotificationPriority.HIGH,
      scheduledFor: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
    }
  );
  console.log(`   ✅ Event reminder created: ${eventReminder?.title}`);
  console.log(`   📝 Message: ${eventReminder?.body}`);
  console.log(`   ⏰ Scheduled for: ${eventReminder?.scheduledFor?.toLocaleString()}\n`);

  console.log('6. 🏃‍♂️ Creating activity reminder notification');
  const activityReminder = await notificationService.createFromTemplate(
    NotificationType.ACTIVITY_REMINDER,
    userId,
    {
      activityName: 'Tsim Sha Tsui Promenade Walk',
      timeUntil: '30 minutes',
      location: 'Tsim Sha Tsui Waterfront',
      weatherCondition: 'partly cloudy',
      preparationTip: 'Bring camera for sunset photos. Comfortable walking shoes recommended.'
    },
    {
      priority: NotificationPriority.NORMAL
    }
  );
  console.log(`   ✅ Activity reminder created: ${activityReminder?.title}`);
  console.log(`   📝 Message: ${activityReminder?.body}\n`);

  console.log('7. 🚨 Creating urgent safety alert');
  const safetyAlert = await notificationService.createFromTemplate(
    NotificationType.SAFETY_ALERT,
    userId,
    {
      safetyMessage: 'Typhoon warning issued. Avoid outdoor activities and stay in safe locations.'
    },
    {
      priority: NotificationPriority.URGENT
    }
  );
  console.log(`   ✅ Safety alert created: ${safetyAlert?.title}`);
  console.log(`   📝 Message: ${safetyAlert?.body}\n`);

  console.log('8. 🏛️ Creating cultural tip notification');
  const culturalTip = await notificationService.createFromTemplate(
    NotificationType.CULTURAL_TIP,
    userId,
    {
      location: 'Wong Tai Sin Temple',
      culturalTip: 'Remove your hat and avoid pointing at the deities. Photography is allowed in most areas, but be respectful of worshippers.'
    },
    {
      priority: NotificationPriority.LOW
    }
  );
  console.log(`   ✅ Cultural tip created: ${culturalTip?.title}`);
  console.log(`   📝 Message: ${culturalTip?.body}\n`);

  console.log('9. 📊 Notification Statistics');
  const stats = notificationService.getStats();
  console.log(`   📈 Total notifications: ${stats.total}`);
  console.log(`   ✅ Sent: ${stats.sent}`);
  console.log(`   ⏳ Pending: ${stats.pending}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  console.log(`   ⏰ Expired: ${stats.expired}\n`);

  console.log('10. 📋 User Notifications History');
  const userNotifications = notificationService.getUserNotifications(userId);
  console.log(`   📱 User has ${userNotifications.length} notifications:`);
  userNotifications.slice(0, 3).forEach((notification, index) => {
    console.log(`   ${index + 1}. [${notification.type}] ${notification.title}`);
    console.log(`      Status: ${notification.status} | Priority: ${notification.priority}`);
    console.log(`      Created: ${notification.createdAt.toLocaleString()}`);
  });
  console.log('\n');

  console.log('11. 🌤️ Weather Notification Service Demo');
  const mockActivities = [
    {
      id: 'activity1',
      userId,
      name: 'Peak Circle Walk',
      scheduledTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
      location: 'Victoria Peak',
      isOutdoor: true,
      weatherSensitive: true
    },
    {
      id: 'activity2',
      userId,
      name: 'IFC Mall Shopping',
      scheduledTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      location: 'IFC Mall',
      isOutdoor: false,
      weatherSensitive: false
    }
  ];
  
  console.log('   🔍 Checking weather conditions for user activities...');
  await weatherNotificationService.checkWeatherAndNotify(userId, mockActivities);
  console.log('   ✅ Weather check completed\n');

  console.log('12. 👥 Crowd Alert Service Demo');
  const mockUserLocations = [
    {
      userId,
      currentLocation: { latitude: 22.2908, longitude: 114.1501 },
      intendedDestinations: ['victoria-peak', 'star-ferry-pier']
    }
  ];
  
  console.log('   🔍 Checking crowd levels for user destinations...');
  await crowdAlertService.checkCrowdLevelsAndNotify(mockUserLocations);
  console.log('   ✅ Crowd check completed\n');

  console.log('13. 🎪 Event Reminder Service Demo');
  
  // Subscribe to an event
  const eventSubscription = {
    userId,
    eventId: 'hk-arts-festival-2024',
    reminderPreferences: {
      dayBefore: false,
      hoursBeforeOptions: [4, 1],
      includePreparationTips: true,
      includeWeatherInfo: true
    }
  };
  
  console.log('   📅 Subscribing to event reminders...');
  await eventReminderService.subscribeToEvent(eventSubscription);
  console.log('   ✅ Event subscription created\n');

  // Add a user activity
  const userActivity = {
    id: 'activity-demo',
    userId,
    name: 'Symphony of Lights Viewing',
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    location: 'Tsim Sha Tsui Promenade',
    type: 'cultural' as const,
    isOutdoor: true,
    preparationItems: ['camera', 'jacket'],
    weatherConsiderations: ['check wind conditions'],
    estimatedDuration: 60
  };
  
  console.log('   🎯 Adding user activity...');
  await eventReminderService.addUserActivity(userActivity);
  console.log('   ✅ Activity added and reminders scheduled\n');

  console.log('14. ⚡ Processing Pending Notifications');
  await notificationService.processPendingNotifications();
  console.log('   ✅ All pending notifications processed\n');

  console.log('15. 🧹 Cleanup Demo');
  console.log('   🔄 Cleaning up invalid push tokens...');
  await pushService.cleanupInvalidTokens();
  console.log('   ✅ Token cleanup completed\n');

  console.log('🎉 Notification Service Demo Completed!');
  console.log('\nKey Features Demonstrated:');
  console.log('✅ Push notification token management');
  console.log('✅ User preference management');
  console.log('✅ Template-based notification creation');
  console.log('✅ Weather-aware activity notifications');
  console.log('✅ Crowd-based location alerts');
  console.log('✅ Event and activity reminders');
  console.log('✅ Priority-based notification scheduling');
  console.log('✅ Quiet hours handling');
  console.log('✅ Notification statistics and history');
  console.log('✅ Automated notification processing');
  console.log('✅ Error handling and graceful degradation');
}

// Run the demo
if (require.main === module) {
  demonstrateNotificationService().catch(console.error);
}

export { demonstrateNotificationService };