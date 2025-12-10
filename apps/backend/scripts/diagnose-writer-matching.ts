/**
 * Diagnostic Script: Why are writers not matching in statements?
 *
 * Run with: npx tsx scripts/diagnose-writer-matching.ts
 *
 * This script checks:
 * 1. All writers and their required fields (PRO, IPI, publisher IPI)
 * 2. PT Publisher IPIs configured
 * 3. PlacementCredits and their linked user data
 * 4. Which credits would pass BMI statement filters
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function diagnoseWriterMatching() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('              WRITER MATCHING DIAGNOSTIC REPORT                              ');
  console.log('═══════════════════════════════════════════════════════════════════════════');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PT PUBLISHER IPIs
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 1. PT PUBLISHER IPIs (Required for PT representation check)            │');
  console.log('└─────────────────────────────────────────────────────────────────────────┘');

  const ptPublishers = await prisma.producerTourPublisher.findMany({
    where: { isActive: true }
  });

  if (ptPublishers.length === 0) {
    console.log('⚠️  NO PT PUBLISHER IPIs CONFIGURED! This will cause all writers to fail.');
  } else {
    console.log(`\n✅ ${ptPublishers.length} PT Publisher IPI(s) configured:`);
    ptPublishers.forEach(p => {
      console.log(`   • ${p.publisherName}: ${p.ipiNumber}`);
    });
  }

  const ptIpis = ptPublishers.map(p => p.ipiNumber.replace(/[\s\-\.]/g, '').replace(/^0+/, ''));

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ALL WRITERS AND THEIR DATA
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 2. ALL WRITERS IN DATABASE                                              │');
  console.log('└─────────────────────────────────────────────────────────────────────────┘');

  const writers = await prisma.user.findMany({
    where: { role: 'writer' as any },  // Cast to handle Prisma enum
    include: {
      producer: {
        select: {
          proAffiliation: true,
          writerIpiNumber: true,
          publisherIpiNumber: true
        }
      }
    },
    orderBy: { lastName: 'asc' }
  });

  console.log(`\nFound ${writers.length} writers:\n`);

  const writerStats = {
    total: writers.length,
    hasProducer: 0,
    hasBmiPro: 0,
    hasWriterIpi: 0,
    hasPublisherIpi: 0,
    hasMatchingPtIpi: 0,
    wouldPassBmiFilters: 0
  };

  console.log('┌────────────────────────────────┬──────────┬─────────────────┬─────────────────┬───────────┐');
  console.log('│ Writer Name                    │ PRO      │ Writer IPI      │ Publisher IPI   │ PT Match? │');
  console.log('├────────────────────────────────┼──────────┼─────────────────┼─────────────────┼───────────┤');

  for (const writer of writers) {
    const name = `${writer.firstName} ${writer.lastName}`.padEnd(30).slice(0, 30);
    // Check PRO from User.writerProAffiliation first, then Producer
    const writerPro = writer.writerProAffiliation || writer.producer?.proAffiliation;
    const pro = (writerPro || 'NONE').padEnd(8);
    const writerIpi = (writer.writerIpiNumber || writer.producer?.writerIpiNumber || '—').slice(0, 15).padEnd(15);
    const publisherIpi = (writer.publisherIpiNumber || writer.producer?.publisherIpiNumber || '—').slice(0, 15).padEnd(15);

    // Check if publisher IPI matches PT
    const normalizedPubIpi = (writer.publisherIpiNumber || writer.producer?.publisherIpiNumber || '')
      .replace(/[\s\-\.]/g, '').replace(/^0+/, '');
    const matchesPt = ptIpis.includes(normalizedPubIpi) ? '✅' : '❌';

    // Stats - check both User.writerProAffiliation and Producer.proAffiliation
    if (writer.producer || writer.writerProAffiliation) writerStats.hasProducer++;
    if (writerPro === 'BMI') writerStats.hasBmiPro++;
    if (writer.writerIpiNumber || writer.producer?.writerIpiNumber) writerStats.hasWriterIpi++;
    if (writer.publisherIpiNumber || writer.producer?.publisherIpiNumber) writerStats.hasPublisherIpi++;
    if (ptIpis.includes(normalizedPubIpi)) writerStats.hasMatchingPtIpi++;

    // Would pass BMI filters? (simplified - just needs PRO match now)
    const hasPro = writerPro === 'BMI';
    if (hasPro) writerStats.wouldPassBmiFilters++;

    console.log(`│ ${name} │ ${pro} │ ${writerIpi} │ ${publisherIpi} │ ${matchesPt.padEnd(9)} │`);
  }

  console.log('└────────────────────────────────┴──────────┴─────────────────┴─────────────────┴───────────┘');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. WRITER STATS SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 3. WRITER DATA SUMMARY                                                  │');
  console.log('└─────────────────────────────────────────────────────────────────────────┘');

  console.log(`
   Total writers:                    ${writerStats.total}
   ├─ Have Producer record:          ${writerStats.hasProducer} ${writerStats.hasProducer < writerStats.total ? '⚠️ MISSING PRODUCER RECORDS' : '✅'}
   ├─ Have BMI PRO affiliation:      ${writerStats.hasBmiPro}
   ├─ Have Writer IPI:               ${writerStats.hasWriterIpi}
   ├─ Have Publisher IPI:            ${writerStats.hasPublisherIpi}
   ├─ Publisher IPI matches PT:      ${writerStats.hasMatchingPtIpi} ${writerStats.hasMatchingPtIpi < writerStats.total ? '⚠️ MISSING PT MATCH' : '✅'}
   └─ Would pass BMI statement:      ${writerStats.wouldPassBmiFilters} ${writerStats.wouldPassBmiFilters < writerStats.hasBmiPro ? '⚠️ BMI WRITERS FAILING' : '✅'}
  `);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SAMPLE PLACEMENT CREDITS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 4. SAMPLE PLACEMENT CREDITS (First 10 approved placements)             │');
  console.log('└─────────────────────────────────────────────────────────────────────────┘');

  const placements = await prisma.placement.findMany({
    where: { status: { in: ['APPROVED', 'TRACKING'] } },
    take: 10,
    include: {
      credits: {
        include: {
          user: {
            include: {
              producer: {
                select: { proAffiliation: true }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  for (const placement of placements) {
    console.log(`\n📀 "${placement.title}" by ${placement.artist}`);
    console.log('   Credits:');

    for (const credit of placement.credits) {
      const userId = credit.userId ? '✅' : '❌';
      const pro = credit.pro || credit.user?.producer?.proAffiliation || 'NONE';
      const pubIpi = credit.publisherIpiNumber || credit.user?.publisherIpiNumber || '—';
      const normalizedPubIpi = pubIpi.replace(/[\s\-\.]/g, '').replace(/^0+/, '');
      const ptMatch = ptIpis.includes(normalizedPubIpi) ? '✅' : '❌';

      // Would this credit pass BMI filters?
      const passesSplit = Number(credit.splitPercentage) > 0;
      const passesUserId = !!credit.userId && !!credit.user;
      const passesPro = pro === 'BMI';
      const passesPtIpi = ptIpis.includes(normalizedPubIpi);
      const wouldPass = passesSplit && passesUserId && passesPro && passesPtIpi;

      console.log(`   • ${credit.firstName} ${credit.lastName} (${credit.splitPercentage}%)`);
      console.log(`     userId: ${userId} | PRO: ${pro} | PublisherIPI: ${pubIpi} | PT Match: ${ptMatch}`);
      console.log(`     → Would pass BMI filter: ${wouldPass ? '✅ YES' : '❌ NO'}`);
      if (!wouldPass) {
        const reasons = [];
        if (!passesSplit) reasons.push('no split %');
        if (!passesUserId) reasons.push('no userId linked');
        if (!passesPro) reasons.push(`PRO is ${pro}, not BMI`);
        if (!passesPtIpi) reasons.push('publisher IPI not in PT list');
        console.log(`       Reasons: ${reasons.join(', ')}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 5. RECOMMENDATIONS                                                      │');
  console.log('└─────────────────────────────────────────────────────────────────────────┘');

  const recommendations = [];

  if (writerStats.hasProducer < writerStats.total) {
    recommendations.push(`🔧 ${writerStats.total - writerStats.hasProducer} writers missing Producer record (no PRO affiliation)`);
  }

  if (writerStats.hasMatchingPtIpi < writerStats.total) {
    recommendations.push(`🔧 ${writerStats.total - writerStats.hasMatchingPtIpi} writers missing PT publisher IPI match`);
  }

  if (writerStats.wouldPassBmiFilters < writerStats.hasBmiPro) {
    recommendations.push(`🔧 ${writerStats.hasBmiPro - writerStats.wouldPassBmiFilters} BMI writers would fail due to missing PT publisher IPI`);
  }

  if (recommendations.length === 0) {
    console.log('\n✅ All writers appear to be properly configured!');
  } else {
    console.log('\n');
    recommendations.forEach(r => console.log(`   ${r}`));
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('                        END OF DIAGNOSTIC REPORT                            ');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

diagnoseWriterMatching().catch(console.error);
