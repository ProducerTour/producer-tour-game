/**
 * Email Service
 *
 * Handles sending emails for payment notifications and other system events.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '../lib/prisma';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface PaymentNotificationData {
  userId?: string; // Optional: for checking notification preferences
  writerName: string;
  writerEmail: string;
  proType: string;
  statementFilename: string;
  grossRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  netPayment: number;
  songCount: number;
  paymentDate: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string;
  private isConfigured: boolean = false;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@producertour.com';
    this.initialize();
  }

  private initialize() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
    } = process.env;

    // Check if SMTP is configured
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('⚠️  Email service not configured. Set SMTP environment variables to enable email notifications.');
      this.isConfigured = false;
      return;
    }

    try {
      const config: any = {
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587'),
        secure: SMTP_SECURE === 'true', // true for 465, false for other ports (use false for SendGrid port 587)
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        // Debugging
        logger: true,
        debug: true,
        // Connection settings
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 30000, // 30 seconds
      };

      // Try to create transporter - if it fails, just disable the service
      try {
        this.transporter = nodemailer.createTransport(config);
        this.isConfigured = true;
        console.log('✅ Email service configured successfully');
      } catch (createError) {
        console.warn('⚠️  Email service initialization failed - emails will be disabled:', (createError as Error).message);
        this.isConfigured = false;
      }
    } catch (error) {
      console.warn('⚠️  Email service not available:', (error as Error).message);
      this.isConfigured = false;
    }
  }

  /**
   * Sleep helper for delays between operations
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send email with retry logic and exponential backoff
   */
  private async sendEmailWithRetry(
    mailOptions: any,
    recipientEmail: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured');
      return false;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        // Log detailed SMTP response for debugging
        console.log(`📧 Email sent to ${recipientEmail}:`, {
          messageId: info.messageId,
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected,
          pending: info.pending,
          attempt: attempt > 1 ? attempt : 'first'
        });
        return true;
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt) {
          console.error(`❌ Failed to send email to ${recipientEmail} after ${maxRetries} attempts:`, error.message);
          return false;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`⚠️  Email to ${recipientEmail} - attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms... (${error.message})`);
        await this.sleep(delay);
      }
    }

    return false;
  }

  /**
   * Send payment processed notification to writer with retry logic
   */
  async sendPaymentNotification(data: PaymentNotificationData): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping payment notification');
      return false;
    }

    const mailOptions = {
      from: this.fromEmail,
      to: data.writerEmail,
      replyTo: this.fromEmail,
      subject: `Payment Processed - ${data.proType} Royalties`,
      html: this.generatePaymentEmailHTML(data),
      text: this.generatePaymentEmailText(data),
      envelope: {
        from: this.fromEmail,
        to: data.writerEmail,
      },
    };

    const sent = await this.sendEmailWithRetry(mailOptions, data.writerEmail);

    if (sent) {
      console.log(`✅ Payment notification sent to ${data.writerEmail}`);
    }

    return sent;
  }

  /**
   * Send bulk payment notifications with delays to prevent rate limiting
   * Checks notification preferences before sending
   */
  async sendBulkPaymentNotifications(
    notifications: PaymentNotificationData[],
    delayBetweenEmails: number = 1500
  ): Promise<{ sent: number; failed: number; skipped: number; results: Array<{ email: string; success: boolean; skipped?: boolean }> }> {
    const results: Array<{ email: string; success: boolean; skipped?: boolean }> = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`📧 Processing ${notifications.length} payment notifications...`);

    // Get unique user IDs to check preferences
    const userIds = notifications
      .map(n => n.userId)
      .filter((id): id is string => !!id);

    // Query notification preferences for all users
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        emailNotificationsEnabled: true,
        statementNotificationsEnabled: true
      }
    });

    // Create a map of user preferences
    const preferencesMap = new Map(
      users.map(u => [u.id, {
        emailEnabled: u.emailNotificationsEnabled,
        statementEnabled: u.statementNotificationsEnabled
      }])
    );

    console.log(`📧 Sending ${notifications.length} payment notification emails with ${delayBetweenEmails}ms delay between sends...`);

    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];

      // Check notification preferences
      if (notification.userId) {
        const prefs = preferencesMap.get(notification.userId);
        if (prefs && (!prefs.emailEnabled || !prefs.statementEnabled)) {
          console.log(`⏭️  Skipping email to ${notification.writerEmail} (notifications disabled)`);
          results.push({ email: notification.writerEmail, success: false, skipped: true });
          skipped++;
          continue;
        }
      }

      const success = await this.sendPaymentNotification(notification);

      results.push({ email: notification.writerEmail, success });

      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Add delay between emails (except after the last one)
      if (i < notifications.length - 1) {
        await this.sleep(delayBetweenEmails);
      }
    }

    console.log(`📧 Bulk email summary: ${sent} sent, ${failed} failed, ${skipped} skipped out of ${notifications.length} total`);
    return { sent, failed, skipped, results };
  }

  /**
   * Generate HTML email for payment notification
   */
  private generatePaymentEmailHTML(data: PaymentNotificationData): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Processed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .summary-box {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-row:last-child {
      border-bottom: none;
      font-weight: bold;
      font-size: 18px;
      color: #10b981;
    }
    .label {
      color: #6b7280;
    }
    .value {
      font-weight: 600;
      color: #111827;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💰 Payment Processed!</h1>
    <p>Your ${data.proType} royalties have been paid</p>
  </div>

  <div class="content">
    <p>Hi ${data.writerName},</p>

    <p>Great news! Your royalty payment from <strong>${data.proType}</strong> has been processed and is now available in your account.</p>

    <div class="summary-box">
      <div class="summary-row">
        <span class="label">Statement</span>
        <span class="value">${data.statementFilename}</span>
      </div>
      <div class="summary-row">
        <span class="label">Payment Date</span>
        <span class="value">${data.paymentDate}</span>
      </div>
      <div class="summary-row">
        <span class="label">Songs</span>
        <span class="value">${data.songCount}</span>
      </div>
      <div class="summary-row">
        <span class="label">Gross Revenue</span>
        <span class="value">${formatCurrency(data.grossRevenue)}</span>
      </div>
      <div class="summary-row">
        <span class="label">Commission (${data.commissionRate}%)</span>
        <span class="value">-${formatCurrency(data.commissionAmount)}</span>
      </div>
      <div class="summary-row">
        <span class="label">Net Payment</span>
        <span class="value">${formatCurrency(data.netPayment)}</span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'https://producertour.com'}/dashboard" class="button">
        View Full Statement
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      You can view the complete breakdown of this payment and your earnings history by logging into your Producer Tour account.
    </p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Producer Tour. All rights reserved.</p>
    <p>If you have any questions about this payment, please contact us at support@producertour.com</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text email for payment notification
   */
  private generatePaymentEmailText(data: PaymentNotificationData): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    return `
Payment Processed!

Hi ${data.writerName},

Your royalty payment from ${data.proType} has been processed and is now available in your account.

Payment Summary:
- Statement: ${data.statementFilename}
- Payment Date: ${data.paymentDate}
- Songs: ${data.songCount}
- Gross Revenue: ${formatCurrency(data.grossRevenue)}
- Commission (${data.commissionRate}%): -${formatCurrency(data.commissionAmount)}
- Net Payment: ${formatCurrency(data.netPayment)}

View your full statement at: ${process.env.FRONTEND_URL || 'https://producertour.com'}/dashboard

If you have any questions about this payment, please contact us at support@producertour.com

© ${new Date().getFullYear()} Producer Tour. All rights reserved.
    `.trim();
  }

  /**
   * Send password reset email with reset link
   */
  async sendPasswordResetEmail(email: string, resetToken: string, name: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping password reset email');
      return false;
    }

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.fromEmail,
      to: email,
      replyTo: this.fromEmail,
      subject: 'Reset Your Producer Tour Password',
      html: this.generatePasswordResetHTML(name, resetLink),
      text: this.generatePasswordResetText(name, resetLink),
      envelope: {
        from: this.fromEmail,
        to: email,
      },
    };

    const sent = await this.sendEmailWithRetry(mailOptions, email);

    if (sent) {
      console.log(`✅ Password reset email sent to ${email}`);
    }

    return sent;
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmation(email: string, name: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping password reset confirmation');
      return false;
    }

    const mailOptions = {
      from: this.fromEmail,
      to: email,
      replyTo: this.fromEmail,
      subject: 'Password Reset Successful',
      html: this.generatePasswordResetConfirmationHTML(name),
      text: this.generatePasswordResetConfirmationText(name),
      envelope: {
        from: this.fromEmail,
        to: email,
      },
    };

    const sent = await this.sendEmailWithRetry(mailOptions, email);

    if (sent) {
      console.log(`✅ Password reset confirmation sent to ${email}`);
    }

    return sent;
  }

  /**
   * Send welcome email to new user with password setup link
   */
  async sendWelcomeEmail(email: string, resetToken: string, name: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping welcome email');
      return false;
    }

    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.fromEmail,
      to: email,
      replyTo: this.fromEmail,
      subject: 'Welcome to Producer Tour - Set Your Password',
      html: this.generateWelcomeEmailHTML(name, setupLink, email),
      text: this.generateWelcomeEmailText(name, setupLink, email),
      envelope: {
        from: this.fromEmail,
        to: email,
      },
    };

    const sent = await this.sendEmailWithRetry(mailOptions, email);

    if (sent) {
      console.log(`✅ Welcome email sent to ${email}`);
    }

    return sent;
  }

  /**
   * Generate HTML for password reset email
   */
  private generatePasswordResetHTML(name: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white !important;
      padding: 14px 32px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 Password Reset Request</h1>
  </div>

  <div class="content">
    <p>Hi ${name},</p>

    <p>We received a request to reset your Producer Tour password. Click the button below to create a new password:</p>

    <p style="text-align: center;">
      <a href="${resetLink}" class="button">
        Reset Password
      </a>
    </p>

    <div class="warning">
      <strong>⏰ This link expires in 1 hour</strong><br>
      For security reasons, this password reset link will expire in 1 hour.
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
    </p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Producer Tour. All rights reserved.</p>
    <p>If you have any questions, contact us at support@producertour.com</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for password reset email
   */
  private generatePasswordResetText(name: string, resetLink: string): string {
    return `
Password Reset Request

Hi ${name},

We received a request to reset your Producer Tour password.

Reset your password by clicking this link:
${resetLink}

⏰ This link expires in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} Producer Tour. All rights reserved.
If you have any questions, contact us at support@producertour.com
    `.trim();
  }

  /**
   * Generate HTML for password reset confirmation
   */
  private generatePasswordResetConfirmationHTML(name: string): string {
    const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: white !important;
      padding: 14px 32px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Password Reset Successful</h1>
  </div>

  <div class="content">
    <p>Hi ${name},</p>

    <p>Your password has been successfully reset. You can now login with your new password.</p>

    <p style="text-align: center;">
      <a href="${loginLink}" class="button">
        Login to Your Account
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      If you didn't make this change or if you believe an unauthorized person has accessed your account, please contact us immediately at support@producertour.com
    </p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Producer Tour. All rights reserved.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for password reset confirmation
   */
  private generatePasswordResetConfirmationText(name: string): string {
    const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

    return `
Password Reset Successful

Hi ${name},

Your password has been successfully reset. You can now login with your new password.

Login here: ${loginLink}

If you didn't make this change or if you believe an unauthorized person has accessed your account, please contact us immediately at support@producertour.com

© ${new Date().getFullYear()} Producer Tour. All rights reserved.
    `.trim();
  }

  /**
   * Generate HTML for welcome email
   */
  private generateWelcomeEmailHTML(name: string, setupLink: string, email: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Producer Tour</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white !important;
      padding: 14px 32px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
      font-weight: 600;
    }
    .info-box {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎵 Welcome to Producer Tour!</h1>
    <p>Let's get your account set up</p>
  </div>

  <div class="content">
    <p>Hi ${name},</p>

    <p>Welcome to Producer Tour! Your account has been created and you're ready to start tracking your royalties.</p>

    <div class="info-box">
      <strong>Your Login Email:</strong><br>
      ${email}
    </div>

    <p>To get started, click the button below to set your password:</p>

    <p style="text-align: center;">
      <a href="${setupLink}" class="button">
        Set Your Password
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      This link will expire in 1 hour for security reasons. If you need a new link, use the "Forgot Password" option on the login page.
    </p>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${setupLink}" style="color: #667eea; word-break: break-all;">${setupLink}</a>
    </p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Producer Tour. All rights reserved.</p>
    <p>Need help? Contact us at support@producertour.com</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for welcome email
   */
  private generateWelcomeEmailText(name: string, setupLink: string, email: string): string {
    return `
Welcome to Producer Tour!

Hi ${name},

Welcome to Producer Tour! Your account has been created and you're ready to start tracking your royalties.

Your Login Email: ${email}

Set your password by clicking this link:
${setupLink}

This link will expire in 1 hour for security reasons. If you need a new link, use the "Forgot Password" option on the login page.

© ${new Date().getFullYear()} Producer Tour. All rights reserved.
Need help? Contact us at support@producertour.com
    `.trim();
  }

  /**
   * Send document request notification to writer
   */
  async sendDocumentRequestEmail(
    writerEmail: string,
    writerName: string,
    submissionTitle: string,
    documentsRequested: string
  ): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping document request notification');
      return false;
    }

    const mailOptions = {
      from: this.fromEmail,
      to: writerEmail,
      replyTo: this.fromEmail,
      subject: `Documents Requested - ${submissionTitle}`,
      html: this.generateDocumentRequestHTML(writerName, submissionTitle, documentsRequested),
      text: this.generateDocumentRequestText(writerName, submissionTitle, documentsRequested),
      envelope: {
        from: this.fromEmail,
        to: writerEmail,
      },
    };

    const sent = await this.sendEmailWithRetry(mailOptions, writerEmail);

    if (sent) {
      console.log(`✅ Document request notification sent to ${writerEmail}`);
    }

    return sent;
  }

  /**
   * Send submission approved notification to writer
   */
  async sendSubmissionApprovedEmail(
    writerEmail: string,
    writerName: string,
    submissionTitle: string,
    caseNumber: string
  ): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping approval notification');
      return false;
    }

    const mailOptions = {
      from: this.fromEmail,
      to: writerEmail,
      replyTo: this.fromEmail,
      subject: `Submission Approved - ${submissionTitle}`,
      html: this.generateSubmissionApprovedHTML(writerName, submissionTitle, caseNumber),
      text: this.generateSubmissionApprovedText(writerName, submissionTitle, caseNumber),
      envelope: {
        from: this.fromEmail,
        to: writerEmail,
      },
    };

    const sent = await this.sendEmailWithRetry(mailOptions, writerEmail);

    if (sent) {
      console.log(`✅ Approval notification sent to ${writerEmail}`);
    }

    return sent;
  }

  /**
   * Send submission denied notification to writer
   */
  async sendSubmissionDeniedEmail(
    writerEmail: string,
    writerName: string,
    submissionTitle: string,
    denialReason: string
  ): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping denial notification');
      return false;
    }

    const mailOptions = {
      from: this.fromEmail,
      to: writerEmail,
      replyTo: this.fromEmail,
      subject: `Submission Update - ${submissionTitle}`,
      html: this.generateSubmissionDeniedHTML(writerName, submissionTitle, denialReason),
      text: this.generateSubmissionDeniedText(writerName, submissionTitle, denialReason),
      envelope: {
        from: this.fromEmail,
        to: writerEmail,
      },
    };

    const sent = await this.sendEmailWithRetry(mailOptions, writerEmail);

    if (sent) {
      console.log(`✅ Denial notification sent to ${writerEmail}`);
    }

    return sent;
  }

  /**
   * Generate HTML for document request email
   */
  private generateDocumentRequestHTML(name: string, title: string, documentsRequested: string): string {
    const submissionsLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-submissions`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documents Requested</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .alert-box {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .alert-box strong {
      color: #92400e;
      display: block;
      margin-bottom: 8px;
    }
    .button {
      display: inline-block;
      background: #f59e0b;
      color: white !important;
      padding: 14px 32px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📄 Documents Requested</h1>
  </div>

  <div class="content">
    <p>Hi ${name},</p>

    <p>We're reviewing your work registration submission for <strong>"${title}"</strong> and need some additional documents to continue the process.</p>

    <div class="alert-box">
      <strong>Requested Documents:</strong>
      <p style="margin: 0; color: #78350f;">${documentsRequested}</p>
    </div>

    <p>Please upload the requested documents as soon as possible to keep your submission moving forward.</p>

    <p style="text-align: center;">
      <a href="${submissionsLink}" class="button">
        Upload Documents
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      You can provide links to cloud storage (Google Drive, Dropbox, etc.) or include any additional notes when you submit.
    </p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Producer Tour. All rights reserved.</p>
    <p>Questions? Contact us at support@producertour.com</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for document request email
   */
  private generateDocumentRequestText(name: string, title: string, documentsRequested: string): string {
    const submissionsLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-submissions`;

    return `
Documents Requested

Hi ${name},

We're reviewing your work registration submission for "${title}" and need some additional documents to continue the process.

Requested Documents:
${documentsRequested}

Please upload the requested documents as soon as possible to keep your submission moving forward.

Upload documents here: ${submissionsLink}

You can provide links to cloud storage (Google Drive, Dropbox, etc.) or include any additional notes when you submit.

© ${new Date().getFullYear()} Producer Tour. All rights reserved.
Questions? Contact us at support@producertour.com
    `.trim();
  }

  /**
   * Generate HTML for submission approved email
   */
  private generateSubmissionApprovedHTML(name: string, title: string, caseNumber: string): string {
    const claimsLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/writer`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission Approved</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .success-box {
      background: #d1fae5;
      border: 2px solid #10b981;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .case-number {
      font-size: 24px;
      font-weight: bold;
      color: #065f46;
      margin: 10px 0;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: white !important;
      padding: 14px 32px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Submission Approved!</h1>
  </div>

  <div class="content">
    <p>Hi ${name},</p>

    <p>Great news! Your work registration for <strong>"${title}"</strong> has been approved and is now in your Claims.</p>

    <div class="success-box">
      <p style="margin: 0 0 5px 0; color: #065f46; font-weight: 600;">Case Number</p>
      <div class="case-number">${caseNumber}</div>
    </div>

    <p>You can now view the full details of your approved work, track its progress, and manage all related information in your Claims section.</p>

    <p style="text-align: center;">
      <a href="${claimsLink}" class="button">
        View Your Claims
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      Your work is now being tracked in our system. You'll receive updates as your case progresses.
    </p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Producer Tour. All rights reserved.</p>
    <p>Questions? Contact us at support@producertour.com</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for submission approved email
   */
  private generateSubmissionApprovedText(name: string, title: string, caseNumber: string): string {
    const claimsLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/writer`;

    return `
Submission Approved!

Hi ${name},

Great news! Your work registration for "${title}" has been approved and is now in your Claims.

Case Number: ${caseNumber}

You can now view the full details of your approved work, track its progress, and manage all related information in your Claims section.

View your claims here: ${claimsLink}

Your work is now being tracked in our system. You'll receive updates as your case progresses.

© ${new Date().getFullYear()} Producer Tour. All rights reserved.
Questions? Contact us at support@producertour.com
    `.trim();
  }

  /**
   * Generate HTML for submission denied email
   */
  private generateSubmissionDeniedHTML(name: string, title: string, denialReason: string): string {
    const submissionsLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-submissions`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission Update</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .alert-box {
      background: #fee2e2;
      border: 2px solid #ef4444;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .alert-box strong {
      color: #991b1b;
      display: block;
      margin-bottom: 8px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white !important;
      padding: 14px 32px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Submission Update</h1>
  </div>

  <div class="content">
    <p>Hi ${name},</p>

    <p>Thank you for submitting your work registration for <strong>"${title}"</strong>. After careful review, we're unable to approve this submission at this time.</p>

    <div class="alert-box">
      <strong>Reason:</strong>
      <p style="margin: 0; color: #7f1d1d;">${denialReason}</p>
    </div>

    <p>If you believe this decision was made in error or if you have questions about the reason provided, please don't hesitate to contact us. We're here to help!</p>

    <p style="text-align: center;">
      <a href="${submissionsLink}" class="button">
        View Your Submissions
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      You may submit a new work registration at any time if you have additional information or corrections to make.
    </p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Producer Tour. All rights reserved.</p>
    <p>Questions? Contact us at support@producertour.com</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for submission denied email
   */
  private generateSubmissionDeniedText(name: string, title: string, denialReason: string): string {
    const submissionsLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-submissions`;

    return `
Submission Update

Hi ${name},

Thank you for submitting your work registration for "${title}". After careful review, we're unable to approve this submission at this time.

Reason:
${denialReason}

If you believe this decision was made in error or if you have questions about the reason provided, please don't hesitate to contact us. We're here to help!

View your submissions: ${submissionsLink}

You may submit a new work registration at any time if you have additional information or corrections to make.

© ${new Date().getFullYear()} Producer Tour. All rights reserved.
Questions? Contact us at support@producertour.com
    `.trim();
  }

  /**
   * Send session payout notification to engineer
   */
  async sendSessionPayoutNotification(data: {
    engineerName: string;
    engineerEmail: string;
    artistName: string;
    songTitles: string;
    sessionDate: string;
    workOrderNumber: string;
    payoutAmount: number;
    paymentDate: string;
    stripeTransferId: string;
  }): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping session payout notification');
      return false;
    }

    const mailOptions = {
      from: this.fromEmail,
      to: data.engineerEmail,
      replyTo: this.fromEmail,
      subject: `Payment Sent - Session Work: ${data.artistName}`,
      html: this.generateSessionPayoutEmailHTML(data),
      text: this.generateSessionPayoutEmailText(data),
      envelope: {
        from: this.fromEmail,
        to: data.engineerEmail,
      },
    };

    const sent = await this.sendEmailWithRetry(mailOptions, data.engineerEmail);

    if (sent) {
      console.log(`✅ Session payout notification sent to ${data.engineerEmail}`);
    }

    return sent;
  }

  /**
   * Generate HTML email for session payout notification
   */
  private generateSessionPayoutEmailHTML(data: {
    engineerName: string;
    engineerEmail: string;
    artistName: string;
    songTitles: string;
    sessionDate: string;
    workOrderNumber: string;
    payoutAmount: number;
    paymentDate: string;
    stripeTransferId: string;
  }): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Sent</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .summary-box {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-row:last-child {
      border-bottom: none;
      font-weight: bold;
      font-size: 20px;
      color: #10b981;
    }
    .label {
      color: #6b7280;
    }
    .value {
      font-weight: 600;
      color: #111827;
    }
    .success-badge {
      background: #d1fae5;
      color: #065f46;
      padding: 8px 16px;
      border-radius: 20px;
      display: inline-block;
      font-weight: 600;
      margin: 10px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
    }
    .reference {
      background: #f3f4f6;
      padding: 10px 15px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💰 Payment Sent!</h1>
    <p>Your session work has been paid</p>
  </div>

  <div class="content">
    <p>Hi ${data.engineerName},</p>

    <p>Great news! Your payment for session work has been processed and transferred to your connected Stripe account.</p>

    <div style="text-align: center;">
      <span class="success-badge">✓ Payment Complete</span>
    </div>

    <div class="summary-box">
      <div class="summary-row">
        <span class="label">Work Order</span>
        <span class="value">${data.workOrderNumber}</span>
      </div>
      <div class="summary-row">
        <span class="label">Artist</span>
        <span class="value">${data.artistName}</span>
      </div>
      <div class="summary-row">
        <span class="label">Song(s)</span>
        <span class="value">${data.songTitles}</span>
      </div>
      <div class="summary-row">
        <span class="label">Session Date</span>
        <span class="value">${data.sessionDate}</span>
      </div>
      <div class="summary-row">
        <span class="label">Payment Date</span>
        <span class="value">${data.paymentDate}</span>
      </div>
      <div class="summary-row">
        <span class="label">Amount Paid</span>
        <span class="value">${formatCurrency(data.payoutAmount)}</span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'https://producertour.com'}/dashboard" class="button">
        View Payment History
      </a>
    </p>

    <div class="reference">
      <strong>Transaction Reference:</strong> ${data.stripeTransferId}
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
      Funds typically arrive in your bank account within 1-2 business days, depending on your bank's processing time.
    </p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Producer Tour. All rights reserved.</p>
    <p>Questions about this payment? Contact us at support@producertour.com</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text email for session payout notification
   */
  private generateSessionPayoutEmailText(data: {
    engineerName: string;
    engineerEmail: string;
    artistName: string;
    songTitles: string;
    sessionDate: string;
    workOrderNumber: string;
    payoutAmount: number;
    paymentDate: string;
    stripeTransferId: string;
  }): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    return `
Payment Sent!

Hi ${data.engineerName},

Your payment for session work has been processed and transferred to your connected Stripe account.

Payment Summary:
- Work Order: ${data.workOrderNumber}
- Artist: ${data.artistName}
- Song(s): ${data.songTitles}
- Session Date: ${data.sessionDate}
- Payment Date: ${data.paymentDate}
- Amount Paid: ${formatCurrency(data.payoutAmount)}

Transaction Reference: ${data.stripeTransferId}

Funds typically arrive in your bank account within 1-2 business days.

View your payment history at: ${process.env.FRONTEND_URL || 'https://producertour.com'}/dashboard

Questions about this payment? Contact us at support@producertour.com

© ${new Date().getFullYear()} Producer Tour. All rights reserved.
    `.trim();
  }

  /**
   * Send session payout admin summary notification
   */
  async sendSessionPayoutAdminNotification(data: {
    adminEmail: string;
    adminName: string;
    engineerName: string;
    engineerEmail: string;
    artistName: string;
    songTitles: string;
    workOrderNumber: string;
    payoutAmount: number;
    paymentDate: string;
    stripeTransferId: string;
  }): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping admin notification');
      return false;
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    const mailOptions = {
      from: this.fromEmail,
      to: data.adminEmail,
      replyTo: this.fromEmail,
      subject: `Session Payout Processed - ${data.workOrderNumber}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
    .summary-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">📋 Session Payout Processed</h2>
  </div>
  <div class="content">
    <p>Hi ${data.adminName},</p>
    <p>A session payout has been successfully processed.</p>
    <div class="summary-box">
      <div class="row"><span class="label">Work Order</span><span class="value">${data.workOrderNumber}</span></div>
      <div class="row"><span class="label">Engineer</span><span class="value">${data.engineerName} (${data.engineerEmail})</span></div>
      <div class="row"><span class="label">Artist</span><span class="value">${data.artistName}</span></div>
      <div class="row"><span class="label">Song(s)</span><span class="value">${data.songTitles}</span></div>
      <div class="row"><span class="label">Amount</span><span class="value" style="color: #10b981;">${formatCurrency(data.payoutAmount)}</span></div>
      <div class="row"><span class="label">Transfer ID</span><span class="value" style="font-family: monospace; font-size: 12px;">${data.stripeTransferId}</span></div>
    </div>
    <p style="color: #6b7280; font-size: 14px;">This is an automated notification for your records.</p>
  </div>
</body>
</html>
      `,
      text: `Session Payout Processed\n\nWork Order: ${data.workOrderNumber}\nEngineer: ${data.engineerName} (${data.engineerEmail})\nArtist: ${data.artistName}\nSong(s): ${data.songTitles}\nAmount: ${formatCurrency(data.payoutAmount)}\nTransfer ID: ${data.stripeTransferId}`,
      envelope: {
        from: this.fromEmail,
        to: data.adminEmail,
      },
    };

    const sent = await this.sendEmailWithRetry(mailOptions, data.adminEmail);

    if (sent) {
      console.log(`✅ Session payout admin notification sent to ${data.adminEmail}`);
    }

    return sent;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
