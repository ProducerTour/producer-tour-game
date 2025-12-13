/**
 * Debug script to check BIGGIE SMALL data and PT Publisher IPIs
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkData() {
  // 1. Get PT Publisher IPIs
  console.log('=== PT PUBLISHER IPIs ===');
  const ptPublishers = await prisma.producerTourPublisher.findMany({
    where: { isActive: true },
    select: { publisherName: true, ipiNumber: true }
  });
  console.log(ptPublishers);

  // 2. Check statement status
  console.log('\n=== STATEMENT STATUS ===');
  const stmt = await prisma.statement.findFirst({
    where: { filename: { contains: '92606' } },
    select: {
      id: true,
      filename: true,
      status: true,
      totalRevenue: true,
      totalNet: true,
      _count: { select: { items: true } }
    }
  });
  console.log(stmt);

  if (!stmt) {
    console.log('Statement not found!');
    await prisma.$disconnect();
    return;
  }

  // 3. Check ALL StatementItems for this statement
  console.log('\n=== ALL STATEMENT ITEMS ===');
  const itemCount = await prisma.statementItem.count({
    where: { statementId: stmt.id }
  });
  console.log('Total items in statement:', itemCount);

  // 4. Get unique users assigned to this statement
  const userItems = await prisma.statementItem.groupBy({
    by: ['userId'],
    where: { statementId: stmt.id },
    _count: { id: true },
    _sum: { netRevenue: true }
  });
  console.log('\nUsers with items:');
  for (const u of userItems) {
    const user = await prisma.user.findUnique({
      where: { id: u.userId },
      select: { firstName: true, lastName: true }
    });
    console.log(`  - ${user?.firstName} ${user?.lastName}: ${u._count.id} items, $${Number(u._sum.netRevenue).toFixed(4)} net`);
  }

  // 5. Check BIGGIE SMALL placement
  console.log('\n=== BIGGIE SMALL PLACEMENT ===');
  const placement = await prisma.placement.findFirst({
    where: { title: { contains: 'BIGGIE', mode: 'insensitive' } },
    include: {
      credits: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true, publisherIpiNumber: true } }
        }
      }
    }
  });
  if (placement) {
    console.log('Title:', placement.title);
    console.log('Status:', placement.status);
    console.log('Credits:');
    placement.credits.forEach(c => {
      const userLinked = c.userId ? 'Yes' : 'No';
      console.log(`  - ${c.firstName} ${c.lastName} | Split: ${c.splitPercentage}% | Credit Publisher IPI: ${c.publisherIpiNumber || 'null'} | User linked: ${userLinked}`);
      if (c.user) {
        console.log(`    → User Publisher IPI: ${c.user.publisherIpiNumber || 'null'}`);
      }
    });
  } else {
    console.log('Not found');
  }

  // 6. Check which of the 3 IPIs from BIGGIE SMALL match PT Publisher
  console.log('\n=== CHECKING MLC LINE IPIs AGAINST PT ===');
  const mlcIpis = ['1162064683', '1177165344', '1256477233'];
  const ptIpis = ptPublishers.map(p => p.ipiNumber);

  for (const ipi of mlcIpis) {
    const isPt = ptIpis.some(pt => pt.replace(/[\s\-\.]/g, '').replace(/^0+/, '') === ipi.replace(/[\s\-\.]/g, '').replace(/^0+/, ''));
    console.log(`  IPI ${ipi}: ${isPt ? '✅ PT PUBLISHER' : '❌ External'}`);
  }

  // 7. Check Nolan's data
  console.log('\n=== NOLAN USER CHECK ===');
  const nolan = await prisma.user.findFirst({
    where: { email: { contains: 'nully', mode: 'insensitive' } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      writerIpiNumber: true,
      publisherIpiNumber: true
    }
  });
  console.log(nolan);

  // 8. Check BIGGIE SMALL items specifically for each user
  console.log('\n=== BIGGIE SMALL ITEMS BY USER ===');
  const biggieItems = await prisma.statementItem.findMany({
    where: {
      statementId: stmt.id,
      workTitle: { contains: 'BIGGIE', mode: 'insensitive' }
    },
    include: {
      user: { select: { firstName: true, lastName: true } }
    }
  });

  const byUser = new Map<string, { count: number; revenue: number; net: number }>();
  for (const item of biggieItems) {
    const name = `${item.user?.firstName} ${item.user?.lastName}`;
    const existing = byUser.get(name) || { count: 0, revenue: 0, net: 0 };
    existing.count++;
    existing.revenue += Number(item.revenue);
    existing.net += Number(item.netRevenue);
    byUser.set(name, existing);
  }

  console.log('Total BIGGIE SMALL items:', biggieItems.length);
  byUser.forEach((data, name) => {
    console.log(`  ${name}: ${data.count} items, $${data.revenue.toFixed(6)} revenue, $${data.net.toFixed(6)} net`);
  });

  await prisma.$disconnect();
}

checkData().catch(console.error);
