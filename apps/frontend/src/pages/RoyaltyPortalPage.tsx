import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { statementApi } from '../lib/api';

interface UnpaidStatement {
  id: string;
  proType: string;
  filename: string;
  publishedAt: string;
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID';
  totalRevenue: number;
  totalCommission: number;
  totalNet: number;
  writerCount: number;
  writers: Writer[];
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

export default function RoyaltyPortalPage() {
  const navigate = useNavigate();
  const [unpaidStatements, setUnpaidStatements] = useState<UnpaidStatement[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<string | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedStatementIds, setSelectedStatementIds] = useState<Set<string>>(new Set());

  // Load unpaid statements on mount
  useEffect(() => {
    loadUnpaidStatements();
  }, []);

  const loadUnpaidStatements = async () => {
    try {
      setLoading(true);
      console.log('🔍 Frontend: Fetching unpaid statements...');
      const response = await statementApi.getUnpaidStatements();
      console.log('✅ Frontend: Received unpaid statements:', {
        count: response.data.length,
        statements: response.data
      });
      setUnpaidStatements(response.data);
    } catch (error) {
      console.error('❌ Frontend: Failed to load unpaid statements:', error);
      alert('Failed to load unpaid statements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSummary = async (statementId: string) => {
    try {
      setLoading(true);
      const response = await statementApi.getPaymentSummary(statementId);
      setPaymentSummary(response.data);
      setSelectedStatement(statementId);
      setShowModal(true);
    } catch (error) {
      console.error('Failed to load payment summary:', error);
      alert('Failed to load payment summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQueuePayment = async (statementId: string) => {
    if (!confirm('Queue this statement for payment? Writers will see their earnings as "pending payment" until you process the actual payment from the Payouts tab.')) {
      return;
    }

    try {
      setLoading(true);
      await statementApi.queuePayment(statementId);

      // Refresh lists
      await loadUnpaidStatements();
      setShowModal(false);
      setSelectedStatement(null);
      setPaymentSummary(null);

      alert('✅ Statement queued for payment! Writers can now see their pending earnings. Process actual payment from the Payouts tab.');
    } catch (error) {
      console.error('Failed to queue payment:', error);
      alert('❌ Failed to queue payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkQueuePayment = async () => {
    if (selectedStatementIds.size === 0) {
      alert('Please select at least one statement to queue.');
      return;
    }

    const count = selectedStatementIds.size;
    if (!confirm(`Queue ${count} statement${count > 1 ? 's' : ''} for payment? Writers will see their earnings as "pending payment" until you process from the Payouts tab.`)) {
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const statementId of selectedStatementIds) {
        try {
          await statementApi.queuePayment(statementId);
          successCount++;
        } catch (error) {
          console.error(`Failed to queue statement ${statementId}:`, error);
          failCount++;
        }
      }

      // Refresh lists
      await loadUnpaidStatements();
      setSelectedStatementIds(new Set());

      if (failCount === 0) {
        alert(`✅ Successfully queued ${successCount} statement${successCount > 1 ? 's' : ''}! Process payments from the Payouts tab.`);
      } else {
        alert(`⚠️ Queued ${successCount} statement${successCount > 1 ? 's' : ''}. ${failCount} failed. Please try again for failed statements.`);
      }
    } catch (error) {
      console.error('Bulk queue error:', error);
      alert('❌ Failed to queue payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatementSelection = (statementId: string) => {
    const newSelected = new Set(selectedStatementIds);
    if (newSelected.has(statementId)) {
      newSelected.delete(statementId);
    } else {
      newSelected.add(statementId);
    }
    setSelectedStatementIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedStatementIds.size === unpaidStatements.length) {
      setSelectedStatementIds(new Set());
    } else {
      setSelectedStatementIds(new Set(unpaidStatements.map(s => s.id)));
    }
  };

  const formatCurrency = (amount: number) => {
    // Smart rounding: 2 decimals normally, 4 decimals for micro-amounts
    const rounded2 = Math.round(amount * 100) / 100;
    if (rounded2 === 0 && amount > 0) {
      // Micro-amount: use 4 decimals
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }).format(amount);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Royalty Portal - Payment Processing
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Queue payments for published statements
              </p>
            </div>
            <div>
              <button
                onClick={() => statementApi.exportUnpaidSummary()}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                title="Export summary of all unpaid statements"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All Unpaid
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Unpaid Statements Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Statements Ready for Payment
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {unpaidStatements.length} statement(s) pending payment
                  {selectedStatementIds.size > 0 && ` • ${selectedStatementIds.size} selected`}
                </p>
              </div>
              {selectedStatementIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedStatementIds(new Set())}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={handleBulkQueuePayment}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Queue {selectedStatementIds.size} for Payment
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {loading && unpaidStatements.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading statements...</p>
              </div>
            ) : unpaidStatements.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No unpaid statements
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  All statements have been processed.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={unpaidStatements.length > 0 && selectedStatementIds.size === unpaidStatements.length}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                          title="Select all"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        PRO / File
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Published
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Writers
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Net to Writers
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {unpaidStatements.map((statement) => (
                      <tr key={statement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedStatementIds.has(statement.id)}
                            onChange={() => toggleStatementSelection(statement.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {statement.proType}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {statement.filename}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(statement.publishedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statement.paymentStatus === 'UNPAID'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : statement.paymentStatus === 'PENDING'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {statement.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {statement.writerCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(statement.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(statement.totalCommission)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(statement.totalNet)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => loadPaymentSummary(statement.id)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                            disabled={loading}
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleQueuePayment(statement.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            disabled={loading}
                          >
                            Queue for Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Summary Modal */}
      {showModal && paymentSummary && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Payment Summary
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {paymentSummary.statement.proType} - {paymentSummary.statement.filename}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setPaymentSummary(null);
                    setSelectedStatement(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Totals Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Gross Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(paymentSummary.totals.grossRevenue)}
                  </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">Commission to Producer Tour</p>
                  <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-300 mt-1">
                    {formatCurrency(paymentSummary.totals.commissionToProducerTour)}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">Net to Writers</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">
                    {formatCurrency(paymentSummary.totals.netToWriters)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Song Count</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {paymentSummary.totals.songCount}
                  </p>
                </div>
              </div>

              {/* Writer Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Writer Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Writer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Songs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Gross Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Commission
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Net Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {paymentSummary.writers.map((writer) => (
                        <tr key={writer.userId}>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {writer.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {writer.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {writer.songCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatCurrency(writer.grossRevenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(writer.commissionAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(writer.netRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              {/* Export Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => selectedStatement && statementApi.exportCSV(selectedStatement)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                  title="Download CSV for accounting"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={() => selectedStatement && statementApi.exportQuickBooks(selectedStatement)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                  title="Download QuickBooks format"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  QuickBooks
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setPaymentSummary(null);
                    setSelectedStatement(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Close
                </button>
                <button
                  onClick={() => selectedStatement && handleQueuePayment(selectedStatement)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Queuing...' : 'Queue Payment for Writers'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
