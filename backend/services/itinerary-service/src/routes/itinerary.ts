import { Router, Request, Response } from 'express';
import { ItineraryService } from '../services/itineraryService';
import { 
  validateItineraryRequest,
  validateItineraryModification,
  validateItineraryUpdate,
  validateShareOptions,
  validateExportFormat
} from '../validation/itineraryValidation';

const router = Router();
const itineraryService = new ItineraryService();

/**
 * Generate a new personalized itinerary
 * POST /api/itinerary/generate
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { error, value } = validateItineraryRequest(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const itinerary = await itineraryService.generateItinerary(value);
    
    res.status(201).json({
      success: true,
      data: itinerary
    });
  } catch (error) {
    console.error('Error generating itinerary:', error);
    res.status(500).json({
      error: 'Failed to generate itinerary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get an itinerary by ID
 * GET /api/itinerary/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const itinerary = await itineraryService.getItinerary(id);
    
    if (!itinerary) {
      return res.status(404).json({
        error: 'Itinerary not found'
      });
    }

    res.json({
      success: true,
      data: itinerary
    });
  } catch (error) {
    console.error('Error fetching itinerary:', error);
    res.status(500).json({
      error: 'Failed to fetch itinerary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all itineraries for a user
 * GET /api/itinerary/user/:userId
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const itineraries = await itineraryService.getUserItineraries(userId);
    
    res.json({
      success: true,
      data: itineraries,
      count: itineraries.length
    });
  } catch (error) {
    console.error('Error fetching user itineraries:', error);
    res.status(500).json({
      error: 'Failed to fetch user itineraries',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update an itinerary
 * PUT /api/itinerary/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = validateItineraryUpdate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const updatedItinerary = await itineraryService.updateItinerary(id, value);
    
    if (!updatedItinerary) {
      return res.status(404).json({
        error: 'Itinerary not found'
      });
    }

    res.json({
      success: true,
      data: updatedItinerary
    });
  } catch (error) {
    console.error('Error updating itinerary:', error);
    res.status(500).json({
      error: 'Failed to update itinerary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete an itinerary
 * DELETE /api/itinerary/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await itineraryService.deleteItinerary(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Itinerary not found'
      });
    }

    res.json({
      success: true,
      message: 'Itinerary deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting itinerary:', error);
    res.status(500).json({
      error: 'Failed to delete itinerary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Apply a modification to an itinerary
 * POST /api/itinerary/:id/modify
 */
router.post('/:id/modify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = validateItineraryModification(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const result = await itineraryService.modifyItinerary(id, value);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Modification failed',
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.itinerary,
      message: 'Itinerary modified successfully'
    });
  } catch (error) {
    console.error('Error modifying itinerary:', error);
    res.status(500).json({
      error: 'Failed to modify itinerary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get modification suggestions for an itinerary
 * GET /api/itinerary/:id/suggestions
 */
router.get('/:id/suggestions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const suggestions = await itineraryService.getModificationSuggestions(id);
    
    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      error: 'Failed to fetch suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Optimize an itinerary
 * POST /api/itinerary/:id/optimize
 */
router.post('/:id/optimize', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({
        error: 'User preferences required for optimization'
      });
    }

    const result = await itineraryService.optimizeItinerary(id, preferences);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Optimization failed',
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.itinerary,
      optimizationResult: result.optimizationResult,
      message: 'Itinerary optimized successfully'
    });
  } catch (error) {
    console.error('Error optimizing itinerary:', error);
    res.status(500).json({
      error: 'Failed to optimize itinerary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Validate an itinerary
 * GET /api/itinerary/:id/validate
 */
router.get('/:id/validate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = await itineraryService.validateItinerary(id);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating itinerary:', error);
    res.status(500).json({
      error: 'Failed to validate itinerary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get itinerary statistics
 * GET /api/itinerary/:id/stats
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stats = await itineraryService.getItineraryStats(id);
    
    if (!stats) {
      return res.status(404).json({
        error: 'Itinerary not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching itinerary stats:', error);
    res.status(500).json({
      error: 'Failed to fetch itinerary stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Export an itinerary
 * GET /api/itinerary/:id/export/:format
 */
router.get('/:id/export/:format', async (req: Request, res: Response) => {
  try {
    const { id, format } = req.params;
    const { error } = validateExportFormat(format);
    
    if (error) {
      return res.status(400).json({
        error: 'Invalid export format',
        supportedFormats: ['json', 'pdf', 'calendar']
      });
    }

    const exportData = await itineraryService.exportItinerary(id, format as any);
    
    if (format === 'json') {
      res.json({
        success: true,
        data: exportData
      });
    } else {
      res.json({
        success: true,
        data: exportData,
        message: `Export prepared in ${format} format`
      });
    }
  } catch (error) {
    console.error('Error exporting itinerary:', error);
    res.status(500).json({
      error: 'Failed to export itinerary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Share an itinerary
 * POST /api/itinerary/:id/share
 */
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = validateShareOptions(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const result = await itineraryService.shareItinerary(id, value);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Sharing failed',
        message: result.error
      });
    }

    res.json({
      success: true,
      shareUrl: result.shareUrl,
      message: 'Itinerary shared successfully'
    });
  } catch (error) {
    console.error('Error sharing itinerary:', error);
    res.status(500).json({
      error: 'Failed to share itinerary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/itinerary/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'itinerary-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;