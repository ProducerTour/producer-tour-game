/**
 * Reset Writer Balances to Zero Script
 *
 * For open beta launch - resets all writer wallet balances to $0
 * Run this after deleting all statements to start fresh.
 */
import { PrismaClient, UserRole } from '../src/generated/client';

const prisma = new PrismaClient();

async function resetWriterBalancesToZero() {
  console.log('=== RESETTING WRITER BALANCES TO ZERO ===\n');

  // Get all writers with their current balances
  const writers = await prisma.user.findMany({
    where: { role: UserRole.WRITER },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      availableBalance: true,
      lifetimeEarnings: true,
      pendingBalance: true,
    }
  });

  console.log(`Found ${writers.length} writers\n`);

  // Filter to only writers who have non-zero balances
  const writersToReset = writers.filter(w =>
    Number(w.availableBalance) !== 0 ||
    Number(w.lifetimeEarnings) !== 0 ||
    Number(w.pendingBalance) !== 0
  );

  if (writersToReset.length === 0) {
    console.log('All writer balances are already at $0!');
    await prisma.$disconnect();
    return;
  }

  console.log(`${writersToReset.length} writers have non-zero balances:\n`);

  for (const writer of writersToReset) {
    const name = `${writer.firstName || ''} ${writer.lastName || ''}`.trim() || writer.email;
    console.log(`${name}:`);
    console.log(`  Available: $${Number(writer.availableBalance).toFixed(2)} → $0.00`);
    console.log(`  Lifetime:  $${Number(writer.lifetimeEarnings).toFixed(2)} → $0.00`);
    console.log(`  Pending:   $${Number(writer.pendingBalance).toFixed(2)} → $0.00`);
    console.log('');
  }

  console.log('=== APPLYING RESET ===\n');

  // Reset all writers to zero in a single query
  const result = await prisma.user.updateMany({
    where: { role: UserRole.WRITER },
    data: {
      availableBalance: 0,
      lifetimeEarnings: 0,
      pendingBalance: 0,
    }
  });

  console.log(`Reset ${result.count} writer balances to $0`);
  console.log('\n=== DONE ===');

  await prisma.$disconnect();
}

resetWriterBalancesToZero().catch(console.error);
