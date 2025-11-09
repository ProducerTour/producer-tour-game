/**
 * Stripe Payment Service
 *
 * Handles actual payment transfers to writers using Stripe Connect or Payouts API.
 *
 * SETUP REQUIRED:
 * 1. Create a Stripe account at https://stripe.com
 * 2. Get API keys from https://dashboard.stripe.com/apikeys
 * 3. Set up Stripe Connect (recommended) or use Payouts API
 * 4. Add STRIPE_SECRET_KEY to .env
 * 5. Collect writer bank account details (or use Stripe Connect for writer onboarding)
 *
 * IMPORTANT:
 * - This file provides the integration structure
 * - You must uncomment and configure based on your chosen Stripe integration method
 * - Test in Stripe test mode before going live
 * - Ensure PCI compliance for handling payment data
 */

// Uncomment when ready to use:
// import Stripe from 'stripe';

interface WriterPaymentDetails {
  writerId: string;
  writerName: string;
  writerEmail: string;
  amount: number; // in USD
  currency: string;
  description: string;
  metadata?: Record<string, any>;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  details?: any;
}

class StripePaymentService {
  // private stripe: Stripe | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const { STRIPE_SECRET_KEY } = process.env;

    if (!STRIPE_SECRET_KEY) {
      console.warn('⚠️  Stripe not configured. Set STRIPE_SECRET_KEY to enable automatic payments.');
      this.isConfigured = false;
      return;
    }

    try {
      // Uncomment when ready to use:
      // this.stripe = new Stripe(STRIPE_SECRET_KEY, {
      //   apiVersion: '2023-10-16', // Use latest API version
      // });
      // this.isConfigured = true;
      // console.log('✅ Stripe service configured successfully');

      this.isConfigured = false; // Set to true when uncommented above
    } catch (error) {
      console.error('❌ Failed to configure Stripe service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * METHOD 1: Stripe Connect (Recommended)
   *
   * Best for platforms that pay multiple sellers/contractors.
   * Writers create their own Stripe accounts and connect to your platform.
   *
   * Steps:
   * 1. Enable Stripe Connect in your dashboard
   * 2. Have writers connect their accounts: https://stripe.com/docs/connect/onboarding
   * 3. Use this method to transfer funds to connected accounts
   */
  async payWriterViaConnect(
    connectedAccountId: string,
    payment: WriterPaymentDetails
  ): Promise<PaymentResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Stripe not configured',
      };
    }

    try {
      // Uncomment when ready:
      // const transfer = await this.stripe!.transfers.create({
      //   amount: Math.round(payment.amount * 100), // Convert to cents
      //   currency: payment.currency.toLowerCase(),
      //   destination: connectedAccountId,
      //   description: payment.description,
      //   metadata: {
      //     writerId: payment.writerId,
      //     writerName: payment.writerName,
      //     ...payment.metadata,
      //   },
      // });

      // return {
      //   success: true,
      //   transactionId: transfer.id,
      //   details: transfer,
      // };

      return {
        success: false,
        error: 'Stripe integration not yet activated - uncomment code in stripe.service.ts',
      };
    } catch (error: any) {
      console.error('Stripe Connect transfer failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * METHOD 2: Stripe Payouts API
   *
   * Simpler but requires you to hold funds in your Stripe balance.
   * Writers provide bank account details which you store (PCI compliance required).
   *
   * Steps:
   * 1. Collect writer bank account details securely
   * 2. Create external accounts for each writer
   * 3. Use this method to send payouts
   */
  async payWriterViaPayout(
    externalAccountId: string,
    payment: WriterPaymentDetails
  ): Promise<PaymentResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Stripe not configured',
      };
    }

    try {
      // Uncomment when ready:
      // const payout = await this.stripe!.payouts.create({
      //   amount: Math.round(payment.amount * 100), // Convert to cents
      //   currency: payment.currency.toLowerCase(),
      //   destination: externalAccountId,
      //   description: payment.description,
      //   metadata: {
      //     writerId: payment.writerId,
      //     writerName: payment.writerName,
      //     ...payment.metadata,
      //   },
      // });

      // return {
      //   success: true,
      //   transactionId: payout.id,
      //   details: payout,
      // };

      return {
        success: false,
        error: 'Stripe integration not yet activated - uncomment code in stripe.service.ts',
      };
    } catch (error: any) {
      console.error('Stripe payout failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * METHOD 3: Stripe Checkout (Alternative for one-time setup)
   *
   * Create a payment link that writers can use to receive funds.
   * Less automated but easier to set up initially.
   */
  async createPaymentLink(
    payment: WriterPaymentDetails
  ): Promise<PaymentResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Stripe not configured',
      };
    }

    try {
      // Uncomment when ready:
      // const paymentLink = await this.stripe!.paymentLinks.create({
      //   line_items: [
      //     {
      //       price_data: {
      //         currency: payment.currency.toLowerCase(),
      //         product_data: {
      //           name: payment.description,
      //         },
      //         unit_amount: Math.round(payment.amount * 100),
      //       },
      //       quantity: 1,
      //     },
      //   ],
      //   metadata: {
      //     writerId: payment.writerId,
      //     writerName: payment.writerName,
      //     ...payment.metadata,
      //   },
      // });

      // return {
      //   success: true,
      //   transactionId: paymentLink.id,
      //   details: {
      //     url: paymentLink.url,
      //   },
      // };

      return {
        success: false,
        error: 'Stripe integration not yet activated - uncomment code in stripe.service.ts',
      };
    } catch (error: any) {
      console.error('Stripe payment link creation failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify account balance before processing payments
   */
  async checkBalance(): Promise<number> {
    if (!this.isConfigured) {
      return 0;
    }

    try {
      // Uncomment when ready:
      // const balance = await this.stripe!.balance.retrieve();
      // return balance.available[0]?.amount || 0; // in cents

      return 0;
    } catch (error) {
      console.error('Failed to retrieve Stripe balance:', error);
      return 0;
    }
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(payoutId: string): Promise<any> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      // Uncomment when ready:
      // return await this.stripe!.payouts.retrieve(payoutId);

      return null;
    } catch (error) {
      console.error('Failed to retrieve payout status:', error);
      return null;
    }
  }
}

// Export singleton instance
export const stripeService = new StripePaymentService();

/**
 * INTEGRATION GUIDE
 *
 * To activate Stripe payments:
 *
 * 1. Install Stripe SDK:
 *    npm install stripe
 *
 * 2. Get your API keys:
 *    https://dashboard.stripe.com/apikeys
 *
 * 3. Add to .env:
 *    STRIPE_SECRET_KEY=sk_test_... (test mode)
 *    STRIPE_SECRET_KEY=sk_live_... (production - after testing!)
 *
 * 4. Choose integration method:
 *
 *    Option A - Stripe Connect (Recommended):
 *    - Pro: Writers manage their own accounts
 *    - Pro: Automatic tax forms (1099s)
 *    - Pro: No PCI compliance burden
 *    - Con: Writers must create Stripe accounts
 *
 *    Option B - Stripe Payouts:
 *    - Pro: Simpler for writers (just bank details)
 *    - Pro: More control
 *    - Con: You hold funds
 *    - Con: PCI compliance required
 *
 * 5. Uncomment the Stripe initialization code above
 *
 * 6. Update User model to store:
 *    - stripeConnectedAccountId (for Connect)
 *    OR
 *    - stripeBankAccountId (for Payouts)
 *
 * 7. Test with Stripe test cards:
 *    https://stripe.com/docs/testing
 *
 * 8. Add webhook handling for payment status updates
 *
 * 9. GO LIVE! (after thorough testing)
 */
