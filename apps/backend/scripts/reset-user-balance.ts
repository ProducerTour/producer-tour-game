import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Reset a user's balance by moving all pending back to available
 * and canceling all pending/failed payout requests
 *
 * Usage: npx tsx scripts/reset-user-balance.ts <email>
 */
async function resetUserBalance() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/reset-user-balance.ts <email>');
    console.error('Example: npx tsx scripts/reset-user-balance.ts nullybeats@example.com');
    process.exit(1);
  }

  console.log(`\n🔍 Looking for user: ${email}`);

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        availableBalance: true,
        pendingBalance: true,
        lifetimeEarnings: true,
      },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   Current Available Balance: $${Number(user.availableBalance).toFixed(2)}`);
    console.log(`   Current Pending Balance: $${Number(user.pendingBalance).toFixed(2)}`);
    console.log(`   Lifetime Earnings: $${Number(user.lifetimeEarnings).toFixed(2)}`);

    // Find all non-completed payout requests
    const payouts = await prisma.payoutRequest.findMany({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'FAILED', 'APPROVED', 'PROCESSING'] },
      },
      orderBy: { requestedAt: 'desc' },
    });

    if (payouts.length === 0) {
      console.log(`\n✅ No pending/failed payouts found.`);
    } else {
      console.log(`\n📋 Found ${payouts.length} payout(s) to cancel:`);
      for (const payout of payouts) {
        console.log(`   - ${payout.id}: $${Number(payout.amount).toFixed(2)} (${payout.status})`);
      }
    }

    const pendingAmount = Number(user.pendingBalance);
    if (pendingAmount === 0 && payouts.length === 0) {
      console.log(`\n✅ Nothing to reset - balance is already clean.`);
      return;
    }

    console.log(`\n🔧 Resetting balance...`);

    await prisma.$transaction(async (tx) => {
      // Cancel all non-completed payouts
      if (payouts.length > 0) {
        await tx.payoutRequest.updateMany({
          where: {
            userId: user.id,
            status: { in: ['PENDING', 'FAILED', 'APPROVED', 'PROCESSING'] },
          },
          data: {
            status: 'CANCELLED',
            failureReason: 'Cancelled by admin - balance reset',
          },
        });
      }

      // Move all pending back to available
      if (pendingAmount > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            availableBalance: { increment: pendingAmount },
            pendingBalance: 0,
          },
        });
      }
    });

    const newAvailable = Number(user.availableBalance) + pendingAmount;

    console.log(`\n✅ Balance reset complete!`);
    console.log(`   Cancelled ${payouts.length} payout(s)`);
    console.log(`   Moved $${pendingAmount.toFixed(2)} from pending to available`);
    console.log(`\n💰 New balances:`);
    console.log(`   Available: $${newAvailable.toFixed(2)}`);
    console.log(`   Pending: $0.00`);
    console.log(`   Lifetime Earnings: $${Number(user.lifetimeEarnings).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error resetting balance:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetUserBalance()
  .then(() => {
    console.log('\n✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
