/**
 * OneSignal Push Notification Service
 *
 * Handles push notifications for:
 * - Compliance reminders (due dates approaching)
 * - Quest unlocks and completions
 * - Important corporate structure alerts
 */

import * as OneSignal from '@onesignal/node-onesignal';
import { prisma } from '../lib/prisma';

// ============================================================================
// Types
// ============================================================================

export interface NotificationPayload {
  title: string;
  message: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface ComplianceReminderPayload {
  complianceItemId: string;
  entityName: string;
  itemTitle: string;
  dueDate: Date;
  daysUntilDue: number;
}

export interface QuestNotificationPayload {
  questId: string;
  questTitle: string;
  entityName: string;
  xpReward?: number;
  type: 'unlocked' | 'completed' | 'reminder';
}

// ============================================================================
// Service Class
// ============================================================================

class OneSignalService {
  private client: OneSignal.DefaultApi | null = null;
  private appId: string;

  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID || '';

    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (apiKey && this.appId) {
      const configuration = OneSignal.createConfiguration({
        restApiKey: apiKey,
      });
      this.client = new OneSignal.DefaultApi(configuration);
    }
  }

  isEnabled(): boolean {
    return this.client !== null && !!this.appId;
  }

  /**
   * Send a notification to specific users
   */
  async sendToUsers(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    if (!this.isEnabled()) {
      console.log('[OneSignal] Service not configured, skipping notification');
      return { success: false, error: 'OneSignal not configured' };
    }

    try {
      const notification = new OneSignal.Notification();
      notification.app_id = this.appId;
      notification.include_external_user_ids = userIds;
      notification.contents = { en: payload.message };
      notification.headings = { en: payload.title };

      if (payload.url) {
        notification.url = payload.url;
      }

      if (payload.data) {
        notification.data = payload.data;
      }

      const response = await this.client!.createNotification(notification);

      return {
        success: true,
        notificationId: response.id,
      };
    } catch (error) {
      console.error('[OneSignal] Send notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send notification to all users (or segment)
   */
  async sendToAll(
    payload: NotificationPayload,
    segment: string = 'Subscribed Users'
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    if (!this.isEnabled()) {
      console.log('[OneSignal] Service not configured, skipping notification');
      return { success: false, error: 'OneSignal not configured' };
    }

    try {
      const notification = new OneSignal.Notification();
      notification.app_id = this.appId;
      notification.included_segments = [segment];
      notification.contents = { en: payload.message };
      notification.headings = { en: payload.title };

      if (payload.url) {
        notification.url = payload.url;
      }

      if (payload.data) {
        notification.data = payload.data;
      }

      const response = await this.client!.createNotification(notification);

      return {
        success: true,
        notificationId: response.id,
      };
    } catch (error) {
      console.error('[OneSignal] Send to all error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send compliance reminder notification
   */
  async sendComplianceReminder(
    userIds: string[],
    payload: ComplianceReminderPayload
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    const urgencyPrefix =
      payload.daysUntilDue <= 0
        ? '🚨 OVERDUE: '
        : payload.daysUntilDue <= 7
          ? '⚠️ Due Soon: '
          : '📅 Reminder: ';

    const dueText =
      payload.daysUntilDue <= 0
        ? `Overdue by ${Math.abs(payload.daysUntilDue)} days`
        : payload.daysUntilDue === 0
          ? 'Due today!'
          : `Due in ${payload.daysUntilDue} days`;

    return this.sendToUsers(userIds, {
      title: `${urgencyPrefix}${payload.entityName}`,
      message: `${payload.itemTitle} - ${dueText}`,
      url: `/corporate-structure?compliance=${payload.complianceItemId}`,
      data: {
        type: 'compliance_reminder',
        complianceItemId: payload.complianceItemId,
        entityName: payload.entityName,
        daysUntilDue: payload.daysUntilDue,
      },
    });
  }

  /**
   * Send quest notification (unlock, completion, etc.)
   */
  async sendQuestNotification(
    userIds: string[],
    payload: QuestNotificationPayload
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    let title: string;
    let message: string;

    switch (payload.type) {
      case 'unlocked':
        title = `🔓 New Quest Unlocked!`;
        message = `"${payload.questTitle}" is now available for ${payload.entityName}`;
        break;
      case 'completed':
        title = `✅ Quest Complete!`;
        message = `"${payload.questTitle}" completed! +${payload.xpReward || 0} XP`;
        break;
      case 'reminder':
        title = `📋 Quest Reminder`;
        message = `Continue working on "${payload.questTitle}" for ${payload.entityName}`;
        break;
      default:
        title = `Quest Update`;
        message = payload.questTitle;
    }

    return this.sendToUsers(userIds, {
      title,
      message,
      url: `/corporate-structure?quest=${payload.questId}`,
      data: {
        type: 'quest_notification',
        questId: payload.questId,
        entityName: payload.entityName,
        notificationType: payload.type,
      },
    });
  }

  /**
   * Schedule daily compliance check (should be called by a cron job)
   * Sends reminders for items due within their reminder period
   */
  async processComplianceReminders(): Promise<{
    processed: number;
    sent: number;
    errors: string[];
  }> {
    const results = { processed: 0, sent: 0, errors: [] as string[] };

    if (!this.isEnabled()) {
      return results;
    }

    try {
      const now = new Date();

      // Find compliance items that need reminders
      const complianceItems = await prisma.complianceItem.findMany({
        where: {
          status: { in: ['UPCOMING', 'DUE_SOON'] },
          dueDate: { not: null },
        },
        include: {
          entity: {
            select: { name: true, shortName: true },
          },
        },
      });

      // Get all admin users to notify
      const admins = await prisma.user.findMany({
        where: { role: 'admin' },
        select: { id: true },
      });

      const adminIds = admins.map((a) => a.id);

      for (const item of complianceItems) {
        if (!item.dueDate) continue;

        const daysUntilDue = Math.ceil(
          (item.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        results.processed++;

        // Send reminder if within reminder window or overdue
        if (daysUntilDue <= item.reminderDays) {
          const result = await this.sendComplianceReminder(adminIds, {
            complianceItemId: item.id,
            entityName: item.entity.name,
            itemTitle: item.title,
            dueDate: item.dueDate,
            daysUntilDue,
          });

          if (result.success) {
            results.sent++;
          } else if (result.error) {
            results.errors.push(`${item.title}: ${result.error}`);
          }
        }
      }
    } catch (error) {
      console.error('[OneSignal] Process compliance reminders error:', error);
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return results;
  }

  /**
   * Check service status
   */
  async checkStatus(): Promise<{
    enabled: boolean;
    hasAppId: boolean;
    hasApiKey: boolean;
    message: string;
  }> {
    const hasAppId = !!this.appId;
    const hasApiKey = !!process.env.ONESIGNAL_REST_API_KEY;

    if (!hasAppId || !hasApiKey) {
      return {
        enabled: false,
        hasAppId,
        hasApiKey,
        message: `OneSignal not configured. Missing: ${!hasAppId ? 'ONESIGNAL_APP_ID' : ''} ${!hasApiKey ? 'ONESIGNAL_REST_API_KEY' : ''}`.trim(),
      };
    }

    return {
      enabled: true,
      hasAppId: true,
      hasApiKey: true,
      message: 'OneSignal push notification service is configured',
    };
  }
}

export const oneSignalService = new OneSignalService();
