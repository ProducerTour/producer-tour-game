/**
 * Fix Script: Correct pendingBalance for Nolan Griffis
 *
 * Run with: ./scripts/run-prod.sh npx tsx scripts/fix-payout-balance.ts
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function fixPayoutBalance() {
  const userId = 'cmhn1xzr100025urm45c8doj6';
  const correctPendingBalance = 78.44;

  console.log('\n🔧 FIXING PAYOUT BALANCE DISCREPANCY\n');

  // Get current state
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      pendingBalance: true,
    },
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log(`User: ${user.firstName} ${user.lastName} (${user.email})`);
  console.log(`Current pendingBalance: $${Number(user.pendingBalance).toFixed(2)}`);
  console.log(`Correct pendingBalance: $${correctPendingBalance.toFixed(2)}`);

  // Confirm before updating
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('\nProceed with fix? (yes/no): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Aborted');
    return;
  }

  // Apply fix
  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingBalance: correctPendingBalance,
    },
  });

  // Verify
  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { pendingBalance: true },
  });

  console.log(`\n✅ Fixed! New pendingBalance: $${Number(updated?.pendingBalance).toFixed(2)}`);
}

fixPayoutBalance()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
