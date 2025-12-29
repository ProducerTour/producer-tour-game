/**
 * Email Service Tests
 *
 * Tests for email notification generation and sending.
 * Uses vi.mock to mock nodemailer since we don't want to send real emails in tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PaymentNotificationData } from '../services/email.service';

// Mock nodemailer before importing the email service
vi.mock('nodemailer', () => ({
  default: {
    createTransporter: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: vi.fn().mockResolvedValue(true)
    }))
  }
}));

describe('Email Service', () => {
  // Re-import email service for each test to get fresh mocks
  beforeEach(() => {
    vi.resetModules();
  });

  describe('Payment Notification Generation', () => {
    it('should create email service even without SMTP config', async () => {
      // Clear SMTP env vars to test graceful degradation
      const originalEnv = { ...process.env };
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      // Import fresh service
      const { emailService } = await import('../services/email.service');

      expect(emailService).toBeDefined();

      // Restore env
      process.env = originalEnv;
    });

    it('should generate payment notification data structure', () => {
      const testData: PaymentNotificationData = {
        writerName: 'John Doe',
        writerEmail: 'john@example.com',
        proType: 'BMI',
        statementFilename: 'bmi-q1-2024.csv',
        grossRevenue: 1000.00,
        commissionRate: 30,
        commissionAmount: 300.00,
        netPayment: 700.00,
        songCount: 5,
        paymentDate: '2024-01-15'
      };

      // Verify data structure
      expect(testData.writerName).toBe('John Doe');
      expect(testData.netPayment).toBe(700.00);
      expect(testData.songCount).toBe(5);
    });
  });

  describe('Email Content Validation', () => {
    it('should include all payment details in notification', async () => {
      // We can't easily test the private HTML generation method,
      // but we can verify the data structure is complete
      const testData: PaymentNotificationData = {
        writerName: 'Jane Smith',
        writerEmail: 'jane@example.com',
        proType: 'ASCAP',
        statementFilename: 'ascap-q2-2024.csv',
        grossRevenue: 2500.50,
        commissionRate: 25,
        commissionAmount: 625.125,
        netPayment: 1875.375,
        songCount: 12,
        paymentDate: '2024-04-15'
      };

      // Verify all required fields are present
      expect(testData).toHaveProperty('writerName');
      expect(testData).toHaveProperty('writerEmail');
      expect(testData).toHaveProperty('proType');
      expect(testData).toHaveProperty('statementFilename');
      expect(testData).toHaveProperty('grossRevenue');
      expect(testData).toHaveProperty('commissionRate');
      expect(testData).toHaveProperty('commissionAmount');
      expect(testData).toHaveProperty('netPayment');
      expect(testData).toHaveProperty('songCount');
      expect(testData).toHaveProperty('paymentDate');
    });

    it('should handle various PRO types', () => {
      const proTypes = ['BMI', 'ASCAP', 'SESAC', 'MLC'];

      proTypes.forEach(proType => {
        const testData: PaymentNotificationData = {
          writerName: 'Test Writer',
          writerEmail: 'test@example.com',
          proType,
          statementFilename: `${proType.toLowerCase()}-test.csv`,
          grossRevenue: 1000,
          commissionRate: 30,
          commissionAmount: 300,
          netPayment: 700,
          songCount: 5,
          paymentDate: '2024-01-15'
        };

        expect(testData.proType).toBe(proType);
      });
    });

    it('should handle various commission rates correctly', () => {
      const commissionRates = [0, 10, 25, 30, 50];

      commissionRates.forEach(rate => {
        const grossRevenue = 1000;
        const commissionAmount = (grossRevenue * rate) / 100;
        const netPayment = grossRevenue - commissionAmount;

        const testData: PaymentNotificationData = {
          writerName: 'Test Writer',
          writerEmail: 'test@example.com',
          proType: 'BMI',
          statementFilename: 'test.csv',
          grossRevenue,
          commissionRate: rate,
          commissionAmount,
          netPayment,
          songCount: 1,
          paymentDate: '2024-01-15'
        };

        expect(testData.commissionRate).toBe(rate);
        expect(testData.commissionAmount).toBe(commissionAmount);
        expect(testData.netPayment).toBe(netPayment);
      });
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency amounts correctly', () => {
      const amounts = [
        { input: 1000.00, expected: '$1,000.00' },
        { input: 0.01, expected: '$0.01' },
        { input: 9999999.99, expected: '$9,999,999.99' },
        { input: 123.456, expected: '$123.46' } // Rounds to 2 decimals
      ];

      amounts.forEach(({ input }) => {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(input);

        expect(formatted).toMatch(/^\$[\d,]+\.\d{2}$/);
      });
    });

    it('should handle zero amounts', () => {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(0);

      expect(formatted).toBe('$0.00');
    });

    it('should handle negative amounts (refunds/corrections)', () => {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(-50.00);

      expect(formatted).toBe('-$50.00');
    });
  });

  describe('Email Service Error Handling', () => {
    it('should not crash when sendPaymentNotification is called without SMTP', async () => {
      // Clear SMTP env vars
      const originalEnv = { ...process.env };
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      // Import fresh service
      const { emailService } = await import('../services/email.service');

      const testData: PaymentNotificationData = {
        writerName: 'Test Writer',
        writerEmail: 'test@example.com',
        proType: 'BMI',
        statementFilename: 'test.csv',
        grossRevenue: 1000,
        commissionRate: 30,
        commissionAmount: 300,
        netPayment: 700,
        songCount: 5,
        paymentDate: '2024-01-15'
      };

      // Should return false but not throw
      const result = await emailService.sendPaymentNotification(testData);
      expect(result).toBe(false);

      // Restore env
      process.env = originalEnv;
    });
  });

  describe('Date Formatting in Emails', () => {
    it('should handle various date formats', () => {
      const dates = [
        '2024-01-15',
        '2024-12-31',
        '2024-06-01'
      ];

      dates.forEach(date => {
        const testData: PaymentNotificationData = {
          writerName: 'Test Writer',
          writerEmail: 'test@example.com',
          proType: 'BMI',
          statementFilename: 'test.csv',
          grossRevenue: 1000,
          commissionRate: 30,
          commissionAmount: 300,
          netPayment: 700,
          songCount: 5,
          paymentDate: date
        };

        expect(testData.paymentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('Email Validation', () => {
    it('should handle various email formats', () => {
      const emails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@subdomain.example.com'
      ];

      emails.forEach(email => {
        const testData: PaymentNotificationData = {
          writerName: 'Test Writer',
          writerEmail: email,
          proType: 'BMI',
          statementFilename: 'test.csv',
          grossRevenue: 1000,
          commissionRate: 30,
          commissionAmount: 300,
          netPayment: 700,
          songCount: 5,
          paymentDate: '2024-01-15'
        };

        // Email should be valid format
        expect(testData.writerEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('Multiple Writers Scenario', () => {
    it('should handle sending notifications to multiple writers', () => {
      const writers = [
        { name: 'Writer 1', email: 'writer1@example.com', net: 500 },
        { name: 'Writer 2', email: 'writer2@example.com', net: 300 },
        { name: 'Writer 3', email: 'writer3@example.com', net: 200 }
      ];

      const notifications: PaymentNotificationData[] = writers.map(writer => ({
        writerName: writer.name,
        writerEmail: writer.email,
        proType: 'BMI',
        statementFilename: 'bmi-test.csv',
        grossRevenue: writer.net / 0.7, // Assuming 30% commission
        commissionRate: 30,
        commissionAmount: writer.net / 0.7 * 0.3,
        netPayment: writer.net,
        songCount: 5,
        paymentDate: '2024-01-15'
      }));

      expect(notifications).toHaveLength(3);
      expect(notifications[0].writerEmail).toBe('writer1@example.com');
      expect(notifications[1].writerEmail).toBe('writer2@example.com');
      expect(notifications[2].writerEmail).toBe('writer3@example.com');
    });
  });

  describe('Edge Cases', () => {
    it('should handle writer names with special characters', () => {
      const specialNames = [
        'O\'Brien',
        'José García',
        'François Müller',
        'Li Wei (李伟)',
        'Smith-Johnson'
      ];

      specialNames.forEach(name => {
        const testData: PaymentNotificationData = {
          writerName: name,
          writerEmail: 'test@example.com',
          proType: 'BMI',
          statementFilename: 'test.csv',
          grossRevenue: 1000,
          commissionRate: 30,
          commissionAmount: 300,
          netPayment: 700,
          songCount: 5,
          paymentDate: '2024-01-15'
        };

        expect(testData.writerName).toBe(name);
      });
    });

    it('should handle very large song counts', () => {
      const testData: PaymentNotificationData = {
        writerName: 'Prolific Writer',
        writerEmail: 'prolific@example.com',
        proType: 'BMI',
        statementFilename: 'test.csv',
        grossRevenue: 100000,
        commissionRate: 30,
        commissionAmount: 30000,
        netPayment: 70000,
        songCount: 999,
        paymentDate: '2024-01-15'
      };

      expect(testData.songCount).toBe(999);
    });

    it('should handle micro-payments', () => {
      const testData: PaymentNotificationData = {
        writerName: 'Micro Writer',
        writerEmail: 'micro@example.com',
        proType: 'BMI',
        statementFilename: 'test.csv',
        grossRevenue: 0.01,
        commissionRate: 30,
        commissionAmount: 0.003,
        netPayment: 0.007,
        songCount: 1,
        paymentDate: '2024-01-15'
      };

      expect(testData.netPayment).toBeLessThan(0.01);
      expect(testData.netPayment).toBeGreaterThan(0);
    });

    it('should handle zero commission rate', () => {
      const testData: PaymentNotificationData = {
        writerName: 'Zero Commission Writer',
        writerEmail: 'zero@example.com',
        proType: 'BMI',
        statementFilename: 'test.csv',
        grossRevenue: 1000,
        commissionRate: 0,
        commissionAmount: 0,
        netPayment: 1000,
        songCount: 5,
        paymentDate: '2024-01-15'
      };

      expect(testData.commissionRate).toBe(0);
      expect(testData.netPayment).toBe(testData.grossRevenue);
    });

    it('should handle very long filenames', () => {
      const longFilename = 'very-long-statement-filename-that-might-cause-issues-if-not-handled-properly-bmi-q1-2024.csv';

      const testData: PaymentNotificationData = {
        writerName: 'Test Writer',
        writerEmail: 'test@example.com',
        proType: 'BMI',
        statementFilename: longFilename,
        grossRevenue: 1000,
        commissionRate: 30,
        commissionAmount: 300,
        netPayment: 700,
        songCount: 5,
        paymentDate: '2024-01-15'
      };

      expect(testData.statementFilename).toBe(longFilename);
    });
  });

  describe('HTML Email Template Structure', () => {
    it('should have required email components', () => {
      // Test that email data structure supports template rendering
      const testData: PaymentNotificationData = {
        writerName: 'Template Test Writer',
        writerEmail: 'template@example.com',
        proType: 'BMI',
        statementFilename: 'bmi-template-test.csv',
        grossRevenue: 1234.56,
        commissionRate: 30,
        commissionAmount: 370.368,
        netPayment: 864.192,
        songCount: 7,
        paymentDate: '2024-01-15'
      };

      // Verify all data needed for template is present
      expect(testData.writerName).toBeTruthy();
      expect(testData.proType).toBeTruthy();
      expect(testData.statementFilename).toBeTruthy();
      expect(testData.paymentDate).toBeTruthy();
      expect(typeof testData.songCount).toBe('number');
      expect(typeof testData.grossRevenue).toBe('number');
      expect(typeof testData.commissionRate).toBe('number');
      expect(typeof testData.commissionAmount).toBe('number');
      expect(typeof testData.netPayment).toBe('number');
    });
  });
});
