import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productivityApi } from '../../../lib/api';
import { useSocket } from '../../../hooks/useSocket';
import {
  UserPlus, FileCheck, DollarSign, Music, Award, TrendingUp,
  Upload, CheckCircle, XCircle, Loader2, Bell
} from 'lucide-react';
import type { WidgetProps, PlatformActivity } from '../../../types/productivity.types';

/**
 * ActivityFeedWidget - Live feed of platform activity
 *
 * Features:
 * - Real-time updates via WebSocket
 * - Activity type icons and colors
 * - Relative timestamps
 * - Filter by activity type
 */
export default function ActivityFeedWidget({ config: _config, isEditing: _isEditing }: WidgetProps) {
  const { socket } = useSocket();
  const [realtimeActivities, setRealtimeActivities] = useState<PlatformActivity[]>([]);

  // Fetch initial activities
  const { data: activities, isLoading } = useQuery({
    queryKey: ['productivity-activity'],
    queryFn: async () => {
      const response = await productivityApi.getActivity(15);
      return response.data as PlatformActivity[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Listen for real-time activity updates
  useEffect(() => {
    if (!socket) return;

    socket.emit('admin:join-activity-room');

    const handleNewActivity = (activity: PlatformActivity) => {
      setRealtimeActivities(prev => [activity, ...prev].slice(0, 5));
    };

    socket.on('activity:new', handleNewActivity);

    return () => {
      socket.off('activity:new', handleNewActivity);
    };
  }, [socket]);

  // Combine realtime and fetched activities
  const allActivities = [...realtimeActivities, ...(activities || [])].slice(0, 15);

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
      USER_SIGNUP: { icon: <UserPlus className="w-3.5 h-3.5" />, color: 'text-green-400 bg-green-500/20' },
      PLACEMENT_CREATED: { icon: <Music className="w-3.5 h-3.5" />, color: 'text-blue-400 bg-blue-500/20' },
      PLACEMENT_APPROVED: { icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-green-400 bg-green-500/20' },
      PLACEMENT_DENIED: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-400 bg-red-500/20' },
      STATEMENT_UPLOADED: { icon: <Upload className="w-3.5 h-3.5" />, color: 'text-purple-400 bg-purple-500/20' },
      STATEMENT_PROCESSED: { icon: <FileCheck className="w-3.5 h-3.5" />, color: 'text-purple-400 bg-purple-500/20' },
      PAYMENT_SENT: { icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-yellow-400 bg-yellow-500/20' },
      PAYOUT_COMPLETED: { icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-green-400 bg-green-500/20' },
      ACHIEVEMENT_UNLOCKED: { icon: <Award className="w-3.5 h-3.5" />, color: 'text-orange-400 bg-orange-500/20' },
      TIER_UP: { icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-cyan-400 bg-cyan-500/20' },
    };
    return iconMap[type] || { icon: <Bell className="w-3.5 h-3.5" />, color: 'text-white/60 bg-white/10' };
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Format activity message
  const formatActivityMessage = (activity: PlatformActivity) => {
    const actor = activity.actorName || 'Someone';
    const target = activity.targetName || '';

    const messages: Record<string, string> = {
      USER_SIGNUP: `${actor} joined the platform`,
      PLACEMENT_CREATED: `${actor} submitted a new placement${target ? `: ${target}` : ''}`,
      PLACEMENT_APPROVED: `Placement approved${target ? `: ${target}` : ''}`,
      PLACEMENT_DENIED: `Placement denied${target ? `: ${target}` : ''}`,
      STATEMENT_UPLOADED: `${actor} uploaded a statement`,
      STATEMENT_PROCESSED: `Statement processed${target ? `: ${target}` : ''}`,
      PAYMENT_SENT: `Payment sent to ${target || actor}`,
      PAYOUT_COMPLETED: `Payout completed for ${target || actor}`,
      ACHIEVEMENT_UNLOCKED: `${actor} unlocked an achievement`,
      TIER_UP: `${actor} leveled up to ${target}`,
    };

    return messages[activity.activityType] || `${actor} performed ${activity.activityType}`;
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
        <span className="text-xs text-theme-foreground-muted uppercase tracking-wide">
          Live Activity
        </span>
        {realtimeActivities.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {allActivities.length === 0 ? (
          <div className="text-center py-4 text-theme-foreground-muted text-sm">
            No recent activity
          </div>
        ) : (
          allActivities.map((activity, index) => {
            const { icon, color } = getActivityIcon(activity.activityType);
            const isNew = realtimeActivities.some(a => a.id === activity.id);

            return (
              <div
                key={activity.id || index}
                className={`flex items-start gap-2 p-2 rounded-lg transition-all ${
                  isNew ? 'bg-theme-primary/10 border border-theme-primary/20' : 'bg-white/5'
                }`}
              >
                {/* Icon */}
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${color}`}>
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-theme-foreground line-clamp-2">
                    {formatActivityMessage(activity)}
                  </p>
                  <span className="text-xs text-theme-foreground-muted">
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
