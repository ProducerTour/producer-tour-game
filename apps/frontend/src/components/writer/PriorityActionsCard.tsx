/**
 * Priority Actions Card
 * Displays high-priority setup actions for writers:
 * 1. Stripe Connect onboarding (if not connected)
 * 2. Tax info collection (W-9/W-8BEN) for 1099 reporting
 */

import { Card, Text, Button, Title } from '@tremor/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../../lib/api';
import { useState } from 'react';
import { TaxInfoModal } from './TaxInfoModal';

interface PriorityActionsCardProps {
  onStartOnboarding?: () => void;
}

export function PriorityActionsCard({ onStartOnboarding }: PriorityActionsCardProps) {
  const queryClient = useQueryClient();
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Get payment status (Stripe onboarding)
  const { data: paymentStatus, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-status'],
    queryFn: async () => {
      const response = await paymentApi.getStatus();
      return response.data;
    },
  });

  // Get tax status
  const { data: taxStatus, isLoading: taxLoading } = useQuery({
    queryKey: ['tax-status'],
    queryFn: async () => {
      const response = await paymentApi.getTaxStatus();
      return response.data;
    },
  });

  // Create onboarding link mutation
  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const returnUrl = `${window.location.origin}/dashboard?stripe=complete`;
      const refreshUrl = `${window.location.origin}/dashboard?stripe=refresh`;
      const response = await paymentApi.createOnboardingLink(returnUrl, refreshUrl);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      }
    },
  });

  // Create dashboard link mutation
  const dashboardMutation = useMutation({
    mutationFn: async () => {
      const response = await paymentApi.getDashboardLink();
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
  });

  const handleStartOnboarding = () => {
    if (onStartOnboarding) {
      onStartOnboarding();
    }
    onboardingMutation.mutate();
  };

  const isLoading = paymentLoading || taxLoading;
  const hasStripeAccount = paymentStatus?.hasAccount;
  const stripeComplete = paymentStatus?.onboardingComplete;
  const taxComplete = taxStatus?.taxFormType && taxStatus?.taxInfoStatus === 'verified';
  const taxPending = taxStatus?.taxFormType && taxStatus?.taxInfoStatus === 'pending';

  // Calculate completion status
  const completedSteps = (stripeComplete ? 1 : 0) + (taxComplete || taxPending ? 1 : 0);
  const totalSteps = 2;

  if (isLoading) {
    return (
      <Card className="bg-theme-card border border-theme-border animate-pulse">
        <div className="h-48"></div>
      </Card>
    );
  }

  // State 3: All Complete
  if (stripeComplete && (taxComplete || taxPending)) {
    return (
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <Title className="text-theme-foreground mb-1">Payment Setup Complete</Title>
            <Text className="text-theme-foreground-secondary mb-4">
              You're all set to receive royalty payments!
            </Text>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <Text className="text-emerald-500">Stripe Connected</Text>
              </div>
              <div className="flex items-center gap-2 text-emerald-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <Text className="text-emerald-500">
                  Tax Info {taxPending ? 'Submitted' : 'Verified'}
                  {taxStatus?.taxFormLast4 && ` (***${taxStatus.taxFormLast4})`}
                </Text>
              </div>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => dashboardMutation.mutate()}
              loading={dashboardMutation.isPending}
              className="bg-theme-card-hover border border-theme-border text-theme-foreground hover:bg-theme-hover"
            >
              View Stripe Dashboard
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // State 1: Stripe Not Connected
  if (!stripeComplete) {
    return (
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <Title className="text-theme-foreground mb-1">Complete Payout Setup</Title>
            <Text className="text-theme-foreground-secondary mb-4">
              Connect your bank account to receive royalty payments.
            </Text>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-2 bg-theme-card-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                />
              </div>
              <Text className="text-xs text-theme-foreground-secondary">
                {completedSteps}/{totalSteps}
              </Text>
            </div>

            <Button
              onClick={handleStartOnboarding}
              loading={onboardingMutation.isPending || isRedirecting}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              {hasStripeAccount ? 'Continue Setup' : 'Connect Stripe Account'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // State 2: Stripe Connected, No Tax Info
  return (
    <>
      <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <Title className="text-theme-foreground mb-1">Submit Tax Information</Title>
            <Text className="text-theme-foreground-secondary mb-4">
              Required for 1099 reporting. Takes about 2 minutes.
            </Text>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <Text className="text-emerald-500">Stripe Connected</Text>
              </div>
              <div className="flex items-center gap-2 text-theme-foreground-secondary">
                <div className="w-4 h-4 rounded-full border-2 border-amber-500" />
                <Text className="text-theme-foreground-secondary">Tax Form (W-9/W-8BEN)</Text>
              </div>
            </div>

            <Button
              onClick={() => setShowTaxModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white border-0"
            >
              Submit Tax Info
            </Button>
          </div>
        </div>
      </Card>

      <TaxInfoModal
        isOpen={showTaxModal}
        onClose={() => setShowTaxModal(false)}
        onSuccess={() => {
          setShowTaxModal(false);
          queryClient.invalidateQueries({ queryKey: ['tax-status'] });
        }}
      />
    </>
  );
}
