import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import toast from 'react-hot-toast';
import { dashboardApi, statementApi, documentApi, userApi, payoutApi, placementApi, getAuthToken } from '../lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { DashboardHeader } from '../components/DashboardHeader';
import { PaymentSettings } from '../components/PaymentSettings';
import { WithdrawalHistory } from '../components/WithdrawalHistory';
import ToolsHub from '../components/ToolsHub';
import WriterOverviewTremor from '../components/writer/WriterOverviewTremor';
import { GuidedTour } from '../components/ui/GuidedTour';
import { useAuthStore } from '../store/auth.store';
import { formatIpiDisplay } from '../utils/ipi-helper';
import { writerDashboardSteps, TOUR_IDS } from '../config/tour-steps';
import { X, Bell, ClipboardList, Users, Paperclip, Upload, FileText, Loader2, DollarSign, Calendar, BarChart3, Music, TrendingUp, Grid, List, Search, MapPin, Disc } from 'lucide-react';
import { RechartsRevenueChart } from '../components/charts';

type TabType = 'overview' | 'songs' | 'statements' | 'documents' | 'billing' | 'profile' | 'tools' | 'placements';

export default function WriterDashboard() {
  const location = useLocation();
  const initialTab = (location.state as { activeTab?: TabType })?.activeTab || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Handle navigation state changes when navigating back to dashboard
  useEffect(() => {
    const stateTab = (location.state as { activeTab?: TabType })?.activeTab;
    if (stateTab) {
      setActiveTab(stateTab);
    }
  }, [location.state]);

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
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Background Effects - Subtle for light theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-400/5 rounded-full blur-[100px]" />
      </div>

      {/* Impersonation Banner */}
      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
        />

        {/* Main Content Area */}
        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300 bg-slate-50`}>
          {/* Top Header - Now visible on mobile too */}
          <div data-tour-id="writer-welcome">
            <DashboardHeader title="Dashboard" />
          </div>

          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8">

        {/* Payment Status Indicator - only show on overview tab */}
        {activeTab === 'overview' && (
          <>
            {paymentStatusLoading ? (
              <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <p className="text-sm text-gray-500">Loading payment status...</p>
                </div>
              </div>
            ) : paymentStatusError ? (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600">Failed to load payment status</p>
              </div>
            ) : paymentStatus ? (
              <div className="mb-6">
                <PaymentStatusIndicator status={paymentStatus} />
              </div>
            ) : null}

            {/* Stats Cards - only show on overview tab */}
            {summaryLoading ? (
              <div className="text-center text-gray-500 py-12">Loading...</div>
            ) : (
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {/* Hero Card - Total Earnings */}
                <div data-tour-id="writer-earnings">
                  <HeroEarningsCard
                    value={Number(summary?.totalEarnings || 0)}
                    trend={summary?.earningsTrend || 0}
                  />
                </div>

                {/* Stats Grid - 2x2 */}
                <div data-tour-id="writer-stats" className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatCard
                    title="Year to Date"
                    value={`$${Number(summary?.yearToDate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={Calendar}
                    color="green"
                    trend={12}
                  />
                  <StatCard
                    title="Last Month"
                    value={`$${Number(summary?.lastMonth || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={BarChart3}
                    color="purple"
                    trend={8}
                  />
                  <StatCard
                    title="Total Performances"
                    value={Number(summary?.totalPerformances || 0).toLocaleString()}
                    icon={Music}
                    color="orange"
                    trend={15}
                  />
                  <StatCard
                    title="Total Songs"
                    value={Number(summary?.totalSongs || 0).toLocaleString()}
                    icon={DollarSign}
                    color="blue"
                    trend={5}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Content */}
        <div data-tour-id="writer-tabs" className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            {activeTab === 'overview' && (
              <WriterOverviewTremor onWithdrawClick={handleWithdrawClick} />
            )}

            {activeTab === 'songs' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Earning Songs</h3>
                {songsData?.songs?.length > 0 ? (
                  <div className="space-y-3">
                    {songsData.songs.map((song: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all"
                      >
                        {/* Rank Number */}
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-600">#{index + 1}</span>
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-lg truncate">{song.title}</p>
                          <p className="text-sm text-gray-500">
                            {song.totalPerformances.toLocaleString()} performances • {song.statementCount} statements
                          </p>
                        </div>

                        {/* Revenue */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-emerald-600 text-xl">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Statements</h3>
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

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <PaymentSettings />
                <WithdrawalHistory />
              </div>
            )}

            {activeTab === 'placements' && <PlacementsSection />}

            {activeTab === 'profile' && <ProfileSection />}

            {activeTab === 'tools' && <ToolsHub />}
          </div>
        </div>
      </main>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Request Withdrawal</h3>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-gray-500 text-sm mb-4">
                  Request a withdrawal from your available balance. Your request will be reviewed by an administrator.
                </p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                  <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">Available Balance</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    ${walletBalance?.availableBalance.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Minimum withdrawal: ${(walletBalance?.minimumWithdrawalAmount || 50).toFixed(2)}
                </p>
              </div>

              {withdrawError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{withdrawError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawSubmit}
                  disabled={withdrawMutation.isPending}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawMutation.isPending ? 'Submitting...' : 'Request Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Guided Tour for new users */}
      {activeTab === 'overview' && (
        <GuidedTour
          tourId={TOUR_IDS.WRITER_DASHBOARD}
          steps={writerDashboardSteps}
        />
      )}
    </div>
  );
}

function PlacementsSection() {
  const [activeSubTab, setActiveSubTab] = useState<'placements' | 'submissions'>('placements');

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">My Placements</h3>
        <p className="text-gray-500 text-sm">
          View your placements with earnings and track your work registrations
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveSubTab('placements')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'placements'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Placements & Earnings
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('submissions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'submissions'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Work Registrations
          </span>
        </button>
      </div>

      {activeSubTab === 'placements' ? (
        <WriterPlacementsTab />
      ) : (
        <WorkRegistrationsSection />
      )}
    </div>
  );
}

// New component: Writer's placements with revenue data - with virtual scrolling
function WriterPlacementsTab() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);

  // Refs for virtual scrolling
  const listParentRef = useRef<HTMLDivElement>(null);
  const gridParentRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-placement-credits'],
    queryFn: async () => {
      const response = await placementApi.getMyCredits();
      return response.data;
    },
  });

  const placements = data?.placements || [];
  const summary = data?.summary || { totalPlacements: 0, totalRevenue: 0, totalNet: 0 };

  // Filter placements by search query - FIXED: use correct field names from API
  const filteredPlacements = placements.filter((p: any) =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Virtual list for list view
  const listVirtualizer = useVirtualizer({
    count: filteredPlacements.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 88, // Approximate height of list item
    overscan: 5,
  });

  // Calculate grid columns based on viewport
  const getGridColumns = useCallback(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }, []);

  const [gridColumns, setGridColumns] = useState(getGridColumns);

  useEffect(() => {
    const handleResize = () => setGridColumns(getGridColumns());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getGridColumns]);

  // Virtual grid - calculate rows
  const gridRows = Math.ceil(filteredPlacements.length / gridColumns);
  const gridVirtualizer = useVirtualizer({
    count: gridRows,
    getScrollElement: () => gridParentRef.current,
    estimateSize: () => 280, // Approximate height of grid row
    overscan: 2,
  });

  const formatCurrency = (value: number) => {
    return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-theme-primary mx-auto" />
        <p className="text-theme-foreground-muted mt-3">Loading your placements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <h4 className="text-xl font-semibold text-theme-foreground mb-2">Error Loading Placements</h4>
        <p className="text-theme-foreground-muted">Please try again later</p>
      </div>
    );
  }

  if (placements.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-theme-card border border-theme-border mb-4">
          <Disc className="w-8 h-8 text-theme-foreground-muted" />
        </div>
        <h4 className="text-xl font-semibold text-theme-foreground mb-2">No Placements Yet</h4>
        <p className="text-theme-foreground-muted">Your placements will appear here once you have credits on released works</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards - Theme aware */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="relative overflow-hidden bg-theme-card border border-theme-border rounded-xl p-4 group hover:border-emerald-500/50 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-theme-foreground-muted font-medium uppercase tracking-wider">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.totalRevenue)}</p>
          </div>
        </div>
        <div className="relative overflow-hidden bg-theme-card border border-theme-border rounded-xl p-4 group hover:border-blue-500/50 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-50" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Music className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xs text-theme-foreground-muted font-medium uppercase tracking-wider">Placements</p>
            </div>
            <p className="text-2xl font-bold text-blue-500">{summary.totalPlacements}</p>
          </div>
        </div>
        <div className="relative overflow-hidden bg-theme-card border border-theme-border rounded-xl p-4 group hover:border-purple-500/50 transition-all col-span-2 md:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-50" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-xs text-theme-foreground-muted font-medium uppercase tracking-wider">Net Earnings</p>
            </div>
            <p className="text-2xl font-bold text-purple-500">{formatCurrency(summary.totalNet || 0)}</p>
          </div>
        </div>
      </div>

      {/* Search & View Toggle - Theme aware */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-foreground-muted" />
          <input
            type="text"
            placeholder="Search by title or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-theme-input border border-theme-border rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all"
          />
        </div>
        <div className="flex gap-1 p-1 bg-theme-card border border-theme-border rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-theme-primary text-white shadow-sm'
                : 'text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-card-hover'
            }`}
            title="Grid view"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-theme-primary text-white shadow-sm'
                : 'text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-card-hover'
            }`}
            title="List view"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Placements - with Virtual Scrolling */}
      {filteredPlacements.length === 0 ? (
        <div className="text-center py-12 bg-theme-card border border-theme-border rounded-xl">
          <Search className="w-12 h-12 text-theme-foreground-muted mx-auto mb-3 opacity-50" />
          <p className="text-theme-foreground-muted">No placements match your search</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Virtualized Grid View */
        <div
          ref={gridParentRef}
          className="h-[calc(100vh-450px)] min-h-[400px] overflow-auto rounded-xl"
        >
          <div
            style={{
              height: `${gridVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {gridVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * gridColumns;
              const rowPlacements = filteredPlacements.slice(startIndex, startIndex + gridColumns);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'grid',
                    gap: '1rem',
                    gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
                  }}
                  data-grid-cols={gridColumns}
                >
                  {rowPlacements.map((placement: any) => (
                    <div
                      key={placement.id}
                      className="group bg-theme-card border border-theme-border rounded-xl overflow-hidden hover:border-theme-primary/50 hover:shadow-lg hover:shadow-theme-primary/10 transition-all cursor-pointer"
                      onClick={() => setSelectedPlacement(placement)}
                    >
                      {/* Album Art with overlay */}
                      <div className="relative h-40 bg-gradient-to-br from-theme-card to-theme-background">
                        {placement.albumArtUrl ? (
                          <img
                            src={placement.albumArtUrl}
                            alt={placement.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-theme-primary/10 flex items-center justify-center">
                              <Music className="w-10 h-10 text-theme-primary/50" />
                            </div>
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {/* Revenue Badge */}
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-lg">
                          {formatCurrency(placement.revenue?.total || 0)}
                        </div>
                        {/* Title overlay on image */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h4 className="font-bold text-white text-lg truncate drop-shadow-lg">{placement.title}</h4>
                          <p className="text-white/80 text-sm truncate">{placement.artist || 'Unknown Artist'}</p>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-500 text-xs font-semibold rounded-lg border border-blue-500/20">
                              {placement.userCredit?.splitPercentage || 0}% Split
                            </span>
                            {placement.userCredit?.role && (
                              <span className="px-2.5 py-1 bg-theme-card-hover text-theme-foreground-muted text-xs rounded-lg">
                                {placement.userCredit.role}
                              </span>
                            )}
                          </div>
                          <BarChart3 className="w-4 h-4 text-theme-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* Quick stats */}
                        {(placement.topTerritories?.length > 0 || placement.recentPeriods?.length > 0) && (
                          <div className="mt-3 pt-3 border-t border-theme-border">
                            <div className="flex items-center justify-between text-xs">
                              {placement.topTerritories?.[0] && (
                                <div className="flex items-center gap-1.5 text-theme-foreground-muted">
                                  <MapPin className="w-3 h-3" />
                                  <span>{placement.topTerritories[0].territory}</span>
                                </div>
                              )}
                              {placement.recentPeriods?.[0] && (
                                <div className="flex items-center gap-1.5 text-emerald-500">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatPeriod(placement.recentPeriods[0].period)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Virtualized List View */
        <div
          ref={listParentRef}
          className="h-[calc(100vh-450px)] min-h-[400px] overflow-auto rounded-xl"
        >
          <div
            style={{
              height: `${listVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {listVirtualizer.getVirtualItems().map((virtualRow) => {
              const placement = filteredPlacements[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-3"
                >
                  <div
                    className="group bg-theme-card border border-theme-border rounded-xl p-4 hover:border-theme-primary/50 hover:shadow-lg transition-all cursor-pointer h-full"
                    onClick={() => setSelectedPlacement(placement)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-theme-card-hover flex-shrink-0 overflow-hidden">
                        {placement.albumArtUrl ? (
                          <img
                            src={placement.albumArtUrl}
                            alt={placement.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-7 h-7 text-theme-foreground-muted" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-theme-foreground truncate">{placement.title}</h4>
                        <p className="text-sm text-theme-foreground-muted truncate">{placement.artist || 'Unknown Artist'}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-medium rounded">
                            {placement.userCredit?.splitPercentage || 0}%
                          </span>
                          {placement.userCredit?.role && (
                            <span className="text-xs text-theme-foreground-muted">{placement.userCredit.role}</span>
                          )}
                        </div>
                      </div>

                      {/* Revenue & Stats */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-emerald-500">{formatCurrency(placement.revenue?.total || 0)}</p>
                        {placement.topTerritories?.[0] && (
                          <p className="text-xs text-theme-foreground-muted flex items-center justify-end gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {placement.topTerritories[0].territory}
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <svg
                        className="w-5 h-5 text-theme-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Placement count indicator */}
      <div className="mt-4 text-center text-sm text-theme-foreground-muted">
        Showing {filteredPlacements.length} of {placements.length} placements
      </div>

      {/* Placement Analytics Modal */}
      {selectedPlacement && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPlacement(null)}
        >
          <div
            className="bg-theme-card border border-theme-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Album Art */}
            <div className="relative h-48 bg-gradient-to-br from-theme-card to-theme-background">
              {selectedPlacement.albumArtUrl ? (
                <img
                  src={selectedPlacement.albumArtUrl}
                  alt={selectedPlacement.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-20 h-20 text-theme-foreground-muted opacity-30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              <button
                onClick={() => setSelectedPlacement(null)}
                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-2xl font-bold text-white mb-1">{selectedPlacement.title}</h2>
                <p className="text-white/80">{selectedPlacement.artist || 'Unknown Artist'}</p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Revenue Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedPlacement.revenue?.total || 0)}</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider mb-1">Your Split</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedPlacement.userCredit?.splitPercentage || 0}%</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wider mb-1">Net Earnings</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(selectedPlacement.revenue?.net || 0)}</p>
                </div>
              </div>

              {/* Song Details */}
              <div className="bg-theme-card-hover rounded-xl p-4">
                <h3 className="text-sm font-semibold text-theme-foreground mb-3 flex items-center gap-2">
                  <Music className="w-4 h-4 text-theme-primary" />
                  Song Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedPlacement.albumName && (
                    <div>
                      <p className="text-theme-foreground-muted text-xs">Album</p>
                      <p className="text-theme-foreground font-medium">{selectedPlacement.albumName}</p>
                    </div>
                  )}
                  {selectedPlacement.genre && (
                    <div>
                      <p className="text-theme-foreground-muted text-xs">Genre</p>
                      <p className="text-theme-foreground font-medium">{selectedPlacement.genre}</p>
                    </div>
                  )}
                  {selectedPlacement.isrc && (
                    <div>
                      <p className="text-theme-foreground-muted text-xs">ISRC</p>
                      <p className="text-theme-foreground font-mono text-xs">{selectedPlacement.isrc}</p>
                    </div>
                  )}
                  {selectedPlacement.label && (
                    <div>
                      <p className="text-theme-foreground-muted text-xs">Label</p>
                      <p className="text-theme-foreground font-medium">{selectedPlacement.label}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Territories */}
              {selectedPlacement.topTerritories?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-theme-foreground mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-theme-primary" />
                    Top Territories
                  </h3>
                  <div className="space-y-2">
                    {selectedPlacement.topTerritories.map((t: any, idx: number) => {
                      const maxRevenue = selectedPlacement.topTerritories[0]?.revenue || 1;
                      const percentage = (t.revenue / maxRevenue) * 100;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-sm text-theme-foreground w-24 truncate">{t.territory}</span>
                          <div className="flex-1 h-2 bg-theme-card-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-theme-primary to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-emerald-500 w-24 text-right">{formatCurrency(t.revenue)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Earnings by Period */}
              {selectedPlacement.recentPeriods?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-theme-foreground mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-theme-primary" />
                    Recent Earnings
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedPlacement.recentPeriods.map((period: any, idx: number) => (
                      <div key={idx} className="bg-theme-card-hover rounded-xl p-3 text-center">
                        <p className="text-xs text-theme-foreground-muted mb-1">{formatPeriod(period.period)}</p>
                        <p className="text-lg font-bold text-emerald-500">{formatCurrency(period.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Credits */}
              {selectedPlacement.credits?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-theme-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-theme-primary" />
                    All Credits ({selectedPlacement.credits.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedPlacement.credits.map((credit: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-theme-card-hover rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-theme-primary">
                              {credit.firstName?.[0]}{credit.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-theme-foreground">
                              {credit.firstName} {credit.lastName}
                            </p>
                            {credit.role && (
                              <p className="text-xs text-theme-foreground-muted">{credit.role}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-lg font-bold text-theme-primary">{credit.splitPercentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Renamed: Work Registrations Section (previously PlacementsSection content)
function WorkRegistrationsSection() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'pending' | 'denied' | 'documents_requested'>('all');
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissedNotifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [uploadModalPlacement, setUploadModalPlacement] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['my-work-submissions'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/work-registration/my-submissions`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
  });

  const allSubmissions = submissionsData?.submissions || [];
  const approvedPlacements = allSubmissions.filter((s: any) => s.status === 'APPROVED');
  const pendingPlacements = allSubmissions.filter((s: any) => s.status === 'PENDING');
  const deniedPlacements = allSubmissions.filter((s: any) => s.status === 'DENIED');
  const documentsRequestedPlacements = allSubmissions.filter((s: any) => s.status === 'DOCUMENTS_REQUESTED');

  const recentNotifications = allSubmissions
    .filter((s: any) => s.reviewedAt && s.status !== 'PENDING' && !dismissedNotifications.includes(s.id))
    .sort((a: any, b: any) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())
    .slice(0, 5);

  const dismissNotification = (id: string) => {
    const updated = [...dismissedNotifications, id];
    setDismissedNotifications(updated);
    localStorage.setItem('dismissedNotifications', JSON.stringify(updated));
  };

  const handleDocumentUpload = async () => {
    if (!uploadFile || !uploadModalPlacement) return;

    setIsUploading(true);
    try {
      await documentApi.upload(uploadFile, {
        category: 'OTHER',
        description: uploadDescription || `Document for placement: ${uploadModalPlacement.songTitle || 'Work submission'}`,
        visibility: 'USER_SPECIFIC',
        placementId: uploadModalPlacement.id,
      });
      toast.success('Document uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-work-submissions'] });
      setUploadModalPlacement(null);
      setUploadFile(null);
      setUploadDescription('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredSubmissions = activeFilter === 'all' ? allSubmissions :
    activeFilter === 'approved' ? approvedPlacements :
    activeFilter === 'pending' ? pendingPlacements :
    activeFilter === 'denied' ? deniedPlacements :
    documentsRequestedPlacements;

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
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full border border-emerald-200 font-semibold">Approved</span>;
      case 'DENIED':
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full border border-red-200 font-semibold">Denied</span>;
      case 'DOCUMENTS_REQUESTED':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full border border-amber-200 font-semibold">Documents Requested</span>;
      case 'PENDING':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full border border-blue-200 font-semibold">Pending Review</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200 font-semibold">{status}</span>;
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 py-12">Loading submissions...</div>;
  }

  return (
    <>
      {/* Recent Notifications */}
      {recentNotifications.length > 0 && (
        <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-100 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" /> Recent Updates
          </h4>
          <div className="space-y-3">
            {recentNotifications.map((notification: any) => (
              <div key={notification.id} className="flex items-start gap-4 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-gray-900 font-medium text-sm">{notification.title}</p>
                    {getStatusBadge(notification.status)}
                  </div>
                  <p className="text-gray-500 text-xs mb-1">{notification.artist}</p>
                  {notification.status === 'DENIED' && notification.denialReason && (
                    <p className="text-red-600 text-sm mt-2">Reason: {notification.denialReason}</p>
                  )}
                  {notification.status === 'DOCUMENTS_REQUESTED' && notification.documentsRequested && (
                    <p className="text-amber-600 text-sm mt-2">Requested: {notification.documentsRequested}</p>
                  )}
                  {notification.status === 'APPROVED' && notification.caseNumber && (
                    <p className="text-emerald-600 text-sm mt-2 font-mono">Case: {notification.caseNumber}</p>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">{formatDate(notification.reviewedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notification.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
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
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All ({allSubmissions.length})
        </button>
        <button
          onClick={() => setActiveFilter('approved')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeFilter === 'approved'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Approved ({approvedPlacements.length})
        </button>
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeFilter === 'pending'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Pending ({pendingPlacements.length})
        </button>
        <button
          onClick={() => setActiveFilter('documents_requested')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeFilter === 'documents_requested'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Docs Requested ({documentsRequestedPlacements.length})
        </button>
        <button
          onClick={() => setActiveFilter('denied')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeFilter === 'denied'
              ? 'bg-red-500 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Denied ({deniedPlacements.length})
        </button>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 mb-4">
            <ClipboardList className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-xl font-semibold text-gray-900 mb-2">No Submissions</h4>
          <p className="text-gray-500 mb-6">
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
              className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div
                className="p-6 cursor-pointer"
                onClick={(e) => toggleExpand(claim.id, e)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {claim?.albumArtUrl && (
                      <img
                        src={claim.albumArtUrl}
                        alt={claim?.albumName || claim?.title || 'Album art'}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 truncate">{claim?.title || 'Untitled'}</h4>
                      <p className="text-sm text-gray-500">{claim?.artist || 'Unknown Artist'}</p>
                      {claim?.albumName && (
                        <p className="text-xs text-gray-400 mt-1">{claim.albumName}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getStatusBadge(claim?.status || 'PENDING')}
                        {claim?.caseNumber && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded border border-purple-200 font-mono">
                            {claim.caseNumber}
                          </span>
                        )}
                      </div>
                      {claim?.status === 'DENIED' && claim?.denialReason && (
                        <div className="mt-2 text-red-600 text-xs">
                          <span className="font-semibold">Reason:</span> {claim.denialReason}
                        </div>
                      )}
                      {claim?.status === 'DOCUMENTS_REQUESTED' && claim?.documentsRequested && (
                        <div className="mt-2">
                          <div className="text-amber-600 text-xs mb-2">
                            <span className="font-semibold">Requested:</span> {claim.documentsRequested}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadModalPlacement(claim);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs rounded-lg border border-amber-200 transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload Documents
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors ml-4">
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

              {expandedId === claim.id && claim && (
                <div className="px-6 pb-6 border-t border-gray-100 bg-gray-50/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Platform</p>
                      <p className="text-sm text-gray-900 font-medium">{claim?.platform || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Release Date</p>
                      <p className="text-sm text-gray-900 font-medium">{formatDate(claim?.releaseDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Submitted</p>
                      <p className="text-sm text-gray-900 font-medium">{formatDate(claim?.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Approved</p>
                      <p className="text-sm text-gray-900 font-medium">{formatDate(claim?.reviewedAt)}</p>
                    </div>
                  </div>

                  {claim?.credits && Array.isArray(claim.credits) && claim.credits.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" /> Collaborators & Credits ({claim.credits.length})
                      </h5>
                      <div className="space-y-2">
                        {claim.credits.map((credit: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-gray-900 font-medium text-sm">
                                  {credit?.firstName || ''} {credit?.lastName || 'Unknown'}
                                </p>
                                {credit?.isPrimary && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded border border-purple-200">Primary</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="text-gray-500">{credit?.role || 'N/A'}</span>
                                {credit?.pro && <span className="text-gray-400">PRO: {credit.pro}</span>}
                                {credit?.ipiNumber && <span className="text-gray-400 font-mono">IPI: {credit.ipiNumber}</span>}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold text-emerald-600">{Number(credit?.splitPercentage) || 0}%</p>
                              <p className="text-xs text-gray-400">Split</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {claim?.documents && Array.isArray(claim.documents) && claim.documents.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-blue-500" /> Uploaded Documents ({claim.documents.length})
                      </h5>
                      <div className="space-y-2">
                        {claim.documents.map((doc: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex-1 min-w-0 mr-4">
                              <p className="text-gray-900 text-sm font-medium truncate">{doc?.originalName || 'Untitled Document'}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs border border-blue-200">
                                  {doc?.category || 'N/A'}
                                </span>
                                <span className="text-gray-400 text-xs">{formatFileSize(doc?.fileSize || 0)}</span>
                                <span className="text-gray-400 text-xs">{formatDate(doc?.uploadedAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {claim?.notes && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-700 mb-1">Notes:</p>
                      <p className="text-sm text-gray-900">{claim.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document Upload Modal */}
      {uploadModalPlacement && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Upload Documents
              </h3>
              <button
                onClick={() => {
                  setUploadModalPlacement(null);
                  setUploadFile(null);
                  setUploadDescription('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700 font-medium mb-2">Requested Documents:</p>
              <div className="space-y-1.5">
                {uploadModalPlacement.documentsRequested?.split('\n').filter((line: string) => line.trim()).map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                    <div className="w-4 h-4 rounded border border-amber-300 flex-shrink-0 mt-0.5" />
                    <span>{item.trim()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                />
                {uploadFile && (
                  <p className="mt-2 text-xs text-gray-500">
                    Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Add a note about this document..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setUploadModalPlacement(null);
                    setUploadFile(null);
                    setUploadDescription('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDocumentUpload}
                  disabled={!uploadFile || isUploading}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
        <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
        {!isEditing && user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            Edit IPI Numbers
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* User Info Section */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Account Information</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <p className="text-gray-900">
                {user?.firstName || user?.lastName
                  ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
              <p className="text-gray-900">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* IPI Numbers Section */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">IPI/CAE Numbers</h4>
          <p className="text-sm text-gray-500 mb-6">
            Your IPI (Interested Party Information) numbers help us accurately match your royalty statements.
            {user?.role === 'WRITER' && ' Writers typically have a Writer IPI number.'}
            {user?.role === 'PUBLISHER' && ' Publishers typically have a Publisher IPI number.'}
          </p>

          <div className="space-y-4">
            {/* Writer IPI Number - only for WRITER role */}
            {user?.role === 'WRITER' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Writer IPI Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.writerIpiNumber}
                    onChange={(e) => setFormData({ ...formData, writerIpiNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your Writer IPI/CAE Number"
                  />
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900">
                    {user?.writerIpiNumber ? (
                      formatIpiDisplay(user.writerIpiNumber)
                    ) : (
                      <span className="text-gray-400">Not set - Contact administrator</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Publisher IPI Number - for both WRITER and PUBLISHER roles */}
            {(user?.role === 'WRITER' || user?.role === 'PUBLISHER') && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Publisher IPI Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.publisherIpiNumber}
                    onChange={(e) => setFormData({ ...formData, publisherIpiNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your Publisher IPI/CAE Number"
                  />
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900">
                    {user?.publisherIpiNumber ? (
                      formatIpiDisplay(user.publisherIpiNumber)
                    ) : (
                      <span className="text-gray-400">Not set - Contact administrator</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Publisher Legal Name - for ALL roles when set */}
            {user?.publisherName && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Publisher Legal Name
                </label>
                <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900">
                  {user.publisherName}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl border border-gray-200 font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">My Documents</h3>
      <p className="text-sm text-gray-500 mb-6">
        Access your contracts, statements, and other important documents
      </p>

      {isLoading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : documentsData?.documents?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentsData.documents.map((doc: any) => (
            <div
              key={doc.id}
              className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all"
            >
              {/* Document Icon & Name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</h4>
                  <p className="text-xs text-gray-400 mt-1">{formatFileSize(doc.fileSize)}</p>
                </div>
              </div>

              {/* Description */}
              {doc.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{doc.description}</p>
              )}

              {/* Category Badge */}
              <div className="mb-3">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  {getCategoryLabel(doc.category)}
                </span>
              </div>

              {/* Upload Date */}
              <p className="text-xs text-gray-400 mb-4">
                Uploaded: {formatDate(doc.createdAt)}
              </p>

              {/* Download Button */}
              <button
                onClick={() => handleDownload(doc.id, doc.originalName)}
                className="w-full px-4 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600">No documents available yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Documents will appear here when your admin uploads them
          </p>
        </div>
      )}
    </div>
  );
}

// Hero card for Total Earnings - Clean fintech design
function HeroEarningsCard({ value, trend }: { value: number; trend: number }) {
  // Split the value into whole and decimal parts for styling
  const wholePart = Math.floor(value).toLocaleString('en-US');
  const decimalPart = (value % 1).toFixed(2).slice(1); // Gets ".XX"

  // Generate chart data for the hero card
  const chartData = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    revenue: Math.max(0, value * (0.3 + (i / 11) * 0.7) * (0.85 + Math.random() * 0.3)),
  }));

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Content */}
      <div className="relative z-10">
        <p className="text-sm font-medium text-gray-500 mb-1">Balance</p>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-3xl sm:text-4xl font-bold text-gray-900">${wholePart}</span>
          <span className="text-xl sm:text-2xl font-bold text-gray-400">{decimalPart}</span>
          {/* Trend badge */}
          <span className="ml-2 inline-flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend > 0 ? '+' : ''}{trend.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Integrated area chart */}
      <div className="h-36 sm:h-28 -mx-4 sm:-mx-6 mb-0 sm:-mb-2">
        <RechartsRevenueChart
          data={chartData}
          height={144}
          color="#22C55E"
          gradientId="heroEarningsGradient"
          lightMode={true}
          showGrid={false}
        />
      </div>
    </div>
  );
}

// Stat card - Clean fintech design
function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  trend?: number;
}) {
  // Color configurations for the clean light theme
  const colorConfig = {
    blue: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-500',
      trendBg: 'bg-blue-50',
      trendColor: 'text-blue-600',
    },
    green: {
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-500',
      trendBg: 'bg-emerald-50',
      trendColor: 'text-emerald-600',
    },
    purple: {
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-500',
      trendBg: 'bg-purple-50',
      trendColor: 'text-purple-600',
    },
    orange: {
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
      trendBg: 'bg-orange-50',
      trendColor: 'text-orange-600',
    },
  };

  const config = colorConfig[color];
  const updateDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Top row: Icon + Title */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${config.iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.iconColor}`} />
        </div>
        <span className="text-xs sm:text-sm font-medium text-gray-500">{title}</span>
      </div>

      {/* Value row with trend badge */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold ${config.trendBg} ${config.trendColor} px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full`}>
            +{trend}%
          </span>
        )}
      </div>

      {/* Update timestamp */}
      <p className="text-[10px] sm:text-xs text-gray-400">
        Update: {updateDate}
      </p>
    </div>
  );
}

function PaymentStatusIndicator({ status }: { status: any }) {
  const getStatusConfig = () => {
    switch (status.status) {
      case 'RECENT':
        return {
          color: 'bg-emerald-500',
          borderColor: 'border-emerald-200',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          icon: '🟢',
          label: 'Paid'
        };
      case 'PENDING':
        return {
          color: 'bg-amber-500',
          borderColor: 'border-amber-200',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          icon: '🟡',
          label: 'Pending'
        };
      case 'NONE':
      default:
        return {
          color: 'bg-red-500',
          borderColor: 'border-red-200',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          icon: '🔴',
          label: 'No Payments'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-2xl p-4`}>
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
          <p className="text-sm font-medium text-gray-900">
            Payment Status: <span className={`font-bold ${config.textColor}`}>{config.label}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {status.status === 'PENDING' ? 'You have a payment pending' : status.message}
          </p>
        </div>

        {/* Additional Info - Show dollar amount instead of count */}
        {(status.unpaidAmount > 0 || status.pendingAmount > 0) && (
          <div className="flex-shrink-0 text-right">
            {status.unpaidAmount > 0 && (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-red-600">
                  ${Number(status.unpaidAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span> unpaid
              </p>
            )}
            {status.pendingAmount > 0 && (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-amber-600">
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Light theme color schemes for PRO types
  const proColors: Record<string, { bg: string; accent: string; text: string }> = {
    BMI: { bg: 'bg-blue-50', accent: 'border-blue-200', text: 'text-blue-700' },
    ASCAP: { bg: 'bg-emerald-50', accent: 'border-emerald-200', text: 'text-emerald-700' },
    SESAC: { bg: 'bg-purple-50', accent: 'border-purple-200', text: 'text-purple-700' },
    MLC: { bg: 'bg-orange-50', accent: 'border-orange-200', text: 'text-orange-700' },
    GMR: { bg: 'bg-pink-50', accent: 'border-pink-200', text: 'text-pink-700' },
  };

  const statusColors: Record<string, string> = {
    PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    UPLOADED: 'bg-amber-100 text-amber-700 border-amber-200',
    PROCESSING: 'bg-blue-100 text-blue-700 border-blue-200',
    ERROR: 'bg-red-100 text-red-700 border-red-200',
  };

  const currentProColor = proColors[statement.proType] || proColors.BMI;

  const formatPeriod = (statement: any) => {
    // Try period range first
    if (statement.periodStart && statement.periodEnd) {
      const start = new Date(statement.periodStart);
      const end = new Date(statement.periodEnd);
      return `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    // Fall back to statementPeriod string (e.g., "Q1 2024")
    if (statement.statementPeriod) {
      return statement.statementPeriod;
    }
    // Fall back to upload date
    if (statement.uploadDate) {
      const uploadDate = new Date(statement.uploadDate);
      return `Uploaded ${uploadDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return 'Date not available';
  };

  const handleExpand = async () => {
    if (!isExpanded && !hasLoaded) {
      setIsLoading(true);
      try {
        const response = await statementApi.getMyStatementItems(statement.id);
        setItems(response.data.items || []);
        setHasLoaded(true);
      } catch (error) {
        console.error('Failed to load statement items:', error);
        toast.error('Failed to load song details');
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    statementApi.exportMyStatement(statement.id);
    toast.success('Downloading statement...');
  };

  return (
    <div className={`${currentProColor.bg} ${currentProColor.accent} border rounded-xl overflow-hidden hover:shadow-md transition-all`}>
      {/* Header - Clickable to expand */}
      <div
        className="p-5 cursor-pointer"
        onClick={handleExpand}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className={`text-lg font-bold ${currentProColor.text}`}>{statement.proType}</h4>
            <p className="text-xs text-gray-500 mt-1">{formatPeriod(statement)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[statement.status] || statusColors.UPLOADED}`}>
              {statement.status}
            </span>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              title="Download CSV"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Songs:</span>
            <span className="text-gray-900 font-medium">{statement.itemCount || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Performances:</span>
            <span className="text-gray-900 font-medium">{Number(statement.totalPerformances || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="text-gray-500">Net Revenue:</span>
            <span className="text-emerald-600 font-bold text-lg">
              ${Number(statement.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Expand indicator */}
        <div className="flex items-center justify-center mt-4 text-gray-400">
          <span className="text-xs mr-1">{isExpanded ? 'Hide' : 'View'} Songs</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded song list */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white">
          {isLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
              <p className="text-xs text-gray-500 mt-2">Loading songs...</p>
            </div>
          ) : items.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left text-gray-500 font-medium px-4 py-2">Song</th>
                    <th className="text-right text-gray-500 font-medium px-4 py-2">Perfs</th>
                    <th className="text-right text-gray-500 font-medium px-4 py-2">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <p className="text-gray-900 truncate max-w-[180px]" title={item.workTitle}>
                          {item.workTitle}
                        </p>
                        {item.territory && (
                          <p className="text-xs text-gray-400">{item.territory}</p>
                        )}
                      </td>
                      <td className="text-right text-gray-600 px-4 py-2">
                        {Number(item.performances || 0).toLocaleString()}
                      </td>
                      <td className="text-right text-emerald-600 font-medium px-4 py-2">
                        ${Number(item.netRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm">
              No song details available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
