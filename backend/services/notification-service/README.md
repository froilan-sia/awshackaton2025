# Notification Service

A comprehensive notification and alert system for the Hong Kong Tourism AI Platform that provides push notifications, weather-based activity alerts, crowd management notifications, and event reminders.

## Features

### Core Notification System
- **Push Notification Management**: Firebase-based push notifications for mobile devices
- **Template-based Notifications**: Pre-defined templates for consistent messaging
- **User Preferences**: Customizable notification settings including quiet hours
- **Priority-based Delivery**: Urgent, high, normal, and low priority notifications
- **Scheduled Notifications**: Support for future-scheduled notifications

### Specialized Alert Services

#### Weather Notification Service
- **Weather-aware Activity Alerts**: Notifications for outdoor activities based on weather conditions
- **Alternative Suggestions**: Indoor alternatives when weather is unfavorable
- **Preparation Tips**: Weather-specific preparation recommendations
- **Severity-based Prioritization**: Urgent alerts for severe weather conditions

#### Crowd Alert Service
- **Real-time Crowd Monitoring**: Alerts when destinations become overcrowded
- **Alternative Recommendations**: Nearby less crowded alternatives
- **Proactive Alerts**: Predictions for future crowd levels
- **Wait Time Estimates**: Current estimated wait times at popular attractions

#### Event Reminder Service
- **Event Subscriptions**: Subscribe to HKTB and local events
- **Activity Reminders**: Personal activity and itinerary reminders
- **Preparation Notifications**: Reminders with preparation tips and weather info
- **Flexible Timing**: Customizable reminder schedules (hours/days before)

## API Endpoints

### Device Management
- `POST /api/notifications/register-token` - Register device for push notifications
- `POST /api/notifications/unregister-token` - Unregister device token

### Notification Management
- `POST /api/notifications` - Create custom notification
- `POST /api/notifications/template` - Create notification from template
- `GET /api/notifications/user/:userId` - Get user notifications
- `GET /api/notifications/:notificationId` - Get specific notification

### User Preferences
- `POST /api/notifications/preferences` - Set user notification preferences
- `GET /api/notifications/preferences/:userId` - Get user preferences

### Specialized Services
- `POST /api/notifications/weather/check` - Trigger weather-based notifications
- `POST /api/notifications/crowd/check` - Check crowd levels and send alerts
- `POST /api/notifications/crowd/subscribe` - Subscribe to crowd updates
- `POST /api/notifications/events/subscribe` - Subscribe to event reminders
- `POST /api/notifications/activities` - Add user activity for reminders

### System Management
- `GET /api/notifications/health` - Health check
- `GET /api/notifications/stats/overview` - Service statistics
- `POST /api/notifications/process` - Manually process pending notifications

## Notification Types

1. **Weather Alert** (`weather_alert`)
   - Severe weather warnings
   - Activity-specific weather recommendations
   - Indoor alternative suggestions

2. **Crowd Alert** (`crowd_alert`)
   - High crowd level warnings
   - Wait time notifications
   - Alternative location suggestions

3. **Event Reminder** (`event_reminder`)
   - HKTB event notifications
   - Mall and venue event reminders
   - Preparation and weather information

4. **Activity Reminder** (`activity_reminder`)
   - Personal itinerary reminders
   - Weather-specific preparation tips
   - Location-based guidance

5. **Safety Alert** (`safety_alert`)
   - Emergency notifications
   - Safety warnings and instructions

6. **Cultural Tip** (`cultural_tip`)
   - Location-based cultural guidance
   - Etiquette and behavior tips

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3009
NODE_ENV=development

# Firebase Configuration (for push notifications)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id

# External Service URLs
WEATHER_SERVICE_URL=http://localhost:3008
CROWD_SERVICE_URL=http://localhost:3003
EVENT_SERVICE_URL=http://localhost:3004
USER_SERVICE_URL=http://localhost:3001

# Notification Settings
NOTIFICATION_BATCH_SIZE=100
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
```

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firebase Cloud Messaging (FCM)
3. Generate a service account key
4. Configure the environment variables with your Firebase credentials

## Usage Examples

### Register Device Token
```javascript
const response = await fetch('/api/notifications/register-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    token: 'device-fcm-token'
  })
});
```

### Create Weather Alert
```javascript
const response = await fetch('/api/notifications/template', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    type: 'weather_alert',
    data: {
      weatherCondition: 'Heavy rain expected',
      alternativeCount: 3,
      activityName: 'Hiking',
      timeUntil: '2 hours'
    }
  })
});
```

### Subscribe to Event Reminders
```javascript
const response = await fetch('/api/notifications/events/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    eventId: 'hk-arts-festival-2024',
    reminderPreferences: {
      dayBefore: true,
      hoursBeforeOptions: [24, 4, 1],
      includePreparationTips: true,
      includeWeatherInfo: true
    }
  })
});
```

### Set User Preferences
```javascript
const response = await fetch('/api/notifications/preferences', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    enabledTypes: ['weather_alert', 'crowd_alert', 'event_reminder'],
    quietHours: { start: '22:00', end: '08:00' },
    timezone: 'Asia/Hong_Kong',
    language: 'en'
  })
});
```

## Automated Processing

The service includes automated cron jobs for:

- **Pending Notifications**: Processed every 5 minutes
- **Upcoming Reminders**: Processed every hour
- **Token Cleanup**: Invalid tokens cleaned daily at 2 AM

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm test -- tests/services/notificationService.test.ts
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Docker Support

```bash
# Build Docker image
docker build -t notification-service .

# Run container
docker run -p 3009:3009 --env-file .env notification-service
```

## Integration with Other Services

The notification service integrates with:

- **Weather Service**: For weather-based activity recommendations
- **Crowd Service**: For real-time crowd level monitoring
- **Event Service**: For HKTB and local event information
- **User Service**: For user preferences and authentication
- **Location Service**: For location-based content delivery

## Requirements Addressed

This implementation addresses the following requirements from the HK Tourism AI Platform:

- **Requirement 2.4**: Real-time crowd management notifications
- **Requirement 5.6**: Weather-based activity change notifications  
- **Requirement 6.1**: Location-based contextual notifications

## Architecture

The service follows a microservices architecture with:

- **Modular Design**: Separate services for different notification types
- **Template System**: Consistent messaging across notification types
- **Priority Queue**: Efficient processing of notifications by priority
- **Graceful Degradation**: Continues operation even when external services fail
- **Scalable Processing**: Automated background processing with cron jobs

## Error Handling

- **External API Failures**: Circuit breaker patterns with fallback data
- **Firebase Unavailability**: Graceful degradation with logging
- **Invalid Tokens**: Automatic cleanup and validation
- **Rate Limiting**: Built-in protection against spam notifications

## Security

- **Input Validation**: All API inputs are validated
- **Token Management**: Secure handling of device tokens
- **Privacy Controls**: User preferences for notification types
- **Data Protection**: No sensitive data in notification payloads