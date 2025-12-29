/**
 * Check BIGGIE SMALL StatementItems breakdown
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkBiggieItems() {
  // Find the MLC statement
  const stmt = await prisma.statement.findFirst({
    where: { filename: { contains: '92606' } },
    select: { id: true, filename: true, metadata: true }
  });

  if (!stmt) {
    console.log('Statement not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Statement:', stmt.filename);
  console.log('ID:', stmt.id);

  // Check if statement was reprocessed
  const meta = stmt.metadata as any;
  console.log('\nReprocessed at:', meta?.reprocessedAt || 'NOT REPROCESSED');
  console.log('Reprocess reason:', meta?.reprocessReason || 'N/A');

  // Get BIGGIE SMALL StatementItems
  const items = await prisma.statementItem.findMany({
    where: {
      statementId: stmt.id,
      workTitle: { contains: 'BIGGIE', mode: 'insensitive' }
    },
    include: {
      user: { select: { firstName: true, lastName: true } }
    },
    orderBy: [{ userId: 'asc' }]
  });

  console.log('\n=== BIGGIE SMALL STATEMENT ITEMS ===');
  console.log('Total items:', items.length);

  // Group by user
  const byUser = new Map<string, { count: number; revenue: number; net: number }>();
  for (const item of items) {
    const name = `${item.user?.firstName} ${item.user?.lastName}`;
    const existing = byUser.get(name) || { count: 0, revenue: 0, net: 0 };
    existing.count++;
    existing.revenue += Number(item.revenue);
    existing.net += Number(item.netRevenue);
    byUser.set(name, existing);
  }

  console.log('\nBreakdown by user:');
  byUser.forEach((data, name) => {
    console.log(`  ${name}: ${data.count} items, $${data.revenue.toFixed(6)} revenue, $${data.net.toFixed(6)} net`);
  });

  // Check metadata on items to see split percentage
  console.log('\n=== SAMPLE ITEMS (first 10) ===');
  for (const item of items.slice(0, 10)) {
    const itemMeta = item.metadata as any;
    console.log(`  ${item.user?.firstName}: rev=$${Number(item.revenue).toFixed(6)}, split=${item.splitPercentage}%, pubIPI=${itemMeta?.publisherIpiNumber || itemMeta?.originalPublisherIpi || 'none'}`);
  }

  // Cross-check: what's the total BIGGIE SMALL revenue in raw data?
  const parsedItems = meta?.parsedItems || [];
  const biggieRaw = parsedItems.filter((p: any) =>
    p.workTitle?.toUpperCase().includes('BIGGIE')
  );
  const rawTotal = biggieRaw.reduce((sum: number, p: any) => sum + (parseFloat(p.revenue) || 0), 0);

  console.log('\n=== RAW MLC DATA ===');
  console.log('Total raw BIGGIE SMALL lines:', biggieRaw.length);
  console.log('Total raw revenue: $' + rawTotal.toFixed(6));

  // Sum up the StatementItem totals
  const itemsTotal = items.reduce((sum, i) => sum + Number(i.revenue), 0);
  console.log('\n=== COMPARISON ===');
  console.log('StatementItems total revenue: $' + itemsTotal.toFixed(6));
  console.log('Expected (raw data): $' + rawTotal.toFixed(6));
  console.log('Difference: $' + (itemsTotal - rawTotal).toFixed(6));
  console.log('Ratio (items/raw):', (itemsTotal / rawTotal).toFixed(4));

  await prisma.$disconnect();
}

checkBiggieItems().catch(console.error);
