import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Validation schemas
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  isPublic: z.boolean().optional().default(true),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
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

    // If no feed items, return mock data for testing
    if (feedItems.length === 0 && offset === 0) {
      const mockFeedItems = [
        {
          id: 'mock-1',
          userId: currentUserId,
          activityType: 'PLACEMENT',
          title: 'New Placement on Album',
          description: 'My beat was placed on a new album!',
          placementId: null,
          achievementId: null,
          listingId: null,
          metadata: null,
          imageUrl: null,
          isPublic: true,
          likeCount: 12,
          commentCount: 3,
          isLiked: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          user: {
            id: currentUserId,
            firstName: (req.user as any).firstName || 'User',
            lastName: (req.user as any).lastName || '',
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: null
          },
          listing: null
        },
        {
          id: 'mock-2',
          userId: currentUserId,
          activityType: 'ACHIEVEMENT',
          title: 'Achievement Unlocked!',
          description: 'Earned the "Rising Star" achievement',
          placementId: null,
          achievementId: null,
          listingId: null,
          metadata: null,
          imageUrl: null,
          isPublic: true,
          likeCount: 24,
          commentCount: 5,
          isLiked: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          user: {
            id: currentUserId,
            firstName: (req.user as any).firstName || 'User',
            lastName: (req.user as any).lastName || '',
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'SILVER' }
          },
          listing: null
        },
        {
          id: 'mock-3',
          userId: currentUserId,
          activityType: 'MARKETPLACE_LISTING',
          title: 'New Marketplace Listing',
          description: 'Listed a new beat pack',
          placementId: null,
          achievementId: null,
          listingId: 'mock-listing-1',
          metadata: null,
          imageUrl: null,
          isPublic: true,
          likeCount: 8,
          commentCount: 2,
          isLiked: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          user: {
            id: currentUserId,
            firstName: (req.user as any).firstName || 'User',
            lastName: (req.user as any).lastName || '',
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'GOLD' }
          },
          listing: {
            id: 'mock-listing-1',
            title: 'Dark Trap Beat Pack',
            coverImageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
            price: 29.99,
            slug: 'dark-trap-beat-pack'
          }
        },
        {
          id: 'mock-4',
          userId: currentUserId,
          activityType: 'TOUR_MILES_EARNED',
          title: 'Tour Miles Earned',
          description: 'Earned 500 Tour Miles for completing a challenge',
          placementId: null,
          achievementId: null,
          listingId: null,
          metadata: { miles: 500 },
          imageUrl: null,
          isPublic: true,
          likeCount: 15,
          commentCount: 1,
          isLiked: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          user: {
            id: currentUserId,
            firstName: (req.user as any).firstName || 'User',
            lastName: (req.user as any).lastName || '',
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'BRONZE' }
          },
          listing: null
        },
        {
          id: 'mock-5',
          userId: currentUserId,
          activityType: 'TIER_UP',
          title: 'Tier Upgrade!',
          description: 'Advanced to Gold tier',
          placementId: null,
          achievementId: null,
          listingId: null,
          metadata: { newTier: 'GOLD', previousTier: 'SILVER' },
          imageUrl: null,
          isPublic: true,
          likeCount: 42,
          commentCount: 7,
          isLiked: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          user: {
            id: currentUserId,
            firstName: (req.user as any).firstName || 'User',
            lastName: (req.user as any).lastName || '',
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'GOLD' }
          },
          listing: null
        }
      ];

      return res.json({
        items: mockFeedItems,
        pagination: {
          limit,
          offset,
          total: mockFeedItems.length,
          hasMore: false
        }
      });
    }

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

    // If no admin posts yet, return mock data
    if (adminPosts.length === 0) {
      const mockPosts = [
        {
          id: 'admin-welcome',
          userId: 'system',
          activityType: 'ANNOUNCEMENT',
          title: 'Welcome to Producer Tour!',
          description: 'Connect with fellow producers, share your work, and grow your network in our community.',
          imageUrl: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          user: {
            id: 'system',
            firstName: 'Producer',
            lastName: 'Tour',
            profilePhotoUrl: null,
            profileSlug: 'producer-tour'
          }
        },
        {
          id: 'admin-marketplace',
          userId: 'system',
          activityType: 'UPDATE',
          title: 'Social Marketplace Now Live',
          description: 'List and sell your beats, samples, and presets directly to the community. Start earning today!',
          imageUrl: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          user: {
            id: 'system',
            firstName: 'Producer',
            lastName: 'Tour',
            profilePhotoUrl: null,
            profileSlug: 'producer-tour'
          }
        },
        {
          id: 'admin-tip',
          userId: 'system',
          activityType: 'TIP',
          title: 'Pro Tip: Complete Your Profile',
          description: 'Profiles with photos and bio get 3x more engagement. Head to settings to update yours!',
          imageUrl: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
          user: {
            id: 'system',
            firstName: 'Producer',
            lastName: 'Tour',
            profilePhotoUrl: null,
            profileSlug: 'producer-tour'
          }
        }
      ];

      return res.json({
        items: mockPosts.slice(0, limit)
      });
    }

    res.json({
      items: adminPosts
    });
  } catch (error) {
    console.error('Get admin posts error:', error);
    res.status(500).json({ error: 'Failed to fetch admin posts' });
  }
});

export default router;
