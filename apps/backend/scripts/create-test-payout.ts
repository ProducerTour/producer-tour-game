import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a test payout request for a user
 * Usage: npx tsx scripts/create-test-payout.ts <email> <amount>
 */
async function createTestPayout() {
  const email = process.argv[2];
  const amount = parseFloat(process.argv[3]);

  if (!email || !amount || isNaN(amount)) {
    console.error('Usage: npx tsx scripts/create-test-payout.ts <email> <amount>');
    console.error('Example: npx tsx scripts/create-test-payout.ts nullybeats@example.com 10.00');
    process.exit(1);
  }

  console.log(`\n🔍 Looking for user: ${email}`);

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        availableBalance: true,
        pendingBalance: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
      },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   Available Balance: $${Number(user.availableBalance).toFixed(2)}`);
    console.log(`   Pending Balance: $${Number(user.pendingBalance).toFixed(2)}`);
    console.log(`   Stripe Connected: ${user.stripeAccountId ? 'Yes' : 'No'}`);
    console.log(`   Stripe Onboarding: ${user.stripeOnboardingComplete ? 'Complete' : 'Incomplete'}`);

    // Check if user has enough balance
    const availableBalance = Number(user.availableBalance);
    if (amount > availableBalance) {
      console.error(`\n❌ Insufficient balance!`);
      console.error(`   Requested: $${amount.toFixed(2)}`);
      console.error(`   Available: $${availableBalance.toFixed(2)}`);
      process.exit(1);
    }

    // Get system settings for minimum withdrawal
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { minimumWithdrawalAmount: 50.00 }
      });
    }
    const minimumAmount = Number(settings.minimumWithdrawalAmount);

    // Check minimum amount
    if (amount < minimumAmount) {
      console.error(`\n⚠️  Amount is below minimum withdrawal: $${minimumAmount.toFixed(2)}`);
      console.log('   Proceeding anyway for testing purposes...');
    }

    // Create payout request
    console.log(`\n💸 Creating payout request for $${amount.toFixed(2)}...`);

    const payoutRequest = await prisma.payoutRequest.create({
      data: {
        userId: user.id,
        amount,
        status: 'PENDING',
      },
    });

    // Move amount from available to pending balance
    await prisma.user.update({
      where: { id: user.id },
      data: {
        availableBalance: { decrement: amount },
        pendingBalance: { increment: amount },
      },
    });

    console.log(`✅ Payout request created!`);
    console.log(`   Request ID: ${payoutRequest.id}`);
    console.log(`   Amount: $${Number(payoutRequest.amount).toFixed(2)}`);
    console.log(`   Status: ${payoutRequest.status}`);
    console.log(`   Requested At: ${payoutRequest.requestedAt}`);

    console.log(`\n🎉 Success! User balances updated:`);
    console.log(`   Available Balance: $${(availableBalance - amount).toFixed(2)}`);
    console.log(`   Pending Balance: $${(Number(user.pendingBalance) + amount).toFixed(2)}`);

    console.log(`\n📋 Next steps:`);
    console.log(`   1. Go to Admin Dashboard → Payouts tab`);
    console.log(`   2. You should see this withdrawal request in the "Withdrawal Requests" section`);
    console.log(`   3. Click "Approve" to process the payout and create the Stripe transfer`);
    console.log(`   4. Check your Stripe dashboard for the transfer`);

  } catch (error) {
    console.error('❌ Error creating payout request:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestPayout()
  .then(() => {
    console.log('\n✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
