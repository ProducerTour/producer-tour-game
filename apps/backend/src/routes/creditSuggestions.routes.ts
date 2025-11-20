import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import creditSuggestionService from '../services/creditSuggestion.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/credit-suggestions
 * Search for collaborators by name
 * Query params: q (search query, optional)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { q } = req.query;

    const query = typeof q === 'string' ? q : '';
    const suggestions = await creditSuggestionService.suggestCollaborators(userId, query);

    res.json({
      success: true,
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error('Credit suggestions error:', error);
    res.status(500).json({ error: 'Failed to get credit suggestions' });
  }
});

/**
 * GET /api/credit-suggestions/frequent
 * Get user's most frequent collaborators
 * Query params: limit (number, default 10)
 */
router.get('/frequent', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit } = req.query;

    const limitNum = limit && typeof limit === 'string' ? parseInt(limit, 10) : 10;

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ error: 'Limit must be between 1 and 50' });
    }

    const suggestions = await creditSuggestionService.getFrequentCollaborators(userId, limitNum);

    res.json({
      success: true,
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error('Frequent collaborators error:', error);
    res.status(500).json({ error: 'Failed to get frequent collaborators' });
  }
});

/**
 * GET /api/credit-suggestions/recent
 * Get user's recent collaborators
 * Query params: limit (number, default 10)
 */
router.get('/recent', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit } = req.query;

    const limitNum = limit && typeof limit === 'string' ? parseInt(limit, 10) : 10;

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ error: 'Limit must be between 1 and 50' });
    }

    const suggestions = await creditSuggestionService.getRecentCollaborators(userId, limitNum);

    res.json({
      success: true,
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error('Recent collaborators error:', error);
    res.status(500).json({ error: 'Failed to get recent collaborators' });
  }
});

/**
 * POST /api/credit-suggestions/clear-cache
 * Clear cache for current user (useful after creating new credits)
 */
router.post('/clear-cache', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    creditSuggestionService.clearCache(userId);

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
