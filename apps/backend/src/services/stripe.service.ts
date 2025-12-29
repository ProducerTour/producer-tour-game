import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import * as gamificationService from './gamification.service';

// Initialize Stripe only if API key is available
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  });
  console.log('✅ Stripe service initialized');
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY not set. Stripe functionality will not work.');
}

const ensureStripeConfigured = () => {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
};

export const stripeService = {
  /**
   * Create a Stripe Connect Express account for a writer
   */
  async createConnectAccount(userId: string, email: string): Promise<string> {
    ensureStripeConfigured();
    try {
      const account = await stripe!.accounts.create({
        type: 'express',
        email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          userId,
        },
      });

      // Update user with Stripe account ID
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeAccountId: account.id,
          stripeAccountStatus: account.details_submitted ? 'complete' : 'pending',
          stripeDetailsSubmitted: account.details_submitted,
        },
      });

      return account.id;
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      throw new Error('Failed to create payment account');
    }
  },

  /**
   * Generate an onboarding link for a writer to complete Stripe setup
   */
  async createOnboardingLink(userId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    ensureStripeConfigured();
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      let accountId = user.stripeAccountId;

      // Create account if it doesn't exist
      if (!accountId) {
        accountId = await this.createConnectAccount(userId, user.email);
      }

      const accountLink = await stripe!.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      throw new Error('Failed to create onboarding link');
    }
  },

  /**
   * Check and update Stripe account status
   */
  async updateAccountStatus(userId: string): Promise<{
    onboardingComplete: boolean;
    accountStatus: string;
    detailsSubmitted: boolean;
  }> {
    ensureStripeConfigured();
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.stripeAccountId) {
        throw new Error('No Stripe account found for user');
      }

      const account = await stripe!.accounts.retrieve(user.stripeAccountId);

      const onboardingComplete =
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled;

      const status = onboardingComplete ? 'complete' :
                     account.details_submitted ? 'restricted' : 'pending';

      // Check if this is the first time completing onboarding
      const wasIncomplete = !user.stripeOnboardingComplete;
      const isNowComplete = onboardingComplete;

      // Update user record
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeOnboardingComplete: onboardingComplete,
          stripeAccountStatus: status,
          stripeDetailsSubmitted: account.details_submitted,
        },
      });

      // Award gamification points for first-time Stripe connection
      if (wasIncomplete && isNowComplete) {
        try {
          await gamificationService.awardPoints(
            userId,
            'STRIPE_CONNECTED',
            100,
            'Connected Stripe account for payouts'
          );
        } catch (gamError) {
          console.error('Gamification award error:', gamError);
        }
      }

      return {
        onboardingComplete,
        accountStatus: status,
        detailsSubmitted: account.details_submitted,
      };
    } catch (error) {
      console.error('Error updating account status:', error);
      throw new Error('Failed to check account status');
    }
  },

  /**
   * Create a transfer to a writer's Stripe Connect account
   */
  async createTransfer(
    accountId: string,
    amountCents: number,
    statementId: string,
    description: string,
    transferGroup?: string
  ): Promise<string> {
    ensureStripeConfigured();
    try {
      console.log('🔄 Creating Stripe transfer:', {
        destination: accountId,
        amount: amountCents,
        currency: 'usd',
        description,
        transferGroup,
      });

      const transfer = await stripe!.transfers.create({
        amount: amountCents,
        currency: 'usd',
        destination: accountId,
        description,
        metadata: {
          statementId,
        },
        transfer_group: transferGroup,
      });

      console.log('✅ Stripe transfer created:', transfer.id);
      return transfer.id;
    } catch (error: any) {
      // Log full Stripe error details
      console.error('❌ Stripe transfer error details:', {
        type: error.type,
        code: error.code,
        message: error.message,
        param: error.param,
        statusCode: error.statusCode,
        requestId: error.requestId,
        raw: error.raw,
        fullError: error,
      });

      // Re-throw with detailed message
      const errorMessage = error.message || 'Unknown Stripe error';
      const errorCode = error.code ? ` (${error.code})` : '';
      throw new Error(`Stripe transfer failed: ${errorMessage}${errorCode}`);
    }
  },

  /**
   * Process payment for a statement by transferring funds to all writers
   */
  async processStatementPayment(statementId: string): Promise<{
    success: boolean;
    transferIds: string[];
    errors: Array<{ userId: string; userName: string; error: string }>;
  }> {
    ensureStripeConfigured();
    try {
      const statement = await prisma.statement.findUnique({
        where: { id: statementId },
        include: {
          items: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!statement) {
        throw new Error('Statement not found');
      }

      if (statement.paymentStatus === 'PAID') {
        throw new Error('Statement already paid');
      }

      // Group items by user and calculate total per writer
      const writerPayments = new Map<string, {
        user: any;
        totalNet: number;
        itemCount: number;
      }>();

      for (const item of statement.items) {
        if (!item.user) continue;

        const existing = writerPayments.get(item.userId);
        if (existing) {
          existing.totalNet += Number(item.netAmount);
          existing.itemCount += 1;
        } else {
          writerPayments.set(item.userId, {
            user: item.user,
            totalNet: Number(item.netAmount),
            itemCount: 1,
          });
        }
      }

      // Create a transfer group for tracking
      const transferGroup = `statement_${statementId}_${Date.now()}`;
      const transferIds: string[] = [];
      const errors: Array<{ userId: string; userName: string; error: string }> = [];

      // Process each writer payment
      for (const [userId, payment] of writerPayments.entries()) {
        try {
          const { user, totalNet } = payment;
          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

          // Check if writer has completed Stripe onboarding
          if (!user.stripeAccountId) {
            errors.push({ userId, userName, error: 'No Stripe account connected' });
            continue;
          }

          if (!user.stripeOnboardingComplete) {
            // Try to refresh account status
            const status = await this.updateAccountStatus(userId);
            if (!status.onboardingComplete) {
              errors.push({ userId, userName, error: 'Stripe onboarding not complete' });
              continue;
            }
          }

          // Convert to cents (Stripe uses smallest currency unit)
          const amountCents = Math.round(totalNet * 100);

          if (amountCents <= 0) {
            errors.push({ userId, userName, error: 'Invalid payment amount' });
            continue;
          }

          // Create transfer
          const transferId = await this.createTransfer(
            user.stripeAccountId,
            amountCents,
            statementId,
            `Payment for ${statement.filename} (${statement.proType})`,
            transferGroup
          );

          transferIds.push(transferId);
        } catch (error: any) {
          const userName = `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() || payment.user.email;
          console.error(`Error processing payment for user ${userId}:`, error);
          errors.push({ userId, userName, error: error.message || 'Transfer failed' });
        }
      }

      // Update statement with transfer information
      await prisma.statement.update({
        where: { id: statementId },
        data: {
          stripeTransferGroup: transferGroup,
          stripeTransferIds: transferIds,
        },
      });

      return {
        success: errors.length === 0,
        transferIds,
        errors,
      };
    } catch (error: any) {
      console.error('Error processing statement payment:', error);
      throw error;
    }
  },

  /**
   * Get Stripe account details for a user
   */
  async getAccountDetails(userId: string): Promise<any> {
    ensureStripeConfigured();
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.stripeAccountId) {
        return null;
      }

      const account = await stripe!.accounts.retrieve(user.stripeAccountId);
      return account;
    } catch (error) {
      console.error('Error fetching account details:', error);
      return null;
    }
  },

  /**
   * Create a dashboard login link for a writer to access their Stripe dashboard
   */
  async createDashboardLink(userId: string): Promise<string> {
    ensureStripeConfigured();
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.stripeAccountId) {
        throw new Error('No Stripe account found');
      }

      const loginLink = await stripe!.accounts.createLoginLink(user.stripeAccountId);
      return loginLink.url;
    } catch (error) {
      console.error('Error creating dashboard link:', error);
      throw new Error('Failed to create dashboard link');
    }
  },
};
