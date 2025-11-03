import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/dashboard/summary
 * Get earnings summary for current user (Writer dashboard)
 * WRITERS SEE: Net revenue (after commissions)
 */
router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total earnings (all time) - NET revenue (what writer actually receives)
    const totalEarnings = await prisma.statementItem.aggregate({
      where: { userId },
      _sum: { netRevenue: true, performances: true },
    });

    // Year-to-date earnings - NET
    const ytdEarnings = await prisma.statementItem.aggregate({
      where: {
        userId,
        OR: [
          { periodStart: { gte: yearStart } },
          { createdAt: { gte: yearStart } },
        ],
      },
      _sum: { netRevenue: true },
    });

    // Last month earnings - NET
    const lastMonthEarnings = await prisma.statementItem.aggregate({
      where: {
        userId,
        periodStart: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { netRevenue: true },
    });

    // Total songs
    const songsCount = await prisma.statementItem.groupBy({
      by: ['workTitle'],
      where: { userId },
    });

    res.json({
      totalEarnings: totalEarnings._sum.netRevenue || 0,
      yearToDate: ytdEarnings._sum.netRevenue || 0,
      lastMonth: lastMonthEarnings._sum.netRevenue || 0,
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
 * WRITERS SEE: Net revenue (after commissions)
 */
router.get('/songs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = '50', offset = '0' } = req.query;

    const songs = await prisma.statementItem.groupBy({
      by: ['workTitle'],
      where: { userId },
      _sum: {
        netRevenue: true,
        performances: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          netRevenue: 'desc',
        },
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const formattedSongs = songs.map((song) => ({
      title: song.workTitle,
      totalRevenue: song._sum.netRevenue || 0,
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
 * WRITERS SEE: Net revenue (after commissions)
 */
router.get('/timeline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { months = '12' } = req.query;

    // Get statement items with period info - NET revenue for writers
    const items = await prisma.statementItem.findMany({
      where: { userId },
      select: {
        netRevenue: true,
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
      monthlyData.set(monthKey, current + Number(item.netRevenue));
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
 * ADMIN SEES: BOTH gross and net revenue, plus commission breakdown
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
      revenueStats,
      uniqueWorks,
      recentStatements,
      proBreakdown,
      monthlyRevenue,
      commissionBreakdown
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

      // Revenue stats: gross, net, and commissions
      prisma.statementItem.aggregate({
        _sum: {
          revenue: true,  // Gross revenue (before commission)
          netRevenue: true,  // Net revenue (after commission)
          commissionAmount: true  // Total commissions
        }
      }),

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
          totalNet: true,
          totalCommission: true,
          uploadDate: true,
        },
      }),

      // PRO breakdown
      prisma.statement.groupBy({
        by: ['proType'],
        _count: true,
        _sum: {
          totalRevenue: true,
          totalNet: true,
          totalCommission: true
        }
      }),

      // Monthly revenue (last 12 months)
      prisma.statementItem.findMany({
        select: {
          revenue: true,
          netRevenue: true,
          commissionAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Commission breakdown by recipient
      prisma.statementItem.groupBy({
        by: ['commissionRecipient'],
        _sum: {
          commissionAmount: true
        },
        where: {
          commissionRecipient: { not: null }
        }
      })
    ]);

    // Process monthly revenue data - track gross, net, and commission
    const monthlyGross = new Map<string, number>();
    const monthlyNet = new Map<string, number>();
    const monthlyCommission = new Map<string, number>();
    const now = new Date();

    // Initialize last 12 months with zero
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyGross.set(key, 0);
      monthlyNet.set(key, 0);
      monthlyCommission.set(key, 0);
    }

    // Aggregate actual revenue
    monthlyRevenue.forEach((item) => {
      const date = item.createdAt;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyGross.has(key)) {
        monthlyGross.set(key, (monthlyGross.get(key) || 0) + Number(item.revenue));
        monthlyNet.set(key, (monthlyNet.get(key) || 0) + Number(item.netRevenue));
        monthlyCommission.set(key, (monthlyCommission.get(key) || 0) + Number(item.commissionAmount));
      }
    });

    const revenueTimeline = Array.from(monthlyGross.entries()).map(([month, gross]) => ({
      month,
      revenue: Number(gross.toFixed(2)), // Gross for chart compatibility
      grossRevenue: Number(gross.toFixed(2)),
      netRevenue: Number((monthlyNet.get(month) || 0).toFixed(2)),
      commission: Number((monthlyCommission.get(month) || 0).toFixed(2))
    }));

    res.json({
      totalWriters,
      totalStatements,
      processedStatements,

      // Revenue breakdown: gross, net, and commissions
      totalRevenue: revenueStats._sum.revenue || 0,  // Gross
      totalNet: revenueStats._sum.netRevenue || 0,  // Net (what writers receive)
      totalCommission: revenueStats._sum.commissionAmount || 0,  // Total commissions

      uniqueWorks: uniqueWorks.length,
      recentStatements,

      // PRO breakdown with gross, net, and commission
      proBreakdown: proBreakdown.map(p => ({
        proType: p.proType,
        count: p._count,
        revenue: Number(p._sum.totalRevenue || 0),  // Gross
        netRevenue: Number(p._sum.totalNet || 0),  // Net
        commission: Number(p._sum.totalCommission || 0)  // Commission
      })),

      // Commission breakdown by recipient
      commissionsByRecipient: commissionBreakdown.map(c => ({
        recipient: c.commissionRecipient || 'Unknown',
        totalCommission: Number(c._sum.commissionAmount || 0)
      })),

      revenueTimeline,

      // Statement breakdown by PRO
      statementsByPRO: proBreakdown.map(p => ({
        proType: p.proType,
        count: p._count
      }))
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
