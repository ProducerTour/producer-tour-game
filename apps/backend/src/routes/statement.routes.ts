import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { StatementParserFactory } from '../parsers';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
const prisma = new PrismaClient();

// File upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/statements');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * POST /api/statements/upload
 * Upload and parse statement file (Admin only)
 */
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  upload.single('statement'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { proType } = req.body;
      if (!proType || !['BMI', 'ASCAP', 'SESAC'].includes(proType)) {
        return res.status(400).json({ error: 'Invalid PRO type' });
      }

      // Read file content
      const csvContent = await fs.readFile(req.file.path, 'utf-8');

      // Parse statement
      const parseResult = await StatementParserFactory.parse(
        proType,
        csvContent,
        req.file.originalname
      );

      // Create statement record
      const statement = await prisma.statement.create({
        data: {
          proType,
          filename: req.file.originalname,
          filePath: req.file.path,
          status: 'PROCESSED',
          totalRevenue: parseResult.totalRevenue,
          totalPerformances: parseResult.totalPerformances,
          metadata: parseResult.metadata,
        },
      });

      res.json({
        statement,
        parseResult: {
          songCount: parseResult.songCount,
          totalRevenue: parseResult.totalRevenue,
          totalPerformances: parseResult.totalPerformances,
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

    const total = await prisma.statement.count({ where });

    res.json({ statements, total });
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
 * POST /api/statements/:id/publish
 * Publish statement to writers (Admin only)
 */
router.post(
  '/:id/publish',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishedById: req.user!.id,
        },
      });

      res.json(statement);
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
