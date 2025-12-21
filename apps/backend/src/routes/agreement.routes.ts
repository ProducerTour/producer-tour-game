/**
 * Agreement Routes
 * Handles e-signature agreements via Firma API
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { firmaService, WebhookPayload } from '../services/firma.service';
import multer from 'multer';

const router = Router();

// Configure multer for PDF uploads (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// ==========================================
// Template Routes
// ==========================================

/**
 * GET /api/agreements/templates
 * List all agreement templates
 */
router.get('/templates', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.agreementTemplate.findMany({
      where: {
        status: { not: 'archived' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { agreements: true },
        },
      },
    });

    res.json(templates);
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

/**
 * POST /api/agreements/templates
 * Create a new agreement template by uploading a PDF
 */
router.post(
  '/templates',
  authenticate,
  requireAdmin,
  upload.single('pdf'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'PDF file is required' });
      }

      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Template name is required' });
      }

      // Check if Firma is configured
      if (!firmaService.isConfigured()) {
        return res.status(503).json({ error: 'Firma API is not configured' });
      }

      // Convert PDF to base64 and create template in Firma
      const pdfBase64 = req.file.buffer.toString('base64');
      const firmaTemplate = await firmaService.createTemplate(pdfBase64, name);

      // Save template reference in our database
      const template = await prisma.agreementTemplate.create({
        data: {
          name,
          description: description || null,
          firmaTemplateId: firmaTemplate.id,
          status: 'draft',
        },
      });

      res.status(201).json(template);
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({
        error: 'Failed to create template',
        details: error.response?.data || error.message,
      });
    }
  }
);

/**
 * GET /api/agreements/templates/:id
 * Get template details
 */
router.get('/templates/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.agreementTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { agreements: true },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

/**
 * PUT /api/agreements/templates/:id
 * Update template metadata
 */
router.put('/templates/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const template = await prisma.agreementTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
    });

    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * DELETE /api/agreements/templates/:id
 * Archive a template (soft delete)
 */
router.delete('/templates/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.agreementTemplate.update({
      where: { id },
      data: { status: 'archived' },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving template:', error);
    res.status(500).json({ error: 'Failed to archive template' });
  }
});

/**
 * POST /api/agreements/templates/:id/editor-token
 * Get JWT token for Firma template editor
 */
router.post('/templates/:id/editor-token', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.agreementTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!firmaService.isConfigured()) {
      return res.status(503).json({ error: 'Firma API is not configured' });
    }

    const tokenResponse = await firmaService.generateTemplateEditorToken(template.firmaTemplateId);

    res.json({
      jwt: tokenResponse.token,
      expiresAt: tokenResponse.expires_at,
      templateId: template.firmaTemplateId,
    });
  } catch (error: any) {
    console.error('Error generating editor token:', error);
    res.status(500).json({
      error: 'Failed to generate editor token',
      details: error.response?.data || error.message,
    });
  }
});

// ==========================================
// Agreement Routes
// ==========================================

/**
 * GET /api/agreements
 * List all agreements with optional filters
 */
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, templateId, applicationId, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (templateId) where.templateId = templateId;
    if (applicationId) where.applicationId = applicationId;

    const [agreements, total] = await Promise.all([
      prisma.agreement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          template: {
            select: { id: true, name: true },
          },
          application: {
            select: { id: true, name: true, email: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.agreement.count({ where }),
    ]);

    res.json({ agreements, total });
  } catch (error) {
    console.error('Error listing agreements:', error);
    res.status(500).json({ error: 'Failed to list agreements' });
  }
});

/**
 * POST /api/agreements
 * Create and optionally send an agreement
 */
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { templateId, applicationId, userId, recipientName, recipientEmail, sendImmediately = true } = req.body;

    if (!templateId || !recipientName || !recipientEmail) {
      return res.status(400).json({ error: 'templateId, recipientName, and recipientEmail are required' });
    }

    // Get template
    const template = await prisma.agreementTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!firmaService.isConfigured()) {
      return res.status(503).json({ error: 'Firma API is not configured' });
    }

    // Parse recipient name into first/last
    const nameParts = recipientName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    // Create signing request in Firma
    const signingRequest = await firmaService.createSigningRequest(
      template.firmaTemplateId,
      `${template.name} - ${recipientName}`,
      [{
        first_name: firstName,
        last_name: lastName,
        email: recipientEmail,
        designation: 'Signer',
      }]
    );

    // Create agreement in our database
    const agreement = await prisma.agreement.create({
      data: {
        templateId,
        applicationId: applicationId || null,
        userId: userId || null,
        recipientName,
        recipientEmail,
        firmaSigningRequestId: signingRequest.id,
        firmaSigningUrl: signingRequest.recipients?.[0]?.signing_url,
        status: 'PENDING',
      },
      include: {
        template: { select: { id: true, name: true } },
        application: { select: { id: true, name: true, email: true } },
      },
    });

    // Send immediately if requested
    if (sendImmediately) {
      try {
        await firmaService.sendSigningRequest(signingRequest.id);
        await prisma.agreement.update({
          where: { id: agreement.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
        agreement.status = 'SENT';
        agreement.sentAt = new Date();
      } catch (sendError) {
        console.error('Error sending agreement:', sendError);
        // Agreement created but not sent - user can retry
      }
    }

    res.status(201).json(agreement);
  } catch (error: any) {
    console.error('Error creating agreement:', error);
    res.status(500).json({
      error: 'Failed to create agreement',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * GET /api/agreements/:id
 * Get agreement details
 */
router.get('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true } },
        application: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    // Optionally fetch latest status from Firma
    if (firmaService.isConfigured() && agreement.status !== 'COMPLETED' && agreement.status !== 'CANCELLED') {
      try {
        const firmaRequest = await firmaService.getSigningRequest(agreement.firmaSigningRequestId);
        // Could update local status based on Firma status if needed
      } catch (e) {
        // Ignore errors fetching from Firma
      }
    }

    res.json(agreement);
  } catch (error) {
    console.error('Error getting agreement:', error);
    res.status(500).json({ error: 'Failed to get agreement' });
  }
});

/**
 * POST /api/agreements/:id/send
 * Send/resend an agreement
 */
router.post('/:id/send', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    if (!firmaService.isConfigured()) {
      return res.status(503).json({ error: 'Firma API is not configured' });
    }

    await firmaService.sendSigningRequest(agreement.firmaSigningRequestId);

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error sending agreement:', error);
    res.status(500).json({
      error: 'Failed to send agreement',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * POST /api/agreements/:id/cancel
 * Cancel an agreement
 */
router.post('/:id/cancel', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    if (agreement.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot cancel a completed agreement' });
    }

    if (firmaService.isConfigured()) {
      try {
        await firmaService.cancelSigningRequest(agreement.firmaSigningRequestId);
      } catch (e) {
        // Firma cancellation may fail if already cancelled
      }
    }

    const updated = await prisma.agreement.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error cancelling agreement:', error);
    res.status(500).json({ error: 'Failed to cancel agreement' });
  }
});

/**
 * GET /api/agreements/:id/download
 * Download the signed document
 */
router.get('/:id/download', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        template: { select: { name: true } },
      },
    });

    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    if (agreement.status !== 'COMPLETED' && agreement.status !== 'SIGNED') {
      return res.status(400).json({ error: 'Agreement has not been signed yet' });
    }

    if (!firmaService.isConfigured()) {
      return res.status(503).json({ error: 'Firma API is not configured' });
    }

    // Download the signed document
    const pdfBuffer = await firmaService.downloadSignedDocument(agreement.firmaSigningRequestId);

    if (!pdfBuffer) {
      return res.status(404).json({ error: 'Signed document not available' });
    }

    // Set response headers for PDF download
    const filename = `${agreement.template?.name || 'Agreement'} - ${agreement.recipientName}.pdf`
      .replace(/[^a-zA-Z0-9\s\-\.]/g, '')
      .replace(/\s+/g, ' ');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error downloading agreement:', error);
    res.status(500).json({
      error: 'Failed to download agreement',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * POST /api/agreements/:id/editor-token
 * Get JWT token for Firma signing request editor (for previewing before send)
 */
router.post('/:id/editor-token', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    if (!firmaService.isConfigured()) {
      return res.status(503).json({ error: 'Firma API is not configured' });
    }

    const tokenResponse = await firmaService.generateSigningRequestEditorToken(agreement.firmaSigningRequestId);

    res.json({
      jwt: tokenResponse.jwt,
      expiresAt: tokenResponse.expires_at,
      signingRequestId: agreement.firmaSigningRequestId,
    });
  } catch (error: any) {
    console.error('Error generating signing request editor token:', error);
    res.status(500).json({
      error: 'Failed to generate editor token',
      details: error.response?.data || error.message,
    });
  }
});

// ==========================================
// Webhook Handler
// ==========================================

/**
 * POST /api/agreements/webhook
 * Handle Firma webhook events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-firma-signature'] as string;
    const signatureOld = req.headers['x-firma-signature-old'] as string | undefined;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!firmaService.verifyWebhookSignature(payload, signature, signatureOld)) {
      console.warn('[Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event: WebhookPayload = req.body;
    const { event_type, data } = event;

    console.log(`[Webhook] Received event: ${event_type}`, data);

    // Parse event type
    const { resource, action } = firmaService.parseWebhookEventType(event_type);

    if (resource !== 'signing_request') {
      // Acknowledge non-signing-request events
      return res.json({ received: true });
    }

    const signingRequestId = data.signing_request_id;
    if (!signingRequestId) {
      return res.json({ received: true });
    }

    // Find the agreement by Firma signing request ID
    const agreement = await prisma.agreement.findUnique({
      where: { firmaSigningRequestId: signingRequestId },
    });

    if (!agreement) {
      console.warn(`[Webhook] Agreement not found for signing request: ${signingRequestId}`);
      return res.json({ received: true });
    }

    // Update agreement based on event type
    const updateData: any = {};

    switch (action) {
      case 'sent':
        updateData.status = 'SENT';
        updateData.sentAt = new Date();
        break;
      case 'viewed':
        updateData.status = 'VIEWED';
        updateData.viewedAt = new Date();
        break;
      case 'signed':
        updateData.status = 'SIGNED';
        updateData.signedAt = new Date();
        break;
      case 'completed':
        updateData.status = 'COMPLETED';
        updateData.completedAt = new Date();
        if (data.signed_document_url) {
          updateData.signedDocumentUrl = data.signed_document_url;
        }
        break;
      case 'cancelled':
        updateData.status = 'CANCELLED';
        break;
      case 'expired':
        updateData.status = 'EXPIRED';
        break;
      default:
        console.log(`[Webhook] Unhandled action: ${action}`);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.agreement.update({
        where: { id: agreement.id },
        data: updateData,
      });
      console.log(`[Webhook] Updated agreement ${agreement.id} to status: ${updateData.status || 'unchanged'}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    // Always return 200 to prevent retries for processing errors
    res.json({ received: true, error: 'Processing error' });
  }
});

export default router;
