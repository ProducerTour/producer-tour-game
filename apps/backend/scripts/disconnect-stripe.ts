import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function disconnectStripeAccount(email: string) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
      },
    });

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:', {
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      currentStripeAccount: user.stripeAccountId || 'None',
      onboardingComplete: user.stripeOnboardingComplete,
    });

    if (!user.stripeAccountId) {
      console.log('ℹ️  User is not connected to Stripe - nothing to disconnect');
      process.exit(0);
    }

    console.log('\n🔄 Disconnecting Stripe account...');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        stripeAccountStatus: null,
        stripeDetailsSubmitted: false,
      },
    });

    console.log('✅ Successfully disconnected Stripe account');
    console.log('ℹ️  User can now connect a new Stripe account from the Payments tab');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: npx tsx scripts/disconnect-stripe.ts user@example.com');
  process.exit(1);
}

disconnectStripeAccount(email);
