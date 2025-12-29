/**
 * Startup Service
 * Runs one-time initialization tasks when the server starts
 */

import { prisma } from '../lib/prisma';

/**
 * Backfill placement credits with user links
 * This links credits to users by matching firstName + lastName
 */
export async function backfillPlacementCredits(): Promise<void> {
  console.log('[Startup] Checking for unlinked placement credits...');

  try {
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

    if (unlinkedCredits.length === 0) {
      console.log('[Startup] No unlinked credits found - all credits are properly linked!');
      return;
    }

    console.log(`[Startup] Found ${unlinkedCredits.length} unlinked credits, starting backfill...`);

    let linked = 0;
    let notFound = 0;
    let errors = 0;

    // Process each unlinked credit
    for (const credit of unlinkedCredits) {
      try {
        if (!credit.firstName || !credit.lastName) {
          notFound++;
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
          notFound++;
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

        linked++;
        console.log(`[Startup] Linked: "${credit.firstName} ${credit.lastName}" → user ${matchedUser.id} (${credit.placement?.title})`);
      } catch (err) {
        errors++;
        console.error(`[Startup] Error linking credit ${credit.id}:`, err);
      }
    }

    console.log(`[Startup] Backfill complete! Linked: ${linked}, Not found: ${notFound}, Errors: ${errors}`);
  } catch (error) {
    console.error('[Startup] Error during credit backfill:', error);
  }
}

/**
 * Run all startup tasks
 */
export async function runStartupTasks(): Promise<void> {
  console.log('[Startup] Running startup tasks...');

  try {
    await backfillPlacementCredits();
    console.log('[Startup] All startup tasks completed!');
  } catch (error) {
    console.error('[Startup] Error during startup tasks:', error);
  }
}
