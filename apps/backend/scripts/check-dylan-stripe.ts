import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('🔍 Checking Dylan Roldan\'s Stripe Status');
  console.log('='.repeat(60));

  // Find Dylan Roldan (search by first or last name)
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Dylan', mode: 'insensitive' } },
        { lastName: { contains: 'Roldan', mode: 'insensitive' } },
        { email: { contains: 'dylan', mode: 'insensitive' } },
        { email: { contains: 'roldan', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      stripeAccountId: true,
      stripeOnboardingComplete: true,
      stripeAccountStatus: true,
      stripeDetailsSubmitted: true,
    },
  });

  if (users.length === 0) {
    console.log('❌ No user found matching "Dylan Roldan"');
  } else {
    console.log(`Found ${users.length} matching user(s):\n`);
    for (const user of users) {
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Name: ${user.firstName || ''} ${user.lastName || ''}`);
      console.log(`🆔 User ID: ${user.id}`);
      console.log(`💳 Stripe Account ID: ${user.stripeAccountId || 'NOT SET'}`);
      console.log(`✅ Onboarding Complete: ${user.stripeOnboardingComplete}`);
      console.log(`📋 Account Status: ${user.stripeAccountStatus || 'NOT SET'}`);
      console.log(`📝 Details Submitted: ${user.stripeDetailsSubmitted}`);
      console.log('-'.repeat(40));
    }
  }

  // Check for any session payouts submitted by Dylan
  console.log('\n' + '='.repeat(60));
  console.log('📋 Session Payouts by Dylan');
  console.log('='.repeat(60));

  const sessionPayouts = await prisma.sessionPayout.findMany({
    where: {
      OR: [
        { submittedByName: { contains: 'Dylan', mode: 'insensitive' } },
        { submittedByName: { contains: 'Roldan', mode: 'insensitive' } },
        ...(users.length > 0 ? [{ submittedById: { in: users.map(u => u.id) } }] : []),
      ],
    },
    include: {
      submittedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (sessionPayouts.length === 0) {
    console.log('No session payouts found for Dylan.');
  } else {
    for (const payout of sessionPayouts) {
      console.log(`\n🎵 ${payout.artistName} - ${payout.songTitles}`);
      console.log(`   Status: ${payout.status}`);
      console.log(`   Amount: $${Number(payout.payoutAmount).toFixed(2)}`);
      console.log(`   Submitted By: ${payout.submittedByName} (${payout.submittedBy.email})`);
      console.log(`   User's stripeAccountId: ${payout.submittedBy.stripeAccountId || 'NOT SET'}`);
      console.log(`   User's stripeOnboardingComplete: ${payout.submittedBy.stripeOnboardingComplete}`);
    }
  }

  // Test invoice queries
  console.log('\n' + '='.repeat(60));
  console.log('🧾 Testing Invoice Queries');
  console.log('='.repeat(60));

  try {
    // Test stats query
    const stats = await Promise.all([
      prisma.invoice.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({ where: { status: 'APPROVED' } }),
      prisma.invoice.count({ where: { status: 'PROCESSING' } }),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: 'REJECTED' } }),
    ]);
    console.log(`✅ Invoice stats query succeeded`);
    console.log(`   PENDING: ${stats[0]}, APPROVED: ${stats[1]}, PROCESSING: ${stats[2]}, PAID: ${stats[3]}, REJECTED: ${stats[4]}`);
  } catch (error: any) {
    console.log(`❌ Invoice stats query FAILED: ${error.message}`);
  }

  try {
    // Test main invoice query
    const invoices = await prisma.invoice.findMany({
      take: 5,
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        placementDeal: {
          select: {
            id: true,
            clientFullName: true,
            songTitle: true,
            artistName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`✅ Invoice list query succeeded (${invoices.length} invoices found)`);
  } catch (error: any) {
    console.log(`❌ Invoice list query FAILED: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Diagnostic complete');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('Script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
