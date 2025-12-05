import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { getAuthToken } from '../../lib/api';
import { UserAvatarWithBorder } from '../UserAvatarWithBorder';

const TIER_COLORS = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  DIAMOND: '#B9F2FF',
  ELITE: '#9333EA'
};

const TIER_EMOJIS = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  DIAMOND: '💎',
  ELITE: '👑'
};

interface LeaderboardEntry {
  id: string;
  points: number;
  totalEarned: number;
  tier: string;
  currentStreak: number;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    profilePhotoUrl: string | null;
  };
}

export default function Leaderboard() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['gamification-leaderboard', selectedTier, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (selectedTier) {
        params.append('tier', selectedTier);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/leaderboard?${params}`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json() as Promise<LeaderboardEntry[]>;
    },
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankBadge = (index: number) => {
    if (index < 3) {
      const colors = ['bg-gradient-to-r from-yellow-400 to-yellow-600', 'bg-gradient-to-r from-gray-300 to-gray-500', 'bg-gradient-to-r from-amber-500 to-amber-700'];
      return (
        <div className={`${colors[index]} text-white font-bold rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-lg text-sm sm:text-base`}>
          {index + 1}
        </div>
      );
    }
    return (
      <div className="bg-slate-700 text-slate-300 font-semibold rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base">
        {index + 1}
      </div>
    );
  };

  const getUserDisplayName = (entry: LeaderboardEntry) => {
    if (entry.user.firstName && entry.user.lastName) {
      return `${entry.user.firstName} ${entry.user.lastName}`;
    }
    return 'Anonymous Producer';
  };

  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-xl font-bold text-white mb-0.5 sm:mb-1">Leaderboard</h3>
            <p className="text-xs sm:text-sm text-slate-400">See how you rank</p>
          </div>
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
        </div>

        {/* Filters - horizontally scrollable on mobile */}
        <div className="flex gap-1.5 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap">
          <button
            onClick={() => setSelectedTier(null)}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              selectedTier === null
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            All
          </button>
          {tiers.map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                selectedTier === tier
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span>{TIER_EMOJIS[tier as keyof typeof TIER_EMOJIS]}</span>
              <span className="hidden sm:inline">{tier}</span>
            </button>
          ))}
        </div>

        {/* Limit Selector */}
        <div className="mt-2 sm:mt-3 flex gap-1.5 sm:gap-2 items-center">
          <span className="text-xs sm:text-sm text-slate-400">Show:</span>
          {[10, 25, 50, 100].map((n) => (
            <button
              key={n}
              onClick={() => setLimit(n)}
              className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded text-[11px] sm:text-sm ${
                limit === n
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      {leaderboard && leaderboard.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`
                rounded-lg sm:rounded-xl p-2.5 sm:p-4 transition-all
                ${index < 3
                  ? 'bg-gradient-to-r from-slate-800/50 to-slate-900/50 border sm:border-2'
                  : 'bg-slate-800/30 border border-slate-700'
                }
                ${index === 0 ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/20' : ''}
                ${index === 1 ? 'border-gray-400/50 shadow-lg shadow-gray-400/20' : ''}
                ${index === 2 ? 'border-amber-600/50 shadow-lg shadow-amber-600/20' : ''}
                hover:bg-slate-800/60
              `}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Top row on mobile: Rank + Avatar + Points */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0">
                    {getRankBadge(index)}
                  </div>

                  {/* Rank Icon (for top 3) */}
                  {index < 3 && (
                    <div className="flex-shrink-0 hidden sm:block">
                      {getRankIcon(index)}
                    </div>
                  )}

                  {/* User Avatar with Border */}
                  <UserAvatarWithBorder
                    userId={entry.user.id}
                    firstName={entry.user.firstName || undefined}
                    lastName={entry.user.lastName || undefined}
                    profilePhotoUrl={entry.user.profilePhotoUrl}
                    size="sm"
                  />

                  {/* User Info - Mobile condensed */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-white truncate text-sm sm:text-base">
                        {getUserDisplayName(entry)}
                      </h4>
                      <div className="flex items-center gap-1">
                        <span className="text-base sm:text-lg">{TIER_EMOJIS[entry.tier as keyof typeof TIER_EMOJIS]}</span>
                        <span
                          className="text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded hidden sm:inline"
                          style={{
                            backgroundColor: `${TIER_COLORS[entry.tier as keyof typeof TIER_COLORS]}20`,
                            color: TIER_COLORS[entry.tier as keyof typeof TIER_COLORS]
                          }}
                        >
                          {entry.tier}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-400">
                      <span className="truncate">Lifetime: {entry.totalEarned.toLocaleString()} TM</span>
                      {entry.currentStreak > 0 && (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          🔥 {entry.currentStreak}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0 ml-auto">
                    <div className="text-xl sm:text-2xl font-bold text-yellow-400">
                      {entry.points.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 hidden sm:block">Tour Miles</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Trophy className="w-16 h-16 mb-4 opacity-20" />
          <div className="text-lg mb-2">No entries found</div>
          <div className="text-sm">Be the first to earn points in this tier!</div>
        </div>
      )}
    </div>
  );
}
