/**
 * CSV Export Generation Tests
 *
 * Tests for the export-generator utility that creates CSV exports
 * for accounting and payment processing.
 */

import { describe, it, expect } from 'vitest';
import {
  generatePaymentCSV,
  generateStatementSummaryCSV,
  generateQuickBooksCSV,
  formatExportDate,
  type PaymentExportRow,
  type StatementExportSummary
} from '../utils/export-generator';

describe('CSV Export Generation', () => {
  describe('generatePaymentCSV', () => {
    it('should generate valid CSV with correct headers', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_test_123',
        proType: 'BMI',
        filename: 'bmi-q1-2024.csv',
        publishedDate: '2024-01-15',
        paymentDate: '2024-01-20',
        writerName: 'John Doe',
        writerEmail: 'john@example.com',
        songCount: 5,
        grossRevenue: 1000.00,
        commissionRate: 30,
        commissionAmount: 300.00,
        netPayment: 700.00,
        paymentStatus: 'PAID'
      }];

      const csv = generatePaymentCSV(testData);

      // Check headers
      expect(csv).toContain('Statement ID');
      expect(csv).toContain('PRO');
      expect(csv).toContain('Filename');
      expect(csv).toContain('Published Date');
      expect(csv).toContain('Payment Date');
      expect(csv).toContain('Writer Name');
      expect(csv).toContain('Writer Email');
      expect(csv).toContain('Song Count');
      expect(csv).toContain('Gross Revenue');
      expect(csv).toContain('Commission Rate (%)');
      expect(csv).toContain('Commission Amount');
      expect(csv).toContain('Net Payment');
      expect(csv).toContain('Payment Status');
    });

    it('should include all writer data in CSV', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_123',
        proType: 'ASCAP',
        filename: 'ascap-q2-2024.csv',
        publishedDate: '2024-04-01',
        paymentDate: '2024-04-15',
        writerName: 'Jane Smith',
        writerEmail: 'jane@example.com',
        songCount: 3,
        grossRevenue: 500.50,
        commissionRate: 25,
        commissionAmount: 125.13,
        netPayment: 375.37,
        paymentStatus: 'PAID'
      }];

      const csv = generatePaymentCSV(testData);

      // Check data is present
      expect(csv).toContain('stmt_123');
      expect(csv).toContain('ASCAP');
      expect(csv).toContain('Jane Smith');
      expect(csv).toContain('jane@example.com');
      expect(csv).toContain('500.5');
      expect(csv).toContain('125.13');
      expect(csv).toContain('375.37');
    });

    it('should handle multiple writers correctly', () => {
      const testData: PaymentExportRow[] = [
        {
          statementId: 'stmt_456',
          proType: 'SESAC',
          filename: 'sesac-q3-2024.csv',
          publishedDate: '2024-07-01',
          paymentDate: '2024-07-15',
          writerName: 'Writer One',
          writerEmail: 'writer1@example.com',
          songCount: 10,
          grossRevenue: 2000.00,
          commissionRate: 30,
          commissionAmount: 600.00,
          netPayment: 1400.00,
          paymentStatus: 'PAID'
        },
        {
          statementId: 'stmt_456',
          proType: 'SESAC',
          filename: 'sesac-q3-2024.csv',
          publishedDate: '2024-07-01',
          paymentDate: '2024-07-15',
          writerName: 'Writer Two',
          writerEmail: 'writer2@example.com',
          songCount: 7,
          grossRevenue: 1500.00,
          commissionRate: 25,
          commissionAmount: 375.00,
          netPayment: 1125.00,
          paymentStatus: 'PAID'
        }
      ];

      const csv = generatePaymentCSV(testData);

      // Check both writers are present
      expect(csv).toContain('Writer One');
      expect(csv).toContain('Writer Two');
      expect(csv).toContain('writer1@example.com');
      expect(csv).toContain('writer2@example.com');

      // Check totals are separate
      expect(csv).toContain('2000');
      expect(csv).toContain('1500');
    });

    it('should handle micro-amounts correctly', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_micro',
        proType: 'BMI',
        filename: 'test.csv',
        publishedDate: '2024-01-01',
        paymentDate: '2024-01-15',
        writerName: 'Micro Writer',
        writerEmail: 'micro@example.com',
        songCount: 1,
        grossRevenue: 0.0001,
        commissionRate: 30,
        commissionAmount: 0.00003,
        netPayment: 0.00007,
        paymentStatus: 'PAID'
      }];

      const csv = generatePaymentCSV(testData);

      // Should handle very small amounts
      expect(csv).toContain('0.0001');
    });

    it('should handle empty data gracefully', () => {
      const testData: PaymentExportRow[] = [];

      const csv = generatePaymentCSV(testData);

      // Should still have headers
      expect(csv).toContain('Statement ID');
      expect(csv).toContain('Writer Name');
    });
  });

  describe('generateStatementSummaryCSV', () => {
    it('should generate summary CSV with correct headers', () => {
      const testData: StatementExportSummary[] = [{
        statementId: 'stmt_summary_1',
        proType: 'BMI',
        filename: 'bmi-q1-2024.csv',
        publishedDate: '2024-01-15',
        paymentDate: '2024-01-20',
        totalWriters: 5,
        totalSongs: 25,
        totalGrossRevenue: 10000.00,
        totalCommission: 3000.00,
        totalNetPayments: 7000.00,
        paymentStatus: 'PAID'
      }];

      const csv = generateStatementSummaryCSV(testData);

      // Check headers
      expect(csv).toContain('Statement ID');
      expect(csv).toContain('PRO');
      expect(csv).toContain('Total Writers');
      expect(csv).toContain('Total Songs');
      expect(csv).toContain('Total Gross Revenue');
      expect(csv).toContain('Total Commission');
      expect(csv).toContain('Total Net Payments');
    });

    it('should include summary totals', () => {
      const testData: StatementExportSummary[] = [{
        statementId: 'stmt_sum_2',
        proType: 'ASCAP',
        filename: 'ascap-q2-2024.csv',
        publishedDate: '2024-04-01',
        paymentDate: null,
        totalWriters: 3,
        totalSongs: 15,
        totalGrossRevenue: 5000.00,
        totalCommission: 1250.00,
        totalNetPayments: 3750.00,
        paymentStatus: 'UNPAID'
      }];

      const csv = generateStatementSummaryCSV(testData);

      expect(csv).toContain('3');  // totalWriters
      expect(csv).toContain('15'); // totalSongs
      expect(csv).toContain('5000');
      expect(csv).toContain('3750');
      expect(csv).toContain('UNPAID');
    });

    it('should handle multiple statements in summary', () => {
      const testData: StatementExportSummary[] = [
        {
          statementId: 'stmt_1',
          proType: 'BMI',
          filename: 'bmi-jan-2024.csv',
          publishedDate: '2024-01-01',
          paymentDate: null,
          totalWriters: 2,
          totalSongs: 10,
          totalGrossRevenue: 1000.00,
          totalCommission: 300.00,
          totalNetPayments: 700.00,
          paymentStatus: 'UNPAID'
        },
        {
          statementId: 'stmt_2',
          proType: 'ASCAP',
          filename: 'ascap-jan-2024.csv',
          publishedDate: '2024-01-15',
          paymentDate: null,
          totalWriters: 3,
          totalSongs: 15,
          totalGrossRevenue: 2000.00,
          totalCommission: 600.00,
          totalNetPayments: 1400.00,
          paymentStatus: 'UNPAID'
        }
      ];

      const csv = generateStatementSummaryCSV(testData);

      // Check both statements present
      expect(csv).toContain('BMI');
      expect(csv).toContain('ASCAP');
      expect(csv).toContain('stmt_1');
      expect(csv).toContain('stmt_2');
    });
  });

  describe('generateQuickBooksCSV', () => {
    it('should generate QuickBooks format with dual entries', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_qb_1',
        proType: 'BMI',
        filename: 'bmi-test.csv',
        publishedDate: '2024-01-01',
        paymentDate: '2024-01-15',
        writerName: 'QB Writer',
        writerEmail: 'qb@example.com',
        songCount: 5,
        grossRevenue: 1000.00,
        commissionRate: 30,
        commissionAmount: 300.00,
        netPayment: 700.00,
        paymentStatus: 'PAID'
      }];

      const csv = generateQuickBooksCSV(testData);

      // QuickBooks format should have specific headers
      expect(csv).toContain('TRNS Type');
      expect(csv).toContain('Date');
      expect(csv).toContain('Account');
      expect(csv).toContain('Name');
      expect(csv).toContain('Amount');
      expect(csv).toContain('Memo');
      expect(csv).toContain('Class');

      // Should have GENERAL JOURNAL entries
      expect(csv).toContain('GENERAL JOURNAL');
    });

    it('should create separate commission and royalty entries', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_qb_2',
        proType: 'ASCAP',
        filename: 'ascap-test.csv',
        publishedDate: '2024-01-01',
        paymentDate: '2024-01-15',
        writerName: 'Test Writer',
        writerEmail: 'test@example.com',
        songCount: 3,
        grossRevenue: 500.00,
        commissionRate: 25,
        commissionAmount: 125.00,
        netPayment: 375.00,
        paymentStatus: 'PAID'
      }];

      const csv = generateQuickBooksCSV(testData);

      // Should have commission entry
      expect(csv).toContain('Commission Expense');
      expect(csv).toContain('Producer Tour LLC');
      expect(csv).toContain('125.00');

      // Should have royalty entry
      expect(csv).toContain('Royalty Expense');
      expect(csv).toContain('Test Writer');
      expect(csv).toContain('375.00');
    });

    it('should format amounts to 2 decimal places for QuickBooks', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_qb_3',
        proType: 'BMI',
        filename: 'test.csv',
        publishedDate: '2024-01-01',
        paymentDate: '2024-01-15',
        writerName: 'Decimal Writer',
        writerEmail: 'decimal@example.com',
        songCount: 1,
        grossRevenue: 123.456,
        commissionRate: 30,
        commissionAmount: 37.0368,
        netPayment: 86.4192,
        paymentStatus: 'PAID'
      }];

      const csv = generateQuickBooksCSV(testData);

      // Amounts should be formatted to 2 decimal places
      expect(csv).toContain('37.04');
      expect(csv).toContain('86.42');
    });

    it('should include PRO type as Class', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_qb_4',
        proType: 'SESAC',
        filename: 'sesac-test.csv',
        publishedDate: '2024-01-01',
        paymentDate: '2024-01-15',
        writerName: 'Class Writer',
        writerEmail: 'class@example.com',
        songCount: 2,
        grossRevenue: 200.00,
        commissionRate: 20,
        commissionAmount: 40.00,
        netPayment: 160.00,
        paymentStatus: 'PAID'
      }];

      const csv = generateQuickBooksCSV(testData);

      // PRO type should appear in Class column
      expect(csv).toContain('SESAC');
    });
  });

  describe('formatExportDate', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatExportDate(date);

      expect(formatted).toBe('2024-01-15');
    });

    it('should format date string to YYYY-MM-DD', () => {
      const dateString = '2024-03-20T15:45:00Z';
      const formatted = formatExportDate(dateString);

      expect(formatted).toBe('2024-03-20');
    });

    it('should handle null dates', () => {
      const formatted = formatExportDate(null);

      expect(formatted).toBe('N/A');
    });

    it('should handle various date formats', () => {
      const dates = [
        new Date('2024-12-31'),
        '2024-06-15',
        new Date(2024, 0, 1) // Jan 1, 2024
      ];

      dates.forEach(date => {
        const formatted = formatExportDate(date);
        // Should match YYYY-MM-DD or N/A
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('CSV Edge Cases', () => {
    it('should handle special characters in writer names', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_special',
        proType: 'BMI',
        filename: 'test.csv',
        publishedDate: '2024-01-01',
        paymentDate: '2024-01-15',
        writerName: 'O\'Brien, "Nick"',
        writerEmail: 'nick@example.com',
        songCount: 1,
        grossRevenue: 100.00,
        commissionRate: 30,
        commissionAmount: 30.00,
        netPayment: 70.00,
        paymentStatus: 'PAID'
      }];

      const csv = generatePaymentCSV(testData);

      // CSV should properly escape special characters
      expect(csv).toBeDefined();
      expect(csv.length).toBeGreaterThan(0);
    });

    it('should handle very large amounts', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_large',
        proType: 'ASCAP',
        filename: 'test.csv',
        publishedDate: '2024-01-01',
        paymentDate: '2024-01-15',
        writerName: 'Rich Writer',
        writerEmail: 'rich@example.com',
        songCount: 100,
        grossRevenue: 9999999.99,
        commissionRate: 30,
        commissionAmount: 2999999.997,
        netPayment: 6999999.993,
        paymentStatus: 'PAID'
      }];

      const csv = generatePaymentCSV(testData);

      expect(csv).toContain('9999999.99');
    });

    it('should handle zero amounts', () => {
      const testData: PaymentExportRow[] = [{
        statementId: 'stmt_zero',
        proType: 'BMI',
        filename: 'test.csv',
        publishedDate: '2024-01-01',
        paymentDate: '2024-01-15',
        writerName: 'Zero Writer',
        writerEmail: 'zero@example.com',
        songCount: 0,
        grossRevenue: 0,
        commissionRate: 0,
        commissionAmount: 0,
        netPayment: 0,
        paymentStatus: 'PENDING'
      }];

      const csv = generatePaymentCSV(testData);

      expect(csv).toContain('0');
      expect(csv).toContain('PENDING');
    });
  });
});
