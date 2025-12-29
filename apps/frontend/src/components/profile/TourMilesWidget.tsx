import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plane,
  Flame,
  Trophy,
  ChevronRight,
  Loader2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { gamificationApi } from '../../lib/api';
import toast from 'react-hot-toast';

const TIER_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  BRONZE: { bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'from-amber-500 to-amber-600' },
  SILVER: { bg: 'bg-gray-100', text: 'text-gray-600', gradient: 'from-gray-400 to-gray-500' },
  GOLD: { bg: 'bg-yellow-100', text: 'text-yellow-700', gradient: 'from-yellow-400 to-yellow-500' },
  DIAMOND: { bg: 'bg-cyan-100', text: 'text-cyan-700', gradient: 'from-cyan-400 to-cyan-500' },
  ELITE: { bg: 'bg-purple-100', text: 'text-purple-700', gradient: 'from-purple-500 to-purple-600' },
};

const TIER_THRESHOLDS: Record<string, number> = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  DIAMOND: 15000,
  ELITE: 50000,
};

const getTierProgress = (points: number, tier: string) => {
  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'];
  const currentIndex = tiers.indexOf(tier);

  if (currentIndex === tiers.length - 1) {
    return 100;
  }

  const currentThreshold = TIER_THRESHOLDS[tier];
  const nextTier = tiers[currentIndex + 1];
  const nextThreshold = TIER_THRESHOLDS[nextTier];

  const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

const getNextTier = (tier: string) => {
  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'];
  const currentIndex = tiers.indexOf(tier);
  if (currentIndex === tiers.length - 1) return null;
  return tiers[currentIndex + 1];
};

const getPointsToNextTier = (points: number, tier: string) => {
  const nextTier = getNextTier(tier);
  if (!nextTier) return 0;
  return TIER_THRESHOLDS[nextTier] - points;
};

export function TourMilesWidget() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getStats();
      return response.data;
    },
  });

  const checkInMutation = useMutation({
    mutationFn: () => gamificationApi.checkIn(),
    onSuccess: (response) => {
      const pointsEarned = response.data?.pointsEarned || 10;
      toast.success(`+${pointsEarned} Tour Miles earned!`);
      queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        toast.error('Already checked in today!');
      } else {
        toast.error('Check-in failed. Try again later.');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 relative z-10">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const tier = stats.tier || 'BRONZE';
  const points = stats.points || 0;
  const currentStreak = stats.currentStreak || 0;
  const tierStyle = TIER_COLORS[tier] || TIER_COLORS.BRONZE;
  const progress = getTierProgress(points, tier);
  const nextTier = getNextTier(tier);
  const pointsToNext = getPointsToNextTier(points, tier);
  const canCheckIn = stats.canCheckInToday ?? true;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden relative z-10">
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${tierStyle.gradient} px-5 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Plane className="w-5 h-5" />
            <h3 className="font-semibold">Tour Miles</h3>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tierStyle.bg} ${tierStyle.text}`}>
            {tier}
          </span>
        </div>
      </div>

      {/* Points Display */}
      <div className="px-5 py-4">
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {points.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Tour Miles</div>
        </div>

        {/* Progress to Next Tier */}
        {nextTier && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{tier}</span>
              <span>{nextTier}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${tierStyle.gradient} transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1.5 text-center">
              <Sparkles className="w-3 h-3 inline mr-1" />
              {pointsToNext.toLocaleString()} miles to {nextTier}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
              <Flame className="w-4 h-4" />
              <span className="text-lg font-bold">{currentStreak}</span>
            </div>
            <div className="text-xs text-gray-500">Day Streak</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-lg font-bold">{stats.achievementCount || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Achievements</div>
          </div>
        </div>

        {/* Daily Check-in Button */}
        <button
          onClick={() => checkInMutation.mutate()}
          disabled={!canCheckIn || checkInMutation.isPending}
          className={`w-full py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            canCheckIn
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-[1.02]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {checkInMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : canCheckIn ? (
            <>
              <Sparkles className="w-4 h-4" />
              Daily Check-in
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Checked In Today
            </>
          )}
        </button>
      </div>

      {/* Footer Link */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
        <Link
          to="/tour-miles"
          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center justify-center gap-1"
        >
          View All Rewards
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
