import { MallEventService } from '../../src/services/mallEventService';
import { EventModel } from '../../src/models/Event';
import { EventSource } from '../../src/types/event';

describe('MallEventService', () => {
  let mallService: MallEventService;

  beforeEach(() => {
    mallService = new MallEventService();
  });

  describe('fetchAllMallEvents', () => {
    it('should fetch events from all malls', async () => {
      const results = await mallService.fetchAllMallEvents();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Check that each result has mall and events
      results.forEach(result => {
        expect(result).toHaveProperty('mall');
        expect(result).toHaveProperty('events');
        expect(result.mall).toHaveProperty('name');
        expect(result.mall).toHaveProperty('address');
        expect(Array.isArray(result.events)).toBe(true);
      });
    });

    it('should include events from IFC Mall', async () => {
      const results = await mallService.fetchAllMallEvents();
      const ifcResult = results.find(r => r.mall.name === 'IFC Mall');
      
      expect(ifcResult).toBeDefined();
      expect(ifcResult!.events.length).toBeGreaterThan(0);
    });
  });

  describe('syncMallEvents', () => {
    it('should sync mall events to database', async () => {
      const result = await mallService.syncMallEvents();
      
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('errors');
      expect(result.created).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
      
      // Verify events were created in database
      const eventsInDb = await EventModel.find({ source: EventSource.MALL });
      expect(eventsInDb.length).toBe(result.created);
    });

    it('should update existing events on second sync', async () => {
      // First sync
      const firstResult = await mallService.syncMallEvents();
      expect(firstResult.created).toBeGreaterThan(0);
      
      // Second sync
      const secondResult = await mallService.syncMallEvents();
      expect(secondResult.created).toBe(0);
      expect(secondResult.updated).toBe(firstResult.created);
    });
  });

  describe('event transformation', () => {
    it('should transform mall event data correctly', async () => {
      await mallService.syncMallEvents();
      
      const events = await EventModel.find({ source: EventSource.MALL });
      const event = events[0];
      
      expect(event.source).toBe(EventSource.MALL);
      expect(event.id).toMatch(/^mall_/);
      expect(event.weatherDependent).toBe(false); // Mall events are indoor
      expect(event.organizer.type).toBe('mall');
      expect(event.tags).toContain('mall');
      expect(event.tags).toContain('indoor');
      expect(event.practicalInfo.accessibility.wheelchairAccessible).toBe(true);
      expect(event.practicalInfo.parkingInfo?.available).toBe(true);
    });

    it('should include mall-specific location information', async () => {
      await mallService.syncMallEvents();
      
      const events = await EventModel.find({ source: EventSource.MALL });
      const event = events[0];
      
      expect(event.location.venue).toMatch(/Mall/);
      expect(event.location.nearbyTransport.length).toBeGreaterThan(0);
      expect(event.location.nearbyTransport[0]).toHaveProperty('type');
      expect(event.location.nearbyTransport[0]).toHaveProperty('name');
      expect(event.location.nearbyTransport[0]).toHaveProperty('walkingTime');
    });
  });
});