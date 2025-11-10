import { useQuery } from '@tanstack/react-query';
import { payoutApi } from '../lib/api';
import { Clock, CheckCircle, XCircle, AlertCircle, Ban } from 'lucide-react';

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
}

export const WithdrawalHistory: React.FC = () => {
  const { data, isLoading } = useQuery<{ payouts: PayoutRequest[]; total: number }>({
    queryKey: ['payout-history'],
    queryFn: async () => {
      const response = await payoutApi.getHistory();
      return response.data;
    },
  });

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold";

    switch (status) {
      case 'COMPLETED':
        return (
          <span className={`${baseClasses} bg-green-500/20 text-green-300`}>
            <CheckCircle className="h-3.5 w-3.5" />
            Completed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className={`${baseClasses} bg-blue-500/20 text-blue-300`}>
            <Clock className="h-3.5 w-3.5" />
            Processing
          </span>
        );
      case 'APPROVED':
        return (
          <span className={`${baseClasses} bg-cyan-500/20 text-cyan-300`}>
            <CheckCircle className="h-3.5 w-3.5" />
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className={`${baseClasses} bg-yellow-500/20 text-yellow-300`}>
            <Clock className="h-3.5 w-3.5" />
            Pending Review
          </span>
        );
      case 'FAILED':
        return (
          <span className={`${baseClasses} bg-red-500/20 text-red-300`}>
            <XCircle className="h-3.5 w-3.5" />
            Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className={`${baseClasses} bg-gray-500/20 text-gray-300`}>
            <Ban className="h-3.5 w-3.5" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusDescription = (payout: PayoutRequest) => {
    if (payout.status === 'COMPLETED' && payout.completedAt) {
      return `Completed on ${formatDate(payout.completedAt)}`;
    }
    if (payout.status === 'PROCESSING') {
      return 'Payment is being processed by Stripe';
    }
    if (payout.status === 'APPROVED' && payout.approvedAt) {
      return `Approved on ${formatDate(payout.approvedAt)}`;
    }
    if (payout.status === 'PENDING') {
      return 'Awaiting admin approval';
    }
    if (payout.status === 'FAILED' && payout.failureReason) {
      return payout.failureReason;
    }
    if (payout.status === 'CANCELLED') {
      return 'This withdrawal request was cancelled';
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className="bg-slate-700/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Withdrawal History</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-700/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Withdrawal History</h3>
        {data && data.total > 0 && (
          <span className="text-sm text-gray-400">{data.total} request{data.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {!data || data.payouts.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-4">
            <Clock className="h-8 w-8 text-gray-500" />
          </div>
          <p className="text-gray-400">No withdrawal requests yet</p>
          <p className="text-sm text-gray-500 mt-1">Your withdrawal history will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.payouts.map((payout) => (
            <div
              key={payout.id}
              className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-lg font-semibold text-white">{formatCurrency(payout.amount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Requested {formatDate(payout.requestedAt)}
                  </p>
                </div>
                {getStatusBadge(payout.status)}
              </div>

              <p className="text-sm text-gray-400 mt-2">{getStatusDescription(payout)}</p>

              {/* Show additional details for certain statuses */}
              {payout.status === 'FAILED' && payout.failureReason && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-300 mb-1">Failure Reason</p>
                      <p className="text-xs text-red-200">{payout.failureReason}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
