import { Router, Response } from 'express';
import { z } from 'zod';
import { UploadedFile } from 'express-fileupload';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { pushService } from '../services/push.service';

// Media upload constants
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
const POST_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB for post images
const POST_AUDIO_MAX_SIZE = 20 * 1024 * 1024; // 20MB for audio files

const router = Router();

// Validation schemas
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  // Allow both regular URLs and base64 data URLs
  imageUrl: z.string().refine(
    (val) => val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'Must be a valid URL or data URL' }
  ).optional().nullable(),
  // Audio URL for audio posts
  audioUrl: z.string().refine(
    (val) => val.startsWith('data:audio/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'Must be a valid audio URL or data URL' }
  ).optional().nullable(),
  isPublic: z.boolean().optional().default(true),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

// POST /api/feed/upload-image - Upload an image for a post
router.post('/upload-image', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check if files were uploaded
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        error: 'No file selected',
        message: 'Please select an image file to upload.'
      });
    }

    const image = req.files.image as UploadedFile;
    const userId = req.user!.id;

    console.log(`Post image upload: User ${userId}, file size: ${image.size} bytes, mimetype: ${image.mimetype}`);

    // Validate file type
    if (!ALLOWED_IMAGE_MIMES.includes(image.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only JPEG, PNG, GIF, and WebP images are allowed.'
      });
    }

    // Validate file size
    if (image.size > POST_IMAGE_MAX_SIZE) {
      const sizeMB = (image.size / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        error: 'File too large',
        message: `File is ${sizeMB}MB. Maximum size is 5MB. Please compress your image.`
      });
    }

    // Convert file buffer to base64 data URL
    const base64 = image.data.toString('base64');
    const imageUrl = `data:${image.mimetype};base64,${base64}`;

    console.log(`Post image upload: Success, base64 length: ${imageUrl.length} chars`);
    res.json({
      success: true,
      imageUrl
    });
  } catch (error: any) {
    console.error('Post image upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to upload the image. Please try again.'
    });
  }
});

// POST /api/feed/upload-audio - Upload an audio file for a post
router.post('/upload-audio', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check if files were uploaded
    if (!req.files || !req.files.audio) {
      return res.status(400).json({
        error: 'No file selected',
        message: 'Please select an audio file to upload.'
      });
    }

    const audio = req.files.audio as UploadedFile;
    const userId = req.user!.id;

    console.log(`Post audio upload: User ${userId}, file size: ${audio.size} bytes, mimetype: ${audio.mimetype}`);

    // Validate file type
    if (!ALLOWED_AUDIO_MIMES.includes(audio.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only MP3 and WAV audio files are allowed.'
      });
    }

    // Validate file size
    if (audio.size > POST_AUDIO_MAX_SIZE) {
      const sizeMB = (audio.size / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        error: 'File too large',
        message: `File is ${sizeMB}MB. Maximum size is 20MB. Please compress your audio.`
      });
    }

    // Convert file buffer to base64 data URL
    const base64 = audio.data.toString('base64');
    const audioUrl = `data:${audio.mimetype};base64,${base64}`;

    console.log(`Post audio upload: Success, base64 length: ${audioUrl.length} chars`);
    res.json({
      success: true,
      audioUrl
    });
  } catch (error: any) {
    console.error('Post audio upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to upload the audio. Please try again.'
    });
  }
});

// POST /api/feed - Create a new post
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createPostSchema.parse(req.body);

    const post = await prisma.activityFeedItem.create({
      data: {
        userId,
        activityType: 'POST',
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        isPublic: data.isPublic,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
            gamificationPoints: {
              select: {
                tier: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// DELETE /api/feed/:id - Delete a post
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: feedItemId } = req.params;

    // Find the post
    const feedItem = await prisma.activityFeedItem.findUnique({
      where: { id: feedItemId },
    });

    if (!feedItem) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check ownership (owner or admin can delete)
    if (feedItem.userId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Delete the post (cascades to likes/comments via FK)
    await prisma.activityFeedItem.delete({
      where: { id: feedItemId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PUT /api/feed/:id - Edit a post
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: feedItemId } = req.params;
    const data = createPostSchema.partial().parse(req.body);

    const feedItem = await prisma.activityFeedItem.findUnique({
      where: { id: feedItemId },
    });

    if (!feedItem) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Only owner can edit
    if (feedItem.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    const updated = await prisma.activityFeedItem.update({
      where: { id: feedItemId },
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
            gamificationPoints: {
              select: {
                tier: true,
              },
            },
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Edit post error:', error);
    res.status(500).json({ error: 'Failed to edit post' });
  }
});

// POST /api/feed/:id/like - Like a feed item (idempotent)
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: feedItemId } = req.params;

    // Check if feed item exists
    const feedItem = await prisma.activityFeedItem.findUnique({
      where: { id: feedItemId },
    });

    if (!feedItem) {
      return res.status(404).json({ error: 'Feed item not found' });
    }

    // Check if already liked
    const existingLike = await prisma.feedLike.findUnique({
      where: {
        userId_feedItemId: {
          userId,
          feedItemId,
        },
      },
    });

    // If already liked, return success (idempotent)
    if (existingLike) {
      return res.json({ success: true, alreadyLiked: true });
    }

    // Create like and increment count in a transaction
    const [like] = await prisma.$transaction([
      prisma.feedLike.create({
        data: {
          userId,
          feedItemId,
        },
      }),
      prisma.activityFeedItem.update({
        where: { id: feedItemId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    // Send push notification to post owner (if not liking own post)
    if (feedItem.userId !== userId) {
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const likerName = `${liker?.firstName || ''} ${liker?.lastName || ''}`.trim() || 'Someone';

      pushService.sendLikeNotification(
        feedItem.userId,
        likerName,
        feedItem.title || 'your post',
        feedItemId
      ).catch((err) => {
        console.error('Failed to send like push notification:', err);
      });
    }

    res.json({ success: true, like });
  } catch (error: any) {
    // Handle race condition - if another request created the like, return success
    if (error.code === 'P2002') {
      return res.json({ success: true, alreadyLiked: true });
    }
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// DELETE /api/feed/:id/like - Unlike a feed item (idempotent)
router.delete('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: feedItemId } = req.params;

    // Check if like exists
    const existingLike = await prisma.feedLike.findUnique({
      where: {
        userId_feedItemId: {
          userId,
          feedItemId,
        },
      },
    });

    // If already unliked, return success (idempotent)
    if (!existingLike) {
      return res.json({ success: true, alreadyUnliked: true });
    }

    // Delete like and decrement count in a transaction
    await prisma.$transaction([
      prisma.feedLike.delete({
        where: {
          userId_feedItemId: {
            userId,
            feedItemId,
          },
        },
      }),
      prisma.activityFeedItem.update({
        where: { id: feedItemId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Unlike error:', error);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
});

// GET /api/feed/:id/comments - Get comments for a feed item
router.get('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id: feedItemId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const comments = await prisma.feedComment.findMany({
      where: { feedItemId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.feedComment.count({
      where: { feedItemId },
    });

    res.json({
      comments,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/feed/:id/comment - Add a comment to a feed item
router.post('/:id/comment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: feedItemId } = req.params;
    const { content } = createCommentSchema.parse(req.body);

    // Check if feed item exists
    const feedItem = await prisma.activityFeedItem.findUnique({
      where: { id: feedItemId },
    });

    if (!feedItem) {
      return res.status(404).json({ error: 'Feed item not found' });
    }

    // Create comment and increment count in a transaction
    const [comment] = await prisma.$transaction([
      prisma.feedComment.create({
        data: {
          userId,
          feedItemId,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
              profileSlug: true,
            },
          },
        },
      }),
      prisma.activityFeedItem.update({
        where: { id: feedItemId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // Send push notification to post owner (if not commenting on own post)
    if (feedItem.userId !== userId) {
      const commenterName = `${comment.user.firstName || ''} ${comment.user.lastName || ''}`.trim() || 'Someone';

      pushService.sendCommentNotification(
        feedItem.userId,
        commenterName,
        feedItem.title || 'your post',
        feedItemId,
        content
      ).catch((err) => {
        console.error('Failed to send comment push notification:', err);
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// DELETE /api/feed/comment/:commentId - Delete a comment
router.delete('/comment/:commentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { commentId } = req.params;

    // Get comment to check ownership and get feedItemId
    const comment = await prisma.feedComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user owns the comment or is admin
    if (comment.userId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Delete comment and decrement count in a transaction
    await prisma.$transaction([
      prisma.feedComment.delete({
        where: { id: commentId },
      }),
      prisma.activityFeedItem.update({
        where: { id: comment.feedItemId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// GET /api/feed/activity - Paginated social feed (network activity)
// Returns activity from followed users + own activity
// Optional userId query param to filter by specific user
router.get('/activity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const filterUserId = req.query.userId as string | undefined;

    let userIdsToShow: string[];

    if (filterUserId) {
      // Filter by specific user (for "My Posts" view)
      userIdsToShow = [filterUserId];
    } else {
      // Get users that the current user follows (for "Network Feed" view)
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true }
      });

      const followingIds = following.map(f => f.followingId);

      // Include own activity + activity from followed users
      userIdsToShow = [currentUserId, ...followingIds];
    }

    // Fetch activity feed items
    const feedItems = await prisma.activityFeedItem.findMany({
      where: {
        userId: { in: userIdsToShow },
        isPublic: true
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
            gamificationPoints: {
              select: {
                tier: true
              }
            }
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            price: true,
            slug: true
          }
        },
        likes: {
          where: { userId: currentUserId },
          select: { id: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Transform to include isLiked flag
    const transformedItems = feedItems.map(item => ({
      ...item,
      isLiked: item.likes.length > 0,
      likes: undefined // Remove likes array from response
    }));

    // Get total count for pagination
    const totalCount = await prisma.activityFeedItem.count({
      where: {
        userId: { in: userIdsToShow },
        isPublic: true
      }
    });

    res.json({
      items: transformedItems,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// GET /api/feed/user/:userId - User-specific timeline
// Returns all public activity for a specific user
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isPublicProfile: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If viewing own profile, show all activity. Otherwise, only show public activity
    const isOwnProfile = req.user!.id === userId;

    const feedItems = await prisma.activityFeedItem.findMany({
      where: {
        userId,
        ...(isOwnProfile ? {} : { isPublic: true })
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
            gamificationPoints: {
              select: {
                tier: true
              }
            }
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            price: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.activityFeedItem.count({
      where: {
        userId,
        ...(isOwnProfile ? {} : { isPublic: true })
      }
    });

    res.json({
      items: feedItems,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get user feed error:', error);
    res.status(500).json({ error: 'Failed to fetch user feed' });
  }
});

// POST /api/feed/follow/:userId - Follow a user
router.post('/follow/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const { userId: targetUserId } = req.params;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create follow relationship
    const follow = await prisma.follow.create({
      data: {
        followerId: currentUserId,
        followingId: targetUserId
      }
    });

    // Send push notification to the followed user
    const follower = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { firstName: true, lastName: true, profileSlug: true },
    });
    const followerName = `${follower?.firstName || ''} ${follower?.lastName || ''}`.trim() || 'Someone';

    pushService.sendFollowNotification(
      targetUserId,
      followerName,
      follower?.profileSlug || undefined
    ).catch((err) => {
      console.error('Failed to send follow push notification:', err);
    });

    res.json({ success: true, follow });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Already following this user' });
    }
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /api/feed/unfollow/:userId - Unfollow a user
router.delete('/unfollow/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const { userId: targetUserId } = req.params;

    await prisma.follow.deleteMany({
      where: {
        followerId: currentUserId,
        followingId: targetUserId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /api/feed/followers/:userId - Get user's followers
router.get('/followers/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
            gamificationPoints: {
              select: {
                tier: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.follow.count({
      where: { followingId: userId }
    });

    res.json({
      followers: followers.map(f => f.follower),
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /api/feed/following/:userId - Get users that user is following
router.get('/following/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
            gamificationPoints: {
              select: {
                tier: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.follow.count({
      where: { followerId: userId }
    });

    res.json({
      following: following.map(f => f.following),
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// GET /api/feed/admin-posts - Get admin/official announcements and posts
router.get('/admin-posts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    // Get posts from admin users
    const adminPosts = await prisma.activityFeedItem.findMany({
      where: {
        user: {
          role: 'ADMIN'
        },
        isPublic: true,
        activityType: {
          in: ['ANNOUNCEMENT', 'UPDATE', 'TIP', 'NEWS']
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    res.json({
      items: adminPosts
    });
  } catch (error) {
    console.error('Get admin posts error:', error);
    res.status(500).json({ error: 'Failed to fetch admin posts' });
  }
});

// GET /api/feed/single/:id - Get a single post by ID (for shared links)
router.get('/single/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;

    const post = await prisma.activityFeedItem.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
            gamificationPoints: {
              select: {
                tier: true,
              },
            },
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            price: true,
            slug: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if post is public
    if (!post.isPublic) {
      return res.status(403).json({ error: 'This post is private' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get single post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// GET /api/feed/og/:id - Serve HTML with OG meta tags for social sharing
router.get('/og/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;
    const frontendUrl = process.env.FRONTEND_URL || 'https://producertour.com';

    // Fetch the post
    const post = await prisma.activityFeedItem.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    if (!post) {
      // Redirect to frontend if post not found
      return res.redirect(`${frontendUrl}/my-profile`);
    }

    const userName = post.user.firstName && post.user.lastName
      ? `${post.user.firstName} ${post.user.lastName}`
      : 'Producer';

    const title = post.title || 'Post on Producer Tour';
    const description = post.description?.substring(0, 200) || `${userName} shared a post on Producer Tour`;
    const postUrl = `${frontendUrl}/post/${id}`;

    // Use post image if available, otherwise use a default or user's profile photo
    let ogImage = post.imageUrl;
    if (!ogImage || ogImage.startsWith('data:')) {
      // For base64 images or no image, use a default OG image
      ogImage = `${frontendUrl}/og-default.png`;
    }

    // Serve HTML with OG meta tags
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} - Producer Tour</title>

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="Producer Tour">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${postUrl}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${ogImage}">

  <!-- Redirect to the actual post page -->
  <meta http-equiv="refresh" content="0;url=${postUrl}">
  <link rel="canonical" href="${postUrl}">
</head>
<body>
  <p>Redirecting to <a href="${postUrl}">Producer Tour</a>...</p>
  <script>window.location.href = "${postUrl}";</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('OG meta error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://producertour.com';
    res.redirect(`${frontendUrl}/my-profile`);
  }
});

// GET /api/feed/search - Search for users, posts, and content
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    const type = req.query.type as string || 'all'; // 'all', 'users', 'posts'
    const limit = parseInt(req.query.limit as string) || 10;
    const currentUserId = req.user!.id;

    if (!query || query.length < 2) {
      return res.json({ users: [], posts: [], query: '' });
    }

    const results: { users: any[]; posts: any[] } = { users: [], posts: [] };

    // Search users
    if (type === 'all' || type === 'users') {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { profileSlug: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
          isPublicProfile: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          profileSlug: true,
          bio: true,
          gamificationPoints: {
            select: { tier: true },
          },
          followers: {
            where: { followerId: currentUserId },
            select: { id: true },
          },
        },
        take: limit,
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' },
        ],
      });

      results.users = users.map(u => ({
        ...u,
        isFollowing: u.followers.length > 0,
        followers: undefined,
      }));
    }

    // Search posts (by title, description, or content keywords)
    if (type === 'all' || type === 'posts') {
      const posts = await prisma.activityFeedItem.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          isPublic: true,
          activityType: 'POST',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
              profileSlug: true,
            },
          },
          likes: {
            where: { userId: currentUserId },
            select: { id: true },
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      results.posts = posts.map(p => ({
        ...p,
        isLiked: p.likes.length > 0,
        likes: undefined,
      }));
    }

    res.json({ ...results, query });
  } catch (error) {
    console.error('Social search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// GET /api/feed/notifications - Get social notifications for current user
// (new followers, likes on your posts, comments on your posts, messages)
router.get('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get various notification types in parallel
    const [newFollowers, recentLikes, recentComments] = await Promise.all([
      // New followers (people who followed the current user)
      prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
              profileSlug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recent likes on user's posts
      prisma.feedLike.findMany({
        where: {
          feedItem: { userId: userId },
          NOT: { userId: userId }, // Exclude self-likes
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
              profileSlug: true,
            },
          },
          feedItem: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recent comments on user's posts
      prisma.feedComment.findMany({
        where: {
          feedItem: { userId: userId },
          NOT: { userId: userId }, // Exclude self-comments
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
              profileSlug: true,
            },
          },
          feedItem: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Transform notifications into a unified format
    const notifications: any[] = [];

    // Add follow notifications
    newFollowers.forEach(f => {
      notifications.push({
        id: `follow-${f.id}`,
        type: 'follow',
        user: f.follower,
        message: `${f.follower.firstName || 'Someone'} ${f.follower.lastName || ''} followed you`.trim(),
        createdAt: f.createdAt,
      });
    });

    // Add like notifications
    recentLikes.forEach(l => {
      notifications.push({
        id: `like-${l.id}`,
        type: 'like',
        user: l.user,
        feedItem: l.feedItem,
        message: `${l.user.firstName || 'Someone'} ${l.user.lastName || ''} liked your post "${l.feedItem.title?.substring(0, 30) || 'post'}${(l.feedItem.title?.length || 0) > 30 ? '...' : ''}"`.trim(),
        createdAt: l.createdAt,
      });
    });

    // Add comment notifications
    recentComments.forEach(c => {
      notifications.push({
        id: `comment-${c.id}`,
        type: 'comment',
        user: c.user,
        feedItem: c.feedItem,
        content: c.content,
        message: `${c.user.firstName || 'Someone'} ${c.user.lastName || ''} commented on your post "${c.feedItem.title?.substring(0, 30) || 'post'}${(c.feedItem.title?.length || 0) > 30 ? '...' : ''}"`.trim(),
        createdAt: c.createdAt,
      });
    });

    // Sort all notifications by date
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const paginatedNotifications = notifications.slice(offset, offset + limit);

    res.json({
      notifications: paginatedNotifications,
      pagination: {
        limit,
        offset,
        total: notifications.length,
        hasMore: offset + limit < notifications.length,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Helper function to escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default router;
