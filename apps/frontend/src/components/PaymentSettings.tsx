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
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 border border-gray-200">
          <AlertCircle className="h-4 w-4" />
          Not Connected
        </span>
      );
    }

    if (status.onboardingComplete) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle className="h-4 w-4" />
          Active
        </span>
      );
    }

    if (status.detailsSubmitted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
          <Clock className="h-4 w-4" />
          Pending Review
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        <Clock className="h-4 w-4" />
        Setup Incomplete
      </span>
    );
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading payment settings...</div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-gray-900 font-semibold mb-2">Failed to Load Payment Settings</h4>
            <p className="text-gray-600 text-sm">
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Account</h3>
            <p className="text-sm text-gray-500">
              Connect your Stripe account to receive royalty payments
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {!status?.hasAccount ? (
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CreditCard className="h-12 w-12 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900 font-semibold mb-2">Connect Payment Account</h4>
                <p className="text-gray-500 text-sm mb-4">
                  To receive royalty payments, you need to connect your Stripe account.
                  Stripe is a secure payment platform used by millions of businesses worldwide.
                </p>
                <button
                  onClick={handleStartOnboarding}
                  disabled={isOnboarding}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  {isOnboarding ? 'Redirecting...' : 'Connect Stripe Account'}
                </button>
              </div>
            </div>
          </div>
        ) : status.onboardingComplete ? (
          <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-gray-900 font-semibold mb-2">Payment Account Connected</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Your Stripe account is active and ready to receive payments.
                  You'll be paid automatically when statements are processed.
                </p>
                <button
                  onClick={handleViewDashboard}
                  disabled={dashboardMutation.isPending}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 border border-gray-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  {dashboardMutation.isPending ? 'Loading...' : 'View Stripe Dashboard'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-gray-900 font-semibold mb-2">Complete Payment Setup</h4>
                <p className="text-gray-600 text-sm mb-4">
                  {status.detailsSubmitted
                    ? 'Your account is under review. This usually takes 1-2 business days.'
                    : 'Finish setting up your Stripe account to start receiving payments.'}
                </p>
                {!status.detailsSubmitted && (
                  <button
                    onClick={handleStartOnboarding}
                    disabled={isOnboarding}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Paid</span>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</div>
          <div className="text-sm text-gray-400 mt-1">{payments.length} payments</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Last Payment</span>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {payments.length > 0 ? formatCurrency(payments[0].netAmount) : '$0.00'}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {payments.length > 0 ? formatDate(payments[0].paidAt) : 'No payments yet'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Statements</span>
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
          <div className="text-sm text-gray-400 mt-1">Processed</div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>

        {historyLoading ? (
          <div className="text-center py-12 text-gray-500">Loading history...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600">No payments received yet</p>
            <p className="text-sm text-gray-400 mt-1">Payments will appear here once statements are processed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-gray-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-2">Statement</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-2">Type</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-2">Items</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-2">Gross</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-2">Commission</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-2">Net Paid</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.statementId}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-2 text-gray-900 font-medium">{payment.filename}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium border border-blue-200">
                        {payment.proType}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600">{payment.itemCount}</td>
                    <td className="py-3 px-2 text-right text-gray-600">{formatCurrency(payment.grossRevenue)}</td>
                    <td className="py-3 px-2 text-right text-gray-400">-{formatCurrency(payment.commissionAmount)}</td>
                    <td className="py-3 px-2 text-right text-emerald-600 font-semibold">{formatCurrency(payment.netAmount)}</td>
                    <td className="py-3 px-2 text-sm text-gray-400">{formatDate(payment.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={5} className="py-3 px-2 text-gray-900 font-bold text-sm">TOTAL</td>
                  <td className="py-3 px-2 text-right text-emerald-600 font-bold">
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
