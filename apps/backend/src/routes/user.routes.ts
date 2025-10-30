import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * List all users (Admin only)
 */
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { role, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: { producer: true },
    });

    const total = await prisma.user.count({ where });

    res.json({ users, total });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * POST /api/users
 * Create new writer (Admin only)
 */
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, firstName, lastName, producerName, ipiNumber, proAffiliation } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate random password
    const randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create user with producer profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'WRITER',
        producer: {
          create: {
            producerName: producerName || `${firstName} ${lastName}`,
            ipiNumber,
            proAffiliation,
          },
        },
      },
      include: { producer: true },
    });

    // TODO: Send welcome email with password reset link

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        producer: user.producer,
      },
      temporaryPassword: randomPassword, // Only for testing, remove in production
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /api/users/:id
 * Update user (Admin only)
 */
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { firstName, lastName, role },
      include: { producer: true },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
