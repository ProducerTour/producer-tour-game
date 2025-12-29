/**
 * Debug why Samir's 45 MLC lines aren't being filled
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function debugSamirLines() {
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

  console.log('=== MLC STATEMENT ===');
  console.log('ID:', statement.id);
  console.log('File:', statement.filename);

  // Get Samir's song titles
  const samirSongs = ['Poppin', 'My Bitch', 'Bag Talk', 'Beat da road', 'Cut off Boston Richey',
                      'Loose Screw', 'Sunday Service', 'Kill Zone'];

  // Get parsed items from metadata
  const metadata = statement.metadata as any;
  const parsedItems = metadata?.parsedItems || [];

  console.log('\nTotal parsed items:', parsedItems.length);

  // Find Samir's songs in parsed items
  console.log('\n=== SAMIR SONGS IN PARSED ITEMS ===\n');

  let samirItemCount = 0;
  const samirItems: any[] = [];

  for (const item of parsedItems) {
    const normalizedTitle = item.workTitle?.toLowerCase().trim();
    const matchesSamir = samirSongs.some(s =>
      normalizedTitle === s.toLowerCase() ||
      normalizedTitle?.includes(s.toLowerCase()) ||
      s.toLowerCase().includes(normalizedTitle || '')
    );

    if (matchesSamir) {
      samirItemCount++;
      samirItems.push(item);
    }
  }

  console.log('Lines matching Samir songs:', samirItemCount);

  // Group by song title
  const byTitle = new Map<string, any[]>();
  for (const item of samirItems) {
    const title = item.workTitle;
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title)!.push(item);
  }

  console.log('\nBreakdown by song:');
  for (const [title, items] of byTitle.entries()) {
    const totalRevenue = items.reduce((sum: number, i: any) => sum + (i.revenue || 0), 0);
    console.log(`  ${title}: ${items.length} lines, $${totalRevenue.toFixed(2)}`);
  }

  // Check statement items (what was actually saved)
  console.log('\n=== STATEMENT ITEMS FOR SAMIR ===\n');

  const samirUser = await prisma.user.findFirst({
    where: { firstName: 'Samir', lastName: 'Knox' }
  });

  if (!samirUser) {
    console.log('Samir user not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Samir User ID:', samirUser.id);

  const samirStatementItems = await prisma.statementItem.findMany({
    where: {
      statementId: statement.id,
      userId: samirUser.id
    }
  });

  console.log('Statement items assigned to Samir:', samirStatementItems.length);

  if (samirStatementItems.length > 0) {
    const totalRevenue = samirStatementItems.reduce((sum, i) => sum + Number(i.revenue), 0);
    console.log('Total revenue assigned:', '$' + totalRevenue.toFixed(2));
  }

  // Check ALL statement items for this statement
  const allStatementItems = await prisma.statementItem.findMany({
    where: { statementId: statement.id }
  });

  console.log('\nTotal statement items saved:', allStatementItems.length);

  // Group by userId
  const byUser = new Map<string, number>();
  for (const item of allStatementItems) {
    const key = item.userId || 'UNASSIGNED';
    byUser.set(key, (byUser.get(key) || 0) + 1);
  }

  console.log('Items by user:');
  for (const [userId, count] of byUser.entries()) {
    if (userId === samirUser.id) {
      console.log(`  SAMIR (${userId}): ${count} items`);
    } else if (userId === 'UNASSIGNED') {
      console.log(`  UNASSIGNED: ${count} items`);
    } else {
      console.log(`  ${userId}: ${count} items`);
    }
  }

  await prisma.$disconnect();
}

debugSamirLines().catch(console.error);
