import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { statementApi, payoutApi } from '../lib/api';
import { DollarSign, Download, Send, CheckCircle, Clock, XCircle, Filter, Wallet, User, RefreshCw, AlertTriangle, Eye, X, Users } from 'lucide-react';

// Error boundary to catch rendering errors
interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class PayoutsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PayoutsTab Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <div className="text-red-400 text-lg font-semibold">Something went wrong</div>
          <p className="text-gray-400 text-sm text-center max-w-md">
            {this.state.error?.message || 'An error occurred while loading the payouts tab'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              this.props.onReset?.();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface Statement {
  id: string;
  filename: string;
  proType: string;
  uploadedAt: string;
  totalRevenue: number;
  totalNet: number;
  totalCommission?: number;
  itemCount: number;
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID';
  paymentProcessedAt?: string;
  writerCount?: number;
  writerBreakdown?: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    revenue: number;
    itemCount: number;
  }>;
}

interface Writer {
  userId: string;
  name: string;
  email: string;
  grossRevenue: number;
  commissionAmount: number;
  netRevenue: number;
  songCount: number;
}

interface PaymentSummary {
  statement: {
    id: string;
    proType: string;
    filename: string;
    publishedAt: string;
    paymentStatus: string;
  };
  totals: {
    grossRevenue: number;
    commissionToProducerTour: number;
    netToWriters: number;
    songCount: number;
  };
  writers: Writer[];
}

const PayoutsTab: React.FC = () => {
  const [selectedStatements, setSelectedStatements] = useState<Set<string>>(new Set());
  const [historyFilter, setHistoryFilter] = useState<string>('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [selectedStatementForDetails, setSelectedStatementForDetails] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch all statements for payment processing
  const { data: statements, isLoading, error: statementsError, refetch } = useQuery({
    queryKey: ['admin-statements'],
    queryFn: async () => {
      const response = await statementApi.getStatements();
      return (response.data.statements || []) as Statement[];
    },
    retry: 2,
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (statementId: string) => {
      return await statementApi.processPayment(statementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-statements'] });
      setSelectedStatements(new Set());
      toast.success('Payment processed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process payment');
    },
  });

  // Fetch pending withdrawal requests
  const { data: withdrawalRequests } = useQuery({
    queryKey: ['pending-withdrawals'],
    queryFn: async () => {
      try {
        const response = await payoutApi.getPending();
        return response.data.payouts;
      } catch (error) {
        console.error('Failed to fetch withdrawal requests:', error);
        return [];
      }
    },
  });

  // Fetch all payout requests for history
  const { data: allPayoutsData } = useQuery({
    queryKey: ['all-payouts'],
    queryFn: async () => {
      try {
        const response = await payoutApi.getAll();
        return response.data;
      } catch (error) {
        console.error('Failed to fetch payout history:', error);
        return { payouts: [], total: 0 };
      }
    },
  });

  // Approve withdrawal mutation
  const approveWithdrawalMutation = useMutation({
    mutationFn: async ({ payoutId, notes }: { payoutId: string; notes?: string }) => {
      return await payoutApi.approvePayout(payoutId, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
      toast.success('Withdrawal approved!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve withdrawal');
    },
  });

  // Cancel withdrawal mutation
  const cancelWithdrawalMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      return await payoutApi.cancelPayout(payoutId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
      toast.success('Withdrawal cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel withdrawal');
    },
  });

  // Load payment summary for a statement (writer breakdown)
  const loadPaymentSummary = async (statementId: string) => {
    try {
      setDetailsLoading(true);
      const response = await statementApi.getPaymentSummary(statementId);
      setPaymentSummary(response.data);
      setSelectedStatementForDetails(statementId);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to load payment summary:', error);
      toast.error('Failed to load payment details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setPaymentSummary(null);
    setSelectedStatementForDetails(null);
  };

  // Ensure statements is always an array
  const safeStatements = Array.isArray(statements) ? statements : [];

  // Payment queue (unpaid statements)
  const paymentQueue = safeStatements.filter(s => s.paymentStatus === 'UNPAID');

  // Payment history (paid statements)
  const paymentHistory = safeStatements.filter(s => s.paymentStatus === 'PAID').filter(s => {
    if (!historyFilter) return true;
    return s.filename.toLowerCase().includes(historyFilter.toLowerCase()) ||
           s.proType.toLowerCase().includes(historyFilter.toLowerCase());
  });

  // Pending statements
  const pendingStatements = safeStatements.filter(s => s.paymentStatus === 'PENDING');

  const handleSelectStatement = (id: string) => {
    const newSelected = new Set(selectedStatements);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStatements(newSelected);
  };

  const handleSelectAll = (statementIds: string[]) => {
    if (selectedStatements.size === statementIds.length) {
      setSelectedStatements(new Set());
    } else {
      setSelectedStatements(new Set(statementIds));
    }
  };

  const handleProcessPayment = async (statementId: string) => {
    if (window.confirm('Process payment for this statement? This will make items visible to writers and send email notifications.')) {
      await processPaymentMutation.mutateAsync(statementId);
    }
  };

  const handleBulkProcessPayments = async () => {
    if (selectedStatements.size === 0) return;

    if (window.confirm(`Process payments for ${selectedStatements.size} statement(s)? This will make items visible to writers and send email notifications.`)) {
      for (const id of Array.from(selectedStatements)) {
        await processPaymentMutation.mutateAsync(id);
      }
    }
  };

  const handleApproveWithdrawal = async (payoutId: string, writerName: string, amount: number) => {
    if (window.confirm(`Approve withdrawal of ${formatCurrency(amount)} for ${writerName}?`)) {
      try {
        await approveWithdrawalMutation.mutateAsync({ payoutId });
        alert('Withdrawal approved successfully!');
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to approve withdrawal');
      }
    }
  };

  const handleCancelWithdrawal = async (payoutId: string, writerName: string) => {
    const reason = window.prompt(`Cancel withdrawal request for ${writerName}?\n\nOptional reason:`);
    if (reason !== null) {
      try {
        await cancelWithdrawalMutation.mutateAsync(payoutId);
        alert('Withdrawal request cancelled.');
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to cancel withdrawal');
      }
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2.5 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'PAID':
        return <span className={`${baseClasses} bg-green-500/20 text-green-300`}>Paid</span>;
      case 'PENDING':
        return <span className={`${baseClasses} bg-yellow-500/20 text-yellow-300`}>Pending</span>;
      case 'UNPAID':
        return <span className={`${baseClasses} bg-red-500/20 text-red-300`}>Unpaid</span>;
      default:
        return null;
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    const baseClasses = "px-2.5 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'COMPLETED':
        return <span className={`${baseClasses} bg-green-500/20 text-green-300`}>Completed</span>;
      case 'PROCESSING':
        return <span className={`${baseClasses} bg-blue-500/20 text-blue-300`}>Processing</span>;
      case 'APPROVED':
        return <span className={`${baseClasses} bg-cyan-500/20 text-cyan-300`}>Approved</span>;
      case 'PENDING':
        return <span className={`${baseClasses} bg-yellow-500/20 text-yellow-300`}>Pending</span>;
      case 'FAILED':
        return <span className={`${baseClasses} bg-red-500/20 text-red-300`}>Failed</span>;
      case 'CANCELLED':
        return <span className={`${baseClasses} bg-gray-500/20 text-gray-300`}>Cancelled</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading payment data...</div>
      </div>
    );
  }

  if (statementsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <div className="text-red-400 text-lg font-semibold">Failed to load payment data</div>
        <p className="text-gray-400 text-sm">
          {(statementsError as any)?.response?.data?.error || 'An error occurred while fetching statements'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  const totalUnpaidRevenue = paymentQueue.reduce((sum, s) => sum + Number(s.totalNet || 0), 0);
  const totalPaidRevenue = paymentHistory.reduce((sum, s) => sum + Number(s.totalNet || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Unpaid Queue</span>
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">{paymentQueue.length}</div>
          <div className="text-sm text-gray-400 mt-1">{formatCurrency(totalUnpaidRevenue)}</div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Pending</span>
            <Clock className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingStatements.length}</div>
          <div className="text-sm text-gray-400 mt-1">In Processing</div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Paid (All Time)</span>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">{paymentHistory.length}</div>
          <div className="text-sm text-green-400 mt-1">{formatCurrency(totalPaidRevenue)}</div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Selected</span>
            <DollarSign className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{selectedStatements.size}</div>
          <div className="text-sm text-gray-400 mt-1">
            {formatCurrency(
              Array.from(selectedStatements).reduce((sum, id) => {
                const stmt = safeStatements.find(s => s.id === id);
                return sum + Number(stmt?.totalNet || 0);
              }, 0)
            )}
          </div>
        </div>
      </div>

      {/* Withdrawal Requests Section */}
      {Array.isArray(withdrawalRequests) && withdrawalRequests.length > 0 && (
        <div className="bg-slate-800 rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">Withdrawal Requests</h2>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-sm font-semibold">
                {withdrawalRequests.length} Pending
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {withdrawalRequests.map((request: any) => (
              <div
                key={request.id}
                className="bg-slate-700/30 rounded-lg p-5 border border-slate-600 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">{request.user.name}</h3>
                        <p className="text-sm text-gray-400">{request.user.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Requested Amount</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(request.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Requested</p>
                        <p className="text-sm text-gray-300">{formatDate(request.requestedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Stripe Status</p>
                        <div className="flex items-center gap-2">
                          {request.user.stripeConnected ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-semibold">
                              Connected
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs font-semibold">
                              Not Connected
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Status</p>
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-xs font-semibold">
                          {request.status}
                        </span>
                      </div>
                    </div>

                    {request.adminNotes && (
                      <div className="mt-3 p-3 bg-slate-900/50 rounded">
                        <p className="text-xs text-gray-400 mb-1">Admin Notes</p>
                        <p className="text-sm text-gray-300">{request.adminNotes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleApproveWithdrawal(request.id, request.user.name, request.amount)}
                      disabled={!request.user.stripeOnboardingComplete || approveWithdrawalMutation.isPending}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleCancelWithdrawal(request.id, request.user.name)}
                      disabled={cancelWithdrawalMutation.isPending}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>

                {!request.user.stripeOnboardingComplete && (
                  <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                    <p className="text-sm text-red-200">
                      ⚠️ Writer has not completed Stripe Connect onboarding. Cannot approve withdrawal.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Queue Section */}
      <div className="bg-slate-700/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Payment Queue</h3>
            <p className="text-sm text-gray-400 mt-1">
              Statements ready for payment processing
            </p>
          </div>
          <div className="flex gap-2">
            {selectedStatements.size > 0 && (
              <>
                <button
                  onClick={handleBulkProcessPayments}
                  disabled={processPaymentMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  Process {selectedStatements.size} Selected
                </button>
                <button
                  onClick={() => setSelectedStatements(new Set())}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  Clear Selection
                </button>
              </>
            )}
          </div>
        </div>

        {paymentQueue.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-500" />
            <p>No unpaid statements in queue</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-slate-600">
                <tr>
                  <th className="text-left py-3 px-2">
                    <input
                      type="checkbox"
                      checked={selectedStatements.size === paymentQueue.length && paymentQueue.length > 0}
                      onChange={() => handleSelectAll(paymentQueue.map(s => s.id))}
                      className="rounded border-gray-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Statement</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Type</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Items</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Gross Revenue</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Net Payout</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Uploaded</th>
                  <th className="text-center text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentQueue.map(statement => (
                  <tr
                    key={statement.id}
                    className="border-b border-slate-700/50 hover:bg-slate-600/20 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <input
                        type="checkbox"
                        checked={selectedStatements.has(statement.id)}
                        onChange={() => handleSelectStatement(statement.id)}
                        className="rounded border-gray-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-2 text-white font-medium">{statement.filename}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                        {statement.proType}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-300">{statement.itemCount.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-gray-300">{formatCurrency(statement.totalRevenue)}</td>
                    <td className="py-3 px-2 text-right text-green-400 font-semibold">{formatCurrency(statement.totalNet)}</td>
                    <td className="py-3 px-2 text-sm text-gray-400">{formatDate(statement.uploadedAt)}</td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => loadPaymentSummary(statement.id)}
                          disabled={detailsLoading}
                          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                          title="View writer breakdown"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </button>
                        <button
                          onClick={() => handleProcessPayment(statement.id)}
                          disabled={processPaymentMutation.isPending}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Process
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History Section */}
      <div className="bg-slate-700/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Payment History</h3>
            <p className="text-sm text-gray-400 mt-1">
              All processed payments
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search statements..."
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {paymentHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-500" />
            <p>No payment history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-slate-600">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Statement</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Type</th>
                  <th className="text-center text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Items</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Net Paid</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Processed Date</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map(statement => (
                  <tr
                    key={statement.id}
                    className="border-b border-slate-700/50 hover:bg-slate-600/20 transition-colors"
                  >
                    <td className="py-3 px-2 text-white font-medium">{statement.filename}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                        {statement.proType}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {getStatusBadge(statement.paymentStatus)}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-300">{statement.itemCount.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-green-400 font-semibold">{formatCurrency(statement.totalNet)}</td>
                    <td className="py-3 px-2 text-sm text-gray-400">
                      {statement.paymentProcessedAt ? formatDate(statement.paymentProcessedAt) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-600 bg-slate-700/20">
                <tr>
                  <td colSpan={3} className="py-3 px-2 text-white font-bold text-sm">TOTAL PAID</td>
                  <td className="py-3 px-2 text-right text-white font-bold">
                    {paymentHistory.reduce((sum, s) => sum + Number(s.itemCount || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right text-green-400 font-bold">
                    {formatCurrency(totalPaidRevenue)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Payout History Section */}
      <div className="bg-slate-700/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Payout History</h3>
            <p className="text-sm text-gray-400 mt-1">
              All processed withdrawal requests
            </p>
          </div>
        </div>

        {!allPayoutsData || !allPayoutsData.payouts || allPayoutsData.payouts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-500" />
            <p>No payout history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-slate-600">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Writer</th>
                  <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Amount</th>
                  <th className="text-center text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Requested</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Completed</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Stripe Transfer</th>
                  <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {allPayoutsData.payouts.map((payout: any) => (
                  <tr
                    key={payout.id}
                    className="border-b border-slate-700/50 hover:bg-slate-600/20 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div>
                        <p className="text-white font-medium">{payout.user.name}</p>
                        <p className="text-xs text-gray-400">{payout.user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-green-400 font-semibold">{formatCurrency(payout.amount)}</td>
                    <td className="py-3 px-2 text-center">
                      {getPayoutStatusBadge(payout.status)}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-400">
                      {formatDate(payout.requestedAt)}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-400">
                      {payout.completedAt ? formatDate(payout.completedAt) : '-'}
                    </td>
                    <td className="py-3 px-2">
                      {payout.stripeTransferId ? (
                        <code className="text-xs text-blue-300 bg-slate-900/50 px-2 py-1 rounded">
                          {payout.stripeTransferId}
                        </code>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {payout.failureReason ? (
                        <span className="text-xs text-red-300">{payout.failureReason}</span>
                      ) : payout.adminNotes ? (
                        <span className="text-xs text-gray-400">{payout.adminNotes}</span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-slate-700/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Export & Reconciliation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => statementApi.exportUnpaidSummary()}
            className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Payment Queue (CSV)
          </button>
          <button className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
            <Download className="h-4 w-4" />
            Export Payment History (CSV)
          </button>
          <button className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
            <Download className="h-4 w-4" />
            QuickBooks Format
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-3">
          Export payment data for accounting, reconciliation, or manual processing in external systems.
        </p>
      </div>

      {/* Writer Breakdown Modal */}
      {showDetailsModal && paymentSummary && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  Payment Details
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {paymentSummary.statement.proType} - {paymentSummary.statement.filename}
                </p>
              </div>
              <button
                onClick={closeDetailsModal}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Totals Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Gross Revenue</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {formatCurrency(paymentSummary.totals.grossRevenue)}
                  </p>
                </div>
                <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700/30">
                  <p className="text-sm text-blue-400">Commission</p>
                  <p className="text-xl font-bold text-blue-300 mt-1">
                    {formatCurrency(paymentSummary.totals.commissionToProducerTour)}
                  </p>
                </div>
                <div className="bg-green-900/30 p-4 rounded-lg border border-green-700/30">
                  <p className="text-sm text-green-400">Net to Writers</p>
                  <p className="text-xl font-bold text-green-300 mt-1">
                    {formatCurrency(paymentSummary.totals.netToWriters)}
                  </p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Songs</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {paymentSummary.totals.songCount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Writer Breakdown Table */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  Writer Breakdown ({paymentSummary.writers.length} writers)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b-2 border-slate-600">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Writer</th>
                        <th className="text-center text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Songs</th>
                        <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Gross Revenue</th>
                        <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Commission</th>
                        <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Net Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentSummary.writers.map((writer) => (
                        <tr key={writer.userId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 px-2">
                            <div>
                              <p className="text-white font-medium">{writer.name}</p>
                              <p className="text-xs text-gray-400">{writer.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center text-gray-300">{writer.songCount}</td>
                          <td className="py-3 px-2 text-right text-gray-300">{formatCurrency(writer.grossRevenue)}</td>
                          <td className="py-3 px-2 text-right text-blue-400">{formatCurrency(writer.commissionAmount)}</td>
                          <td className="py-3 px-2 text-right text-green-400 font-semibold">{formatCurrency(writer.netRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => selectedStatementForDetails && statementApi.exportCSV(selectedStatementForDetails)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => selectedStatementForDetails && statementApi.exportQuickBooks(selectedStatementForDetails)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  QuickBooks
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeDetailsModal}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (selectedStatementForDetails) {
                      handleProcessPayment(selectedStatementForDetails);
                      closeDetailsModal();
                    }
                  }}
                  disabled={processPaymentMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Process Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapped component with error boundary
const PayoutsTabWithErrorBoundary: React.FC = () => {
  const queryClient = useQueryClient();

  const handleReset = () => {
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['admin-statements'] });
    queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] });
    queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
  };

  return (
    <PayoutsErrorBoundary onReset={handleReset}>
      <PayoutsTab />
    </PayoutsErrorBoundary>
  );
};

export { PayoutsTab };
export default PayoutsTabWithErrorBoundary;
