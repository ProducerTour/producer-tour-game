import { Router, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Allowed MIME types for profile photos
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Upload profile photo with comprehensive error handling
// Uses express-fileupload (already configured globally in index.ts)
router.post('/photo', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check if files were uploaded
    if (!req.files || !req.files.photo) {
      console.error('Profile photo upload: No file in request');
      return res.status(400).json({
        error: 'No file selected',
        message: 'Please select an image file to upload.'
      });
    }

    const photo = req.files.photo as UploadedFile;
    const userId = req.user!.id;

    console.log(`Profile photo upload: User ${userId}, file size: ${photo.size} bytes, mimetype: ${photo.mimetype}`);

    // Validate file type
    if (!ALLOWED_MIMES.includes(photo.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only JPEG, PNG, GIF, and WebP images are allowed.'
      });
    }

    // Validate file size
    if (photo.size > MAX_FILE_SIZE) {
      const sizeMB = (photo.size / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        error: 'File too large',
        message: `File is ${sizeMB}MB. Maximum size is 2MB. Please compress your image.`
      });
    }

    // Convert file buffer to base64 data URL
    const base64 = photo.data.toString('base64');
    const photoUrl = `data:${photo.mimetype};base64,${base64}`;
    console.log(`Profile photo upload: Base64 length: ${photoUrl.length} chars`);

    // Update user profile with base64 data URL
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

    console.log(`Profile photo upload: Success for user ${userId}`);
    res.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Profile photo upload error:', error);
    console.error('Error stack:', error.stack);

    if (error.code === 'P2002') {
      return res.status(500).json({
        error: 'Database conflict',
        message: 'A database error occurred. Please try again.'
      });
    }

    res.status(500).json({
      error: 'Save failed',
      message: 'Failed to save the profile photo. Please try again.'
    });
  }
});

// Delete profile photo
router.delete('/photo', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

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

// Upload cover banner with comprehensive error handling
const BANNER_MAX_SIZE = 5 * 1024 * 1024; // 5MB for larger banner images
router.post('/banner', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check if files were uploaded
    if (!req.files || !req.files.banner) {
      console.error('Cover banner upload: No file in request');
      return res.status(400).json({
        error: 'No file selected',
        message: 'Please select an image file to upload.'
      });
    }

    const banner = req.files.banner as UploadedFile;
    const userId = req.user!.id;

    console.log(`Cover banner upload: User ${userId}, file size: ${banner.size} bytes, mimetype: ${banner.mimetype}`);

    // Validate file type
    if (!ALLOWED_MIMES.includes(banner.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only JPEG, PNG, GIF, and WebP images are allowed.'
      });
    }

    // Validate file size (larger limit for banners)
    if (banner.size > BANNER_MAX_SIZE) {
      const sizeMB = (banner.size / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        error: 'File too large',
        message: `File is ${sizeMB}MB. Maximum size is 5MB. Please compress your image.`
      });
    }

    // Convert file buffer to base64 data URL
    const base64 = banner.data.toString('base64');
    const bannerUrl = `data:${banner.mimetype};base64,${base64}`;
    console.log(`Cover banner upload: Base64 length: ${bannerUrl.length} chars`);

    // Update user profile with base64 data URL
    const user = await prisma.user.update({
      where: { id: userId },
      data: { coverBannerUrl: bannerUrl },
      select: {
        id: true,
        coverBannerUrl: true,
        firstName: true,
        lastName: true,
      }
    });

    console.log(`Cover banner upload: Success for user ${userId}`);
    res.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Cover banner upload error:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      error: 'Save failed',
      message: 'Failed to save the cover banner. Please try again.'
    });
  }
});

// Delete cover banner
router.delete('/banner', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.user.update({
      where: { id: userId },
      data: { coverBannerUrl: null }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete cover banner error:', error);
    res.status(500).json({ error: 'Failed to delete cover banner' });
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
      tiktokHandle,
      soundcloudUrl,
      youtubeChannelUrl,
      appleMusicUrl,
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
        tiktokHandle,
        soundcloudUrl,
        youtubeChannelUrl,
        appleMusicUrl,
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
        tiktokHandle: true,
        soundcloudUrl: true,
        youtubeChannelUrl: true,
        appleMusicUrl: true,
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

// Check if a profile slug is available
router.get('/slug/:slug/check', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user!.id;

    // Validate format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.json({ available: false, reason: 'invalid_format' });
    }

    // Check if taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { profileSlug: slug },
      select: { id: true }
    });

    // Available if not taken or taken by the current user
    const available = !existingUser || existingUser.id === userId;
    return res.json({ available, reason: available ? null : 'taken' });
  } catch (error) {
    console.error('Check slug availability error:', error);
    res.status(500).json({ error: 'Failed to check slug availability' });
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
        coverBannerUrl: true,
        bio: true,
        location: true,
        website: true,
        spotifyArtistUrl: true,
        instagramHandle: true,
        twitterHandle: true,
        linkedinUrl: true,
        tiktokHandle: true,
        soundcloudUrl: true,
        youtubeChannelUrl: true,
        appleMusicUrl: true,
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

// Get current user's full profile with stats (for Tour Hub page)
router.get('/hub/me', authenticate, async (req: AuthRequest, res: Response) => {
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
        coverBannerUrl: true,
        bio: true,
        location: true,
        website: true,
        spotifyArtistUrl: true,
        instagramHandle: true,
        twitterHandle: true,
        linkedinUrl: true,
        tiktokHandle: true,
        soundcloudUrl: true,
        youtubeChannelUrl: true,
        appleMusicUrl: true,
        isPublicProfile: true,
        profileSlug: true,
        createdAt: true,
        placements: {
          where: { status: { in: ['APPROVED', 'TRACKING', 'COMPLETED'] } },
          select: {
            id: true,
            title: true,
            artist: true,
            releaseDate: true,
          },
          take: 10,
          orderBy: { releaseDate: 'desc' }
        },
        gamificationPoints: {
          select: {
            points: true,
            totalEarned: true,
            currentStreak: true,
            longestStreak: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate stats
    const placementCount = await prisma.placement.count({
      where: { userId, status: { in: ['APPROVED', 'TRACKING', 'COMPLETED'] } }
    });

    const followersCount = await prisma.follow.count({
      where: { followingId: userId }
    });

    const followingCount = await prisma.follow.count({
      where: { followerId: userId }
    });

    // Calculate total sales from marketplace (completed transactions have paidAt set)
    const sales = await prisma.marketplaceTransaction.aggregate({
      where: {
        sellerId: userId,
        paidAt: { not: null }
      },
      _sum: { netAmount: true }
    });

    const stats = {
      placementCount,
      followers: followersCount,
      following: followingCount,
      totalSales: sales._sum.netAmount || 0
    };

    res.json({ writer: { ...user, stats } });
  } catch (error) {
    console.error('Get profile with stats error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get writer profile by user ID
router.get('/hub/id/:userId', async (req, res: Response) => {
  try {
    const { userId } = req.params;

    // Check for auth token (optional)
    let isAuthenticated = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      isAuthenticated = true;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profilePhotoUrl: true,
        coverBannerUrl: true,
        bio: true,
        location: true,
        website: true,
        spotifyArtistUrl: true,
        instagramHandle: true,
        twitterHandle: true,
        linkedinUrl: true,
        tiktokHandle: true,
        soundcloudUrl: true,
        youtubeChannelUrl: true,
        appleMusicUrl: true,
        isPublicProfile: true,
        profileSlug: true,
        createdAt: true,
        placements: {
          where: { status: { in: ['APPROVED', 'TRACKING', 'COMPLETED'] } },
          select: {
            id: true,
            title: true,
            artist: true,
            releaseDate: true,
          },
          take: 10,
          orderBy: { releaseDate: 'desc' }
        },
        gamificationPoints: {
          select: {
            points: true,
            totalEarned: true,
            currentStreak: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only block private profiles for non-authenticated users
    if (!user.isPublicProfile && !isAuthenticated) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    // Calculate stats
    const placementCount = await prisma.placement.count({
      where: { userId: user.id, status: { in: ['APPROVED', 'TRACKING', 'COMPLETED'] } }
    });

    const followersCount = await prisma.follow.count({
      where: { followingId: user.id }
    });

    const followingCount = await prisma.follow.count({
      where: { followerId: user.id }
    });

    const stats = {
      placementCount,
      followers: followersCount,
      following: followingCount,
    };

    res.json({ ...user, stats });
  } catch (error) {
    console.error('Get profile by ID error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get writer profile by slug (public or authenticated)
router.get('/hub/:slug', async (req, res: Response) => {
  try {
    const { slug } = req.params;

    // Check for auth token (optional)
    let isAuthenticated = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      isAuthenticated = true; // User is logged in
    }

    const user = await prisma.user.findUnique({
      where: { profileSlug: slug },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profilePhotoUrl: true,
        coverBannerUrl: true,
        bio: true,
        location: true,
        website: true,
        spotifyArtistUrl: true,
        instagramHandle: true,
        twitterHandle: true,
        linkedinUrl: true,
        tiktokHandle: true,
        soundcloudUrl: true,
        youtubeChannelUrl: true,
        appleMusicUrl: true,
        isPublicProfile: true,
        profileSlug: true,
        createdAt: true,
        // Include public stats
        placements: {
          where: { status: { in: ['APPROVED', 'TRACKING', 'COMPLETED'] } },
          select: {
            id: true,
            title: true,
            artist: true,
            releaseDate: true,
          },
          take: 10,
          orderBy: { releaseDate: 'desc' }
        },
        gamificationPoints: {
          select: {
            points: true,
            totalEarned: true,
            currentStreak: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Writer not found' });
    }

    // Only block private profiles for non-authenticated users
    if (!user.isPublicProfile && !isAuthenticated) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    // Calculate stats
    const placementCount = await prisma.placement.count({
      where: { userId: user.id, status: { in: ['APPROVED', 'TRACKING', 'COMPLETED'] } }
    });

    const followersCount = await prisma.follow.count({
      where: { followingId: user.id }
    });

    const followingCount = await prisma.follow.count({
      where: { followerId: user.id }
    });

    const stats = {
      placementCount,
      followers: followersCount,
      following: followingCount,
    };

    res.json({ ...user, stats });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
