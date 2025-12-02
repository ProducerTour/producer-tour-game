import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/email.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * List all users (Admin only)
 * Supports search by email, firstName, lastName
 */
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { role, search, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (role) where.role = role;

    // Add search functionality
    if (search && typeof search === 'string' && search.length >= 2) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: { producer: true },
      orderBy: { createdAt: 'desc' },
    });

    // Remove password hash from response for security
    const sanitizedUsers = users.map(({ password, ...user }) => user);

    const total = await prisma.user.count({ where });

    res.json({ users: sanitizedUsers, total });
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
      publisherName,
      publisherIpiNumber,
      subPublisherName,
      subPublisherIpiNumber,
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
    const validRoles = ['ADMIN', 'WRITER', 'LEGAL', 'MANAGER', 'PUBLISHER', 'STAFF', 'VIEWER', 'CUSTOMER'];
    const userRole = role || 'WRITER';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: ADMIN, WRITER, LEGAL, MANAGER, PUBLISHER, STAFF, VIEWER, CUSTOMER' });
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

    // Generate secure random password if not provided (temporary, user will set their own via email)
    let finalPassword = password;
    if (!finalPassword) {
      // Generate cryptographically secure temporary password
      finalPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
    }

    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Generate password reset token for welcome email
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Create user data
    const createData: any = {
      email,
      password: hashedPassword,
      firstName,
      middleName,
      lastName,
      role: userRole,
      writerIpiNumber,
      publisherName,
      publisherIpiNumber,
      subPublisherName,
      subPublisherIpiNumber,
      canUploadStatements: canUploadStatements === true || canUploadStatements === 'true',
      resetToken,
      resetTokenExpiry,
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

    // Send welcome email with password setup link
    try {
      await emailService.sendWelcomeEmail(
        user.email,
        resetToken,
        user.firstName || 'User'
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail user creation if email fails
    }

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
      message: 'User created successfully. A welcome email with password setup instructions has been sent.',
    };

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
    const { firstName, middleName, lastName, role, email, password, writerIpiNumber, publisherName, publisherIpiNumber, subPublisherName, subPublisherIpiNumber, proAffiliation, producerName, commissionOverrideRate, canUploadStatements } = req.body;

    // Validate email format if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = ['ADMIN', 'WRITER', 'LEGAL', 'MANAGER', 'PUBLISHER', 'STAFF', 'VIEWER', 'CUSTOMER'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be one of: ADMIN, WRITER, LEGAL, MANAGER, PUBLISHER, STAFF, VIEWER, CUSTOMER' });
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
    if (publisherName !== undefined) userData.publisherName = publisherName;
    if (publisherIpiNumber !== undefined) userData.publisherIpiNumber = publisherIpiNumber;
    if (subPublisherName !== undefined) userData.subPublisherName = subPublisherName;
    if (subPublisherIpiNumber !== undefined) userData.subPublisherIpiNumber = subPublisherIpiNumber;
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
 * PATCH /api/users/preferences
 * Update current user's notification preferences
 */
router.patch('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      emailNotificationsEnabled,
      statementNotificationsEnabled,
      monthlySummaryEnabled
    } = req.body;

    // Build update data object with only provided fields
    const updateData: any = {};
    if (typeof emailNotificationsEnabled === 'boolean') {
      updateData.emailNotificationsEnabled = emailNotificationsEnabled;
    }
    if (typeof statementNotificationsEnabled === 'boolean') {
      updateData.statementNotificationsEnabled = statementNotificationsEnabled;
    }
    if (typeof monthlySummaryEnabled === 'boolean') {
      updateData.monthlySummaryEnabled = monthlySummaryEnabled;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid preferences provided' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        emailNotificationsEnabled: true,
        statementNotificationsEnabled: true,
        monthlySummaryEnabled: true
      }
    });

    res.json({
      message: 'Preferences updated successfully',
      preferences: user
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * GET /api/users/chat-settings
 * Get current user's chat settings
 */
router.get('/chat-settings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        chatSoundEnabled: true,
        chatSoundType: true,
        chatVisibilityStatus: true,
        chatShowOnlineStatus: true,
        chatShowTypingIndicator: true,
        chatMessagePreview: true,
        chatDesktopNotifications: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get chat settings error:', error);
    res.status(500).json({ error: 'Failed to get chat settings' });
  }
});

/**
 * PATCH /api/users/chat-settings
 * Update current user's chat settings
 */
router.patch('/chat-settings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      chatSoundEnabled,
      chatSoundType,
      chatVisibilityStatus,
      chatShowOnlineStatus,
      chatShowTypingIndicator,
      chatMessagePreview,
      chatDesktopNotifications
    } = req.body;

    // Build update data object with only provided fields
    const updateData: any = {};

    if (typeof chatSoundEnabled === 'boolean') {
      updateData.chatSoundEnabled = chatSoundEnabled;
    }
    if (chatSoundType !== undefined) {
      // Validate sound type
      const validSoundTypes = ['chime', 'pop', 'ding', 'bell', 'subtle'];
      if (!validSoundTypes.includes(chatSoundType)) {
        return res.status(400).json({
          error: 'Invalid sound type. Must be one of: chime, pop, ding, bell, subtle'
        });
      }
      updateData.chatSoundType = chatSoundType;
    }
    if (chatVisibilityStatus !== undefined) {
      // Validate visibility status
      const validStatuses = ['online', 'away', 'invisible', 'do_not_disturb'];
      if (!validStatuses.includes(chatVisibilityStatus)) {
        return res.status(400).json({
          error: 'Invalid visibility status. Must be one of: online, away, invisible, do_not_disturb'
        });
      }
      updateData.chatVisibilityStatus = chatVisibilityStatus;
    }
    if (typeof chatShowOnlineStatus === 'boolean') {
      updateData.chatShowOnlineStatus = chatShowOnlineStatus;
    }
    if (typeof chatShowTypingIndicator === 'boolean') {
      updateData.chatShowTypingIndicator = chatShowTypingIndicator;
    }
    if (typeof chatMessagePreview === 'boolean') {
      updateData.chatMessagePreview = chatMessagePreview;
    }
    if (typeof chatDesktopNotifications === 'boolean') {
      updateData.chatDesktopNotifications = chatDesktopNotifications;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid chat settings provided' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        chatSoundEnabled: true,
        chatSoundType: true,
        chatVisibilityStatus: true,
        chatShowOnlineStatus: true,
        chatShowTypingIndicator: true,
        chatMessagePreview: true,
        chatDesktopNotifications: true
      }
    });

    res.json({
      message: 'Chat settings updated successfully',
      settings: user
    });
  } catch (error) {
    console.error('Update chat settings error:', error);
    res.status(500).json({ error: 'Failed to update chat settings' });
  }
});

/**
 * GET /api/users/search-writers
 * Search for writers to link as collaborators in work registration
 * Searches by name, IPI number, or email
 */
router.get('/search-writers', async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = q.trim();

    // Search users with WRITER role by name, IPI, or email
    // Split search term for multi-word name searches (e.g., "nolan griffis")
    const searchParts = searchTerm.split(/\s+/).filter(p => p.length >= 2);

    // Build search conditions
    const searchConditions: any[] = [
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } },
      { writerIpiNumber: { contains: searchTerm, mode: 'insensitive' } },
      { publisherIpiNumber: { contains: searchTerm, mode: 'insensitive' } },
    ];

    // If multiple words, also search for each part individually
    if (searchParts.length > 1) {
      searchParts.forEach(part => {
        searchConditions.push({ firstName: { contains: part, mode: 'insensitive' } });
        searchConditions.push({ lastName: { contains: part, mode: 'insensitive' } });
      });
    }

    const users = await prisma.user.findMany({
      where: {
        role: 'WRITER',
        OR: searchConditions,
      },
      take: 10,
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        writerIpiNumber: true,
        publisherIpiNumber: true,
        producer: {
          select: {
            proAffiliation: true,
            producerName: true,
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });

    // Format results for collaborator linking
    const results = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
      fullName: `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.replace(/\s+/g, ' ').trim(),
      writerIpiNumber: user.writerIpiNumber || null,
      publisherIpiNumber: user.publisherIpiNumber || null,
      proAffiliation: user.producer?.proAffiliation || null,
      producerName: user.producer?.producerName || null,
    }));

    res.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Search writers error:', error);
    res.status(500).json({ error: 'Failed to search writers' });
  }
});

export default router;
