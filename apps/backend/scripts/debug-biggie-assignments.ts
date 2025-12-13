/**
 * Debug script to check BIGGIE SMALL writer assignments in statement metadata
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkAssignments() {
  // Find the statement
  const stmt = await prisma.statement.findFirst({
    where: { filename: { contains: '92606' } },
    select: {
      id: true,
      filename: true,
      metadata: true
    }
  });

  if (!stmt) {
    console.log('Statement not found');
    await prisma.$disconnect();
    return;
  }

  console.log('=== STATEMENT METADATA ===');
  console.log('Filename:', stmt.filename);

  const metadata = stmt.metadata as any;
  const writerAssignments = metadata?.writerAssignments || {};

  // Find all BIGGIE SMALL related assignment keys
  console.log('\n=== BIGGIE SMALL ASSIGNMENT KEYS ===');
  const biggieKeys = Object.keys(writerAssignments).filter(key =>
    key.toLowerCase().includes('biggie')
  );

  console.log('Found', biggieKeys.length, 'BIGGIE SMALL assignment keys:\n');

  for (const key of biggieKeys.slice(0, 20)) {
    const assignments = writerAssignments[key];
    console.log(`\nKey: ${key}`);
    console.log(`  Writers assigned: ${assignments.length}`);

    for (const a of assignments) {
      // Look up user name
      const user = await prisma.user.findUnique({
        where: { id: a.userId },
        select: { firstName: true, lastName: true }
      });
      console.log(`    - ${user?.firstName} ${user?.lastName}: ${a.splitPercentage}%`);
      if (a.publisherIpiNumber) {
        console.log(`      Publisher IPI: ${a.publisherIpiNumber}`);
      }
    }
  }

  // Show total assignment breakdown
  console.log('\n=== ASSIGNMENT BREAKDOWN ===');
  console.log('Total assignment keys for BIGGIE SMALL:', biggieKeys.length);

  // Count users across all BIGGIE keys
  const userCounts = new Map<string, number>();
  for (const key of biggieKeys) {
    for (const a of writerAssignments[key]) {
      const current = userCounts.get(a.userId) || 0;
      userCounts.set(a.userId, current + 1);
    }
  }

  console.log('\nAssignments per user:');
  for (const [userId, count] of userCounts) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });
    console.log(`  ${user?.firstName} ${user?.lastName}: ${count} assignment entries`);
  }

  // Now check what the publisher IPIs in the keys look like
  console.log('\n=== PUBLISHER IPIs IN KEYS ===');
  const ipis = new Set<string>();
  for (const key of biggieKeys) {
    const parts = key.split('|');
    if (parts.length >= 2) {
      ipis.add(parts[1]);
    }
  }
  console.log('Unique publisher IPIs:', Array.from(ipis));

  await prisma.$disconnect();
}

checkAssignments().catch(console.error);
