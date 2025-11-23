import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { gamificationApi } from '../lib/api';
import { successToast, errorToast } from '../lib/toast';
import {
  Users,
  Link as LinkIcon,
  Copy,
  DollarSign,
  TrendingUp,
  UserPlus,
  CheckCircle,
  Twitter,
  Facebook,
  Mail,
} from 'lucide-react';

export default function AffiliatesDashboard() {

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

  // Fetch gamification stats to get referral code
  const { data: stats } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getStats();
      return response.data;
    },
  });

  // Generate referral link
  const referralCode = stats?.referralCode || '';
  const referralLink = referralCode ? `${window.location.origin}/apply?ref=${referralCode}` : '';

  // Copy link to clipboard
  const copyToClipboard = async () => {
    if (referralLink) {
      try {
        await navigator.clipboard.writeText(referralLink);
        successToast('Referral link copied to clipboard!');
      } catch {
        errorToast('Failed to copy link');
      }
    }
  };

  // Share functions
  const shareOnTwitter = () => {
    const text = encodeURIComponent('Join me on Producer Tour and start earning from your music! Use my referral link:');
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(referralLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareByEmail = () => {
    const subject = encodeURIComponent('Join Producer Tour');
    const body = encodeURIComponent(`Hey! I've been using Producer Tour to manage my music royalties and thought you might be interested. Sign up using my referral link: ${referralLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Mock data for now - will be replaced with real API data
  const affiliateStats = {
    totalReferrals: 0,
    activeReferrals: 0,
    pendingReferrals: 0,
    totalEarnings: 0,
    pendingPayout: 0,
    conversionRate: 0,
  };

  const recentReferrals: any[] = [];

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[100px]" />
      </div>

      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 md:pt-8">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Affiliate Program</h1>
              <p className="text-text-secondary">
                Earn Tour Miles and commissions by referring new artists to Producer Tour.
              </p>
            </div>

            {/* Referral Link Card */}
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Your Referral Link</h2>
                  <p className="text-sm text-text-secondary">Share this link to earn rewards</p>
                </div>
              </div>

              {referralLink ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <code className="text-sm text-blue-300 break-all">{referralLink}</code>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Share Buttons */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary">Share:</span>
                    <button
                      onClick={shareOnTwitter}
                      className="p-2 bg-white/5 hover:bg-[#1DA1F2]/20 rounded-lg transition-all group"
                      title="Share on Twitter"
                    >
                      <Twitter className="w-5 h-5 text-text-secondary group-hover:text-[#1DA1F2]" />
                    </button>
                    <button
                      onClick={shareOnFacebook}
                      className="p-2 bg-white/5 hover:bg-[#4267B2]/20 rounded-lg transition-all group"
                      title="Share on Facebook"
                    >
                      <Facebook className="w-5 h-5 text-text-secondary group-hover:text-[#4267B2]" />
                    </button>
                    <button
                      onClick={shareByEmail}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all group"
                      title="Share via Email"
                    >
                      <Mail className="w-5 h-5 text-text-secondary group-hover:text-white" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-text-secondary">Loading your referral link...</p>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{affiliateStats.totalReferrals}</p>
                <p className="text-sm text-text-secondary">Total Referrals</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{affiliateStats.activeReferrals}</p>
                <p className="text-sm text-text-secondary">Active Referrals</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">${affiliateStats.totalEarnings.toFixed(2)}</p>
                <p className="text-sm text-text-secondary">Total Earnings</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{affiliateStats.conversionRate}%</p>
                <p className="text-sm text-text-secondary">Conversion Rate</p>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Share Your Link</h3>
                    <p className="text-sm text-text-secondary">Share your unique referral link with other artists and producers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-green-400 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">They Sign Up</h3>
                    <p className="text-sm text-text-secondary">When someone signs up using your link, you earn +100 Tour Miles.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Earn Commissions</h3>
                    <p className="text-sm text-text-secondary">Earn +250 Tour Miles when they make their first contribution.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Referrals */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Referrals</h2>
              {recentReferrals.length > 0 ? (
                <div className="space-y-4">
                  {recentReferrals.map((referral: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-text-secondary" />
                        </div>
                        <div>
                          <p className="text-white">{referral.name}</p>
                          <p className="text-xs text-text-secondary">{referral.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          referral.status === 'converted'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {referral.status === 'converted' ? 'Converted' : 'Pending'}
                        </span>
                        <span className="text-sm font-semibold text-green-400">+{referral.points} TP</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
                  <p className="text-text-secondary">No referrals yet</p>
                  <p className="text-sm text-text-secondary mt-1">Share your link to start earning!</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
