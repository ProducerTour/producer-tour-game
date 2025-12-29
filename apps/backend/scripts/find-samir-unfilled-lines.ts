/**
 * Find exactly which lines are unfilled for Samir Knox
 * and why they're not matching
 */
import { PrismaClient } from '../src/generated/client';
import { matchSongToPlacement, normalizeSongTitle, stringSimilarity } from '../src/utils/placement-matcher';

const prisma = new PrismaClient();

async function findSamirUnfilledLines() {
  console.log('=== FINDING SAMIR UNFILLED MLC LINES ===\n');

  // Get latest MLC statement
  const statement = await prisma.statement.findFirst({
    where: { proType: 'MLC' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      metadata: true
    }
  });

  if (!statement) {
    console.log('No MLC statement found');
    await prisma.$disconnect();
    return;
  }

  console.log('Statement:', statement.filename);

  // Get Samir's user record
  const samirUser = await prisma.user.findFirst({
    where: { firstName: 'Samir', lastName: 'Knox' }
  });

  if (!samirUser) {
    console.log('Samir user not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Samir User ID:', samirUser.id);

  // Get ALL of Samir's placements (approved and tracking)
  const samirPlacements = await prisma.placement.findMany({
    where: {
      status: { in: ['APPROVED', 'TRACKING'] },
      credits: {
        some: {
          userId: samirUser.id
        }
      }
    },
    select: {
      id: true,
      title: true,
      status: true,
      credits: {
        include: {
          user: true
        }
      }
    }
  });

  console.log('\n=== SAMIR\'S PLACEMENTS ===\n');
  console.log(`Total: ${samirPlacements.length} placements\n`);

  for (const p of samirPlacements) {
    console.log(`• "${p.title}" (${p.status})`);
    console.log(`  Normalized: "${normalizeSongTitle(p.title)}"`);

    const samirCredit = p.credits.find(c => c.userId === samirUser.id);
    if (samirCredit) {
      console.log(`  Samir's split: ${samirCredit.splitPercentage}%`);
    }
  }

  // Get parsed items from metadata
  const metadata = statement.metadata as any;
  const parsedItems = metadata?.parsedItems || [];

  console.log('\n=== CHECKING PARSED ITEMS FOR SAMIR\'S SONGS ===\n');

  // Map of placement titles (normalized) to placement
  const placementTitles = samirPlacements.map(p => ({
    original: p.title,
    normalized: normalizeSongTitle(p.title),
    id: p.id
  }));

  // Check each parsed item against Samir's placements
  const matchedLines: any[] = [];
  const unmatchedLines: any[] = [];

  for (const item of parsedItems) {
    const itemTitle = item.workTitle;
    const normalizedItem = normalizeSongTitle(itemTitle);

    // Check if this matches any of Samir's placements
    let matched = false;
    let matchedPlacement: any = null;

    for (const p of placementTitles) {
      // Exact normalized match
      if (normalizedItem === p.normalized) {
        matched = true;
        matchedPlacement = p;
        break;
      }

      // Fuzzy match (80% threshold)
      const similarity = stringSimilarity(normalizedItem, p.normalized);
      if (similarity >= 0.8) {
        matched = true;
        matchedPlacement = p;
        break;
      }
    }

    if (matched) {
      matchedLines.push({ ...item, matchedTo: matchedPlacement?.original });
    } else {
      // Check if it's similar to any of Samir's songs (might be a near-miss)
      let bestMatch = { title: '', similarity: 0 };
      for (const p of placementTitles) {
        const similarity = stringSimilarity(normalizedItem, p.normalized);
        if (similarity > bestMatch.similarity) {
          bestMatch = { title: p.original, similarity };
        }
      }

      if (bestMatch.similarity > 0.5) {
        unmatchedLines.push({ ...item, nearMatch: bestMatch });
      }
    }
  }

  console.log(`Matched to Samir's placements: ${matchedLines.length} lines`);
  console.log(`Unmatched but similar to Samir's songs: ${unmatchedLines.length} lines`);

  // Group matched by song
  const matchedByTitle = new Map<string, any[]>();
  for (const line of matchedLines) {
    const key = line.matchedTo;
    if (!matchedByTitle.has(key)) matchedByTitle.set(key, []);
    matchedByTitle.get(key)!.push(line);
  }

  console.log('\n--- MATCHED LINES BY SONG ---\n');
  for (const [title, lines] of matchedByTitle.entries()) {
    const totalRevenue = lines.reduce((sum: number, l: any) => sum + (l.revenue || 0), 0);
    console.log(`"${title}": ${lines.length} lines, $${totalRevenue.toFixed(2)}`);
  }

  // Show unmatched lines that are similar
  if (unmatchedLines.length > 0) {
    console.log('\n--- UNMATCHED BUT SIMILAR (POTENTIAL ISSUES) ---\n');

    const byWorkTitle = new Map<string, { lines: any[], nearMatch: any }>();
    for (const line of unmatchedLines) {
      const key = line.workTitle;
      if (!byWorkTitle.has(key)) {
        byWorkTitle.set(key, { lines: [], nearMatch: line.nearMatch });
      }
      byWorkTitle.get(key)!.lines.push(line);
    }

    for (const [workTitle, data] of byWorkTitle.entries()) {
      const totalRevenue = data.lines.reduce((sum: number, l: any) => sum + (l.revenue || 0), 0);
      console.log(`MLC: "${workTitle}" (${data.lines.length} lines, $${totalRevenue.toFixed(2)})`);
      console.log(`  → Best match: "${data.nearMatch.title}" (${Math.round(data.nearMatch.similarity * 100)}% similarity)`);
      console.log(`  → MLC normalized: "${normalizeSongTitle(workTitle)}"`);
      console.log(`  → Placement normalized: "${normalizeSongTitle(data.nearMatch.title)}"`);
      console.log('');
    }
  }

  // Now check actual matcher function for each of Samir's songs
  console.log('\n=== TESTING matchSongToPlacement() FOR SAMIR\'S SONGS ===\n');

  // Get unique MLC titles that should match Samir's songs
  const mlcTitlesForSamir = new Set<string>();
  for (const p of samirPlacements) {
    for (const item of parsedItems) {
      const normalizedItem = normalizeSongTitle(item.workTitle);
      const normalizedPlacement = normalizeSongTitle(p.title);
      if (normalizedItem === normalizedPlacement || stringSimilarity(normalizedItem, normalizedPlacement) >= 0.7) {
        mlcTitlesForSamir.add(item.workTitle);
      }
    }
  }

  console.log('Testing matcher for MLC titles related to Samir:\n');
  for (const mlcTitle of mlcTitlesForSamir) {
    const match = await matchSongToPlacement(mlcTitle);
    if (match) {
      console.log(`✅ "${mlcTitle}" → Placement "${match.title}" (ID: ${match.id})`);
    } else {
      console.log(`❌ "${mlcTitle}" → NO MATCH FOUND`);
    }
  }

  await prisma.$disconnect();
}

findSamirUnfilledLines().catch(console.error);
