import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../../../lib/api';
import { Trophy, Medal, Crown, Loader2, TrendingUp } from 'lucide-react';
import type { WidgetProps } from '../../../types/productivity.types';

interface LeaderboardEntry {
  userId: string;
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
    profilePhotoUrl?: string;
  };
  points: number;
  tier: string;
  rank: number;
}

/**
 * LeaderboardWidget - Tour Miles leaderboard
 *
 * Features:
 * - Top performers by Tour Miles points
 * - Tier badges
 * - Rank indicators with medals
 * - Points display
 */
export default function LeaderboardWidget({ config: _config, isEditing: _isEditing }: WidgetProps) {
  // Fetch leaderboard data
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['gamification-leaderboard'],
    queryFn: async () => {
      const response = await gamificationApi.getLeaderboard({ limit: 10 });
      return response.data as LeaderboardEntry[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-300" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="w-4 text-center text-xs text-theme-foreground-muted">{rank}</span>;
    }
  };

  // Get tier color
  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      ELITE: 'text-purple-400 bg-purple-500/20',
      DIAMOND: 'text-cyan-400 bg-cyan-500/20',
      GOLD: 'text-yellow-400 bg-yellow-500/20',
      SILVER: 'text-gray-300 bg-gray-500/20',
      BRONZE: 'text-amber-600 bg-amber-500/20',
    };
    return colors[tier] || 'text-white/60 bg-white/10';
  };

  // Get initials
  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return '?';
  };

  // Format points
  const formatPoints = (points: number) => {
    if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
    if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
    return points.toString();
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
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-theme-foreground">Tour Miles Leaders</span>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {!leaderboard || leaderboard.length === 0 ? (
          <div className="text-center py-4 text-theme-foreground-muted text-sm">
            No leaderboard data yet
          </div>
        ) : (
          leaderboard.map((entry, index) => {
            const rank = index + 1;
            const isTopThree = rank <= 3;

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                  isTopThree ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {/* Rank */}
                <div className="w-6 flex justify-center">
                  {getRankIcon(rank)}
                </div>

                {/* Avatar */}
                {entry.user.profilePhotoUrl ? (
                  <img
                    src={entry.user.profilePhotoUrl}
                    alt={entry.user.firstName || 'User'}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-theme-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-theme-primary">
                      {getInitials(entry.user.firstName, entry.user.lastName, entry.user.email)}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-theme-foreground truncate block">
                    {entry.user.firstName && entry.user.lastName
                      ? `${entry.user.firstName} ${entry.user.lastName}`
                      : entry.user.email.split('@')[0]}
                  </span>
                </div>

                {/* Tier Badge */}
                <span className={`text-xs px-1.5 py-0.5 rounded ${getTierColor(entry.tier)}`}>
                  {entry.tier}
                </span>

                {/* Points */}
                <div className="flex items-center gap-1 text-sm font-medium text-theme-foreground">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  {formatPoints(entry.points)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
