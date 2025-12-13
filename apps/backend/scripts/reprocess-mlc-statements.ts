/**
 * Reprocess MLC Statements - Fix Publisher IPI Split Logic
 *
 * This script fixes existing PUBLISHED MLC statements by:
 * 1. Re-running smart assignment with the corrected calculateMlcShares logic
 * 2. Deleting existing StatementItems
 * 3. Recreating StatementItems with correct publisher IPI filtering
 * 4. Updating statement totals
 *
 * The fix: Lines with Producer Tour Publisher IPI should ONLY be split among
 * writers who don't have their own original publisher. Writers with their own
 * publishers get their shares through those publishers, not through PT.
 *
 * Example: EUTHANIZED with Jackson (16.67%, no publisher), Jalan (16.67%, no publisher),
 * Nathaniel (16.67%, has publisher)
 * - PT Publisher line: Jackson 50%, Jalan 50% (Nathaniel excluded)
 * - External publisher line: Only that writer gets 100%
 */

import { PrismaClient } from '../src/generated/client';
import { smartMatchStatementWithPlacementTracker } from '../src/utils/writer-matcher';
import { clearPlacementCache, clearPtPublisherIpiCache } from '../src/utils/placement-matcher';

const prisma = new PrismaClient();

interface ParsedItem {
  workTitle: string;
  revenue: string;
  performances?: number;
  metadata?: {
    originalPublisherIpi?: string;
    dspName?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

async function reprocessMlcStatements() {
  console.log('=== REPROCESSING MLC STATEMENTS ===\n');

  // Find all PUBLISHED MLC statements
  const mlcStatements = await prisma.statement.findMany({
    where: {
      proType: 'MLC',
      status: 'PUBLISHED'
    },
    select: {
      id: true,
      filename: true,
      metadata: true,
      totalRevenue: true,
      totalNet: true,
      totalCommission: true,
      paymentStatus: true,
      _count: { select: { items: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${mlcStatements.length} published MLC statements\n`);

  if (mlcStatements.length === 0) {
    console.log('No MLC statements to reprocess.');
    await prisma.$disconnect();
    return;
  }

  // Get global commission settings
  const activeCommission = await prisma.commissionSettings.findFirst({
    where: { isActive: true },
    orderBy: { effectiveDate: 'desc' },
  });

  const globalCommissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;
  const commissionRecipient = activeCommission?.recipientName || 'Producer Tour';

  // Summary tracking
  const results: Array<{
    filename: string;
    oldItemCount: number;
    newItemCount: number;
    oldNet: number;
    newNet: number;
    difference: number;
  }> = [];

  for (const statement of mlcStatements) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${statement.filename}`);
    console.log(`Current items: ${statement._count.items}`);
    console.log(`Current net: $${Number(statement.totalNet).toFixed(2)}`);

    const metadata = statement.metadata as any;
    const parsedItems: ParsedItem[] = metadata?.parsedItems || [];

    if (parsedItems.length === 0) {
      console.log('  ⚠️  No parsedItems in metadata, skipping');
      continue;
    }

    // Clear caches to ensure fresh data
    clearPlacementCache();
    clearPtPublisherIpiCache();

    // Convert parsedItems to the format expected by smartMatchStatementWithPlacementTracker
    const songsForMatching = parsedItems.map(item => ({
      workTitle: item.workTitle,
      revenue: parseFloat(item.revenue) || 0,
      performances: item.performances || 0,
      metadata: item.metadata || {}
    }));

    console.log(`  Re-running smart assignment for ${songsForMatching.length} items...`);

    // Run smart matching with corrected MLC logic
    const matchResult = await smartMatchStatementWithPlacementTracker(songsForMatching, {
      proType: 'MLC'
    });

    console.log(`  Matched: ${matchResult.matched.length}, Untracked: ${matchResult.untracked.length}`);

    // Build new writer assignments (same format as publish endpoint expects)
    const newAssignments: Record<string, Array<{
      userId: string;
      splitPercentage: number;
      writerIpiNumber?: string;
      publisherIpiNumber?: string;
    }>> = {};

    // Process matched songs - FIX: Find ALL parsedItems matching each workTitle
    for (const match of matchResult.matched) {
      // Find ALL items with this workTitle, not just the first one
      const matchingItems = parsedItems.filter(p => p.workTitle === match.workTitle);

      for (const item of matchingItems) {
        // Build assignment key (same as publish endpoint)
        const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
        const dspName = item.metadata?.dspName || 'none';
        const assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;

        // Only set if not already set (each unique key gets the shares once)
        if (!newAssignments[assignmentKey] && match.shares && match.shares.shares.length > 0) {
          newAssignments[assignmentKey] = match.shares.shares.map(share => ({
            userId: share.userId,
            splitPercentage: share.relativeSplitPercent,
            writerIpiNumber: share.writerIpiNumber || undefined,
            publisherIpiNumber: share.publisherIpiNumber || undefined
          }));
        }
      }
    }

    // Process untracked songs (keep existing assignments if any) - FIX: Process ALL items
    const oldAssignments = metadata?.writerAssignments || {};
    for (const untracked of matchResult.untracked) {
      const matchingItems = parsedItems.filter(p => p.workTitle === untracked.workTitle);

      for (const item of matchingItems) {
        const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
        const dspName = item.metadata?.dspName || 'none';
        const assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;

        // Keep existing assignment if it exists and not already set
        if (!newAssignments[assignmentKey] && oldAssignments[assignmentKey]) {
          newAssignments[assignmentKey] = oldAssignments[assignmentKey];
        }
      }
    }

    // Get user override rates
    const assignedUserIds = new Set<string>();
    Object.values(newAssignments).forEach(assignments => {
      assignments.forEach(a => {
        if (a.userId) assignedUserIds.add(a.userId);
      });
    });

    const overrideUsers = await prisma.user.findMany({
      where: { id: { in: Array.from(assignedUserIds) } },
      select: { id: true, commissionOverrideRate: true }
    });
    const overrideMap = new Map<string, number>();
    overrideUsers.forEach(u => {
      if (u.commissionOverrideRate !== null) {
        overrideMap.set(u.id, Number(u.commissionOverrideRate));
      }
    });

    // Build new StatementItems
    const itemsToCreate: any[] = [];
    let totalCommission = 0;
    let totalNet = 0;

    parsedItems.forEach(item => {
      const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
      const dspName = item.metadata?.dspName || 'none';
      const assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;

      const songAssignments = newAssignments[assignmentKey] || [];

      songAssignments.forEach(assignment => {
        const splitPercentage = assignment.splitPercentage || 100;
        const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
        const commissionRateToUse = overrideMap.get(assignment.userId) ?? globalCommissionRate;
        const itemCommissionAmount = (writerRevenue * commissionRateToUse) / 100;
        const itemNetRevenue = writerRevenue - itemCommissionAmount;

        totalCommission += itemCommissionAmount;
        totalNet += itemNetRevenue;

        itemsToCreate.push({
          statementId: statement.id,
          userId: assignment.userId,
          workTitle: item.workTitle,
          revenue: writerRevenue,
          performances: item.performances || 0,
          splitPercentage: splitPercentage,
          writerIpiNumber: assignment.writerIpiNumber || null,
          commissionRate: commissionRateToUse,
          commissionAmount: itemCommissionAmount,
          commissionRecipient: commissionRecipient,
          netRevenue: itemNetRevenue,
          isVisibleToWriter: statement.paymentStatus === 'PAID', // Keep visibility based on payment status
          metadata: {
            ...item.metadata,
            originalTotalRevenue: parseFloat(item.revenue),
            publisherIpiNumber: assignment.publisherIpiNumber || null,
          },
        });
      });
    });

    console.log(`  New items to create: ${itemsToCreate.length}`);
    console.log(`  New net total: $${totalNet.toFixed(2)}`);

    const oldNet = Number(statement.totalNet);
    const difference = totalNet - oldNet;

    results.push({
      filename: statement.filename,
      oldItemCount: statement._count.items,
      newItemCount: itemsToCreate.length,
      oldNet,
      newNet: totalNet,
      difference
    });

    // Actually apply the changes
    console.log(`  Deleting ${statement._count.items} old items...`);
    await prisma.statementItem.deleteMany({
      where: { statementId: statement.id }
    });

    console.log(`  Creating ${itemsToCreate.length} new items...`);
    const BATCH_SIZE = 200;
    for (let i = 0; i < itemsToCreate.length; i += BATCH_SIZE) {
      const batch = itemsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.statementItem.createMany({ data: batch });
    }

    // Update statement totals (skip metadata for large assignments to avoid Postgres JSON size limits)
    // The writerAssignments aren't strictly needed since items are already created
    const assignmentCount = Object.keys(newAssignments).length;
    const shouldStoreAssignments = assignmentCount < 5000; // Only store if reasonable size

    await prisma.statement.update({
      where: { id: statement.id },
      data: {
        totalCommission,
        totalNet,
        metadata: {
          ...metadata,
          ...(shouldStoreAssignments ? { writerAssignments: newAssignments } : {}),
          reprocessedAt: new Date().toISOString(),
          reprocessReason: 'MLC publisher IPI split logic fix',
          assignmentCount: assignmentCount
        }
      }
    });

    console.log(`  ✅ Statement reprocessed`);
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('=== REPROCESSING SUMMARY ===\n');

  let totalDifference = 0;
  for (const r of results) {
    const diffStr = r.difference >= 0 ? `+$${r.difference.toFixed(2)}` : `-$${Math.abs(r.difference).toFixed(2)}`;
    console.log(`${r.filename}:`);
    console.log(`  Items: ${r.oldItemCount} → ${r.newItemCount}`);
    console.log(`  Net: $${r.oldNet.toFixed(2)} → $${r.newNet.toFixed(2)} (${diffStr})`);
    totalDifference += r.difference;
  }

  console.log(`\n=== TOTAL IMPACT ===`);
  const totalDiffStr = totalDifference >= 0 ? `+$${totalDifference.toFixed(2)}` : `-$${Math.abs(totalDifference).toFixed(2)}`;
  console.log(`Net revenue change: ${totalDiffStr}`);

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Run recalculate-writer-balances.ts to update writer balance fields');
  console.log('2. Verify dashboard totals match expected values');

  await prisma.$disconnect();
}

reprocessMlcStatements().catch(console.error);
