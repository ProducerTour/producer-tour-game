import Stripe from 'stripe';
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const DYLAN_USER_ID = 'cmi2nxga100011385jeaue7dd';
const DYLAN_EMAIL = 'dtdmusicproduction@gmail.com';

async function main() {
  console.log('='.repeat(60));
  console.log('🔍 Searching Stripe for Dylan\'s Connect Account');
  console.log('='.repeat(60));

  // Option 1: Search for existing Connect accounts by email
  console.log(`\nSearching for Stripe accounts with email: ${DYLAN_EMAIL}`);

  try {
    // List all connected accounts and filter by email
    const accounts = await stripe.accounts.list({ limit: 100 });

    let foundAccount: Stripe.Account | null = null;

    for (const account of accounts.data) {
      // Check email or metadata
      if (account.email === DYLAN_EMAIL ||
          account.metadata?.userId === DYLAN_USER_ID ||
          account.business_profile?.name?.toLowerCase().includes('dylan') ||
          account.business_profile?.name?.toLowerCase().includes('roldan')) {
        console.log(`\n✅ FOUND Stripe account:`);
        console.log(`   Account ID: ${account.id}`);
        console.log(`   Email: ${account.email}`);
        console.log(`   Details Submitted: ${account.details_submitted}`);
        console.log(`   Charges Enabled: ${account.charges_enabled}`);
        console.log(`   Payouts Enabled: ${account.payouts_enabled}`);
        console.log(`   Business Name: ${account.business_profile?.name || 'N/A'}`);
        console.log(`   Metadata: ${JSON.stringify(account.metadata)}`);
        foundAccount = account;
      }
    }

    if (!foundAccount) {
      console.log(`\n❌ No Stripe Connect account found for ${DYLAN_EMAIL}`);
      console.log(`\nChecked ${accounts.data.length} accounts total.`);

      // List all accounts for debugging
      console.log('\n📋 All Connect accounts in your Stripe:');
      for (const acc of accounts.data) {
        console.log(`   - ${acc.id}: ${acc.email || 'no email'} (${acc.business_profile?.name || 'no name'})`);
      }

      return;
    }

    // Option 2: Update our database with the found account
    console.log('\n' + '='.repeat(60));
    console.log('📝 Updating Database');
    console.log('='.repeat(60));

    const onboardingComplete =
      foundAccount.details_submitted &&
      foundAccount.charges_enabled &&
      foundAccount.payouts_enabled;

    const status = onboardingComplete ? 'complete' :
                   foundAccount.details_submitted ? 'restricted' : 'pending';

    await prisma.user.update({
      where: { id: DYLAN_USER_ID },
      data: {
        stripeAccountId: foundAccount.id,
        stripeOnboardingComplete: onboardingComplete,
        stripeAccountStatus: status,
        stripeDetailsSubmitted: foundAccount.details_submitted,
      },
    });

    console.log(`\n✅ Updated Dylan's database record:`);
    console.log(`   stripeAccountId: ${foundAccount.id}`);
    console.log(`   stripeOnboardingComplete: ${onboardingComplete}`);
    console.log(`   stripeAccountStatus: ${status}`);
    console.log(`   stripeDetailsSubmitted: ${foundAccount.details_submitted}`);

    // Verify the update
    const updatedUser = await prisma.user.findUnique({
      where: { id: DYLAN_USER_ID },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        stripeAccountStatus: true,
        stripeDetailsSubmitted: true,
      },
    });

    console.log('\n📋 Verified database record:');
    console.log(JSON.stringify(updatedUser, null, 2));

  } catch (error: any) {
    console.error('Error:', error.message);

    if (error.type === 'StripeAuthenticationError') {
      console.log('\n⚠️  Stripe API key issue. Make sure STRIPE_SECRET_KEY is set correctly.');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Done');
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
