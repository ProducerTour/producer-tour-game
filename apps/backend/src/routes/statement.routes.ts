import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { StatementParserFactory } from '../parsers';
import { UploadedFile } from 'express-fileupload';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../lib/prisma';

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

    const where: any = {};
    if (status) where.status = status;
    if (proType) where.proType = proType;

    // Writers only see published statements
    if (req.user!.role === 'WRITER') {
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
      },
    });

    // Add itemCount to each statement for easier access
    const statementsWithCount = statements.map(statement => ({
      ...statement,
      itemCount: statement._count.items,
    }));

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
        // Group items by writer
        const writerMap = new Map();

        statement.items.forEach(item => {
          const key = item.userId;
          if (!writerMap.has(key)) {
            writerMap.set(key, {
              userId: item.userId,
              name: `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || item.user.email,
              email: item.user.email,
              grossRevenue: 0,
              commissionAmount: 0,
              netRevenue: 0,
              songCount: 0
            });
          }

          const writer = writerMap.get(key);
          writer.grossRevenue += Number(item.revenue);
          writer.commissionAmount += Number(item.commissionAmount);
          writer.netRevenue += Number(item.netRevenue);
          writer.songCount += 1;
        });

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
      const unassignedSongs = parsedItems
        .map((item: any) => item.workTitle)
        .filter((title: string) => {
          const songAssignments = assignments[title];
          return !songAssignments || !Array.isArray(songAssignments) || songAssignments.length === 0;
        });

      if (unassignedSongs.length > 0) {
        return res.status(400).json({
          error: 'Not all songs have writers assigned',
          unassignedSongs: unassignedSongs.slice(0, 5), // Show first 5
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
      const createPromises: any[] = [];
      let totalCommission = 0;
      let totalNet = 0;

      parsedItems.forEach((item: any) => {
        const songAssignments = assignments[item.workTitle] || [];

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

          createPromises.push(
            prisma.statementItem.create({
              data: {
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
              },
            })
          );
        });
      });

      // Use transaction to create all items and update statement
      await prisma.$transaction([
        ...createPromises,
        prisma.statement.update({
          where: { id },
          data: {
            status: 'PUBLISHED',
            paymentStatus: 'UNPAID', // Mark as unpaid until admin processes payment
            publishedAt: new Date(),
            publishedById: req.user!.id,
            totalCommission: totalCommission,
            totalNet: totalNet,
          },
        }),
      ]);

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

      // Group by writer
      const writerMap = new Map();

      statement.items.forEach(item => {
        const key = item.userId;
        if (!writerMap.has(key)) {
          writerMap.set(key, {
            userId: item.userId,
            name: `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || item.user.email,
            email: item.user.email,
            grossRevenue: 0,
            commissionAmount: 0,
            netRevenue: 0,
            songCount: 0
          });
        }

        const writer = writerMap.get(key);
        writer.grossRevenue += Number(item.revenue);
        writer.commissionAmount += Number(item.commissionAmount);
        writer.netRevenue += Number(item.netRevenue);
        writer.songCount += 1;
      });

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
 * POST /api/statements/:id/process-payment
 * Mark statement as paid and make visible to writers (Admin only)
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
        include: { items: true }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      if (statement.paymentStatus === 'PAID') {
        return res.status(400).json({ error: 'Statement already paid' });
      }

      // Process payment in transaction
      const result = await prisma.$transaction(async (tx) => {
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

        return updatedStatement;
      });

      // Return payment confirmation
      res.json({
        success: true,
        statement: {
          id: result.id,
          paymentStatus: result.paymentStatus,
          paymentProcessedAt: result.paymentProcessedAt,
          totalPaidToWriters: Number(result.totalNet),
          commissionToProducerTour: Number(result.totalCommission)
        }
      });
    } catch (error) {
      console.error('Process payment error:', error);
      res.status(500).json({ error: 'Failed to process payment' });
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
      const matchResults = await smartMatchStatement(parsedItems);

      // Categorize matches by confidence
      const autoAssigned: any[] = []; // >90% confidence - can auto-assign
      const suggested: any[] = [];    // 70-90% confidence - needs review
      const unmatched: any[] = [];    // <70% or no match - needs manual assignment

      matchResults.forEach((matches, workTitle) => {
        if (!matches || matches.length === 0) {
          // No matches found
          unmatched.push({
            workTitle,
            reason: 'No matching writers found in database'
          });
          return;
        }

        // For MLC statements, multiple writers can be on one song
        // Get all high-confidence matches (>=90%)
        const highConfidenceMatches = matches.filter(m => m.confidence >= 90);
        const mediumConfidenceMatches = matches.filter(m => m.confidence >= 70 && m.confidence < 90);

        if (highConfidenceMatches.length > 0) {
          // High confidence - auto-assign (supports multiple writers per song)
          autoAssigned.push({
            workTitle,
            writers: highConfidenceMatches.map(match => ({
              writer: {
                id: match.writer.id,
                name: `${match.writer.firstName || ''} ${match.writer.lastName || ''}`.trim() || match.writer.email,
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
            matches: mediumConfidenceMatches.slice(0, 3).map(m => ({ // Top 3 matches
              writer: {
                id: m.writer.id,
                name: `${m.writer.firstName || ''} ${m.writer.lastName || ''}`.trim() || m.writer.email,
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
            reason: `Low confidence match (${topMatch.confidence}%) - manual review required`
          });
        }
      });

      // Debug logging to verify response structure
      console.log('Smart Assign Results:', {
        totalSongs: parsedItems.length,
        autoAssignedCount: autoAssigned.length,
        autoAssignedSample: autoAssigned[0], // First item to verify structure
        suggestedCount: suggested.length,
        unmatchedCount: unmatched.length
      });

      res.json({
        summary: {
          totalSongs: parsedItems.length,
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

export default router;
