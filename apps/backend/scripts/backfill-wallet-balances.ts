/**
 * Backfill Wallet Balances Script
 *
 * This script calculates wallet balances for all users based on their
 * existing paid statement items and updates their availableBalance and
 * lifetimeEarnings fields.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillWalletBalances() {
  console.log('🔄 Starting wallet balance backfill...\n');

  try {
    // Get all PAID statements
    const paidStatements = await prisma.statement.findMany({
      where: {
        paymentStatus: 'PAID'
      },
      include: {
        items: {
          select: {
            userId: true,
            netRevenue: true,
          }
        }
      }
    });

    console.log(`📊 Found ${paidStatements.length} paid statements\n`);

    // Calculate total earnings per user
    const userEarnings = new Map<string, number>();

    for (const statement of paidStatements) {
      for (const item of statement.items) {
        const netRevenue = Number(item.netRevenue);
        const currentTotal = userEarnings.get(item.userId) || 0;
        userEarnings.set(item.userId, currentTotal + netRevenue);
      }
    }

    console.log(`👥 Found ${userEarnings.size} users with earnings\n`);

    // Update each user's wallet balance
    let updated = 0;
    for (const [userId, totalEarnings] of userEarnings.entries()) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true }
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          availableBalance: totalEarnings,
          lifetimeEarnings: totalEarnings,
          pendingBalance: 0, // Reset pending balance
        }
      });

      const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : userId;
      console.log(`✅ Updated ${userName}: $${totalEarnings.toFixed(2)}`);
      updated++;
    }

    console.log(`\n🎉 Successfully updated ${updated} user wallet balances!`);

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
backfillWalletBalances()
  .then(() => {
    console.log('\n✨ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Backfill failed:', error);
    process.exit(1);
  });
