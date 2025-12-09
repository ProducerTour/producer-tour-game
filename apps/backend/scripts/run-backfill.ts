/**
 * One-time script to backfill placement credits with user links
 * Run with: DATABASE_URL="your-production-db-url" npx tsx scripts/run-backfill.ts
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function backfillCredits() {
  console.log('[Backfill] Starting credit backfill...');

  // Find all credits without a userId
  const unlinkedCredits = await prisma.placementCredit.findMany({
    where: {
      userId: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      ipiNumber: true,
      pro: true,
      publisherIpiNumber: true,
      placement: {
        select: {
          id: true,
          title: true,
        }
      }
    }
  });

  console.log(`[Backfill] Found ${unlinkedCredits.length} unlinked credits`);

  const results = {
    total: unlinkedCredits.length,
    linked: 0,
    notFound: 0,
    errors: 0,
  };

  // Process each unlinked credit
  for (const credit of unlinkedCredits) {
    try {
      if (!credit.firstName || !credit.lastName) {
        results.notFound++;
        console.log(`  Skipped: Missing name for credit ${credit.id}`);
        continue;
      }

      // Find user by name (case-insensitive)
      const matchedUser = await prisma.user.findFirst({
        where: {
          firstName: { equals: credit.firstName, mode: 'insensitive' },
          lastName: { equals: credit.lastName, mode: 'insensitive' },
        },
        select: {
          id: true,
          writerIpiNumber: true,
          publisherIpiNumber: true,
          producer: {
            select: {
              proAffiliation: true,
            }
          }
        }
      });

      if (!matchedUser) {
        results.notFound++;
        console.log(`  Not found: No user matching "${credit.firstName} ${credit.lastName}" (song: ${credit.placement?.title})`);
        continue;
      }

      // Update the credit with user info
      await prisma.placementCredit.update({
        where: { id: credit.id },
        data: {
          userId: matchedUser.id,
          // Only update IPI/PRO if not already set
          ...((!credit.ipiNumber && matchedUser.writerIpiNumber) && {
            ipiNumber: matchedUser.writerIpiNumber,
          }),
          ...((!credit.pro && matchedUser.producer?.proAffiliation) && {
            pro: matchedUser.producer.proAffiliation,
          }),
          ...((!credit.publisherIpiNumber && matchedUser.publisherIpiNumber) && {
            publisherIpiNumber: matchedUser.publisherIpiNumber,
          }),
        },
      });

      results.linked++;
      console.log(`  ✓ Linked: "${credit.firstName} ${credit.lastName}" → user ${matchedUser.id} (song: ${credit.placement?.title})`);
    } catch (err) {
      results.errors++;
      console.error(`  ✗ Error for credit ${credit.id}:`, err);
    }
  }

  console.log('\n[Backfill] Complete!');
  console.log(`  Total credits: ${results.total}`);
  console.log(`  Linked: ${results.linked}`);
  console.log(`  Not found: ${results.notFound}`);
  console.log(`  Errors: ${results.errors}`);

  await prisma.$disconnect();
}

backfillCredits().catch(console.error);
