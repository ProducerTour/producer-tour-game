import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { stripeService } from '../services/stripe.service';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/payments/status
 * Get current user's Stripe payment status
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        stripeAccountStatus: true,
        stripeDetailsSubmitted: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user has a Stripe account, refresh its status
    if (user.stripeAccountId) {
      try {
        const status = await stripeService.updateAccountStatus(userId);
        return res.json({
          hasAccount: true,
          ...status,
        });
      } catch (error) {
        console.error('Error refreshing Stripe status:', error);
        // Return cached status if refresh fails
        return res.json({
          hasAccount: true,
          onboardingComplete: user.stripeOnboardingComplete,
          accountStatus: user.stripeAccountStatus,
          detailsSubmitted: user.stripeDetailsSubmitted,
        });
      }
    }

    // No Stripe account yet
    res.json({
      hasAccount: false,
      onboardingComplete: false,
      accountStatus: null,
      detailsSubmitted: false,
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

/**
 * POST /api/payments/onboard
 * Create or get Stripe onboarding link for writer
 */
router.post('/onboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { returnUrl, refreshUrl } = req.body;

    if (!returnUrl || !refreshUrl) {
      return res.status(400).json({
        error: 'returnUrl and refreshUrl are required',
      });
    }

    const onboardingUrl = await stripeService.createOnboardingLink(
      userId,
      returnUrl,
      refreshUrl
    );

    res.json({ url: onboardingUrl });
  } catch (error: any) {
    console.error('Create onboarding link error:', error);
    res.status(500).json({ error: error.message || 'Failed to create onboarding link' });
  }
});

/**
 * POST /api/payments/dashboard-link
 * Get Stripe Express dashboard login link
 */
router.post('/dashboard-link', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true, stripeOnboardingComplete: true },
    });

    if (!user?.stripeAccountId) {
      return res.status(400).json({
        error: 'No Stripe account connected. Please complete onboarding first.',
      });
    }

    if (!user.stripeOnboardingComplete) {
      return res.status(400).json({
        error: 'Onboarding not complete. Please finish setting up your payment account.',
      });
    }

    const dashboardUrl = await stripeService.createDashboardLink(userId);

    res.json({ url: dashboardUrl });
  } catch (error: any) {
    console.error('Create dashboard link error:', error);
    res.status(500).json({ error: error.message || 'Failed to create dashboard link' });
  }
});

/**
 * GET /api/payments/tax-status
 * Get current user's tax information status
 */
router.get('/tax-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        taxFormType: true,
        taxInfoSubmittedAt: true,
        taxInfoStatus: true,
        taxFormLast4: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      hasStripeAccount: !!user.stripeAccountId,
      stripeOnboardingComplete: user.stripeOnboardingComplete,
      taxFormType: user.taxFormType,
      taxInfoSubmittedAt: user.taxInfoSubmittedAt,
      taxInfoStatus: user.taxInfoStatus,
      taxFormLast4: user.taxFormLast4,
      isComplete: !!(user.taxFormType && user.taxInfoStatus === 'verified'),
    });
  } catch (error) {
    console.error('Get tax status error:', error);
    res.status(500).json({ error: 'Failed to get tax status' });
  }
});

/**
 * POST /api/payments/tax-info
 * Submit tax information (W-9/W-8BEN) to Stripe
 */
router.post('/tax-info', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      formType, // "W9" or "W8BEN"
      legalName,
      businessName,
      taxClassification,
      address,
      city,
      state,
      zipCode,
      country,
      ssn, // Full SSN for W-9 (will not be stored, only sent to Stripe)
      ein, // Optional EIN for businesses
      foreignTaxId, // For W-8BEN
      countryOfCitizenship, // For W-8BEN
    } = req.body;

    // Validate required fields
    if (!formType || !['W9', 'W8BEN'].includes(formType)) {
      return res.status(400).json({ error: 'Invalid form type. Must be W9 or W8BEN' });
    }

    if (!legalName) {
      return res.status(400).json({ error: 'Legal name is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeAccountId: true,
        stripeOnboardingComplete: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeAccountId) {
      return res.status(400).json({
        error: 'Please complete Stripe onboarding first before submitting tax information',
      });
    }

    // Get last 4 digits of SSN/EIN for display
    let last4 = '';
    if (formType === 'W9') {
      if (ssn && ssn.length >= 4) {
        last4 = ssn.replace(/\D/g, '').slice(-4);
      } else if (ein && ein.length >= 4) {
        last4 = ein.replace(/\D/g, '').slice(-4);
      }
    } else if (foreignTaxId && foreignTaxId.length >= 4) {
      last4 = foreignTaxId.slice(-4);
    }

    // Update Stripe account with tax information
    // Note: Stripe handles the actual tax form generation and IRS reporting
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const updateData: any = {
        individual: {
          first_name: legalName.split(' ')[0],
          last_name: legalName.split(' ').slice(1).join(' ') || legalName.split(' ')[0],
          address: {
            line1: address,
            city: city,
            state: state,
            postal_code: zipCode,
            country: formType === 'W9' ? 'US' : country,
          },
        },
        business_profile: {
          name: businessName || undefined,
        },
      };

      // Add SSN for W-9 (US persons)
      if (formType === 'W9' && ssn) {
        updateData.individual.ssn_last_4 = ssn.replace(/\D/g, '').slice(-4);
        // Note: Full SSN is collected during Stripe's identity verification
      }

      // Add EIN if provided for business
      if (ein && taxClassification && taxClassification !== 'individual') {
        updateData.company = {
          tax_id: ein.replace(/\D/g, ''),
        };
      }

      // Update Stripe Connect account
      await stripe.accounts.update(user.stripeAccountId, updateData);

      // Update our database with tax info status
      await prisma.user.update({
        where: { id: userId },
        data: {
          taxFormType: formType,
          taxInfoSubmittedAt: new Date(),
          taxInfoStatus: 'pending', // Stripe will verify
          taxFormLast4: last4,
        },
      });

      res.json({
        success: true,
        message: 'Tax information submitted successfully',
        taxFormType: formType,
        taxFormLast4: last4,
        taxInfoStatus: 'pending',
      });
    } catch (stripeError: any) {
      console.error('Stripe tax update error:', stripeError);

      // Still save that they attempted to submit
      await prisma.user.update({
        where: { id: userId },
        data: {
          taxFormType: formType,
          taxInfoSubmittedAt: new Date(),
          taxInfoStatus: 'needs_update',
          taxFormLast4: last4,
        },
      });

      res.status(400).json({
        error: stripeError.message || 'Failed to update tax information with Stripe',
        details: 'Your information has been saved but may need additional verification.',
      });
    }
  } catch (error: any) {
    console.error('Submit tax info error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit tax information' });
  }
});

/**
 * GET /api/payments/history
 * Get payment history for current writer
 */
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all statement items for this writer where payment was processed
    const paidItems = await prisma.statementItem.findMany({
      where: {
        userId,
        isVisibleToWriter: true,
        paidAt: { not: null },
      },
      include: {
        statement: {
          select: {
            id: true,
            filename: true,
            proType: true,
            paymentStatus: true,
            paymentProcessedAt: true,
            stripeTransferIds: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Group by statement
    const paymentsByStatement = new Map();

    for (const item of paidItems) {
      const statementId = item.statement.id;

      if (!paymentsByStatement.has(statementId)) {
        paymentsByStatement.set(statementId, {
          statementId,
          filename: item.statement.filename,
          proType: item.statement.proType,
          paymentStatus: item.statement.paymentStatus,
          paidAt: item.paidAt,
          processedAt: item.statement.paymentProcessedAt,
          grossRevenue: 0,
          commissionAmount: 0,
          netAmount: 0,
          itemCount: 0,
        });
      }

      const payment = paymentsByStatement.get(statementId);
      payment.grossRevenue += Number(item.revenue || 0);
      payment.commissionAmount += Number(item.commissionAmount || 0);
      payment.netAmount += Number(item.netRevenue || 0);
      payment.itemCount += 1;
    }

    res.json({
      payments: Array.from(paymentsByStatement.values()),
      total: paymentsByStatement.size,
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

export default router;
