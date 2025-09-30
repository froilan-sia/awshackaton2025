import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { NavigationProps } from '../types/navigation';
import { User, UserPreferences, BudgetRange, GroupType, ActivityLevel } from '../types';
import ApiService from '../services/ApiService';
import NotificationService from '../services/NotificationService';

interface ProfileScreenProps extends NavigationProps {}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    interests: [],
    budgetRange: BudgetRange.MEDIUM,
    groupType: GroupType.SOLO,
    dietaryRestrictions: [],
    activityLevel: ActivityLevel.MODERATE,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const apiService = ApiService.getInstance();
  const notificationService = NotificationService.getInstance();

  const interestOptions = [
    'Culture & History',
    'Food & Dining',
    'Shopping',
    'Nature & Outdoors',
    'Art & Museums',
    'Nightlife',
    'Architecture',
    'Local Experiences',
    'Photography',
    'Adventure Sports',
  ];

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Halal',
    'Kosher',
    'Gluten-free',
    'Dairy-free',
    'Nut allergies',
    'Seafood allergies',
  ];

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await apiService.getUserProfile();
      setUser(userProfile);
      setPreferences(userProfile.preferences);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // For demo purposes, use default preferences if API fails
      setUser({
        id: 'demo-user',
        email: 'demo@example.com',
        preferences,
        language: 'en',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      
      const updatedUser = {
        ...user!,
        preferences,
      };

      await apiService.updateUserProfile(updatedUser);
      setUser(updatedUser);
      
      Alert.alert('Success', 'Your preferences have been saved!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    const updatedInterests = preferences.interests.includes(interest)
      ? preferences.interests.filter(i => i !== interest)
      : [...preferences.interests, interest];
    
    setPreferences({
      ...preferences,
      interests: updatedInterests,
    });
  };

  const toggleDietaryRestriction = (restriction: string) => {
    const updatedRestrictions = preferences.dietaryRestrictions.includes(restriction)
      ? preferences.dietaryRestrictions.filter(r => r !== restriction)
      : [...preferences.dietaryRestrictions, restriction];
    
    setPreferences({
      ...preferences,
      dietaryRestrictions: updatedRestrictions,
    });
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    
    if (enabled) {
      // Register for push notifications
      const token = notificationService.getPushToken();
      if (token) {
        try {
          await apiService.registerPushToken(token);
        } catch (error) {
          console.error('Error registering push token:', error);
        }
      }
    }
  };

  const clearNotifications = () => {
    notificationService.clearAllNotifications();
    Alert.alert('Success', 'All notifications have been cleared.');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* User Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 User Information</Text>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userLanguage}>Language: {user?.language || 'English'}</Text>
        </View>
      </View>

      {/* Interests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Your Interests</Text>
        <Text style={styles.sectionDescription}>
          Select your interests to get personalized recommendations
        </Text>
        <View style={styles.optionsGrid}>
          {interestOptions.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.optionButton,
                preferences.interests.includes(interest) && styles.optionButtonSelected,
              ]}
              onPress={() => toggleInterest(interest)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  preferences.interests.includes(interest) && styles.optionButtonTextSelected,
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Travel Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✈️ Travel Preferences</Text>
        
        {/* Budget Range */}
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Budget Range</Text>
          <View style={styles.budgetOptions}>
            {Object.values(BudgetRange).map((budget) => (
              <TouchableOpacity
                key={budget}
                style={[
                  styles.budgetButton,
                  preferences.budgetRange === budget && styles.budgetButtonSelected,
                ]}
                onPress={() => setPreferences({ ...preferences, budgetRange: budget })}
              >
                <Text
                  style={[
                    styles.budgetButtonText,
                    preferences.budgetRange === budget && styles.budgetButtonTextSelected,
                  ]}
                >
                  {budget.charAt(0).toUpperCase() + budget.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Group Type */}
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Travel Group</Text>
          <View style={styles.budgetOptions}>
            {Object.values(GroupType).map((group) => (
              <TouchableOpacity
                key={group}
                style={[
                  styles.budgetButton,
                  preferences.groupType === group && styles.budgetButtonSelected,
                ]}
                onPress={() => setPreferences({ ...preferences, groupType: group })}
              >
                <Text
                  style={[
                    styles.budgetButtonText,
                    preferences.groupType === group && styles.budgetButtonTextSelected,
                  ]}
                >
                  {group.charAt(0).toUpperCase() + group.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activity Level */}
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Activity Level</Text>
          <View style={styles.budgetOptions}>
            {Object.values(ActivityLevel).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.budgetButton,
                  preferences.activityLevel === level && styles.budgetButtonSelected,
                ]}
                onPress={() => setPreferences({ ...preferences, activityLevel: level })}
              >
                <Text
                  style={[
                    styles.budgetButtonText,
                    preferences.activityLevel === level && styles.budgetButtonTextSelected,
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Dietary Restrictions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍽️ Dietary Restrictions</Text>
        <Text style={styles.sectionDescription}>
          Let us know about any dietary requirements
        </Text>
        <View style={styles.optionsGrid}>
          {dietaryOptions.map((restriction) => (
            <TouchableOpacity
              key={restriction}
              style={[
                styles.optionButton,
                preferences.dietaryRestrictions.includes(restriction) && styles.optionButtonSelected,
              ]}
              onPress={() => toggleDietaryRestriction(restriction)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  preferences.dietaryRestrictions.includes(restriction) && styles.optionButtonTextSelected,
                ]}
              >
                {restriction}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notification Settings</Text>
        
        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Push Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#ccc', true: '#E31E24' }}
            thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={clearNotifications}>
          <Text style={styles.clearButtonText}>Clear All Notifications</Text>
        </TouchableOpacity>
      </View>

      {/* Accessibility Section */}
      {user?.accessibilityNeeds && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>♿ Accessibility</Text>
          <View style={styles.accessibilityInfo}>
            <Text style={styles.accessibilityText}>
              Wheelchair Access: {user.accessibilityNeeds.wheelchairAccess ? 'Required' : 'Not required'}
            </Text>
            <Text style={styles.accessibilityText}>
              Visual Assistance: {user.accessibilityNeeds.visualImpairment ? 'Required' : 'Not required'}
            </Text>
            <Text style={styles.accessibilityText}>
              Hearing Assistance: {user.accessibilityNeeds.hearingImpairment ? 'Required' : 'Not required'}
            </Text>
          </View>
        </View>
      )}

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Text>
        </TouchableOpacity>
      </View>
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
  section: {
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  userInfo: {
    paddingVertical: 8,
  },
  userEmail: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  userLanguage: {
    fontSize: 14,
    color: '#666',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonSelected: {
    backgroundColor: '#E31E24',
    borderColor: '#E31E24',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#666',
  },
  optionButtonTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  preferenceItem: {
    marginBottom: 20,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  budgetOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  budgetButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  budgetButtonSelected: {
    backgroundColor: '#E31E24',
    borderColor: '#E31E24',
  },
  budgetButtonText: {
    fontSize: 14,
    color: '#666',
  },
  budgetButtonTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  notificationLabel: {
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
  },
  accessibilityInfo: {
    paddingVertical: 8,
  },
  accessibilityText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  saveContainer: {
    margin: 16,
    marginBottom: 32,
  },
  saveButton: {
    backgroundColor: '#E31E24',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;