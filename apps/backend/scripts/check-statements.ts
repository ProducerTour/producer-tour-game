import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkStatements() {
  console.log('\n=== Statement Database Check ===\n');

  // Get total count
  const total = await prisma.statement.count();
  console.log('Total statements:', total);

  if (total === 0) {
    console.log('\n⚠️  No statements found in database.');
    console.log('Upload PRO statements via the Statements tab to see data here.');
    await prisma.$disconnect();
    return;
  }

  // Count by status
  const unpaid = await prisma.statement.count({ where: { paymentStatus: 'UNPAID' } });
  const pending = await prisma.statement.count({ where: { paymentStatus: 'PENDING' } });
  const paid = await prisma.statement.count({ where: { paymentStatus: 'PAID' } });

  console.log('\nBy Payment Status:');
  console.log(`  UNPAID:  ${unpaid}`);
  console.log(`  PENDING: ${pending}`);
  console.log(`  PAID:    ${paid}`);

  // Sum totals
  const unpaidSum = await prisma.statement.aggregate({
    where: { paymentStatus: 'UNPAID' },
    _sum: { totalNet: true }
  });
  const paidSum = await prisma.statement.aggregate({
    where: { paymentStatus: 'PAID' },
    _sum: { totalNet: true }
  });

  console.log('\nTotals:');
  console.log(`  Unpaid Queue: $${Number(unpaidSum._sum.totalNet || 0).toFixed(2)}`);
  console.log(`  Paid All Time: $${Number(paidSum._sum.totalNet || 0).toFixed(2)}`);

  // Sample recent statements
  const recent = await prisma.statement.findMany({
    take: 10,
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      filename: true,
      proType: true,
      paymentStatus: true,
      totalNet: true,
      totalRevenue: true,
      itemCount: true,
      uploadedAt: true
    }
  });

  console.log('\n=== Recent Statements ===');
  recent.forEach(s => {
    console.log(`  ${s.filename}`);
    console.log(`    Type: ${s.proType} | Status: ${s.paymentStatus}`);
    console.log(`    Revenue: $${Number(s.totalRevenue).toFixed(2)} | Net: $${Number(s.totalNet).toFixed(2)} | Items: ${s.itemCount}`);
    console.log(`    Uploaded: ${s.uploadedAt}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkStatements().catch(console.error);
