import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { QuestStatus, QuestStepStatus, CorporateEntityStatus } from '../generated/client';
import { anvilService, EntityFormData, MusicFormData } from '../services/anvil.service';
import { openCorporatesService } from '../services/opencorporates.service';
import { oneSignalService } from '../services/onesignal.service';

// Configure multer for corporate document uploads
const corporateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads/corporate';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `corp-${uniqueSuffix}${ext}`);
  },
});

const corporateUpload = multer({
  storage: corporateStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPEG, and PNG are allowed.'));
    }
  },
});

const router = Router();

// ============================================================================
// ENTITIES
// ============================================================================

// Get all entities
router.get('/entities', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entities = await prisma.corporateEntity.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            quests: true,
            documents: true,
            complianceItems: true,
          },
        },
      },
    });
    res.json(entities);
  } catch (error) {
    console.error('Get entities error:', error);
    res.status(500).json({ error: 'Failed to get entities' });
  }
});

// Get single entity with all related data
router.get('/entities/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const entity = await prisma.corporateEntity.findUnique({
      where: { id },
      include: {
        quests: {
          orderBy: { order: 'asc' },
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        complianceItems: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json(entity);
  } catch (error) {
    console.error('Get entity error:', error);
    res.status(500).json({ error: 'Failed to get entity' });
  }
});

// Update entity (admin only)
router.patch('/entities/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, ein, stateFileNumber, formedDate, registeredAgent } = req.body;

    const entity = await prisma.corporateEntity.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(ein && { ein }),
        ...(stateFileNumber && { stateFileNumber }),
        ...(formedDate && { formedDate: new Date(formedDate) }),
        ...(registeredAgent && { registeredAgent }),
      },
    });

    res.json(entity);
  } catch (error) {
    console.error('Update entity error:', error);
    res.status(500).json({ error: 'Failed to update entity' });
  }
});

// ============================================================================
// QUESTS
// ============================================================================

// Get all quests for an entity
router.get('/quests/:entityId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { entityId } = req.params;
    const quests = await prisma.corporateQuest.findMany({
      where: { entityId },
      orderBy: { order: 'asc' },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Calculate progress for each quest
    const questsWithProgress = quests.map((quest) => {
      const totalSteps = quest.steps.length;
      const completedSteps = quest.steps.filter((s) => s.status === 'COMPLETED').length;
      return {
        ...quest,
        progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      };
    });

    res.json(questsWithProgress);
  } catch (error) {
    console.error('Get quests error:', error);
    res.status(500).json({ error: 'Failed to get quests' });
  }
});

// Get quest details with steps
router.get('/quests/:id/details', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const quest = await prisma.corporateQuest.findUnique({
      where: { id },
      include: {
        entity: true,
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    res.json(quest);
  } catch (error) {
    console.error('Get quest details error:', error);
    res.status(500).json({ error: 'Failed to get quest details' });
  }
});

// Start a quest
router.patch('/quests/:id/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if quest exists and is available
    const quest = await prisma.corporateQuest.findUnique({
      where: { id },
      include: { steps: true },
    });

    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    if (quest.status !== 'AVAILABLE') {
      return res.status(400).json({ error: `Quest is ${quest.status}, cannot start` });
    }

    // Update quest status and first step
    const updated = await prisma.$transaction(async (tx) => {
      const updatedQuest = await tx.corporateQuest.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });

      // Mark first step as in progress
      if (quest.steps.length > 0) {
        await tx.corporateQuestStep.update({
          where: { id: quest.steps[0].id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return updatedQuest;
    });

    res.json(updated);
  } catch (error) {
    console.error('Start quest error:', error);
    res.status(500).json({ error: 'Failed to start quest' });
  }
});

// Complete a quest
router.patch('/quests/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const quest = await prisma.corporateQuest.findUnique({
      where: { id },
      include: {
        steps: true,
        entity: true,
      },
    });

    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    // Check all steps are completed
    const incompleteSteps = quest.steps.filter(
      (s) => s.status !== 'COMPLETED' && s.status !== 'SKIPPED'
    );
    if (incompleteSteps.length > 0) {
      return res.status(400).json({
        error: 'Cannot complete quest with incomplete steps',
        incompleteSteps: incompleteSteps.map((s) => s.title),
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Complete the quest
      const completedQuest = await tx.corporateQuest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy: userId,
        },
      });

      // Award XP to user (if user progress exists)
      await tx.corporateUserProgress.upsert({
        where: {
          id: `${userId}-corporate`,
        },
        create: {
          id: `${userId}-corporate`,
          userId,
          totalXp: quest.xpReward,
          questsCompleted: 1,
        },
        update: {
          totalXp: { increment: quest.xpReward },
          questsCompleted: { increment: 1 },
        },
      });

      // Unlock dependent quests
      await tx.corporateQuest.updateMany({
        where: {
          prerequisiteIds: { has: id },
          status: 'LOCKED',
        },
        data: { status: 'AVAILABLE' },
      });

      return completedQuest;
    });

    res.json({
      quest: result,
      xpEarned: quest.xpReward,
    });
  } catch (error) {
    console.error('Complete quest error:', error);
    res.status(500).json({ error: 'Failed to complete quest' });
  }
});

// ============================================================================
// QUEST STEPS
// ============================================================================

// Complete a step
router.patch('/steps/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { documentId } = req.body;

    const step = await prisma.corporateQuestStep.findUnique({
      where: { id },
      include: { quest: { include: { steps: true } } },
    });

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }

    // Check if step requires upload and has document
    if (step.requiresUpload && !documentId && !step.documentId) {
      return res.status(400).json({ error: 'This step requires a document upload' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Complete the step
      const completedStep = await tx.corporateQuestStep.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy: userId,
          ...(documentId && { documentId }),
        },
      });

      // Find next step and mark as in progress
      const nextStep = step.quest.steps.find(
        (s) => s.order === step.order + 1 && s.status === 'PENDING'
      );
      if (nextStep) {
        await tx.corporateQuestStep.update({
          where: { id: nextStep.id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return completedStep;
    });

    res.json(result);
  } catch (error) {
    console.error('Complete step error:', error);
    res.status(500).json({ error: 'Failed to complete step' });
  }
});

// Skip a step (admin only)
router.patch('/steps/:id/skip', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { reason } = req.body;

    const step = await prisma.corporateQuestStep.update({
      where: { id },
      data: {
        status: 'SKIPPED',
        completedAt: new Date(),
        completedBy: userId,
        actionData: { skipReason: reason },
      },
    });

    res.json(step);
  } catch (error) {
    console.error('Skip step error:', error);
    res.status(500).json({ error: 'Failed to skip step' });
  }
});

// Upload document for a step
router.post(
  '/steps/:id/upload',
  authenticate,
  corporateUpload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get the step and verify it exists and requires upload
      const step = await prisma.corporateQuestStep.findUnique({
        where: { id },
        include: {
          quest: {
            include: {
              entity: true,
              steps: true,
            },
          },
        },
      });

      if (!step) {
        // Clean up file if step not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Step not found' });
      }

      if (!step.requiresUpload) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'This step does not require file upload' });
      }

      // Create a corporate document entry
      const document = await prisma.corporateDocument.create({
        data: {
          entityId: step.quest.entityId,
          name: `${step.title} - ${req.file.originalname}`,
          category: 'FORMATION', // Could be derived from quest category
          status: 'PENDING_REVIEW',
          fileUrl: `/uploads/corporate/${req.file.filename}`,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedBy: userId,
          uploadedAt: new Date(),
        },
      });

      // Update the step with the document reference
      const result = await prisma.$transaction(async (tx) => {
        // Complete the step with the document
        const updatedStep = await tx.corporateQuestStep.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            completedBy: userId,
            documentId: document.id,
          },
        });

        // Find next step and mark as in progress
        const nextStep = step.quest.steps.find(
          (s) => s.order === step.order + 1 && s.status === 'PENDING'
        );
        if (nextStep) {
          await tx.corporateQuestStep.update({
            where: { id: nextStep.id },
            data: { status: 'IN_PROGRESS' },
          });
        }

        return updatedStep;
      });

      res.json({
        success: true,
        step: result,
        document,
      });
    } catch (error) {
      console.error('Step upload error:', error);
      // Clean up file if database operation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

// ============================================================================
// DOCUMENTS
// ============================================================================

// Get documents for an entity
router.get('/documents/:entityId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { entityId } = req.params;
    const { category, status } = req.query;

    const documents = await prisma.corporateDocument.findMany({
      where: {
        entityId,
        ...(category && { category: category as any }),
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Upload document
router.post('/documents', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { entityId, name, category, fileUrl, fileName, fileSize, mimeType, effectiveDate } = req.body;

    if (!entityId || !name || !category) {
      return res.status(400).json({ error: 'entityId, name, and category are required' });
    }

    const document = await prisma.corporateDocument.create({
      data: {
        entityId,
        name,
        category,
        status: 'PENDING_REVIEW',
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        uploadedBy: userId,
        uploadedAt: new Date(),
        ...(effectiveDate && { effectiveDate: new Date(effectiveDate) }),
      },
    });

    res.json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Update document status
router.patch('/documents/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, effectiveDate, expirationDate } = req.body;

    const document = await prisma.corporateDocument.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(effectiveDate && { effectiveDate: new Date(effectiveDate) }),
        ...(expirationDate && { expirationDate: new Date(expirationDate) }),
      },
    });

    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete (archive) document
router.delete('/documents/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.corporateDocument.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    res.json({ message: 'Document archived', document });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to archive document' });
  }
});

// ============================================================================
// COMPLIANCE
// ============================================================================

// Get all compliance items
router.get('/compliance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { entityId, status } = req.query;

    const items = await prisma.complianceItem.findMany({
      where: {
        ...(entityId && { entityId: entityId as string }),
        ...(status && { status: status as any }),
      },
      include: {
        entity: {
          select: { name: true, shortName: true, color: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(items);
  } catch (error) {
    console.error('Get compliance items error:', error);
    res.status(500).json({ error: 'Failed to get compliance items' });
  }
});

// Get upcoming/due compliance items
router.get('/compliance/upcoming', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const items = await prisma.complianceItem.findMany({
      where: {
        status: { in: ['UPCOMING', 'DUE_SOON', 'OVERDUE'] },
        dueDate: { lte: thirtyDaysFromNow },
      },
      include: {
        entity: {
          select: { name: true, shortName: true, color: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Update statuses based on due date
    const updatedItems = items.map((item) => {
      if (!item.dueDate) return item;

      const daysUntilDue = Math.ceil(
        (item.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      let newStatus = item.status;
      if (daysUntilDue < 0) newStatus = 'OVERDUE';
      else if (daysUntilDue <= item.reminderDays) newStatus = 'DUE_SOON';

      return { ...item, status: newStatus, daysUntilDue };
    });

    res.json(updatedItems);
  } catch (error) {
    console.error('Get upcoming compliance error:', error);
    res.status(500).json({ error: 'Failed to get upcoming compliance items' });
  }
});

// Update compliance item
router.patch('/compliance/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { status, documentId, completedAt } = req.body;

    const item = await prisma.complianceItem.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(documentId && { documentId }),
        ...(completedAt && { completedAt: new Date(completedAt) }),
        ...(status === 'COMPLETED' && { completedBy: userId }),
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Update compliance error:', error);
    res.status(500).json({ error: 'Failed to update compliance item' });
  }
});

// ============================================================================
// USER PROGRESS
// ============================================================================

// Get user's corporate progress
router.get('/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let progress = await prisma.corporateUserProgress.findFirst({
      where: { userId },
    });

    // Create if doesn't exist
    if (!progress) {
      progress = await prisma.corporateUserProgress.create({
        data: {
          id: `${userId}-corporate`,
          userId,
          totalXp: 0,
          questsCompleted: 0,
        },
      });
    }

    // Calculate level from XP
    const level = Math.floor(progress.totalXp / 500) + 1;
    const xpForNextLevel = level * 500;
    const xpProgress = progress.totalXp % 500;

    res.json({
      ...progress,
      level,
      xpForNextLevel,
      xpProgress,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// ============================================================================
// PDF TEMPLATES (Anvil)
// ============================================================================

// Check if Anvil service is enabled
router.get('/pdf/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const templates = await anvilService.getTemplateInfo();
    res.json({
      success: true,
      enabled: anvilService.isEnabled(),
      templates,
    });
  } catch (error) {
    console.error('Get PDF status error:', error);
    res.status(500).json({ error: 'Failed to get PDF status' });
  }
});

// Fill a PDF template with entity data
router.post('/pdf/fill', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!anvilService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'PDF service is not configured. Set ANVIL_API_KEY to enable.',
      });
    }

    const { templateType, entityId, formData } = req.body;

    if (!templateType || !entityId) {
      return res.status(400).json({ error: 'templateType and entityId are required' });
    }

    // Fetch entity data
    const entity = await prisma.corporateEntity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Build entity form data
    const entityData: EntityFormData = {
      entityName: entity.name,
      entityType: entity.type,
      jurisdiction: entity.jurisdiction,
      registeredAgent: entity.registeredAgent || undefined,
      ein: entity.ein || undefined,
      stateFileNumber: entity.stateFileNumber || undefined,
      formationDate: entity.formedDate?.toISOString().split('T')[0],
      ...formData, // Allow overriding with additional form data
    };

    let pdfBuffer: Buffer;

    switch (templateType) {
      case 'articlesOfIncorporation':
        pdfBuffer = await anvilService.fillArticlesOfIncorporation(entityData);
        break;
      case 'articlesOfOrganization':
        pdfBuffer = await anvilService.fillArticlesOfOrganization(entityData);
        break;
      case 'corporateBylaws':
        pdfBuffer = await anvilService.fillCorporateBylaws(entityData);
        break;
      case 'operatingAgreement':
        pdfBuffer = await anvilService.fillOperatingAgreement(entityData);
        break;
      case 'stockCertificate':
        if (typeof formData?.shareholderIndex !== 'number') {
          return res.status(400).json({ error: 'shareholderIndex is required for stock certificates' });
        }
        pdfBuffer = await anvilService.fillStockCertificate(entityData, formData.shareholderIndex);
        break;
      default:
        return res.status(400).json({ error: `Unknown template type: ${templateType}` });
    }

    // Set response headers for PDF download
    const fileName = `${templateType}_${entity.shortName}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Fill PDF error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fill PDF',
    });
  }
});

// Fill a split sheet PDF
router.post('/pdf/split-sheet', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!anvilService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'PDF service is not configured. Set ANVIL_API_KEY to enable.',
      });
    }

    const musicData: MusicFormData = req.body;

    if (!musicData.songTitle || !musicData.artistName || !musicData.writerNames) {
      return res.status(400).json({
        error: 'songTitle, artistName, and writerNames are required',
      });
    }

    const pdfBuffer = await anvilService.fillSplitSheet(musicData);

    const fileName = `split_sheet_${musicData.songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Fill split sheet error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fill split sheet',
    });
  }
});

// ============================================================================
// ENTITY VERIFICATION (OpenCorporates)
// ============================================================================

// Check OpenCorporates service status
router.get('/verify/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = await openCorporatesService.checkStatus();
    res.json(status);
  } catch (error) {
    console.error('OpenCorporates status error:', error);
    res.status(500).json({ error: 'Failed to check OpenCorporates status' });
  }
});

// Verify an entity exists in state registry
router.post('/verify/entity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { entityName, jurisdiction } = req.body;

    if (!entityName || !jurisdiction) {
      return res.status(400).json({ error: 'entityName and jurisdiction are required' });
    }

    const result = await openCorporatesService.verifyEntity(entityName, jurisdiction);
    res.json(result);
  } catch (error) {
    console.error('Verify entity error:', error);
    res.status(500).json({ error: 'Failed to verify entity' });
  }
});

// Verify a Producer Tour entity by short name
router.get('/verify/pt/:shortName', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { shortName } = req.params;
    const result = await openCorporatesService.verifyProducerTourEntity(shortName);
    res.json(result);
  } catch (error) {
    console.error('Verify PT entity error:', error);
    res.status(500).json({ error: 'Failed to verify Producer Tour entity' });
  }
});

// Search companies (autocomplete)
router.get('/verify/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { query, jurisdiction, limit } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query parameter is required' });
    }

    const results = await openCorporatesService.searchCompanies(
      query,
      jurisdiction as string | undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({ results });
  } catch (error) {
    console.error('Search companies error:', error);
    res.status(500).json({ error: 'Failed to search companies' });
  }
});

// Get company details from OpenCorporates
router.get('/verify/company/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const details = await openCorporatesService.getCompanyDetails(companyId);

    if (!details) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(details);
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({ error: 'Failed to get company details' });
  }
});

// Verify entity and update database record if verified
router.post('/verify/entity/:entityId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { entityId } = req.params;

    // Fetch entity from database
    const entity = await prisma.corporateEntity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Verify against OpenCorporates
    const result = await openCorporatesService.verifyEntity(entity.name, entity.jurisdiction);

    // If verified with high/medium confidence, optionally fetch and update details
    if (result.verified && result.matchedEntity) {
      const details = await openCorporatesService.getCompanyDetails(result.matchedEntity.id);

      if (details) {
        // Update entity with verified info from registry
        await prisma.corporateEntity.update({
          where: { id: entityId },
          data: {
            stateFileNumber: details.companyNumber || entity.stateFileNumber,
            // Store OpenCorporates ID for future reference
            metadata: {
              ...((entity as any).metadata || {}),
              openCorporatesId: result.matchedEntity.id,
              openCorporatesUrl: result.matchedEntity.opencorporatesUrl,
              verifiedAt: new Date().toISOString(),
              verificationScore: result.matchedEntity.score,
            },
          },
        });

        return res.json({
          ...result,
          details,
          updated: true,
        });
      }
    }

    res.json({
      ...result,
      updated: false,
    });
  } catch (error) {
    console.error('Verify entity by ID error:', error);
    res.status(500).json({ error: 'Failed to verify entity' });
  }
});

// ============================================================================
// PUSH NOTIFICATIONS (OneSignal)
// ============================================================================

// Check OneSignal service status
router.get('/notifications/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = await oneSignalService.checkStatus();
    res.json(status);
  } catch (error) {
    console.error('OneSignal status error:', error);
    res.status(500).json({ error: 'Failed to check notification service status' });
  }
});

// Send a test notification (admin only)
router.post('/notifications/test', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, message } = req.body;

    const result = await oneSignalService.sendToUsers([userId], {
      title: title || 'Test Notification',
      message: message || 'This is a test notification from Producer Tour Corporate Structure',
      url: '/corporate-structure',
    });

    res.json(result);
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Manually trigger compliance reminders (admin only, for testing/debug)
router.post('/notifications/compliance-check', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const results = await oneSignalService.processComplianceReminders();
    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Failed to process compliance reminders' });
  }
});

// Send quest notification (admin only)
router.post('/notifications/quest', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userIds, questId, questTitle, entityName, xpReward, type } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    if (!questId || !questTitle || !entityName || !type) {
      return res.status(400).json({ error: 'questId, questTitle, entityName, and type are required' });
    }

    const result = await oneSignalService.sendQuestNotification(userIds, {
      questId,
      questTitle,
      entityName,
      xpReward,
      type,
    });

    res.json(result);
  } catch (error) {
    console.error('Quest notification error:', error);
    res.status(500).json({ error: 'Failed to send quest notification' });
  }
});

// Send compliance reminder notification (admin only)
router.post('/notifications/compliance', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userIds, complianceItemId } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    if (!complianceItemId) {
      return res.status(400).json({ error: 'complianceItemId is required' });
    }

    // Fetch compliance item details
    const item = await prisma.complianceItem.findUnique({
      where: { id: complianceItemId },
      include: {
        entity: {
          select: { name: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }

    const now = new Date();
    const daysUntilDue = item.dueDate
      ? Math.ceil((item.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const result = await oneSignalService.sendComplianceReminder(userIds, {
      complianceItemId: item.id,
      entityName: item.entity.name,
      itemTitle: item.title,
      dueDate: item.dueDate || new Date(),
      daysUntilDue,
    });

    res.json(result);
  } catch (error) {
    console.error('Compliance notification error:', error);
    res.status(500).json({ error: 'Failed to send compliance notification' });
  }
});

// ============================================================================
// DASHBOARD STATS
// ============================================================================

// Get corporate structure dashboard stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalEntities,
      formedEntities,
      totalQuests,
      completedQuests,
      availableQuests,
      upcomingCompliance,
      documents,
    ] = await Promise.all([
      prisma.corporateEntity.count(),
      prisma.corporateEntity.count({ where: { status: 'ACTIVE' } }),
      prisma.corporateQuest.count(),
      prisma.corporateQuest.count({ where: { status: 'COMPLETED' } }),
      prisma.corporateQuest.count({ where: { status: 'AVAILABLE' } }),
      prisma.complianceItem.count({
        where: { status: { in: ['DUE_SOON', 'OVERDUE'] } },
      }),
      prisma.corporateDocument.count({ where: { status: 'CURRENT' } }),
    ]);

    res.json({
      entities: {
        total: totalEntities,
        formed: formedEntities,
        pending: totalEntities - formedEntities,
      },
      quests: {
        total: totalQuests,
        completed: completedQuests,
        available: availableQuests,
        progress: totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0,
      },
      compliance: {
        urgent: upcomingCompliance,
      },
      documents: {
        current: documents,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
