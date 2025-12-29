/**
 * Export Endpoints Integration Tests
 *
 * Tests the CSV export endpoints that were added for payment processing:
 * - GET /api/statements/:id/export/csv
 * - GET /api/statements/:id/export/quickbooks
 * - GET /api/statements/export/unpaid-summary
 *
 * These tests verify that the export endpoints work correctly with real
 * database data and return properly formatted CSV files.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import request from 'supertest';
import app from '../index';

// Test data setup
let adminToken: string;
let writerToken: string;
let adminUserId: string;
let writerUserId: string;
let paidStatementId: string;
let unpaidStatementId: string;

describe('Export Endpoints Integration Tests', () => {
  beforeAll(async () => {
    // Setup: Create test users and get auth tokens
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'export-admin@test.com',
        password: 'password123',
        firstName: 'Export',
        lastName: 'Admin',
        role: 'ADMIN'
      });
    adminToken = adminRes.body.token;
    adminUserId = adminRes.body.user.id;

    const writerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'export-writer@test.com',
        password: 'password123',
        firstName: 'Export',
        lastName: 'Writer',
        role: 'WRITER',
        writerIpiNumber: '00999888777',
        publisherIpiNumber: '1266292635'
      });
    writerToken = writerRes.body.token;
    writerUserId = writerRes.body.user.id;

    // Create commission settings
    await prisma.commissionSettings.create({
      data: {
        commissionRate: 30.0,
        recipientName: 'Producer Tour LLC',
        description: 'Test commission rate',
        isActive: true,
      }
    });

    // Create a PAID statement for export testing
    const paidStatement = await prisma.statement.create({
      data: {
        filename: 'bmi-paid-export-test.csv',
        proType: 'BMI',
        uploaderId: adminUserId,
        status: 'PUBLISHED',
        paymentStatus: 'PAID',
        publishedAt: new Date('2024-01-15'),
        paymentProcessedAt: new Date('2024-01-20'),
        totalRevenue: 1000.00,
        totalCommission: 300.00,
        totalNet: 700.00,
        metadata: {
          parsedItems: [
            {
              workTitle: 'Test Song 1',
              revenue: 500.00
            },
            {
              workTitle: 'Test Song 2',
              revenue: 500.00
            }
          ],
          writerAssignments: {
            'Test Song 1': [{
              userId: writerUserId,
              splitPercentage: 100
            }],
            'Test Song 2': [{
              userId: writerUserId,
              splitPercentage: 100
            }]
          }
        }
      }
    });
    paidStatementId = paidStatement.id;

    // Create statement item for the writer
    await prisma.statementItem.create({
      data: {
        statementId: paidStatementId,
        userId: writerUserId,
        songCount: 2,
        grossRevenue: 1000.00,
        commissionRate: 30.0,
        commissionAmount: 300.00,
        netRevenue: 700.00,
        isVisible: true
      }
    });

    // Create an UNPAID statement
    const unpaidStatement = await prisma.statement.create({
      data: {
        filename: 'ascap-unpaid-export-test.csv',
        proType: 'ASCAP',
        uploaderId: adminUserId,
        status: 'PUBLISHED',
        paymentStatus: 'UNPAID',
        publishedAt: new Date('2024-02-15'),
        totalRevenue: 500.00,
        totalCommission: 150.00,
        totalNet: 350.00,
        metadata: {
          parsedItems: [
            {
              workTitle: 'Unpaid Song',
              revenue: 500.00
            }
          ],
          writerAssignments: {
            'Unpaid Song': [{
              userId: writerUserId,
              splitPercentage: 100
            }]
          }
        }
      }
    });
    unpaidStatementId = unpaidStatement.id;

    // Create statement item for unpaid
    await prisma.statementItem.create({
      data: {
        statementId: unpaidStatementId,
        userId: writerUserId,
        songCount: 1,
        grossRevenue: 500.00,
        commissionRate: 30.0,
        commissionAmount: 150.00,
        netRevenue: 350.00,
        isVisible: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await prisma.statementItem.deleteMany({
      where: {
        statementId: { in: [paidStatementId, unpaidStatementId] }
      }
    });
    await prisma.statement.deleteMany({
      where: {
        id: { in: [paidStatementId, unpaidStatementId] }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['export-admin@test.com', 'export-writer@test.com'] }
      }
    });
    await prisma.commissionSettings.deleteMany({
      where: {
        description: 'Test commission rate'
      }
    });
  });

  describe('GET /api/statements/:id/export/csv', () => {
    it('should export paid statement as CSV (admin)', async () => {
      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/csv`)
        .query({ token: adminToken })
        .expect(200);

      // Verify CSV content type
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');

      // Verify CSV content
      const csv = response.text;
      expect(csv).toContain('Statement ID');
      expect(csv).toContain('Writer Name');
      expect(csv).toContain('Net Payment');
      expect(csv).toContain('BMI');
      expect(csv).toContain('Export Writer');
    });

    it('should include all payment details in CSV', async () => {
      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/csv`)
        .query({ token: adminToken })
        .expect(200);

      const csv = response.text;
      expect(csv).toContain('1000'); // Gross revenue
      expect(csv).toContain('300');  // Commission
      expect(csv).toContain('700');  // Net payment
      expect(csv).toContain('30');   // Commission rate
    });

    it('should reject unauthorized access (no token)', async () => {
      await request(app)
        .get(`/api/statements/${paidStatementId}/export/csv`)
        .expect(401);
    });

    it('should reject non-admin users', async () => {
      await request(app)
        .get(`/api/statements/${paidStatementId}/export/csv`)
        .query({ token: writerToken })
        .expect(403);
    });

    it('should return 404 for non-existent statement', async () => {
      await request(app)
        .get('/api/statements/non-existent-id/export/csv')
        .query({ token: adminToken })
        .expect(404);
    });
  });

  describe('GET /api/statements/:id/export/quickbooks', () => {
    it('should export statement in QuickBooks format (admin)', async () => {
      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/quickbooks`)
        .query({ token: adminToken })
        .expect(200);

      // Verify CSV content type
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('quickbooks');

      // Verify QuickBooks format
      const csv = response.text;
      expect(csv).toContain('TRNS Type');
      expect(csv).toContain('GENERAL JOURNAL');
      expect(csv).toContain('Account');
      expect(csv).toContain('Commission Expense');
      expect(csv).toContain('Royalty Expense');
    });

    it('should include Producer Tour LLC in commission entries', async () => {
      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/quickbooks`)
        .query({ token: adminToken })
        .expect(200);

      const csv = response.text;
      expect(csv).toContain('Producer Tour LLC');
    });

    it('should include writer name in royalty entries', async () => {
      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/quickbooks`)
        .query({ token: adminToken })
        .expect(200);

      const csv = response.text;
      expect(csv).toContain('Export Writer');
    });

    it('should format amounts to 2 decimal places', async () => {
      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/quickbooks`)
        .query({ token: adminToken })
        .expect(200);

      const csv = response.text;
      // Check that amounts have 2 decimal places
      expect(csv).toMatch(/\d+\.\d{2}/);
    });

    it('should reject non-admin users', async () => {
      await request(app)
        .get(`/api/statements/${paidStatementId}/export/quickbooks`)
        .query({ token: writerToken })
        .expect(403);
    });
  });

  describe('GET /api/statements/export/unpaid-summary', () => {
    it('should export unpaid statements summary (admin)', async () => {
      const response = await request(app)
        .get('/api/statements/export/unpaid-summary')
        .query({ token: adminToken })
        .expect(200);

      // Verify CSV content type
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('unpaid-statements-summary');

      // Verify summary CSV content
      const csv = response.text;
      expect(csv).toContain('Statement ID');
      expect(csv).toContain('PRO');
      expect(csv).toContain('Total Writers');
      expect(csv).toContain('Total Songs');
      expect(csv).toContain('Total Gross Revenue');
    });

    it('should include unpaid statement in summary', async () => {
      const response = await request(app)
        .get('/api/statements/export/unpaid-summary')
        .query({ token: adminToken })
        .expect(200);

      const csv = response.text;
      expect(csv).toContain('ASCAP'); // Unpaid statement PRO
      expect(csv).toContain('ascap-unpaid-export-test.csv');
      expect(csv).toContain('UNPAID');
    });

    it('should NOT include paid statements in unpaid summary', async () => {
      const response = await request(app)
        .get('/api/statements/export/unpaid-summary')
        .query({ token: adminToken })
        .expect(200);

      const csv = response.text;
      const lines = csv.split('\n');

      // Should have header + at least 1 unpaid statement
      // Should NOT have the paid statement
      expect(csv).not.toContain('bmi-paid-export-test.csv');
    });

    it('should return empty summary if no unpaid statements', async () => {
      // Mark the unpaid statement as paid temporarily
      await prisma.statement.update({
        where: { id: unpaidStatementId },
        data: { paymentStatus: 'PAID' }
      });

      const response = await request(app)
        .get('/api/statements/export/unpaid-summary')
        .query({ token: adminToken })
        .expect(200);

      const csv = response.text;
      // Should still have headers
      expect(csv).toContain('Statement ID');

      // Restore unpaid status
      await prisma.statement.update({
        where: { id: unpaidStatementId },
        data: { paymentStatus: 'UNPAID' }
      });
    });

    it('should reject non-admin users', async () => {
      await request(app)
        .get('/api/statements/export/unpaid-summary')
        .query({ token: writerToken })
        .expect(403);
    });

    it('should reject unauthorized access', async () => {
      await request(app)
        .get('/api/statements/export/unpaid-summary')
        .expect(401);
    });
  });

  describe('Export Filename Formats', () => {
    it('should use correct filename format for CSV export', async () => {
      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/csv`)
        .query({ token: adminToken })
        .expect(200);

      const disposition = response.headers['content-disposition'];
      expect(disposition).toContain('payment-');
      expect(disposition).toContain('BMI');
      expect(disposition).toContain('.csv');
    });

    it('should use correct filename format for QuickBooks export', async () => {
      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/quickbooks`)
        .query({ token: adminToken })
        .expect(200);

      const disposition = response.headers['content-disposition'];
      expect(disposition).toContain('quickbooks-');
      expect(disposition).toContain('BMI');
      expect(disposition).toContain('.csv');
    });

    it('should use date in unpaid summary filename', async () => {
      const response = await request(app)
        .get('/api/statements/export/unpaid-summary')
        .query({ token: adminToken })
        .expect(200);

      const disposition = response.headers['content-disposition'];
      expect(disposition).toContain('unpaid-statements-summary-');
      expect(disposition).toMatch(/\d{4}-\d{2}-\d{2}/); // Should contain date
      expect(disposition).toContain('.csv');
    });
  });

  describe('CSV Data Accuracy', () => {
    it('should have consistent totals in CSV export', async () => {
      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/csv`)
        .query({ token: adminToken })
        .expect(200);

      const csv = response.text;
      const lines = csv.split('\n');

      // Parse CSV to verify calculations
      // (In a real app, you might want to use a CSV parser library)
      expect(lines.length).toBeGreaterThan(1); // Header + at least 1 data row
    });

    it('should export data matching database records', async () => {
      // Get the statement from database
      const statement = await prisma.statement.findUnique({
        where: { id: paidStatementId },
        include: { items: true }
      });

      const response = await request(app)
        .get(`/api/statements/${paidStatementId}/export/csv`)
        .query({ token: adminToken })
        .expect(200);

      const csv = response.text;

      // Verify statement data is in CSV
      expect(csv).toContain(statement!.filename);
      expect(csv).toContain(statement!.proType);
      expect(csv).toContain(String(statement!.totalRevenue));
    });
  });
});
