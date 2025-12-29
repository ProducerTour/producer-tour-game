import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix a payout that was approved but didn't get a Stripe transfer
 * This will cancel the payout and return the money to the user's available balance
 *
 * Usage: npx tsx scripts/fix-incomplete-payout.ts <payout-id>
 */
async function fixIncompletePayout() {
  const payoutId = process.argv[2];

  if (!payoutId) {
    console.error('Usage: npx tsx scripts/fix-incomplete-payout.ts <payout-id>');
    console.error('Example: npx tsx scripts/fix-incomplete-payout.ts clz1234567890');
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
    console.log(`   Stripe Transfer ID: ${payout.stripeTransferId || 'NONE'}`);
    console.log(`   Failure Reason: ${payout.failureReason || 'N/A'}`);

    console.log(`\n💰 Current user balances:`);
    console.log(`   Available: $${Number(payout.user.availableBalance).toFixed(2)}`);
    console.log(`   Pending: $${Number(payout.user.pendingBalance).toFixed(2)}`);

    // Check if this payout has no Stripe transfer
    if (payout.stripeTransferId) {
      console.error(`\n⚠️  This payout already has a Stripe transfer ID: ${payout.stripeTransferId}`);
      console.error('   This script is only for payouts that were approved but never got a Stripe transfer.');
      console.error('   If you need to refund this payout, please do it manually in Stripe.');
      process.exit(1);
    }

    // Check if already cancelled
    if (payout.status === 'CANCELLED') {
      console.error(`\n⚠️  This payout is already cancelled.`);
      process.exit(1);
    }

    console.log(`\n🔧 Fixing incomplete payout...`);
    console.log(`   This will:`);
    console.log(`   1. Cancel the payout request`);
    console.log(`   2. Return $${Number(payout.amount).toFixed(2)} to available balance`);

    // Cancel the payout and return balance
    await prisma.$transaction(async (tx) => {
      // Cancel payout
      await tx.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'CANCELLED',
          failureReason: payout.failureReason || 'Cancelled due to missing Stripe transfer - admin correcting incomplete payout',
        },
      });

      // Return money to available balance
      await tx.user.update({
        where: { id: payout.userId },
        data: {
          availableBalance: { increment: Number(payout.amount) },
          pendingBalance: { decrement: Number(payout.amount) },
        },
      });
    });

    const newAvailable = Number(payout.user.availableBalance) + Number(payout.amount);
    const newPending = Number(payout.user.pendingBalance) - Number(payout.amount);

    console.log(`\n✅ Payout fixed!`);
    console.log(`   Status changed to: CANCELLED`);
    console.log(`   New balances:`);
    console.log(`   Available: $${newAvailable.toFixed(2)} (+$${Number(payout.amount).toFixed(2)})`);
    console.log(`   Pending: $${newPending.toFixed(2)} (-$${Number(payout.amount).toFixed(2)})`);

    console.log(`\n📋 Next steps:`);
    console.log(`   The user can now request a new withdrawal which will:`);
    console.log(`   1. Deduct from available balance`);
    console.log(`   2. Create the withdrawal request`);
    console.log(`   3. When you approve it, a Stripe transfer will be created`);

  } catch (error) {
    console.error('❌ Error fixing payout:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixIncompletePayout()
  .then(() => {
    console.log('\n✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
