import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads/documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, and images are allowed.'));
    }
  }
});

/**
 * POST /api/documents/upload
 * Upload a new document
 */
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      category,
      description,
      visibility,
      relatedUserId,
      statementId,
      tags
    } = req.body;

    if (!category) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Category is required' });
    }

    const document = await prisma.document.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        category,
        description: description || null,
        visibility: visibility || 'ADMIN_ONLY',
        uploadedById: req.user!.id,
        relatedUserId: relatedUserId || null,
        statementId: statementId || null,
        tags: tags ? JSON.parse(tags) : null
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        relatedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Document upload error:', error);
    // Clean up file if database operation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * GET /api/documents
 * List all documents (filtered by user permissions)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category, visibility, relatedUserId } = req.query;
    const isAdmin = req.user!.role === 'ADMIN';

    const where: any = {};

    // Filter by category if provided
    if (category) {
      where.category = category;
    }

    // Filter by visibility
    if (visibility) {
      where.visibility = visibility;
    }

    // Filter by related user
    if (relatedUserId) {
      where.relatedUserId = relatedUserId;
    }

    // Non-admins can only see documents they uploaded or documents assigned to them
    if (!isAdmin) {
      where.OR = [
        { uploadedById: req.user!.id },
        { relatedUserId: req.user!.id },
        { visibility: 'ALL_WRITERS' }
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        relatedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        statement: {
          select: {
            id: true,
            filename: true,
            proType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('Document list error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * GET /api/documents/:id
 * Get a single document by ID
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === 'ADMIN';

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        relatedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        statement: {
          select: {
            id: true,
            filename: true,
            proType: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const canAccess = isAdmin ||
      document.uploadedById === req.user!.id ||
      document.relatedUserId === req.user!.id ||
      document.visibility === 'ALL_WRITERS';

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Document get error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

/**
 * GET /api/documents/:id/download
 * Download a document
 */
router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === 'ADMIN';

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const canAccess = isAdmin ||
      document.uploadedById === req.user!.id ||
      document.relatedUserId === req.user!.id ||
      document.visibility === 'ALL_WRITERS';

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(document.filePath, document.originalName);
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

/**
 * PUT /api/documents/:id
 * Update document metadata (admin only)
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      description,
      category,
      visibility,
      relatedUserId,
      tags
    } = req.body;

    // Only admins can update documents
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can update documents' });
    }

    const document = await prisma.document.update({
      where: { id },
      data: {
        description: description !== undefined ? description : undefined,
        category: category || undefined,
        visibility: visibility || undefined,
        relatedUserId: relatedUserId !== undefined ? relatedUserId : undefined,
        tags: tags ? JSON.parse(tags) : undefined
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        relatedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Document update error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document (admin only)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only admins can delete documents
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete documents' });
    }

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete from database
    await prisma.document.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
