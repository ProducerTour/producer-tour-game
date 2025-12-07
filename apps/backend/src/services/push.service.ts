/**
 * Push Notification Service
 *
 * Handles sending Web Push notifications to user devices.
 * Supports multiple subscriptions per user (different devices/browsers).
 */

import webpush from 'web-push';
import { prisma } from '../lib/prisma';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: 'message' | 'follow' | 'like' | 'comment' | 'contact_request' | 'test';
    [key: string]: any;
  };
}

class PushService {
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('⚠️  Push service not configured. Set VAPID environment variables to enable push notifications.');
      return;
    }

    try {
      webpush.setVapidDetails(
        VAPID_SUBJECT || 'mailto:support@producertour.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );

      this.isConfigured = true;
      console.log('✅ Push notification service configured');
    } catch (error) {
      console.error('❌ Failed to configure push service:', error);
    }
  }

  /**
   * Get the VAPID public key for client subscription
   */
  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  /**
   * Check if push service is configured
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Send push notification to all subscribed devices of a user
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
    if (!this.isConfigured) {
      return { sent: 0, failed: 0 };
    }

    // Check user preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        chatDesktopNotifications: true,
        pushSubscriptions: true,
      },
    });

    // Respect user's notification preference
    if (!user?.chatDesktopNotifications) {
      return { sent: 0, failed: 0 };
    }

    const subscriptions = user.pushSubscriptions || [];
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );

        // Update last used timestamp
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {
          // Ignore update errors
        });

        sent++;
      } catch (error: any) {
        console.error(`Push notification failed for subscription ${sub.id}:`, error.message);

        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          }).catch(() => {
            // Ignore delete errors
          });
        }

        failed++;
      }
    }

    return { sent, failed };
  }

  // ============================================
  // Convenience methods for different notification types
  // ============================================

  /**
   * Send notification for new chat message
   */
  async sendMessageNotification(
    userId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: `Message from ${senderName}`,
      body: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
      icon: '/favicon-192x192.png',
      badge: '/favicon-48x48.png',
      tag: `message-${conversationId}`, // Group messages from same conversation
      data: {
        url: `/my-profile`, // Opens profile page where chat widget is accessible
        type: 'message',
        conversationId,
      },
    });
  }

  /**
   * Send notification for new follower
   */
  async sendFollowNotification(
    userId: string,
    followerName: string,
    followerSlug?: string
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: 'New Follower',
      body: `${followerName} started following you`,
      icon: '/favicon-192x192.png',
      badge: '/favicon-48x48.png',
      tag: 'follow-notification',
      data: {
        url: followerSlug ? `/user/${followerSlug}` : '/my-profile',
        type: 'follow',
      },
    });
  }

  /**
   * Send notification for like on user's post
   */
  async sendLikeNotification(
    userId: string,
    likerName: string,
    postTitle: string,
    postId: string
  ): Promise<void> {
    const truncatedTitle = postTitle.substring(0, 50) + (postTitle.length > 50 ? '...' : '');

    await this.sendToUser(userId, {
      title: 'New Like',
      body: `${likerName} liked your post "${truncatedTitle}"`,
      icon: '/favicon-192x192.png',
      badge: '/favicon-48x48.png',
      tag: `like-${postId}`,
      data: {
        url: '/my-profile',
        type: 'like',
        postId,
      },
    });
  }

  /**
   * Send notification for comment on user's post
   */
  async sendCommentNotification(
    userId: string,
    commenterName: string,
    postTitle: string,
    postId: string,
    commentPreview?: string
  ): Promise<void> {
    const truncatedTitle = postTitle.substring(0, 30) + (postTitle.length > 30 ? '...' : '');

    await this.sendToUser(userId, {
      title: `${commenterName} commented`,
      body: commentPreview
        ? `"${commentPreview.substring(0, 80)}${commentPreview.length > 80 ? '...' : ''}"`
        : `New comment on "${truncatedTitle}"`,
      icon: '/favicon-192x192.png',
      badge: '/favicon-48x48.png',
      tag: `comment-${postId}`,
      data: {
        url: '/my-profile',
        type: 'comment',
        postId,
      },
    });
  }

  /**
   * Send notification for contact request
   */
  async sendContactRequestNotification(
    userId: string,
    requesterName: string,
    requesterSlug?: string
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Contact Request',
      body: `${requesterName} wants to connect with you`,
      icon: '/favicon-192x192.png',
      badge: '/favicon-48x48.png',
      tag: 'contact-request',
      data: {
        url: requesterSlug ? `/user/${requesterSlug}` : '/my-profile',
        type: 'contact_request',
      },
    });
  }

  /**
   * Send a test notification (for settings page)
   */
  async sendTestNotification(userId: string): Promise<boolean> {
    const result = await this.sendToUser(userId, {
      title: 'Test Notification',
      body: 'Push notifications are working! 🎉',
      icon: '/favicon-192x192.png',
      badge: '/favicon-48x48.png',
      tag: 'test',
      data: {
        url: '/settings?section=chat',
        type: 'test',
      },
    });

    return result.sent > 0;
  }
}

// Export singleton instance
export const pushService = new PushService();
