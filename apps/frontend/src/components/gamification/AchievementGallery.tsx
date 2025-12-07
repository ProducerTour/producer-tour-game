import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AchievementCard from './AchievementCard';
import { getAuthToken } from '../../lib/api';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  tier: string;
  category: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

export default function AchievementGallery() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  const { data: achievements, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/achievements`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch achievements');
      return response.json() as Promise<Achievement[]>;
    },
  });

  const categories = ['ALL', 'SOCIAL', 'PLATFORM', 'REVENUE', 'COMMUNITY', 'ENGAGEMENT', 'MILESTONE'];

  const filteredAchievements = achievements?.filter((achievement) => {
    if (selectedCategory !== 'ALL' && achievement.category !== selectedCategory) {
      return false;
    }
    if (showUnlockedOnly && !achievement.unlocked) {
      return false;
    }
    return true;
  });

  const stats = {
    total: achievements?.length || 0,
    unlocked: achievements?.filter(a => a.unlocked).length || 0,
    totalPoints: achievements?.reduce((sum, a) => a.unlocked ? sum + a.points : sum, 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading achievements...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Stats Header - Mobile: 2x2 grid, Desktop: 3 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6 w-full max-w-full">
        <div className="bg-white/5 border border-blue-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 min-w-0 overflow-hidden">
          <div className="text-[11px] sm:text-sm text-text-secondary mb-0.5 sm:mb-1">Unlocked</div>
          <div className="text-lg sm:text-2xl font-bold text-white">
            {stats.unlocked} / {stats.total}
          </div>
          <div className="text-[10px] sm:text-xs text-blue-400 mt-0.5 sm:mt-1">
            {Math.round((stats.unlocked / stats.total) * 100)}% Complete
          </div>
        </div>

        <div className="bg-white/5 border border-amber-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 min-w-0 overflow-hidden">
          <div className="text-[11px] sm:text-sm text-text-secondary mb-0.5 sm:mb-1">Points Earned</div>
          <div className="text-lg sm:text-2xl font-bold text-white">{stats.totalPoints} TM</div>
          <div className="text-[10px] sm:text-xs text-amber-400 mt-0.5 sm:mt-1">From achievements</div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white/5 border border-purple-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 min-w-0 overflow-hidden">
          <div className="text-[11px] sm:text-sm text-text-secondary mb-0.5 sm:mb-1">Remaining</div>
          <div className="text-lg sm:text-2xl font-bold text-white">{stats.total - stats.unlocked}</div>
          <div className="text-[10px] sm:text-xs text-purple-400 mt-0.5 sm:mt-1">To unlock</div>
        </div>
      </div>

      {/* Filters - Mobile optimized with horizontal scroll */}
      <div className="flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-6 w-full max-w-full overflow-hidden">
        {/* Category Filter - horizontal scroll on mobile */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide sm:flex-wrap w-full">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                ${selectedCategory === category
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white/10 text-text-secondary hover:bg-white/20 border border-white/10'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Unlocked Only Toggle */}
        <button
          onClick={() => setShowUnlockedOnly(!showUnlockedOnly)}
          className={`
            px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-sm font-medium transition-all self-start
            ${showUnlockedOnly
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-white/10 text-text-secondary hover:bg-white/20 border border-white/10'
            }
          `}
        >
          {showUnlockedOnly ? '✓ Unlocked Only' : 'Show All'}
        </button>
      </div>

      {/* Achievement Grid - 2 cols mobile, 3 cols tablet, 4 cols desktop */}
      {filteredAchievements && filteredAchievements.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 w-full max-w-full">
          {filteredAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
          <div className="text-6xl mb-4">🏆</div>
          <div className="text-lg text-white">No achievements found</div>
          <div className="text-sm mt-2">Try adjusting your filters</div>
        </div>
      )}
    </div>
  );
}
