import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statementApi } from '../lib/api';
import { DollarSign, Download, Send, CheckCircle, Clock, XCircle, Filter } from 'lucide-react';

interface Statement {
  id: string;
  filename: string;
  proType: string;
  uploadedAt: string;
  totalRevenue: number;
  totalNet: number;
  itemCount: number;
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID';
  paymentProcessedAt?: string;
  writerBreakdown?: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    revenue: number;
    itemCount: number;
  }>;
}

export const PayoutsTab: React.FC = () => {
  const [selectedStatements, setSelectedStatements] = useState<Set<string>>(new Set());
  const [historyFilter, setHistoryFilter] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch all statements for payment processing
  const { data: statements, isLoading } = useQuery({
    queryKey: ['admin-statements'],
    queryFn: async () => {
      const response = await statementApi.getStatements();
      return response.data as Statement[];
    },
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (statementId: string) => {
      return await statementApi.processPayment(statementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-statements'] });
      setSelectedStatements(new Set());
    },
  });

  // Payment queue (unpaid statements)
  const paymentQueue = statements?.filter(s => s.paymentStatus === 'UNPAID') || [];

  // Payment history (paid statements)
  const paymentHistory = statements?.filter(s => s.paymentStatus === 'PAID').filter(s => {
    if (!historyFilter) return true;
    return s.filename.toLowerCase().includes(historyFilter.toLowerCase()) ||
           s.proType.toLowerCase().includes(historyFilter.toLowerCase());
  }) || [];

  // Pending statements
  const pendingStatements = statements?.filter(s => s.paymentStatus === 'PENDING') || [];

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading payment data...</div>
      </div>
    );
  }

  const totalUnpaidRevenue = paymentQueue.reduce((sum, s) => sum + s.totalNet, 0);
  const totalPaidRevenue = paymentHistory.reduce((sum, s) => sum + s.totalNet, 0);

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
                const stmt = statements?.find(s => s.id === id);
                return sum + (stmt?.totalNet || 0);
              }, 0)
            )}
          </div>
        </div>
      </div>

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
                      <button
                        onClick={() => handleProcessPayment(statement.id)}
                        disabled={processPaymentMutation.isPending}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Process
                      </button>
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
                    {paymentHistory.reduce((sum, s) => sum + s.itemCount, 0).toLocaleString()}
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

      {/* Export Section */}
      <div className="bg-slate-700/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Export & Reconciliation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
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
    </div>
  );
};

export default PayoutsTab;
