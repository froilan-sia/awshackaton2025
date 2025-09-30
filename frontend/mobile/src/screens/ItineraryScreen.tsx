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
import { Itinerary, ItineraryActivity } from '../types';
import ApiService from '../services/ApiService';
import NotificationService from '../services/NotificationService';

interface ItineraryScreenProps extends NavigationProps {}

const ItineraryScreen: React.FC<ItineraryScreenProps> = ({ navigation, route }) => {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const apiService = ApiService.getInstance();
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    initializeItinerary();
  }, []);

  useEffect(() => {
    if (route.params?.itineraryId) {
      loadSpecificItinerary(route.params.itineraryId);
    }
  }, [route.params]);

  const initializeItinerary = async () => {
    try {
      setLoading(true);
      await loadItineraries();
    } catch (error) {
      console.error('Error initializing itinerary:', error);
      Alert.alert('Error', 'Failed to load itineraries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadItineraries = async () => {
    try {
      const userItineraries = await apiService.getUserItineraries();
      setItineraries(userItineraries);
      
      // Set the first itinerary as current if none is selected
      if (userItineraries.length > 0 && !currentItinerary) {
        setCurrentItinerary(userItineraries[0]);
      }
    } catch (error) {
      console.error('Error loading itineraries:', error);
    }
  };

  const loadSpecificItinerary = async (itineraryId: string) => {
    try {
      const itinerary = await apiService.getItinerary(itineraryId);
      setCurrentItinerary(itinerary);
    } catch (error) {
      console.error('Error loading specific itinerary:', error);
      Alert.alert('Error', 'Failed to load itinerary details.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItineraries();
    setRefreshing(false);
  };

  const handleCreateNewItinerary = () => {
    Alert.alert(
      'Create New Itinerary',
      'Would you like to generate a new personalized itinerary?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create', onPress: createNewItinerary },
      ]
    );
  };

  const createNewItinerary = async () => {
    try {
      // For demo purposes, using default preferences
      // In a real app, this would come from user profile
      const preferences = {
        duration: 3,
        interests: ['culture', 'food', 'attractions'],
        budgetRange: 'medium',
        groupType: 'couple',
      };

      const newItinerary = await apiService.generateItinerary(preferences);
      setItineraries([newItinerary, ...itineraries]);
      setCurrentItinerary(newItinerary);

      await notificationService.sendItineraryUpdate(
        'New personalized itinerary created!',
        newItinerary.id
      );
    } catch (error) {
      console.error('Error creating new itinerary:', error);
      Alert.alert('Error', 'Failed to create new itinerary. Please try again.');
    }
  };

  const handleActivityPress = (activity: ItineraryActivity) => {
    navigation.navigate('Location', {
      locationId: activity.recommendationId,
    });
  };

  const handleModifyItinerary = () => {
    Alert.alert(
      'Modify Itinerary',
      'What would you like to change?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Activity', onPress: () => console.log('Add activity') },
        { text: 'Remove Activity', onPress: () => console.log('Remove activity') },
        { text: 'Reschedule', onPress: () => console.log('Reschedule') },
      ]
    );
  };

  const formatTime = (timeString: string): string => {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDayActivities = (day: number): ItineraryActivity[] => {
    if (!currentItinerary) return [];
    return currentItinerary.activities.filter(activity => activity.day === day);
  };

  const getDayCount = (): number => {
    if (!currentItinerary) return 0;
    return Math.max(...currentItinerary.activities.map(a => a.day));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your itineraries...</Text>
      </View>
    );
  }

  if (itineraries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Itineraries Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first personalized itinerary to get started!
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateNewItinerary}>
          <Text style={styles.createButtonText}>Create Itinerary</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Itinerary Selector */}
      {itineraries.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorContainer}>
          {itineraries.map((itinerary) => (
            <TouchableOpacity
              key={itinerary.id}
              style={[
                styles.selectorButton,
                currentItinerary?.id === itinerary.id && styles.selectorButtonActive,
              ]}
              onPress={() => setCurrentItinerary(itinerary)}
            >
              <Text
                style={[
                  styles.selectorButtonText,
                  currentItinerary?.id === itinerary.id && styles.selectorButtonTextActive,
                ]}
              >
                {itinerary.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {currentItinerary && (
          <>
            {/* Itinerary Header */}
            <View style={styles.headerContainer}>
              <Text style={styles.itineraryTitle}>{currentItinerary.title}</Text>
              <Text style={styles.itineraryDescription}>{currentItinerary.description}</Text>
              
              <View style={styles.itineraryMeta}>
                <Text style={styles.metaItem}>📅 {currentItinerary.duration} days</Text>
                <Text style={styles.metaItem}>💰 ${currentItinerary.totalEstimatedCost}</Text>
                <Text style={styles.metaItem}>🎯 {currentItinerary.activities.length} activities</Text>
              </View>

              <TouchableOpacity style={styles.modifyButton} onPress={handleModifyItinerary}>
                <Text style={styles.modifyButtonText}>Modify Itinerary</Text>
              </TouchableOpacity>
            </View>

            {/* Weather Considerations */}
            {currentItinerary.weatherConsiderations.length > 0 && (
              <View style={styles.weatherContainer}>
                <Text style={styles.sectionTitle}>🌤️ Weather Considerations</Text>
                {currentItinerary.weatherConsiderations.map((consideration, index) => (
                  <Text key={index} style={styles.weatherItem}>• {consideration}</Text>
                ))}
              </View>
            )}

            {/* Daily Schedule */}
            {Array.from({ length: getDayCount() }, (_, index) => index + 1).map((day) => {
              const dayActivities = getDayActivities(day);
              
              return (
                <View key={day} style={styles.dayContainer}>
                  <Text style={styles.dayTitle}>Day {day}</Text>
                  
                  {dayActivities.map((activity, index) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={styles.activityCard}
                      onPress={() => handleActivityPress(activity)}
                    >
                      <View style={styles.activityHeader}>
                        <View style={styles.timeContainer}>
                          <Text style={styles.activityTime}>
                            {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                          </Text>
                          {activity.travelTime > 0 && (
                            <Text style={styles.travelTime}>
                              🚶 {activity.travelTime} min travel
                            </Text>
                          )}
                        </View>
                        <View style={styles.activityNumber}>
                          <Text style={styles.activityNumberText}>{index + 1}</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.activityTitle}>Activity {index + 1}</Text>
                      
                      {activity.notes && (
                        <Text style={styles.activityNotes}>{activity.notes}</Text>
                      )}
                      
                      <Text style={styles.viewDetailsText}>Tap to view details →</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}

            {/* Practical Notes */}
            {currentItinerary.practicalNotes.length > 0 && (
              <View style={styles.notesContainer}>
                <Text style={styles.sectionTitle}>💡 Practical Notes</Text>
                {currentItinerary.practicalNotes.map((note, index) => (
                  <Text key={index} style={styles.noteItem}>• {note}</Text>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateNewItinerary}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectorContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectorButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectorButtonActive: {
    backgroundColor: '#E31E24',
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectorButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  itineraryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  itineraryDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  itineraryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    fontSize: 14,
    color: '#666',
  },
  modifyButton: {
    backgroundColor: '#E31E24',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modifyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  weatherContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  weatherItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dayContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E31E24',
    marginBottom: 16,
  },
  activityCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  timeContainer: {
    flex: 1,
  },
  activityTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  travelTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityNumber: {
    backgroundColor: '#E31E24',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  activityNotes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#E31E24',
    fontWeight: 'bold',
  },
  notesContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 32,
  },
  noteItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#E31E24',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ItineraryScreen;