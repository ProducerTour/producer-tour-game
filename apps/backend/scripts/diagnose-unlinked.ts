/**
 * Quick diagnostic: Show unlinked credits vs PT writers
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('\n=== UNLINKED CREDITS ===\n');

  const unlinked = await prisma.placementCredit.findMany({
    where: { userId: null },
    select: { firstName: true, lastName: true },
    distinct: ['firstName', 'lastName']
  });

  console.log(`Found ${unlinked.length} distinct unlinked names:`);
  unlinked.slice(0, 30).forEach(c => {
    console.log(`  - "${c.firstName}" "${c.lastName}"`);
  });

  console.log('\n=== PT WRITERS ===\n');

  const writers = await prisma.user.findMany({
    where: { role: 'WRITER' },
    select: { firstName: true, lastName: true }
  });

  console.log(`Found ${writers.length} writers:`);
  writers.forEach(w => {
    console.log(`  - "${w.firstName}" "${w.lastName}"`);
  });

  // Check for potential matches
  console.log('\n=== POTENTIAL MATCHES (fuzzy) ===\n');

  const normalize = (s: string) => s?.toLowerCase().trim().replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, '') || '';

  for (const credit of unlinked) {
    const creditFirst = normalize(credit.firstName);
    const creditLast = normalize(credit.lastName);
    const creditFull = `${creditFirst} ${creditLast}`;

    for (const writer of writers) {
      const writerFirst = normalize(writer.firstName || '');
      const writerLast = normalize(writer.lastName || '');
      const writerFull = `${writerFirst} ${writerLast}`;

      // Check for partial match
      if (creditFirst === writerFirst && (creditLast.includes(writerLast) || writerLast.includes(creditLast))) {
        console.log(`  MATCH: Credit "${credit.firstName} ${credit.lastName}" → Writer "${writer.firstName} ${writer.lastName}"`);
      } else if (writerFull.includes(creditFull) || creditFull.includes(writerFull)) {
        console.log(`  MATCH: Credit "${credit.firstName} ${credit.lastName}" → Writer "${writer.firstName} ${writer.lastName}"`);
      }
    }
  }

  await prisma.$disconnect();
}

diagnose().catch(console.error);
