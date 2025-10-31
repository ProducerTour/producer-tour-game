import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/dashboard/summary
 * Get earnings summary for current user (Writer dashboard)
 */
router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total earnings (all time)
    const totalEarnings = await prisma.statementItem.aggregate({
      where: { userId },
      _sum: { revenue: true, performances: true },
    });

    // Year-to-date earnings
    const ytdEarnings = await prisma.statementItem.aggregate({
      where: {
        userId,
        OR: [
          { periodStart: { gte: yearStart } },
          { createdAt: { gte: yearStart } },
        ],
      },
      _sum: { revenue: true },
    });

    // Last month earnings
    const lastMonthEarnings = await prisma.statementItem.aggregate({
      where: {
        userId,
        periodStart: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { revenue: true },
    });

    // Total songs
    const songsCount = await prisma.statementItem.groupBy({
      by: ['workTitle'],
      where: { userId },
    });

    res.json({
      totalEarnings: totalEarnings._sum.revenue || 0,
      yearToDate: ytdEarnings._sum.revenue || 0,
      lastMonth: lastMonthEarnings._sum.revenue || 0,
      totalPerformances: totalEarnings._sum.performances || 0,
      totalSongs: songsCount.length,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/dashboard/songs
 * Get user's songs with aggregated earnings
 */
router.get('/songs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = '50', offset = '0' } = req.query;

    const songs = await prisma.statementItem.groupBy({
      by: ['workTitle'],
      where: { userId },
      _sum: {
        revenue: true,
        performances: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          revenue: 'desc',
        },
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const formattedSongs = songs.map((song) => ({
      title: song.workTitle,
      totalRevenue: song._sum.revenue || 0,
      totalPerformances: song._sum.performances || 0,
      statementCount: song._count.id,
    }));

    res.json({ songs: formattedSongs });
  } catch (error) {
    console.error('Dashboard songs error:', error);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

/**
 * GET /api/dashboard/timeline
 * Get earnings timeline (monthly breakdown)
 */
router.get('/timeline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { months = '12' } = req.query;

    // Get statement items with period info
    const items = await prisma.statementItem.findMany({
      where: { userId },
      select: {
        revenue: true,
        periodStart: true,
        createdAt: true,
      },
      orderBy: { periodStart: 'asc' },
    });

    // Group by month
    const monthlyData = new Map<string, number>();

    items.forEach((item) => {
      const date = item.periodStart || item.createdAt;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + Number(item.revenue));
    });

    const timeline = Array.from(monthlyData.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .slice(-parseInt(months as string));

    res.json({ timeline });
  } catch (error) {
    console.error('Dashboard timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

/**
 * GET /api/dashboard/stats (Admin)
 * Get platform-wide statistics
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [
      totalWriters,
      totalStatements,
      processedStatements,
      totalRevenue,
      uniqueWorks,
      recentStatements,
      proBreakdown,
      monthlyRevenue
    ] = await Promise.all([
      // Total writers
      prisma.user.count({ where: { role: 'WRITER' } }),

      // Total statements
      prisma.statement.count(),

      // Processed statements (PROCESSED or PUBLISHED)
      prisma.statement.count({
        where: {
          status: { in: ['PROCESSED', 'PUBLISHED'] }
        }
      }),

      // Total revenue
      prisma.statementItem.aggregate({ _sum: { revenue: true } }),

      // Unique works (songs)
      prisma.statementItem.groupBy({
        by: ['workTitle']
      }),

      // Recent statements
      prisma.statement.findMany({
        take: 5,
        orderBy: { uploadDate: 'desc' },
        select: {
          id: true,
          proType: true,
          filename: true,
          status: true,
          totalRevenue: true,
          uploadDate: true,
        },
      }),

      // PRO breakdown
      prisma.statement.groupBy({
        by: ['proType'],
        _count: true,
        _sum: {
          totalRevenue: true
        }
      }),

      // Monthly revenue (last 12 months)
      prisma.statementItem.findMany({
        select: {
          revenue: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Process monthly revenue data
    const monthlyData = new Map<string, number>();
    const now = new Date();

    // Initialize last 12 months with zero
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, 0);
    }

    // Aggregate actual revenue
    monthlyRevenue.forEach((item) => {
      const date = item.createdAt;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData.has(key)) {
        monthlyData.set(key, (monthlyData.get(key) || 0) + Number(item.revenue));
      }
    });

    const revenueTimeline = Array.from(monthlyData.entries()).map(([month, revenue]) => ({
      month,
      revenue: Number(revenue.toFixed(2))
    }));

    res.json({
      totalWriters,
      totalStatements,
      processedStatements,
      totalRevenue: totalRevenue._sum.revenue || 0,
      uniqueWorks: uniqueWorks.length,
      recentStatements,
      proBreakdown: proBreakdown.map(p => ({
        proType: p.proType,
        count: p._count,
        revenue: Number(p._sum.totalRevenue || 0)
      })),
      revenueTimeline
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
