import { HKTBEventService } from '../../src/services/hktbEventService';
import { EventModel } from '../../src/models/Event';
import { EventSource } from '../../src/types/event';

describe('HKTBEventService', () => {
  let hktbService: HKTBEventService;

  beforeEach(() => {
    hktbService = new HKTBEventService();
  });

  describe('fetchHKTBEvents', () => {
    it('should fetch mock HKTB events', async () => {
      const events = await hktbService.fetchHKTBEvents();
      
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      
      // Check structure of first event
      const firstEvent = events[0];
      expect(firstEvent).toHaveProperty('id');
      expect(firstEvent).toHaveProperty('title');
      expect(firstEvent).toHaveProperty('description');
      expect(firstEvent).toHaveProperty('venue');
      expect(firstEvent).toHaveProperty('startDate');
      expect(firstEvent).toHaveProperty('endDate');
    });
  });

  describe('syncHKTBEvents', () => {
    it('should sync HKTB events to database', async () => {
      const result = await hktbService.syncHKTBEvents();
      
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('errors');
      expect(result.created).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
      
      // Verify events were created in database
      const eventsInDb = await EventModel.find({ source: EventSource.HKTB });
      expect(eventsInDb.length).toBe(result.created);
    });

    it('should update existing events on second sync', async () => {
      // First sync
      const firstResult = await hktbService.syncHKTBEvents();
      expect(firstResult.created).toBeGreaterThan(0);
      expect(firstResult.updated).toBe(0);
      
      // Second sync
      const secondResult = await hktbService.syncHKTBEvents();
      expect(secondResult.created).toBe(0);
      expect(secondResult.updated).toBe(firstResult.created);
    });

    it('should handle sync errors gracefully', async () => {
      // Mock fetchHKTBEvents to throw an error
      jest.spyOn(hktbService, 'fetchHKTBEvents').mockRejectedValue(new Error('API Error'));
      
      await expect(hktbService.syncHKTBEvents()).rejects.toThrow('API Error');
    });
  });

  describe('event transformation', () => {
    it('should transform HKTB event data correctly', async () => {
      await hktbService.syncHKTBEvents();
      
      const events = await EventModel.find({ source: EventSource.HKTB });
      const event = events[0];
      
      expect(event.source).toBe(EventSource.HKTB);
      expect(event.id).toMatch(/^hktb_/);
      expect(event.localPerspective.authenticityScore).toBe(8);
      expect(event.organizer.type).toBe('government');
      expect(event.practicalInfo.languageSupport).toContain('en');
      expect(event.practicalInfo.languageSupport).toContain('zh-HK');
    });
  });
});