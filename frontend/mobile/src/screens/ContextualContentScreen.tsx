import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  ActivityIndicator
} from 'react-native';
import { LocationService, ContextualContent, ContentDeliveryResult } from '../services/LocationService';
import { GeoLocation } from '../types';

const { width: screenWidth } = Dimensions.get('window');

export const ContextualContentScreen: React.FC = () => {
  const [content, setContent] = useState<ContextualContent[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContextualContent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<string>('');
  
  const locationService = LocationService.getInstance();

  useEffect(() => {
    initializeContent();
    
    // Subscribe to location updates
    const unsubscribeLocation = locationService.subscribeToLocationUpdates(handleLocationUpdate);
    
    // Subscribe to content updates
    const unsubscribeContent = locationService.addContentCallback(handleContentDelivery);
    
    return () => {
      unsubscribeLocation();
      unsubscribeContent();
    };
  }, []);

  const initializeContent = async () => {
    try {
      setLoading(true);
      const location = locationService.getCurrentLocation();
      
      if (location) {
        setCurrentLocation(location);
        await loadContentForLocation(location);
      } else {
        // Try to get cached content
        const cachedContent = await locationService.getCachedContent({
          latitude: 22.3193, // Default to Hong Kong Central
          longitude: 114.1694,
          address: '',
          district: ''
        });
        setContent(cachedContent);
        setDeliveryMethod('cached');
      }
    } catch (error) {
      console.error('Error initializing content:', error);
      Alert.alert('Error', 'Failed to load contextual content');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = useCallback((location: GeoLocation) => {
    setCurrentLocation(location);
  }, []);

  const handleContentDelivery = useCallback((result: ContentDeliveryResult) => {
    setContent(result.triggeredContent);
    setDeliveryMethod(result.deliveryMethod);
    
    // Show notification for new content
    if (result.triggeredContent.length > 0 && result.deliveryMethod === 'immediate') {
      Alert.alert(
        'New Content Available',
        `Discovered ${result.triggeredContent.length} interesting ${result.triggeredContent.length === 1 ? 'item' : 'items'} nearby!`,
        [{ text: 'View', onPress: () => {} }, { text: 'Later', style: 'cancel' }]
      );
    }
  }, []);

  const loadContentForLocation = async (location: GeoLocation) => {
    try {
      // Try to get fresh content first
      const freshContent = await locationService.getContentByCategory('historical', location);
      
      if (freshContent.length > 0) {
        setContent(freshContent);
        setDeliveryMethod('immediate');
      } else {
        // Fallback to cached content
        const cachedContent = await locationService.getCachedContent(location);
        setContent(cachedContent);
        setDeliveryMethod('cached');
      }
    } catch (error) {
      console.error('Error loading content for location:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (currentLocation) {
      await loadContentForLocation(currentLocation);
    }
    setRefreshing(false);
  }, [currentLocation]);

  const openContentModal = (contentItem: ContextualContent) => {
    setSelectedContent(contentItem);
    setModalVisible(true);
  };

  const closeContentModal = () => {
    setModalVisible(false);
    setSelectedContent(null);
  };

  const renderContentCard = (contentItem: ContextualContent) => (
    <TouchableOpacity
      key={contentItem.id}
      style={styles.contentCard}
      onPress={() => openContentModal(contentItem)}
      accessibilityLabel={`${contentItem.title}. ${contentItem.description}`}
      accessibilityHint="Tap to view full content"
    >
      <View style={styles.cardHeader}>
        <Text style={styles.contentTitle}>{contentItem.title}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{contentItem.category}</Text>
        </View>
      </View>
      
      <Text style={styles.contentDescription} numberOfLines={2}>
        {contentItem.description}
      </Text>
      
      {contentItem.multimedia.length > 0 && (
        <View style={styles.mediaContainer}>
          {contentItem.multimedia.slice(0, 2).map((media, index) => (
            <View key={index} style={styles.mediaItem}>
              {media.type === 'image' && (
                <Image
                  source={{ uri: media.thumbnail || media.url }}
                  style={styles.mediaImage}
                  accessibilityLabel={media.altText || media.description}
                />
              )}
              {media.type === 'video' && (
                <View style={[styles.mediaImage, styles.videoPlaceholder]}>
                  <Text style={styles.videoText}>📹</Text>
                  {media.duration && (
                    <Text style={styles.durationText}>{Math.floor(media.duration / 60)}:{(media.duration % 60).toString().padStart(2, '0')}</Text>
                  )}
                </View>
              )}
              {media.type === 'audio' && (
                <View style={[styles.mediaImage, styles.audioPlaceholder]}>
                  <Text style={styles.audioText}>🎵</Text>
                  {media.duration && (
                    <Text style={styles.durationText}>{Math.floor(media.duration / 60)}:{(media.duration % 60).toString().padStart(2, '0')}</Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.cardFooter}>
        <View style={styles.tagsContainer}>
          {contentItem.interestTags.slice(0, 3).map((tag, index) => (
            <Text key={index} style={styles.tag}>#{tag}</Text>
          ))}
        </View>
        
        <View style={styles.metaInfo}>
          {contentItem.estimatedReadTime && (
            <Text style={styles.readTime}>{contentItem.estimatedReadTime} min read</Text>
          )}
          {contentItem.offlineAvailable && (
            <Text style={styles.offlineIndicator}>📱 Offline</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContentModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeContentModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={closeContentModal} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{selectedContent?.title}</Text>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {selectedContent && (
            <>
              <Text style={styles.modalDescription}>{selectedContent.description}</Text>
              
              {selectedContent.multimedia.length > 0 && (
                <ScrollView horizontal style={styles.modalMediaContainer}>
                  {selectedContent.multimedia.map((media, index) => (
                    <View key={index} style={styles.modalMediaItem}>
                      {media.type === 'image' && (
                        <Image
                          source={{ uri: media.url }}
                          style={styles.modalMediaImage}
                          accessibilityLabel={media.altText || media.description}
                        />
                      )}
                      {media.description && (
                        <Text style={styles.mediaDescription}>{media.description}</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
              
              <Text style={styles.modalContentText}>{selectedContent.content}</Text>
              
              <View style={styles.modalFooter}>
                <View style={styles.accessibilityInfo}>
                  {selectedContent.accessibility.screenReaderFriendly && (
                    <Text style={styles.accessibilityText}>♿ Screen reader friendly</Text>
                  )}
                  {selectedContent.accessibility.audioAvailable && (
                    <Text style={styles.accessibilityText}>🎧 Audio available</Text>
                  )}
                </View>
                
                <View style={styles.allTags}>
                  {selectedContent.interestTags.map((tag, index) => (
                    <Text key={index} style={styles.modalTag}>#{tag}</Text>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading contextual content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Around You</Text>
        {currentLocation && (
          <Text style={styles.locationText}>
            📍 {currentLocation.address || `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`}
          </Text>
        )}
        <Text style={styles.deliveryMethod}>
          Content: {deliveryMethod === 'immediate' ? '🔄 Live' : deliveryMethod === 'cached' ? '📱 Cached' : '🔔 Notification'}
        </Text>
      </View>
      
      <ScrollView
        style={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {content.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No content available</Text>
            <Text style={styles.emptyStateText}>
              Move around to discover interesting places and stories nearby!
            </Text>
          </View>
        ) : (
          content.map(renderContentCard)
        )}
      </ScrollView>
      
      {renderContentModal()}
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deliveryMethod: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  contentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  mediaContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  mediaItem: {
    marginRight: 8,
  },
  mediaImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoText: {
    fontSize: 20,
    color: '#fff',
  },
  audioPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  audioText: {
    fontSize: 20,
    color: '#fff',
  },
  durationText: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    color: '#fff',
    fontSize: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  tagsContainer: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 12,
    color: '#007AFF',
    marginRight: 8,
    marginBottom: 4,
  },
  metaInfo: {
    alignItems: 'flex-end',
  },
  readTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  offlineIndicator: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  modalMediaContainer: {
    marginBottom: 16,
  },
  modalMediaItem: {
    marginRight: 12,
  },
  modalMediaImage: {
    width: screenWidth - 64,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  mediaDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  modalContentText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  accessibilityInfo: {
    marginBottom: 16,
  },
  accessibilityText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  allTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalTag: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 12,
    marginBottom: 8,
  },
});

export default ContextualContentScreen;