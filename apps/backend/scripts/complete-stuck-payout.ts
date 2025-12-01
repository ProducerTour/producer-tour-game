import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Complete a payout that has a successful Stripe transfer but is stuck at PROCESSING/APPROVED status
 * This can happen when running in production mode where the code previously
 * didn't mark payouts as completed after successful transfers.
 *
 * Usage: npx tsx scripts/complete-stuck-payout.ts <payout-id>
 */
async function completeStuckPayout() {
  const payoutId = process.argv[2];

  if (!payoutId) {
    console.error('Usage: npx tsx scripts/complete-stuck-payout.ts <payout-id>');
    console.error('Example: npx tsx scripts/complete-stuck-payout.ts clz1234567890');
    process.exit(1);
  }

  console.log(`\n🔍 Looking for payout: ${payoutId}`);

  try {
    // Find payout
    const payout = await prisma.payoutRequest.findUnique({
      where: { id: payoutId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            availableBalance: true,
            pendingBalance: true,
          },
        },
      },
    });

    if (!payout) {
      console.error(`❌ Payout not found: ${payoutId}`);
      process.exit(1);
    }

    console.log(`✅ Found payout:`);
    console.log(`   User: ${payout.user.firstName} ${payout.user.lastName} (${payout.user.email})`);
    console.log(`   Amount: $${Number(payout.amount).toFixed(2)}`);
    console.log(`   Status: ${payout.status}`);
    console.log(`   Requested At: ${payout.requestedAt}`);
    console.log(`   Approved At: ${payout.approvedAt || 'N/A'}`);
    console.log(`   Stripe Transfer ID: ${payout.stripeTransferId || 'NONE'}`);

    console.log(`\n💰 Current user balances:`);
    console.log(`   Available: $${Number(payout.user.availableBalance).toFixed(2)}`);
    console.log(`   Pending: $${Number(payout.user.pendingBalance).toFixed(2)}`);

    // Check if payout has a Stripe transfer (meaning it was actually paid)
    if (!payout.stripeTransferId) {
      console.error(`\n⚠️  This payout has no Stripe transfer ID.`);
      console.error('   This script is only for payouts that have a successful Stripe transfer but are stuck.');
      console.error('   Use fix-incomplete-payout.ts instead to cancel and refund.');
      process.exit(1);
    }

    // Check if already completed
    if (payout.status === 'COMPLETED') {
      console.log(`\n✅ This payout is already marked as COMPLETED.`);
      process.exit(0);
    }

    // Only allow fixing APPROVED or PROCESSING payouts
    if (!['APPROVED', 'PROCESSING', 'PENDING'].includes(payout.status)) {
      console.error(`\n⚠️  This payout has status: ${payout.status}`);
      console.error('   This script can only fix PENDING, APPROVED or PROCESSING payouts.');
      process.exit(1);
    }

    console.log(`\n🔧 Completing stuck payout...`);
    console.log(`   This will:`);
    console.log(`   1. Mark the payout as COMPLETED`);
    console.log(`   2. Deduct $${Number(payout.amount).toFixed(2)} from pending balance`);

    // Complete the payout
    await prisma.$transaction(async (tx) => {
      // Mark as completed
      await tx.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          processedAt: payout.processedAt || new Date(),
        },
      });

      // Deduct from pending balance
      await tx.user.update({
        where: { id: payout.userId },
        data: {
          pendingBalance: { decrement: Number(payout.amount) },
        },
      });
    });

    const newPending = Number(payout.user.pendingBalance) - Number(payout.amount);

    console.log(`\n✅ Payout completed!`);
    console.log(`   Status changed to: COMPLETED`);
    console.log(`   Stripe Transfer: ${payout.stripeTransferId}`);
    console.log(`   New pending balance: $${newPending.toFixed(2)} (-$${Number(payout.amount).toFixed(2)})`);

  } catch (error) {
    console.error('❌ Error completing payout:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

completeStuckPayout()
  .then(() => {
    console.log('\n✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
