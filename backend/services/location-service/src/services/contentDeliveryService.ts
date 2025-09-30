import { LocationContentModel, ILocationContentDocument } from '../models/LocationContent';
import { GeofenceEventModel } from '../models/GeofenceEvent';
import { 
  LocationContent, 
  GeofenceEvent, 
  GeofenceEventType, 
  ContentCategory,
  GeoLocation 
} from '../types/location';
import { GeofenceService } from './geofenceService';
const { v4: uuidv4 } = require('uuid');

export class ContentDeliveryService {
  private geofenceService: GeofenceService;

  constructor() {
    this.geofenceService = new GeofenceService();
  }

  /**
   * Create location-based content
   */
  async createLocationContent(
    contentData: Omit<LocationContent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ILocationContentDocument> {
    const content = new LocationContentModel({
      ...contentData,
      id: uuidv4()
    });

    return await content.save();
  }

  /**
   * Get content for a specific geofence
   */
  async getContentForGeofence(
    geofenceId: string,
    language: string = 'en',
    category?: ContentCategory
  ): Promise<ILocationContentDocument[]> {
    const query: any = {
      geofenceId,
      language,
      isActive: true
    };

    if (category) {
      query.category = category;
    }

    return await LocationContentModel.find(query)
      .sort({ priority: -1, createdAt: -1 });
  }

  /**
   * Get content triggered by geofence events
   */
  async getTriggeredContent(
    userId: string,
    geofenceEvents: GeofenceEvent[],
    language: string = 'en',
    userPreferences?: string[]
  ): Promise<{
    event: GeofenceEvent;
    content: ILocationContentDocument[];
  }[]> {
    const triggeredContent: {
      event: GeofenceEvent;
      content: ILocationContentDocument[];
    }[] = [];

    for (const event of geofenceEvents) {
      // Only deliver content for ENTER and DWELL events
      if (event.eventType === GeofenceEventType.ENTER || 
          event.eventType === GeofenceEventType.DWELL) {
        
        // Check if content was already delivered for this event
        if (event.contentDelivered) {
          continue;
        }

        let content = await this.getContentForGeofence(event.geofenceId, language);

        // Filter content based on user preferences if provided
        if (userPreferences && userPreferences.length > 0) {
          content = this.filterContentByPreferences(content, userPreferences);
        }

        // Prioritize content for ENTER vs DWELL events
        if (event.eventType === GeofenceEventType.DWELL) {
          // For dwell events, prioritize deeper content
          content = content.filter(c => 
            c.category === ContentCategory.HISTORICAL || 
            c.category === ContentCategory.CULTURAL
          );
        } else {
          // For enter events, prioritize practical and safety content
          content = content.sort((a, b) => {
            const practicalCategories = [
              ContentCategory.PRACTICAL,
              ContentCategory.SAFETY,
              ContentCategory.ETIQUETTE
            ];
            
            const aIsPractical = practicalCategories.includes(a.category);
            const bIsPractical = practicalCategories.includes(b.category);
            
            if (aIsPractical && !bIsPractical) return -1;
            if (!aIsPractical && bIsPractical) return 1;
            return b.priority - a.priority;
          });
        }

        if (content.length > 0) {
          triggeredContent.push({
            event,
            content: content.slice(0, 3) // Limit to top 3 pieces of content
          });

          // Mark event as having content delivered
          await this.markContentDelivered(event.id);
        }
      }
    }

    return triggeredContent;
  }

  /**
   * Get contextual content for current location
   */
  async getContextualContent(
    location: GeoLocation,
    language: string = 'en',
    userPreferences?: string[],
    radius: number = 500
  ): Promise<{
    geofenceId: string;
    geofenceName: string;
    content: ILocationContentDocument[];
  }[]> {
    // Find nearby geofences
    const nearbyGeofences = await this.geofenceService.getGeofencesNearLocation(
      location, 
      radius
    );

    const contextualContent: {
      geofenceId: string;
      geofenceName: string;
      content: ILocationContentDocument[];
    }[] = [];

    for (const geofence of nearbyGeofences) {
      let content = await this.getContentForGeofence(geofence.id, language);

      if (userPreferences && userPreferences.length > 0) {
        content = this.filterContentByPreferences(content, userPreferences);
      }

      if (content.length > 0) {
        contextualContent.push({
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          content: content.slice(0, 2) // Limit to top 2 pieces per geofence
        });
      }
    }

    // Sort by proximity and content priority
    return contextualContent.sort((a, b) => {
      const avgPriorityA = a.content.reduce((sum, c) => sum + c.priority, 0) / a.content.length;
      const avgPriorityB = b.content.reduce((sum, c) => sum + c.priority, 0) / b.content.length;
      return avgPriorityB - avgPriorityA;
    });
  }

  /**
   * Update location content
   */
  async updateLocationContent(
    contentId: string,
    updates: Partial<LocationContent>
  ): Promise<ILocationContentDocument | null> {
    return await LocationContentModel.findOneAndUpdate(
      { id: contentId },
      updates,
      { new: true }
    );
  }

  /**
   * Delete location content
   */
  async deleteLocationContent(contentId: string): Promise<boolean> {
    const result = await LocationContentModel.deleteOne({ id: contentId });
    return result.deletedCount > 0;
  }

  /**
   * Get content by category and location
   */
  async getContentByCategory(
    category: ContentCategory,
    location: GeoLocation,
    language: string = 'en',
    radius: number = 1000
  ): Promise<ILocationContentDocument[]> {
    const nearbyGeofences = await this.geofenceService.getGeofencesNearLocation(
      location, 
      radius
    );

    const geofenceIds = nearbyGeofences.map(g => g.id);

    return await LocationContentModel.find({
      geofenceId: { $in: geofenceIds },
      category,
      language,
      isActive: true
    }).sort({ priority: -1 });
  }

  /**
   * Bulk create location content
   */
  async bulkCreateLocationContent(
    contentItems: Omit<LocationContent, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<ILocationContentDocument[]> {
    const contentDocuments = contentItems.map(content => ({
      ...content,
      id: uuidv4()
    }));

    return await LocationContentModel.insertMany(contentDocuments);
  }

  /**
   * Get content statistics for analytics
   */
  async getContentStatistics(geofenceId?: string): Promise<{
    totalContent: number;
    contentByCategory: Record<ContentCategory, number>;
    contentByLanguage: Record<string, number>;
    activeContent: number;
  }> {
    const query = geofenceId ? { geofenceId } : {};
    
    const [
      totalContent,
      contentByCategory,
      contentByLanguage,
      activeContent
    ] = await Promise.all([
      LocationContentModel.countDocuments(query),
      LocationContentModel.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      LocationContentModel.aggregate([
        { $match: query },
        { $group: { _id: '$language', count: { $sum: 1 } } }
      ]),
      LocationContentModel.countDocuments({ ...query, isActive: true })
    ]);

    const categoryStats: Record<ContentCategory, number> = {} as any;
    contentByCategory.forEach(item => {
      categoryStats[item._id as ContentCategory] = item.count;
    });

    const languageStats: Record<string, number> = {};
    contentByLanguage.forEach(item => {
      languageStats[item._id] = item.count;
    });

    return {
      totalContent,
      contentByCategory: categoryStats,
      contentByLanguage: languageStats,
      activeContent
    };
  }

  /**
   * Filter content based on user preferences
   */
  private filterContentByPreferences(
    content: ILocationContentDocument[],
    preferences: string[]
  ): ILocationContentDocument[] {
    const preferenceCategories = preferences.map(p => p.toLowerCase());
    
    return content.filter(c => {
      const categoryMatch = preferenceCategories.includes(c.category.toLowerCase());
      const titleMatch = preferenceCategories.some(pref => 
        (c.title && c.title.toLowerCase().includes(pref)) || 
        (c.description && c.description.toLowerCase().includes(pref))
      );
      
      return categoryMatch || titleMatch;
    });
  }

  /**
   * Mark geofence event as having content delivered
   */
  private async markContentDelivered(eventId: string): Promise<void> {
    await GeofenceEventModel.findOneAndUpdate(
      { id: eventId },
      { contentDelivered: true }
    );
  }
}