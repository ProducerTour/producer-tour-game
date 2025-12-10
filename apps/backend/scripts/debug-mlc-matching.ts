/**
 * Debug MLC statement matching - test the actual matching logic
 */
import { PrismaClient } from '../src/generated/client';
import { matchSongToPlacement, normalizeSongTitle, stringSimilarity } from '../src/utils/placement-matcher';

const prisma = new PrismaClient();

async function debugMlcMatching() {
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

  console.log('\n=== LATEST MLC STATEMENT ===\n');
  console.log('ID:', statement.id);
  console.log('File:', statement.filename);

  // Get parsed items from metadata
  const metadata = statement.metadata as any;
  const parsedItems = metadata?.parsedItems || [];

  console.log('Parsed items:', parsedItems.length);

  if (parsedItems.length === 0) {
    console.log('No parsed items in metadata');
    await prisma.$disconnect();
    return;
  }

  // Get unique song titles
  const uniqueTitles = new Map<string, number>();
  for (const item of parsedItems) {
    const title = item.workTitle;
    uniqueTitles.set(title, (uniqueTitles.get(title) || 0) + 1);
  }

  console.log('Unique song titles:', uniqueTitles.size);

  // Get all placements for matching
  const placements = await prisma.placement.findMany({
    where: { status: { in: ['APPROVED', 'TRACKING'] } },
    select: { id: true, title: true }
  });

  console.log('Approved/Tracking placements:', placements.length);

  // Test matching for sample titles
  console.log('\n=== TESTING MATCHING FOR UNMATCHED TITLES ===\n');

  let matchedCount = 0;
  let unmatchedCount = 0;
  const unmatchedTitles: Array<{ title: string; count: number; bestMatch?: { title: string; score: number } }> = [];

  for (const [title, count] of uniqueTitles.entries()) {
    const match = await matchSongToPlacement(title);

    if (match) {
      matchedCount++;
    } else {
      unmatchedCount++;

      // Find best near-match
      const normalizedTitle = normalizeSongTitle(title);
      let bestMatch: { title: string; score: number } | undefined;

      for (const p of placements) {
        const normalizedPlacement = normalizeSongTitle(p.title);
        const score = stringSimilarity(normalizedTitle, normalizedPlacement);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { title: p.title, score };
        }
      }

      if (bestMatch && bestMatch.score > 0.5) {
        unmatchedTitles.push({ title, count, bestMatch });
      } else {
        unmatchedTitles.push({ title, count });
      }
    }
  }

  console.log('Matched unique titles:', matchedCount);
  console.log('Unmatched unique titles:', unmatchedCount);

  // Sort unmatched by near-match score
  const withNearMatch = unmatchedTitles
    .filter(u => u.bestMatch && u.bestMatch.score >= 0.6)
    .sort((a, b) => (b.bestMatch?.score || 0) - (a.bestMatch?.score || 0));

  const noNearMatch = unmatchedTitles
    .filter(u => !u.bestMatch || u.bestMatch.score < 0.6);

  console.log('\n=== NEAR MATCHES (60-80% similarity) - Should have matched? ===\n');

  for (const item of withNearMatch.slice(0, 20)) {
    console.log(`  MLC: "${item.title}" (${item.count} lines)`);
    console.log(`  Placement: "${item.bestMatch?.title}" (${Math.round((item.bestMatch?.score || 0) * 100)}% similarity)`);
    console.log('');
  }

  console.log('\n=== NO NEAR MATCHES (< 60% similarity) - Not in Manage Placements ===\n');

  for (const item of noNearMatch.slice(0, 20)) {
    console.log(`  "${item.title}" (${item.count} lines)`);
  }

  await prisma.$disconnect();
}

debugMlcMatching().catch(console.error);
