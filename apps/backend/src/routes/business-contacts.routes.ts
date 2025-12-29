import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/contacts
 * Get all business contacts (Admin only)
 */
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { category, search, limit = '100', offset = '0' } = req.query;

    const where: any = {};

    if (category && category !== 'all') {
      where.category = (category as string).toUpperCase();
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { contactName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const contacts = await prisma.businessContact.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { companyName: 'asc' },
    });

    const total = await prisma.businessContact.count({ where });

    res.json({ contacts, total });
  } catch (error) {
    console.error('Error fetching business contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * GET /api/contacts/:id
 * Get a single business contact (Admin only)
 */
router.get('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.businessContact.findUnique({
      where: { id },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Error fetching business contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

/**
 * POST /api/contacts
 * Create a new business contact (Admin only)
 */
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      category,
      notes,
    } = req.body;

    if (!companyName || !contactName || !email) {
      return res.status(400).json({ error: 'Company name, contact name, and email are required' });
    }

    const contact = await prisma.businessContact.create({
      data: {
        companyName,
        contactName,
        email,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        country: country || 'USA',
        category: category ? category.toUpperCase() : 'OTHER',
        notes: notes || null,
      },
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating business contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * PUT /api/contacts/:id
 * Update a business contact (Admin only)
 */
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      category,
      notes,
    } = req.body;

    const existing = await prisma.businessContact.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = await prisma.businessContact.update({
      where: { id },
      data: {
        companyName: companyName ?? existing.companyName,
        contactName: contactName ?? existing.contactName,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        address: address ?? existing.address,
        city: city ?? existing.city,
        state: state ?? existing.state,
        zipCode: zipCode ?? existing.zipCode,
        country: country ?? existing.country,
        category: category ? category.toUpperCase() : existing.category,
        notes: notes ?? existing.notes,
      },
    });

    res.json(contact);
  } catch (error) {
    console.error('Error updating business contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

/**
 * DELETE /api/contacts/:id
 * Delete a business contact (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.businessContact.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await prisma.businessContact.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    console.error('Error deleting business contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
