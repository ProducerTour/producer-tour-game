import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/email.service';
import { initializeUserGamification, recordReferralSignup, awardPoints } from '../services/gamification.service';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['ADMIN', 'WRITER', 'LEGAL', 'CUSTOMER']).optional(),
  referralCode: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
});

const impersonateSchema = z.object({
  userId: z.string(),
});

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { producer: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
    const jwtOptions: SignOptions = { expiresIn };
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      jwtOptions
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePhotoUrl: user.profilePhotoUrl,
        writerIpiNumber: user.producer?.writerIpiNumber,
        publisherIpiNumber: user.producer?.publisherIpiNumber,
        producer: user.producer,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register
 * Register new user (admin only in production)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user - default to CUSTOMER role for public signups
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'CUSTOMER',
      },
    });

    // Initialize gamification for the new user
    try {
      await initializeUserGamification(user.id);

      // If a referral code was provided, record the referral signup
      if (data.referralCode) {
        await recordReferralSignup(data.referralCode, user.id);
      }
    } catch (gamificationError) {
      console.error('Failed to initialize gamification:', gamificationError);
      // Continue registration even if gamification fails
    }

    // Generate token
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
    const jwtOptions: SignOptions = { expiresIn };
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      jwtOptions
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        writerIpiNumber: null,
        publisherIpiNumber: null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset - generates token and sends email (public route)
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists for security
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName || 'User'
      );
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue - don't expose email failure to user
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token (public route)
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token not expired
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Send confirmation email
    try {
      await emailService.sendPasswordResetConfirmation(
        user.email,
        user.firstName || 'User'
      );
    } catch (emailError) {
      console.error('Failed to send password reset confirmation:', emailError);
      // Continue - password was successfully reset
    }

    res.json({
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { producer: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper: Check if profile is complete
 */
function isProfileComplete(user: any): boolean {
  // Basic fields required for all users
  if (!user.firstName || !user.lastName) return false;

  // For writers, also require PRO affiliation and IPI
  if (user.role === 'WRITER') {
    if (!user.producer?.proAffiliation || user.producer?.proAffiliation === 'OTHER') return false;
    if (!user.producer?.writerIpiNumber) return false;
  }

  return true;
}

/**
 * PUT /api/auth/me
 * Update current user's profile
 */
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      firstName,
      middleName,
      lastName,
      writerIpiNumber,
      publisherName,
      publisherIpiNumber,
      subPublisherName,
      subPublisherIpiNumber,
      proAffiliation,
      producerName,
    } = req.body;

    // Get current user to check if profile was incomplete before
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { producer: true },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const wasIncomplete = !isProfileComplete(currentUser);

    // Build user update payload
    const userData: any = {};
    if (firstName !== undefined) userData.firstName = firstName;
    if (middleName !== undefined) userData.middleName = middleName;
    if (lastName !== undefined) userData.lastName = lastName;
    if (writerIpiNumber !== undefined) userData.writerIpiNumber = writerIpiNumber;
    if (publisherName !== undefined) userData.publisherName = publisherName;
    if (publisherIpiNumber !== undefined) userData.publisherIpiNumber = publisherIpiNumber;
    if (subPublisherName !== undefined) userData.subPublisherName = subPublisherName;
    if (subPublisherIpiNumber !== undefined) userData.subPublisherIpiNumber = subPublisherIpiNumber;

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: userData,
    });

    // Update producer profile if user is a WRITER
    if (currentUser.role === 'WRITER' && (proAffiliation !== undefined || producerName !== undefined || writerIpiNumber !== undefined || publisherIpiNumber !== undefined)) {
      await prisma.producer.upsert({
        where: { userId },
        update: {
          producerName: producerName,
          writerIpiNumber: writerIpiNumber,
          publisherIpiNumber: publisherIpiNumber,
          proAffiliation: proAffiliation,
        },
        create: {
          userId,
          producerName: producerName || `${firstName || currentUser.firstName || ''} ${lastName || currentUser.lastName || ''}`.trim() || 'Writer',
          writerIpiNumber: writerIpiNumber,
          publisherIpiNumber: publisherIpiNumber,
          proAffiliation: proAffiliation || 'OTHER',
        },
      });
    }

    // Get updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { producer: true },
    });

    // Check if profile is now complete and award points
    const isNowComplete = isProfileComplete(updatedUser);
    if (wasIncomplete && isNowComplete && currentUser.role !== 'ADMIN') {
      try {
        // Check if already awarded
        const existingAward = await prisma.gamificationEvent.findFirst({
          where: {
            userId,
            eventType: 'PROFILE_COMPLETE',
          },
        });

        if (!existingAward) {
          await awardPoints(
            userId,
            'PROFILE_COMPLETE',
            50,
            'Completed profile setup'
          );
          console.log(`🎯 Profile completion points awarded to user ${userId}`);
        }
      } catch (gamError) {
        console.error('Gamification profile complete error:', gamError);
      }
    }

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/auth/impersonate
 * Generate an impersonation token to view as another user (Admin only)
 */
router.post('/impersonate', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = impersonateSchema.parse(req.body);
    const adminId = req.user!.id;

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { producer: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create impersonation token (1 hour expiration)
    const token = jwt.sign(
      {
        userId: targetUser.id,  // The user being impersonated
        email: targetUser.email,
        role: targetUser.role,
        adminId: adminId,  // The actual admin user
        isImpersonating: true,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        profilePhotoUrl: targetUser.profilePhotoUrl,
        writerIpiNumber: targetUser.producer?.writerIpiNumber,
        publisherIpiNumber: targetUser.producer?.publisherIpiNumber,
        producer: targetUser.producer,
      },
      isImpersonating: true,
      adminId: adminId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Impersonate error:', error);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
});

export default router;
