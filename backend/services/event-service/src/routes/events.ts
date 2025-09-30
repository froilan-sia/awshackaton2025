import { Router, Request, Response } from 'express';
import { EventService } from '../services/eventService';
import { EventFilters, UserPreferences } from '../services/eventRecommendationService';
import { EventSource, EventCategory } from '../types/event';

const router = Router();
const eventService = new EventService();

/**
 * GET /events - Get events with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: EventFilters = {};

    // Parse query parameters
    if (req.query.categories) {
      filters.categories = (req.query.categories as string).split(',') as EventCategory[];
    }

    if (req.query.sources) {
      filters.sources = (req.query.sources as string).split(',') as EventSource[];
    }

    if (req.query.districts) {
      filters.districts = (req.query.districts as string).split(',');
    }

    if (req.query.startDate && req.query.endDate) {
      filters.dateRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string)
      };
    }

    if (req.query.isFree !== undefined) {
      filters.isFree = req.query.isFree === 'true';
    }

    if (req.query.weatherDependent !== undefined) {
      filters.weatherDependent = req.query.weatherDependent === 'true';
    }

    if (req.query.targetAudience) {
      filters.targetAudience = (req.query.targetAudience as string).split(',');
    }

    if (req.query.userLat && req.query.userLng && req.query.maxDistance) {
      filters.userLocation = {
        latitude: parseFloat(req.query.userLat as string),
        longitude: parseFloat(req.query.userLng as string)
      };
      filters.maxDistance = parseFloat(req.query.maxDistance as string);
    }

    const events = await eventService.getEvents(filters);
    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

/**
 * GET /events/:id - Get event by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error(`Error fetching event ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event'
    });
  }
});

/**
 * POST /events/recommendations - Get personalized recommendations
 */
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const { userPreferences, filters, limit } = req.body;

    if (!userPreferences) {
      return res.status(400).json({
        success: false,
        error: 'User preferences are required'
      });
    }

    const recommendations = await eventService.getPersonalizedRecommendations(
      userPreferences as UserPreferences,
      filters as EventFilters,
      limit || 20
    );

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

/**
 * GET /events/nearby/:lat/:lng - Get nearby events
 */
router.get('/nearby/:lat/:lng', async (req: Request, res: Response) => {
  try {
    const latitude = parseFloat(req.params.lat);
    const longitude = parseFloat(req.params.lng);
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 5;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates'
      });
    }

    const events = await eventService.getNearbyEvents(latitude, longitude, radius, limit);

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching nearby events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby events'
    });
  }
});

/**
 * GET /events/upcoming - Get upcoming events
 */
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const events = await eventService.getUpcomingEvents(limit);

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming events'
    });
  }
});

/**
 * GET /events/source/:source - Get events by source
 */
router.get('/source/:source', async (req: Request, res: Response) => {
  try {
    const source = req.params.source as EventSource;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    if (!Object.values(EventSource).includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event source'
      });
    }

    const events = await eventService.getEventsBySource(source, limit);

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error(`Error fetching events from source ${req.params.source}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events by source'
    });
  }
});

/**
 * GET /events/search/:query - Search events
 */
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const query = req.params.query;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const events = await eventService.searchEvents(query, limit);

    res.json({
      success: true,
      data: events,
      count: events.length,
      query
    });
  } catch (error) {
    console.error(`Error searching events with query "${req.params.query}":`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to search events'
    });
  }
});

/**
 * GET /events/stats - Get event statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await eventService.getEventStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching event statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event statistics'
    });
  }
});

/**
 * POST /events/sync - Manually trigger event synchronization
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const result = await eventService.syncAllEvents();

    res.json({
      success: true,
      data: result,
      message: 'Event synchronization completed'
    });
  } catch (error) {
    console.error('Error during manual event sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync events'
    });
  }
});

export default router;