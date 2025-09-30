import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { NavigationProps } from '../types/navigation';
import { Recommendation, GeoLocation, CrowdLevel } from '../types';
import LocationService from '../services/LocationService';
import ApiService from '../services/ApiService';

interface RecommendationsScreenProps extends NavigationProps {}

const RecommendationsScreen: React.FC<RecommendationsScreenProps> = ({ navigation, route }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCrowdLevel, setSelectedCrowdLevel] = useState<string>('all');
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);

  const locationService = LocationService.getInstance();
  const apiService = ApiService.getInstance();

  const categories = ['all', 'attractions', 'food', 'culture', 'shopping', 'nature', 'events'];
  const crowdLevels = ['all', 'low', 'moderate', 'high'];

  useEffect(() => {
    initializeRecommendations();
    setupLocationTracking();
  }, []);

  useEffect(() => {
    // Apply filters from navigation params
    if (route.params?.filters) {
      const { category, crowdLevel } = route.params.filters;
      if (category) setSelectedCategory(category);
      if (crowdLevel) setSelectedCrowdLevel(crowdLevel);
    }
  }, [route.params]);

  useEffect(() => {
    applyFilters();
  }, [recommendations, searchQuery, selectedCategory, selectedCrowdLevel]);

  const initializeRecommendations = async () => {
    try {
      setLoading(true);
      await loadRecommendations();
    } catch (error) {
      console.error('Error initializing recommendations:', error);
      Alert.alert('Error', 'Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupLocationTracking = () => {
    const location = locationService.getCurrentLocation();
    setCurrentLocation(location);

    const unsubscribe = locationService.subscribeToLocationUpdates((location) => {
      setCurrentLocation(location);
      // Reload recommendations when location changes significantly
      loadRecommendations();
    });

    return unsubscribe;
  };

  const loadRecommendations = async () => {
    try {
      const location = locationService.getCurrentLocation();
      const filters = {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        crowdLevel: selectedCrowdLevel !== 'all' ? selectedCrowdLevel : undefined,
      };

      const recs = await apiService.getPersonalizedRecommendations(location || undefined, filters);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...recommendations];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rec =>
        rec.title.toLowerCase().includes(query) ||
        rec.description.toLowerCase().includes(query) ||
        rec.category.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(rec => rec.category === selectedCategory);
    }

    // Apply crowd level filter
    if (selectedCrowdLevel !== 'all') {
      filtered = filtered.filter(rec => rec.crowdLevel === selectedCrowdLevel);
    }

    setFilteredRecommendations(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  const handleRecommendationPress = async (recommendation: Recommendation) => {
    try {
      // Get detailed information
      const details = await apiService.getRecommendationDetails(recommendation.id);
      
      // Navigate to location screen with recommendation details
      navigation.navigate('Location', {
        locationId: recommendation.id,
        latitude: recommendation.location.latitude,
        longitude: recommendation.location.longitude,
      });
    } catch (error) {
      console.error('Error getting recommendation details:', error);
      Alert.alert('Error', 'Failed to load recommendation details.');
    }
  };

  const getCrowdLevelColor = (crowdLevel: CrowdLevel): string => {
    switch (crowdLevel) {
      case CrowdLevel.LOW:
        return '#4CAF50';
      case CrowdLevel.MODERATE:
        return '#FF9800';
      case CrowdLevel.HIGH:
        return '#F44336';
      case CrowdLevel.VERY_HIGH:
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  const getCrowdLevelText = (crowdLevel: CrowdLevel): string => {
    switch (crowdLevel) {
      case CrowdLevel.LOW:
        return 'Low crowds';
      case CrowdLevel.MODERATE:
        return 'Moderate crowds';
      case CrowdLevel.HIGH:
        return 'High crowds';
      case CrowdLevel.VERY_HIGH:
        return 'Very busy';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading personalized recommendations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search recommendations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterButton,
              selectedCategory === category && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === category && styles.filterButtonTextActive,
              ]}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Crowd Level Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {crowdLevels.map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.filterButton,
              selectedCrowdLevel === level && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCrowdLevel(level)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedCrowdLevel === level && styles.filterButtonTextActive,
              ]}
            >
              {level === 'all' ? 'All Crowds' : `${level.charAt(0).toUpperCase() + level.slice(1)} Crowds`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recommendations List */}
      <ScrollView
        style={styles.recommendationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRecommendations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recommendations found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters or search terms</Text>
          </View>
        ) : (
          filteredRecommendations.map((recommendation) => (
            <TouchableOpacity
              key={recommendation.id}
              style={styles.recommendationCard}
              onPress={() => handleRecommendationPress(recommendation)}
            >
              <View style={styles.recommendationHeader}>
                <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.rating}>⭐ {recommendation.rating}</Text>
                  {recommendation.localRating && (
                    <Text style={styles.localRating}>🏠 {recommendation.localRating}</Text>
                  )}
                </View>
              </View>

              <Text style={styles.recommendationDescription} numberOfLines={3}>
                {recommendation.description}
              </Text>

              <View style={styles.recommendationMeta}>
                <Text style={styles.category}>{recommendation.category}</Text>
                <Text style={styles.priceRange}>{recommendation.priceRange}</Text>
                <Text style={styles.duration}>{recommendation.estimatedDuration}h</Text>
              </View>

              <View style={styles.recommendationFooter}>
                <Text style={styles.location}>
                  📍 {recommendation.location.district}
                </Text>
                <View style={styles.crowdIndicator}>
                  <Text
                    style={[
                      styles.crowdLevel,
                      { color: getCrowdLevelColor(recommendation.crowdLevel) },
                    ]}
                  >
                    👥 {getCrowdLevelText(recommendation.crowdLevel)}
                  </Text>
                </View>
              </View>

              {/* Local Insights */}
              {recommendation.localInsights && (
                <View style={styles.localInsightsContainer}>
                  <Text style={styles.localInsightsTitle}>🏠 Local Perspective</Text>
                  <Text style={styles.localInsightsText} numberOfLines={2}>
                    {recommendation.localInsights.culturalContext}
                  </Text>
                  {recommendation.localInsights.isHiddenGem && (
                    <Text style={styles.hiddenGemBadge}>💎 Hidden Gem</Text>
                  )}
                </View>
              )}

              {/* Practical Tips Preview */}
              {recommendation.practicalTips.length > 0 && (
                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>💡 Quick Tips</Text>
                  <Text style={styles.tipText} numberOfLines={1}>
                    {recommendation.practicalTips[0].content}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  searchContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#E31E24',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  recommendationsList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  rating: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  localRating: {
    fontSize: 12,
    color: '#E31E24',
    fontWeight: 'bold',
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  recommendationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  category: {
    fontSize: 12,
    color: '#E31E24',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  priceRange: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  duration: {
    fontSize: 12,
    color: '#666',
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 12,
    color: '#666',
  },
  crowdIndicator: {
    alignItems: 'flex-end',
  },
  crowdLevel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  localInsightsContainer: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  localInsightsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E31E24',
    marginBottom: 4,
  },
  localInsightsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  hiddenGemBadge: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: 'bold',
    marginTop: 4,
  },
  tipsContainer: {
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 6,
  },
  tipsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  tipText: {
    fontSize: 10,
    color: '#666',
  },
});

export default RecommendationsScreen;