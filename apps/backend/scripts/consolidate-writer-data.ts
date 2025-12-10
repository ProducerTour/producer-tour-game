/**
 * Consolidate Writer Data Script
 *
 * This script:
 * 1. Migrates proAffiliation from Producer → User table
 * 2. Backfills PlacementCredits with missing user data
 *
 * Run with: npx tsx scripts/consolidate-writer-data.ts
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function consolidateWriterData() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('              CONSOLIDATE WRITER DATA SCRIPT                                 ');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Migrate proAffiliation from Producer → User
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('│ Step 1: Migrate proAffiliation from Producer → User                    │');
  console.log('└─────────────────────────────────────────────────────────────────────────┘\n');

  const writers = await prisma.user.findMany({
    where: { role: 'writer' as any },  // Prisma enum expects lowercase string in DB
    include: { producer: true }
  });

  let migratedProCount = 0;
  for (const writer of writers) {
    if (!writer.writerProAffiliation && writer.producer?.proAffiliation) {
      await prisma.user.update({
        where: { id: writer.id },
        data: { writerProAffiliation: writer.producer.proAffiliation }
      });
      console.log(`   ✅ ${writer.firstName} ${writer.lastName}: ${writer.producer.proAffiliation}`);
      migratedProCount++;
    }
  }

  console.log(`\n   Migrated ${migratedProCount} PRO affiliations from Producer → User\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Backfill PlacementCredits with missing user data
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('│ Step 2: Backfill PlacementCredits with missing user data               │');
  console.log('└─────────────────────────────────────────────────────────────────────────┘\n');

  // Get all credits that have a userId but might be missing pro/ipi data
  const creditsWithUser = await prisma.placementCredit.findMany({
    where: { userId: { not: null } },
    include: {
      user: {
        include: { producer: true }
      },
      placement: {
        select: { title: true, status: true }
      }
    }
  });

  let backfilledCredits = 0;
  for (const credit of creditsWithUser) {
    if (!credit.user) continue;

    const updates: any = {};

    // Get PRO from user (prefer User.writerProAffiliation, fallback to Producer)
    const userPro = credit.user.writerProAffiliation || credit.user.producer?.proAffiliation;
    if (!credit.pro && userPro) {
      updates.pro = userPro;
    }

    // Get writer IPI from user
    if (!credit.ipiNumber && credit.user.writerIpiNumber) {
      updates.ipiNumber = credit.user.writerIpiNumber;
    }

    // Get publisher IPI from user
    if (!credit.publisherIpiNumber && credit.user.publisherIpiNumber) {
      updates.publisherIpiNumber = credit.user.publisherIpiNumber;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.placementCredit.update({
        where: { id: credit.id },
        data: updates
      });
      console.log(`   ✅ ${credit.firstName} ${credit.lastName} on "${credit.placement.title}": ${Object.keys(updates).join(', ')}`);
      backfilledCredits++;
    }
  }

  console.log(`\n   Backfilled ${backfilledCredits} PlacementCredits with user data\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Auto-link unlinked credits by name matching
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('│ Step 3: Auto-link unlinked credits by name matching                    │');
  console.log('└─────────────────────────────────────────────────────────────────────────┘\n');

  const unlinkedCredits = await prisma.placementCredit.findMany({
    where: { userId: null },
    include: {
      placement: { select: { title: true, status: true } }
    }
  });

  let linkedCredits = 0;
  for (const credit of unlinkedCredits) {
    // Try to find matching writer by name
    const matchedUser = await prisma.user.findFirst({
      where: {
        firstName: { equals: credit.firstName, mode: 'insensitive' },
        lastName: { equals: credit.lastName, mode: 'insensitive' },
        role: 'writer' as any
      },
      include: { producer: true }
    });

    if (matchedUser) {
      const userPro = matchedUser.writerProAffiliation || matchedUser.producer?.proAffiliation;

      await prisma.placementCredit.update({
        where: { id: credit.id },
        data: {
          userId: matchedUser.id,
          pro: credit.pro || userPro || undefined,
          ipiNumber: credit.ipiNumber || matchedUser.writerIpiNumber || undefined,
          publisherIpiNumber: credit.publisherIpiNumber || matchedUser.publisherIpiNumber || undefined,
          isExternalWriter: false
        }
      });

      console.log(`   ✅ Linked ${credit.firstName} ${credit.lastName} → ${matchedUser.email} on "${credit.placement.title}"`);
      linkedCredits++;
    }
  }

  console.log(`\n   Linked ${linkedCredits} credits to user accounts (${unlinkedCredits.length - linkedCredits} remain unlinked)\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('                              SUMMARY                                       ');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`
   PRO affiliations migrated:     ${migratedProCount}
   PlacementCredits backfilled:   ${backfilledCredits}
   Credits auto-linked:           ${linkedCredits}
  `);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

consolidateWriterData().catch(console.error);
