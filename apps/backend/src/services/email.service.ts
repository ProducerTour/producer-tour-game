/**
 * Email Service
 *
 * Handles sending emails for payment notifications and other system events.
 */

import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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
      const config: EmailConfig = {
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587'),
        secure: SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        from: this.fromEmail,
      };

      // Try to create transporter - if it fails, just disable the service
      try {
        this.transporter = nodemailer.createTransporter(config);
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
   * Send payment processed notification to writer
   */
  async sendPaymentNotification(data: PaymentNotificationData): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured - skipping payment notification');
      return false;
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: data.writerEmail,
        subject: `Payment Processed - ${data.proType} Royalties`,
        html: this.generatePaymentEmailHTML(data),
        text: this.generatePaymentEmailText(data),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Payment notification sent to ${data.writerEmail}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send payment notification to ${data.writerEmail}:`, error);
      return false;
    }
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
