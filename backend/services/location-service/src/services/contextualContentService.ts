import { LocationContentModel, ILocationContentDocument } from '../models/LocationContent';
import { GeofenceEventModel } from '../models/GeofenceEvent';
import { UserLocationPreferencesModel } from '../models/UserLocationPreferences';
import { 
  LocationContent, 
  GeofenceEvent, 
  GeofenceEventType, 
  ContentCategory,
  GeoLocation,
  UserLocationPreferences 
} from '../types/location';
import { GeofenceService } from './geofenceService';
import { ContentDeliveryService } from './contentDeliveryService';
const { v4: uuidv4 } = require('uuid');

export interface MultimediaContent {
  type: 'image' | 'video' | 'audio' | '360_image' | 'ar_content';
  url: string;
  thumbnail?: string;
  duration?: number; // for video/audio
  size?: number; // file size in bytes
  description?: string;
  altText?: string; // for accessibility
}

export interface EnhancedLocationContent extends LocationContent {
  multimedia: MultimediaContent[];
  interestTags: string[];
  difficultyLevel?: 'easy' | 'moderate' | 'advanced';
  estimatedReadTime?: number; // in minutes
  accessibility: {
    screenReaderFriendly: boolean;
    visualDescriptions: boolean;
    audioAvailable: boolean;
  };
  contextualTriggers: {
    timeOfDay?: string[]; // ['morning', 'afternoon', 'evening', 'night']
    weather?: string[]; // ['sunny', 'rainy', 'cloudy']
    crowdLevel?: string[]; // ['low', 'medium', 'high']
    userActivity?: string[]; // ['walking', 'standing', 'sitting']
  };
  offlineAvailable: boolean;
  lastUpdated: Date;
}

export interface PersonalizedContentFilter {
  interests: string[];
  languages: string[];
  accessibilityNeeds: string[];
  contentTypes: ContentCategory[];
  maxReadTime?: number;
  preferredMediaTypes: string[];
}

export interface ContentDeliveryContext {
  location: GeoLocation;
  timeOfDay: string;
  weather?: string;
  crowdLevel?: string;
  userActivity?: string;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  batteryLevel?: number;
}

export class ContextualContentService extends ContentDeliveryService {
  private contextualGeofenceService: GeofenceService;
  private contentCache: Map<string, EnhancedLocationContent[]> = new Map();
  private userContentHistory: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.contextualGeofenceService = new GeofenceService();
    this.initializeContentCache();
  }

  /**
   * Automatically trigger content delivery based on user location and context
   */
  async triggerContextualContent(
    userId: string,
    context: ContentDeliveryContext,
    userPreferences?: UserLocationPreferences
  ): Promise<{
    triggeredContent: EnhancedLocationContent[];
    deliveryMethod: 'immediate' | 'notification' | 'cached';
    reason: string;
  }> {
    try {
      // Get user's content preferences and history
      const contentFilter = await this.getUserContentFilter(userId);
      const deliveredContentIds = this.userContentHistory.get(userId) || new Set();

      // Find relevant geofences
      const nearbyGeofences = await this.contextualGeofenceService.getGeofencesNearLocation(
        context.location,
        userPreferences?.geofenceRadius || 100
      );

      if (nearbyGeofences.length === 0) {
        return {
          triggeredContent: [],
          deliveryMethod: 'cached',
          reason: 'No nearby points of interest'
        };
      }

      // Get contextual content for nearby geofences
      let relevantContent: EnhancedLocationContent[] = [];
      
      for (const geofence of nearbyGeofences) {
        const geofenceContent = await this.getEnhancedContentForGeofence(
          geofence.id,
          contentFilter,
          context
        );
        relevantContent.push(...geofenceContent);
      }

      // Filter out already delivered content
      relevantContent = relevantContent.filter(content => 
        !deliveredContentIds.has(content.id)
      );

      // Apply contextual filtering
      const contextuallyRelevant = this.filterByContext(relevantContent, context);

      // Personalize content based on user interests
      const personalizedContent = this.personalizeContent(
        contextuallyRelevant,
        contentFilter
      );

      // Determine delivery method based on context
      const deliveryMethod = this.determineDeliveryMethod(context, personalizedContent);

      // Limit content based on connection quality and battery
      const optimizedContent = this.optimizeContentForDevice(
        personalizedContent,
        context
      );

      // Track delivered content
      if (optimizedContent.length > 0) {
        const userHistory = this.userContentHistory.get(userId) || new Set();
        optimizedContent.forEach(content => userHistory.add(content.id));
        this.userContentHistory.set(userId, userHistory);
      }

      return {
        triggeredContent: optimizedContent,
        deliveryMethod,
        reason: this.getDeliveryReason(context, optimizedContent.length)
      };

    } catch (error) {
      console.error('Error triggering contextual content:', error);
      
      // Fallback to cached content
      const fallbackFilter = await this.getUserContentFilter(userId);
      const cachedContent = await this.getCachedContentForLocation(
        context.location,
        fallbackFilter
      );

      return {
        triggeredContent: cachedContent,
        deliveryMethod: 'cached',
        reason: 'Fallback to cached content due to service error'
      };
    }
  }

  /**
   * Get enhanced content with multimedia for a specific geofence
   */
  async getEnhancedContentForGeofence(
    geofenceId: string,
    filter: PersonalizedContentFilter,
    context: ContentDeliveryContext
  ): Promise<EnhancedLocationContent[]> {
    // Check cache first
    const cacheKey = `${geofenceId}_${filter.languages.join('_')}`;
    if (this.contentCache.has(cacheKey)) {
      const cachedContent = this.contentCache.get(cacheKey)!;
      return this.filterByContext(cachedContent, context);
    }

    // Fetch from database
    const content = await LocationContentModel.find({
      geofenceId,
      language: { $in: filter.languages },
      category: { $in: filter.contentTypes },
      isActive: true
    }).sort({ priority: -1 });

    // Enhance content with multimedia and contextual data
    const enhancedContent = await Promise.all(
      content.map(async (item) => this.enhanceContentWithMultimedia(item))
    );

    // Cache the enhanced content
    this.contentCache.set(cacheKey, enhancedContent);

    return this.filterByContext(enhancedContent, context);
  }

  /**
   * Create rich multimedia content for historical sites
   */
  async createMultimediaContent(
    geofenceId: string,
    contentData: {
      title: string;
      description: string;
      content: string;
      category: ContentCategory;
      language: string;
      multimedia: MultimediaContent[];
      interestTags: string[];
      contextualTriggers?: any;
    }
  ): Promise<EnhancedLocationContent> {
    const enhancedContent: EnhancedLocationContent = {
      id: uuidv4(),
      geofenceId,
      title: contentData.title,
      description: contentData.description,
      content: contentData.content,
      mediaUrls: contentData.multimedia.map(m => m.url),
      language: contentData.language,
      category: contentData.category,
      priority: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      multimedia: contentData.multimedia,
      interestTags: contentData.interestTags,
      accessibility: {
        screenReaderFriendly: true,
        visualDescriptions: contentData.multimedia.some(m => m.altText),
        audioAvailable: contentData.multimedia.some(m => m.type === 'audio')
      },
      contextualTriggers: contentData.contextualTriggers || {},
      offlineAvailable: this.determineOfflineAvailability(contentData.multimedia),
      lastUpdated: new Date()
    };

    // Save to database
    const contentDoc = new LocationContentModel(enhancedContent);
    await contentDoc.save();

    // Cache multimedia content for offline access
    if (enhancedContent.offlineAvailable) {
      await this.cacheContentForOffline(enhancedContent);
    }

    return enhancedContent;
  }

  /**
   * Implement offline content caching for poor connectivity areas
   */
  async cacheContentForOffline(
    content: EnhancedLocationContent
  ): Promise<void> {
    try {
      // Cache text content
      const textCacheKey = `offline_text_${content.id}`;
      await this.storeInCache(textCacheKey, {
        id: content.id,
        title: content.title,
        description: content.description,
        content: content.content,
        category: content.category,
        interestTags: content.interestTags,
        estimatedReadTime: content.estimatedReadTime
      });

      // Cache essential multimedia (thumbnails, small images)
      const essentialMedia = content.multimedia.filter(media => 
        media.type === 'image' && 
        (media.size || 0) < 500000 // Less than 500KB
      );

      for (const media of essentialMedia) {
        const mediaCacheKey = `offline_media_${content.id}_${media.type}`;
        await this.storeInCache(mediaCacheKey, media);
      }

      console.log(`Cached content ${content.id} for offline access`);
    } catch (error) {
      console.error(`Failed to cache content ${content.id}:`, error);
    }
  }

  /**
   * Get cached content for offline access
   */
  async getCachedContentForLocation(
    location: GeoLocation,
    filter: PersonalizedContentFilter,
    radius: number = 1000
  ): Promise<EnhancedLocationContent[]> {
    try {
      // Get nearby geofences from cache or database
      const nearbyGeofences = await this.contextualGeofenceService.getGeofencesNearLocation(
        location,
        radius
      );

      const cachedContent: EnhancedLocationContent[] = [];

      for (const geofence of nearbyGeofences) {
        const cacheKey = `offline_geofence_${geofence.id}`;
        const geofenceContent = await this.getFromCache(cacheKey);
        
        if (geofenceContent) {
          cachedContent.push(...geofenceContent);
        }
      }

      // Filter cached content based on user preferences
      return this.personalizeContent(cachedContent, filter);
    } catch (error) {
      console.error('Error retrieving cached content:', error);
      return [];
    }
  }

  /**
   * Test location-based content accuracy and timing
   */
  async testContentAccuracy(
    testLocation: GeoLocation,
    expectedContentIds: string[],
    context: ContentDeliveryContext
  ): Promise<{
    accuracy: number;
    timing: number;
    deliveredContent: string[];
    missedContent: string[];
    unexpectedContent: string[];
  }> {
    const startTime = Date.now();
    
    // Trigger content delivery
    const result = await this.triggerContextualContent(
      'test_user',
      { ...context, location: testLocation }
    );
    
    const endTime = Date.now();
    const timing = endTime - startTime;
    
    const deliveredIds = result.triggeredContent.map(c => c.id);
    const expectedSet = new Set(expectedContentIds);
    const deliveredSet = new Set(deliveredIds);
    
    const correctDeliveries = deliveredIds.filter(id => expectedSet.has(id));
    const missedContent = expectedContentIds.filter(id => !deliveredSet.has(id));
    const unexpectedContent = deliveredIds.filter(id => !expectedSet.has(id));
    
    const accuracy = expectedContentIds.length > 0 
      ? correctDeliveries.length / expectedContentIds.length 
      : 1;

    return {
      accuracy,
      timing,
      deliveredContent: deliveredIds,
      missedContent,
      unexpectedContent
    };
  }

  // Private helper methods

  private async getUserContentFilter(userId: string): Promise<PersonalizedContentFilter> {
    const preferences = await UserLocationPreferencesModel.findOne({ userId });
    
    // Default filter if no preferences found
    return {
      interests: preferences?.interests || ['history', 'culture', 'food'],
      languages: [preferences?.language || 'en'],
      accessibilityNeeds: preferences?.accessibilityNeeds || [],
      contentTypes: Object.values(ContentCategory),
      maxReadTime: preferences?.maxReadTime || 10,
      preferredMediaTypes: preferences?.preferredMediaTypes || ['image', 'text']
    };
  }

  private async enhanceContentWithMultimedia(
    content: ILocationContentDocument
  ): Promise<EnhancedLocationContent> {
    // Convert basic content to enhanced content with multimedia
    const multimedia: MultimediaContent[] = (content.mediaUrls || []).map(url => ({
      type: this.detectMediaType(url),
      url,
      thumbnail: this.generateThumbnailUrl(url),
      description: `Media for ${content.title}`
    }));

    return {
      ...content.toObject(),
      multimedia,
      interestTags: this.extractInterestTags(content),
      accessibility: {
        screenReaderFriendly: true,
        visualDescriptions: multimedia.some(m => m.altText),
        audioAvailable: multimedia.some(m => m.type === 'audio')
      },
      contextualTriggers: {},
      offlineAvailable: multimedia.length === 0 || multimedia.every(m => m.type === 'image'),
      lastUpdated: content.updatedAt
    };
  }

  private filterByContext(
    content: EnhancedLocationContent[],
    context: ContentDeliveryContext
  ): EnhancedLocationContent[] {
    return content.filter(item => {
      const triggers = item.contextualTriggers;
      
      // Check time of day
      if (triggers.timeOfDay && !triggers.timeOfDay.includes(context.timeOfDay)) {
        return false;
      }
      
      // Check weather
      if (triggers.weather && context.weather && !triggers.weather.includes(context.weather)) {
        return false;
      }
      
      // Check crowd level
      if (triggers.crowdLevel && context.crowdLevel && !triggers.crowdLevel.includes(context.crowdLevel)) {
        return false;
      }
      
      return true;
    });
  }

  private personalizeContent(
    content: EnhancedLocationContent[],
    filter: PersonalizedContentFilter
  ): EnhancedLocationContent[] {
    return content
      .filter(item => {
        // Filter by interests
        const hasMatchingInterest = filter.interests.some(interest =>
          item.interestTags.includes(interest) ||
          item.title.toLowerCase().includes(interest.toLowerCase()) ||
          item.description.toLowerCase().includes(interest.toLowerCase())
        );
        
        // Filter by read time
        if (filter.maxReadTime && item.estimatedReadTime && item.estimatedReadTime > filter.maxReadTime) {
          return false;
        }
        
        return hasMatchingInterest;
      })
      .sort((a, b) => {
        // Sort by relevance to user interests
        const aRelevance = this.calculateRelevanceScore(a, filter);
        const bRelevance = this.calculateRelevanceScore(b, filter);
        return bRelevance - aRelevance;
      });
  }

  private determineDeliveryMethod(
    context: ContentDeliveryContext,
    content: EnhancedLocationContent[]
  ): 'immediate' | 'notification' | 'cached' {
    if (context.connectionQuality === 'offline') {
      return 'cached';
    }
    
    if (context.connectionQuality === 'poor' || (context.batteryLevel && context.batteryLevel < 20)) {
      return 'notification';
    }
    
    return 'immediate';
  }

  private optimizeContentForDevice(
    content: EnhancedLocationContent[],
    context: ContentDeliveryContext
  ): EnhancedLocationContent[] {
    let optimized = [...content];
    
    // Limit content based on connection quality
    if (context.connectionQuality === 'poor') {
      optimized = optimized.slice(0, 2); // Limit to 2 items
      // Remove heavy multimedia
      optimized = optimized.map(item => ({
        ...item,
        multimedia: item.multimedia.filter(m => m.type !== 'video' && (m.size || 0) < 1000000)
      }));
    }
    
    // Limit content based on battery level
    if (context.batteryLevel && context.batteryLevel < 30) {
      optimized = optimized.slice(0, 1); // Limit to 1 item
    }
    
    return optimized;
  }

  private getDeliveryReason(context: ContentDeliveryContext, contentCount: number): string {
    if (contentCount === 0) {
      return 'No relevant content found for current location and preferences';
    }
    
    if (context.connectionQuality === 'offline') {
      return 'Delivered cached content due to offline status';
    }
    
    if (context.connectionQuality === 'poor') {
      return 'Limited content due to poor connection quality';
    }
    
    return `Delivered ${contentCount} contextually relevant content items`;
  }

  private determineOfflineAvailability(multimedia: MultimediaContent[]): boolean {
    // Content is offline available if it has no multimedia or only small images
    return multimedia.length === 0 || multimedia.every(m => 
      m.type === 'image' && (m.size || 0) < 1000000 // Less than 1MB
    );
  }

  private detectMediaType(url: string): MultimediaContent['type'] {
    const extension = url.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'aac':
        return 'audio';
      default:
        return 'image';
    }
  }

  private generateThumbnailUrl(url: string): string {
    // Generate thumbnail URL (implementation would depend on CDN/storage service)
    return url.replace(/\.(jpg|jpeg|png)$/i, '_thumb.$1');
  }

  private extractInterestTags(content: ILocationContentDocument): string[] {
    // Extract interest tags from content
    const tags: string[] = [];
    
    // Add category as tag
    tags.push(content.category);
    
    // Extract keywords from title and description
    const text = `${content.title} ${content.description}`.toLowerCase();
    const keywords = ['history', 'culture', 'food', 'art', 'architecture', 'nature', 'shopping', 'temple', 'museum'];
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  private calculateRelevanceScore(
    content: EnhancedLocationContent,
    filter: PersonalizedContentFilter
  ): number {
    let score = content.priority;
    
    // Boost score for matching interests
    const matchingInterests = filter.interests.filter(interest =>
      content.interestTags.includes(interest)
    );
    score += matchingInterests.length * 2;
    
    // Boost score for preferred media types
    const hasPreferredMedia = content.multimedia.some(m =>
      filter.preferredMediaTypes.includes(m.type)
    );
    if (hasPreferredMedia) {
      score += 1;
    }
    
    return score;
  }

  private async storeInCache(key: string, data: any): Promise<void> {
    // Implementation would depend on caching solution (Redis, local storage, etc.)
    // For now, using in-memory cache
    console.log(`Storing in cache: ${key}`);
  }

  private async getFromCache(key: string): Promise<any> {
    // Implementation would depend on caching solution
    console.log(`Retrieving from cache: ${key}`);
    return null;
  }

  private async initializeContentCache(): Promise<void> {
    // Initialize content cache on service startup
    console.log('Initializing contextual content cache...');
  }
}