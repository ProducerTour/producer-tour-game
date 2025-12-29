import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../../../lib/api';
import { Award, Lock, Loader2, Sparkles } from 'lucide-react';
import type { WidgetProps } from '../../../types/productivity.types';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  pointsReward: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  requirement?: number;
}

interface GamificationStats {
  achievements?: Achievement[];
  unlockedAchievements?: number;
  totalAchievements?: number;
}

/**
 * AchievementsWidget - Recent achievement unlocks
 *
 * Features:
 * - Shows unlocked achievements
 * - Progress towards locked achievements
 * - Achievement categories
 * - Points rewards
 */
export default function AchievementsWidget({ config: _config, isEditing: _isEditing }: WidgetProps) {
  // Fetch gamification stats (includes achievements)
  const { data: stats, isLoading } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getStats();
      return response.data as GamificationStats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get achievement icon emoji
  const getAchievementIcon = (icon: string, category: string) => {
    const iconMap: Record<string, string> = {
      star: '⭐',
      trophy: '🏆',
      medal: '🎖️',
      fire: '🔥',
      rocket: '🚀',
      crown: '👑',
      diamond: '💎',
      music: '🎵',
      money: '💰',
      heart: '❤️',
      lightning: '⚡',
      check: '✅',
    };

    const categoryDefaults: Record<string, string> = {
      MILESTONE: '🎯',
      ENGAGEMENT: '📊',
      SOCIAL: '👥',
      REVENUE: '💵',
      STREAK: '🔥',
    };

    return iconMap[icon] || categoryDefaults[category] || '🏅';
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Get recent unlocked achievements
  const recentUnlocked = stats?.achievements
    ?.filter(a => a.isUnlocked)
    ?.sort((a, b) => new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime())
    ?.slice(0, 5) || [];

  // Get in-progress achievements
  const inProgress = stats?.achievements
    ?.filter(a => !a.isUnlocked && a.progress && a.progress > 0)
    ?.sort((a, b) => (b.progress! / b.requirement!) - (a.progress! / a.requirement!))
    ?.slice(0, 3) || [];

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
          <Award className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-theme-foreground">Achievements</span>
        </div>
        {stats && (
          <span className="text-xs text-theme-foreground-muted">
            {stats.unlockedAchievements || 0}/{stats.totalAchievements || 0}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Recent Unlocks */}
        {recentUnlocked.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span className="text-xs text-theme-foreground-muted uppercase tracking-wide">
                Recently Unlocked
              </span>
            </div>
            <div className="space-y-1.5">
              {recentUnlocked.map(achievement => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
                >
                  <span className="text-lg">
                    {getAchievementIcon(achievement.icon, achievement.category)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-theme-foreground block truncate">
                      {achievement.name}
                    </span>
                    {achievement.unlockedAt && (
                      <span className="text-xs text-theme-foreground-muted">
                        {formatRelativeTime(achievement.unlockedAt)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-yellow-400 font-medium">
                    +{achievement.pointsReward}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In Progress */}
        {inProgress.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Lock className="w-3 h-3 text-theme-foreground-muted" />
              <span className="text-xs text-theme-foreground-muted uppercase tracking-wide">
                In Progress
              </span>
            </div>
            <div className="space-y-1.5">
              {inProgress.map(achievement => {
                const progress = achievement.progress || 0;
                const requirement = achievement.requirement || 1;
                const percentage = Math.min((progress / requirement) * 100, 100);

                return (
                  <div
                    key={achievement.id}
                    className="p-2 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg opacity-50">
                        {getAchievementIcon(achievement.icon, achievement.category)}
                      </span>
                      <span className="text-sm text-theme-foreground truncate flex-1">
                        {achievement.name}
                      </span>
                      <span className="text-xs text-theme-foreground-muted">
                        {progress}/{requirement}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-theme-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {recentUnlocked.length === 0 && inProgress.length === 0 && (
          <div className="text-center py-4 text-theme-foreground-muted text-sm">
            No achievements yet. Keep going!
          </div>
        )}
      </div>
    </div>
  );
}
