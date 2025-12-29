/**
 * Debug MLC Split Logic for BIGGIE SMALL
 *
 * Tests the calculateMlcShares function with actual BIGGIE SMALL placement data
 * to see why all 3 writers are being assigned instead of just the matching one.
 */
import { PrismaClient } from '../src/generated/client';
import { calculateMlcShares } from '../src/utils/split-calculator';
import { PlacementCreditWithUser, getPtPublisherIpis } from '../src/utils/placement-matcher';

const prisma = new PrismaClient();

async function debugMlcSplitLogic() {
  console.log('=== DEBUG MLC SPLIT LOGIC FOR BIGGIE SMALL ===\n');

  // 1. Get PT Publisher IPIs
  const ptPublisherIpis = await getPtPublisherIpis();
  console.log('PT Publisher IPIs:', ptPublisherIpis);

  // 2. Get BIGGIE SMALL placement with credits
  const placement = await prisma.placement.findFirst({
    where: { title: { contains: 'BIGGIE', mode: 'insensitive' } },
    include: {
      credits: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              writerIpiNumber: true,
              publisherIpiNumber: true,
              writerProAffiliation: true,
              producer: { select: { proAffiliation: true } }
            }
          }
        }
      }
    }
  });

  if (!placement) {
    console.log('BIGGIE SMALL placement not found!');
    await prisma.$disconnect();
    return;
  }

  console.log('\n=== PLACEMENT CREDITS ===');
  console.log('Placement:', placement.title);
  console.log('Status:', placement.status);
  console.log('Total credits:', placement.credits.length);

  // Cast to the expected type
  const credits = placement.credits as unknown as PlacementCreditWithUser[];

  for (const credit of credits) {
    console.log(`\n  Credit: ${credit.firstName} ${credit.lastName}`);
    console.log(`    userId: ${credit.userId}`);
    console.log(`    splitPercentage: ${credit.splitPercentage}%`);
    console.log(`    isExternalWriter: ${credit.isExternalWriter}`);
    console.log(`    credit.publisherIpiNumber: ${credit.publisherIpiNumber || 'null/undefined'}`);
    console.log(`    user.publisherIpiNumber: ${credit.user?.publisherIpiNumber || 'null/undefined'}`);
    console.log(`    credit.ipiNumber (writer): ${credit.ipiNumber || 'null/undefined'}`);
    console.log(`    user.writerIpiNumber: ${credit.user?.writerIpiNumber || 'null/undefined'}`);
  }

  // 3. Get MLC line publisher IPIs from the statement
  const stmt = await prisma.statement.findFirst({
    where: { filename: { contains: '92606' } },
    select: { metadata: true }
  });

  const metadata = stmt?.metadata as any;
  const parsedItems = metadata?.parsedItems || [];
  const biggieItems = parsedItems.filter((p: any) =>
    p.workTitle?.toUpperCase().includes('BIGGIE')
  );

  // Get unique publisher IPIs from BIGGIE SMALL MLC lines
  const uniqueIPIs = new Set<string>();
  for (const item of biggieItems) {
    if (item.metadata?.originalPublisherIpi) {
      uniqueIPIs.add(item.metadata.originalPublisherIpi);
    }
  }
  console.log('\n=== MLC LINE PUBLISHER IPIs ===');
  console.log('Unique IPIs found in BIGGIE SMALL MLC lines:', Array.from(uniqueIPIs));

  // 4. Test calculateMlcShares with each IPI
  console.log('\n=== TESTING calculateMlcShares ===');

  for (const lineIpi of Array.from(uniqueIPIs)) {
    console.log(`\n--- Testing IPI: ${lineIpi} ---`);

    // Check if it's a PT IPI
    const isPT = ptPublisherIpis.some(pt =>
      pt.replace(/[\s\-\.]/g, '').replace(/^0+/, '') ===
      lineIpi.replace(/[\s\-\.]/g, '').replace(/^0+/, '')
    );
    console.log(`Is PT Publisher IPI: ${isPT}`);

    // Find which credit should match this IPI
    const matchingCredit = credits.find(c => {
      const creditPubIpi = c.publisherIpiNumber || c.user?.publisherIpiNumber;
      if (!creditPubIpi) return false;
      return creditPubIpi.replace(/[\s\-\.]/g, '').replace(/^0+/, '') ===
             lineIpi.replace(/[\s\-\.]/g, '').replace(/^0+/, '');
    });

    if (matchingCredit) {
      console.log(`Expected matching writer: ${matchingCredit.firstName} ${matchingCredit.lastName}`);
    } else {
      console.log('Expected matching writer: NONE (no credit has this publisher IPI)');
    }

    // Run calculateMlcShares
    const result = calculateMlcShares(1.00, credits, ptPublisherIpis, lineIpi);

    console.log(`Result shares: ${result.shares.length} writers`);
    for (const share of result.shares) {
      console.log(`  - ${share.firstName} ${share.lastName}: ${share.relativeSplitPercent.toFixed(2)}% → $${share.revenueAmount.toFixed(4)}`);
    }

    if (result.excludedCredits.length > 0) {
      console.log(`Excluded credits: ${result.excludedCredits.length}`);
      for (const exc of result.excludedCredits) {
        console.log(`  - ${exc.firstName} ${exc.lastName}: ${exc.reason}`);
      }
    }
  }

  await prisma.$disconnect();
}

debugMlcSplitLogic().catch(console.error);
