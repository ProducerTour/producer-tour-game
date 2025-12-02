/**
 * Backfill PlacementCredits Script
 *
 * This script links existing PlacementCredit records to Users by:
 * 1. Matching IPI numbers (highest priority)
 * 2. Matching names (fallback)
 *
 * It also populates publisherIpiNumber from the matched user's profile.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Normalize IPI number for matching (remove spaces, dashes, leading zeros)
function normalizeIPI(ipi: string): string {
  return ipi
    .replace(/[\s\-\.]/g, '')
    .replace(/^0+/, '');
}

// Normalize name for matching
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Calculate string similarity (Levenshtein-based)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

async function backfillPlacementCredits() {
  console.log('🔄 Starting PlacementCredit backfill...\n');

  try {
    // Get all PlacementCredits that need linking
    const credits = await prisma.placementCredit.findMany({
      where: {
        userId: null, // Only credits not yet linked
      },
      include: {
        placement: {
          select: { title: true }
        }
      }
    });

    console.log(`📊 Found ${credits.length} PlacementCredits to process\n`);

    if (credits.length === 0) {
      console.log('✅ No credits need backfilling!');
      return;
    }

    // Get all Users with IPI numbers for matching
    const users = await prisma.user.findMany({
      where: {
        role: 'WRITER',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        writerIpiNumber: true,
        publisherIpiNumber: true,
        producer: {
          select: {
            proAffiliation: true,
          }
        }
      }
    });

    console.log(`👥 Found ${users.length} users to match against\n`);

    // Build IPI lookup maps
    const usersByWriterIpi = new Map<string, typeof users[0]>();
    const usersByPublisherIpi = new Map<string, typeof users[0]>();

    for (const user of users) {
      if (user.writerIpiNumber) {
        usersByWriterIpi.set(normalizeIPI(user.writerIpiNumber), user);
      }
      if (user.publisherIpiNumber) {
        usersByPublisherIpi.set(normalizeIPI(user.publisherIpiNumber), user);
      }
    }

    // Process each credit
    let matchedByIpi = 0;
    let matchedByName = 0;
    let markedExternal = 0;
    const unmatchedCredits: Array<{
      placement: string;
      name: string;
      ipi: string | null;
    }> = [];

    for (const credit of credits) {
      let matchedUser: typeof users[0] | null = null;
      let matchReason = '';

      // Strategy 1: Match by IPI number
      if (credit.ipiNumber) {
        const normalizedIpi = normalizeIPI(credit.ipiNumber);

        // Check writer IPI
        if (usersByWriterIpi.has(normalizedIpi)) {
          matchedUser = usersByWriterIpi.get(normalizedIpi)!;
          matchReason = 'writer IPI';
        }
        // Check publisher IPI
        else if (usersByPublisherIpi.has(normalizedIpi)) {
          matchedUser = usersByPublisherIpi.get(normalizedIpi)!;
          matchReason = 'publisher IPI';
        }
      }

      // Strategy 2: Match by name if IPI didn't work
      if (!matchedUser) {
        const creditFullName = normalizeName(`${credit.firstName} ${credit.lastName}`);

        let bestMatch: typeof users[0] | null = null;
        let bestScore = 0;

        for (const user of users) {
          const userFullName = normalizeName(
            `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`
          );

          if (!userFullName.trim()) continue;

          const similarity = stringSimilarity(creditFullName, userFullName);

          if (similarity > bestScore && similarity >= 0.85) {
            bestScore = similarity;
            bestMatch = user;
          }
        }

        if (bestMatch) {
          matchedUser = bestMatch;
          matchReason = `name (${Math.round(bestScore * 100)}% match)`;
        }
      }

      // Update the credit
      if (matchedUser) {
        await prisma.placementCredit.update({
          where: { id: credit.id },
          data: {
            userId: matchedUser.id,
            publisherIpiNumber: matchedUser.publisherIpiNumber || null,
            isExternalWriter: false,
          }
        });

        if (matchReason.includes('IPI')) {
          matchedByIpi++;
        } else {
          matchedByName++;
        }

        const userName = `${matchedUser.firstName || ''} ${matchedUser.lastName || ''}`.trim() || matchedUser.email;
        console.log(`✅ Linked "${credit.firstName} ${credit.lastName}" → ${userName} (${matchReason})`);
      } else {
        // Mark as external writer
        await prisma.placementCredit.update({
          where: { id: credit.id },
          data: {
            isExternalWriter: true,
          }
        });

        markedExternal++;
        unmatchedCredits.push({
          placement: credit.placement.title,
          name: `${credit.firstName} ${credit.lastName}`,
          ipi: credit.ipiNumber,
        });

        console.log(`⚠️  Marked as external: "${credit.firstName} ${credit.lastName}" (Placement: ${credit.placement.title})`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total credits processed: ${credits.length}`);
    console.log(`✅ Matched by IPI:       ${matchedByIpi}`);
    console.log(`✅ Matched by name:      ${matchedByName}`);
    console.log(`⚠️  Marked as external:  ${markedExternal}`);
    console.log('='.repeat(60));

    if (unmatchedCredits.length > 0) {
      console.log('\n⚠️  UNMATCHED CREDITS (need manual review):');
      console.log('-'.repeat(60));
      for (const credit of unmatchedCredits) {
        console.log(`  • ${credit.name} (IPI: ${credit.ipi || 'N/A'}) - Placement: "${credit.placement}"`);
      }
    }

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
backfillPlacementCredits()
  .then(() => {
    console.log('\n✨ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Backfill failed:', error);
    process.exit(1);
  });
