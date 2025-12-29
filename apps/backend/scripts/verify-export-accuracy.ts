/**
 * Verify bulk export accuracy against StatementItems
 *
 * This script compares:
 * 1. Bulk export calculation (from metadata.parsedItems)
 * 2. StatementItem totals (what dashboard shows)
 * 3. Statement-level totals
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function verifyExportAccuracy() {
  console.log('=== VERIFYING EXPORT ACCURACY ===\n');

  const statements = await prisma.statement.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      filename: true,
      proType: true,
      totalRevenue: true,
      totalNet: true,
      totalCommission: true,
      metadata: true,
      items: {
        select: {
          userId: true,
          workTitle: true,
          revenue: true,
          netRevenue: true,
          commissionAmount: true,
          commissionRate: true
        }
      }
    }
  });

  let totalStatementGross = 0;
  let totalStatementNet = 0;
  let totalMetadataGross = 0;
  let totalItemsGross = 0;
  let totalItemsNet = 0;

  for (const statement of statements) {
    const metadata = statement.metadata as any;
    const parsedItems = metadata?.parsedItems || [];
    const assignments = metadata?.writerAssignments || {};

    // Statement-level total
    const stmtGross = Number(statement.totalRevenue);
    const stmtNet = Number(statement.totalNet);
    totalStatementGross += stmtGross;
    totalStatementNet += stmtNet;

    // Metadata parsedItems total (raw)
    let metaGross = 0;
    for (const item of parsedItems) {
      metaGross += parseFloat(item.revenue) || 0;
    }
    totalMetadataGross += metaGross;

    // StatementItems total
    let itemsGross = 0;
    let itemsNet = 0;
    for (const item of statement.items) {
      itemsGross += Number(item.revenue);
      itemsNet += Number(item.netRevenue);
    }
    totalItemsGross += itemsGross;
    totalItemsNet += itemsNet;

    // Compare
    const grossDiff = metaGross - itemsGross;
    const hasGap = Math.abs(grossDiff) > 0.01;

    console.log(`${statement.proType}: ${statement.filename}`);
    console.log(`  Statement Level:  Gross $${stmtGross.toFixed(2)}, Net $${stmtNet.toFixed(2)}`);
    console.log(`  Metadata (raw):   Gross $${metaGross.toFixed(2)}`);
    console.log(`  StatementItems:   Gross $${itemsGross.toFixed(2)}, Net $${itemsNet.toFixed(2)}`);
    if (hasGap) {
      console.log(`  ⚠️  GAP: $${grossDiff.toFixed(4)} (${parsedItems.length} parsed vs ${statement.items.length} items)`);
    }
    console.log('');
  }

  console.log('=== GRAND TOTALS ===\n');
  console.log(`Statement-Level:  Gross $${totalStatementGross.toFixed(2)}, Net $${totalStatementNet.toFixed(2)}`);
  console.log(`Metadata (raw):   Gross $${totalMetadataGross.toFixed(2)}`);
  console.log(`StatementItems:   Gross $${totalItemsGross.toFixed(2)}, Net $${totalItemsNet.toFixed(2)}`);
  console.log(`\nGap (Metadata - Items): $${(totalMetadataGross - totalItemsGross).toFixed(2)}`);

  // The issue: bulk export uses metadata calculations but dashboard uses StatementItems
  // The bulk export should use the same source as dashboard for consistency
  console.log('\n=== RECOMMENDATION ===');
  console.log('The bulk export calculates from metadata.parsedItems (raw CSV data)');
  console.log('The dashboard uses StatementItem records (aggregated per writer+song)');
  console.log('For consistency, bulk export should use StatementItem totals.');

  await prisma.$disconnect();
}

verifyExportAccuracy().catch(console.error);
