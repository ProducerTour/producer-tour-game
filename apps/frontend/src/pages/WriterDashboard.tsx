import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, statementApi, documentApi, userApi, payoutApi } from '../lib/api';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { ChartCard } from '../components/ChartCard';
import { TerritoryHeatmap } from '../components/TerritoryHeatmap';
import { PaymentSettings } from '../components/PaymentSettings';
import { WalletCard } from '../components/WalletCard';
import { WithdrawalHistory } from '../components/WithdrawalHistory';
import ToolsHub from '../components/ToolsHub';
import { useAuthStore } from '../store/auth.store';
import { formatIpiDisplay } from '../utils/ipi-helper';
import { X } from 'lucide-react';

const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#a855f7', // Violet
  '#f43f5e', // Rose
  '#14b8a6', // Teal
];

// Smart pie chart label configuration based on item count
const getSmartPieLabel = (itemCount: number) => {
  if (itemCount <= 3) {
    // 1-3 items: Full labels with name, amount, and percentage
    return (props: any) => {
      const { name, percent, value, revenue } = props;
      const amount = Number(revenue || value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      return `${name} - $${amount} (${(percent * 100).toFixed(0)}%)`;
    };
  } else if (itemCount <= 6) {
    // 4-6 items: Compact labels (percentage only)
    return (props: any) => {
      const { name, percent } = props;
      return `${name} ${(percent * 100).toFixed(0)}%`;
    };
  } else {
    // 7+ items: No labels (legend only to avoid overlap)
    return false;
  }
};

// Smart currency formatter for charts: 2 decimals normally, 4 decimals for micro-amounts
const formatChartCurrency = (value: any): string => {
  const num = Number(value);
  const rounded2 = Math.round(num * 100) / 100;
  if (rounded2 === 0 && num > 0) {
    return `$${(Math.round(num * 10000) / 10000).toFixed(4)}`;
  }
  return `$${rounded2.toFixed(2)}`;
};

export default function WriterDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'songs' | 'statements' | 'documents' | 'payments' | 'profile' | 'tools' | 'claims'>('overview');
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const queryClient = useQueryClient();

  const toggleChartExpansion = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  const writerTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'songs', label: 'My Songs', icon: '🎵' },
    { id: 'statements', label: 'Statements', icon: '📄' },
    { id: 'documents', label: 'Documents', icon: '📁' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'claims', label: 'Claims', icon: '✅' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'tools', label: 'Tools Hub', icon: '🛠️' },
  ];

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return response.data;
    },
  });

  const { data: timelineData } = useQuery({
    queryKey: ['dashboard-timeline'],
    queryFn: async () => {
      const response = await dashboardApi.getTimeline();
      return response.data;
    },
    enabled: activeTab === 'overview',
  });

  const { data: territoryData } = useQuery({
    queryKey: ['territory-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getTerritoryBreakdown();
      return response.data;
    },
    enabled: activeTab === 'overview',
  });

  const { data: statementsData, isLoading: statementsLoading } = useQuery({
    queryKey: ['user-statements'],
    queryFn: async () => {
      const response = await statementApi.getStatements();
      return response.data;
    },
    enabled: activeTab === 'statements' || activeTab === 'overview',
  });

  const { data: songsData } = useQuery({
    queryKey: ['dashboard-songs'],
    queryFn: async () => {
      const response = await dashboardApi.getSongs({ limit: 10 });
      return response.data;
    },
    enabled: activeTab === 'songs',
  });

  // Wallet balance query
  const { data: walletBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      const response = await payoutApi.getBalance();
      return response.data;
    },
    enabled: activeTab === 'overview',
  });

  // Withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: (amount: number) => payoutApi.requestPayout(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawError('');
      alert('Withdrawal request submitted successfully! Awaiting admin approval.');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to request withdrawal';
      setWithdrawError(errorMessage);
    },
  });

  const handleWithdrawClick = () => {
    const minimumAmount = walletBalance?.minimumWithdrawalAmount || 50;
    if (walletBalance && walletBalance.availableBalance >= minimumAmount) {
      setWithdrawAmount(walletBalance.availableBalance.toString());
      setShowWithdrawModal(true);
      setWithdrawError('');
    }
  };

  const handleWithdrawSubmit = () => {
    const amount = parseFloat(withdrawAmount);
    const minimumAmount = walletBalance?.minimumWithdrawalAmount || 50;
    if (isNaN(amount) || amount < minimumAmount) {
      setWithdrawError(`Minimum withdrawal amount is $${minimumAmount.toFixed(2)}`);
      return;
    }
    if (walletBalance && amount > walletBalance.availableBalance) {
      setWithdrawError(`Amount exceeds available balance ($${walletBalance.availableBalance.toFixed(2)})`);
      return;
    }
    withdrawMutation.mutate(amount);
  };

  const { data: paymentStatus, isLoading: paymentStatusLoading, error: paymentStatusError } = useQuery({
    queryKey: ['payment-status'],
    queryFn: async () => {
      const response = await dashboardApi.getPaymentStatus();
      console.log('Payment Status Response:', response.data);
      return response.data;
    },
    retry: 3,
    staleTime: 30000, // 30 seconds
  });

  // Calculate PRO breakdown for pie chart
  const getProBreakdown = () => {
    if (!statementsData?.statements) return [];
    const proTotals: Record<string, number> = {};
    statementsData.statements.forEach((statement: any) => {
      const revenue = Number(statement.totalRevenue);
      proTotals[statement.proType] = (proTotals[statement.proType] || 0) + revenue;
    });
    return Object.entries(proTotals).map(([name, value]) => ({ name, value }));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'overview' | 'songs' | 'statements' | 'documents' | 'payments' | 'profile' | 'tools' | 'claims')}
          tabs={writerTabs}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Payment Status Indicator */}
        {paymentStatusLoading ? (
          <div className="mb-6 bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-400">Loading payment status...</p>
            </div>
          </div>
        ) : paymentStatusError ? (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-400">Failed to load payment status</p>
          </div>
        ) : paymentStatus ? (
          <div className="mb-6">
            <PaymentStatusIndicator status={paymentStatus} />
          </div>
        ) : null}

        {/* Stats Cards */}
        {summaryLoading ? (
          <div className="text-center text-gray-400 py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Earnings"
              value={`$${Number(summary?.totalEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="All time"
              color="blue"
            />
            <StatCard
              title="Year to Date"
              value={`$${Number(summary?.yearToDate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle={new Date().getFullYear().toString()}
              color="green"
            />
            <StatCard
              title="Last Month"
              value={`$${Number(summary?.lastMonth || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle={new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('en-US', { month: 'long' })}
              color="purple"
            />
            <StatCard
              title="Total Performances"
              value={Number(summary?.totalPerformances || 0).toLocaleString()}
              subtitle={`${summary?.totalSongs || 0} songs`}
              color="orange"
            />
          </div>
        )}

        {/* Content */}
        <div className="bg-slate-800 rounded-lg shadow-xl p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Wallet Card */}
                <div className="max-w-md">
                  <WalletCard
                    balance={walletBalance || { availableBalance: 0, pendingBalance: 0, lifetimeEarnings: 0 }}
                    isLoading={balanceLoading}
                    onWithdraw={handleWithdrawClick}
                  />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Earnings Timeline Chart */}
                  {timelineData?.timeline?.length > 0 ? (
                    <ChartCard
                      title="Earnings Timeline"
                      chartId="earnings-timeline"
                      isExpanded={expandedCharts['earnings-timeline'] || false}
                      onToggleExpand={toggleChartExpansion}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timelineData.timeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis
                            dataKey="month"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value: any) => [formatChartCurrency(value), 'Revenue']}
                          />
                          <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  ) : (
                    <div className="bg-slate-700/30 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-white mb-4">Earnings Timeline</h3>
                      <div className="h-[300px] flex items-center justify-center text-gray-400">
                        No earnings data available yet
                      </div>
                    </div>
                  )}

                  {/* PRO Breakdown Chart */}
                  {getProBreakdown().length > 0 ? (
                    <ChartCard
                      title="Revenue by Statement"
                      chartId="revenue-by-pro"
                      isExpanded={expandedCharts['revenue-by-pro'] || false}
                      onToggleExpand={toggleChartExpansion}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getProBreakdown()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={getSmartPieLabel(getProBreakdown().length)}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                          >
                            {getProBreakdown().map((item, index) => (
                              <Cell
                                key={`cell-${item?.name ?? index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value: any) => formatChartCurrency(value)}
                          />
                          {getProBreakdown().length > 3 && (
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                            />
                          )}
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  ) : (
                    <div className="bg-slate-700/30 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-white mb-4">Revenue by Statement</h3>
                      <div className="h-[300px] flex items-center justify-center text-gray-400">
                        No statement data available yet
                      </div>
                    </div>
                  )}
                </div>

                {/* Territory Revenue Heatmap */}
                <ChartCard
                  title="Global Revenue Heatmap"
                  chartId="territory-heatmap"
                  isExpanded={expandedCharts['territory-heatmap'] || false}
                  onToggleExpand={toggleChartExpansion}
                >
                  {territoryData?.territories && territoryData.territories.length > 0 ? (
                    <TerritoryHeatmap territories={territoryData.territories} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      No territory data available yet. Territory information will appear once statements with location data are processed.
                    </div>
                  )}
                </ChartCard>

                {/* Recent Statements */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Recent Statements</h3>
                  {statementsLoading ? (
                    <div className="text-center text-gray-400 py-8">Loading...</div>
                  ) : statementsData?.statements?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {statementsData.statements.slice(0, 6).map((statement: any) => (
                        <StatementCard key={statement.id} statement={statement} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No statements available yet</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'songs' && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Top Earning Songs</h3>
                {songsData?.songs?.length > 0 ? (
                  <div className="space-y-3">
                    {songsData.songs.map((song: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
                      >
                        {/* Rank Number */}
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-400">#{index + 1}</span>
                        </div>

                        {/* Song Info */}
                        <div className="flex-1">
                          <p className="font-medium text-white text-lg">{song.title}</p>
                          <p className="text-sm text-gray-400">
                            {song.totalPerformances.toLocaleString()} performances • {song.statementCount} statements
                          </p>
                        </div>

                        {/* Revenue */}
                        <div className="text-right">
                          <p className="font-semibold text-green-400 text-xl">
                            ${Number(song.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No songs found</p>
                )}
              </div>
            )}

            {activeTab === 'statements' && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">All Statements</h3>
                {statementsLoading ? (
                  <div className="text-center text-gray-400 py-8">Loading...</div>
                ) : statementsData?.statements?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statementsData.statements.map((statement: any) => (
                      <StatementCard key={statement.id} statement={statement} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No statements available yet</p>
                )}
              </div>
            )}

            {activeTab === 'documents' && <WriterDocumentsSection />}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <PaymentSettings />
                <WithdrawalHistory />
              </div>
            )}

            {activeTab === 'claims' && <ClaimsSection />}

            {activeTab === 'profile' && <ProfileSection />}

            {activeTab === 'tools' && <ToolsHub />}
          </div>
        </div>
      </main>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-2xl max-w-md w-full border border-slate-600">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">Request Withdrawal</h3>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawError('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-gray-300 text-sm mb-4">
                  Request a withdrawal from your available balance. Your request will be reviewed by an administrator.
                </p>
                <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                  <p className="text-xs text-gray-400 mb-1">Available Balance</p>
                  <p className="text-2xl font-bold text-white">
                    ${walletBalance?.availableBalance.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-300 mb-2">
                  Withdrawal Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    id="withdrawAmount"
                    value={withdrawAmount}
                    onChange={(e) => {
                      setWithdrawAmount(e.target.value);
                      setWithdrawError('');
                    }}
                    min="50"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Minimum withdrawal: ${(walletBalance?.minimumWithdrawalAmount || 50).toFixed(2)}
                </p>
              </div>

              {withdrawError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                  <p className="text-sm text-red-200">{withdrawError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawError('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawSubmit}
                  disabled={withdrawMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawMutation.isPending ? 'Submitting...' : 'Request Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function ClaimsSection() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'pending' | 'denied' | 'documents_requested'>('all');
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(() => {
    // Load dismissed notifications from localStorage
    const saved = localStorage.getItem('dismissedNotifications');
    return saved ? JSON.parse(saved) : [];
  });

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['my-work-submissions'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/work-registration/my-submissions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
  });

  const allSubmissions = submissionsData?.submissions || [];
  const approvedClaims = allSubmissions.filter((s: any) => s.status === 'APPROVED');
  const pendingClaims = allSubmissions.filter((s: any) => s.status === 'PENDING');
  const deniedClaims = allSubmissions.filter((s: any) => s.status === 'DENIED');
  const documentsRequestedClaims = allSubmissions.filter((s: any) => s.status === 'DOCUMENTS_REQUESTED');

  // Get recent notifications (reviewed in last 7 days) excluding dismissed ones
  const recentNotifications = allSubmissions
    .filter((s: any) => s.reviewedAt && s.status !== 'PENDING' && !dismissedNotifications.includes(s.id))
    .sort((a: any, b: any) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())
    .slice(0, 5);

  // Dismiss notification handler
  const dismissNotification = (id: string) => {
    const updated = [...dismissedNotifications, id];
    setDismissedNotifications(updated);
    localStorage.setItem('dismissedNotifications', JSON.stringify(updated));
  };

  const filteredSubmissions = activeFilter === 'all' ? allSubmissions :
    activeFilter === 'approved' ? approvedClaims :
    activeFilter === 'pending' ? pendingClaims :
    activeFilter === 'denied' ? deniedClaims :
    documentsRequestedClaims;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full border border-green-500/30 font-semibold">Approved</span>;
      case 'DENIED':
        return <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full border border-red-500/30 font-semibold">Denied</span>;
      case 'DOCUMENTS_REQUESTED':
        return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full border border-yellow-500/30 font-semibold">Documents Requested</span>;
      case 'PENDING':
        return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full border border-blue-500/30 font-semibold">Pending Review</span>;
      default:
        return <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm rounded-full border border-gray-500/30 font-semibold">{status}</span>;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">My Claims & Submissions</h3>
        <p className="text-gray-400 text-sm">
          Track all your work registrations and their current status
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading submissions...</div>
      ) : (
        <>
          {/* Recent Notifications */}
          {recentNotifications.length > 0 && (
            <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🔔</span> Recent Updates
              </h4>
              <div className="space-y-3">
                {recentNotifications.map((notification: any) => (
                  <div key={notification.id} className="flex items-start gap-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium text-sm">{notification.title}</p>
                        {getStatusBadge(notification.status)}
                      </div>
                      <p className="text-slate-400 text-xs mb-1">{notification.artist}</p>
                      {notification.status === 'DENIED' && notification.denialReason && (
                        <p className="text-red-400 text-sm mt-2">Reason: {notification.denialReason}</p>
                      )}
                      {notification.status === 'DOCUMENTS_REQUESTED' && notification.documentsRequested && (
                        <p className="text-yellow-400 text-sm mt-2">Requested: {notification.documentsRequested}</p>
                      )}
                      {notification.status === 'APPROVED' && notification.caseNumber && (
                        <p className="text-green-400 text-sm mt-2 font-mono">Case: {notification.caseNumber}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-right">
                        <p className="text-slate-500 text-xs">{formatDate(notification.reviewedAt)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="Dismiss notification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              All ({allSubmissions.length})
            </button>
            <button
              onClick={() => setActiveFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Approved ({approvedClaims.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Pending ({pendingClaims.length})
            </button>
            <button
              onClick={() => setActiveFilter('documents_requested')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === 'documents_requested'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Docs Requested ({documentsRequestedClaims.length})
            </button>
            <button
              onClick={() => setActiveFilter('denied')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === 'denied'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Denied ({deniedClaims.length})
            </button>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">No Submissions</h4>
              <p className="text-gray-400 mb-6">
                {activeFilter === 'all'
                  ? 'You haven\'t submitted any work registrations yet'
                  : `No ${activeFilter.replace('_', ' ')} submissions`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((claim: any) => (
                <div
                  key={claim.id}
                  className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-purple-500/50 transition-all"
                >
                  {/* Header - Always Visible */}
                  <div
                    className="p-6 cursor-pointer"
                    onClick={(e) => toggleExpand(claim.id, e)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Album Art */}
                        {claim?.albumArtUrl && (
                          <img
                            src={claim.albumArtUrl}
                            alt={claim?.albumName || claim?.title || 'Album art'}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-semibold text-white truncate">{claim?.title || 'Untitled'}</h4>
                          <p className="text-sm text-gray-400">{claim?.artist || 'Unknown Artist'}</p>
                          {claim?.albumName && (
                            <p className="text-xs text-gray-500 mt-1">{claim.albumName}</p>
                          )}

                          <div className="flex flex-wrap gap-2 mt-2">
                            {getStatusBadge(claim?.status || 'PENDING')}
                            {claim?.caseNumber && (
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30 font-mono">
                                {claim.caseNumber}
                              </span>
                            )}
                          </div>
                          {claim?.status === 'DENIED' && claim?.denialReason && (
                            <div className="mt-2 text-red-400 text-xs">
                              <span className="font-semibold">Reason:</span> {claim.denialReason}
                            </div>
                          )}
                          {claim?.status === 'DOCUMENTS_REQUESTED' && claim?.documentsRequested && (
                            <div className="mt-2 text-yellow-400 text-xs">
                              <span className="font-semibold">Requested:</span> {claim.documentsRequested}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expand Icon */}
                      <button className="text-gray-400 hover:text-white transition-colors ml-4">
                        {expandedId === claim.id ? (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === claim.id && claim && (
                <div className="px-6 pb-6 border-t border-slate-700">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Platform</p>
                      <p className="text-sm text-white font-medium">{claim?.platform || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Release Date</p>
                      <p className="text-sm text-white font-medium">{formatDate(claim?.releaseDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Submitted</p>
                      <p className="text-sm text-white font-medium">{formatDate(claim?.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Approved</p>
                      <p className="text-sm text-white font-medium">{formatDate(claim?.reviewedAt)}</p>
                    </div>
                  </div>

                  {/* Credits Section */}
                  {claim?.credits && Array.isArray(claim.credits) && claim.credits.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <span>👥</span> Collaborators & Credits ({claim.credits.length})
                      </h5>
                      <div className="space-y-2">
                        {claim.credits.map((credit: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-white font-medium text-sm">
                                  {credit?.firstName || ''} {credit?.lastName || 'Unknown'}
                                </p>
                                {credit?.isPrimary && (
                                  <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded">Primary</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="text-slate-400">{credit?.role || 'N/A'}</span>
                                {credit?.pro && <span className="text-slate-500">PRO: {credit.pro}</span>}
                                {credit?.ipiNumber && <span className="text-slate-500 font-mono">IPI: {credit.ipiNumber}</span>}
                              </div>
                              {credit?.notes && (
                                <p className="text-slate-500 text-xs mt-1">{credit.notes}</p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold text-green-400">{Number(credit?.splitPercentage) || 0}%</p>
                              <p className="text-xs text-slate-500">Split</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        Total Split: <span className={`font-semibold ${claim.credits.reduce((sum: number, c: any) => sum + (Number(c?.splitPercentage) || 0), 0) === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {claim.credits.reduce((sum: number, c: any) => sum + (Number(c?.splitPercentage) || 0), 0).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Documents Section */}
                  {claim?.documents && Array.isArray(claim.documents) && claim.documents.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <span>📎</span> Uploaded Documents ({claim.documents.length})
                      </h5>
                      <div className="space-y-2">
                        {claim.documents.map((doc: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                            <div className="flex-1 min-w-0 mr-4">
                              <p className="text-white text-sm font-medium truncate">{doc?.originalName || 'Untitled Document'}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-500/30">
                                  {doc?.category || 'N/A'}
                                </span>
                                <span className="text-slate-500 text-xs">{formatFileSize(doc?.fileSize || 0)}</span>
                                <span className="text-slate-500 text-xs">{formatDate(doc?.uploadedAt)}</span>
                              </div>
                              {doc?.description && (
                                <p className="text-slate-400 text-xs mt-1">{doc.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {claim?.notes && (
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs font-medium text-blue-300 mb-1">Notes:</p>
                      <p className="text-sm text-white">{claim.notes}</p>
                    </div>
                    )}
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProfileSection() {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    writerIpiNumber: user?.writerIpiNumber || '',
    publisherIpiNumber: user?.publisherIpiNumber || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      if (!user?.id) throw new Error('User not found');
      return userApi.update(user.id, data);
    },
    onSuccess: () => {
      // Update the auth store with the new user data
      if (user) {
        updateUser({
          ...user,
          writerIpiNumber: formData.writerIpiNumber || undefined,
          publisherIpiNumber: formData.publisherIpiNumber || undefined,
        });
      }
      setIsEditing(false);
      alert('Profile updated successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to update profile');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      writerIpiNumber: formData.writerIpiNumber || null,
      publisherIpiNumber: formData.publisherIpiNumber || null,
    });
  };

  const handleCancel = () => {
    setFormData({
      writerIpiNumber: user?.writerIpiNumber || '',
      publisherIpiNumber: user?.publisherIpiNumber || '',
    });
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-white">My Profile</h3>
        {!isEditing && user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            Edit IPI Numbers
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* User Info Section */}
        <div className="bg-slate-700/30 rounded-lg p-6">
          <h4 className="text-md font-medium text-white mb-4">Account Information</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <p className="text-white">
                {user?.firstName || user?.lastName
                  ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <p className="text-white">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
              <p className="text-white">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* IPI Numbers Section */}
        <div className="bg-slate-700/30 rounded-lg p-6">
          <h4 className="text-md font-medium text-white mb-4">IPI/CAE Numbers</h4>
          <p className="text-sm text-gray-400 mb-6">
            Your IPI (Interested Party Information) numbers help us accurately match your royalty statements.
            {user?.role === 'WRITER' && ' Writers typically have a Writer IPI number.'}
            {user?.role === 'PUBLISHER' && ' Publishers typically have a Publisher IPI number.'}
          </p>

          <div className="space-y-4">
            {/* Writer IPI Number - only for WRITER role */}
            {user?.role === 'WRITER' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Writer IPI Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.writerIpiNumber}
                    onChange={(e) => setFormData({ ...formData, writerIpiNumber: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="Enter your Writer IPI/CAE Number"
                  />
                ) : (
                  <div className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white">
                    {user?.writerIpiNumber ? (
                      formatIpiDisplay(user.writerIpiNumber)
                    ) : (
                      <span className="text-gray-500">Not set - Contact administrator</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Publisher IPI Number - for both WRITER and PUBLISHER roles */}
            {(user?.role === 'WRITER' || user?.role === 'PUBLISHER') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Publisher IPI Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.publisherIpiNumber}
                    onChange={(e) => setFormData({ ...formData, publisherIpiNumber: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="Enter your Publisher IPI/CAE Number"
                  />
                ) : (
                  <div className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white">
                    {user?.publisherIpiNumber ? (
                      formatIpiDisplay(user.publisherIpiNumber)
                    ) : (
                      <span className="text-gray-500">Not set - Contact administrator</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-600 transition-colors"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="flex-1 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg font-medium hover:bg-slate-600 disabled:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> {user?.role === 'ADMIN'
              ? "IPI numbers can be found on PRO membership portals (ASCAP, BMI, SESAC, etc.)."
              : "To update your IPI numbers, please contact your administrator. IPI numbers can be found on your PRO membership portal (ASCAP, BMI, SESAC, etc.)."}
          </p>
        </div>
      </div>
    </div>
  );
}

function WriterDocumentsSection() {
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['writer-documents'],
    queryFn: async () => {
      const response = await documentApi.list();
      return response.data;
    }
  });

  const handleDownload = async (id: string, filename: string) => {
    try {
      const response = await documentApi.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      PRE_PROCESSED_STATEMENT: 'Pre-Processed Statement',
      PROCESSED_STATEMENT: 'Processed Statement',
      CONTRACT: 'Contract',
      AGREEMENT: 'Agreement',
      INVOICE: 'Invoice',
      TAX_DOCUMENT: 'Tax Document',
      OTHER: 'Other'
    };
    return labels[category] || category;
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-white mb-4">My Documents</h3>
      <p className="text-sm text-gray-400 mb-6">
        Access your contracts, statements, and other important documents
      </p>

      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      ) : documentsData?.documents?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentsData.documents.map((doc: any) => (
            <div
              key={doc.id}
              className="bg-slate-700/30 border border-slate-600 rounded-lg p-5 hover:border-primary-500/50 transition-all"
            >
              {/* Document Icon & Name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">{doc.originalName}</h4>
                  <p className="text-xs text-gray-400 mt-1">{formatFileSize(doc.fileSize)}</p>
                </div>
              </div>

              {/* Description */}
              {doc.description && (
                <p className="text-xs text-gray-400 mb-3 line-clamp-2">{doc.description}</p>
              )}

              {/* Category Badge */}
              <div className="mb-3">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                  {getCategoryLabel(doc.category)}
                </span>
              </div>

              {/* Upload Date */}
              <p className="text-xs text-gray-500 mb-4">
                Uploaded: {formatDate(doc.createdAt)}
              </p>

              {/* Download Button */}
              <button
                onClick={() => handleDownload(doc.id, doc.originalName)}
                className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400">No documents available yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Documents will appear here when your admin uploads them
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, color }: { title: string; value: string; subtitle: string; color: 'blue' | 'green' | 'purple' | 'orange' }) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6`}>
      <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function PaymentStatusIndicator({ status }: { status: any }) {
  const getStatusConfig = () => {
    switch (status.status) {
      case 'RECENT':
        return {
          color: 'bg-green-500',
          borderColor: 'border-green-500/50',
          bgColor: 'bg-green-500/10',
          icon: '🟢',
          label: 'Paid'
        };
      case 'PENDING':
        return {
          color: 'bg-yellow-500',
          borderColor: 'border-yellow-500/50',
          bgColor: 'bg-yellow-500/10',
          icon: '🟡',
          label: 'Pending'
        };
      case 'NONE':
      default:
        return {
          color: 'bg-red-500',
          borderColor: 'border-red-500/50',
          bgColor: 'bg-red-500/10',
          icon: '🔴',
          label: 'No Payments'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
      <div className="flex items-center gap-4">
        {/* Pulsing Status Light */}
        <div className="flex-shrink-0">
          <div className="relative">
            <div className={`w-4 h-4 ${config.color} rounded-full`}></div>
            {status.status === 'PENDING' && (
              <div className={`absolute inset-0 w-4 h-4 ${config.color} rounded-full animate-ping opacity-75`}></div>
            )}
          </div>
        </div>

        {/* Status Message */}
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            Payment Status: <span className="font-bold">{config.label}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {status.status === 'PENDING' ? 'You have a payment pending' : status.message}
          </p>
        </div>

        {/* Additional Info - Show dollar amount instead of count */}
        {(status.unpaidAmount > 0 || status.pendingAmount > 0) && (
          <div className="flex-shrink-0 text-right">
            {status.unpaidAmount > 0 && (
              <p className="text-xs text-gray-400">
                <span className="font-medium text-red-400">
                  ${Number(status.unpaidAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span> unpaid
              </p>
            )}
            {status.pendingAmount > 0 && (
              <p className="text-xs text-gray-400">
                <span className="font-medium text-yellow-400">
                  ${Number(status.pendingAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span> pending
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function StatementCard({ statement }: { statement: any }) {
  const proColors: Record<string, string> = {
    BMI: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    ASCAP: 'from-green-500/20 to-green-600/20 border-green-500/30',
    SESAC: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  };

  const statusColors: Record<string, string> = {
    PUBLISHED: 'bg-green-500/10 text-green-400 border-green-500/30',
    UPLOADED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    ERROR: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const formatPeriod = (statement: any) => {
    if (statement.periodStart && statement.periodEnd) {
      const start = new Date(statement.periodStart);
      const end = new Date(statement.periodEnd);
      return `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    return 'Period not specified';
  };

  return (
    <div className={`bg-gradient-to-br ${proColors[statement.proType] || proColors.BMI} border rounded-lg p-5 hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-bold text-white">{statement.proType}</h4>
          <p className="text-xs text-gray-400 mt-1">{formatPeriod(statement)}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[statement.status] || statusColors.UPLOADED}`}>
          {statement.status}
        </span>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Items:</span>
          <span className="text-white font-medium">{statement.itemCount || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Performances:</span>
          <span className="text-white font-medium">{Number(statement.totalPerformances || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-white/10">
          <span className="text-gray-400">Revenue:</span>
          <span className="text-green-400 font-bold text-lg">
            ${Number(statement.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
