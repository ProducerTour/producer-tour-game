/**
 * Recalculate StatementItem Precision
 * 
 * This script recalculates StatementItems for statements published BEFORE
 * the precision migration (Nov 8, 2025 00:08 UTC).
 * 
 * Usage:
 *   npx ts-node src/scripts/recalculate_statement_items.ts
 *   npx ts-node src/scripts/recalculate_statement_items.ts --dry-run
 *   npx ts-node src/scripts/recalculate_statement_items.ts --statement=STATEMENT_ID
 */

import { prisma } from '../lib/prisma';

const MIGRATION_TIMESTAMP = new Date('2025-11-08T00:08:00Z');

interface RecalculationStats {
  statementsProcessed: number;
  itemsUpdated: number;
  totalRevenueDiff: number;
  errors: Array<{ statementId: string; error: string }>;
}

async function recalculateStatementItems(
  statementId?: string,
  dryRun: boolean = false
): Promise<RecalculationStats> {
  const stats: RecalculationStats = {
    statementsProcessed: 0,
    itemsUpdated: 0,
    totalRevenueDiff: 0,
    errors: []
  };

  console.log('Finding statements to recalculate...');
  console.log(`   Migration timestamp: ${MIGRATION_TIMESTAMP.toISOString()}`);
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}\n`);

  const where: any = { status: 'PUBLISHED' };
  if (statementId) {
    where.id = statementId;
  } else {
    where.publishedAt = { lt: MIGRATION_TIMESTAMP };
  }

  const statements = await prisma.statement.findMany({
    where,
    include: { items: true },
    orderBy: { publishedAt: 'asc' }
  });

  if (statements.length === 0) {
    console.log('No statements found to recalculate.');
    return stats;
  }

  console.log(`Found ${statements.length} statement(s) to recalculate:\n`);

  for (const statement of statements) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Statement: ${statement.filename}`);
    console.log(`   ID: ${statement.id}`);
    console.log(`   Published: ${statement.publishedAt?.toISOString()}`);
    console.log(`   Current Total Revenue: $${Number(statement.totalRevenue).toFixed(2)}`);
    console.log(`   Current Total Commission: $${Number(statement.totalCommission).toFixed(2)}`);
    console.log(`   Current Total Net: $${Number(statement.totalNet).toFixed(2)}`);
    console.log(`   Items: ${statement.items.length}`);

    try {
      const metadata = statement.metadata as any;
      const parsedItems = metadata?.parsedItems || [];
      const assignments = metadata?.writerAssignments || {};

      if (parsedItems.length === 0) {
        console.log('   No parsedItems in metadata. Skipping.');
        stats.errors.push({ statementId: statement.id, error: 'No parsedItems in metadata' });
        continue;
      }

      const activeCommission = await prisma.commissionSettings.findFirst({
        where: { isActive: true },
        orderBy: { effectiveDate: 'desc' }
      });
      const globalCommissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;

      const assignedUserIds = new Set<string>();
      parsedItems.forEach((item: any) => {
        let assignmentKey = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }
        const songAssignments = assignments[assignmentKey] || [];
        songAssignments.forEach((assignment: any) => {
          if (assignment.userId) assignedUserIds.add(assignment.userId);
        });
      });

      const overrideUsers = await prisma.user.findMany({
        where: { id: { in: Array.from(assignedUserIds) } }
      });
      const overrideMap = new Map<string, number>();
      overrideUsers.forEach((u: any) => {
        if (u.commissionOverrideRate !== null && u.commissionOverrideRate !== undefined) {
          overrideMap.set(u.id, Number(u.commissionOverrideRate));
        }
      });

      let newTotalCommission = 0;
      let newTotalNet = 0;
      let itemsUpdatedCount = 0;

      const updates: Array<{ id: string; revenue: number; commissionAmount: number; netRevenue: number }> = [];

      for (const item of parsedItems) {
        let assignmentKey = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }
        const songAssignments = assignments[assignmentKey] || [];

        for (const assignment of songAssignments) {
          const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
          const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
          const commissionRateToUse = overrideMap.get(assignment.userId) ?? globalCommissionRate;
          const itemCommissionAmount = (writerRevenue * commissionRateToUse) / 100;
          const itemNetRevenue = writerRevenue - itemCommissionAmount;

          newTotalCommission += itemCommissionAmount;
          newTotalNet += itemNetRevenue;

          const existingItem = statement.items.find(
            si => si.userId === assignment.userId && 
                  si.workTitle === item.workTitle &&
                  Math.abs(parseFloat(assignment.splitPercentage || '100')) === Number(si.splitPercentage)
          );

          if (existingItem) {
            const oldRevenue = Number(existingItem.revenue);
            const revenueDiff = writerRevenue - oldRevenue;
            if (Math.abs(revenueDiff) > 0.001) {
              updates.push({
                id: existingItem.id,
                revenue: writerRevenue,
                commissionAmount: itemCommissionAmount,
                netRevenue: itemNetRevenue
              });
              itemsUpdatedCount++;
            }
          }
        }
      }

      const commissionDiff = newTotalCommission - Number(statement.totalCommission);
      const netDiff = newTotalNet - Number(statement.totalNet);

      console.log(`\n   Recalculation Results:`);
      console.log(`   Items to update: ${itemsUpdatedCount}`);
      console.log(`   New Total Commission: $${newTotalCommission.toFixed(6)} (diff: ${commissionDiff >= 0 ? '+' : ''}${commissionDiff.toFixed(6)})`);
      console.log(`   New Total Net: $${newTotalNet.toFixed(6)} (diff: ${netDiff >= 0 ? '+' : ''}${netDiff.toFixed(6)})`);

      stats.totalRevenueDiff += Math.abs(commissionDiff) + Math.abs(netDiff);

      if (!dryRun) {
        await prisma.$transaction(async (tx) => {
          for (const update of updates) {
            await tx.statementItem.update({
              where: { id: update.id },
              data: {
                revenue: update.revenue,
                commissionAmount: update.commissionAmount,
                netRevenue: update.netRevenue
              }
            });
          }
          await tx.statement.update({
            where: { id: statement.id },
            data: {
              totalCommission: newTotalCommission,
              totalNet: newTotalNet
            }
          });
        });
        console.log(`   Updated ${itemsUpdatedCount} items and statement totals`);
      } else {
        console.log(`   DRY RUN - No changes written to database`);
      }

      stats.statementsProcessed++;
      stats.itemsUpdated += itemsUpdatedCount;

    } catch (error: any) {
      console.log(`   Error: ${error.message}`);
      stats.errors.push({ statementId: statement.id, error: error.message });
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('\nFinal Statistics:');
  console.log(`   Statements Processed: ${stats.statementsProcessed}`);
  console.log(`   Items Updated: ${stats.itemsUpdated}`);
  console.log(`   Total Revenue Diff: $${stats.totalRevenueDiff.toFixed(6)}`);
  console.log(`   Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach(e => console.log(`   ${e.statementId}: ${e.error}`));
  }

  return stats;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const statementIdArg = args.find(arg => arg.startsWith('--statement='));
const statementId = statementIdArg ? statementIdArg.split('=')[1] : undefined;

recalculateStatementItems(statementId, dryRun)
  .then(() => {
    console.log('\nRecalculation complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
