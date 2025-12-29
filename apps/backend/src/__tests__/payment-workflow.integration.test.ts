/**
 * Payment Workflow Integration Tests
 *
 * Tests the complete end-to-end payment processing flow:
 * 1. Upload statement → 2. Assign writers → 3. Publish → 4. Process payment
 *
 * These tests verify that the entire workflow works correctly and that
 * all database state transitions happen as expected.
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
let statementId: string;

describe('Payment Workflow Integration Tests', () => {
  beforeAll(async () => {
    // Setup: Create test users and get auth tokens
    // Admin user
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN'
      });
    adminToken = adminRes.body.token;
    adminUserId = adminRes.body.user.id;

    // Writer user with IPI numbers
    const writerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'writer@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Writer',
        role: 'WRITER',
        writerIpiNumber: '00123456789',
        publisherIpiNumber: '1266292635' // Producer Tour publisher
      });
    writerToken = writerRes.body.token;
    writerUserId = writerRes.body.user.id;

    // Create commission settings
    await prisma.commissionSettings.create({
      data: {
        commissionRate: 15.0,
        recipientName: 'Producer Tour LLC',
        description: 'Standard commission rate',
        isActive: true,
        effectiveDate: new Date(),
        createdById: adminUserId
      }
    });

    // Create Producer Tour publisher setting
    await prisma.producerTourPublisher.create({
      data: {
        ipiNumber: '1266292635',
        publisherName: 'Producer Tour ASCAP',
        isActive: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup: Delete all test data
    await prisma.statementItem.deleteMany({});
    await prisma.statement.deleteMany({});
    await prisma.commissionSettings.deleteMany({});
    await prisma.producerTourPublisher.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { endsWith: '@test.com' } } });
    await prisma.$disconnect();
  });

  describe('Complete Payment Workflow', () => {
    it('should process a complete payment workflow from upload to paid', async () => {
      // ==================== STEP 1: Upload Statement ====================
      const csvContent = `Work Title,Writer Name,Writer IPI,Revenue,Performances
Test Song 1,Test Writer,00123456789,100.50,150
Test Song 2,Test Writer,00123456789,250.75,300`;

      const uploadRes = await request(app)
        .post('/api/statements/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('proType', 'BMI')
        .attach('statement', Buffer.from(csvContent), 'test.csv');

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.statement).toBeDefined();
      expect(uploadRes.body.statement.status).toBe('UPLOADED');
      expect(uploadRes.body.statement.totalRevenue).toBe('351.25'); // 100.50 + 250.75

      statementId = uploadRes.body.statement.id;

      // ==================== STEP 2: Smart Assign Writers ====================
      const smartAssignRes = await request(app)
        .post(`/api/statements/${statementId}/smart-assign`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(smartAssignRes.status).toBe(200);
      expect(smartAssignRes.body.summary.autoAssignedCount).toBeGreaterThan(0);

      // ==================== STEP 3: Publish Statement ====================
      // First, manually assign if smart assign didn't auto-assign
      const assignments = {
        'Test Song 1': [{ userId: writerUserId, splitPercentage: 100, writerIpiNumber: '00123456789' }],
        'Test Song 2': [{ userId: writerUserId, splitPercentage: 100, writerIpiNumber: '00123456789' }]
      };

      await request(app)
        .post(`/api/statements/${statementId}/assign-writers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignments });

      const publishRes = await request(app)
        .post(`/api/statements/${statementId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(publishRes.status).toBe(200);
      expect(publishRes.body.status).toBe('PUBLISHED');
      expect(publishRes.body.paymentStatus).toBe('UNPAID');

      // Verify statement items were created
      const items = await prisma.statementItem.findMany({
        where: { statementId }
      });

      expect(items.length).toBe(2); // Two songs
      expect(items[0].isVisibleToWriter).toBe(false); // Not visible until paid
      expect(items[0].commissionRate).toBe(15); // Uses global commission rate

      // Calculate expected totals with 15% commission
      const song1Revenue = 100.50;
      const song2Revenue = 250.75;
      const totalRevenue = song1Revenue + song2Revenue; // 351.25
      const totalCommission = totalRevenue * 0.15; // 52.6875
      const totalNet = totalRevenue - totalCommission; // 298.5625

      expect(Number(publishRes.body.totalCommission)).toBeCloseTo(totalCommission, 2);
      expect(Number(publishRes.body.totalNet)).toBeCloseTo(totalNet, 2);

      // ==================== STEP 4: Verify Writer Cannot See Statement ====================
      const writerStatementsRes = await request(app)
        .get('/api/statements')
        .set('Authorization', `Bearer ${writerToken}`);

      expect(writerStatementsRes.status).toBe(200);
      const writerStatements = writerStatementsRes.body.statements;
      const visibleStatement = writerStatements.find((s: any) => s.id === statementId);

      if (visibleStatement) {
        // Statement is visible but items should be empty/hidden
        const writerItemsRes = await request(app)
          .get(`/api/statements/${statementId}`)
          .set('Authorization', `Bearer ${writerToken}`);

        expect(writerItemsRes.body.items.length).toBe(0); // No items visible yet
      }

      // ==================== STEP 5: Get Payment Summary ====================
      const summaryRes = await request(app)
        .get(`/api/statements/${statementId}/payment-summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.totals.grossRevenue).toBeCloseTo(totalRevenue, 2);
      expect(summaryRes.body.totals.commissionToProducerTour).toBeCloseTo(totalCommission, 2);
      expect(summaryRes.body.totals.netToWriters).toBeCloseTo(totalNet, 2);
      expect(summaryRes.body.writers.length).toBe(1);
      expect(summaryRes.body.writers[0].userId).toBe(writerUserId);

      // ==================== STEP 6: Get Unpaid Statements ====================
      const unpaidRes = await request(app)
        .get('/api/statements/unpaid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(unpaidRes.status).toBe(200);
      expect(unpaidRes.body.length).toBeGreaterThan(0);
      const unpaidStatement = unpaidRes.body.find((s: any) => s.id === statementId);
      expect(unpaidStatement).toBeDefined();
      expect(unpaidStatement.paymentStatus).toBe('UNPAID');

      // ==================== STEP 7: Process Payment ====================
      const processPaymentRes = await request(app)
        .post(`/api/statements/${statementId}/process-payment`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(processPaymentRes.status).toBe(200);
      expect(processPaymentRes.body.success).toBe(true);
      expect(processPaymentRes.body.statement.paymentStatus).toBe('PAID');
      expect(processPaymentRes.body.statement.paymentProcessedAt).toBeDefined();

      // ==================== STEP 8: Verify Database State After Payment ====================
      const updatedStatement = await prisma.statement.findUnique({
        where: { id: statementId },
        include: { items: true }
      });

      expect(updatedStatement!.paymentStatus).toBe('PAID');
      expect(updatedStatement!.paymentProcessedAt).toBeDefined();
      expect(updatedStatement!.paymentProcessedById).toBe(adminUserId);

      // All items should now be visible to writers
      updatedStatement!.items.forEach(item => {
        expect(item.isVisibleToWriter).toBe(true);
        expect(item.paidAt).toBeDefined();
      });

      // ==================== STEP 9: Verify Writer Can Now See Earnings ====================
      const writerItemsAfterPaymentRes = await request(app)
        .get(`/api/statements/${statementId}`)
        .set('Authorization', `Bearer ${writerToken}`);

      expect(writerItemsAfterPaymentRes.status).toBe(200);
      expect(writerItemsAfterPaymentRes.body.items.length).toBe(2); // Now visible!

      const totalWriterRevenue = writerItemsAfterPaymentRes.body.items.reduce(
        (sum: number, item: any) => sum + Number(item.netRevenue),
        0
      );
      expect(totalWriterRevenue).toBeCloseTo(totalNet, 2);

      // ==================== STEP 10: Verify Statement No Longer Appears as Unpaid ====================
      const unpaidAfterRes = await request(app)
        .get('/api/statements/unpaid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(unpaidAfterRes.status).toBe(200);
      const stillUnpaid = unpaidAfterRes.body.find((s: any) => s.id === statementId);
      expect(stillUnpaid).toBeUndefined(); // Should not appear in unpaid list anymore
    });
  });

  describe('Payment Processing Edge Cases', () => {
    it('should prevent double payment processing', async () => {
      // Try to process payment again on already paid statement
      const doublePaymentRes = await request(app)
        .post(`/api/statements/${statementId}/process-payment`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(doublePaymentRes.status).toBe(400);
      expect(doublePaymentRes.body.error).toContain('already paid');
    });

    it('should require admin role to process payments', async () => {
      // Create new unpublished statement
      const csvContent = `Work Title,Writer Name,Writer IPI,Revenue,Performances
Test Song 3,Test Writer,00123456789,50.00,100`;

      const uploadRes = await request(app)
        .post('/api/statements/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('proType', 'ASCAP')
        .attach('statement', Buffer.from(csvContent), 'test.csv');

      const newStatementId = uploadRes.body.statement.id;

      // Assign and publish
      await request(app)
        .post(`/api/statements/${newStatementId}/assign-writers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignments: {
            'Test Song 3': [{ userId: writerUserId, splitPercentage: 100, writerIpiNumber: '00123456789' }]
          }
        });

      await request(app)
        .post(`/api/statements/${newStatementId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to process payment as writer (should fail)
      const writerPaymentRes = await request(app)
        .post(`/api/statements/${newStatementId}/process-payment`)
        .set('Authorization', `Bearer ${writerToken}`);

      expect(writerPaymentRes.status).toBe(403); // Forbidden
    });

    it('should calculate correct totals for multi-writer splits', async () => {
      // Create second writer
      const writer2Res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'writer2@test.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'Writer Two',
          role: 'WRITER',
          writerIpiNumber: '00987654321'
        });

      const writer2Id = writer2Res.body.user.id;

      // Upload statement
      const csvContent = `Work Title,Writer Name,Writer IPI,Revenue,Performances
Collab Song,Test Writer,00123456789,200.00,400`;

      const uploadRes = await request(app)
        .post('/api/statements/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('proType', 'BMI')
        .attach('statement', Buffer.from(csvContent), 'test.csv');

      const multiWriterStatementId = uploadRes.body.statement.id;

      // Assign 60/40 split
      await request(app)
        .post(`/api/statements/${multiWriterStatementId}/assign-writers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignments: {
            'Collab Song': [
              { userId: writerUserId, splitPercentage: 60, writerIpiNumber: '00123456789' },
              { userId: writer2Id, splitPercentage: 40, writerIpiNumber: '00987654321' }
            ]
          }
        });

      // Publish
      await request(app)
        .post(`/api/statements/${multiWriterStatementId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Get payment summary
      const summaryRes = await request(app)
        .get(`/api/statements/${multiWriterStatementId}/payment-summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify split calculations
      // Writer 1: 200 * 0.60 = 120, commission = 18, net = 102
      // Writer 2: 200 * 0.40 = 80, commission = 12, net = 68
      // Total commission: 30, Total net: 170

      const writer1 = summaryRes.body.writers.find((w: any) => w.userId === writerUserId);
      const writer2 = summaryRes.body.writers.find((w: any) => w.userId === writer2Id);

      expect(writer1.grossRevenue).toBeCloseTo(120, 2);
      expect(writer1.commissionAmount).toBeCloseTo(18, 2);
      expect(writer1.netRevenue).toBeCloseTo(102, 2);

      expect(writer2.grossRevenue).toBeCloseTo(80, 2);
      expect(writer2.commissionAmount).toBeCloseTo(12, 2);
      expect(writer2.netRevenue).toBeCloseTo(68, 2);

      expect(summaryRes.body.totals.grossRevenue).toBeCloseTo(200, 2);
      expect(summaryRes.body.totals.commissionToProducerTour).toBeCloseTo(30, 2);
      expect(summaryRes.body.totals.netToWriters).toBeCloseTo(170, 2);

      // Process payment
      await request(app)
        .post(`/api/statements/${multiWriterStatementId}/process-payment`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Both writers should see their respective items
      const writer1ItemsRes = await request(app)
        .get(`/api/statements/${multiWriterStatementId}`)
        .set('Authorization', `Bearer ${writerToken}`);

      expect(writer1ItemsRes.body.items.length).toBe(1);
      expect(Number(writer1ItemsRes.body.items[0].revenue)).toBeCloseTo(120, 2);
      expect(Number(writer1ItemsRes.body.items[0].netRevenue)).toBeCloseTo(102, 2);
    });

    it('should handle commission rate overrides correctly', async () => {
      // Create writer with custom commission override (10% instead of global 15%)
      const vipWriterRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'vip@test.com',
          password: 'password123',
          firstName: 'VIP',
          lastName: 'Writer',
          role: 'WRITER',
          writerIpiNumber: '00111222333',
          commissionOverrideRate: 10.0
        });

      const vipWriterId = vipWriterRes.body.user.id;

      // Upload statement
      const csvContent = `Work Title,Writer Name,Writer IPI,Revenue,Performances
VIP Song,VIP Writer,00111222333,100.00,200`;

      const uploadRes = await request(app)
        .post('/api/statements/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('proType', 'ASCAP')
        .attach('statement', Buffer.from(csvContent), 'test.csv');

      const vipStatementId = uploadRes.body.statement.id;

      // Assign and publish
      await request(app)
        .post(`/api/statements/${vipStatementId}/assign-writers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignments: {
            'VIP Song': [{ userId: vipWriterId, splitPercentage: 100, writerIpiNumber: '00111222333' }]
          }
        });

      await request(app)
        .post(`/api/statements/${vipStatementId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Get payment summary
      const summaryRes = await request(app)
        .get(`/api/statements/${vipStatementId}/payment-summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      // VIP writer should have 10% commission, not 15%
      // Revenue: 100, Commission: 10, Net: 90
      const vipWriter = summaryRes.body.writers.find((w: any) => w.userId === vipWriterId);

      expect(vipWriter.grossRevenue).toBeCloseTo(100, 2);
      expect(vipWriter.commissionAmount).toBeCloseTo(10, 2);
      expect(vipWriter.netRevenue).toBeCloseTo(90, 2);
    });

    it('should handle micro-amounts with correct precision', async () => {
      // Upload statement with very small amounts
      const csvContent = `Work Title,Writer Name,Writer IPI,Revenue,Performances
Micro Song,Test Writer,00123456789,0.0001,1`;

      const uploadRes = await request(app)
        .post('/api/statements/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('proType', 'BMI')
        .attach('statement', Buffer.from(csvContent), 'test.csv');

      const microStatementId = uploadRes.body.statement.id;

      // Assign and publish
      await request(app)
        .post(`/api/statements/${microStatementId}/assign-writers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignments: {
            'Micro Song': [{ userId: writerUserId, splitPercentage: 100, writerIpiNumber: '00123456789' }]
          }
        });

      await request(app)
        .post(`/api/statements/${microStatementId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Process payment
      await request(app)
        .post(`/api/statements/${microStatementId}/process-payment`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify precision is maintained (DECIMAL(12,6) in database)
      const items = await prisma.statementItem.findMany({
        where: { statementId: microStatementId }
      });

      expect(items.length).toBe(1);
      expect(Number(items[0].revenue)).toBe(0.0001);

      // Commission: 0.0001 * 0.15 = 0.000015
      // Net: 0.0001 - 0.000015 = 0.000085
      expect(Number(items[0].commissionAmount)).toBeCloseTo(0.000015, 6);
      expect(Number(items[0].netRevenue)).toBeCloseTo(0.000085, 6);
    });
  });

  describe('Republish Workflow', () => {
    it('should allow republishing unpaid statements with recalculated precision', async () => {
      // Upload and publish a statement
      const csvContent = `Work Title,Writer Name,Writer IPI,Revenue,Performances
Republish Song,Test Writer,00123456789,150.00,250`;

      const uploadRes = await request(app)
        .post('/api/statements/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('proType', 'BMI')
        .attach('statement', Buffer.from(csvContent), 'test.csv');

      const republishStatementId = uploadRes.body.statement.id;

      await request(app)
        .post(`/api/statements/${republishStatementId}/assign-writers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignments: {
            'Republish Song': [{ userId: writerUserId, splitPercentage: 100, writerIpiNumber: '00123456789' }]
          }
        });

      await request(app)
        .post(`/api/statements/${republishStatementId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Get original items count
      const itemsBefore = await prisma.statementItem.findMany({
        where: { statementId: republishStatementId }
      });
      expect(itemsBefore.length).toBe(1);

      // Republish
      const republishRes = await request(app)
        .post(`/api/statements/${republishStatementId}/republish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(republishRes.status).toBe(200);
      expect(republishRes.body.message).toContain('republished successfully');
      expect(republishRes.body.itemsRecreated).toBe(1);

      // Verify items were recreated
      const itemsAfter = await prisma.statementItem.findMany({
        where: { statementId: republishStatementId }
      });
      expect(itemsAfter.length).toBe(1);

      // Revenue should match
      expect(Number(itemsAfter[0].revenue)).toBeCloseTo(150, 2);
    });

    it('should prevent republishing paid statements', async () => {
      // Try to republish the already-paid statement from earlier
      const republishRes = await request(app)
        .post(`/api/statements/${statementId}/republish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(republishRes.status).toBe(400);
      expect(republishRes.body.error).toContain('Cannot republish paid statement');
    });
  });
});
