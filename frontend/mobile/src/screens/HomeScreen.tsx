import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { NavigationProps } from '../types/navigation';
import { Recommendation, GeoLocation, NotificationData } from '../types';
import LocationService from '../services/LocationService';
import NotificationService from '../services/NotificationService';
import ApiService from '../services/ApiService';

interface HomeScreenProps extends NavigationProps {}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [weatherInfo, setWeatherInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const locationService = LocationService.getInstance();
  const notificationService = NotificationService.getInstance();
  const apiService = ApiService.getInstance();

  useEffect(() => {
    initializeHome();
    setupLocationTracking();
    loadNotifications();
  }, []);

  const initializeHome = async () => {
    try {
      setLoading(true);
      await loadRecommendations();
      await loadWeatherInfo();
    } catch (error) {
      console.error('Error initializing home screen:', error);
      Alert.alert('Error', 'Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupLocationTracking = () => {
    const unsubscribe = locationService.subscribeToLocationUpdates((location) => {
      setCurrentLocation(location);
      // Trigger location-based content
      handleLocationChange(location);
    });

    return unsubscribe;
  };

  const handleLocationChange = async (location: GeoLocation) => {
    try {
      // Get location-based content
      const locationContent = await apiService.getLocationContent(
        location.latitude,
        location.longitude
      );

      // Send location-based notification if there's interesting content
      if (locationContent.content) {
        await notificationService.sendLocationContent(
          location.address || 'Current Location',
          locationContent.content
        );
      }

      // Report location to backend for analytics
      await apiService.reportLocation(location);
    } catch (error) {
      console.error('Error handling location change:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const location = locationService.getCurrentLocation();
      const recs = await apiService.getPersonalizedRecommendations(location || undefined);
      setRecommendations(recs.slice(0, 5)); // Show top 5 on home screen
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const loadWeatherInfo = async () => {
    try {
      const location = locationService.getCurrentLocation();
      if (location) {
        const weatherData = await apiService.getWeatherRecommendations(location);
        setWeatherInfo(weatherData.weather);
        
        // Send weather alert if conditions changed significantly
        if (weatherData.weather.alerts && weatherData.weather.alerts.length > 0) {
          await notificationService.sendWeatherAlert(
            weatherData.weather.condition,
            weatherData.recommendations.map(r => r.title)
          );
        }
      }
    } catch (error) {
      console.error('Error loading weather info:', error);
    }
  };

  const loadNotifications = () => {
    const notifs = notificationService.getNotifications();
    setNotifications(notifs.slice(0, 3)); // Show latest 3 notifications
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeHome();
    loadNotifications();
    setRefreshing(false);
  };

  const navigateToRecommendations = () => {
    navigation.navigate('Recommendations');
  };

  const navigateToItinerary = () => {
    navigation.navigate('Itinerary');
  };

  const navigateToLocation = () => {
    if (currentLocation) {
      navigation.navigate('Location', {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
    } else {
      Alert.alert('Location Required', 'Please enable location services to use this feature.');
    }
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your personalized experience...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome to Hong Kong!</Text>
        <Text style={styles.welcomeSubtitle}>
          Discover personalized experiences tailored just for you
        </Text>
      </View>

      {/* Current Location */}
      {currentLocation && (
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>📍 Current Location</Text>
          <Text style={styles.locationText}>
            {currentLocation.address || 'Getting your location...'}
          </Text>
          <TouchableOpacity style={styles.locationButton} onPress={navigateToLocation}>
            <Text style={styles.buttonText}>Explore This Area</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Weather Info */}
      {weatherInfo && (
        <View style={styles.weatherSection}>
          <Text style={styles.sectionTitle}>🌤️ Weather Update</Text>
          <Text style={styles.weatherText}>
            {weatherInfo.condition} • {weatherInfo.temperature}°C
          </Text>
          <Text style={styles.weatherDescription}>
            {weatherInfo.recommendation}
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionButton} onPress={navigateToRecommendations}>
            <Text style={styles.quickActionIcon}>🎯</Text>
            <Text style={styles.quickActionText}>Recommendations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={navigateToItinerary}>
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={styles.quickActionText}>My Itinerary</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={navigateToLocation}>
            <Text style={styles.quickActionIcon}>🗺️</Text>
            <Text style={styles.quickActionText}>Location Guide</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={navigateToProfile}>
            <Text style={styles.quickActionIcon}>👤</Text>
            <Text style={styles.quickActionText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Recommendations */}
      <View style={styles.recommendationsSection}>
        <Text style={styles.sectionTitle}>🌟 Recommended for You</Text>
        {recommendations.map((rec) => (
          <TouchableOpacity
            key={rec.id}
            style={styles.recommendationCard}
            onPress={() => navigation.navigate('Recommendations', { filters: { category: rec.category } })}
          >
            <Text style={styles.recommendationTitle}>{rec.title}</Text>
            <Text style={styles.recommendationDescription} numberOfLines={2}>
              {rec.description}
            </Text>
            <View style={styles.recommendationMeta}>
              <Text style={styles.recommendationRating}>⭐ {rec.rating}</Text>
              <Text style={styles.recommendationCrowd}>👥 {rec.crowdLevel}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.viewAllButton} onPress={navigateToRecommendations}>
          <Text style={styles.viewAllText}>View All Recommendations</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <View style={styles.notificationsSection}>
          <Text style={styles.sectionTitle}>🔔 Recent Updates</Text>
          {notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationBody} numberOfLines={2}>
                {notification.body}
              </Text>
              <Text style={styles.notificationTime}>
                {notification.timestamp.toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  welcomeSection: {
    backgroundColor: '#E31E24',
    padding: 20,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
  },
  locationSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  locationButton: {
    backgroundColor: '#E31E24',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  weatherSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  weatherDescription: {
    fontSize: 14,
    color: '#666',
  },
  quickActionsSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  recommendationsSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recommendationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recommendationRating: {
    fontSize: 12,
    color: '#666',
  },
  recommendationCrowd: {
    fontSize: 12,
    color: '#666',
  },
  viewAllButton: {
    backgroundColor: '#E31E24',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllText: {
    color: 'white',
    fontWeight: 'bold',
  },
  notificationsSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: '#999',
  },
});

export default HomeScreen;