import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import ItineraryScreen from './src/screens/ItineraryScreen';
import LocationScreen from './src/screens/LocationScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Services
import { LocationService } from './src/services/LocationService';
import { NotificationService } from './src/services/NotificationService';

// Types
import { RootStackParamList } from './src/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);

  useEffect(() => {
    requestPermissions();
    setupNotifications();
  }, []);

  const requestPermissions = async () => {
    try {
      // Request location permissions
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus === 'granted') {
        setLocationPermission(true);
        LocationService.initialize();
      } else {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to provide personalized recommendations and location-based content.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
      }

      // Request notification permissions
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus === 'granted') {
        setNotificationPermission(true);
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const setupNotifications = async () => {
    try {
      await NotificationService.initialize();
      
      // Listen for notifications
      const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
        // Handle notification tap
        handleNotificationResponse(response);
      });

      return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
      };
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content;
    
    // Navigate based on notification type
    if (data?.screen) {
      // Navigation logic would go here
      console.log('Navigate to:', data.screen);
    }
  };

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#E31E24', // Hong Kong red
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'Hong Kong AI Tourism' }}
        />
        <Stack.Screen 
          name="Recommendations" 
          component={RecommendationsScreen}
          options={{ title: 'Personalized Recommendations' }}
        />
        <Stack.Screen 
          name="Itinerary" 
          component={ItineraryScreen}
          options={{ title: 'My Itinerary' }}
        />
        <Stack.Screen 
          name="Location" 
          component={LocationScreen}
          options={{ title: 'Location Guide' }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'Profile & Preferences' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}