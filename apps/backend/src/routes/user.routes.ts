import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

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
    const { email, firstName, lastName, producerName, ipiNumber, proAffiliation, commissionOverrideRate } = req.body;

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
    const createData: any = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'WRITER',
      ipiNumber,
      producer: {
        create: {
          producerName: producerName || `${firstName} ${lastName}`,
          ipiNumber,
          proAffiliation,
        },
      },
    };
    if (commissionOverrideRate !== undefined) {
      createData.commissionOverrideRate = commissionOverrideRate;
    }

    const user = (await prisma.user.create({
      data: createData,
      include: { producer: true },
    })) as any;

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
    const { firstName, lastName, role, email, password, ipiNumber, proAffiliation, producerName, commissionOverrideRate } = req.body;

    // Build user update payload
    const userData: any = {};
    if (firstName !== undefined) userData.firstName = firstName;
    if (lastName !== undefined) userData.lastName = lastName;
    if (role !== undefined) userData.role = role;
    if (email !== undefined) userData.email = email;
    if (ipiNumber !== undefined) userData.ipiNumber = ipiNumber;
    if (commissionOverrideRate !== undefined) userData.commissionOverrideRate = commissionOverrideRate === null || commissionOverrideRate === '' ? null : commissionOverrideRate;
    if (password) {
      userData.password = await bcrypt.hash(password, 10);
    }

    const [updatedUser] = (await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: userData as any,
      }),
      // Upsert producer profile if producer fields are provided
      ...(proAffiliation !== undefined || producerName !== undefined || ipiNumber !== undefined
        ? [
            prisma.producer.upsert({
              where: { userId: id },
              update: {
                producerName: producerName,
                ipiNumber: ipiNumber,
                proAffiliation: proAffiliation,
              },
              create: {
                userId: id,
                producerName: producerName || 'Writer',
                ipiNumber: ipiNumber,
                proAffiliation: proAffiliation,
              },
            }),
          ]
        : []),
    ])) as any;

    const result = await prisma.user.findUnique({ where: { id }, include: { producer: true } });
    res.json({ user: result });
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
