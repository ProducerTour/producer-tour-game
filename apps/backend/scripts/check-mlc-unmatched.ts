/**
 * Diagnostic script to check unmatched MLC statement lines
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkUnmatchedMlc() {
  // Get latest MLC statement
  const statement = await prisma.statement.findFirst({
    where: { proType: 'MLC' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      createdAt: true,
      _count: {
        select: { items: true }
      }
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
  console.log('Total items:', statement._count.items);

  // Get all items to analyze
  const allItems = await prisma.statementItem.findMany({
    where: { statementId: statement.id },
    select: {
      workTitle: true,
      userId: true,
      revenue: true,
      metadata: true
    }
  });

  // Group by workTitle to see unique songs
  const songRevenue = new Map<string, { matched: boolean; revenue: number; count: number }>();

  for (const item of allItems) {
    const title = item.workTitle;
    const existing = songRevenue.get(title) || { matched: !!item.userId, revenue: 0, count: 0 };
    existing.revenue += Number(item.revenue);
    existing.count++;
    existing.matched = existing.matched || !!item.userId;
    songRevenue.set(title, existing);
  }

  const matchedSongs = Array.from(songRevenue.entries()).filter(([_, data]) => data.matched);
  const unmatchedSongs = Array.from(songRevenue.entries()).filter(([_, data]) => !data.matched);

  console.log('Unique songs:', songRevenue.size);
  console.log('Matched songs:', matchedSongs.length);
  console.log('Unmatched songs:', unmatchedSongs.length);

  // Sort unmatched by revenue descending
  const sortedUnmatched = unmatchedSongs.sort((a, b) => b[1].revenue - a[1].revenue);

  console.log('\n=== TOP 30 UNMATCHED SONGS (by revenue) ===\n');

  for (const [title, data] of sortedUnmatched.slice(0, 30)) {
    console.log(`  $${data.revenue.toFixed(2)} - "${title}" (${data.count} lines)`);
  }

  // Check placements database
  console.log('\n=== CHECKING PLACEMENTS DATABASE ===\n');

  const placements = await prisma.placement.findMany({
    where: { status: { in: ['APPROVED', 'TRACKING'] } },
    select: { id: true, title: true }
  });

  console.log('Total APPROVED/TRACKING placements:', placements.length);

  // Try to find near-matches
  console.log('\n=== POTENTIAL NEAR-MATCHES (should have matched) ===\n');

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  let potentialMatches = 0;
  for (const [unmatchedTitle, data] of sortedUnmatched.slice(0, 50)) {
    const normalizedUnmatched = normalize(unmatchedTitle);

    for (const placement of placements) {
      const normalizedPlacement = normalize(placement.title);

      // Check for partial match (one contains the other)
      if (normalizedUnmatched.length > 5 && normalizedPlacement.length > 5) {
        if (normalizedUnmatched.includes(normalizedPlacement) ||
            normalizedPlacement.includes(normalizedUnmatched)) {
          console.log(`  MLC:       "${unmatchedTitle}" ($${data.revenue.toFixed(2)})`);
          console.log(`  Placement: "${placement.title}"`);
          console.log('');
          potentialMatches++;
          if (potentialMatches >= 15) break;
        }
      }
    }
    if (potentialMatches >= 15) break;
  }

  if (potentialMatches === 0) {
    console.log('  No obvious near-matches found.');
    console.log('  These songs may not be in Manage Placements at all.');
  }

  await prisma.$disconnect();
}

checkUnmatchedMlc().catch(console.error);
