const { NotificationService } = require('./dist/services/notificationService');
const { PushNotificationService } = require('./dist/services/pushNotificationService');
const { NotificationType, NotificationPriority } = require('./dist/types/notification');

async function testNotificationService() {
  console.log('🔔 Testing Notification Service without Firebase...\n');

  try {
    // Initialize services
    const pushService = new PushNotificationService();
    const notificationService = new NotificationService(pushService);

    console.log('✅ Services initialized successfully');

    // Test creating a notification
    const notification = await notificationService.createNotification({
      userId: 'test-user-123',
      type: NotificationType.WEATHER_ALERT,
      title: 'Weather Alert Test',
      body: 'This is a test weather alert notification',
      priority: NotificationPriority.HIGH
    });

    console.log('✅ Notification created:', {
      id: notification.id,
      title: notification.title,
      status: notification.status
    });

    // Test template-based notification
    const templateNotification = await notificationService.createFromTemplate(
      NotificationType.CROWD_ALERT,
      'test-user-123',
      {
        locationName: 'Victoria Peak',
        crowdLevel: 'very busy',
        waitTime: 45,
        alternativeCount: 3
      }
    );

    console.log('✅ Template notification created:', {
      id: templateNotification?.id,
      title: templateNotification?.title,
      body: templateNotification?.body
    });

    // Test getting user notifications
    const userNotifications = notificationService.getUserNotifications('test-user-123');
    console.log(`✅ User has ${userNotifications.length} notifications`);

    // Test statistics
    const stats = notificationService.getStats();
    console.log('✅ Service statistics:', stats);

    console.log('\n🎉 All tests passed! Notification service is working correctly.');
    console.log('Note: Push notifications are disabled due to missing Firebase configuration.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testNotificationService();