import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../../../lib/api';
import { Users, Share2, DollarSign, Loader2, TrendingUp, Copy, Check } from 'lucide-react';
import type { WidgetProps } from '../../../types/productivity.types';

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  successfulConversions: number;
  pendingReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  recentReferrals: {
    id: string;
    userName: string;
    status: string;
    createdAt: string;
    earnings?: number;
  }[];
}

/**
 * ReferralScoreboardWidget - Referral performance tracking
 *
 * Features:
 * - Referral code with copy button
 * - Total referrals and conversions
 * - Conversion rate visualization
 * - Recent referral activity
 */
export default function ReferralScoreboardWidget({ config: _config, isEditing }: WidgetProps) {
  const [copied, setCopied] = useState(false);

  // Fetch referral stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['gamification-referral-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getReferralStats();
      return response.data as ReferralStats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Copy referral code
  const handleCopyCode = async () => {
    if (stats?.referralCode) {
      await navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return 'text-green-400 bg-green-500/20';
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'SIGNED_UP':
        return 'text-blue-400 bg-blue-500/20';
      default:
        return 'text-white/60 bg-white/10';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-theme-foreground">Referrals</span>
        </div>
      </div>

      {/* Referral Code */}
      {stats?.referralCode && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-theme-primary/10 border border-theme-primary/20 mb-3">
          <span className="text-xs text-theme-foreground-muted">Your Code:</span>
          <span className="font-mono font-bold text-theme-primary flex-1">
            {stats.referralCode}
          </span>
          <button
            onClick={handleCopyCode}
            disabled={isEditing}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-theme-foreground-muted" />
            )}
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-white/5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-lg font-bold text-theme-foreground block">
            {stats?.totalReferrals || 0}
          </span>
          <span className="text-xs text-theme-foreground-muted">Total</span>
        </div>
        <div className="p-2 rounded-lg bg-white/5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          </div>
          <span className="text-lg font-bold text-theme-foreground block">
            {stats?.conversionRate || 0}%
          </span>
          <span className="text-xs text-theme-foreground-muted">Conversion</span>
        </div>
        <div className="p-2 rounded-lg bg-white/5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Check className="w-3.5 h-3.5 text-green-400" />
          </div>
          <span className="text-lg font-bold text-theme-foreground block">
            {stats?.successfulConversions || 0}
          </span>
          <span className="text-xs text-theme-foreground-muted">Converted</span>
        </div>
        <div className="p-2 rounded-lg bg-white/5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <span className="text-lg font-bold text-theme-foreground block">
            {formatCurrency(stats?.totalEarnings || 0)}
          </span>
          <span className="text-xs text-theme-foreground-muted">Earned</span>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="flex-1 overflow-y-auto">
        <span className="text-xs text-theme-foreground-muted uppercase tracking-wide mb-2 block">
          Recent Activity
        </span>
        <div className="space-y-1.5">
          {(!stats?.recentReferrals || stats.recentReferrals.length === 0) ? (
            <div className="text-center py-2 text-theme-foreground-muted text-sm">
              No referrals yet. Share your code!
            </div>
          ) : (
            stats.recentReferrals.slice(0, 4).map(referral => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5"
              >
                <span className="text-sm text-theme-foreground truncate">
                  {referral.userName}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(referral.status)}`}>
                  {referral.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
