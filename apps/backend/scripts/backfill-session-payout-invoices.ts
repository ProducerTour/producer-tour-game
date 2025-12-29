/**
 * Backfill Invoices for Completed Session Payouts
 *
 * This script:
 * 1. Finds all COMPLETED session payouts
 * 2. Checks if an invoice already exists for each
 * 3. Creates missing invoices for any that don't have one
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('📋 Backfilling Invoices for Completed Session Payouts');
  console.log('='.repeat(60));

  // Get all completed session payouts
  const completedPayouts = await prisma.sessionPayout.findMany({
    where: { status: 'COMPLETED' },
    include: {
      submittedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { paidAt: 'asc' },
  });

  console.log(`\nFound ${completedPayouts.length} completed session payouts\n`);

  let invoicesCreated = 0;
  let invoicesSkipped = 0;
  let errors = 0;

  for (const payout of completedPayouts) {
    const expectedInvoiceNumber = `INV-SP-${payout.workOrderNumber}`;

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { invoiceNumber: expectedInvoiceNumber },
          {
            type: 'SESSION',
            submittedById: payout.submittedById,
            grossAmount: payout.payoutAmount,
            details: {
              path: ['workOrderNumber'],
              equals: payout.workOrderNumber,
            },
          },
        ],
      },
    });

    if (existingInvoice) {
      console.log(`  ⏭️  Invoice already exists for ${payout.workOrderNumber}: ${existingInvoice.invoiceNumber}`);
      invoicesSkipped++;
      continue;
    }

    // Create the invoice
    try {
      const engineerName = `${payout.submittedBy.firstName || ''} ${payout.submittedBy.lastName || ''}`.trim() || payout.submittedByName;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: expectedInvoiceNumber,
          type: 'SESSION',
          submittedById: payout.submittedById,
          submittedByName: engineerName,
          submittedByEmail: payout.submittedBy.email,
          grossAmount: payout.payoutAmount,
          commissionRate: 0, // No commission for session payouts
          commissionAmount: 0,
          netAmount: payout.payoutAmount,
          description: `Session Payout: ${payout.artistName} - ${payout.songTitles}`,
          details: {
            workOrderNumber: payout.workOrderNumber,
            artistName: payout.artistName,
            songTitles: payout.songTitles,
            sessionDate: payout.sessionDate,
            studioName: payout.studioName,
            totalHours: payout.totalHours,
            backfilled: true,
            backfilledAt: new Date().toISOString(),
          },
          status: 'PAID',
          reviewedAt: payout.reviewedAt || payout.paidAt,
          reviewedById: payout.reviewedById,
          stripeTransferId: payout.stripeTransferId,
          paidAt: payout.paidAt,
          createdAt: payout.createdAt, // Use original creation date
        },
      });

      console.log(`  ✅ Created invoice ${invoice.invoiceNumber} for ${payout.artistName} - $${Number(payout.payoutAmount).toFixed(2)}`);
      invoicesCreated++;
    } catch (error: any) {
      console.error(`  ❌ Failed to create invoice for ${payout.workOrderNumber}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Summary');
  console.log('='.repeat(60));
  console.log(`Total completed session payouts: ${completedPayouts.length}`);
  console.log(`Invoices created: ${invoicesCreated}`);
  console.log(`Invoices skipped (already exist): ${invoicesSkipped}`);
  console.log(`Errors: ${errors}`);
  console.log('='.repeat(60));

  // Also show what invoices now exist
  const totalSessionInvoices = await prisma.invoice.count({
    where: { type: 'SESSION' },
  });
  const paidSessionInvoices = await prisma.invoice.count({
    where: { type: 'SESSION', status: 'PAID' },
  });

  console.log(`\n📊 Invoice Stats:`);
  console.log(`   Total SESSION invoices: ${totalSessionInvoices}`);
  console.log(`   Paid SESSION invoices: ${paidSessionInvoices}`);
}

main()
  .catch((e) => {
    console.error('Script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
