import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { gamificationApi } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import {
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Download,
  CheckCircle,
  ShoppingBag,
  Award,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalReferrals: number;
  totalConversions: number;
  conversionRate: number;
  totalOrdersWithReferral: number;
  totalRevenueFromReferrals: number;
  totalTourMilesEarned: number;
}

interface Affiliate {
  id: string;
  name: string;
  email: string;
  role: string;
  referralCode: string;
  tier: string;
  totalReferrals: number;
  conversions: number;
  conversionRate: number;
  ordersFromReferral: number;
  revenueFromReferrals: number;
  tourMilesEarned: number;
  joinedAt: string;
}

interface ReferredOrder {
  id: string;
  orderNumber: string;
  email: string;
  totalAmount: number;
  status: string;
  referralCode: string;
  createdAt: string;
  referrer: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function AffiliateManagement() {
  const [activeTab, setActiveTab] = useState<'overview' | 'affiliates' | 'orders' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

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

  // Fetch affiliate program stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['affiliate-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getAffiliateStats();
      return response.data as AffiliateStats;
    },
  });

  // Fetch affiliates list
  const { data: affiliatesData, isLoading: affiliatesLoading } = useQuery({
    queryKey: ['affiliates', currentPage, debouncedSearch],
    queryFn: async () => {
      const response = await gamificationApi.getAffiliates({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        sortBy: 'referrals',
        sortOrder: 'desc',
      });
      return response.data as {
        affiliates: Affiliate[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });

  // Fetch referred orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['affiliate-orders', currentPage],
    queryFn: async () => {
      const response = await gamificationApi.getAffiliateOrders({
        page: currentPage,
        limit: 20,
      });
      return response.data as {
        orders: ReferredOrder[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },
    enabled: activeTab === 'orders',
  });

  // Fetch affiliate detail
  const { data: affiliateDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['affiliate-detail', selectedAffiliate],
    queryFn: async () => {
      if (!selectedAffiliate) return null;
      const response = await gamificationApi.getAffiliateDetail(selectedAffiliate);
      return response.data;
    },
    enabled: !!selectedAffiliate,
  });

  const stats = statsData || {
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalReferrals: 0,
    totalConversions: 0,
    conversionRate: 0,
    totalOrdersWithReferral: 0,
    totalRevenueFromReferrals: 0,
    totalTourMilesEarned: 0,
  };

  const affiliates = affiliatesData?.affiliates || [];
  const pagination = affiliatesData?.pagination;
  const orders = ordersData?.orders || [];
  const ordersPagination = ordersData?.pagination;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'DIAMOND': return 'text-cyan-400';
      case 'ELITE': return 'text-purple-400';
      case 'GOLD': return 'text-yellow-400';
      case 'SILVER': return 'text-gray-300';
      default: return 'text-amber-600';
    }
  };

  const handleExportReport = () => {
    // Generate CSV data
    const headers = ['Name', 'Email', 'Referral Code', 'Tier', 'Referrals', 'Conversions', 'Revenue', 'Tour Miles'];
    const rows = affiliates.map(a => [
      a.name,
      a.email,
      a.referralCode,
      a.tier,
      a.totalReferrals.toString(),
      a.conversions.toString(),
      `$${a.revenueFromReferrals.toFixed(2)}`,
      a.tourMilesEarned.toString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `affiliate-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 md:pt-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Affiliate Management</h1>
                <p className="text-text-secondary">
                  Manage the affiliate program, track referrals, and view commissions.
                </p>
              </div>
              <button
                onClick={handleExportReport}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {statsLoading ? '...' : stats.totalAffiliates.toLocaleString()}
                </p>
                <p className="text-sm text-text-secondary">Total Affiliates</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {statsLoading ? '...' : stats.totalReferrals.toLocaleString()}
                </p>
                <p className="text-sm text-text-secondary">Total Referrals</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  ${statsLoading ? '...' : stats.totalRevenueFromReferrals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-text-secondary">Revenue from Referrals</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {statsLoading ? '...' : stats.conversionRate}%
                </p>
                <p className="text-sm text-text-secondary">Conversion Rate</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(['overview', 'affiliates', 'orders', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                    setSelectedAffiliate(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Additional Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Award className="w-5 h-5 text-brand-blue" />
                      <span className="text-sm text-text-secondary">Tour Miles Earned</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {statsLoading ? '...' : stats.totalTourMilesEarned.toLocaleString()} TM
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <ShoppingBag className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-text-secondary">Referred Orders</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {statsLoading ? '...' : stats.totalOrdersWithReferral.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-text-secondary">Conversions</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {statsLoading ? '...' : stats.totalConversions.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Top Affiliates */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Top Performing Affiliates</h2>
                  {affiliatesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-text-secondary">Loading...</p>
                    </div>
                  ) : affiliates.length > 0 ? (
                    <div className="space-y-4">
                      {affiliates.slice(0, 5).map((affiliate, index) => (
                        <div
                          key={affiliate.id}
                          className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 -mx-3 px-3 rounded-lg transition-all"
                          onClick={() => setSelectedAffiliate(affiliate.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-blue to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {affiliate.name?.charAt(0) || '#'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{affiliate.name}</p>
                              <p className="text-xs text-text-secondary">
                                {affiliate.totalReferrals} referrals · {affiliate.conversions} conversions
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className="text-green-400 font-semibold">
                                ${affiliate.revenueFromReferrals.toFixed(2)}
                              </p>
                              <p className="text-xs text-text-secondary">revenue</p>
                            </div>
                            <div>
                              <p className={`font-semibold ${getTierColor(affiliate.tier)}`}>
                                {affiliate.tourMilesEarned.toLocaleString()} TM
                              </p>
                              <p className="text-xs text-text-secondary">{affiliate.tier.toLowerCase()}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-text-secondary" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
                      <p className="text-text-secondary">No affiliates yet</p>
                    </div>
                  )}
                </div>

                {/* How It Works */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">How the Affiliate Program Works</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 font-bold">1</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">Referral Sign Up</h3>
                        <p className="text-sm text-text-secondary">
                          When someone signs up using an affiliate's link, the affiliate earns <span className="text-green-400">+100 Tour Miles</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 font-bold">2</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">First Purchase</h3>
                        <p className="text-sm text-text-secondary">
                          When the referred user makes their first purchase, the affiliate earns <span className="text-green-400">+250 Tour Miles</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-400 font-bold">3</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">Order Tracking</h3>
                        <p className="text-sm text-text-secondary">
                          All orders made by referred users with referral codes are tracked for reporting
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'affiliates' && (
              <div className="space-y-6">
                {selectedAffiliate && affiliateDetail ? (
                  // Affiliate Detail View
                  <div className="space-y-6">
                    <button
                      onClick={() => setSelectedAffiliate(null)}
                      className="flex items-center gap-2 text-text-secondary hover:text-white transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to Affiliates
                    </button>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-brand-blue to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                            {affiliateDetail.user.name?.charAt(0) || '#'}
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold text-white">{affiliateDetail.user.name}</h2>
                            <p className="text-text-secondary">{affiliateDetail.user.email}</p>
                            <p className={`text-sm font-medium ${getTierColor(affiliateDetail.user.tier)}`}>
                              {affiliateDetail.user.tier} Tier · {affiliateDetail.user.totalPoints.toLocaleString()} TM
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-text-secondary">Referral Code</p>
                          <code className="text-brand-blue font-mono">{affiliateDetail.user.referralCode}</code>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-2xl font-bold text-white">{affiliateDetail.stats.totalReferrals}</p>
                          <p className="text-xs text-text-secondary">Total Referrals</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-2xl font-bold text-green-400">{affiliateDetail.stats.conversions}</p>
                          <p className="text-xs text-text-secondary">Conversions</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-2xl font-bold text-white">{affiliateDetail.stats.totalOrders}</p>
                          <p className="text-xs text-text-secondary">Orders</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-2xl font-bold text-amber-400">${affiliateDetail.stats.totalRevenue.toFixed(2)}</p>
                          <p className="text-xs text-text-secondary">Revenue</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-2xl font-bold text-purple-400">{affiliateDetail.stats.tourMilesEarned.toLocaleString()}</p>
                          <p className="text-xs text-text-secondary">Tour Miles Earned</p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Events */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                      {affiliateDetail.recentEvents.length > 0 ? (
                        <div className="space-y-3">
                          {affiliateDetail.recentEvents.map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  event.type === 'REFERRAL_SIGNUP' ? 'bg-blue-500/20' : 'bg-green-500/20'
                                }`}>
                                  {event.type === 'REFERRAL_SIGNUP' ? (
                                    <Users className="w-4 h-4 text-blue-400" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white text-sm">{event.description}</p>
                                  <p className="text-xs text-text-secondary">
                                    {new Date(event.date).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-green-400 font-semibold">+{event.points} TM</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-text-secondary text-center py-4">No recent activity</p>
                      )}
                    </div>

                    {/* Referred Orders */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Referred Orders</h3>
                      {affiliateDetail.referredOrders.length > 0 ? (
                        <div className="space-y-3">
                          {affiliateDetail.referredOrders.map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                              <div>
                                <p className="text-white font-medium">{order.orderNumber}</p>
                                <p className="text-xs text-text-secondary">
                                  {order.customerEmail} · {new Date(order.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-green-400 font-semibold">${order.amount.toFixed(2)}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  order.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-text-secondary text-center py-4">No referred orders yet</p>
                      )}
                    </div>
                  </div>
                ) : (
                  // Affiliates List View
                  <>
                    {/* Search */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search affiliates by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-brand-blue/50"
                        />
                      </div>
                    </div>

                    {/* Affiliates Table */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Affiliate</th>
                              <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Referral Code</th>
                              <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Referrals</th>
                              <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Conversions</th>
                              <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Revenue</th>
                              <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Tour Miles</th>
                              <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Tier</th>
                            </tr>
                          </thead>
                          <tbody>
                            {affiliatesLoading ? (
                              <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-text-secondary">
                                  Loading...
                                </td>
                              </tr>
                            ) : affiliates.length > 0 ? (
                              affiliates.map((affiliate) => (
                                <tr
                                  key={affiliate.id}
                                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                                  onClick={() => setSelectedAffiliate(affiliate.id)}
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                        {affiliate.name?.charAt(0) || '#'}
                                      </div>
                                      <div>
                                        <span className="text-white">{affiliate.name}</span>
                                        <p className="text-xs text-text-secondary">{affiliate.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <code className="text-brand-blue text-sm">{affiliate.referralCode}</code>
                                  </td>
                                  <td className="px-6 py-4 text-white">{affiliate.totalReferrals}</td>
                                  <td className="px-6 py-4">
                                    <span className="text-white">{affiliate.conversions}</span>
                                    <span className="text-text-secondary text-xs ml-1">
                                      ({affiliate.conversionRate}%)
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-green-400">${affiliate.revenueFromReferrals.toFixed(2)}</td>
                                  <td className="px-6 py-4 text-purple-400">{affiliate.tourMilesEarned.toLocaleString()}</td>
                                  <td className="px-6 py-4">
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      affiliate.tier === 'DIAMOND' ? 'bg-cyan-500/20 text-cyan-400' :
                                      affiliate.tier === 'ELITE' ? 'bg-purple-500/20 text-purple-400' :
                                      affiliate.tier === 'GOLD' ? 'bg-yellow-500/20 text-yellow-400' :
                                      affiliate.tier === 'SILVER' ? 'bg-gray-500/20 text-gray-400' :
                                      'bg-amber-500/20 text-amber-600'
                                    }`}>
                                      {affiliate.tier}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                  <Users className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
                                  <p className="text-text-secondary">No affiliates found</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                          <p className="text-sm text-text-secondary">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="w-4 h-4 text-white" />
                            </button>
                            <span className="text-white text-sm px-3">
                              Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                              disabled={currentPage === pagination.totalPages}
                              className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Orders from Referrals</h2>
                    <p className="text-sm text-text-secondary">All orders made using referral codes</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Order</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Customer</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Referrer</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Code</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Amount</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Status</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersLoading ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-text-secondary">
                              Loading...
                            </td>
                          </tr>
                        ) : orders.length > 0 ? (
                          orders.map((order) => (
                            <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="px-6 py-4 text-white font-medium">{order.orderNumber}</td>
                              <td className="px-6 py-4 text-text-secondary text-sm">{order.email}</td>
                              <td className="px-6 py-4">
                                {order.referrer ? (
                                  <div>
                                    <p className="text-white text-sm">{order.referrer.name}</p>
                                    <p className="text-xs text-text-secondary">{order.referrer.email}</p>
                                  </div>
                                ) : (
                                  <span className="text-text-secondary text-sm">Unknown</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <code className="text-brand-blue text-sm">{order.referralCode}</code>
                              </td>
                              <td className="px-6 py-4 text-green-400 font-semibold">${order.totalAmount.toFixed(2)}</td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  order.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-text-secondary text-sm">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center">
                              <ShoppingBag className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
                              <p className="text-text-secondary">No referred orders yet</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {ordersPagination && ordersPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                      <p className="text-sm text-text-secondary">
                        Showing {((ordersPagination.page - 1) * ordersPagination.limit) + 1} to{' '}
                        {Math.min(ordersPagination.page * ordersPagination.limit, ordersPagination.total)} of {ordersPagination.total}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-white text-sm px-3">
                          Page {ordersPagination.page} of {ordersPagination.totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(ordersPagination.totalPages, p + 1))}
                          disabled={currentPage === ordersPagination.totalPages}
                          className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Program Settings</h2>
                  <p className="text-text-secondary mb-6">
                    Configure Tour Miles rewards for referral actions. These settings are managed in the gamification configuration.
                  </p>

                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-xl p-4">
                      <label className="block text-sm font-medium text-white mb-2">Signup Bonus</label>
                      <p className="text-2xl font-bold text-green-400">+100 Tour Miles</p>
                      <p className="text-xs text-text-secondary mt-1">Awarded when a referral signs up</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4">
                      <label className="block text-sm font-medium text-white mb-2">Conversion Bonus</label>
                      <p className="text-2xl font-bold text-green-400">+250 Tour Miles</p>
                      <p className="text-xs text-text-secondary mt-1">Awarded when a referral makes their first purchase</p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                      <p className="text-amber-400 text-sm">
                        <strong>Note:</strong> To modify these values, update the gamification configuration in the admin dashboard under Tour Miles &gt; Settings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
