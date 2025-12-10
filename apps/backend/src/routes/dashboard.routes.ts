import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Smart rounding for currency values
 * Uses 2 decimals normally, but preserves 4 decimals for micro-amounts
 */
const smartRound = (value: number): number => {
  const rounded2 = Math.round(value * 100) / 100;
  // If rounding to 2 decimals gives 0 but value is actually > 0, use 4 decimals
  if (rounded2 === 0 && value > 0) {
    return Math.round(value * 10000) / 10000;
  }
  return rounded2;
};

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
    // Only show paid/visible items
    const totalEarnings = await prisma.statementItem.aggregate({
      where: {
        userId,
        isVisibleToWriter: true // Only show paid statements
      },
      _sum: { netRevenue: true, performances: true },
    });

    // Year-to-date earnings - NET
    const ytdEarnings = await prisma.statementItem.aggregate({
      where: {
        userId,
        isVisibleToWriter: true, // Only show paid statements
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
        isVisibleToWriter: true, // Only show paid statements
        periodStart: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { netRevenue: true },
    });

    // Total songs
    const songsCount = await prisma.statementItem.groupBy({
      by: ['workTitle'],
      where: {
        userId,
        isVisibleToWriter: true // Only show paid statements
      },
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
      where: {
        userId,
        isVisibleToWriter: true // Only show paid statements
      },
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
    // Only show paid/visible items
    const items = await prisma.statementItem.findMany({
      where: {
        userId,
        isVisibleToWriter: true // Only show paid statements
      },
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
 * Calculate percentage change between current and previous values
 * Returns null when percentage is not meaningful to display
 */
function calculatePercentageChange(
  current: number,
  previous: number,
  isRevenue: boolean = false
): { percentageChange: number | null; trend: 'up' | 'down' | 'stable' | null } {
  // Rule 1: If current is 0, never show percentage for revenue
  if (isRevenue && current === 0) {
    return { percentageChange: null, trend: null };
  }

  // Rule 2: If both are 0, no meaningful comparison
  if (current === 0 && previous === 0) {
    return { percentageChange: null, trend: null };
  }

  // Rule 3: If previous is 0 but current > 0
  if (previous === 0 && current > 0) {
    // For revenue: don't show (infinite growth not meaningful)
    if (isRevenue) {
      return { percentageChange: null, trend: null };
    }
    // For counts: cap at +999% to indicate significant growth
    return { percentageChange: 999, trend: 'up' };
  }

  // Rule 4: Normal calculation
  const change = ((current - previous) / previous) * 100;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

  // Round to 1 decimal place
  return {
    percentageChange: Math.round(change * 10) / 10,
    trend
  };
}

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

    // Define current and previous period for month-over-month comparison
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month

    const [
      totalWriters,
      totalStatements,
      processedStatements,
      revenueStats,
      uniqueWorks,
      recentStatements,
      proBreakdown,
      monthlyRevenue,
      commissionBreakdown,
      prevTotalWriters,
      prevProcessedStatements,
      prevRevenueStats,
      prevUniqueWorks
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

      // Revenue stats: gross, net, and commissions (PAID statements only)
      // Use statement-level totals for consistency with Statement History display
      prisma.statement.aggregate({
        where: {
          paymentStatus: 'PAID',
          status: 'PUBLISHED'
        },
        _sum: {
          totalRevenue: true,      // Gross revenue (before commission)
          totalNet: true,          // Net revenue (after commission)
          totalCommission: true    // Total commissions
        }
      }),

      // Unique works (songs) from PAID statements only
      prisma.statementItem.groupBy({
        by: ['workTitle'],
        where: {
          statement: {
            paymentStatus: 'PAID'
          }
        }
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

      // PRO breakdown (PAID statements only)
      prisma.statement.groupBy({
        by: ['proType'],
        where: {
          paymentStatus: 'PAID'
        },
        _count: true,
        _sum: {
          totalRevenue: true,
          totalNet: true,
          totalCommission: true
        }
      }),

      // Monthly revenue (last 12 months) from PAID statements only
      prisma.statementItem.findMany({
        where: {
          statement: {
            paymentStatus: 'PAID'
          }
        },
        select: {
          revenue: true,
          netRevenue: true,
          commissionAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Commission breakdown by recipient (PAID statements only)
      prisma.statementItem.groupBy({
        by: ['commissionRecipient'],
        where: {
          statement: {
            paymentStatus: 'PAID'
          },
          commissionRecipient: { not: null }
        },
        _sum: {
          commissionAmount: true
        }
      }),

      // PREVIOUS PERIOD DATA (for month-over-month comparison)

      // Previous month: Total writers count
      prisma.user.count({
        where: {
          role: 'WRITER',
          createdAt: { lte: previousMonthEnd }
        }
      }),

      // Previous month: Processed statements count
      prisma.statement.count({
        where: {
          status: { in: ['PROCESSED', 'PUBLISHED'] },
          paymentStatus: 'PAID',
          createdAt: {
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        }
      }),

      // Previous month: Revenue stats
      prisma.statementItem.aggregate({
        where: {
          statement: {
            paymentStatus: 'PAID',
            createdAt: {
              gte: previousMonthStart,
              lte: previousMonthEnd
            }
          }
        },
        _sum: {
          revenue: true
        }
      }),

      // Previous month: Unique works
      prisma.statementItem.groupBy({
        by: ['workTitle'],
        where: {
          statement: {
            paymentStatus: 'PAID',
            createdAt: {
              gte: previousMonthStart,
              lte: previousMonthEnd
            }
          }
        }
      })
    ]);

    // Process monthly revenue data - track gross, net, and commission
    const monthlyGross = new Map<string, number>();
    const monthlyNet = new Map<string, number>();
    const monthlyCommission = new Map<string, number>();

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
      revenue: smartRound(gross), // Gross for chart compatibility
      grossRevenue: smartRound(gross),
      netRevenue: smartRound(monthlyNet.get(month) || 0),
      commission: smartRound(monthlyCommission.get(month) || 0)
    }));

    // Calculate month-over-month percentage changes
    const revenueComparison = calculatePercentageChange(
      Number(revenueStats._sum.totalRevenue || 0),
      Number(prevRevenueStats._sum.revenue || 0),
      true // isRevenue
    );

    const writersComparison = calculatePercentageChange(
      totalWriters,
      prevTotalWriters,
      false
    );

    const statementsComparison = calculatePercentageChange(
      processedStatements,
      prevProcessedStatements,
      false
    );

    const worksComparison = calculatePercentageChange(
      uniqueWorks.length,
      prevUniqueWorks.length,
      false
    );

    res.json({
      totalWriters,
      totalWritersChange: writersComparison.percentageChange,
      totalWritersTrend: writersComparison.trend,

      totalStatements,
      processedStatements,
      processedStatementsChange: statementsComparison.percentageChange,
      processedStatementsTrend: statementsComparison.trend,

      // Revenue breakdown: gross, net, and commissions (from statement totals)
      totalRevenue: Number(revenueStats._sum.totalRevenue || 0),  // Gross
      totalRevenueChange: revenueComparison.percentageChange,
      totalRevenueTrend: revenueComparison.trend,
      totalNet: Number(revenueStats._sum.totalNet || 0),  // Net (what writers receive)
      totalCommission: Number(revenueStats._sum.totalCommission || 0),  // Total commissions

      uniqueWorks: uniqueWorks.length,
      uniqueWorksChange: worksComparison.percentageChange,
      uniqueWorksTrend: worksComparison.trend,
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

/**
 * GET /api/dashboard/payment-status
 * Get payment status for writer (red/yellow/green indicator)
 * WRITERS ONLY: Shows when they last got paid and if payments are pending
 */
router.get('/payment-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Only available for writers
    if (req.user!.role !== 'WRITER') {
      return res.status(403).json({ error: 'Writer access required' });
    }

    // Get all statement items for this writer
    const items = await prisma.statementItem.findMany({
      where: { userId },
      select: {
        paidAt: true,
        isVisibleToWriter: true,
        netRevenue: true,
        statement: {
          select: {
            paymentStatus: true,
            publishedAt: true
          }
        }
      },
      orderBy: { paidAt: 'desc' }
    });

    if (items.length === 0) {
      // No statements at all
      return res.json({
        status: 'NONE',
        message: 'No royalty statements yet',
        lastPaymentDate: null,
        unpaidCount: 0,
        pendingCount: 0,
        unpaidAmount: 0,
        pendingAmount: 0
      });
    }

    // Find most recent payment
    const paidItems = items.filter(item => item.isVisibleToWriter && item.paidAt);
    const lastPaidItem = paidItems[0]; // Already sorted by paidAt desc

    // Count unpaid/pending statements and calculate amounts
    const unpaidItems = items.filter(
      item => item.statement.paymentStatus === 'UNPAID' && item.isVisibleToWriter
    );
    const unpaidCount = unpaidItems.length;
    const unpaidAmount = unpaidItems.reduce((sum, item) => sum + Number(item.netRevenue), 0);

    const pendingItems = items.filter(
      item => item.statement.paymentStatus === 'PENDING' && item.isVisibleToWriter
    );
    const pendingCount = pendingItems.length;
    const pendingAmount = pendingItems.reduce((sum, item) => sum + Number(item.netRevenue), 0);

    // Determine status
    let status: 'NONE' | 'PENDING' | 'RECENT';
    let message: string;

    if (!lastPaidItem) {
      // Never been paid
      if (pendingCount > 0) {
        status = 'PENDING';
        message = `${pendingCount} payment${pendingCount > 1 ? 's' : ''} pending`;
      } else if (unpaidCount > 0) {
        status = 'PENDING';
        message = `${unpaidCount} statement${unpaidCount > 1 ? 's' : ''} awaiting payment`;
      } else {
        status = 'NONE';
        message = 'No payments yet';
      }
    } else {
      // Has been paid before - check how recent
      const daysSincePayment = Math.floor(
        (Date.now() - lastPaidItem.paidAt!.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSincePayment <= 30) {
        status = 'RECENT';
        message = daysSincePayment === 0
          ? 'Payment received today'
          : `Last payment ${daysSincePayment} day${daysSincePayment > 1 ? 's' : ''} ago`;
      } else if (pendingCount > 0 || unpaidCount > 0) {
        status = 'PENDING';
        message = `${pendingCount + unpaidCount} statement${pendingCount + unpaidCount > 1 ? 's' : ''} awaiting payment`;
      } else {
        status = 'RECENT';
        message = `Last payment ${daysSincePayment} days ago`;
      }
    }

    res.json({
      status,
      message,
      lastPaymentDate: lastPaidItem?.paidAt || null,
      unpaidCount,
      pendingCount,
      unpaidAmount,
      pendingAmount
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

/**
 * GET /api/dashboard/platform-breakdown
 * Get revenue breakdown by platform (DSP) - extracted from MLC statements
 * Returns revenue grouped by YouTube, Spotify, Apple Music, etc.
 */
router.get('/platform-breakdown', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get all PAID statement items with metadata
    const items = await prisma.statementItem.findMany({
      where: {
        statement: {
          paymentStatus: 'PAID'
        }
      },
      select: {
        revenue: true,
        netRevenue: true,
        commissionAmount: true,
        metadata: true
      }
    });

    // Group by DSP name from metadata
    const platformMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      commissionAmount: number;
      count: number;
      offerings: Set<string>;
      offeringRevenue: Map<string, { revenue: number; count: number }>;
    }>();

    // Also aggregate by service type (offering) globally
    const serviceTypeMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      count: number;
    }>();

    items.forEach((item) => {
      const metadata = item.metadata as any;
      const dspName = metadata?.dspName || 'Unknown';
      const consumerOffering = metadata?.consumerOffering || 'Unknown';

      // Platform aggregation
      if (!platformMap.has(dspName)) {
        platformMap.set(dspName, {
          revenue: 0,
          netRevenue: 0,
          commissionAmount: 0,
          count: 0,
          offerings: new Set(),
          offeringRevenue: new Map()
        });
      }

      const platform = platformMap.get(dspName)!;
      platform.revenue += Number(item.revenue);
      platform.netRevenue += Number(item.netRevenue);
      platform.commissionAmount += Number(item.commissionAmount);
      platform.count += 1;

      if (consumerOffering) {
        platform.offerings.add(consumerOffering);

        // Track revenue per offering for this platform
        if (!platform.offeringRevenue.has(consumerOffering)) {
          platform.offeringRevenue.set(consumerOffering, { revenue: 0, count: 0 });
        }
        const offeringData = platform.offeringRevenue.get(consumerOffering)!;
        offeringData.revenue += Number(item.revenue);
        offeringData.count += 1;
      }

      // Service type (offering) global aggregation
      if (!serviceTypeMap.has(consumerOffering)) {
        serviceTypeMap.set(consumerOffering, { revenue: 0, netRevenue: 0, count: 0 });
      }
      const serviceType = serviceTypeMap.get(consumerOffering)!;
      serviceType.revenue += Number(item.revenue);
      serviceType.netRevenue += Number(item.netRevenue);
      serviceType.count += 1;
    });

    // Convert platforms to array and sort by revenue
    const breakdown = Array.from(platformMap.entries())
      .map(([platform, data]) => ({
        platform,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        commissionAmount: smartRound(data.commissionAmount),
        count: data.count,
        offerings: Array.from(data.offerings).sort(),
        offeringBreakdown: Array.from(data.offeringRevenue.entries())
          .map(([offering, stats]) => ({
            offering,
            revenue: smartRound(stats.revenue),
            count: stats.count
          }))
          .sort((a, b) => b.revenue - a.revenue)
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Convert service types to array and sort by revenue
    const serviceTypeBreakdown = Array.from(serviceTypeMap.entries())
      .map(([serviceType, data]) => ({
        serviceType,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        count: data.count
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = smartRound(breakdown.reduce((sum, p) => sum + p.revenue, 0));
    const totalNetRevenue = smartRound(breakdown.reduce((sum, p) => sum + p.netRevenue, 0));

    res.json({
      platforms: breakdown,
      serviceTypes: serviceTypeBreakdown,
      totalRevenue,
      totalNetRevenue,
      totalCount: items.length
    });
  } catch (error) {
    console.error('Platform breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch platform breakdown' });
  }
});

/**
 * GET /api/dashboard/organization-breakdown
 * Get revenue breakdown by organization (PRO type)
 * Returns revenue grouped by MLC, BMI, ASCAP, SESAC, GMR, etc.
 */
router.get('/organization-breakdown', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Group statements by PRO type
    const breakdown = await prisma.statement.groupBy({
      by: ['proType'],
      where: {
        paymentStatus: 'PAID'
      },
      _count: true,
      _sum: {
        totalRevenue: true,
        totalNet: true,
        totalCommission: true
      }
    });

    // Format response
    const organizations = breakdown.map((org) => ({
      organization: org.proType,
      revenue: Number(org._sum.totalRevenue || 0),
      netRevenue: Number(org._sum.totalNet || 0),
      commissionAmount: Number(org._sum.totalCommission || 0),
      count: org._count
    })).sort((a, b) => b.revenue - a.revenue);

    res.json({
      organizations,
      totalRevenue: smartRound(organizations.reduce((sum, o) => sum + o.revenue, 0)),
      totalCount: organizations.reduce((sum, o) => sum + o.count, 0)
    });
  } catch (error) {
    console.error('Organization breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch organization breakdown' });
  }
});

/**
 * GET /api/dashboard/territory-breakdown
 * Get revenue breakdown by territory/country
 * Returns aggregated revenue data for world heatmap visualization
 */
router.get('/territory-breakdown', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    // Get all statement items with territory data
    const items = await prisma.statementItem.findMany({
      where: isAdmin ? {} : {
        userId,
        isVisibleToWriter: true
      },
      select: {
        metadata: true,
        revenue: true,
        commissionAmount: true
      }
    });

    // Aggregate revenue by territory
    const territoryMap = new Map<string, { revenue: number, count: number }>();

    items.forEach(item => {
      const metadata = item.metadata as any;
      const territory = metadata?.territory;

      if (territory && typeof territory === 'string') {
        const normalizedTerritory = territory.trim().toUpperCase();
        const grossRevenue = Number(item.revenue || 0);
        const netRevenue = grossRevenue - Number(item.commissionAmount || 0);
        const revenue = isAdmin ? grossRevenue : netRevenue;

        if (territoryMap.has(normalizedTerritory)) {
          const existing = territoryMap.get(normalizedTerritory)!;
          existing.revenue += revenue;
          existing.count += 1;
        } else {
          territoryMap.set(normalizedTerritory, {
            revenue,
            count: 1
          });
        }
      }
    });

    // Convert to array format for frontend
    const territories = Array.from(territoryMap.entries()).map(([territory, data]) => ({
      territory,
      revenue: smartRound(data.revenue),
      count: data.count
    })).sort((a, b) => b.revenue - a.revenue);

    res.json({
      territories,
      totalRevenue: smartRound(territories.reduce((sum, t) => sum + t.revenue, 0)),
      totalCount: territories.reduce((sum, t) => sum + t.count, 0)
    });
  } catch (error) {
    console.error('Territory breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch territory breakdown' });
  }
});

/**
 * GET /api/dashboard/mlc-analytics
 * Comprehensive MLC-specific analytics with detailed breakdowns
 * Returns data optimized for advanced chart visualizations
 */
router.get('/mlc-analytics', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get all MLC statement items with full metadata
    const items = await prisma.statementItem.findMany({
      where: {
        statement: {
          proType: 'MLC',
          paymentStatus: 'PAID'
        }
      },
      select: {
        id: true,
        workTitle: true,
        revenue: true,
        netRevenue: true,
        commissionAmount: true,
        performances: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
        metadata: true,
        statement: {
          select: {
            id: true,
            statementPeriod: true,
            uploadDate: true,
            periodStart: true,
            periodEnd: true
          }
        }
      }
    });

    // Get MLC statement totals
    const mlcStatements = await prisma.statement.findMany({
      where: {
        proType: 'MLC',
        paymentStatus: 'PAID'
      },
      select: {
        id: true,
        filename: true,
        totalRevenue: true,
        totalNet: true,
        totalCommission: true,
        statementPeriod: true,
        periodStart: true,
        periodEnd: true,
        uploadDate: true,
        _count: {
          select: { items: true }
        }
      },
      orderBy: { uploadDate: 'desc' }
    });

    // Platform breakdown with detailed service type analysis
    const platformMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      count: number;
      avgPerItem: number;
      serviceTypes: Map<string, { revenue: number; count: number }>;
    }>();

    // Service type breakdown
    const serviceTypeMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      count: number;
      platforms: Set<string>;
    }>();

    // Monthly revenue timeline
    const monthlyMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      count: number;
      platforms: number;
    }>();

    // Top songs analysis
    const songMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      performances: number;
      platforms: Set<string>;
      serviceTypes: Set<string>;
    }>();

    // Territory breakdown for MLC
    const territoryMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      count: number;
    }>();

    // Use type analysis (streaming vs download vs other)
    const useTypeMap = new Map<string, {
      revenue: number;
      count: number;
    }>();

    items.forEach((item) => {
      const metadata = item.metadata as any;
      const dspName = metadata?.dspName || 'Unknown';
      const consumerOffering = metadata?.consumerOffering || 'Unknown';
      const territory = metadata?.usageTerritory || metadata?.territoryOfDistribution || 'Unknown';
      const useType = metadata?.useType || metadata?.consumerType || 'Unknown';
      const revenue = Number(item.revenue) || 0;
      const netRevenue = Number(item.netRevenue) || 0;
      const performances = Number(item.performances) || 0;

      // Platform aggregation
      if (!platformMap.has(dspName)) {
        platformMap.set(dspName, {
          revenue: 0,
          netRevenue: 0,
          count: 0,
          avgPerItem: 0,
          serviceTypes: new Map()
        });
      }
      const platform = platformMap.get(dspName)!;
      platform.revenue += revenue;
      platform.netRevenue += netRevenue;
      platform.count += 1;

      if (!platform.serviceTypes.has(consumerOffering)) {
        platform.serviceTypes.set(consumerOffering, { revenue: 0, count: 0 });
      }
      const st = platform.serviceTypes.get(consumerOffering)!;
      st.revenue += revenue;
      st.count += 1;

      // Service type aggregation
      if (!serviceTypeMap.has(consumerOffering)) {
        serviceTypeMap.set(consumerOffering, {
          revenue: 0,
          netRevenue: 0,
          count: 0,
          platforms: new Set()
        });
      }
      const serviceType = serviceTypeMap.get(consumerOffering)!;
      serviceType.revenue += revenue;
      serviceType.netRevenue += netRevenue;
      serviceType.count += 1;
      serviceType.platforms.add(dspName);

      // Monthly timeline - use usage period from metadata for accurate timeline
      // MLC statements have usagePeriodStart which is the actual usage month
      let timelineDate: Date;
      if (metadata?.usagePeriodStart) {
        // Parse the usage period start date from metadata
        timelineDate = new Date(metadata.usagePeriodStart);
      } else if (metadata?.usagePeriodEnd) {
        timelineDate = new Date(metadata.usagePeriodEnd);
      } else {
        // Fallback to item period or created date
        timelineDate = item.periodStart || item.createdAt;
      }

      // Validate the date is reasonable (not NaN and within expected range)
      if (isNaN(timelineDate.getTime()) || timelineDate.getFullYear() < 2000) {
        timelineDate = item.periodStart || item.createdAt;
      }

      const monthKey = `${timelineDate.getFullYear()}-${String(timelineDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { revenue: 0, netRevenue: 0, count: 0, platforms: 0 });
      }
      const month = monthlyMap.get(monthKey)!;
      month.revenue += revenue;
      month.netRevenue += netRevenue;
      month.count += 1;

      // Song aggregation
      if (item.workTitle) {
        if (!songMap.has(item.workTitle)) {
          songMap.set(item.workTitle, {
            revenue: 0,
            netRevenue: 0,
            performances: 0,
            platforms: new Set(),
            serviceTypes: new Set()
          });
        }
        const song = songMap.get(item.workTitle)!;
        song.revenue += revenue;
        song.netRevenue += netRevenue;
        song.performances += performances;
        song.platforms.add(dspName);
        song.serviceTypes.add(consumerOffering);
      }

      // Territory aggregation
      if (territory && territory !== 'Unknown') {
        if (!territoryMap.has(territory)) {
          territoryMap.set(territory, { revenue: 0, netRevenue: 0, count: 0 });
        }
        const terr = territoryMap.get(territory)!;
        terr.revenue += revenue;
        terr.netRevenue += netRevenue;
        terr.count += 1;
      }

      // Use type aggregation
      if (!useTypeMap.has(useType)) {
        useTypeMap.set(useType, { revenue: 0, count: 0 });
      }
      const ut = useTypeMap.get(useType)!;
      ut.revenue += revenue;
      ut.count += 1;
    });

    // Format platform data with nested service types
    const platforms = Array.from(platformMap.entries())
      .map(([name, data]) => ({
        name,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        count: data.count,
        avgPerItem: smartRound(data.revenue / data.count),
        margin: smartRound(((data.revenue - data.netRevenue) / data.revenue) * 100),
        serviceTypes: Array.from(data.serviceTypes.entries())
          .map(([type, stats]) => ({
            type,
            revenue: smartRound(stats.revenue),
            count: stats.count,
            percentage: smartRound((stats.revenue / data.revenue) * 100)
          }))
          .sort((a, b) => b.revenue - a.revenue)
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Format service type data
    const serviceTypes = Array.from(serviceTypeMap.entries())
      .map(([name, data]) => ({
        name,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        count: data.count,
        platformCount: data.platforms.size,
        avgPerItem: smartRound(data.revenue / data.count)
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Format monthly timeline
    const timeline = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        count: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Format top songs (top 20)
    const topSongs = Array.from(songMap.entries())
      .map(([title, data]) => ({
        title,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        performances: data.performances,
        platformCount: data.platforms.size,
        serviceTypeCount: data.serviceTypes.size
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    // Format territories (top 15)
    const territories = Array.from(territoryMap.entries())
      .map(([territory, data]) => ({
        territory,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        count: data.count
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    // Format use types
    const useTypes = Array.from(useTypeMap.entries())
      .map(([type, data]) => ({
        type,
        revenue: smartRound(data.revenue),
        count: data.count
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate totals and KPIs
    const totalRevenue = smartRound(items.reduce((sum, i) => sum + Number(i.revenue), 0));
    const totalNetRevenue = smartRound(items.reduce((sum, i) => sum + Number(i.netRevenue), 0));
    const totalCommission = smartRound(items.reduce((sum, i) => sum + Number(i.commissionAmount), 0));
    const avgRevenuePerItem = smartRound(totalRevenue / items.length);
    const marginPercentage = smartRound(((totalRevenue - totalNetRevenue) / totalRevenue) * 100);

    // Statement summary
    const statementSummary = mlcStatements.map(s => ({
      id: s.id,
      filename: s.filename,
      period: s.statementPeriod,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      uploadDate: s.uploadDate,
      revenue: Number(s.totalRevenue),
      netRevenue: Number(s.totalNet),
      commission: Number(s.totalCommission),
      itemCount: s._count.items
    }));

    res.json({
      // KPIs
      kpis: {
        totalRevenue,
        totalNetRevenue,
        totalCommission,
        totalItems: items.length,
        totalStatements: mlcStatements.length,
        uniqueSongs: songMap.size,
        uniquePlatforms: platformMap.size,
        avgRevenuePerItem,
        marginPercentage
      },
      // Chart data
      platforms,
      serviceTypes,
      timeline,
      topSongs,
      territories,
      useTypes,
      // Statement details
      statements: statementSummary
    });
  } catch (error) {
    console.error('MLC Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch MLC analytics' });
  }
});

/**
 * GET /api/dashboard/bmi-analytics
 * Comprehensive BMI-specific analytics with detailed breakdowns
 * Returns territory, performance source, and quarter analysis
 */
router.get('/bmi-analytics', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get all BMI statement items with full metadata
    const items = await prisma.statementItem.findMany({
      where: {
        statement: {
          proType: 'BMI',
          paymentStatus: 'PAID'
        }
      },
      select: {
        id: true,
        workTitle: true,
        revenue: true,
        netRevenue: true,
        commissionAmount: true,
        performances: true,
        createdAt: true,
        metadata: true,
        statement: {
          select: {
            id: true,
            statementPeriod: true,
            uploadDate: true
          }
        }
      }
    });

    // Get BMI statement totals
    const bmiStatements = await prisma.statement.findMany({
      where: {
        proType: 'BMI',
        paymentStatus: 'PAID'
      },
      select: {
        id: true,
        filename: true,
        totalRevenue: true,
        totalNet: true,
        totalCommission: true,
        statementPeriod: true,
        uploadDate: true,
        metadata: true,
        _count: {
          select: { items: true }
        }
      },
      orderBy: { uploadDate: 'desc' }
    });

    // Territory breakdown
    const territoryMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      count: number;
      performances: number;
    }>();

    // Country of Performance breakdown (more specific than territory)
    const countryMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      count: number;
      performances: number;
    }>();

    // Performance Source breakdown (radio, TV, streaming, etc.)
    const perfSourceMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      count: number;
      performances: number;
    }>();

    // Quarter/Period timeline
    const quarterMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      count: number;
      performances: number;
    }>();

    // Top songs analysis
    const songMap = new Map<string, {
      revenue: number;
      netRevenue: number;
      performances: number;
      territories: Set<string>;
      perfSources: Set<string>;
    }>();

    items.forEach((item) => {
      const metadata = item.metadata as any;
      const territory = metadata?.territory || 'Unknown';
      const countryOfPerformance = metadata?.countryOfPerformance || territory || 'Unknown';
      const perfSource = metadata?.perfSource || 'Unknown';
      const quarter = metadata?.quarter || 'Unknown';
      const revenue = Number(item.revenue) || 0;
      const netRevenue = Number(item.netRevenue) || 0;
      const performances = Number(item.performances) || 0;

      // Territory aggregation
      if (territory && territory !== 'Unknown') {
        if (!territoryMap.has(territory)) {
          territoryMap.set(territory, { revenue: 0, netRevenue: 0, count: 0, performances: 0 });
        }
        const terr = territoryMap.get(territory)!;
        terr.revenue += revenue;
        terr.netRevenue += netRevenue;
        terr.count += 1;
        terr.performances += performances;
      }

      // Country of Performance aggregation
      if (countryOfPerformance && countryOfPerformance !== 'Unknown') {
        if (!countryMap.has(countryOfPerformance)) {
          countryMap.set(countryOfPerformance, { revenue: 0, netRevenue: 0, count: 0, performances: 0 });
        }
        const country = countryMap.get(countryOfPerformance)!;
        country.revenue += revenue;
        country.netRevenue += netRevenue;
        country.count += 1;
        country.performances += performances;
      }

      // Performance Source aggregation
      if (perfSource && perfSource !== 'Unknown') {
        if (!perfSourceMap.has(perfSource)) {
          perfSourceMap.set(perfSource, { revenue: 0, netRevenue: 0, count: 0, performances: 0 });
        }
        const source = perfSourceMap.get(perfSource)!;
        source.revenue += revenue;
        source.netRevenue += netRevenue;
        source.count += 1;
        source.performances += performances;
      }

      // Quarter/Period timeline
      if (quarter && quarter !== 'Unknown') {
        if (!quarterMap.has(quarter)) {
          quarterMap.set(quarter, { revenue: 0, netRevenue: 0, count: 0, performances: 0 });
        }
        const q = quarterMap.get(quarter)!;
        q.revenue += revenue;
        q.netRevenue += netRevenue;
        q.count += 1;
        q.performances += performances;
      }

      // Song aggregation
      if (item.workTitle) {
        if (!songMap.has(item.workTitle)) {
          songMap.set(item.workTitle, {
            revenue: 0,
            netRevenue: 0,
            performances: 0,
            territories: new Set(),
            perfSources: new Set()
          });
        }
        const song = songMap.get(item.workTitle)!;
        song.revenue += revenue;
        song.netRevenue += netRevenue;
        song.performances += performances;
        if (territory && territory !== 'Unknown') song.territories.add(territory);
        if (perfSource && perfSource !== 'Unknown') song.perfSources.add(perfSource);
      }
    });

    // Format territory data
    const territories = Array.from(territoryMap.entries())
      .map(([territory, data]) => ({
        territory,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        count: data.count,
        performances: data.performances
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Format country data
    const countries = Array.from(countryMap.entries())
      .map(([country, data]) => ({
        country,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        count: data.count,
        performances: data.performances
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Format performance source data
    const perfSources = Array.from(perfSourceMap.entries())
      .map(([source, data]) => ({
        source,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        count: data.count,
        performances: data.performances,
        avgPerItem: smartRound(data.revenue / data.count)
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Format quarter timeline
    const timeline = Array.from(quarterMap.entries())
      .map(([quarter, data]) => ({
        quarter,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        count: data.count,
        performances: data.performances
      }))
      .sort((a, b) => a.quarter.localeCompare(b.quarter));

    // Format top songs (top 20)
    const topSongs = Array.from(songMap.entries())
      .map(([title, data]) => ({
        title,
        revenue: smartRound(data.revenue),
        netRevenue: smartRound(data.netRevenue),
        performances: data.performances,
        territoryCount: data.territories.size,
        perfSourceCount: data.perfSources.size
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    // Calculate totals and KPIs
    const totalRevenue = smartRound(items.reduce((sum, i) => sum + Number(i.revenue), 0));
    const totalNetRevenue = smartRound(items.reduce((sum, i) => sum + Number(i.netRevenue), 0));
    const totalCommission = smartRound(items.reduce((sum, i) => sum + Number(i.commissionAmount), 0));
    const totalPerformances = items.reduce((sum, i) => sum + Number(i.performances), 0);
    const avgRevenuePerItem = items.length > 0 ? smartRound(totalRevenue / items.length) : 0;
    const marginPercentage = totalRevenue > 0 ? smartRound(((totalRevenue - totalNetRevenue) / totalRevenue) * 100) : 0;

    // Statement summary
    const statementSummary = bmiStatements.map(s => {
      const statementMeta = s.metadata as any;
      return {
        id: s.id,
        filename: s.filename,
        period: s.statementPeriod,
        uploadDate: s.uploadDate,
        revenue: Number(s.totalRevenue),
        netRevenue: Number(s.totalNet),
        commission: Number(s.totalCommission),
        itemCount: s._count.items,
        // Include analytics summary from statement metadata if available
        analytics: statementMeta?.analytics || null
      };
    });

    res.json({
      // KPIs
      kpis: {
        totalRevenue,
        totalNetRevenue,
        totalCommission,
        totalPerformances,
        totalItems: items.length,
        totalStatements: bmiStatements.length,
        uniqueSongs: songMap.size,
        uniqueTerritories: territoryMap.size,
        uniqueCountries: countryMap.size,
        uniquePerfSources: perfSourceMap.size,
        avgRevenuePerItem,
        marginPercentage
      },
      // Chart data
      territories,
      countries,
      perfSources,
      timeline,
      topSongs,
      // Statement details
      statements: statementSummary
    });
  } catch (error) {
    console.error('BMI Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch BMI analytics' });
  }
});

export default router;
