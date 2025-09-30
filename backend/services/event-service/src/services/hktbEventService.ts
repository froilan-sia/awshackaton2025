import axios from 'axios';
import { EventModel } from '../models/Event';
import { Event, EventSource, EventCategory, OrganizerType } from '../types/event';

export interface HKTBEventData {
  id: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  district: string;
  startDate: string;
  endDate: string;
  category: string;
  isFree: boolean;
  ticketPrice?: number;
  bookingUrl?: string;
  images: string[];
  organizer: string;
  contact: {
    email?: string;
    phone?: string;
  };
  tags: string[];
  latitude: number;
  longitude: number;
}

export class HKTBEventService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.HKTB_API_URL || 'https://api.hktb.com/v1';
    this.apiKey = process.env.HKTB_API_KEY || '';
  }

  /**
   * Fetch events from HKTB API
   */
  async fetchHKTBEvents(): Promise<HKTBEventData[]> {
    try {
      // In a real implementation, this would call the actual HKTB API
      // For now, we'll return mock data that represents the expected structure
      return this.getMockHKTBEvents();
    } catch (error) {
      console.error('Error fetching HKTB events:', error);
      throw new Error('Failed to fetch HKTB events');
    }
  }

  /**
   * Transform HKTB event data to our internal Event format
   */
  private transformHKTBEvent(hktbEvent: HKTBEventData): Event {
    return {
      id: `hktb_${hktbEvent.id}`,
      title: hktbEvent.title,
      description: hktbEvent.description,
      location: {
        latitude: hktbEvent.latitude,
        longitude: hktbEvent.longitude,
        address: hktbEvent.address,
        district: hktbEvent.district,
        venue: hktbEvent.venue,
        nearbyTransport: [] // Would be populated from transport API
      },
      startTime: new Date(hktbEvent.startDate),
      endTime: new Date(hktbEvent.endDate),
      source: EventSource.HKTB,
      targetAudience: this.determineTargetAudience(hktbEvent.category),
      weatherDependent: this.isWeatherDependent(hktbEvent.category),
      categories: [this.mapCategory(hktbEvent.category)],
      pricing: {
        isFree: hktbEvent.isFree,
        ticketPrices: hktbEvent.ticketPrice ? [{
          category: 'General',
          price: hktbEvent.ticketPrice,
          description: 'Standard admission',
        }] : [],
        currency: 'HKD',
        bookingRequired: !!hktbEvent.bookingUrl,
        bookingUrl: hktbEvent.bookingUrl
      },
      capacity: {
        waitlistAvailable: false,
        isFullyBooked: false
      },
      organizer: {
        name: hktbEvent.organizer,
        type: OrganizerType.GOVERNMENT,
        contact: hktbEvent.contact
      },
      images: hktbEvent.images,
      tags: hktbEvent.tags,
      localPerspective: {
        localPopularity: 7, // HKTB events generally well-regarded
        localRecommendation: true,
        culturalSignificance: 'Official Hong Kong Tourism Board event',
        localTips: [],
        authenticityScore: 8
      },
      practicalInfo: {
        languageSupport: ['en', 'zh-HK', 'zh-CN'],
        accessibility: {
          wheelchairAccessible: true, // Assume HKTB events are accessible
          signLanguageSupport: false,
          audioDescriptionAvailable: false,
          largeTextAvailable: false,
          specialAccommodations: []
        },
        whatToBring: [],
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Sync HKTB events to database
   */
  async syncHKTBEvents(): Promise<{ created: number; updated: number; errors: number }> {
    let created = 0;
    let updated = 0;
    let errors = 0;

    try {
      const hktbEvents = await this.fetchHKTBEvents();
      
      for (const hktbEvent of hktbEvents) {
        try {
          const transformedEvent = this.transformHKTBEvent(hktbEvent);
          
          const existingEvent = await EventModel.findOne({ id: transformedEvent.id });
          
          if (existingEvent) {
            await EventModel.updateOne(
              { id: transformedEvent.id },
              { $set: transformedEvent }
            );
            updated++;
          } else {
            await EventModel.create(transformedEvent);
            created++;
          }
        } catch (error) {
          console.error(`Error processing HKTB event ${hktbEvent.id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error syncing HKTB events:', error);
      throw error;
    }

    return { created, updated, errors };
  }

  /**
   * Map HKTB category to our EventCategory enum
   */
  private mapCategory(hktbCategory: string): EventCategory {
    const categoryMap: { [key: string]: EventCategory } = {
      'cultural': EventCategory.CULTURAL,
      'entertainment': EventCategory.ENTERTAINMENT,
      'food': EventCategory.FOOD_DRINK,
      'sports': EventCategory.SPORTS,
      'festival': EventCategory.FESTIVAL,
      'exhibition': EventCategory.EXHIBITION,
      'performance': EventCategory.PERFORMANCE,
      'family': EventCategory.FAMILY
    };

    return categoryMap[hktbCategory.toLowerCase()] || EventCategory.CULTURAL;
  }

  /**
   * Determine target audience based on category
   */
  private determineTargetAudience(category: string): string[] {
    const audienceMap: { [key: string]: string[] } = {
      'family': ['families', 'children', 'adults'],
      'cultural': ['culture_enthusiasts', 'tourists', 'locals'],
      'entertainment': ['young_adults', 'tourists'],
      'sports': ['sports_fans', 'active_travelers'],
      'food': ['food_lovers', 'tourists', 'locals']
    };

    return audienceMap[category.toLowerCase()] || ['general'];
  }

  /**
   * Determine if event is weather dependent
   */
  private isWeatherDependent(category: string): boolean {
    const outdoorCategories = ['sports', 'festival', 'outdoor'];
    return outdoorCategories.some(cat => category.toLowerCase().includes(cat));
  }

  /**
   * Mock HKTB events data for development/testing
   */
  private getMockHKTBEvents(): HKTBEventData[] {
    return [
      {
        id: '1',
        title: 'Hong Kong Arts Festival 2024',
        description: 'Annual international arts festival featuring world-class performances',
        venue: 'Hong Kong Cultural Centre',
        address: '10 Salisbury Road, Tsim Sha Tsui',
        district: 'Tsim Sha Tsui',
        startDate: '2024-02-15T19:00:00Z',
        endDate: '2024-03-15T22:00:00Z',
        category: 'cultural',
        isFree: false,
        ticketPrice: 280,
        bookingUrl: 'https://www.hk.artsfestival.org',
        images: ['https://example.com/arts-festival.jpg'],
        organizer: 'Hong Kong Arts Festival Society',
        contact: {
          email: 'info@hkaf.org',
          phone: '+852 2824 2430'
        },
        tags: ['arts', 'culture', 'performance', 'international'],
        latitude: 22.2944,
        longitude: 114.1722
      },
      {
        id: '2',
        title: 'Dragon Boat Festival Celebrations',
        description: 'Traditional dragon boat races and cultural performances',
        venue: 'Victoria Harbour',
        address: 'Central Waterfront, Central',
        district: 'Central',
        startDate: '2024-06-10T09:00:00Z',
        endDate: '2024-06-10T18:00:00Z',
        category: 'festival',
        isFree: true,
        images: ['https://example.com/dragon-boat.jpg'],
        organizer: 'Hong Kong Tourism Board',
        contact: {
          email: 'events@hktb.com'
        },
        tags: ['traditional', 'festival', 'dragon_boat', 'cultural'],
        latitude: 22.2783,
        longitude: 114.1747
      }
    ];
  }
}