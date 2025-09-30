# Hong Kong Tourism AI - Mobile App

A React Native mobile application that provides personalized tourism experiences for Hong Kong visitors using AI-powered recommendations, real-time crowd management, and location-based contextual content.

## Features

### Core Functionality
- **Personalized Recommendations**: AI-powered suggestions based on user preferences, weather, and crowd levels
- **Location-Based Guide**: Contextual information and practical tips triggered by GPS location
- **Real-time Notifications**: Weather alerts, crowd updates, and location-based content
- **Smart Itinerary Management**: Generate and modify personalized travel itineraries
- **Multi-language Support**: Content available in multiple languages with cultural context

### Key Screens
- **Home Screen**: Dashboard with current location, weather, and top recommendations
- **Recommendations Screen**: Filterable list of personalized attractions and activities
- **Itinerary Screen**: Manage and view personalized travel itineraries
- **Location Screen**: Interactive map and contextual guide for current location
- **Profile Screen**: User preferences and notification settings

## Technical Implementation

### Architecture
- **React Native** with Expo for cross-platform mobile development
- **TypeScript** for type safety and better development experience
- **React Navigation** for screen navigation and routing
- **Expo Location** for GPS tracking and geofencing
- **Expo Notifications** for push notifications and alerts
- **React Native Maps** for interactive map functionality

### Services
- **LocationService**: GPS tracking, geofencing, and location-based triggers
- **NotificationService**: Push notifications and local alerts
- **ApiService**: Backend communication and data management

### Key Features Implementation

#### Location Permission Handling
```typescript
// Requests location permissions on app startup
const { status } = await Location.requestForegroundPermissionsAsync();
if (status === 'granted') {
  LocationService.initialize();
}
```

#### GPS Integration
```typescript
// Real-time location tracking with geofencing
const unsubscribe = locationService.subscribeToLocationUpdates((location) => {
  // Trigger location-based content
  handleLocationChange(location);
});
```

#### Real-time Notifications
```typescript
// Weather-based activity suggestions
await notificationService.sendWeatherAlert(
  weatherCondition,
  updatedRecommendations
);

// Crowd level alerts with alternatives
await notificationService.sendCrowdAlert(
  locationName,
  crowdLevel,
  alternatives
);
```

#### Personalized Recommendations
```typescript
// Context-aware recommendations
const recommendations = await apiService.getPersonalizedRecommendations(
  currentLocation,
  {
    category: userPreferences.interests,
    weather: currentWeather,
    crowdLevel: preferredCrowdLevel
  }
);
```

## Requirements Addressed

### Requirement 1.1, 1.2, 1.3 - Personalized Itinerary Generation
- ✅ Weather-aware recommendations with indoor/outdoor alternatives
- ✅ User preference-based filtering (interests, budget, group type)
- ✅ Real-time itinerary updates based on conditions

### Requirement 2.1 - Real-time Crowd Management
- ✅ Crowd level display with color-coded indicators
- ✅ Alternative suggestions for busy attractions
- ✅ Real-time notifications for crowd alerts

### Requirement 6.1, 6.2 - Location-Based Contextual Guide
- ✅ Automatic content delivery based on GPS location
- ✅ Practical tips and cultural etiquette information
- ✅ Safety information and local recommendations

## Installation & Setup

1. **Install Dependencies**
   ```bash
   cd frontend/mobile
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

3. **Run on Device/Simulator**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   ```

## Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage
- **Unit Tests**: Services and utility functions
- **Component Tests**: Screen rendering and user interactions
- **Integration Tests**: Location services and API communication

## Configuration

### Environment Variables
Create a `.env` file in the mobile directory:
```
API_BASE_URL=http://localhost:3000
EXPO_PROJECT_ID=your-expo-project-id
```

### Permissions
The app requires the following permissions:
- **Location**: For GPS tracking and location-based content
- **Notifications**: For push notifications and alerts
- **Network**: For API communication

## Deployment

### Development Build
```bash
expo build:android
expo build:ios
```

### Production Build
```bash
expo build:android --release-channel production
expo build:ios --release-channel production
```

## Performance Considerations

- **Location Updates**: Optimized to update every 10 seconds or 50 meters
- **API Caching**: Recommendations cached for offline access
- **Image Optimization**: Lazy loading and compression for media content
- **Battery Optimization**: Location tracking paused when app is backgrounded

## Accessibility

- **Screen Reader Support**: All interactive elements have accessibility labels
- **Keyboard Navigation**: Full keyboard navigation support
- **High Contrast**: Support for high contrast mode
- **Font Scaling**: Respects system font size settings

## Future Enhancements

- **Offline Mode**: Cache critical content for offline access
- **AR Integration**: Augmented reality for location-based information
- **Social Features**: Share itineraries and recommendations
- **Voice Assistant**: Voice-guided navigation and information