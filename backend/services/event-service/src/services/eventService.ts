import { EventModel } from '../models/Event';
import { HKTBEventService } from './hktbEventService';
import { MallEventService } from './mallEventService';
import { EventRecommendationService, EventFilters, UserPreferences } from './eventRecommendationService';
import { Event, EventSource } from '../types/event';

export interface EventSyncResult {
  hktb: { created: number; updated: number; errors: number };
  mall: { created: number; updated: number; errors: number };
  totalProcessed: number;
  totalErrors: number;
}

export class EventService {
  private hktbService: HKTBEventService;
  private mallService: MallEventService;
  private recommendationService: EventRecommendationService;

  constructor() {
    this.hktbService = new HKTBEventService();
    this.mallService = new MallEventService();
    this.recommendationService = new EventRecommendationService();
  }

  /**
   * Sync all events from external sources
   */
  async syncAllEvents(): Promise<EventSyncResult> {
    console.log('Starting event synchronization...');

    try {
      // Sync HKTB events
      const hktbResult = await this.hktbService.syncHKTBEvents();
      console.log(`HKTB sync completed: ${hktbResult.created} created, ${hktbResult.updated} updated, ${hktbResult.errors} errors`);

      // Sync mall events
      const mallResult = await this.mallService.syncMallEvents();
      console.log(`Mall sync completed: ${mallResult.created} created, ${mallResult.updated} updated, ${mallResult.errors} errors`);

      const result: EventSyncResult = {
        hktb: hktbResult,
        mall: mallResult,
        totalProcessed: hktbResult.created + hktbResult.updated + mallResult.created + mallResult.updated,
        totalErrors: hktbResult.errors + mallResult.errors
      };

      console.log(`Event synchronization completed. Total processed: ${result.totalProcessed}, Total errors: ${result.totalErrors}`);
      return result;

    } catch (error) {
      console.error('Error during event synchronization:', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    try {
      const event = await EventModel.findOne({ id: eventId }).lean();
      return event;
    } catch (error) {
      console.error(`Error fetching event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Get events with filters
   */
  async getEvents(filters: EventFilters): Promise<Event[]> {
    try {
      return await this.recommendationService.getFilteredEvents(filters);
    } catch (error) {
      console.error('Error fetching filtered events:', error);
      throw error;
    }
  }

  /**
   * Get personalized event recommendations
   */
  async getPersonalizedRecommendations(
    userPreferences: UserPreferences,
    filters?: EventFilters,
    limit: number = 20
  ) {
    try {
      return await this.recommendationService.getPersonalizedRecommendations(
        userPreferences,
        filters,
        limit
      );
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      throw error;
    }
  }

  /**
   * Get nearby events
   */
  async getNearbyEvents(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 10
  ): Promise<Event[]> {
    try {
      return await this.recommendationService.getNearbyEvents(
        latitude,
        longitude,
        radiusKm,
        limit
      );
    } catch (error) {
      console.error('Error fetching nearby events:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 50): Promise<Event[]> {
    try {
      const events = await EventModel.find({
        startTime: { $gte: new Date() }
      })
      .sort({ startTime: 1 })
      .limit(limit)
      .lean();

      return events;
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  /**
   * Get events by source
   */
  async getEventsBySource(source: EventSource, limit: number = 20): Promise<Event[]> {
    try {
      const events = await EventModel.find({
        source,
        startTime: { $gte: new Date() }
      })
      .sort({ startTime: 1 })
      .limit(limit)
      .lean();

      return events;
    } catch (error) {
      console.error(`Error fetching events from source ${source}:`, error);
      throw error;
    }
  }

  /**
   * Search events by text
   */
  async searchEvents(query: string, limit: number = 20): Promise<Event[]> {
    try {
      const events = await EventModel.find({
        $and: [
          { startTime: { $gte: new Date() } },
          {
            $or: [
              { title: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { tags: { $in: [new RegExp(query, 'i')] } },
              { 'location.venue': { $regex: query, $options: 'i' } },
              { 'location.district': { $regex: query, $options: 'i' } }
            ]
          }
        ]
      })
      .sort({ startTime: 1 })
      .limit(limit)
      .lean();

      return events;
    } catch (error) {
      console.error(`Error searching events with query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(): Promise<{
    total: number;
    bySource: { [key: string]: number };
    byCategory: { [key: string]: number };
    upcoming: number;
    thisWeek: number;
  }> {
    try {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [
        total,
        bySource,
        byCategory,
        upcoming,
        thisWeek
      ] = await Promise.all([
        EventModel.countDocuments(),
        EventModel.aggregate([
          { $group: { _id: '$source', count: { $sum: 1 } } }
        ]),
        EventModel.aggregate([
          { $unwind: '$categories' },
          { $group: { _id: '$categories', count: { $sum: 1 } } }
        ]),
        EventModel.countDocuments({ startTime: { $gte: now } }),
        EventModel.countDocuments({
          startTime: { $gte: now, $lte: weekFromNow }
        })
      ]);

      return {
        total,
        bySource: bySource.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        upcoming,
        thisWeek
      };
    } catch (error) {
      console.error('Error fetching event statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up expired events
   */
  async cleanupExpiredEvents(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await EventModel.deleteMany({
        endTime: { $lt: cutoffDate }
      });

      console.log(`Cleaned up ${result.deletedCount} expired events older than ${daysOld} days`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired events:', error);
      throw error;
    }
  }
}