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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { NavigationProps } from '../types/navigation';
import { GeoLocation, PracticalTip, TipCategory } from '../types';
import LocationService from '../services/LocationService';
import ApiService from '../services/ApiService';
import NotificationService from '../services/NotificationService';

interface LocationScreenProps extends NavigationProps {}

interface LocationContent {
  content: string;
  practicalTips: PracticalTip[];
  culturalContext: string;
  safetyInfo: string[];
  historicalInfo?: string;
  localRecommendations?: string[];
}

const LocationScreen: React.FC<LocationScreenProps> = ({ navigation, route }) => {
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
  const [targetLocation, setTargetLocation] = useState<GeoLocation | null>(null);
  const [locationContent, setLocationContent] = useState<LocationContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const locationService = LocationService.getInstance();
  const apiService = ApiService.getInstance();
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    initializeLocation();
    setupLocationTracking();
  }, []);

  useEffect(() => {
    if (route.params?.latitude && route.params?.longitude) {
      const target: GeoLocation = {
        latitude: route.params.latitude,
        longitude: route.params.longitude,
        address: '',
        district: '',
      };
      setTargetLocation(target);
      loadLocationContent(target);
    }
  }, [route.params]);

  const initializeLocation = async () => {
    try {
      setLoading(true);
      const location = locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        if (!targetLocation) {
          setTargetLocation(location);
          await loadLocationContent(location);
        }
      }
    } catch (error) {
      console.error('Error initializing location:', error);
      Alert.alert('Error', 'Failed to get location information.');
    } finally {
      setLoading(false);
    }
  };

  const setupLocationTracking = () => {
    const unsubscribe = locationService.subscribeToLocationUpdates((location) => {
      setCurrentLocation(location);
      
      // If we're close to the target location, load content
      if (targetLocation) {
        checkProximityAndLoadContent(location, targetLocation);
      }
    });

    return unsubscribe;
  };

  const checkProximityAndLoadContent = async (current: GeoLocation, target: GeoLocation) => {
    try {
      const distance = await locationService.calculateDistance(
        current.latitude,
        current.longitude,
        target.latitude,
        target.longitude
      );

      // If within 100 meters, trigger location-based content
      if (distance < 0.1) {
        await loadLocationContent(target);
        
        // Send notification about nearby content
        if (locationContent?.content) {
          await notificationService.sendLocationContent(
            target.address || 'Nearby Location',
            locationContent.content
          );
        }
      }
    } catch (error) {
      console.error('Error checking proximity:', error);
    }
  };

  const loadLocationContent = async (location: GeoLocation) => {
    try {
      const content = await apiService.getLocationContent(
        location.latitude,
        location.longitude
      );
      
      // Get address if not available
      if (!location.address) {
        const address = await locationService.getAddressFromCoordinates(
          location.latitude,
          location.longitude
        );
        location.address = address;
      }

      setLocationContent({
        content: content.content,
        practicalTips: content.practicalTips.map(tip => ({
          category: TipCategory.CULTURAL,
          content: tip,
          priority: 'medium' as any,
        })),
        culturalContext: content.culturalContext,
        safetyInfo: content.safetyInfo,
      });
    } catch (error) {
      console.error('Error loading location content:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (targetLocation) {
      await loadLocationContent(targetLocation);
    }
    setRefreshing(false);
  };

  const getTipIcon = (category: TipCategory): string => {
    switch (category) {
      case TipCategory.SAFETY:
        return '🛡️';
      case TipCategory.ETIQUETTE:
        return '🤝';
      case TipCategory.PREPARATION:
        return '🎒';
      case TipCategory.WEATHER:
        return '🌤️';
      case TipCategory.CULTURAL:
        return '🏛️';
      default:
        return '💡';
    }
  };

  const getTipColor = (category: TipCategory): string => {
    switch (category) {
      case TipCategory.SAFETY:
        return '#F44336';
      case TipCategory.ETIQUETTE:
        return '#2196F3';
      case TipCategory.PREPARATION:
        return '#FF9800';
      case TipCategory.WEATHER:
        return '#4CAF50';
      case TipCategory.CULTURAL:
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading location information...</Text>
      </View>
    );
  }

  const mapRegion = targetLocation ? {
    latitude: targetLocation.latitude,
    longitude: targetLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : undefined;

  return (
    <View style={styles.container}>
      {/* Map/Content Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, showMap && styles.toggleButtonActive]}
          onPress={() => setShowMap(true)}
        >
          <Text style={[styles.toggleButtonText, showMap && styles.toggleButtonTextActive]}>
            Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, !showMap && styles.toggleButtonActive]}
          onPress={() => setShowMap(false)}
        >
          <Text style={[styles.toggleButtonText, !showMap && styles.toggleButtonTextActive]}>
            Guide
          </Text>
        </TouchableOpacity>
      </View>

      {showMap ? (
        /* Map View */
        <View style={styles.mapContainer}>
          {mapRegion && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {targetLocation && (
                <Marker
                  coordinate={{
                    latitude: targetLocation.latitude,
                    longitude: targetLocation.longitude,
                  }}
                  title="Target Location"
                  description={targetLocation.address}
                />
              )}
            </MapView>
          )}
          
          {/* Location Info Overlay */}
          {targetLocation && (
            <View style={styles.locationOverlay}>
              <Text style={styles.locationTitle}>
                {targetLocation.address || 'Current Location'}
              </Text>
              <Text style={styles.locationDistrict}>
                {targetLocation.district}
              </Text>
            </View>
          )}
        </View>
      ) : (
        /* Content View */
        <ScrollView
          style={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {locationContent ? (
            <>
              {/* Location Header */}
              <View style={styles.headerContainer}>
                <Text style={styles.locationTitle}>
                  {targetLocation?.address || 'Current Location'}
                </Text>
                <Text style={styles.locationDistrict}>
                  {targetLocation?.district}
                </Text>
              </View>

              {/* Main Content */}
              {locationContent.content && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionTitle}>📍 About This Place</Text>
                  <Text style={styles.contentText}>{locationContent.content}</Text>
                </View>
              )}

              {/* Cultural Context */}
              {locationContent.culturalContext && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionTitle}>🏛️ Cultural Context</Text>
                  <Text style={styles.contentText}>{locationContent.culturalContext}</Text>
                </View>
              )}

              {/* Practical Tips */}
              {locationContent.practicalTips.length > 0 && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionTitle}>💡 Practical Tips</Text>
                  {locationContent.practicalTips.map((tip, index) => (
                    <View key={index} style={styles.tipCard}>
                      <View style={styles.tipHeader}>
                        <Text style={styles.tipIcon}>{getTipIcon(tip.category)}</Text>
                        <Text
                          style={[
                            styles.tipCategory,
                            { color: getTipColor(tip.category) },
                          ]}
                        >
                          {tip.category.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.tipContent}>{tip.content}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Safety Information */}
              {locationContent.safetyInfo.length > 0 && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionTitle}>🛡️ Safety Information</Text>
                  {locationContent.safetyInfo.map((info, index) => (
                    <View key={index} style={styles.safetyItem}>
                      <Text style={styles.safetyText}>• {info}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Historical Information */}
              {locationContent.historicalInfo && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionTitle}>📚 Historical Background</Text>
                  <Text style={styles.contentText}>{locationContent.historicalInfo}</Text>
                </View>
              )}

              {/* Local Recommendations */}
              {locationContent.localRecommendations && locationContent.localRecommendations.length > 0 && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionTitle}>🏠 Local Recommendations</Text>
                  {locationContent.localRecommendations.map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Text style={styles.recommendationText}>• {rec}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noContentContainer}>
              <Text style={styles.noContentTitle}>No Information Available</Text>
              <Text style={styles.noContentText}>
                We don't have detailed information about this location yet.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Recommendations')}
        >
          <Text style={styles.actionButtonText}>Find Nearby</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Itinerary')}
        >
          <Text style={styles.actionButtonText}>Add to Itinerary</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  toggleButtonActive: {
    backgroundColor: '#E31E24',
  },
  toggleButtonText: {
    fontSize: 16,
    color: '#666',
  },
  toggleButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  locationOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationDistrict: {
    fontSize: 14,
    color: '#666',
  },
  contentSection: {
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
  contentText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  tipCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tipCategory: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tipContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  safetyItem: {
    marginBottom: 8,
  },
  safetyText: {
    fontSize: 14,
    color: '#F44336',
    lineHeight: 20,
  },
  recommendationItem: {
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noContentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noContentText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#E31E24',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LocationScreen;