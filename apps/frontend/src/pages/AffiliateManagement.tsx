import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import {
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Download,
  MoreVertical,
  CheckCircle,
  Clock,
} from 'lucide-react';

export default function AffiliateManagement() {
  const [activeTab, setActiveTab] = useState<'overview' | 'affiliates' | 'payouts' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Mock data - will be replaced with real API data
  const programStats = {
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalReferrals: 0,
    totalCommissions: 0,
    pendingPayouts: 0,
    conversionRate: 0,
  };

  const affiliates: any[] = [];
  const pendingPayouts: any[] = [];

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
                  Manage the affiliate program, track referrals, and process payouts.
                </p>
              </div>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2">
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
                <p className="text-3xl font-bold text-white mb-1">{programStats.totalAffiliates}</p>
                <p className="text-sm text-text-secondary">Total Affiliates</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{programStats.totalReferrals}</p>
                <p className="text-sm text-text-secondary">Total Referrals</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">${programStats.totalCommissions.toFixed(2)}</p>
                <p className="text-sm text-text-secondary">Total Commissions Paid</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{programStats.conversionRate}%</p>
                <p className="text-sm text-text-secondary">Avg Conversion Rate</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(['overview', 'affiliates', 'payouts', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
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
                {/* Top Affiliates */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Top Performing Affiliates</h2>
                  {affiliates.length > 0 ? (
                    <div className="space-y-4">
                      {affiliates.slice(0, 5).map((affiliate: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-blue to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {affiliate.name?.charAt(0) || '#'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{affiliate.name}</p>
                              <p className="text-xs text-text-secondary">{affiliate.referrals} referrals</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-semibold">${affiliate.earnings?.toFixed(2) || '0.00'}</p>
                            <p className="text-xs text-text-secondary">earnings</p>
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

                {/* Pending Payouts */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Pending Payouts</h2>
                    <span className="text-sm text-amber-400 font-semibold">${programStats.pendingPayouts.toFixed(2)} pending</span>
                  </div>
                  {pendingPayouts.length > 0 ? (
                    <div className="space-y-4">
                      {pendingPayouts.map((payout: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-amber-400" />
                            <div>
                              <p className="text-white">{payout.affiliateName}</p>
                              <p className="text-xs text-text-secondary">{payout.requestDate}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-semibold">${payout.amount?.toFixed(2)}</span>
                            <button className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-all">
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
                      <p className="text-text-secondary">No pending payouts</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'affiliates' && (
              <div className="space-y-6">
                {/* Search and Filter */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search affiliates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-brand-blue/50"
                    />
                  </div>
                  <button className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filter
                  </button>
                </div>

                {/* Affiliates Table */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Affiliate</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Referrals</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Conversions</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Earnings</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Status</th>
                          <th className="text-left px-6 py-4 text-sm font-semibold text-text-secondary">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {affiliates.length > 0 ? (
                          affiliates.map((affiliate: any, index: number) => (
                            <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                    {affiliate.name?.charAt(0) || '#'}
                                  </div>
                                  <span className="text-white">{affiliate.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-white">{affiliate.referrals || 0}</td>
                              <td className="px-6 py-4 text-white">{affiliate.conversions || 0}</td>
                              <td className="px-6 py-4 text-green-400">${affiliate.earnings?.toFixed(2) || '0.00'}</td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  affiliate.status === 'active'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {affiliate.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                                  <MoreVertical className="w-4 h-4 text-text-secondary" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <Users className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
                              <p className="text-text-secondary">No affiliates found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payouts' && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Payout History</h2>
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
                  <p className="text-text-secondary">No payout history yet</p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Program Settings</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Signup Bonus (Tour Miles)</label>
                      <input
                        type="number"
                        defaultValue={100}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50"
                      />
                      <p className="text-xs text-text-secondary mt-1">Points awarded when a referral signs up</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Conversion Bonus (Tour Miles)</label>
                      <input
                        type="number"
                        defaultValue={250}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50"
                      />
                      <p className="text-xs text-text-secondary mt-1">Points awarded when a referral makes their first contribution</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Commission Rate (%)</label>
                      <input
                        type="number"
                        defaultValue={5}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50"
                      />
                      <p className="text-xs text-text-secondary mt-1">Percentage of referral's earnings paid as commission</p>
                    </div>

                    <button className="px-6 py-3 bg-gradient-to-r from-brand-blue to-purple-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all">
                      Save Settings
                    </button>
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
