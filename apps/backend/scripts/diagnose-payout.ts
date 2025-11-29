/**
 * Diagnostic Script: Payout Balance Discrepancy
 *
 * Run with: npx tsx scripts/diagnose-payout.ts
 *
 * Make sure DATABASE_URL is set to your production database
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function diagnosePayoutDiscrepancy() {
  console.log('\n========================================');
  console.log('  PAYOUT BALANCE DIAGNOSTIC REPORT');
  console.log('========================================\n');

  // Search for the user - adjust this search as needed
  const searchName = 'Nolan Griffis';
  const searchTerms = searchName.toLowerCase().split(' ');

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
        { lastName: { contains: searchTerms[1] || searchTerms[0], mode: 'insensitive' } },
        { email: { contains: 'nolan', mode: 'insensitive' } },
      ],
      role: 'WRITER',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      availableBalance: true,
      pendingBalance: true,
      lifetimeEarnings: true,
    },
  });

  if (users.length === 0) {
    console.log('❌ No matching users found');
    return;
  }

  for (const user of users) {
    console.log('─────────────────────────────────────');
    console.log(`USER: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log('─────────────────────────────────────\n');

    console.log('💰 BALANCE FIELDS (from User table):');
    console.log(`   Available Balance: $${Number(user.availableBalance).toFixed(2)}`);
    console.log(`   Pending Balance:   $${Number(user.pendingBalance).toFixed(2)}`);
    console.log(`   Lifetime Earnings: $${Number(user.lifetimeEarnings).toFixed(2)}`);
    console.log('');

    // Get all payout requests for this user
    const payoutRequests = await prisma.payoutRequest.findMany({
      where: { userId: user.id },
      orderBy: { requestedAt: 'desc' },
    });

    console.log(`📋 PAYOUT REQUESTS (${payoutRequests.length} total):\n`);

    if (payoutRequests.length === 0) {
      console.log('   No payout requests found');
    } else {
      // Group by status
      const byStatus: Record<string, typeof payoutRequests> = {};
      payoutRequests.forEach(p => {
        if (!byStatus[p.status]) byStatus[p.status] = [];
        byStatus[p.status].push(p);
      });

      for (const [status, requests] of Object.entries(byStatus)) {
        const total = requests.reduce((sum, r) => sum + Number(r.amount), 0);
        console.log(`   ${status}: ${requests.length} request(s), Total: $${total.toFixed(2)}`);

        requests.forEach(r => {
          console.log(`      - $${Number(r.amount).toFixed(2)} | ${r.requestedAt.toISOString().split('T')[0]} | ID: ${r.id.slice(0, 8)}...`);
        });
        console.log('');
      }

      // Calculate what pendingBalance SHOULD be
      const pendingStatuses = ['PENDING', 'APPROVED', 'PROCESSING'];
      const shouldBePending = payoutRequests
        .filter(p => pendingStatuses.includes(p.status))
        .reduce((sum, r) => sum + Number(r.amount), 0);

      console.log('─────────────────────────────────────');
      console.log('🔍 ANALYSIS:\n');
      console.log(`   User.pendingBalance:        $${Number(user.pendingBalance).toFixed(2)}`);
      console.log(`   Sum of pending requests:    $${shouldBePending.toFixed(2)}`);

      const diff = Number(user.pendingBalance) - shouldBePending;
      if (Math.abs(diff) > 0.01) {
        console.log(`\n   ⚠️  DISCREPANCY: $${diff.toFixed(2)}`);
        console.log(`   The pendingBalance field doesn't match the sum of pending requests!`);

        if (diff > 0) {
          console.log(`   → User has $${diff.toFixed(2)} MORE in pendingBalance than actual pending requests`);
          console.log(`   → Possible cause: A request was cancelled/completed but balance wasn't decremented`);
        } else {
          console.log(`   → User has $${Math.abs(diff).toFixed(2)} LESS in pendingBalance than pending requests`);
          console.log(`   → Possible cause: A request was created but balance wasn't incremented`);
        }
      } else {
        console.log(`\n   ✅ Balance matches pending requests (difference: $${diff.toFixed(2)})`);
      }
    }

    // Check recent transactions/changes
    console.log('\n─────────────────────────────────────');
    console.log('📊 RECENT REQUEST DETAILS:\n');

    const recentRequests = payoutRequests.slice(0, 5);
    for (const req of recentRequests) {
      console.log(`   Request ID: ${req.id}`);
      console.log(`   Amount: $${Number(req.amount).toFixed(2)}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Requested: ${req.requestedAt.toISOString()}`);
      if (req.approvedAt) console.log(`   Approved: ${req.approvedAt.toISOString()}`);
      if (req.processedAt) console.log(`   Processed: ${req.processedAt.toISOString()}`);
      if (req.completedAt) console.log(`   Completed: ${req.completedAt.toISOString()}`);
      if (req.failureReason) console.log(`   Failure: ${req.failureReason}`);
      if (req.stripeTransferId) console.log(`   Stripe Transfer: ${req.stripeTransferId}`);
      console.log('');
    }
  }

  console.log('\n========================================');
  console.log('  END OF DIAGNOSTIC REPORT');
  console.log('========================================\n');
}

diagnosePayoutDiscrepancy()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
