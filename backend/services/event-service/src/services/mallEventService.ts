import axios from 'axios';
import { EventModel } from '../models/Event';
import { Event, EventSource, EventCategory, OrganizerType } from '../types/event';

export interface MallEventData {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  floor?: string;
  category: string;
  isFree: boolean;
  targetAge?: string;
  images: string[];
  contact?: {
    phone?: string;
    email?: string;
  };
  tags: string[];
}

export interface MallInfo {
  name: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  apiUrl: string;
}

export class MallEventService {
  private malls: MallInfo[] = [
    {
      name: 'IFC Mall',
      address: '8 Finance Street, Central',
      district: 'Central',
      latitude: 22.2855,
      longitude: 114.1577,
      apiUrl: process.env.IFC_API_URL || 'https://api.ifc.com.hk/events'
    },
    {
      name: 'Pacific Place',
      address: '88 Queensway, Admiralty',
      district: 'Admiralty',
      latitude: 22.2783,
      longitude: 114.1650,
      apiUrl: process.env.PACIFIC_PLACE_API_URL || 'https://api.pacificplace.com.hk/events'
    },
    {
      name: 'Harbour City',
      address: 'Canton Road, Tsim Sha Tsui',
      district: 'Tsim Sha Tsui',
      latitude: 22.2976,
      longitude: 114.1689,
      apiUrl: process.env.HARBOUR_CITY_API_URL || 'https://api.harbourcity.com.hk/events'
    }
  ];

  /**
   * Fetch events from all mall APIs
   */
  async fetchAllMallEvents(): Promise<{ mall: MallInfo; events: MallEventData[] }[]> {
    const results = [];

    for (const mall of this.malls) {
      try {
        const events = await this.fetchMallEvents(mall);
        results.push({ mall, events });
      } catch (error) {
        console.error(`Error fetching events from ${mall.name}:`, error);
        // Continue with other malls even if one fails
        results.push({ mall, events: [] });
      }
    }

    return results;
  }

  /**
   * Fetch events from a specific mall API
   */
  private async fetchMallEvents(mall: MallInfo): Promise<MallEventData[]> {
    try {
      // In a real implementation, this would call the actual mall APIs
      // For now, we'll return mock data for each mall
      return this.getMockMallEvents(mall.name);
    } catch (error) {
      console.error(`Error fetching events from ${mall.name}:`, error);
      throw new Error(`Failed to fetch events from ${mall.name}`);
    }
  }

  /**
   * Transform mall event data to our internal Event format
   */
  private transformMallEvent(mallEvent: MallEventData, mall: MallInfo): Event {
    return {
      id: `mall_${mall.name.toLowerCase().replace(/\s+/g, '_')}_${mallEvent.id}`,
      title: mallEvent.title,
      description: mallEvent.description,
      location: {
        latitude: mall.latitude,
        longitude: mall.longitude,
        address: mall.address,
        district: mall.district,
        venue: `${mall.name}${mallEvent.floor ? ` - ${mallEvent.floor}` : ''}`,
        nearbyTransport: this.getNearbyTransport(mall.name)
      },
      startTime: new Date(mallEvent.startDate),
      endTime: new Date(mallEvent.endDate),
      source: EventSource.MALL,
      targetAudience: this.determineTargetAudience(mallEvent.category, mallEvent.targetAge),
      weatherDependent: false, // Mall events are indoor
      categories: [this.mapCategory(mallEvent.category)],
      pricing: {
        isFree: mallEvent.isFree,
        ticketPrices: [],
        currency: 'HKD',
        bookingRequired: false
      },
      capacity: {
        waitlistAvailable: false,
        isFullyBooked: false
      },
      organizer: {
        name: mall.name,
        type: OrganizerType.MALL,
        contact: mallEvent.contact || {}
      },
      images: mallEvent.images,
      tags: [...mallEvent.tags, 'mall', 'indoor', 'shopping'],
      localPerspective: {
        localPopularity: 6, // Mall events are moderately popular with locals
        localRecommendation: true,
        culturalSignificance: 'Shopping mall community event',
        localTips: [
          'Events are usually free and family-friendly',
          'Check mall opening hours before visiting',
          'Parking may be limited during events'
        ],
        authenticityScore: 5 // Moderate authenticity for mall events
      },
      practicalInfo: {
        languageSupport: ['en', 'zh-HK'],
        accessibility: {
          wheelchairAccessible: true, // Malls are generally accessible
          signLanguageSupport: false,
          audioDescriptionAvailable: false,
          largeTextAvailable: false,
          specialAccommodations: []
        },
        whatToBring: [],
        parkingInfo: {
          available: true,
          cost: 20, // Typical mall parking rate per hour
          restrictions: ['Validation may be available with purchase']
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Sync all mall events to database
   */
  async syncMallEvents(): Promise<{ created: number; updated: number; errors: number }> {
    let created = 0;
    let updated = 0;
    let errors = 0;

    try {
      const mallEventData = await this.fetchAllMallEvents();
      
      for (const { mall, events } of mallEventData) {
        for (const mallEvent of events) {
          try {
            const transformedEvent = this.transformMallEvent(mallEvent, mall);
            
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
            console.error(`Error processing mall event ${mallEvent.id} from ${mall.name}:`, error);
            errors++;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing mall events:', error);
      throw error;
    }

    return { created, updated, errors };
  }

  /**
   * Map mall category to our EventCategory enum
   */
  private mapCategory(mallCategory: string): EventCategory {
    const categoryMap: { [key: string]: EventCategory } = {
      'family': EventCategory.FAMILY,
      'entertainment': EventCategory.ENTERTAINMENT,
      'workshop': EventCategory.WORKSHOP,
      'exhibition': EventCategory.EXHIBITION,
      'performance': EventCategory.PERFORMANCE,
      'seasonal': EventCategory.SEASONAL,
      'food': EventCategory.FOOD_DRINK,
      'education': EventCategory.EDUCATION
    };

    return categoryMap[mallCategory.toLowerCase()] || EventCategory.ENTERTAINMENT;
  }

  /**
   * Determine target audience based on category and age
   */
  private determineTargetAudience(category: string, targetAge?: string): string[] {
    const audiences = [];
    
    if (targetAge) {
      if (targetAge.includes('child') || targetAge.includes('kid')) {
        audiences.push('children', 'families');
      }
      if (targetAge.includes('adult')) {
        audiences.push('adults');
      }
      if (targetAge.includes('senior')) {
        audiences.push('seniors');
      }
    }

    // Add category-based audiences
    if (category.includes('family')) {
      audiences.push('families', 'children');
    }
    if (category.includes('workshop')) {
      audiences.push('learning_enthusiasts');
    }

    return audiences.length > 0 ? audiences : ['general'];
  }

  /**
   * Get nearby transport information for each mall
   */
  private getNearbyTransport(mallName: string) {
    const transportMap: { [key: string]: any[] } = {
      'IFC Mall': [
        { type: 'mtr', name: 'Central Station', walkingTime: 2, distance: 100 },
        { type: 'mtr', name: 'Hong Kong Station', walkingTime: 1, distance: 50 }
      ],
      'Pacific Place': [
        { type: 'mtr', name: 'Admiralty Station', walkingTime: 3, distance: 200 }
      ],
      'Harbour City': [
        { type: 'mtr', name: 'Tsim Sha Tsui Station', walkingTime: 5, distance: 400 }
      ]
    };

    return transportMap[mallName] || [];
  }

  /**
   * Mock mall events data for development/testing
   */
  private getMockMallEvents(mallName: string): MallEventData[] {
    const eventsByMall: { [key: string]: MallEventData[] } = {
      'IFC Mall': [
        {
          id: '1',
          title: 'Children\'s Art Workshop',
          description: 'Creative art workshop for kids aged 5-12',
          startDate: '2024-02-20T14:00:00Z',
          endDate: '2024-02-20T16:00:00Z',
          location: 'Level 1 Atrium',
          floor: 'Level 1',
          category: 'family',
          isFree: true,
          targetAge: 'children',
          images: ['https://example.com/art-workshop.jpg'],
          tags: ['art', 'children', 'creative', 'workshop']
        },
        {
          id: '2',
          title: 'Chinese New Year Lion Dance',
          description: 'Traditional lion dance performance for Chinese New Year',
          startDate: '2024-02-10T15:00:00Z',
          endDate: '2024-02-10T15:30:00Z',
          location: 'Central Atrium',
          category: 'performance',
          isFree: true,
          images: ['https://example.com/lion-dance.jpg'],
          tags: ['traditional', 'performance', 'chinese_new_year', 'cultural']
        }
      ],
      'Pacific Place': [
        {
          id: '1',
          title: 'Fashion Week Showcase',
          description: 'Latest fashion trends showcase by local designers',
          startDate: '2024-03-01T18:00:00Z',
          endDate: '2024-03-01T20:00:00Z',
          location: 'Level 3 Event Space',
          floor: 'Level 3',
          category: 'exhibition',
          isFree: true,
          images: ['https://example.com/fashion-show.jpg'],
          tags: ['fashion', 'design', 'local_designers', 'showcase']
        }
      ],
      'Harbour City': [
        {
          id: '1',
          title: 'Ocean Park Character Meet & Greet',
          description: 'Meet your favorite Ocean Park characters',
          startDate: '2024-02-25T11:00:00Z',
          endDate: '2024-02-25T17:00:00Z',
          location: 'Gateway Arcade',
          category: 'family',
          isFree: true,
          targetAge: 'children',
          images: ['https://example.com/ocean-park-characters.jpg'],
          tags: ['family', 'characters', 'ocean_park', 'meet_greet']
        }
      ]
    };

    return eventsByMall[mallName] || [];
  }
}