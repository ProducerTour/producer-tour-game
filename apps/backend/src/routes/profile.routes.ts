import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for profile photo uploads
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_PROFILE_PHOTO_SIZE || '5242880') // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

// Upload profile photo
router.post('/photo', authenticate, profileUpload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user!.id;

    // Get old photo URL to delete later
    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhotoUrl: true }
    });

    // Generate file URL
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const photoUrl = `${baseUrl}/uploads/profiles/${req.file.filename}`;

    // Update user profile
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: photoUrl },
      select: {
        id: true,
        profilePhotoUrl: true,
        firstName: true,
        lastName: true,
      }
    });

    // Delete old photo file if exists
    if (oldUser?.profilePhotoUrl) {
      const oldFilename = oldUser.profilePhotoUrl.split('/').pop();
      const oldPath = path.join(process.env.UPLOAD_DIR || './uploads/profiles', oldFilename || '');
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload profile photo' });
  }
});

// Delete profile photo
router.delete('/photo', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhotoUrl: true }
    });

    if (user?.profilePhotoUrl) {
      const filename = user.profilePhotoUrl.split('/').pop();
      const filePath = path.join(process.env.UPLOAD_DIR || './uploads/profiles', filename || '');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: null }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete profile photo error:', error);
    res.status(500).json({ error: 'Failed to delete profile photo' });
  }
});

// Update profile (Writer Tour Hub fields)
router.put('/hub', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      bio,
      location,
      website,
      spotifyArtistUrl,
      instagramHandle,
      twitterHandle,
      linkedinUrl,
      isPublicProfile,
      profileSlug
    } = req.body;

    // Validate slug if provided
    if (profileSlug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(profileSlug)) {
        return res.status(400).json({
          error: 'Profile slug can only contain lowercase letters, numbers, and hyphens'
        });
      }

      // Check if slug is taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { profileSlug }
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'This profile URL is already taken' });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        bio,
        location,
        website,
        spotifyArtistUrl,
        instagramHandle,
        twitterHandle,
        linkedinUrl,
        isPublicProfile,
        profileSlug: profileSlug || null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePhotoUrl: true,
        bio: true,
        location: true,
        website: true,
        spotifyArtistUrl: true,
        instagramHandle: true,
        twitterHandle: true,
        linkedinUrl: true,
        isPublicProfile: true,
        profileSlug: true,
      }
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get current user's full profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profilePhotoUrl: true,
        bio: true,
        location: true,
        website: true,
        spotifyArtistUrl: true,
        instagramHandle: true,
        twitterHandle: true,
        linkedinUrl: true,
        isPublicProfile: true,
        profileSlug: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get public writer profile by slug
router.get('/writer/:slug', async (req, res: Response) => {
  try {
    const { slug } = req.params;

    const user = await prisma.user.findUnique({
      where: { profileSlug: slug },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePhotoUrl: true,
        bio: true,
        location: true,
        website: true,
        spotifyArtistUrl: true,
        instagramHandle: true,
        twitterHandle: true,
        linkedinUrl: true,
        isPublicProfile: true,
        profileSlug: true,
        createdAt: true,
        // Include public stats
        placements: {
          where: { status: 'PLACED' },
          select: {
            id: true,
            songTitle: true,
            artistName: true,
            releaseDate: true,
            syncType: true,
          },
          take: 10,
          orderBy: { releaseDate: 'desc' }
        },
        gamificationPoints: {
          select: {
            totalPoints: true,
            currentTier: true,
            tourMiles: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Writer not found' });
    }

    if (!user.isPublicProfile) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
