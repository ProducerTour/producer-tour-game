/**
 * Verify MLC Statement - Check accuracy
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function verifyStatement() {
  const searchTerm = process.argv[2] || '192823';

  const stmt = await prisma.statement.findFirst({
    where: { filename: { contains: searchTerm } },
    select: { id: true, filename: true, totalRevenue: true, totalNet: true, metadata: true }
  });

  if (!stmt) {
    console.log('Statement not found for:', searchTerm);
    await prisma.$disconnect();
    return;
  }

  console.log('=== STATEMENT: ' + stmt.filename + ' ===');
  console.log('Total Revenue: $' + Number(stmt.totalRevenue).toFixed(2));
  console.log('Total Net: $' + Number(stmt.totalNet).toFixed(2));

  // Get all items grouped by user
  const items = await prisma.statementItem.findMany({
    where: { statementId: stmt.id },
    include: { user: { select: { firstName: true, lastName: true, email: true } } }
  });

  console.log('\nTotal StatementItems: ' + items.length);

  // Group by user
  const byUser: Record<string, { count: number; revenue: number; net: number }> = {};
  items.forEach(item => {
    const name = (item.user?.firstName || '') + ' ' + (item.user?.lastName || '');
    if (!byUser[name]) byUser[name] = { count: 0, revenue: 0, net: 0 };
    byUser[name].count++;
    byUser[name].revenue += Number(item.revenue);
    byUser[name].net += Number(item.netRevenue);
  });

  console.log('\n=== WRITER BREAKDOWN ===');
  Object.entries(byUser)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .forEach(([name, data]) => {
      console.log(`${name}: ${data.count} items, $${data.revenue.toFixed(2)} rev, $${data.net.toFixed(2)} net`);
    });

  // Check raw data totals
  const meta = stmt.metadata as any;
  const rawItems = meta?.parsedItems || [];
  const rawTotal = rawItems.reduce((sum: number, p: any) => sum + (parseFloat(p.revenue) || 0), 0);

  console.log('\n=== RAW MLC DATA ===');
  console.log('Total raw lines: ' + rawItems.length);
  console.log('Total raw revenue: $' + rawTotal.toFixed(2));

  // Comparison
  const itemsRevenue = Object.values(byUser).reduce((sum, d) => sum + d.revenue, 0);
  console.log('\n=== COMPARISON ===');
  console.log('StatementItems revenue: $' + itemsRevenue.toFixed(2));
  console.log('Raw MLC revenue: $' + rawTotal.toFixed(2));
  console.log('Difference: $' + (itemsRevenue - rawTotal).toFixed(4));

  // Check BIGGIE SMALL specifically
  const biggieItems = items.filter(i => i.workTitle?.toUpperCase().includes('BIGGIE'));
  if (biggieItems.length > 0) {
    console.log('\n=== BIGGIE SMALL CHECK ===');
    const biggieByUser: Record<string, { count: number; revenue: number }> = {};
    biggieItems.forEach(item => {
      const name = (item.user?.firstName || '') + ' ' + (item.user?.lastName || '');
      if (!biggieByUser[name]) biggieByUser[name] = { count: 0, revenue: 0 };
      biggieByUser[name].count++;
      biggieByUser[name].revenue += Number(item.revenue);
    });
    Object.entries(biggieByUser).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.count} items @ $${data.revenue.toFixed(4)}`);
    });

    // Check split percentages
    const sampleBiggie = biggieItems.slice(0, 3);
    console.log('\n  Sample splits:');
    sampleBiggie.forEach(item => {
      console.log(`    ${item.user?.firstName}: ${item.splitPercentage}%`);
    });
  }

  await prisma.$disconnect();
}

verifyStatement().catch(console.error);
