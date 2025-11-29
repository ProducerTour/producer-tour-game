/**
 * Insights Feed API Routes
 * Endpoints for fetching and managing music industry news/insights
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { InsightCategory } from '../generated/client';
import * as insightsService from '../services/insights.service';

const router = Router();

// Validation schemas
const addArticleSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  source: z.string().min(1),
  category: z.enum(['AGGREGATOR', 'TASTEMAKERS', 'DISCOVERY', 'NEWS', 'PUBLISHERS']),
});

/**
 * GET /api/insights/articles
 * Get articles with optional filtering
 */
router.get('/articles', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category, source, limit, offset } = req.query;

    const result = await insightsService.getArticles({
      category: category as InsightCategory | undefined,
      source: source as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Failed to get articles' });
  }
});

/**
 * GET /api/insights/sources
 * Get all feed sources with stats (Admin only)
 */
router.get('/sources', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const sources = await insightsService.getFeedSources();
    res.json({ sources });
  } catch (error) {
    console.error('Get sources error:', error);
    res.status(500).json({ error: 'Failed to get feed sources' });
  }
});

/**
 * POST /api/insights/refresh
 * Manually trigger a feed refresh (Admin only)
 */
router.post('/refresh', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    console.log(`🔄 Feed refresh triggered by admin: ${req.user!.email}`);
    const result = await insightsService.refreshAllFeeds();
    res.json({
      message: 'Feed refresh completed',
      ...result,
    });
  } catch (error) {
    console.error('Refresh feeds error:', error);
    res.status(500).json({ error: 'Failed to refresh feeds' });
  }
});

/**
 * POST /api/insights/seed
 * Seed default feed sources (Admin only)
 */
router.post('/seed', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await insightsService.seedFeedSources();
    res.json({ message: 'Feed sources seeded successfully' });
  } catch (error) {
    console.error('Seed sources error:', error);
    res.status(500).json({ error: 'Failed to seed feed sources' });
  }
});

/**
 * POST /api/insights/articles/:id/pin
 * Pin/unpin an article (Admin only)
 */
router.post('/articles/:id/pin', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isPinned = await insightsService.togglePinArticle(id, req.user!.id);
    res.json({
      message: isPinned ? 'Article pinned' : 'Article unpinned',
      isPinned,
    });
  } catch (error: any) {
    console.error('Pin article error:', error);
    if (error.message === 'Article not found') {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.status(500).json({ error: 'Failed to pin article' });
  }
});

/**
 * POST /api/insights/articles/:id/hide
 * Hide/unhide an article (Admin only)
 */
router.post('/articles/:id/hide', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isHidden = await insightsService.toggleHideArticle(id);
    res.json({
      message: isHidden ? 'Article hidden' : 'Article visible',
      isHidden,
    });
  } catch (error: any) {
    console.error('Hide article error:', error);
    if (error.message === 'Article not found') {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.status(500).json({ error: 'Failed to hide article' });
  }
});

/**
 * POST /api/insights/articles
 * Manually add an article (Admin only)
 */
router.post('/articles', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = addArticleSchema.parse(req.body);
    const article = await insightsService.addManualArticle(
      {
        url: data.url,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        source: data.source,
        category: data.category as InsightCategory,
      },
      req.user!.id
    );
    res.status(201).json({
      message: 'Article added successfully',
      article,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Article with this URL already exists' });
    }
    console.error('Add article error:', error);
    res.status(500).json({ error: 'Failed to add article' });
  }
});

/**
 * POST /api/insights/sources/:id/toggle
 * Toggle feed source active status (Admin only)
 */
router.post('/sources/:id/toggle', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isActive = await insightsService.toggleFeedSource(id);
    res.json({
      message: isActive ? 'Feed source enabled' : 'Feed source disabled',
      isActive,
    });
  } catch (error: any) {
    console.error('Toggle source error:', error);
    if (error.message === 'Feed source not found') {
      return res.status(404).json({ error: 'Feed source not found' });
    }
    res.status(500).json({ error: 'Failed to toggle feed source' });
  }
});

export default router;
