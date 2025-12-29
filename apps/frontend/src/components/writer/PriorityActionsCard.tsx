/**
 * Priority Actions Card
 * Displays high-priority setup actions for writers:
 * 1. Stripe Connect onboarding (if not connected)
 * 2. Tax info collection (W-9/W-8BEN) for 1099 reporting
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../../lib/api';
import { useState } from 'react';
import { TaxInfoModal } from './TaxInfoModal';
import { CreditCard, FileText, CheckCircle, ExternalLink } from 'lucide-react';

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
  const taxSubmitted = taxComplete || taxPending;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-pulse">
          <div className="h-16"></div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-pulse">
          <div className="h-16"></div>
        </div>
      </div>
    );
  }

  // All complete state
  if (stripeComplete && taxSubmitted) {
    return (
      <div className="space-y-3">
        {/* Stripe Status */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs">Payout Account</p>
              <p className="text-lg font-semibold text-gray-900">Stripe Connected</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
              Active
            </span>
          </div>
        </div>

        {/* Tax Status */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs">Tax Information ({taxStatus?.taxFormType})</p>
              <p className="text-lg font-semibold text-gray-900">
                {taxStatus?.taxFormLast4 ? `***-**-${taxStatus.taxFormLast4}` : 'Submitted'}
              </p>
            </div>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${
              taxComplete
                ? 'text-emerald-700 bg-emerald-100 border-emerald-200'
                : 'text-amber-700 bg-amber-100 border-amber-200'
            }`}>
              {taxComplete ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>

        {/* View Dashboard Button */}
        <button
          onClick={() => dashboardMutation.mutate()}
          disabled={dashboardMutation.isPending}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          {dashboardMutation.isPending ? (
            'Opening...'
          ) : (
            <>
              View Stripe Dashboard
              <ExternalLink className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Stripe Status Card */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              stripeComplete ? 'bg-emerald-100' : 'bg-blue-100'
            }`}>
              {stripeComplete ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <CreditCard className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs">Payout Account</p>
              <p className="text-lg font-semibold text-gray-900">
                {stripeComplete ? 'Stripe Connected' : 'Connect Stripe'}
              </p>
            </div>
            {stripeComplete ? (
              <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                Complete
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-1 rounded-full border border-blue-200">
                Required
              </span>
            )}
          </div>
        </div>

        {/* Tax Status Card */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              taxSubmitted ? 'bg-emerald-100' : stripeComplete ? 'bg-amber-100' : 'bg-gray-100'
            }`}>
              {taxSubmitted ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <FileText className={`h-5 w-5 ${stripeComplete ? 'text-amber-600' : 'text-gray-400'}`} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs">Tax Form (W-9/W-8BEN)</p>
              <p className={`text-lg font-semibold ${stripeComplete ? 'text-gray-900' : 'text-gray-400'}`}>
                {taxSubmitted ? 'Tax Info Submitted' : 'Submit Tax Info'}
              </p>
            </div>
            {taxSubmitted ? (
              <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                Complete
              </span>
            ) : stripeComplete ? (
              <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
                Required
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                Step 2
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        {!stripeComplete ? (
          <button
            onClick={handleStartOnboarding}
            disabled={onboardingMutation.isPending || isRedirecting}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold transition-all text-sm ${
              onboardingMutation.isPending || isRedirecting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5'
            }`}
          >
            {onboardingMutation.isPending || isRedirecting
              ? 'Redirecting to Stripe...'
              : hasStripeAccount
              ? 'Continue Stripe Setup'
              : 'Connect Stripe Account'}
          </button>
        ) : !taxSubmitted ? (
          <button
            onClick={() => setShowTaxModal(true)}
            className="w-full py-3.5 px-4 rounded-xl font-semibold transition-all text-sm bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5"
          >
            Submit Tax Information
          </button>
        ) : null}

        {/* Helper Text */}
        {!stripeComplete && (
          <p className="text-xs text-center text-gray-500">
            Connect your bank account to receive royalty payments
          </p>
        )}
        {stripeComplete && !taxSubmitted && (
          <p className="text-xs text-center text-gray-500">
            Required for 1099 reporting • Takes about 2 minutes
          </p>
        )}
      </div>

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
