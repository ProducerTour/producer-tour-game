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
        <div className="text-slate-400">Loading achievements...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/40 rounded-xl p-4">
          <div className="text-sm text-slate-400 mb-1">Unlocked</div>
          <div className="text-2xl font-bold text-white">
            {stats.unlocked} / {stats.total}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {Math.round((stats.unlocked / stats.total) * 100)}% Complete
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/40 rounded-xl p-4">
          <div className="text-sm text-slate-400 mb-1">Points Earned</div>
          <div className="text-2xl font-bold text-white">{stats.totalPoints} TM</div>
          <div className="text-xs text-slate-400 mt-1">From achievements</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/40 rounded-xl p-4">
          <div className="text-sm text-slate-400 mb-1">Remaining</div>
          <div className="text-2xl font-bold text-white">{stats.total - stats.unlocked}</div>
          <div className="text-xs text-slate-400 mt-1">To unlock</div>
        </div>
      </div>

      {/* Filters - Mobile optimized with horizontal scroll */}
      <div className="flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-6">
        {/* Category Filter - horizontal scroll on mobile */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                ${selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
              ? 'bg-green-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }
          `}
        >
          {showUnlockedOnly ? '✓ Unlocked Only' : 'Show All'}
        </button>
      </div>

      {/* Achievement Grid - 2 cols mobile, 3 cols tablet, 4 cols desktop */}
      {filteredAchievements && filteredAchievements.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {filteredAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <div className="text-6xl mb-4">🏆</div>
          <div className="text-lg">No achievements found</div>
          <div className="text-sm mt-2">Try adjusting your filters</div>
        </div>
      )}
    </div>
  );
}
