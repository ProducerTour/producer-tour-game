import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { StatementParserFactory } from '../parsers';
import { UploadedFile } from 'express-fileupload';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
const prisma = new PrismaClient();

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

      // Validate file type
      if (!uploadedFile.name.endsWith('.csv') && uploadedFile.mimetype !== 'text/csv') {
        return res.status(400).json({ error: 'Only CSV files are allowed' });
      }

      const { proType } = req.body;
      if (!proType || !['BMI', 'ASCAP', 'SESAC'].includes(proType)) {
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
                writerIpiNumber: assignment.ipiNumber || null,
                commissionRate: commissionRateToUse,
                commissionAmount: itemCommissionAmount,
                commissionRecipient: commissionRecipient,
                netRevenue: itemNetRevenue,
                metadata: {
                  ...item.metadata,
                  originalTotalRevenue: parseFloat(item.revenue), // Store original total before split
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

export default router;
