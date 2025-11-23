import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dashboardApi, statementApi, documentApi, userApi, payoutApi } from '../lib/api';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { PaymentSettings } from '../components/PaymentSettings';
import { WithdrawalHistory } from '../components/WithdrawalHistory';
import ToolsHub from '../components/ToolsHub';
import WriterOverviewTremor from '../components/writer/WriterOverviewTremor';
import { useAuthStore } from '../store/auth.store';
import { formatIpiDisplay } from '../utils/ipi-helper';
import { X, Bell, ClipboardList, Users, Paperclip } from 'lucide-react';

export default function WriterDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'songs' | 'statements' | 'documents' | 'payments' | 'profile' | 'tools' | 'claims'>('overview');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const queryClient = useQueryClient();

  // Track sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent<{ isCollapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
  }, []);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return response.data;
    },
  });

  const { data: statementsData, isLoading: statementsLoading } = useQuery({
    queryKey: ['user-statements'],
    queryFn: async () => {
      const response = await statementApi.getStatements();
      return response.data;
    },
    enabled: activeTab === 'statements',
  });

  const { data: songsData } = useQuery({
    queryKey: ['dashboard-songs'],
    queryFn: async () => {
      const response = await dashboardApi.getSongs({ limit: 10 });
      return response.data;
    },
    enabled: activeTab === 'songs',
  });

  // Wallet balance query (for withdrawal modal)
  const { data: walletBalance } = useQuery({
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
      toast.success('Withdrawal request submitted! Awaiting admin approval.');
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

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Impersonation Banner */}
      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'overview' | 'songs' | 'statements' | 'documents' | 'payments' | 'profile' | 'tools' | 'claims')}
        />

        {/* Main Content Area */}
        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 md:pt-8">

        {/* Payment Status Indicator */}
        {paymentStatusLoading ? (
          <div className="mb-6 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm p-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-blue"></div>
              <p className="text-sm text-text-secondary">Loading payment status...</p>
            </div>
          </div>
        ) : paymentStatusError ? (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-sm text-red-400">Failed to load payment status</p>
          </div>
        ) : paymentStatus ? (
          <div className="mb-6">
            <PaymentStatusIndicator status={paymentStatus} />
          </div>
        ) : null}

        {/* Stats Cards */}
        {summaryLoading ? (
          <div className="text-center text-text-secondary py-12">Loading...</div>
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
        <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm shadow-xl p-6">
            {activeTab === 'overview' && (
              <WriterOverviewTremor onWithdrawClick={handleWithdrawClick} />
            )}

            {activeTab === 'songs' && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Top Earning Songs</h3>
                {songsData?.songs?.length > 0 ? (
                  <div className="space-y-3">
                    {songsData.songs.map((song: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
                      >
                        {/* Rank Number */}
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-brand-blue/20 to-brand-blue/10 border border-brand-blue/30 rounded-xl flex items-center justify-center">
                          <span className="text-xl font-bold text-brand-blue">#{index + 1}</span>
                        </div>

                        {/* Song Info */}
                        <div className="flex-1">
                          <p className="font-medium text-white text-lg">{song.title}</p>
                          <p className="text-sm text-text-secondary">
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
                  <p className="text-text-muted text-center py-8">No songs found</p>
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
                  <p className="text-text-muted text-center py-8">No statements available yet</p>
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
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.1] to-white/[0.02] border border-white/[0.1] backdrop-blur-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
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
                <p className="text-text-secondary text-sm mb-4">
                  Request a withdrawal from your available balance. Your request will be reviewed by an administrator.
                </p>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
                  <p className="text-xs text-text-muted mb-1">Available Balance</p>
                  <p className="text-2xl font-bold text-white">
                    ${walletBalance?.availableBalance.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="withdrawAmount" className="block text-sm font-medium text-text-secondary mb-2">
                  Withdrawal Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted">$</span>
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
                    className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue/50 transition-all"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Minimum withdrawal: ${(walletBalance?.minimumWithdrawalAmount || 50).toFixed(2)}
                </p>
              </div>

              {withdrawError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-sm text-red-400">{withdrawError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawError('');
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawSubmit}
                  disabled={withdrawMutation.isPending}
                  className="flex-1 px-4 py-3 bg-white text-surface font-semibold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="text-center text-text-secondary py-12">Loading submissions...</div>
      ) : (
        <>
          {/* Recent Notifications */}
          {recentNotifications.length > 0 && (
            <div className="mb-6 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5" /> Recent Updates
              </h4>
              <div className="space-y-3">
                {recentNotifications.map((notification: any) => (
                  <div key={notification.id} className="flex items-start gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium text-sm">{notification.title}</p>
                        {getStatusBadge(notification.status)}
                      </div>
                      <p className="text-text-muted text-xs mb-1">{notification.artist}</p>
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
                        <p className="text-text-muted text-xs">{formatDate(notification.reviewedAt)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        className="text-text-muted hover:text-red-400 transition-colors p-1"
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
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-brand-blue text-white'
                  : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
              }`}
            >
              All ({allSubmissions.length})
            </button>
            <button
              onClick={() => setActiveFilter('approved')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeFilter === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
              }`}
            >
              Approved ({approvedClaims.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeFilter === 'pending'
                  ? 'bg-brand-blue text-white'
                  : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
              }`}
            >
              Pending ({pendingClaims.length})
            </button>
            <button
              onClick={() => setActiveFilter('documents_requested')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeFilter === 'documents_requested'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
              }`}
            >
              Docs Requested ({documentsRequestedClaims.length})
            </button>
            <button
              onClick={() => setActiveFilter('denied')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeFilter === 'denied'
                  ? 'bg-red-500 text-white'
                  : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
              }`}
            >
              Denied ({deniedClaims.length})
            </button>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] mb-4">
                <ClipboardList className="w-8 h-8 text-text-muted" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">No Submissions</h4>
              <p className="text-text-secondary mb-6">
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
                  className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] overflow-hidden hover:border-purple-500/30 transition-all"
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
                        <Users className="w-4 h-4" /> Collaborators & Credits ({claim.credits.length})
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
                        <Paperclip className="w-4 h-4" /> Uploaded Documents ({claim.documents.length})
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
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update profile');
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
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h4 className="text-md font-medium text-white mb-4">Account Information</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Name</label>
              <p className="text-white">
                {user?.firstName || user?.lastName
                  ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
              <p className="text-white">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Role</label>
              <p className="text-white">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* IPI Numbers Section */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h4 className="text-md font-medium text-white mb-4">IPI/CAE Numbers</h4>
          <p className="text-sm text-text-secondary mb-6">
            Your IPI (Interested Party Information) numbers help us accurately match your royalty statements.
            {user?.role === 'WRITER' && ' Writers typically have a Writer IPI number.'}
            {user?.role === 'PUBLISHER' && ' Publishers typically have a Publisher IPI number.'}
          </p>

          <div className="space-y-4">
            {/* Writer IPI Number - only for WRITER role */}
            {user?.role === 'WRITER' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Writer IPI Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.writerIpiNumber}
                    onChange={(e) => setFormData({ ...formData, writerIpiNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue/50 transition-all"
                    placeholder="Enter your Writer IPI/CAE Number"
                  />
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white">
                    {user?.writerIpiNumber ? (
                      formatIpiDisplay(user.writerIpiNumber)
                    ) : (
                      <span className="text-text-muted">Not set - Contact administrator</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Publisher IPI Number - for both WRITER and PUBLISHER roles */}
            {(user?.role === 'WRITER' || user?.role === 'PUBLISHER') && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Publisher IPI Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.publisherIpiNumber}
                    onChange={(e) => setFormData({ ...formData, publisherIpiNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue/50 transition-all"
                    placeholder="Enter your Publisher IPI/CAE Number"
                  />
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white">
                    {user?.publisherIpiNumber ? (
                      formatIpiDisplay(user.publisherIpiNumber)
                    ) : (
                      <span className="text-text-muted">Not set - Contact administrator</span>
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
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="flex-1 px-4 py-3 bg-white/5 text-text-secondary rounded-xl border border-white/10 font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-4">
          <p className="text-sm text-brand-blue">
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
      toast.error('Failed to download document');
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
      <p className="text-sm text-text-secondary mb-6">
        Access your contracts, statements, and other important documents
      </p>

      {isLoading ? (
        <div className="text-center text-text-secondary py-8">Loading...</div>
      ) : documentsData?.documents?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentsData.documents.map((doc: any) => (
            <div
              key={doc.id}
              className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-5 hover:border-brand-blue/30 transition-all"
            >
              {/* Document Icon & Name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 bg-brand-blue/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">{doc.originalName}</h4>
                  <p className="text-xs text-text-muted mt-1">{formatFileSize(doc.fileSize)}</p>
                </div>
              </div>

              {/* Description */}
              {doc.description && (
                <p className="text-xs text-text-muted mb-3 line-clamp-2">{doc.description}</p>
              )}

              {/* Category Badge */}
              <div className="mb-3">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
                  {getCategoryLabel(doc.category)}
                </span>
              </div>

              {/* Upload Date */}
              <p className="text-xs text-text-muted mb-4">
                Uploaded: {formatDate(doc.createdAt)}
              </p>

              {/* Download Button */}
              <button
                onClick={() => handleDownload(doc.id, doc.originalName)}
                className="w-full px-4 py-2.5 bg-white text-surface text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] mb-4">
            <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-text-secondary">No documents available yet</p>
          <p className="text-sm text-text-muted mt-2">
            Documents will appear here when your admin uploads them
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, color }: { title: string; value: string; subtitle: string; color: 'blue' | 'green' | 'purple' | 'orange' }) {
  const colorClasses: Record<string, { gradient: string; border: string; accent: string }> = {
    blue: { gradient: 'from-brand-blue/20 to-brand-blue/5', border: 'border-brand-blue/30', accent: 'bg-brand-blue' },
    green: { gradient: 'from-green-500/20 to-green-500/5', border: 'border-green-500/30', accent: 'bg-green-500' },
    purple: { gradient: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', accent: 'bg-purple-500' },
    orange: { gradient: 'from-orange-500/20 to-orange-500/5', border: 'border-orange-500/30', accent: 'bg-orange-500' },
  };

  const styles = colorClasses[color];

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${styles.gradient} ${styles.border} border rounded-2xl p-6 backdrop-blur-sm`}>
      {/* Accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${styles.accent}`} />
      <h3 className="text-sm font-medium text-text-secondary mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-text-muted">{subtitle}</p>
    </div>
  );
}

function PaymentStatusIndicator({ status }: { status: any }) {
  const getStatusConfig = () => {
    switch (status.status) {
      case 'RECENT':
        return {
          color: 'bg-green-500',
          borderColor: 'border-green-500/30',
          bgColor: 'bg-green-500/10',
          icon: '🟢',
          label: 'Paid'
        };
      case 'PENDING':
        return {
          color: 'bg-yellow-500',
          borderColor: 'border-yellow-500/30',
          bgColor: 'bg-yellow-500/10',
          icon: '🟡',
          label: 'Pending'
        };
      case 'NONE':
      default:
        return {
          color: 'bg-red-500',
          borderColor: 'border-red-500/30',
          bgColor: 'bg-red-500/10',
          icon: '🔴',
          label: 'No Payments'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-2xl p-4 backdrop-blur-sm`}>
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
          <p className="text-xs text-text-muted mt-0.5">
            {status.status === 'PENDING' ? 'You have a payment pending' : status.message}
          </p>
        </div>

        {/* Additional Info - Show dollar amount instead of count */}
        {(status.unpaidAmount > 0 || status.pendingAmount > 0) && (
          <div className="flex-shrink-0 text-right">
            {status.unpaidAmount > 0 && (
              <p className="text-xs text-text-muted">
                <span className="font-medium text-red-400">
                  ${Number(status.unpaidAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span> unpaid
              </p>
            )}
            {status.pendingAmount > 0 && (
              <p className="text-xs text-text-muted">
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
