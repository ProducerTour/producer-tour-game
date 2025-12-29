/**
 * Push Notification Routes
 *
 * Handles Web Push subscription management and test notifications.
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { pushService } from '../services/push.service';

const router = Router();

/**
 * GET /api/push/vapid-key
 * Get the VAPID public key for client-side subscription
 */
router.get('/vapid-key', (req, res) => {
  const publicKey = pushService.getPublicKey();

  if (!publicKey) {
    return res.status(503).json({
      error: 'Push notifications not configured',
      message: 'VAPID keys are not set. Push notifications are unavailable.',
    });
  }

  res.json({ publicKey });
});

/**
 * GET /api/push/status
 * Get current push notification status for the user
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    res.json({
      isConfigured: pushService.isEnabled(),
      subscriptionCount: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error('Push status error:', error);
    res.status(500).json({ error: 'Failed to get push status' });
  }
});

/**
 * POST /api/push/subscribe
 * Subscribe a device to push notifications
 */
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { endpoint, keys, userAgent } = req.body;

    // Validate required fields
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        error: 'Invalid subscription data',
        message: 'endpoint, keys.p256dh, and keys.auth are required',
      });
    }

    // Upsert subscription (update if endpoint exists, create if not)
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId, // Update userId in case it changed (e.g., user logged out and back in)
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        lastUsedAt: new Date(),
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
      },
    });

    res.json({
      success: true,
      subscriptionId: subscription.id,
      message: 'Push subscription saved successfully',
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

/**
 * POST /api/push/unsubscribe
 * Unsubscribe a device from push notifications
 */
router.post('/unsubscribe', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body;

    if (endpoint) {
      // Delete specific subscription
      await prisma.pushSubscription.deleteMany({
        where: { endpoint },
      });
    }

    res.json({
      success: true,
      message: 'Push subscription removed',
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

/**
 * DELETE /api/push/subscriptions
 * Remove all push subscriptions for the current user
 */
router.delete('/subscriptions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await prisma.pushSubscription.deleteMany({
      where: { userId },
    });

    res.json({
      success: true,
      deletedCount: result.count,
      message: `Removed ${result.count} push subscription(s)`,
    });
  } catch (error) {
    console.error('Delete subscriptions error:', error);
    res.status(500).json({ error: 'Failed to remove subscriptions' });
  }
});

/**
 * POST /api/push/test
 * Send a test push notification to the current user
 */
router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!pushService.isEnabled()) {
      return res.status(503).json({
        error: 'Push not configured',
        message: 'Push notifications are not configured on the server',
      });
    }

    const success = await pushService.sendTestNotification(userId);

    if (success) {
      res.json({
        success: true,
        message: 'Test notification sent! Check your device.',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No active subscriptions found. Make sure notifications are enabled.',
      });
    }
  } catch (error) {
    console.error('Test push error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
