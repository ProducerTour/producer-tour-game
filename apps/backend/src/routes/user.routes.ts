import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
 * Create new user (Admin only)
 */
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      producerName,
      ipiNumber,
      proAffiliation,
      commissionOverrideRate
    } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate role
    const validRoles = ['ADMIN', 'WRITER'];
    const userRole = role || 'WRITER';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be ADMIN or WRITER' });
    }

    // Validate commission rate if provided
    if (commissionOverrideRate !== undefined && commissionOverrideRate !== null && commissionOverrideRate !== '') {
      const rate = parseFloat(commissionOverrideRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({ error: 'Commission rate must be between 0 and 100' });
      }
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate secure random password if not provided
    let finalPassword = password;
    let generatedPassword: string | undefined;
    if (!finalPassword) {
      // Generate cryptographically secure random password (16 characters)
      generatedPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
      finalPassword = generatedPassword;
    }

    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Create user data
    const createData: any = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: userRole,
      ipiNumber,
    };

    // Add commission override if provided
    if (commissionOverrideRate !== undefined && commissionOverrideRate !== null && commissionOverrideRate !== '') {
      createData.commissionOverrideRate = parseFloat(commissionOverrideRate);
    }

    // Only create producer profile for WRITER role
    if (userRole === 'WRITER') {
      createData.producer = {
        create: {
          producerName: producerName || `${firstName || ''} ${lastName || ''}`.trim() || 'Writer',
          ipiNumber,
          proAffiliation: proAffiliation || 'OTHER',
        },
      };
    }

    const user = (await prisma.user.create({
      data: createData,
      include: { producer: true },
    })) as any;

    // TODO: Send welcome email with password reset link

    // Prepare response
    const response: any = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        producer: user.producer,
      },
    };

    // Only include generated password in development or if explicitly generated
    if (generatedPassword && process.env.NODE_ENV !== 'production') {
      response.temporaryPassword = generatedPassword;
    }

    res.status(201).json(response);
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

    // Validate email format if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = ['ADMIN', 'WRITER'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be ADMIN or WRITER' });
      }
    }

    // Validate commission rate if provided
    if (commissionOverrideRate !== undefined && commissionOverrideRate !== null && commissionOverrideRate !== '') {
      const rate = parseFloat(commissionOverrideRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({ error: 'Commission rate must be between 0 and 100' });
      }
    }

    // Build user update payload
    const userData: any = {};
    if (firstName !== undefined) userData.firstName = firstName;
    if (lastName !== undefined) userData.lastName = lastName;
    if (role !== undefined) userData.role = role;
    if (email !== undefined) userData.email = email;
    if (ipiNumber !== undefined) userData.ipiNumber = ipiNumber;
    if (commissionOverrideRate !== undefined) {
      userData.commissionOverrideRate = commissionOverrideRate === null || commissionOverrideRate === '' ? null : parseFloat(commissionOverrideRate);
    }
    if (password) {
      userData.password = await bcrypt.hash(password, 10);
    }

    // Get current user to check role
    const currentUser = await prisma.user.findUnique({ where: { id } });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newRole = role || currentUser.role;

    const [updatedUser] = (await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: userData as any,
      }),
      // Upsert producer profile only if user is/will be a WRITER
      ...(newRole === 'WRITER' && (proAffiliation !== undefined || producerName !== undefined || ipiNumber !== undefined)
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
                proAffiliation: proAffiliation || 'OTHER',
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
