/**
 * Audit Placement Credits
 *
 * This script checks all approved placements and identifies credits
 * that will be filtered out during statement processing.
 *
 * Run with: npx tsx scripts/audit-placement-credits.ts
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function auditPlacementCredits() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         PLACEMENT CREDIT AUDIT FOR STATEMENT MATCHING');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get PT publisher IPIs
  const ptPublishers = await prisma.producerTourPublisher.findMany({
    where: { isActive: true },
    select: { ipiNumber: true, publisherName: true }
  });
  const ptPublisherIpis = ptPublishers.map(p => p.ipiNumber.replace(/[\s\-\.]/g, '').replace(/^0+/, ''));

  console.log(`📋 PT Publisher IPIs configured: ${ptPublishers.length}`);
  ptPublishers.forEach(p => console.log(`   - ${p.publisherName}: ${p.ipiNumber}`));
  console.log('');

  // Get all approved placements with credits
  const placements = await prisma.placement.findMany({
    where: { status: { in: ['APPROVED', 'TRACKING'] } },
    include: {
      credits: {
        include: {
          user: {
            include: {
              producer: true
            }
          }
        }
      }
    }
  });

  console.log(`📁 Total approved/tracking placements: ${placements.length}\n`);

  // Audit statistics
  const stats = {
    totalCredits: 0,
    noUserId: 0,
    noPublisherIpi: 0,
    bmiCredits: 0,
    ascapCredits: 0,
    otherProCredits: 0,
    noProSet: 0,
    fullyConfigured: 0,
  };

  const problemPlacements: any[] = [];

  for (const placement of placements) {
    const creditIssues: string[] = [];

    for (const credit of placement.credits) {
      stats.totalCredits++;

      // Check userId
      if (!credit.userId) {
        stats.noUserId++;
        creditIssues.push(`${credit.firstName} ${credit.lastName}: No linked PT user`);
      }

      // Check publisher IPI
      const publisherIpi = credit.publisherIpiNumber || credit.user?.publisherIpiNumber;
      if (!publisherIpi) {
        stats.noPublisherIpi++;
        creditIssues.push(`${credit.firstName} ${credit.lastName}: No publisher IPI`);
      } else {
        const normalizedIpi = publisherIpi.replace(/[\s\-\.]/g, '').replace(/^0+/, '');
        if (!ptPublisherIpis.includes(normalizedIpi)) {
          creditIssues.push(`${credit.firstName} ${credit.lastName}: Publisher IPI ${publisherIpi} not in PT list`);
        }
      }

      // Check PRO
      const pro = credit.user?.producer?.proAffiliation || credit.pro;
      if (!pro) {
        stats.noProSet++;
        creditIssues.push(`${credit.firstName} ${credit.lastName}: No PRO set`);
      } else if (pro === 'BMI') {
        stats.bmiCredits++;
      } else if (pro === 'ASCAP') {
        stats.ascapCredits++;
      } else {
        stats.otherProCredits++;
      }

      // Check if fully configured
      if (credit.userId && publisherIpi && pro) {
        stats.fullyConfigured++;
      }
    }

    if (creditIssues.length > 0) {
      problemPlacements.push({
        title: placement.title,
        artist: placement.artist,
        creditCount: placement.credits.length,
        issues: creditIssues
      });
    }
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         CREDIT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total credits across all placements: ${stats.totalCredits}`);
  console.log(`\n✅ Fully configured (ready for statements): ${stats.fullyConfigured}`);
  console.log(`\n❌ Issues found:`);
  console.log(`   - Credits without linked PT user: ${stats.noUserId}`);
  console.log(`   - Credits without publisher IPI: ${stats.noPublisherIpi}`);
  console.log(`   - Credits without PRO set: ${stats.noProSet}`);
  console.log(`\n📊 PRO breakdown:`);
  console.log(`   - BMI: ${stats.bmiCredits}`);
  console.log(`   - ASCAP: ${stats.ascapCredits}`);
  console.log(`   - Other: ${stats.otherProCredits}`);
  console.log(`   - Not set: ${stats.noProSet}`);

  // Print problem placements
  if (problemPlacements.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                   PLACEMENTS WITH ISSUES');
    console.log('═══════════════════════════════════════════════════════════════');

    problemPlacements.slice(0, 20).forEach((p, i) => {
      console.log(`\n${i + 1}. "${p.title}" by ${p.artist} (${p.creditCount} credits)`);
      p.issues.forEach((issue: string) => console.log(`   ⚠️  ${issue}`));
    });

    if (problemPlacements.length > 20) {
      console.log(`\n... and ${problemPlacements.length - 20} more placements with issues`);
    }
  }

  // Recommendations
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                      RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════');

  if (stats.noUserId > 0) {
    console.log(`\n🔧 ${stats.noUserId} credits need to be linked to PT users:`);
    console.log('   → Edit placement → Click "Autofill from PT User" for each collaborator');
  }

  if (stats.noPublisherIpi > 0) {
    console.log(`\n🔧 ${stats.noPublisherIpi} credits missing publisher IPI:`);
    console.log('   → This is auto-filled when linking to PT user');
    console.log('   → Or manually add publisherIpiNumber to the credit');
  }

  if (stats.noProSet > 0) {
    console.log(`\n🔧 ${stats.noProSet} credits missing PRO affiliation:`);
    console.log('   → Edit placement → Set PRO dropdown for each collaborator');
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

auditPlacementCredits().catch(console.error);
