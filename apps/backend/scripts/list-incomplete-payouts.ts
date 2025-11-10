import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * List all payouts that were approved/completed but have no Stripe transfer ID
 * These are payouts that need to be fixed
 */
async function listIncompletePayouts() {
  console.log('\n🔍 Finding incomplete payouts...\n');

  try {
    // Find payouts that are approved/processing/completed but have no Stripe transfer
    const incompletePayouts = await prisma.payoutRequest.findMany({
      where: {
        status: { in: ['APPROVED', 'PROCESSING', 'COMPLETED'] },
        stripeTransferId: null,
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    if (incompletePayouts.length === 0) {
      console.log('✅ No incomplete payouts found! All approved payouts have Stripe transfers.');
      return;
    }

    console.log(`⚠️  Found ${incompletePayouts.length} incomplete payout(s):\n`);

    for (const payout of incompletePayouts) {
      const userName = `${payout.user.firstName || ''} ${payout.user.lastName || ''}`.trim() || 'No name';

      console.log(`───────────────────────────────────────────────────────────────`);
      console.log(`Payout ID: ${payout.id}`);
      console.log(`User: ${userName} (${payout.user.email})`);
      console.log(`Amount: $${Number(payout.amount).toFixed(2)}`);
      console.log(`Status: ${payout.status}`);
      console.log(`Requested: ${payout.requestedAt.toISOString()}`);
      console.log(`Approved: ${payout.approvedAt?.toISOString() || 'N/A'}`);
      console.log(`Stripe Transfer: MISSING ❌`);
      if (payout.failureReason) {
        console.log(`Failure Reason: ${payout.failureReason}`);
      }
      console.log(`\n🔧 To fix: npx tsx scripts/fix-incomplete-payout.ts ${payout.id}`);
      console.log();
    }

    console.log(`───────────────────────────────────────────────────────────────`);
    console.log(`\n📋 Summary:`);
    console.log(`   Total incomplete payouts: ${incompletePayouts.length}`);
    console.log(`   Total amount stuck: $${incompletePayouts.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}`);

    console.log(`\n💡 What happened?`);
    console.log(`   These payouts were approved before the Stripe transfer logic was working.`);
    console.log(`   The balance was moved from available to pending, but no Stripe transfer was created.`);

    console.log(`\n🔧 How to fix:`);
    console.log(`   Run the fix script for each payout ID shown above.`);
    console.log(`   This will cancel the payout and return the money to the user's available balance.`);
    console.log(`   Then the user can request a new withdrawal that will work correctly.`);

  } catch (error) {
    console.error('❌ Error listing payouts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listIncompletePayouts()
  .then(() => {
    console.log('\n✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
