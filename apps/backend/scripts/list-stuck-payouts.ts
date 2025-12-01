import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

/**
 * List all payouts that are stuck (have Stripe transfer but not COMPLETED)
 *
 * Usage: npx tsx scripts/list-stuck-payouts.ts
 */
async function listStuckPayouts() {
  console.log(`\n🔍 Looking for stuck payouts...\n`);

  try {
    // Find payouts that have a Stripe transfer but aren't completed
    const stuckPayouts = await prisma.payoutRequest.findMany({
      where: {
        stripeTransferId: { not: null },
        status: { notIn: ['COMPLETED', 'FAILED', 'CANCELLED'] },
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

    if (stuckPayouts.length === 0) {
      console.log('✅ No stuck payouts found!\n');
      return;
    }

    console.log(`⚠️  Found ${stuckPayouts.length} stuck payout(s):\n`);
    console.log('─'.repeat(100));

    for (const payout of stuckPayouts) {
      console.log(`ID: ${payout.id}`);
      console.log(`User: ${payout.user.firstName} ${payout.user.lastName} (${payout.user.email})`);
      console.log(`Amount: $${Number(payout.amount).toFixed(2)}`);
      console.log(`Status: ${payout.status}`);
      console.log(`Stripe Transfer: ${payout.stripeTransferId}`);
      console.log(`Requested: ${payout.requestedAt}`);
      console.log(`Approved: ${payout.approvedAt || 'N/A'}`);
      console.log('─'.repeat(100));
    }

    console.log(`\n📋 To fix a stuck payout, run:`);
    console.log(`   npx tsx scripts/complete-stuck-payout.ts <payout-id>\n`);

  } catch (error) {
    console.error('❌ Error listing payouts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listStuckPayouts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
