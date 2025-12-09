import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productivityApi } from '../../../lib/api';
import { Loader2, Flame } from 'lucide-react';
import type { WidgetProps, PomodoroStats } from '../../../types/productivity.types';

/**
 * EngagementHeatmapWidget - GitHub-style activity calendar
 *
 * Features:
 * - Visual calendar showing activity levels
 * - Color intensity based on activity count
 * - Tooltip with day details
 * - Last 12 weeks of data
 */
export default function EngagementHeatmapWidget({ config: _config, isEditing: _isEditing }: WidgetProps) {
  // Fetch pomodoro stats (has daily activity data)
  const { data: pomodoroStats, isLoading: pomodoroLoading } = useQuery({
    queryKey: ['productivity-pomodoro-stats', 90],
    queryFn: async () => {
      const response = await productivityApi.getPomodoroStats(90);
      return response.data as PomodoroStats;
    },
  });

  // Fetch goal stats (for future use in combined heatmap)
  useQuery({
    queryKey: ['productivity-goal-stats', 90],
    queryFn: async () => {
      const response = await productivityApi.getGoalStats(90);
      return response.data;
    },
  });

  // Generate heatmap data for last 12 weeks (84 days)
  const heatmapData = useMemo(() => {
    const data: { date: Date; count: number; level: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from 12 weeks ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 83);
    // Align to start of week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let i = 0; i < 84; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];

      // Combine activity from pomodoro sessions and goals
      let activityCount = 0;

      if (pomodoroStats?.dailyStats?.[dateKey]) {
        activityCount += pomodoroStats.dailyStats[dateKey].completed;
      }

      // Determine intensity level (0-4)
      let level = 0;
      if (activityCount > 0) level = 1;
      if (activityCount >= 3) level = 2;
      if (activityCount >= 6) level = 3;
      if (activityCount >= 10) level = 4;

      data.push({ date, count: activityCount, level });
    }

    return data;
  }, [pomodoroStats]);

  // Get color for activity level
  const getLevelColor = (level: number) => {
    const colors = [
      'bg-white/5',           // Level 0 - no activity
      'bg-green-900/50',      // Level 1 - low
      'bg-green-700/60',      // Level 2 - medium
      'bg-green-500/70',      // Level 3 - high
      'bg-green-400',         // Level 4 - very high
    ];
    return colors[level] || colors[0];
  };

  // Group data by weeks
  const weeks = useMemo(() => {
    const result: { date: Date; count: number; level: number }[][] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      result.push(heatmapData.slice(i, i + 7));
    }
    return result;
  }, [heatmapData]);

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; colStart: number }[] = [];
    let currentMonth = '';

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.toLocaleDateString('en-US', { month: 'short' });
        if (month !== currentMonth) {
          labels.push({ month, colStart: weekIndex });
          currentMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  // Calculate total activity
  const totalActivity = heatmapData.reduce((sum, day) => sum + day.count, 0);
  const activeDays = heatmapData.filter(day => day.count > 0).length;

  if (pomodoroLoading) {
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
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-theme-foreground">Activity</span>
        </div>
        <span className="text-xs text-theme-foreground-muted">
          {activeDays} active days
        </span>
      </div>

      {/* Month Labels */}
      <div className="flex mb-1 pl-6">
        {monthLabels.map((label, i) => (
          <span
            key={i}
            className="text-xs text-theme-foreground-muted"
            style={{
              marginLeft: i === 0 ? `${label.colStart * 12}px` : undefined,
              width: i < monthLabels.length - 1
                ? `${(monthLabels[i + 1].colStart - label.colStart) * 12}px`
                : 'auto'
            }}
          >
            {label.month}
          </span>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 text-xs text-theme-foreground-muted pr-1">
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">M</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">W</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">F</span>
            <span className="h-[10px]"></span>
          </div>

          {/* Week columns */}
          <div className="flex gap-0.5 flex-1 overflow-x-auto">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-[10px] h-[10px] rounded-sm ${getLevelColor(day.level)}
                      hover:ring-1 hover:ring-white/30 transition-all cursor-pointer`}
                    title={`${day.date.toLocaleDateString()}: ${day.count} activities`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
        <span className="text-xs text-theme-foreground-muted">
          {totalActivity} total activities
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-theme-foreground-muted">Less</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              className={`w-[10px] h-[10px] rounded-sm ${getLevelColor(level)}`}
            />
          ))}
          <span className="text-xs text-theme-foreground-muted">More</span>
        </div>
      </div>
    </div>
  );
}
