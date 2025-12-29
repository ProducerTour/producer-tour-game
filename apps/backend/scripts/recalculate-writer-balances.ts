/**
 * Recalculate and sync writer balances from statement items
 *
 * The User.availableBalance and User.lifetimeEarnings fields may be stale
 * due to duplicate statement items that were later cleaned up.
 *
 * This script:
 * 1. Calculates correct lifetimeEarnings from all published statement items
 * 2. Subtracts any payouts to get correct availableBalance
 * 3. Updates User records to match
 */
import { PrismaClient, UserRole } from '../src/generated/client';

const prisma = new PrismaClient();

async function recalculateWriterBalances() {
  console.log('=== RECALCULATING WRITER BALANCES ===\n');

  // Get all writers with their current balance fields
  const writers = await prisma.user.findMany({
    where: { role: UserRole.WRITER },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      availableBalance: true,
      lifetimeEarnings: true,
    }
  });

  console.log(`Found ${writers.length} writers\n`);

  const updates: Array<{
    userId: string;
    name: string;
    email: string;
    oldAvailable: number;
    oldLifetime: number;
    newAvailable: number;
    newLifetime: number;
    totalPayouts: number;
  }> = [];

  for (const writer of writers) {
    // Calculate correct lifetime earnings from PUBLISHED statement items
    const earningsResult = await prisma.statementItem.aggregate({
      where: {
        userId: writer.id,
        isVisibleToWriter: true,
        statement: {
          status: 'PUBLISHED',
          paymentStatus: 'PAID'
        }
      },
      _sum: {
        netRevenue: true
      }
    });

    const correctLifetimeEarnings = Number(earningsResult._sum.netRevenue || 0);

    // Get total payouts made to this writer
    const payoutsResult = await prisma.payoutRequest.aggregate({
      where: {
        userId: writer.id,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    const totalPayouts = Number(payoutsResult._sum.amount || 0);

    // Available balance = lifetime earnings - payouts
    const correctAvailableBalance = correctLifetimeEarnings - totalPayouts;

    const oldAvailable = Number(writer.availableBalance);
    const oldLifetime = Number(writer.lifetimeEarnings);

    // Check if there's a discrepancy
    const availableDiff = Math.abs(oldAvailable - correctAvailableBalance);
    const lifetimeDiff = Math.abs(oldLifetime - correctLifetimeEarnings);

    if (availableDiff > 0.01 || lifetimeDiff > 0.01) {
      updates.push({
        userId: writer.id,
        name: `${writer.firstName} ${writer.lastName}`,
        email: writer.email,
        oldAvailable,
        oldLifetime,
        newAvailable: correctAvailableBalance,
        newLifetime: correctLifetimeEarnings,
        totalPayouts
      });
    }
  }

  console.log(`Found ${updates.length} writers with balance discrepancies:\n`);

  for (const u of updates) {
    console.log(`${u.name} (${u.email}):`);
    console.log(`  Lifetime: $${u.oldLifetime.toFixed(2)} → $${u.newLifetime.toFixed(2)} (diff: $${(u.oldLifetime - u.newLifetime).toFixed(2)})`);
    console.log(`  Available: $${u.oldAvailable.toFixed(2)} → $${u.newAvailable.toFixed(2)} (diff: $${(u.oldAvailable - u.newAvailable).toFixed(2)})`);
    console.log(`  Total payouts: $${u.totalPayouts.toFixed(2)}`);
    console.log('');
  }

  // Apply updates
  if (updates.length > 0) {
    console.log('=== APPLYING UPDATES ===\n');

    for (const u of updates) {
      await prisma.user.update({
        where: { id: u.userId },
        data: {
          availableBalance: u.newAvailable,
          lifetimeEarnings: u.newLifetime
        }
      });
      console.log(`✅ Updated ${u.name}`);
    }

    console.log('\n=== DONE ===');
    console.log(`Updated ${updates.length} writer balances to match statement items.`);
  } else {
    console.log('✅ All writer balances are already correct!');
  }

  await prisma.$disconnect();
}

recalculateWriterBalances().catch(console.error);
