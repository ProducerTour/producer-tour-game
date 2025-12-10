/**
 * Check why Samir Knox's MLC shares aren't being calculated
 */
import { PrismaClient } from '../src/generated/client';
import { calculateMlcShares } from '../src/utils/split-calculator';
import { getPtPublisherIpis } from '../src/utils/placement-matcher';

const prisma = new PrismaClient();

async function checkSamirMlcShares() {
  console.log('=== CHECKING SAMIR MLC SHARE CALCULATION ===\n');

  // Get PT publisher IPIs
  const ptPublisherIpis = await getPtPublisherIpis();
  console.log('PT Publisher IPIs:', ptPublisherIpis);

  // Get Samir's placements with credits
  const samirPlacements = ['Poppin', 'My Bitch', 'Bag Talk'];

  for (const title of samirPlacements) {
    const placement = await prisma.placement.findFirst({
      where: { title: { equals: title, mode: 'insensitive' }, status: 'APPROVED' },
      include: {
        credits: {
          include: {
            user: {
              include: { producer: true }
            }
          }
        }
      }
    });

    if (!placement) {
      console.log(`\n❌ ${title} placement not found`);
      continue;
    }

    console.log(`\n========== ${placement.title} ==========`);
    console.log('Credits:', placement.credits.length);

    // Show all credits
    console.log('\n--- ALL CREDITS ---');
    for (const credit of placement.credits) {
      console.log(`  ${credit.firstName} ${credit.lastName}:`);
      console.log(`    userId: ${credit.userId || 'NULL ❌'}`);
      console.log(`    isExternalWriter: ${credit.isExternalWriter}`);
      console.log(`    splitPercentage: ${credit.splitPercentage}%`);
      console.log(`    credit.pro: ${credit.pro || 'NOT SET'}`);
      if (credit.user) {
        console.log(`    user.writerProAffiliation: ${credit.user.writerProAffiliation || 'NOT SET'}`);
        console.log(`    user.publisherIpiNumber: ${credit.user.publisherIpiNumber || 'NOT SET'}`);
      }

      // Check if passes MLC filter
      const hasUserId = !!credit.userId;
      const notExternal = !credit.isExternalWriter;
      const hasSplit = Number(credit.splitPercentage) > 0;
      const passes = hasUserId && notExternal && hasSplit;
      console.log(`    → Would pass MLC filter: ${passes ? '✅ YES' : '❌ NO'}`);
      if (!passes) {
        const reasons = [];
        if (!hasUserId) reasons.push('no userId');
        if (!notExternal) reasons.push('isExternalWriter=true');
        if (!hasSplit) reasons.push('no split');
        console.log(`       Reasons: ${reasons.join(', ')}`);
      }
    }

    // Calculate MLC shares
    console.log('\n--- MLC SHARE CALCULATION ---');
    const shares = calculateMlcShares(100, placement.credits, ptPublisherIpis);

    console.log(`Eligible writers: ${shares.shares.length}`);
    console.log(`Total eligible split %: ${shares.totalEligibleSplitPercent}`);

    if (shares.shares.length > 0) {
      console.log('\nShares:');
      shares.shares.forEach(s => {
        console.log(`  ✅ ${s.firstName} ${s.lastName}: ${s.relativeSplitPercent.toFixed(2)}% ($${s.revenueAmount.toFixed(2)})`);
      });
    }

    if (shares.excludedCredits.length > 0) {
      console.log('\nExcluded:');
      shares.excludedCredits.forEach(ec => {
        console.log(`  ❌ ${ec.firstName} ${ec.lastName}: ${ec.reason}`);
      });
    }
  }

  await prisma.$disconnect();
}

checkSamirMlcShares().catch(console.error);
