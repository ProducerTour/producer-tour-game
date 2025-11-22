import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { paymentApi } from '../lib/api';
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';

interface PaymentStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  accountStatus: string | null;
  detailsSubmitted: boolean;
}

interface PaymentHistory {
  statementId: string;
  filename: string;
  proType: string;
  paymentStatus: string;
  paidAt: string;
  processedAt: string;
  grossRevenue: number;
  commissionAmount: number;
  netAmount: number;
  itemCount: number;
}

export const PaymentSettings: React.FC = () => {
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Fetch payment status
  const { data: status, isLoading: statusLoading, error: statusError } = useQuery<PaymentStatus>({
    queryKey: ['stripe-account-status'],
    queryFn: async () => {
      const response = await paymentApi.getStatus();
      return response.data;
    },
    retry: 1,
  });

  // Fetch payment history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['stripe-payment-history'],
    queryFn: async () => {
      const response = await paymentApi.getHistory();
      return response.data;
    },
    retry: 1,
  });

  // Create onboarding link mutation
  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const returnUrl = `${window.location.origin}/dashboard?payment_setup=success`;
      const refreshUrl = `${window.location.origin}/dashboard?payment_setup=refresh`;
      const response = await paymentApi.createOnboardingLink(returnUrl, refreshUrl);
      return response.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    },
    onError: (error: any) => {
      console.error('Error creating onboarding link:', error);
      toast.error(error.response?.data?.error || 'Failed to start onboarding process');
      setIsOnboarding(false);
    },
  });

  // Get dashboard link mutation
  const dashboardMutation = useMutation({
    mutationFn: async () => {
      const response = await paymentApi.getDashboardLink();
      return response.data;
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
    onError: (error: any) => {
      console.error('Error getting dashboard link:', error);
      toast.error(error.response?.data?.error || 'Failed to access dashboard');
    },
  });

  const handleStartOnboarding = () => {
    setIsOnboarding(true);
    onboardingMutation.mutate();
  };

  const handleViewDashboard = () => {
    dashboardMutation.mutate();
  };

  const formatCurrency = (value: number | null | undefined) => {
    const num = Number(value || 0);
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!status?.hasAccount) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-500/20 text-gray-300">
          <AlertCircle className="h-4 w-4" />
          Not Connected
        </span>
      );
    }

    if (status.onboardingComplete) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-500/20 text-green-300">
          <CheckCircle className="h-4 w-4" />
          Active
        </span>
      );
    }

    if (status.detailsSubmitted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-yellow-500/20 text-yellow-300">
          <Clock className="h-4 w-4" />
          Pending Review
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-yellow-500/20 text-yellow-300">
        <Clock className="h-4 w-4" />
        Setup Incomplete
      </span>
    );
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading payment settings...</div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-white font-semibold mb-2">Failed to Load Payment Settings</h4>
            <p className="text-gray-300 text-sm">
              {(statusError as any)?.response?.data?.error || 'Unable to fetch payment status. Please try refreshing the page.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const payments = (historyData?.payments || []) as PaymentHistory[];
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.netAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Payment Account Status */}
      <div className="bg-slate-700/30 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Payment Account</h3>
            <p className="text-sm text-gray-400">
              Connect your Stripe account to receive royalty payments
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {!status?.hasAccount ? (
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-600">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CreditCard className="h-12 w-12 text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Connect Payment Account</h4>
                <p className="text-gray-400 text-sm mb-4">
                  To receive royalty payments, you need to connect your Stripe account.
                  Stripe is a secure payment platform used by millions of businesses worldwide.
                </p>
                <button
                  onClick={handleStartOnboarding}
                  disabled={isOnboarding}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ExternalLink className="h-4 w-4" />
                  {isOnboarding ? 'Redirecting...' : 'Connect Stripe Account'}
                </button>
              </div>
            </div>
          </div>
        ) : status.onboardingComplete ? (
          <div className="bg-green-500/10 rounded-lg p-6 border border-green-500/30">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Payment Account Connected</h4>
                <p className="text-gray-300 text-sm mb-4">
                  Your Stripe account is active and ready to receive payments.
                  You'll be paid automatically when statements are processed.
                </p>
                <button
                  onClick={handleViewDashboard}
                  disabled={dashboardMutation.isPending}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  {dashboardMutation.isPending ? 'Loading...' : 'View Stripe Dashboard'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/10 rounded-lg p-6 border border-yellow-500/30">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Complete Payment Setup</h4>
                <p className="text-gray-300 text-sm mb-4">
                  {status.detailsSubmitted
                    ? 'Your account is under review. This usually takes 1-2 business days.'
                    : 'Finish setting up your Stripe account to start receiving payments.'}
                </p>
                {!status.detailsSubmitted && (
                  <button
                    onClick={handleStartOnboarding}
                    disabled={isOnboarding}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {isOnboarding ? 'Redirecting...' : 'Continue Setup'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Paid</span>
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalPaid)}</div>
          <div className="text-sm text-gray-400 mt-1">{payments.length} payments</div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Last Payment</span>
            <Clock className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {payments.length > 0 ? formatCurrency(payments[0].netAmount) : '$0.00'}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {payments.length > 0 ? formatDate(payments[0].paidAt) : 'No payments yet'}
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Statements</span>
            <CheckCircle className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{payments.length}</div>
          <div className="text-sm text-gray-400 mt-1">Processed</div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-slate-700/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payment History</h3>

        {historyLoading ? (
          <div className="text-center py-12 text-gray-400">Loading history...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-500" />
            <p>No payments received yet</p>
            <p className="text-sm mt-1">Payments will appear here once statements are processed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-slate-600">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Statement</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Type</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Items</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Gross</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Commission</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Net Paid</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.statementId}
                    className="border-b border-slate-700/50 hover:bg-slate-600/20 transition-colors"
                  >
                    <td className="py-3 px-2 text-white font-medium">{payment.filename}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                        {payment.proType}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-300">{payment.itemCount}</td>
                    <td className="py-3 px-2 text-right text-gray-300">{formatCurrency(payment.grossRevenue)}</td>
                    <td className="py-3 px-2 text-right text-gray-400">-{formatCurrency(payment.commissionAmount)}</td>
                    <td className="py-3 px-2 text-right text-green-400 font-semibold">{formatCurrency(payment.netAmount)}</td>
                    <td className="py-3 px-2 text-sm text-gray-400">{formatDate(payment.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-600 bg-slate-700/20">
                <tr>
                  <td colSpan={5} className="py-3 px-2 text-white font-bold text-sm">TOTAL</td>
                  <td className="py-3 px-2 text-right text-green-400 font-bold">
                    {formatCurrency(totalPaid)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSettings;
