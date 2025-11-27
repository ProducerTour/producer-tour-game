import { Router, Response } from 'express';
import { Prisma } from '../generated/client';
import { z } from 'zod';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { StatementParserFactory } from '../parsers';
import { UploadedFile } from 'express-fileupload';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../lib/prisma';
import {
  generatePaymentCSV,
  generateStatementSummaryCSV,
  generateQuickBooksCSV,
  formatExportDate,
  type PaymentExportRow,
  type StatementExportSummary
} from '../utils/export-generator';
import { emailService } from '../services/email.service';
import { stripeService } from '../services/stripe.service';
import * as gamificationService from '../services/gamification.service';

const router = Router();

/**
 * POST /api/statements/upload
 * Upload and parse statement file (Admin only)
 */
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      // Check if file was uploaded
      if (!req.files || !req.files.statement) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const uploadedFile = req.files.statement as UploadedFile;

      // Validate file type (CSV or TSV for MLC)
      const fileName = uploadedFile.name.toLowerCase();
      const mimeType = uploadedFile.mimetype.toLowerCase();

      const isCSV = fileName.endsWith('.csv') || mimeType.includes('csv');
      const isTSV = fileName.endsWith('.tsv') || fileName.endsWith('.txt') ||
                    mimeType.includes('tab-separated') || mimeType.includes('tsv') ||
                    mimeType === 'text/plain'; // TSV files often report as text/plain

      console.log('File upload:', { fileName, mimeType, isCSV, isTSV });

      if (!isCSV && !isTSV) {
        return res.status(400).json({
          error: `Only CSV or TSV files are allowed. Received: ${fileName} (${mimeType})`
        });
      }

      const { proType } = req.body;
      if (!proType || !['BMI', 'ASCAP', 'SESAC', 'MLC'].includes(proType)) {
        return res.status(400).json({ error: 'Invalid PRO type' });
      }

      // Create upload directory
      const uploadDir = path.join(__dirname, '../../uploads/statements');
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = 'statement-' + uniqueSuffix + path.extname(uploadedFile.name);
      const filePath = path.join(uploadDir, filename);

      // Save file to disk
      await uploadedFile.mv(filePath);

      // Read file content
      const csvContent = await fs.readFile(filePath, 'utf-8');

      // Parse statement
      const parseResult = await StatementParserFactory.parse(
        proType,
        csvContent,
        uploadedFile.name
      );

      // Create statement record with parsed items stored in metadata
      const metadataPayload = {
        ...parseResult.metadata,
        parsedItems: parseResult.items.map((item) => ({
          ...item,
          metadata: item.metadata ?? {},
        })),
        songs: Array.from(parseResult.songs.values()),
        warnings: parseResult.warnings,
      } as unknown as Prisma.InputJsonValue;

      const statement = await prisma.statement.create({
        data: {
          proType,
          filename: uploadedFile.name,
          filePath: filePath,
          status: 'UPLOADED', // Changed to UPLOADED - needs writer assignment before PROCESSED
          totalRevenue: parseResult.totalRevenue,
          totalPerformances: parseResult.totalPerformances,
          metadata: metadataPayload,
        },
      });

      res.json({
        statement,
        parseResult: {
          songCount: parseResult.songCount,
          totalRevenue: parseResult.totalRevenue,
          totalPerformances: parseResult.totalPerformances,
          itemCount: parseResult.items.length,
          songs: Array.from(parseResult.songs.values()),
          warnings: parseResult.warnings,
        },
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  }
);

/**
 * GET /api/statements
 * Get all statements (filtered by role)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, proType, limit = '50', offset = '0' } = req.query;
    const userId = req.user!.id;
    const isWriter = req.user!.role === 'WRITER';

    const where: any = {};
    if (status) where.status = status;
    if (proType) where.proType = proType;

    // Writers only see published statements
    if (isWriter) {
      where.status = 'PUBLISHED';
    }

    const statements = await prisma.statement.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { uploadDate: 'desc' },
      include: {
        publishedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { items: true } },
        ...(isWriter && {
          items: {
            where: { userId, isVisibleToWriter: true },
            select: {
              netRevenue: true,
              performances: true,
            }
          }
        })
      },
    });

    // Process statements based on role
    const statementsWithCount = statements.map(statement => {
      const base = {
        ...statement,
        itemCount: statement._count.items,
      };

      // For writers, override totalRevenue and totalPerformances with their specific amounts
      if (isWriter && statement.items) {
        const writerRevenue = statement.items.reduce((sum, item) => sum + Number(item.netRevenue), 0);
        const writerPerformances = statement.items.reduce((sum, item) => sum + Number(item.performances), 0);

        return {
          ...base,
          totalRevenue: writerRevenue,
          totalPerformances: writerPerformances,
          itemCount: statement.items.length, // Show only their items count
          items: undefined, // Remove items from response
        };
      }

      return base;
    });

    const total = await prisma.statement.count({ where });

    res.json({ statements: statementsWithCount, total });
  } catch (error) {
    console.error('Get statements error:', error);
    res.status(500).json({ error: 'Failed to fetch statements' });
  }
});

/**
 * GET /api/statements/unpaid
 * Get all statements ready for payment processing (Admin only)
 * Returns statements with UNPAID or PENDING status
 */
router.get(
  '/unpaid',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      console.log('🔍 Royalty Portal: Querying unpaid statements...');

      // First, check total statement counts
      const totalStatements = await prisma.statement.count();
      const publishedStatements = await prisma.statement.count({ where: { status: 'PUBLISHED' } });
      const unpaidCount = await prisma.statement.count({
        where: {
          status: 'PUBLISHED',
          paymentStatus: { in: ['UNPAID', 'PENDING'] }
        }
      });

      console.log('📊 Statement counts:', {
        total: totalStatements,
        published: publishedStatements,
        unpaid: unpaidCount
      });

      const unpaidStatements = await prisma.statement.findMany({
        where: {
          status: 'PUBLISHED',
          paymentStatus: { in: ['UNPAID', 'PENDING'] }
        },
        include: {
          items: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  middleName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { publishedAt: 'desc' }
      });

      // Group items by writer for each statement
      const formatted = unpaidStatements.map(statement => {
        // Group items by writer - calculate from metadata for full precision
        const writerMap = new Map();
        const metadata = statement.metadata as any;
        const parsedItems = metadata?.parsedItems || [];
        const assignments = metadata?.writerAssignments || {};

        // Get commission rates from existing StatementItems (or use defaults)
        const commissionRates = new Map();
        statement.items.forEach(item => {
          commissionRates.set(item.userId, Number(item.commissionRate) || 0);
        });

        // Calculate totals from metadata (full precision)
        parsedItems.forEach((item: any) => {
          // Construct composite key for MLC
          let assignmentKey = item.workTitle;
          if (metadata.pro === 'MLC') {
            const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
            const dspName = item.metadata?.dspName || 'none';
            assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
          }

          const songAssignments = assignments[assignmentKey] || [];

          songAssignments.forEach((assignment: any) => {
            const userId = assignment.userId;

            // Initialize writer entry if needed
            if (!writerMap.has(userId)) {
              // Find user info from StatementItems
              const userItem = statement.items.find(i => i.userId === userId);
              writerMap.set(userId, {
                userId: userId,
                name: userItem ? `${userItem.user.firstName || ''} ${userItem.user.middleName ? userItem.user.middleName + ' ' : ''}${userItem.user.lastName || ''}`.trim() || userItem.user.email : 'Unknown',
                email: userItem?.user.email || '',
                grossRevenue: 0,
                commissionAmount: 0,
                netRevenue: 0,
                songCount: 0,
                uniqueSongs: new Set()
              });
            }

            const writer = writerMap.get(userId);

            // Calculate with FULL precision from metadata
            const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
            const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
            const commissionRate = commissionRates.get(userId) || 0;
            const commission = (writerRevenue * commissionRate) / 100;

            writer.grossRevenue += writerRevenue;
            writer.commissionAmount += commission;
            writer.uniqueSongs.add(item.workTitle);
          });
        });

        // Round totals AFTER summing all rows for accuracy
        // Use smart rounding: 2 decimals normally, but preserve precision for micro-amounts
        const smartRound = (value: number): number => {
          const rounded2 = Math.round(value * 100) / 100;
          // If rounding to 2 decimals gives 0 but value is actually > 0, use 4 decimals
          if (rounded2 === 0 && value > 0) {
            return Math.round(value * 10000) / 10000;
          }
          return rounded2;
        };

        for (const writer of writerMap.values()) {
          writer.songCount = writer.uniqueSongs.size;
          delete writer.uniqueSongs;
          writer.grossRevenue = smartRound(writer.grossRevenue);
          writer.commissionAmount = smartRound(writer.commissionAmount);
          writer.netRevenue = smartRound(writer.grossRevenue - writer.commissionAmount);
        }

        return {
          id: statement.id,
          proType: statement.proType,
          filename: statement.filename,
          publishedAt: statement.publishedAt,
          paymentStatus: statement.paymentStatus,
          totalRevenue: Number(statement.totalRevenue),
          totalCommission: Number(statement.totalCommission),
          totalNet: Number(statement.totalNet),
          writerCount: writerMap.size,
          writers: Array.from(writerMap.values())
        };
      });

      console.log('✅ Returning unpaid statements:', {
        count: formatted.length,
        statements: formatted.map(s => ({
          id: s.id,
          proType: s.proType,
          filename: s.filename,
          writerCount: s.writerCount,
          totalGross: s.writers.reduce((sum, w) => sum + w.grossRevenue, 0)
        }))
      });

      res.json(formatted);
    } catch (error) {
      console.error('Get unpaid statements error:', error);
      res.status(500).json({ error: 'Failed to fetch unpaid statements' });
    }
  }
);

/**
 * GET /api/statements/export/unpaid-summary
 * Export summary of all unpaid statements as CSV (Admin only)
 * NOTE: This route MUST come before /:id route to avoid matching "export" as an ID
 */
router.get(
  '/export/unpaid-summary',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const unpaidStatements = await prisma.statement.findMany({
        where: {
          status: 'PUBLISHED',
          paymentStatus: { in: ['UNPAID', 'PENDING'] }
        },
        include: {
          items: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  middleName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { publishedAt: 'desc' }
      });

      const summaries: StatementExportSummary[] = unpaidStatements.map(statement => {
        const metadata = statement.metadata as any;
        const parsedItems = metadata?.parsedItems || [];
        const assignments = metadata?.writerAssignments || {};

        // Count unique writers
        const writerIds = new Set<string>();
        Object.values(assignments).forEach((assignmentList: any) => {
          if (Array.isArray(assignmentList)) {
            assignmentList.forEach((a: any) => {
              if (a.userId) writerIds.add(a.userId);
            });
          }
        });

        return {
          statementId: statement.id,
          proType: statement.proType,
          filename: statement.filename,
          publishedDate: formatExportDate(statement.publishedAt),
          paymentDate: formatExportDate(statement.paymentProcessedAt),
          totalWriters: writerIds.size,
          totalSongs: statement.items.length,
          totalGrossRevenue: Number(statement.totalRevenue),
          totalCommission: Number(statement.totalCommission),
          totalNetPayments: Number(statement.totalNet),
          paymentStatus: statement.paymentStatus
        };
      });

      const csv = generateStatementSummaryCSV(summaries);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="unpaid-statements-summary-${formatExportDate(new Date())}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Export unpaid summary error:', error);
      res.status(500).json({ error: 'Failed to export unpaid summary' });
    }
  }
);

/**
 * GET /api/statements/my/:id/items
 * Get writer's detailed items (songs) for a specific statement
 * Writers can see their assigned songs with revenue breakdown
 */
router.get('/my/:id/items', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isWriter = req.user!.role === 'WRITER';

    // Only writers can access this endpoint
    if (!isWriter) {
      return res.status(403).json({ error: 'This endpoint is for writers only' });
    }

    // Get the statement with writer's items
    const statement = await prisma.statement.findUnique({
      where: { id },
      select: {
        id: true,
        proType: true,
        status: true,
        statementPeriod: true,
        periodStart: true,
        periodEnd: true,
        uploadDate: true,
        items: {
          where: {
            userId,
            isVisibleToWriter: true
          },
          select: {
            id: true,
            workTitle: true,
            revenue: true,
            netRevenue: true,
            commissionAmount: true,
            commissionRate: true,
            performances: true,
            splitPercentage: true,
            metadata: true
          },
          orderBy: { netRevenue: 'desc' }
        }
      }
    });

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    // Only allow access to published statements
    if (statement.status !== 'PUBLISHED') {
      return res.status(403).json({ error: 'Statement is not yet available' });
    }

    // Calculate totals
    const totalGross = statement.items.reduce((sum, item) => sum + Number(item.revenue), 0);
    const totalNet = statement.items.reduce((sum, item) => sum + Number(item.netRevenue), 0);
    const totalCommission = statement.items.reduce((sum, item) => sum + Number(item.commissionAmount), 0);
    const totalPerformances = statement.items.reduce((sum, item) => sum + Number(item.performances), 0);

    // Format items for response
    const formattedItems = statement.items.map(item => ({
      id: item.id,
      workTitle: item.workTitle,
      grossRevenue: Number(item.revenue),
      netRevenue: Number(item.netRevenue),
      commission: Number(item.commissionAmount),
      commissionRate: Number(item.commissionRate),
      performances: Number(item.performances),
      splitPercentage: Number(item.splitPercentage),
      // Include relevant metadata for analytics (territory, etc.)
      territory: (item.metadata as any)?.territory || null,
      perfSource: (item.metadata as any)?.perfSource || null,
      countryOfPerformance: (item.metadata as any)?.countryOfPerformance || null
    }));

    res.json({
      statement: {
        id: statement.id,
        proType: statement.proType,
        period: statement.statementPeriod,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        uploadDate: statement.uploadDate
      },
      items: formattedItems,
      totals: {
        grossRevenue: totalGross,
        netRevenue: totalNet,
        commission: totalCommission,
        performances: totalPerformances,
        songCount: statement.items.length
      }
    });
  } catch (error) {
    console.error('Get writer statement items error:', error);
    res.status(500).json({ error: 'Failed to fetch statement items' });
  }
});

/**
 * GET /api/statements/my/:id/export
 * Export writer's statement items as CSV
 * Allows writers to download their earnings breakdown
 */
router.get('/my/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isWriter = req.user!.role === 'WRITER';

    // Only writers can access this endpoint
    if (!isWriter) {
      return res.status(403).json({ error: 'This endpoint is for writers only' });
    }

    // Get writer info for the filename
    const writer = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });

    // Get the statement with writer's items
    const statement = await prisma.statement.findUnique({
      where: { id },
      select: {
        id: true,
        proType: true,
        status: true,
        statementPeriod: true,
        periodStart: true,
        periodEnd: true,
        items: {
          where: {
            userId,
            isVisibleToWriter: true
          },
          select: {
            workTitle: true,
            revenue: true,
            netRevenue: true,
            commissionAmount: true,
            commissionRate: true,
            performances: true,
            splitPercentage: true,
            metadata: true
          },
          orderBy: { netRevenue: 'desc' }
        }
      }
    });

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    // Only allow access to published statements
    if (statement.status !== 'PUBLISHED') {
      return res.status(403).json({ error: 'Statement is not yet available' });
    }

    // Calculate totals
    const totalGross = statement.items.reduce((sum, item) => sum + Number(item.revenue), 0);
    const totalNet = statement.items.reduce((sum, item) => sum + Number(item.netRevenue), 0);
    const totalCommission = statement.items.reduce((sum, item) => sum + Number(item.commissionAmount), 0);
    const totalPerformances = statement.items.reduce((sum, item) => sum + Number(item.performances), 0);

    // Build CSV content
    const headers = [
      'Song Title',
      'Gross Revenue',
      'Commission Rate (%)',
      'Commission Amount',
      'Net Revenue',
      'Performances',
      'Split (%)',
      'Territory',
      'Performance Source'
    ];

    const rows = statement.items.map(item => {
      const metadata = item.metadata as any;
      return [
        `"${(item.workTitle || '').replace(/"/g, '""')}"`,
        Number(item.revenue).toFixed(4),
        Number(item.commissionRate).toFixed(2),
        Number(item.commissionAmount).toFixed(4),
        Number(item.netRevenue).toFixed(4),
        Number(item.performances),
        Number(item.splitPercentage).toFixed(2),
        `"${(metadata?.territory || metadata?.countryOfPerformance || '').replace(/"/g, '""')}"`,
        `"${(metadata?.perfSource || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    // Add totals row
    rows.push(''); // Empty row
    rows.push([
      '"TOTALS"',
      totalGross.toFixed(4),
      '',
      totalCommission.toFixed(4),
      totalNet.toFixed(4),
      totalPerformances,
      '',
      '',
      ''
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    // Generate filename
    const writerName = writer ? `${writer.firstName || ''}_${writer.lastName || ''}`.replace(/\s+/g, '_') : 'writer';
    const periodStr = statement.statementPeriod || formatExportDate(new Date());
    const filename = `${statement.proType}_Statement_${writerName}_${periodStr}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Export writer statement error:', error);
    res.status(500).json({ error: 'Failed to export statement' });
  }
});

/**
 * GET /api/statements/:id
 * Get statement details
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const statement = await prisma.statement.findUnique({
      where: { id },
      include: {
        items: req.user!.role === 'WRITER'
          ? { where: { userId: req.user!.id } }
          : true,
        publishedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    // Award points for viewing statement (only for writers, once per statement)
    if (req.user!.role === 'WRITER') {
      try {
        // Check if user already viewed this statement
        const existingView = await prisma.gamificationEvent.findFirst({
          where: {
            userId: req.user!.id,
            eventType: 'STATEMENT_VIEWED',
            metadata: {
              path: ['statementId'],
              equals: id
            }
          }
        });

        if (!existingView) {
          await gamificationService.awardPoints(
            req.user!.id,
            'STATEMENT_VIEWED',
            10,
            `Viewed statement: ${statement.filename || id}`,
            { statementId: id }
          );
        }
      } catch (gamError) {
        console.error('Gamification statement view error:', gamError);
      }
    }

    res.json(statement);
  } catch (error) {
    console.error('Get statement error:', error);
    res.status(500).json({ error: 'Failed to fetch statement' });
  }
});

/**
 * POST /api/statements/:id/assign-writers
 * Assign writers to statement items (Admin only)
 * Body: { assignments: { [songTitle]: userId } }
 */
router.post(
  '/:id/assign-writers',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { assignments } = req.body; // { "Song Title": "userId123", ... }

      if (!assignments || typeof assignments !== 'object') {
        return res.status(400).json({ error: 'Invalid assignments format' });
      }

      const statement = await prisma.statement.findUnique({ where: { id } });
      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      // Store assignments in metadata
      const updatedStatement = await prisma.statement.update({
        where: { id },
        data: {
          status: 'PROCESSED', // Mark as processed after assignments
          metadata: {
            ...(statement.metadata as any),
            writerAssignments: assignments,
          },
        },
      });

      res.json(updatedStatement);
    } catch (error) {
      console.error('Assign writers error:', error);
      res.status(500).json({ error: 'Failed to assign writers' });
    }
  }
);

/**
 * POST /api/statements/:id/publish
 * Publish statement to writers - creates StatementItems (Admin only)
 */
router.post(
  '/:id/publish',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({ where: { id } });
      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      const metadata = statement.metadata as any;
      const parsedItems = metadata.parsedItems || [];
      const assignments = metadata.writerAssignments || {};

      // Validate that all items have writers assigned
      const unassignedSongs = parsedItems.filter((item: any) => {
        // For MLC: construct composite key to match frontend format
        let assignmentKey = item.workTitle;

        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }

        const songAssignments = assignments[assignmentKey];
        return !songAssignments || !Array.isArray(songAssignments) || songAssignments.length === 0;
      });

      if (unassignedSongs.length > 0) {
        return res.status(400).json({
          error: 'Not all songs have writers assigned',
          unassignedSongs: unassignedSongs.slice(0, 5).map((item: any) => item.workTitle), // Show first 5 titles
        });
      }

      // Fetch current active commission settings (defaults to 0% if none)
      const activeCommission = await prisma.commissionSettings.findFirst({
        where: { isActive: true },
        orderBy: { effectiveDate: 'desc' },
      });

      const globalCommissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;
      const commissionRecipient = activeCommission?.recipientName || 'Producer Tour';

      // Collect all assigned userIds to check for per-writer overrides
      const assignedUserIds = new Set<string>();
      parsedItems.forEach((item: any) => {
        const songAssignments = assignments[item.workTitle] || [];
        songAssignments.forEach((assignment: any) => {
          if (assignment.userId) assignedUserIds.add(assignment.userId);
        });
      });

      const overrideUsers = (await prisma.user.findMany({
        where: { id: { in: Array.from(assignedUserIds) } },
      })) as any[];
      const overrideMap = new Map<string, number>();
      overrideUsers.forEach((u: any) => {
        if (u.commissionOverrideRate !== null && u.commissionOverrideRate !== undefined) {
          overrideMap.set(u.id, Number(u.commissionOverrideRate));
        }
      });

      // Create StatementItems with assigned writers and apply commission
      // Note: One song can have multiple writers with different splits
      // Using batch inserts to prevent database connection pool exhaustion
      const itemsToCreate: any[] = [];
      let totalCommission = 0;
      let totalNet = 0;

      parsedItems.forEach((item: any) => {
        // For MLC: construct composite key to match frontend format
        let assignmentKey = item.workTitle;

        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }

        const songAssignments = assignments[assignmentKey] || [];

        // Create one StatementItem per writer assignment
        songAssignments.forEach((assignment: any) => {
          // Calculate this writer's revenue share based on split percentage
          const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
          const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
          const commissionRateToUse = overrideMap.get(assignment.userId) ?? globalCommissionRate;
          const itemCommissionAmount = (writerRevenue * commissionRateToUse) / 100;
          const itemNetRevenue = writerRevenue - itemCommissionAmount;

          totalCommission += itemCommissionAmount;
          totalNet += itemNetRevenue;

          itemsToCreate.push({
            statementId: id,
            userId: assignment.userId,
            workTitle: item.workTitle,
            revenue: writerRevenue,
            performances: item.performances,
            splitPercentage: splitPercentage,
            writerIpiNumber: assignment.writerIpiNumber || null,
            commissionRate: commissionRateToUse,
            commissionAmount: itemCommissionAmount,
            commissionRecipient: commissionRecipient,
            netRevenue: itemNetRevenue,
            isVisibleToWriter: false, // Hidden until payment processed
            metadata: {
              ...item.metadata,
              originalTotalRevenue: parseFloat(item.revenue), // Store original total before split
              publisherIpiNumber: assignment.publisherIpiNumber || null, // Store publisher IPI in metadata
            },
          });
        });
      });

      // Use transaction with batched createMany to prevent connection pool exhaustion
      // Process in batches of 500 to handle very large statements
      const BATCH_SIZE = 500;
      await prisma.$transaction(async (tx) => {
        // Insert items in batches
        for (let i = 0; i < itemsToCreate.length; i += BATCH_SIZE) {
          const batch = itemsToCreate.slice(i, i + BATCH_SIZE);
          await tx.statementItem.createMany({
            data: batch,
          });
        }

        // Update statement status
        await tx.statement.update({
          where: { id },
          data: {
            status: 'PUBLISHED',
            paymentStatus: 'UNPAID', // Mark as unpaid until admin processes payment
            publishedAt: new Date(),
            publishedById: req.user!.id,
            totalCommission: totalCommission,
            totalNet: totalNet,
          },
        });
      }, {
        timeout: 120000, // 2 minute timeout for large statements
      });

      const updatedStatement = await prisma.statement.findUnique({
        where: { id },
        include: {
          _count: { select: { items: true } },
        },
      });

      res.json(updatedStatement);
    } catch (error) {
      console.error('Publish statement error:', error);
      res.status(500).json({ error: 'Failed to publish statement' });
    }
  }
);

/**
 * POST /api/statements/:id/republish
 * Re-publish unpaid statement to recalculate StatementItems with new precision (Admin only)
 */
router.post(
  '/:id/republish',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      // Only allow republishing unpaid statements
      if (statement.paymentStatus === 'PAID') {
        return res.status(400).json({
          error: 'Cannot republish paid statement. Payment has already been processed.'
        });
      }

      // Delete existing StatementItems
      await prisma.statementItem.deleteMany({
        where: { statementId: id }
      });

      // Recreate StatementItems with new precision from metadata
      const metadata = statement.metadata as any;
      const parsedItems = metadata.parsedItems || [];
      const assignments = metadata.writerAssignments || {};

      // Fetch commission settings
      const activeCommission = await prisma.commissionSettings.findFirst({
        where: { isActive: true },
        orderBy: { effectiveDate: 'desc' },
      });

      const globalCommissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;
      const commissionRecipient = activeCommission?.recipientName || 'Producer Tour';

      // Collect assigned userIds for commission overrides
      const assignedUserIds = new Set<string>();
      parsedItems.forEach((item: any) => {
        let assignmentKey = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }
        const songAssignments = assignments[assignmentKey] || [];
        songAssignments.forEach((assignment: any) => {
          if (assignment.userId) assignedUserIds.add(assignment.userId);
        });
      });

      const overrideUsers = (await prisma.user.findMany({
        where: { id: { in: Array.from(assignedUserIds) } },
      })) as any[];
      const overrideMap = new Map<string, number>();
      overrideUsers.forEach((u: any) => {
        if (u.commissionOverrideRate !== null && u.commissionOverrideRate !== undefined) {
          overrideMap.set(u.id, Number(u.commissionOverrideRate));
        }
      });

      // Create StatementItems with new precision using batch inserts
      const itemsToCreate: any[] = [];
      let totalCommission = 0;
      let totalNet = 0;

      parsedItems.forEach((item: any) => {
        // For MLC: construct composite key
        let assignmentKey = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }

        const songAssignments = assignments[assignmentKey] || [];

        songAssignments.forEach((assignment: any) => {
          const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
          const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
          const commissionRateToUse = overrideMap.get(assignment.userId) ?? globalCommissionRate;
          const itemCommissionAmount = (writerRevenue * commissionRateToUse) / 100;
          const itemNetRevenue = writerRevenue - itemCommissionAmount;

          totalCommission += itemCommissionAmount;
          totalNet += itemNetRevenue;

          itemsToCreate.push({
            statementId: id,
            userId: assignment.userId,
            workTitle: item.workTitle,
            revenue: writerRevenue,
            performances: item.performances,
            splitPercentage: splitPercentage,
            writerIpiNumber: assignment.writerIpiNumber || null,
            commissionRate: commissionRateToUse,
            commissionAmount: itemCommissionAmount,
            commissionRecipient: commissionRecipient,
            netRevenue: itemNetRevenue,
            isVisibleToWriter: false,
            metadata: {
              ...item.metadata,
              originalTotalRevenue: parseFloat(item.revenue),
              publisherIpiNumber: assignment.publisherIpiNumber || null,
            },
          });
        });
      });

      // Use transaction with batched createMany to prevent connection pool exhaustion
      const BATCH_SIZE = 500;
      await prisma.$transaction(async (tx) => {
        // Insert items in batches
        for (let i = 0; i < itemsToCreate.length; i += BATCH_SIZE) {
          const batch = itemsToCreate.slice(i, i + BATCH_SIZE);
          await tx.statementItem.createMany({
            data: batch,
          });
        }

        // Update statement totals
        await tx.statement.update({
          where: { id },
          data: {
            totalCommission: totalCommission,
            totalNet: totalNet,
          },
        });
      }, {
        timeout: 120000, // 2 minute timeout for large statements
      });

      const updatedStatement = await prisma.statement.findUnique({
        where: { id },
        include: {
          _count: { select: { items: true } },
        },
      });

      res.json({
        message: 'Statement republished successfully with updated precision',
        itemsRecreated: itemsToCreate.length,
        statement: updatedStatement
      });
    } catch (error) {
      console.error('Republish statement error:', error);
      res.status(500).json({ error: 'Failed to republish statement' });
    }
  }
);

/**
 * DELETE /api/statements/:id
 * Delete statement (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({ where: { id } });
      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      // Delete file
      if (statement.filePath) {
        await fs.unlink(statement.filePath).catch(() => {});
      }

      // Delete from database (cascade deletes items)
      await prisma.statement.delete({ where: { id } });

      res.json({ message: 'Statement deleted successfully' });
    } catch (error) {
      console.error('Delete statement error:', error);
      res.status(500).json({ error: 'Failed to delete statement' });
    }
  }
);

/**
 * GET /api/statements/:id/payment-summary
 * Get detailed payment breakdown for a statement (Admin only)
 */
router.get(
  '/:id/payment-summary',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  middleName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      // Group by writer - calculate from metadata for full precision
      const writerMap = new Map();
      const metadata = statement.metadata as any;
      const parsedItems = metadata?.parsedItems || [];
      const assignments = metadata?.writerAssignments || {};

      // Get commission rates from existing StatementItems
      const commissionRates = new Map();
      statement.items.forEach(item => {
        commissionRates.set(item.userId, Number(item.commissionRate) || 0);
      });

      // Calculate totals from metadata (full precision)
      parsedItems.forEach((item: any) => {
        // Construct composite key for MLC
        let assignmentKey = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }

        const songAssignments = assignments[assignmentKey] || [];

        songAssignments.forEach((assignment: any) => {
          const userId = assignment.userId;

          // Initialize writer entry if needed
          if (!writerMap.has(userId)) {
            // Find user info from StatementItems
            const userItem = statement.items.find(i => i.userId === userId);
            writerMap.set(userId, {
              userId: userId,
              name: userItem ? `${userItem.user.firstName || ''} ${userItem.user.middleName ? userItem.user.middleName + ' ' : ''}${userItem.user.lastName || ''}`.trim() || userItem.user.email : 'Unknown',
              email: userItem?.user.email || '',
              grossRevenue: 0,
              commissionAmount: 0,
              netRevenue: 0,
              songCount: 0,
              uniqueSongs: new Set()
            });
          }

          const writer = writerMap.get(userId);

          // Calculate with FULL precision from metadata
          const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
          const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
          const commissionRate = commissionRates.get(userId) || 0;
          const commission = (writerRevenue * commissionRate) / 100;

          writer.grossRevenue += writerRevenue;
          writer.commissionAmount += commission;
          writer.uniqueSongs.add(item.workTitle);
        });
      });

      // Round totals AFTER summing all rows for accuracy
      // Use smart rounding: 2 decimals normally, but preserve precision for micro-amounts
      const smartRound = (value: number): number => {
        const rounded2 = Math.round(value * 100) / 100;
        // If rounding to 2 decimals gives 0 but value is actually > 0, use 4 decimals
        if (rounded2 === 0 && value > 0) {
          return Math.round(value * 10000) / 10000;
        }
        return rounded2;
      };

      for (const writer of writerMap.values()) {
        writer.songCount = writer.uniqueSongs.size;
        delete writer.uniqueSongs;
        writer.grossRevenue = smartRound(writer.grossRevenue);
        writer.commissionAmount = smartRound(writer.commissionAmount);
        writer.netRevenue = smartRound(writer.grossRevenue - writer.commissionAmount);
      }

      const summary = {
        statement: {
          id: statement.id,
          proType: statement.proType,
          filename: statement.filename,
          publishedAt: statement.publishedAt,
          paymentStatus: statement.paymentStatus
        },
        totals: {
          grossRevenue: Number(statement.totalRevenue),
          commissionToProducerTour: Number(statement.totalCommission),
          netToWriters: Number(statement.totalNet),
          songCount: statement.items.length
        },
        writers: Array.from(writerMap.values())
      };

      res.json(summary);
    } catch (error) {
      console.error('Get payment summary error:', error);
      res.status(500).json({ error: 'Failed to fetch payment summary' });
    }
  }
);

/**
 * POST /api/statements/:id/queue-payment
 * Queue statement for payment - makes visible to writers but keeps as UNPAID (Admin only)
 */
router.post(
  '/:id/queue-payment',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      if (statement.status !== 'PUBLISHED') {
        return res.status(400).json({ error: 'Statement must be published first' });
      }

      if (statement.paymentStatus === 'PAID') {
        return res.status(400).json({ error: 'Statement already paid' });
      }

      // Make items visible to writers without marking as paid
      await prisma.statementItem.updateMany({
        where: { statementId: id },
        data: {
          isVisibleToWriter: true
        }
      });

      // Keep statement as UNPAID so it shows in payment queue
      const updatedStatement = await prisma.statement.update({
        where: { id },
        data: {
          paymentStatus: 'UNPAID'
        },
        include: {
          _count: { select: { items: true } }
        }
      });

      res.json({
        success: true,
        message: 'Statement queued for payment. Writers can now see their earnings.',
        statement: updatedStatement
      });
    } catch (error) {
      console.error('Queue payment error:', error);
      res.status(500).json({ error: 'Failed to queue payment' });
    }
  }
);

/**
 * POST /api/statements/:id/process-payment
 * Actually process payment via Stripe and mark as PAID (Admin only)
 * Used from Payouts tab
 */
router.post(
  '/:id/process-payment',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Verify statement exists and is unpaid
      const statement = await prisma.statement.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  middleName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      if (statement.paymentStatus === 'PAID') {
        return res.status(400).json({ error: 'Statement already paid' });
      }

      // Check if statement has items to process
      if (!statement.items || statement.items.length === 0) {
        return res.status(400).json({
          error: 'Statement has no items to process. Please ensure the statement has been published with writer assignments.'
        });
      }

      // NOTE: Stripe transfers are NO LONGER created here
      // Instead, transfers are created when writers request withdrawals and admins approve them
      // This allows writers to accumulate earnings and withdraw when they choose
      console.log(`📝 Processing payment for statement ${id} with ${statement.items.length} items`);

      // Process payment in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get unique user IDs from items
        const userIds = [...new Set(statement.items.map(item => item.userId))];
        console.log(`📝 Processing for ${userIds.length} unique writers`);

        // Batch fetch all active commission reduction redemptions (instead of individual queries)
        const activeRedemptions = await tx.rewardRedemption.findMany({
          where: {
            userId: { in: userIds },
            isActive: true,
            status: 'APPROVED',
            expiresAt: { gte: new Date() },
            reward: {
              type: 'COMMISSION_REDUCTION'
            }
          },
          include: {
            reward: true
          },
          orderBy: { redeemedAt: 'desc' }
        });

        // Build commission reductions map from batch result
        const commissionReductions = new Map<string, { reductionPercent: number; redemptionId: string }>();
        for (const redemption of activeRedemptions) {
          // Only use first (most recent) redemption per user
          if (commissionReductions.has(redemption.userId)) continue;

          if (redemption.reward.details) {
            const data = redemption.reward.details as any;
            const reductionPercent = data.commissionReduction || data.reductionPercent || 0;
            if (reductionPercent > 0) {
              commissionReductions.set(redemption.userId, {
                reductionPercent,
                redemptionId: redemption.id
              });
            }
          }
        }

        // Update statement
        const updatedStatement = await tx.statement.update({
          where: { id },
          data: {
            paymentStatus: 'PAID',
            paymentProcessedAt: new Date(),
            paymentProcessedById: req.user!.id
          }
        });

        // Make all items visible to writers
        await tx.statementItem.updateMany({
          where: { statementId: id },
          data: {
            isVisibleToWriter: true,
            paidAt: new Date()
          }
        });

        // Update writer balances - add net revenue to their available balance
        // Group by writer and sum their net revenue (with commission reductions applied)
        const writerBalanceUpdates = new Map<string, number>();
        const appliedReductions = new Set<string>();

        for (const item of statement.items) {
          let netRevenue = Number(item.netRevenue);
          const userId = item.userId;

          // Apply commission reduction if available
          if (commissionReductions.has(userId)) {
            const { reductionPercent, redemptionId } = commissionReductions.get(userId)!;
            const commissionAmount = Number(item.commissionAmount);
            const commissionRefund = (commissionAmount * reductionPercent) / 100;
            netRevenue += commissionRefund;
            appliedReductions.add(redemptionId);

            console.log(`💰 Applied ${reductionPercent}% commission reduction for user ${userId}: +$${commissionRefund.toFixed(2)}`);
          }

          const currentTotal = writerBalanceUpdates.get(userId) || 0;
          writerBalanceUpdates.set(userId, currentTotal + netRevenue);
        }

        // Update each writer's balance - process in batches of 10 for controlled parallelism
        const writerEntries = Array.from(writerBalanceUpdates.entries());
        const WRITER_BATCH_SIZE = 10;
        for (let i = 0; i < writerEntries.length; i += WRITER_BATCH_SIZE) {
          const batch = writerEntries.slice(i, i + WRITER_BATCH_SIZE);
          await Promise.all(
            batch.map(([userId, netAmount]) =>
              tx.user.update({
                where: { id: userId },
                data: {
                  availableBalance: { increment: netAmount },
                  lifetimeEarnings: { increment: netAmount }
                }
              })
            )
          );
        }

        // Mark commission reduction redemptions as used - batch update if any
        if (appliedReductions.size > 0) {
          await tx.rewardRedemption.updateMany({
            where: { id: { in: Array.from(appliedReductions) } },
            data: {
              isActive: false,
              appliedToPayoutId: id
            }
          });
        }

        return { updatedStatement, writerBalanceUpdates };
      }, {
        timeout: 120000, // 2 minute timeout for large statements with many writers
        maxWait: 30000,  // 30 second max wait to acquire connection
      });

      // Extract for use in milestone checks
      const writerBalanceUpdatesMap = result.writerBalanceUpdates;

      // Send email notifications to writers (async, don't wait)
      // Get payment summary for each writer
      const metadata = statement.metadata as any;
      const parsedItems = metadata?.parsedItems || [];
      const assignments = metadata?.writerAssignments || {};

      // Calculate per-writer totals
      const writerMap = new Map();
      const commissionRates = new Map();
      statement.items.forEach(item => {
        commissionRates.set(item.userId, Number(item.commissionRate) || 0);
      });

      parsedItems.forEach((item: any) => {
        let assignmentKey = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }

        const songAssignments = assignments[assignmentKey] || [];

        songAssignments.forEach((assignment: any) => {
          const userId = assignment.userId;

          if (!writerMap.has(userId)) {
            const userItem = statement.items.find((i: any) => i.userId === userId);
            writerMap.set(userId, {
              userId: userId,
              name: userItem ? `${userItem.user.firstName || ''} ${userItem.user.middleName ? userItem.user.middleName + ' ' : ''}${userItem.user.lastName || ''}`.trim() || userItem.user.email : 'Unknown',
              email: userItem?.user.email || '',
              grossRevenue: 0,
              commissionAmount: 0,
              songCount: 0,
              uniqueSongs: new Set()
            });
          }

          const writer = writerMap.get(userId);
          const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
          const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
          const commissionRate = commissionRates.get(userId) || 0;
          const commission = (writerRevenue * commissionRate) / 100;

          writer.grossRevenue += writerRevenue;
          writer.commissionAmount += commission;
          writer.uniqueSongs.add(item.workTitle);
        });
      });

      // Send bulk payment notification emails asynchronously (don't block response)
      setImmediate(async () => {
        const notifications = Array.from(writerMap.values()).map(writer => {
          const songCount = writer.uniqueSongs.size;
          const grossRevenue = Math.round(writer.grossRevenue * 100) / 100;
          const commissionAmount = Math.round(writer.commissionAmount * 100) / 100;
          const netPayment = grossRevenue - commissionAmount;
          const commissionRate = commissionRates.get(writer.userId) || 0;

          return {
            userId: writer.userId,
            writerName: writer.name,
            writerEmail: writer.email,
            proType: statement.proType,
            statementFilename: statement.filename,
            grossRevenue,
            commissionRate,
            commissionAmount,
            netPayment,
            songCount,
            paymentDate: formatExportDate(result.updatedStatement.paymentProcessedAt),
          };
        });

        // Send all notifications with delays and retry logic
        await emailService.sendBulkPaymentNotifications(notifications, 1500);
      });

      // Check for revenue milestones asynchronously (don't block response)
      setImmediate(async () => {
        const milestones = [
          { threshold: 1, points: 25, label: '$1 earned' },
          { threshold: 100, points: 100, label: '$100 earned' },
          { threshold: 1000, points: 250, label: '$1,000 earned' },
          { threshold: 10000, points: 500, label: '$10,000 earned' },
        ];

        for (const [userId, netAmount] of writerBalanceUpdatesMap.entries()) {
          try {
            // Get the user's current lifetime earnings (after this payment)
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { lifetimeEarnings: true, role: true }
            });

            if (!user || user.role === 'ADMIN') continue;

            const currentLifetime = Number(user.lifetimeEarnings);
            const previousLifetime = currentLifetime - netAmount;

            // Check each milestone
            for (const milestone of milestones) {
              // Did they cross this milestone with this payment?
              if (previousLifetime < milestone.threshold && currentLifetime >= milestone.threshold) {
                // Check if already awarded this milestone
                const existingAward = await prisma.gamificationEvent.findFirst({
                  where: {
                    userId,
                    eventType: 'REVENUE_MILESTONE',
                    metadata: { path: ['milestone'], equals: milestone.threshold }
                  }
                });

                if (!existingAward) {
                  await gamificationService.awardPoints(
                    userId,
                    'REVENUE_MILESTONE',
                    milestone.points,
                    `Revenue milestone: ${milestone.label}`,
                    { milestone: milestone.threshold, lifetimeEarnings: currentLifetime }
                  );
                  console.log(`🎯 Revenue milestone ${milestone.label} awarded to user ${userId}`);
                }
              }
            }
          } catch (gamError) {
            console.error(`Gamification revenue milestone error for user ${userId}:`, gamError);
          }
        }
      });

      // Return payment confirmation
      res.json({
        success: true,
        statement: {
          id: result.updatedStatement.id,
          paymentStatus: result.updatedStatement.paymentStatus,
          paymentProcessedAt: result.updatedStatement.paymentProcessedAt,
          totalPaidToWriters: Number(statement.totalNet),
          commissionToProducerTour: Number(statement.totalCommission)
        },
        message: 'Statement marked as PAID. Writer balances updated. Stripe transfers will occur when writers request withdrawals.'
      });
    } catch (error: any) {
      console.error('Process payment error:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.slice(0, 500)
      });

      // Return more detailed error for debugging
      res.status(500).json({
        error: 'Failed to process payment',
        details: error?.message || 'Unknown error',
        code: error?.code
      });
    }
  }
);

/**
 * POST /api/statements/:id/smart-assign
 * Smart match writers for statement using fuzzy logic (Admin only)
 * Returns suggestions categorized by confidence level
 */
router.post(
  '/:id/smart-assign',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({
        where: { id },
        include: {
          items: true // Check if already published
        }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      if (statement.status === 'PUBLISHED') {
        return res.status(400).json({
          error: 'Statement already published. Cannot reassign writers.'
        });
      }

      // Extract parsed items from metadata
      const metadata = statement.metadata as any;
      const parsedItems = metadata?.parsedItems || [];

      if (parsedItems.length === 0) {
        return res.status(400).json({
          error: 'No parsed items found in statement. Upload may have failed.'
        });
      }

      // Import the smart matcher utility
      const { smartMatchStatement } = await import('../utils/writer-matcher');

      // Run fuzzy matching on all songs
      // Returns ALL publisher rows (for MLC, same song can appear multiple times with different publishers)
      // Pass proType so BMI/ASCAP/etc. statements only match writers with that PRO affiliation
      const matchResults = await smartMatchStatement(parsedItems, {
        proType: statement.proType as 'BMI' | 'ASCAP' | 'SESAC' | 'GMR' | 'MLC' | 'SOCAN' | 'PRS' | 'OTHER'
      });

      // Categorize matches by confidence
      const autoAssigned: any[] = []; // >90% confidence - can auto-assign
      const suggested: any[] = [];    // 70-90% confidence - needs review
      const unmatched: any[] = [];    // <70% or no match - needs manual assignment

      // Process each publisher row (preserves all rows, even duplicate song titles with different publishers)
      matchResults.forEach((row) => {
        const { workTitle, revenue, performances, metadata, matches } = row;

        // Extract publisher and platform info for display
        const publisherInfo = {
          originalPublisherName: metadata.originalPublisherName || null,
          originalPublisherIpi: metadata.originalPublisherIpi || null,
          dspName: metadata.dspName || null,
          consumerOffering: metadata.consumerOffering || null,
          territory: metadata.territory || null,
          workWriterList: metadata.workWriterList || []
        };

        if (!matches || matches.length === 0) {
          // No matches found
          unmatched.push({
            workTitle,
            revenue,
            performances,
            reason: 'No matching writers found in database',
            publisherInfo
          });
          return;
        }

        // Get high and medium confidence matches
        const highConfidenceMatches = matches.filter(m => m.confidence >= 90);
        const mediumConfidenceMatches = matches.filter(m => m.confidence >= 70 && m.confidence < 90);

        if (highConfidenceMatches.length > 0) {
          // High confidence - auto-assign
          autoAssigned.push({
            workTitle,
            revenue,
            performances,
            publisherInfo,
            writers: highConfidenceMatches.map(match => ({
              writer: {
                id: match.writer.id,
                name: `${match.writer.firstName || ''} ${match.writer.middleName || ''} ${match.writer.lastName || ''}`.trim().replace(/\s+/g, ' ') || match.writer.email,
                email: match.writer.email,
                writerIpiNumber: match.writer.writerIpiNumber,
                publisherIpiNumber: match.writer.publisherIpiNumber
              },
              confidence: match.confidence,
              reason: match.reason
            }))
          });
        } else if (mediumConfidenceMatches.length > 0) {
          // Medium confidence - suggest for review
          suggested.push({
            workTitle,
            revenue,
            performances,
            publisherInfo,
            matches: mediumConfidenceMatches.slice(0, 3).map(m => ({ // Top 3 matches
              writer: {
                id: m.writer.id,
                name: `${m.writer.firstName || ''} ${m.writer.middleName || ''} ${m.writer.lastName || ''}`.trim().replace(/\s+/g, ' ') || m.writer.email,
                email: m.writer.email,
                writerIpiNumber: m.writer.writerIpiNumber,
                publisherIpiNumber: m.writer.publisherIpiNumber
              },
              confidence: m.confidence,
              reason: m.reason
            }))
          });
        } else {
          // Low confidence - manual assignment needed
          const topMatch = matches[0];
          unmatched.push({
            workTitle,
            revenue,
            performances,
            publisherInfo,
            reason: `Low confidence match (${topMatch.confidence}%) - manual review required`
          });
        }
      });

      res.json({
        summary: {
          totalRows: parsedItems.length, // For MLC: publisher rows, not unique songs
          autoAssignedCount: autoAssigned.length,
          suggestedCount: suggested.length,
          unmatchedCount: unmatched.length
        },
        autoAssigned,
        suggested,
        unmatched
      });
    } catch (error) {
      console.error('Smart assign error:', error);
      res.status(500).json({ error: 'Failed to smart assign writers' });
    }
  }
);

/**
 * GET /api/statements/:id/export/csv
 * Export statement payment details as CSV (Admin only)
 */
router.get(
  '/:id/export/csv',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  middleName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      // Group by writer and calculate totals
      const writerMap = new Map();
      const metadata = statement.metadata as any;
      const parsedItems = metadata?.parsedItems || [];
      const assignments = metadata?.writerAssignments || {};

      // Get commission rates
      const commissionRates = new Map();
      statement.items.forEach(item => {
        commissionRates.set(item.userId, Number(item.commissionRate) || 0);
      });

      // Calculate totals from metadata (full precision)
      parsedItems.forEach((item: any) => {
        let assignmentKey = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }

        const songAssignments = assignments[assignmentKey] || [];

        songAssignments.forEach((assignment: any) => {
          const userId = assignment.userId;

          if (!writerMap.has(userId)) {
            const userItem = statement.items.find(i => i.userId === userId);
            writerMap.set(userId, {
              userId: userId,
              name: userItem ? `${userItem.user.firstName || ''} ${userItem.user.middleName ? userItem.user.middleName + ' ' : ''}${userItem.user.lastName || ''}`.trim() || userItem.user.email : 'Unknown',
              email: userItem?.user.email || '',
              grossRevenue: 0,
              commissionAmount: 0,
              netRevenue: 0,
              songCount: 0,
              uniqueSongs: new Set()
            });
          }

          const writer = writerMap.get(userId);
          const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
          const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
          const commissionRate = commissionRates.get(userId) || 0;
          const commission = (writerRevenue * commissionRate) / 100;

          writer.grossRevenue += writerRevenue;
          writer.commissionAmount += commission;
          writer.uniqueSongs.add(item.workTitle);
        });
      });

      // Smart rounding
      const smartRound = (value: number): number => {
        const rounded2 = Math.round(value * 100) / 100;
        if (rounded2 === 0 && value > 0) {
          return Math.round(value * 10000) / 10000;
        }
        return rounded2;
      };

      // Build export rows
      const exportRows: PaymentExportRow[] = [];
      for (const writer of writerMap.values()) {
        writer.songCount = writer.uniqueSongs.size;
        delete writer.uniqueSongs;
        writer.grossRevenue = smartRound(writer.grossRevenue);
        writer.commissionAmount = smartRound(writer.commissionAmount);
        writer.netRevenue = smartRound(writer.grossRevenue - writer.commissionAmount);

        exportRows.push({
          statementId: statement.id,
          proType: statement.proType,
          filename: statement.filename,
          publishedDate: formatExportDate(statement.publishedAt),
          paymentDate: formatExportDate(statement.paymentProcessedAt),
          writerName: writer.name,
          writerEmail: writer.email,
          songCount: writer.songCount,
          grossRevenue: writer.grossRevenue,
          commissionRate: commissionRates.get(writer.userId) || 0,
          commissionAmount: writer.commissionAmount,
          netPayment: writer.netRevenue,
          paymentStatus: statement.paymentStatus
        });
      }

      const csv = generatePaymentCSV(exportRows);

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payment-${statement.proType}-${formatExportDate(statement.publishedAt)}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Export CSV error:', error);
      res.status(500).json({ error: 'Failed to export CSV' });
    }
  }
);

/**
 * GET /api/statements/:id/export/quickbooks
 * Export statement in QuickBooks-compatible format (Admin only)
 */
router.get(
  '/:id/export/quickbooks',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  middleName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      // Group by writer (same logic as CSV export)
      const writerMap = new Map();
      const metadata = statement.metadata as any;
      const parsedItems = metadata?.parsedItems || [];
      const assignments = metadata?.writerAssignments || {};
      const commissionRates = new Map();

      statement.items.forEach(item => {
        commissionRates.set(item.userId, Number(item.commissionRate) || 0);
      });

      parsedItems.forEach((item: any) => {
        let assignmentKey = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }

        const songAssignments = assignments[assignmentKey] || [];

        songAssignments.forEach((assignment: any) => {
          const userId = assignment.userId;

          if (!writerMap.has(userId)) {
            const userItem = statement.items.find(i => i.userId === userId);
            writerMap.set(userId, {
              userId: userId,
              name: userItem ? `${userItem.user.firstName || ''} ${userItem.user.middleName ? userItem.user.middleName + ' ' : ''}${userItem.user.lastName || ''}`.trim() || userItem.user.email : 'Unknown',
              email: userItem?.user.email || '',
              grossRevenue: 0,
              commissionAmount: 0,
              netRevenue: 0,
              songCount: 0,
              uniqueSongs: new Set()
            });
          }

          const writer = writerMap.get(userId);
          const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
          const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
          const commissionRate = commissionRates.get(userId) || 0;
          const commission = (writerRevenue * commissionRate) / 100;

          writer.grossRevenue += writerRevenue;
          writer.commissionAmount += commission;
          writer.uniqueSongs.add(item.workTitle);
        });
      });

      const smartRound = (value: number): number => {
        const rounded2 = Math.round(value * 100) / 100;
        if (rounded2 === 0 && value > 0) {
          return Math.round(value * 10000) / 10000;
        }
        return rounded2;
      };

      const exportRows: PaymentExportRow[] = [];
      for (const writer of writerMap.values()) {
        writer.songCount = writer.uniqueSongs.size;
        delete writer.uniqueSongs;
        writer.grossRevenue = smartRound(writer.grossRevenue);
        writer.commissionAmount = smartRound(writer.commissionAmount);
        writer.netRevenue = smartRound(writer.grossRevenue - writer.commissionAmount);

        exportRows.push({
          statementId: statement.id,
          proType: statement.proType,
          filename: statement.filename,
          publishedDate: formatExportDate(statement.publishedAt),
          paymentDate: formatExportDate(statement.paymentProcessedAt),
          writerName: writer.name,
          writerEmail: writer.email,
          songCount: writer.songCount,
          grossRevenue: writer.grossRevenue,
          commissionRate: commissionRates.get(writer.userId) || 0,
          commissionAmount: writer.commissionAmount,
          netPayment: writer.netRevenue,
          paymentStatus: statement.paymentStatus
        });
      }

      const csv = generateQuickBooksCSV(exportRows);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="quickbooks-${statement.proType}-${formatExportDate(statement.publishedAt)}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Export QuickBooks error:', error);
      res.status(500).json({ error: 'Failed to export QuickBooks format' });
    }
  }
);

/**
 * GET /api/statements/:id/my-export
 * Export writer's own statement data as CSV (Writer only)
 * Writers can only download their own earnings from a statement
 */
router.get(
  '/:id/my-export',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const statement = await prisma.statement.findUnique({
        where: { id },
        include: {
          items: {
            where: {
              userId,
              isVisibleToWriter: true
            },
            orderBy: { workTitle: 'asc' }
          }
        }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      if (statement.status !== 'PUBLISHED') {
        return res.status(400).json({ error: 'Statement not available for download' });
      }

      if (statement.items.length === 0) {
        return res.status(400).json({ error: 'No earnings found for this statement' });
      }

      // Build CSV content for writer's items
      const headers = [
        'Work Title',
        'Revenue',
        'Performances',
        'Split %',
        'Gross Amount',
        'Commission Rate',
        'Commission Amount',
        'Net Amount',
        'Payment Date'
      ];

      const rows = statement.items.map(item => [
        `"${(item.workTitle || '').replace(/"/g, '""')}"`,
        Number(item.revenue).toFixed(4),
        item.performances.toString(),
        `${Number(item.splitPercentage)}%`,
        Number(item.revenue).toFixed(2),
        `${Number(item.commissionRate)}%`,
        Number(item.commissionAmount).toFixed(2),
        Number(item.netRevenue).toFixed(2),
        item.paidAt ? formatExportDate(item.paidAt) : 'Pending'
      ]);

      // Calculate totals
      const totalGross = statement.items.reduce((sum, item) => sum + Number(item.revenue), 0);
      const totalCommission = statement.items.reduce((sum, item) => sum + Number(item.commissionAmount), 0);
      const totalNet = statement.items.reduce((sum, item) => sum + Number(item.netRevenue), 0);

      // Add totals row
      rows.push([
        '"TOTAL"',
        '',
        '',
        '',
        totalGross.toFixed(2),
        '',
        totalCommission.toFixed(2),
        totalNet.toFixed(2),
        ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Add statement info header
      const headerInfo = [
        `# Statement Export`,
        `# PRO: ${statement.proType}`,
        `# File: ${statement.filename}`,
        `# Published: ${formatExportDate(statement.publishedAt)}`,
        `# Songs: ${statement.items.length}`,
        `# Total Net Earnings: $${totalNet.toFixed(2)}`,
        ``
      ].join('\n');

      const fullCsv = headerInfo + csv;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="my-statement-${statement.proType}-${formatExportDate(statement.publishedAt)}.csv"`);
      res.send(fullCsv);
    } catch (error) {
      console.error('Writer export statement error:', error);
      res.status(500).json({ error: 'Failed to export statement' });
    }
  }
);

export default router;
