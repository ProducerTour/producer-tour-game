/**
 * Debug script to check BIGGIE SMALL line count discrepancy
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkBiggieSmall() {
  // Find the statement
  const stmt = await prisma.statement.findFirst({
    where: { filename: { contains: '92606' } },
    select: {
      id: true,
      filename: true,
      metadata: true
    }
  });

  if (!stmt) {
    console.log('Statement not found');
    return;
  }

  console.log('Statement:', stmt.filename);
  console.log('ID:', stmt.id);

  // Find Nolan's user ID
  const nolan = await prisma.user.findFirst({
    where: { email: { contains: 'nully', mode: 'insensitive' } },
    select: { id: true, firstName: true, lastName: true }
  });

  if (!nolan) {
    console.log('Nolan not found');
    return;
  }

  console.log('\nNolan:', nolan.firstName, nolan.lastName, '(', nolan.id, ')');

  // Get all StatementItems for BIGGIE SMALL + Nolan
  const items = await prisma.statementItem.findMany({
    where: {
      statementId: stmt.id,
      userId: nolan.id,
      workTitle: { contains: 'BIGGIE', mode: 'insensitive' }
    },
    select: {
      id: true,
      workTitle: true,
      revenue: true,
      netRevenue: true,
      splitPercentage: true,
      metadata: true
    },
    orderBy: { revenue: 'desc' }
  });

  console.log('\n=== STATEMENT ITEMS FOR BIGGIE SMALL (Nolan) ===');
  console.log('Total items:', items.length);

  const totalRevenue = items.reduce((sum, i) => sum + Number(i.revenue), 0);
  const totalNet = items.reduce((sum, i) => sum + Number(i.netRevenue), 0);

  console.log('Total revenue:', totalRevenue.toFixed(6));
  console.log('Total net:', totalNet.toFixed(6));

  // Show first 10 items
  console.log('\nFirst 10 items:');
  items.slice(0, 10).forEach((item, i) => {
    const meta = item.metadata as any;
    console.log(`${i+1}. Revenue: $${Number(item.revenue).toFixed(6)}, Net: $${Number(item.netRevenue).toFixed(6)}, Split: ${item.splitPercentage}%, DSP: ${meta?.dspName || 'N/A'}`);
  });

  // Now check the parsedItems in metadata for BIGGIE SMALL
  const metadata = stmt.metadata as any;
  const parsedItems = metadata?.parsedItems || [];
  const biggieItems = parsedItems.filter((p: any) =>
    p.workTitle?.toUpperCase().includes('BIGGIE')
  );

  console.log('\n=== PARSED ITEMS (RAW MLC DATA) FOR BIGGIE SMALL ===');
  console.log('Total BIGGIE SMALL lines in raw data:', biggieItems.length);

  const rawTotal = biggieItems.reduce((sum: number, p: any) => sum + (parseFloat(p.revenue) || 0), 0);
  console.log('Raw MLC total revenue:', rawTotal.toFixed(6));

  // Group raw items by DSP + Publisher IPI to see duplicates
  const rawGroups = new Map<string, any[]>();
  biggieItems.forEach((item: any) => {
    const key = `${item.metadata?.dspName || 'N/A'}|${item.metadata?.originalPublisherIpi || 'none'}`;
    if (!rawGroups.has(key)) rawGroups.set(key, []);
    rawGroups.get(key)!.push(item);
  });

  console.log('\nRaw items grouped by DSP + Publisher IPI:');
  rawGroups.forEach((items, key) => {
    const total = items.reduce((sum: number, i: any) => sum + (parseFloat(i.revenue) || 0), 0);
    console.log(`  ${key}: ${items.length} lines, $${total.toFixed(6)}`);
  });

  // Check for unique assignment keys created during publish
  const assignmentKeySet = new Set<string>();
  items.forEach(item => {
    const meta = item.metadata as any;
    const key = `${item.workTitle}|${meta?.publisherIpiNumber || meta?.originalPublisherIpi || 'none'}|${meta?.dspName || 'none'}`;
    assignmentKeySet.add(key);
  });

  console.log('\nUnique assignment keys in StatementItems:', assignmentKeySet.size);

  await prisma.$disconnect();
}

checkBiggieSmall().catch(console.error);
