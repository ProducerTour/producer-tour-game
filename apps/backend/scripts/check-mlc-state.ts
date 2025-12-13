/**
 * Check MLC statement state after reprocess
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function check() {
  const stmt = await prisma.statement.findFirst({
    where: { filename: { contains: '92606' } },
    select: {
      id: true,
      filename: true,
      totalNet: true,
      _count: { select: { items: true } },
      metadata: true
    }
  });

  if (!stmt) {
    console.log('Statement not found');
    await prisma.$disconnect();
    return;
  }

  console.log('=== CURRENT STATE AFTER REPROCESS ===');
  console.log('Items count:', stmt._count.items);
  console.log('Total net:', Number(stmt.totalNet).toFixed(2));

  const meta = stmt.metadata as any;
  console.log('\nparsedItems count:', meta?.parsedItems?.length || 0);
  console.log('Reprocessed at:', meta?.reprocessedAt || 'N/A');
  console.log('Assignment count:', meta?.assignmentCount || 0);

  // Check if parsedItems still have data
  const parsedItems = meta?.parsedItems || [];
  if (parsedItems.length > 0) {
    console.log('\n✅ RAW DATA IS INTACT - can re-fix');
    const totalRaw = parsedItems.reduce((sum: number, p: any) => sum + (parseFloat(p.revenue) || 0), 0);
    console.log('Total raw revenue:', totalRaw.toFixed(2));
  } else {
    console.log('\n❌ RAW DATA IS MISSING');
  }

  await prisma.$disconnect();
}

check().catch(console.error);
