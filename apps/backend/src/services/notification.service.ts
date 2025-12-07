/**
 * Notification Service
 *
 * Handles creating, fetching, and managing in-app notifications.
 * Integrates with socket.io for real-time delivery.
 */

import { prisma } from '../lib/prisma';
import { NotificationType } from '../generated/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

interface NotificationWithActor {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actorId: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  actor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
  } | null;
}

class NotificationService {
  /**
   * Create a new notification
   */
  async create(params: CreateNotificationParams): Promise<NotificationWithActor> {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        actorId: params.actorId,
        entityType: params.entityType,
        entityId: params.entityId,
        actionUrl: params.actionUrl,
      },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    return notification;
  }

  /**
   * Get notifications for a user
   */
  async getForUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ) {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      hasMore: offset + notifications.length < total,
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return result.count > 0;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: string): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  // ========================================
  // Helper methods for common notification types
  // ========================================

  /**
   * Create a new follower notification
   */
  async notifyNewFollower(followedUserId: string, followerUser: { id: string; firstName?: string | null; lastName?: string | null }) {
    const followerName = [followerUser.firstName, followerUser.lastName].filter(Boolean).join(' ') || 'Someone';

    return this.create({
      userId: followedUserId,
      type: 'NEW_FOLLOWER',
      title: 'New Follower',
      message: `${followerName} started following you`,
      actorId: followerUser.id,
      actionUrl: `/user/${followerUser.id}`,
    });
  }

  /**
   * Create a follow request notification (for private accounts)
   */
  async notifyFollowRequest(targetUserId: string, requesterUser: { id: string; firstName?: string | null; lastName?: string | null }) {
    const requesterName = [requesterUser.firstName, requesterUser.lastName].filter(Boolean).join(' ') || 'Someone';

    return this.create({
      userId: targetUserId,
      type: 'FOLLOW_REQUEST',
      title: 'Follow Request',
      message: `${requesterName} wants to follow you`,
      actorId: requesterUser.id,
      actionUrl: '/my-profile?tab=requests',
    });
  }

  /**
   * Create a follow accepted notification
   */
  async notifyFollowAccepted(requesterId: string, acceptedByUser: { id: string; firstName?: string | null; lastName?: string | null }) {
    const userName = [acceptedByUser.firstName, acceptedByUser.lastName].filter(Boolean).join(' ') || 'Someone';

    return this.create({
      userId: requesterId,
      type: 'FOLLOW_ACCEPTED',
      title: 'Follow Request Accepted',
      message: `${userName} accepted your follow request`,
      actorId: acceptedByUser.id,
      actionUrl: `/user/${acceptedByUser.id}`,
    });
  }

  /**
   * Create a new message notification
   */
  async notifyNewMessage(recipientId: string, senderUser: { id: string; firstName?: string | null; lastName?: string | null }, preview?: string) {
    const senderName = [senderUser.firstName, senderUser.lastName].filter(Boolean).join(' ') || 'Someone';
    const messagePreview = preview ? `: "${preview.substring(0, 50)}${preview.length > 50 ? '...' : ''}"` : '';

    return this.create({
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title: 'New Message',
      message: `${senderName} sent you a message${messagePreview}`,
      actorId: senderUser.id,
      actionUrl: '/chat',
    });
  }

  /**
   * Create an achievement unlocked notification
   */
  async notifyAchievementUnlocked(userId: string, achievementName: string, achievementId?: string) {
    return this.create({
      userId,
      type: 'ACHIEVEMENT_UNLOCKED',
      title: 'Achievement Unlocked! 🏆',
      message: `You earned the "${achievementName}" achievement!`,
      entityType: 'achievement',
      entityId: achievementId,
      actionUrl: '/tour-miles',
    });
  }

  /**
   * Create a level up notification
   */
  async notifyLevelUp(userId: string, newLevel: number, tierName: string) {
    return this.create({
      userId,
      type: 'LEVEL_UP',
      title: 'Level Up! 🎉',
      message: `Congratulations! You reached Level ${newLevel} - ${tierName}`,
      actionUrl: '/tour-miles',
    });
  }

  /**
   * Create a placement update notification
   */
  async notifyPlacementUpdate(userId: string, placementTitle: string, status: string, placementId: string) {
    const statusMessages: Record<string, string> = {
      APPROVED: 'has been approved',
      DENIED: 'was not approved',
      TRACKING: 'is now being tracked',
      COMPLETED: 'has been completed',
      DOCUMENTS_REQUESTED: 'requires additional documents',
    };

    return this.create({
      userId,
      type: 'PLACEMENT_UPDATE',
      title: 'Placement Update',
      message: `Your placement "${placementTitle}" ${statusMessages[status] || 'has been updated'}`,
      entityType: 'placement',
      entityId: placementId,
      actionUrl: `/placements/${placementId}`,
    });
  }

  /**
   * Create a payment received notification
   */
  async notifyPaymentReceived(userId: string, amount: number, paymentId?: string) {
    return this.create({
      userId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received 💰',
      message: `You received a payment of $${amount.toFixed(2)}`,
      entityType: 'payment',
      entityId: paymentId,
      actionUrl: '/dashboard',
    });
  }

  /**
   * Create a referral signup notification
   */
  async notifyReferralSignup(referrerId: string, referredUser: { firstName?: string | null; lastName?: string | null }) {
    const referredName = [referredUser.firstName, referredUser.lastName].filter(Boolean).join(' ') || 'Someone';

    return this.create({
      userId: referrerId,
      type: 'REFERRAL_SIGNUP',
      title: 'New Referral! 🎁',
      message: `${referredName} signed up using your referral code!`,
      actionUrl: '/tour-miles',
    });
  }

  /**
   * Create a milestone reached notification
   */
  async notifyMilestoneReached(userId: string, milestoneName: string, milestoneValue: string) {
    return this.create({
      userId,
      type: 'MILESTONE_REACHED',
      title: 'Milestone Reached! 🌟',
      message: `Congratulations! You've ${milestoneName}: ${milestoneValue}`,
      actionUrl: '/tour-miles',
    });
  }

  /**
   * Create a system announcement notification
   */
  async createSystemAnnouncement(userId: string, title: string, message: string, actionUrl?: string) {
    return this.create({
      userId,
      type: 'SYSTEM_ANNOUNCEMENT',
      title,
      message,
      actionUrl,
    });
  }

  /**
   * Broadcast a system announcement to all users or specific roles
   */
  async broadcastAnnouncement(title: string, message: string, options: { roles?: string[]; actionUrl?: string } = {}) {
    const where = options.roles?.length ? { role: { in: options.roles as any } } : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    const notifications = await Promise.all(
      users.map(user =>
        this.create({
          userId: user.id,
          type: 'SYSTEM_ANNOUNCEMENT',
          title,
          message,
          actionUrl: options.actionUrl,
        })
      )
    );

    return { count: notifications.length };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
