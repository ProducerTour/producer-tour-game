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
      middleName,
      lastName,
      role,
      producerName,
      writerIpiNumber,
      publisherIpiNumber,
      proAffiliation,
      commissionOverrideRate,
      canUploadStatements
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
    const validRoles = ['ADMIN', 'WRITER', 'LEGAL', 'MANAGER', 'PUBLISHER', 'STAFF', 'VIEWER'];
    const userRole = role || 'WRITER';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: ADMIN, WRITER, LEGAL, MANAGER, PUBLISHER, STAFF, VIEWER' });
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
      middleName,
      lastName,
      role: userRole,
      writerIpiNumber,
      publisherIpiNumber,
      canUploadStatements: canUploadStatements === true || canUploadStatements === 'true',
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
          writerIpiNumber,
          publisherIpiNumber,
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
    const { firstName, middleName, lastName, role, email, password, writerIpiNumber, publisherIpiNumber, proAffiliation, producerName, commissionOverrideRate, canUploadStatements } = req.body;

    // Validate email format if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = ['ADMIN', 'WRITER', 'LEGAL', 'MANAGER', 'PUBLISHER', 'STAFF', 'VIEWER'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be one of: ADMIN, WRITER, LEGAL, MANAGER, PUBLISHER, STAFF, VIEWER' });
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
    if (middleName !== undefined) userData.middleName = middleName;
    if (lastName !== undefined) userData.lastName = lastName;
    if (role !== undefined) userData.role = role;
    if (email !== undefined) userData.email = email;
    if (writerIpiNumber !== undefined) userData.writerIpiNumber = writerIpiNumber;
    if (publisherIpiNumber !== undefined) userData.publisherIpiNumber = publisherIpiNumber;
    if (canUploadStatements !== undefined) userData.canUploadStatements = canUploadStatements === true || canUploadStatements === 'true';
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
      ...(newRole === 'WRITER' && (proAffiliation !== undefined || producerName !== undefined || writerIpiNumber !== undefined || publisherIpiNumber !== undefined)
        ? [
            prisma.producer.upsert({
              where: { userId: id },
              update: {
                producerName: producerName,
                writerIpiNumber: writerIpiNumber,
                publisherIpiNumber: publisherIpiNumber,
                proAffiliation: proAffiliation,
              },
              create: {
                userId: id,
                producerName: producerName || 'Writer',
                writerIpiNumber: writerIpiNumber,
                publisherIpiNumber: publisherIpiNumber,
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

/**
 * POST /api/users/bulk-reset-passwords
 * Reset passwords for all writers to a default password (Admin only)
 */
router.post('/bulk-reset-passwords', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { password = 'password', role = 'WRITER' } = req.body;

    // Get all users with the specified role
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true, email: true },
    });

    if (users.length === 0) {
      return res.json({ message: `No ${role} users found`, count: 0 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update all users
    await prisma.user.updateMany({
      where: { role },
      data: { password: hashedPassword },
    });

    res.json({
      message: `Successfully reset passwords for ${users.length} ${role} users`,
      count: users.length,
      users: users.map(u => u.email),
    });
  } catch (error) {
    console.error('Bulk password reset error:', error);
    res.status(500).json({ error: 'Failed to reset passwords' });
  }
});

export default router;
