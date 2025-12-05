import { Lock, CheckCircle } from 'lucide-react';

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

interface AchievementCardProps {
  achievement: Achievement;
}

const tierColors = {
  BRONZE: 'from-amber-700 to-amber-900',
  SILVER: 'from-gray-400 to-gray-600',
  GOLD: 'from-yellow-400 to-yellow-600',
  PLATINUM: 'from-purple-400 to-purple-600',
  DIAMOND: 'from-cyan-400 to-cyan-600',
};

const categoryIcons = {
  SOCIAL: '🌐',
  PLATFORM: '⚙️',
  REVENUE: '💰',
  COMMUNITY: '👥',
  ENGAGEMENT: '🔥',
  MILESTONE: '🏆',
};

export default function AchievementCard({ achievement }: AchievementCardProps) {
  const tierGradient = tierColors[achievement.tier as keyof typeof tierColors] || tierColors.BRONZE;
  const categoryIcon = categoryIcons[achievement.category as keyof typeof categoryIcons] || '🎯';

  return (
    <div
      className={`
        relative rounded-lg sm:rounded-xl p-3 sm:p-6 transition-all duration-300
        ${achievement.unlocked
          ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/50 sm:border-2 sm:border-blue-500 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40'
          : 'bg-slate-800/50 border border-slate-700 sm:border-2 opacity-60 hover:opacity-80'
        }
      `}
    >
      {/* Unlocked Badge */}
      {achievement.unlocked && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" />
        </div>
      )}

      {/* Locked Overlay */}
      {!achievement.unlocked && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <Lock className="w-4 h-4 sm:w-6 sm:h-6 text-slate-500" />
        </div>
      )}

      {/* Tier Badge */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
        <div className={`bg-gradient-to-r ${tierGradient} px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[9px] sm:text-xs font-bold text-white`}>
          {achievement.tier}
        </div>
      </div>

      {/* Achievement Icon */}
      <div className="flex justify-center mt-4 sm:mt-6 mb-2 sm:mb-4">
        <div
          className={`
            w-12 h-12 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-4xl
            ${achievement.unlocked
              ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg'
              : 'bg-slate-700 grayscale'
            }
          `}
        >
          {achievement.icon}
        </div>
      </div>

      {/* Achievement Name */}
      <h3 className={`text-xs sm:text-lg font-bold text-center mb-1 sm:mb-2 line-clamp-2 ${achievement.unlocked ? 'text-white' : 'text-slate-400'}`}>
        {achievement.name}
      </h3>

      {/* Achievement Description - hidden on mobile for space */}
      <p className={`text-xs sm:text-sm text-center mb-2 sm:mb-4 line-clamp-2 hidden sm:block ${achievement.unlocked ? 'text-slate-300' : 'text-slate-500'}`}>
        {achievement.description}
      </p>

      {/* Points and Category */}
      <div className="flex justify-between items-center pt-2 sm:pt-4 border-t border-slate-700">
        <div className="flex items-center gap-0.5 sm:gap-1">
          <span className="text-sm sm:text-xl">{categoryIcon}</span>
          <span className="text-[9px] sm:text-xs text-slate-400 capitalize hidden sm:inline">{achievement.category.toLowerCase()}</span>
        </div>
        <div className={`flex items-center gap-0.5 ${achievement.unlocked ? 'text-yellow-400' : 'text-slate-500'}`}>
          <span className="text-xs sm:text-sm font-bold">+{achievement.points}</span>
          <span className="text-[9px] sm:text-xs">TM</span>
        </div>
      </div>

      {/* Unlocked Date - hidden on mobile */}
      {achievement.unlocked && achievement.unlockedAt && (
        <div className="mt-2 sm:mt-3 text-center hidden sm:block">
          <p className="text-xs text-slate-400">
            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
