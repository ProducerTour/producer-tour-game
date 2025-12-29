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
  const { data: affiliateDetail } = useQuery({
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
      {/* Background Effects - Cassette Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-theme-primary-10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-theme-primary-5 rounded-full blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>

      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 md:pt-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-light text-theme-foreground mb-2">Affiliate Management</h1>
                <p className="text-theme-foreground-muted">
                  Manage the affiliate program, track referrals, and view commissions.
                </p>
              </div>
              <button
                onClick={handleExportReport}
                className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black text-sm font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300 border-t-2 border-t-theme-primary">
                <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2">Total Affiliates</p>
                    <p className="text-3xl font-light text-theme-foreground">
                      {statsLoading ? '...' : stats.totalAffiliates.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-theme-primary" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300 border-t-2 border-t-theme-primary">
                <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2">Total Referrals</p>
                    <p className="text-3xl font-light text-theme-foreground">
                      {statsLoading ? '...' : stats.totalReferrals.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-theme-primary" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300 border-t-2 border-t-theme-primary">
                <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2">Revenue from Referrals</p>
                    <p className="text-3xl font-light text-theme-primary">
                      ${statsLoading ? '...' : stats.totalRevenueFromReferrals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-theme-primary" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300 border-t-2 border-t-theme-primary">
                <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2">Conversion Rate</p>
                    <p className="text-3xl font-light text-theme-foreground">
                      {statsLoading ? '...' : stats.conversionRate}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-theme-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
              {(['overview', 'affiliates', 'orders', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                    setSelectedAffiliate(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium uppercase tracking-wider whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? 'bg-theme-primary text-black'
                      : 'text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-card-hover'
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
                  <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-theme-primary-10 flex items-center justify-center">
                        <Award className="w-4 h-4 text-theme-primary" />
                      </div>
                      <span className="text-xs text-theme-foreground-muted uppercase tracking-wider">Tour Miles Earned</span>
                    </div>
                    <p className="text-2xl font-light text-theme-foreground">
                      {statsLoading ? '...' : stats.totalTourMilesEarned.toLocaleString()} TM
                    </p>
                  </div>
                  <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-theme-primary-10 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-theme-primary" />
                      </div>
                      <span className="text-xs text-theme-foreground-muted uppercase tracking-wider">Referred Orders</span>
                    </div>
                    <p className="text-2xl font-light text-theme-foreground">
                      {statsLoading ? '...' : stats.totalOrdersWithReferral.toLocaleString()}
                    </p>
                  </div>
                  <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-theme-primary-10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-theme-primary" />
                      </div>
                      <span className="text-xs text-theme-foreground-muted uppercase tracking-wider">Conversions</span>
                    </div>
                    <p className="text-2xl font-light text-theme-foreground">
                      {statsLoading ? '...' : stats.totalConversions.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Top Affiliates */}
                <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                  <h2 className="text-lg font-light text-theme-foreground mb-4">Top Performing Affiliates</h2>
                  {affiliatesLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-theme-primary-20 border-t-theme-primary rounded-full animate-spin mx-auto" />
                    </div>
                  ) : affiliates.length > 0 ? (
                    <div className="space-y-3">
                      {affiliates.slice(0, 5).map((affiliate, index) => (
                        <div
                          key={affiliate.id}
                          className="flex items-center justify-between p-3 bg-theme-input hover:bg-theme-card-hover cursor-pointer transition-all"
                          onClick={() => setSelectedAffiliate(affiliate.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-theme-primary-10 flex items-center justify-center text-theme-primary font-medium text-sm">
                              {index + 1}
                            </div>
                            <div className="w-10 h-10 bg-theme-primary-20 flex items-center justify-center text-theme-primary font-medium">
                              {affiliate.name?.charAt(0) || '#'}
                            </div>
                            <div>
                              <p className="text-theme-foreground font-medium">{affiliate.name}</p>
                              <p className="text-xs text-theme-foreground-muted">
                                {affiliate.totalReferrals} referrals · {affiliate.conversions} conversions
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className="text-theme-primary font-light text-lg">
                                ${affiliate.revenueFromReferrals.toFixed(2)}
                              </p>
                              <p className="text-xs text-theme-foreground-muted">revenue</p>
                            </div>
                            <div>
                              <p className={`font-medium ${getTierColor(affiliate.tier)}`}>
                                {affiliate.tourMilesEarned.toLocaleString()} TM
                              </p>
                              <p className="text-xs text-theme-foreground-muted">{affiliate.tier.toLowerCase()}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-theme-foreground-muted" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-theme-foreground-muted/30 mx-auto mb-3" />
                      <p className="text-theme-foreground-muted">No affiliates yet</p>
                    </div>
                  )}
                </div>

                {/* How It Works */}
                <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                  <h2 className="text-lg font-light text-theme-foreground mb-6">How the Affiliate Program Works</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center flex-shrink-0">
                        <span className="text-theme-primary font-medium">1</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-theme-foreground mb-1">Referral Sign Up</h3>
                        <p className="text-sm text-theme-foreground-muted">
                          When someone signs up using an affiliate's link, the affiliate earns <span className="text-theme-primary">+100 Tour Miles</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center flex-shrink-0">
                        <span className="text-theme-primary font-medium">2</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-theme-foreground mb-1">First Purchase</h3>
                        <p className="text-sm text-theme-foreground-muted">
                          When the referred user makes their first purchase, the affiliate earns <span className="text-theme-primary">+250 Tour Miles</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center flex-shrink-0">
                        <span className="text-theme-primary font-medium">3</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-theme-foreground mb-1">Order Tracking</h3>
                        <p className="text-sm text-theme-foreground-muted">
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
                      className="flex items-center gap-2 text-theme-foreground-muted hover:text-theme-primary transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to Affiliates
                    </button>

                    <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-theme-primary-20 flex items-center justify-center text-theme-primary text-2xl font-medium">
                            {affiliateDetail.user.name?.charAt(0) || '#'}
                          </div>
                          <div>
                            <h2 className="text-xl font-light text-theme-foreground">{affiliateDetail.user.name}</h2>
                            <p className="text-theme-foreground-muted">{affiliateDetail.user.email}</p>
                            <p className={`text-sm font-medium ${getTierColor(affiliateDetail.user.tier)}`}>
                              {affiliateDetail.user.tier} Tier · {affiliateDetail.user.totalPoints.toLocaleString()} TM
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-theme-foreground-muted uppercase tracking-wider mb-1">Referral Code</p>
                          <code className="text-theme-primary font-mono">{affiliateDetail.user.referralCode}</code>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-theme-input p-4">
                          <p className="text-2xl font-light text-theme-foreground">{affiliateDetail.stats.totalReferrals}</p>
                          <p className="text-xs text-theme-foreground-muted">Total Referrals</p>
                        </div>
                        <div className="bg-theme-input p-4">
                          <p className="text-2xl font-light text-theme-primary">{affiliateDetail.stats.conversions}</p>
                          <p className="text-xs text-theme-foreground-muted">Conversions</p>
                        </div>
                        <div className="bg-theme-input p-4">
                          <p className="text-2xl font-light text-theme-foreground">{affiliateDetail.stats.totalOrders}</p>
                          <p className="text-xs text-theme-foreground-muted">Orders</p>
                        </div>
                        <div className="bg-theme-input p-4">
                          <p className="text-2xl font-light text-theme-primary">${affiliateDetail.stats.totalRevenue.toFixed(2)}</p>
                          <p className="text-xs text-theme-foreground-muted">Revenue</p>
                        </div>
                        <div className="bg-theme-input p-4">
                          <p className="text-2xl font-light text-purple-400">{affiliateDetail.stats.tourMilesEarned.toLocaleString()}</p>
                          <p className="text-xs text-theme-foreground-muted">Tour Miles Earned</p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Events */}
                    <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                      <h3 className="text-lg font-light text-theme-foreground mb-4">Recent Activity</h3>
                      {affiliateDetail.recentEvents.length > 0 ? (
                        <div className="space-y-3">
                          {affiliateDetail.recentEvents.map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-theme-input">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-theme-primary-10 flex items-center justify-center">
                                  {event.type === 'REFERRAL_SIGNUP' ? (
                                    <Users className="w-4 h-4 text-theme-primary" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 text-theme-primary" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-theme-foreground text-sm">{event.description}</p>
                                  <p className="text-xs text-theme-foreground-muted">
                                    {new Date(event.date).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-theme-primary font-medium">+{event.points} TM</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-theme-foreground-muted text-center py-4">No recent activity</p>
                      )}
                    </div>

                    {/* Referred Orders */}
                    <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                      <h3 className="text-lg font-light text-theme-foreground mb-4">Referred Orders</h3>
                      {affiliateDetail.referredOrders.length > 0 ? (
                        <div className="space-y-3">
                          {affiliateDetail.referredOrders.map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between p-3 bg-theme-input">
                              <div>
                                <p className="text-theme-foreground font-medium">{order.orderNumber}</p>
                                <p className="text-xs text-theme-foreground-muted">
                                  {order.customerEmail} · {new Date(order.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-theme-primary font-light text-lg">${order.amount.toFixed(2)}</p>
                                <span className={`text-xs px-2 py-0.5 ${
                                  order.status === 'COMPLETED' ? 'bg-theme-primary-10 text-theme-primary' : 'bg-theme-input text-theme-foreground-secondary'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-theme-foreground-muted text-center py-4">No referred orders yet</p>
                      )}
                    </div>
                  </div>
                ) : (
                  // Affiliates List View
                  <>
                    {/* Search */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-theme-foreground-muted absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search affiliates by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus transition-colors"
                        />
                      </div>
                    </div>

                    {/* Affiliates Table */}
                    <div className="relative overflow-hidden bg-theme-card border border-theme-border">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-theme-border">
                              <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Affiliate</th>
                              <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Referral Code</th>
                              <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Referrals</th>
                              <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Conversions</th>
                              <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Revenue</th>
                              <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Tour Miles</th>
                              <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Tier</th>
                            </tr>
                          </thead>
                          <tbody>
                            {affiliatesLoading ? (
                              <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                  <div className="w-8 h-8 border-2 border-theme-primary-20 border-t-theme-primary rounded-full animate-spin mx-auto" />
                                </td>
                              </tr>
                            ) : affiliates.length > 0 ? (
                              affiliates.map((affiliate) => (
                                <tr
                                  key={affiliate.id}
                                  className="border-b border-theme-border hover:bg-theme-card-hover cursor-pointer transition-colors"
                                  onClick={() => setSelectedAffiliate(affiliate.id)}
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-theme-primary-10 flex items-center justify-center text-theme-primary text-sm font-medium">
                                        {affiliate.name?.charAt(0) || '#'}
                                      </div>
                                      <div>
                                        <span className="text-theme-foreground">{affiliate.name}</span>
                                        <p className="text-xs text-theme-foreground-muted">{affiliate.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <code className="text-theme-primary text-sm">{affiliate.referralCode}</code>
                                  </td>
                                  <td className="px-6 py-4 text-theme-foreground">{affiliate.totalReferrals}</td>
                                  <td className="px-6 py-4">
                                    <span className="text-theme-foreground">{affiliate.conversions}</span>
                                    <span className="text-theme-foreground-muted text-xs ml-1">
                                      ({affiliate.conversionRate}%)
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-theme-primary">${affiliate.revenueFromReferrals.toFixed(2)}</td>
                                  <td className="px-6 py-4 text-purple-400">{affiliate.tourMilesEarned.toLocaleString()}</td>
                                  <td className="px-6 py-4">
                                    <span className={`text-xs px-2 py-1 ${
                                      affiliate.tier === 'DIAMOND' ? 'bg-cyan-500/20 text-cyan-400' :
                                      affiliate.tier === 'ELITE' ? 'bg-purple-500/20 text-purple-400' :
                                      affiliate.tier === 'GOLD' ? 'bg-theme-primary-20 text-theme-primary' :
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
                                  <Users className="w-12 h-12 text-theme-foreground-muted/30 mx-auto mb-3" />
                                  <p className="text-theme-foreground-muted">No affiliates found</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-theme-border">
                          <p className="text-sm text-theme-foreground-muted">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="p-2 hover:bg-theme-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4 text-theme-foreground" />
                            </button>
                            <span className="text-theme-foreground text-sm px-3">
                              Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                              disabled={currentPage === pagination.totalPages}
                              className="p-2 hover:bg-theme-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 text-theme-foreground" />
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
                <div className="relative overflow-hidden bg-theme-card border border-theme-border">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                  <div className="p-6 border-b border-theme-border">
                    <h2 className="text-lg font-light text-theme-foreground">Orders from Referrals</h2>
                    <p className="text-sm text-theme-foreground-muted">All orders made using referral codes</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-theme-border">
                          <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Order</th>
                          <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Customer</th>
                          <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Referrer</th>
                          <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Code</th>
                          <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Status</th>
                          <th className="text-left px-6 py-4 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersLoading ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center">
                              <div className="w-8 h-8 border-2 border-theme-primary-20 border-t-theme-primary rounded-full animate-spin mx-auto" />
                            </td>
                          </tr>
                        ) : orders.length > 0 ? (
                          orders.map((order) => (
                            <tr key={order.id} className="border-b border-theme-border hover:bg-theme-card-hover transition-colors">
                              <td className="px-6 py-4 text-theme-foreground font-medium">{order.orderNumber}</td>
                              <td className="px-6 py-4 text-theme-foreground-muted text-sm">{order.email}</td>
                              <td className="px-6 py-4">
                                {order.referrer ? (
                                  <div>
                                    <p className="text-theme-foreground text-sm">{order.referrer.name}</p>
                                    <p className="text-xs text-theme-foreground-muted">{order.referrer.email}</p>
                                  </div>
                                ) : (
                                  <span className="text-theme-foreground-muted text-sm">Unknown</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <code className="text-theme-primary text-sm">{order.referralCode}</code>
                              </td>
                              <td className="px-6 py-4 text-theme-primary font-light text-lg">${order.totalAmount.toFixed(2)}</td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 ${
                                  order.status === 'COMPLETED' ? 'bg-theme-primary-10 text-theme-primary' : 'bg-theme-input text-theme-foreground-secondary'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-theme-foreground-muted text-sm">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center">
                              <ShoppingBag className="w-12 h-12 text-theme-foreground-muted/30 mx-auto mb-3" />
                              <p className="text-theme-foreground-muted">No referred orders yet</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {ordersPagination && ordersPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-theme-border">
                      <p className="text-sm text-theme-foreground-muted">
                        Showing {((ordersPagination.page - 1) * ordersPagination.limit) + 1} to{' '}
                        {Math.min(ordersPagination.page * ordersPagination.limit, ordersPagination.total)} of {ordersPagination.total}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 hover:bg-theme-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 text-theme-foreground" />
                        </button>
                        <span className="text-theme-foreground text-sm px-3">
                          Page {ordersPagination.page} of {ordersPagination.totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(ordersPagination.totalPages, p + 1))}
                          disabled={currentPage === ordersPagination.totalPages}
                          className="p-2 hover:bg-theme-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-theme-foreground" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
                  <h2 className="text-lg font-light text-theme-foreground mb-4">Program Settings</h2>
                  <p className="text-theme-foreground-muted mb-6">
                    Configure Tour Miles rewards for referral actions. These settings are managed in the gamification configuration.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-theme-input p-4">
                      <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">Signup Bonus</label>
                      <p className="text-2xl font-light text-theme-primary">+100 Tour Miles</p>
                      <p className="text-xs text-theme-foreground-muted mt-1">Awarded when a referral signs up</p>
                    </div>

                    <div className="bg-theme-input p-4">
                      <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">Conversion Bonus</label>
                      <p className="text-2xl font-light text-theme-primary">+250 Tour Miles</p>
                      <p className="text-xs text-theme-foreground-muted mt-1">Awarded when a referral makes their first purchase</p>
                    </div>

                    <div className="bg-theme-primary-5 border border-theme-primary-20 p-4">
                      <p className="text-theme-primary text-sm">
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
