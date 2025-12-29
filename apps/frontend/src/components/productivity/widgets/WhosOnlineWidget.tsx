import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productivityApi } from '../../../lib/api';
import { useSocket } from '../../../hooks/useSocket';
import { Users, Circle, Loader2, Crown } from 'lucide-react';
import type { WidgetProps, OnlineUsersResponse } from '../../../types/productivity.types';

/**
 * WhosOnlineWidget - Real-time view of users currently on the platform
 *
 * Features:
 * - Live user count with WebSocket updates
 * - User avatars and names
 * - Role badges (Admin, Writer, Customer)
 * - Connection time
 */
export default function WhosOnlineWidget({ config: _config, isEditing: _isEditing }: WidgetProps) {
  const { socket } = useSocket();
  const [liveCount, setLiveCount] = useState<number | null>(null);

  // Fetch online users
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['productivity-online-users'],
    queryFn: async () => {
      const response = await productivityApi.getOnlineUsers();
      return response.data as OnlineUsersResponse;
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Listen for real-time user count updates
  useEffect(() => {
    if (!socket) return;

    const handleOnlineUpdate = (updateData: { count: number }) => {
      setLiveCount(updateData.count);
      refetch(); // Refetch full user list
    };

    socket.on('users:online-update', handleOnlineUpdate);

    return () => {
      socket.off('users:online-update', handleOnlineUpdate);
    };
  }, [socket, refetch]);

  const count = liveCount ?? data?.count ?? 0;
  const users = data?.users || [];

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="flex items-center gap-0.5 text-xs text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded">
            <Crown className="w-3 h-3" />
            Admin
          </span>
        );
      case 'WRITER':
        return (
          <span className="text-xs text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
            Writer
          </span>
        );
      case 'CUSTOMER':
        return (
          <span className="text-xs text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">
            Customer
          </span>
        );
      default:
        return null;
    }
  };

  // Get initials from name
  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return '?';
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
      {/* Header with count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-theme-foreground-muted" />
          <span className="text-sm font-medium text-theme-foreground">Online Now</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="w-2 h-2 fill-green-400 text-green-400 animate-pulse" />
          <span className="text-lg font-bold text-theme-foreground">{count}</span>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {users.length === 0 ? (
          <div className="text-center py-4 text-theme-foreground-muted text-sm">
            No users currently online
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {/* Avatar */}
              {user.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt={user.firstName || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-theme-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-theme-primary">
                    {getInitials(user.firstName, user.lastName, user.email)}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-theme-foreground truncate">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </span>
                  {getRoleBadge(user.role)}
                </div>
                {user.connectedAt && (
                  <span className="text-xs text-theme-foreground-muted">
                    Online since {new Date(user.connectedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>

              {/* Online indicator */}
              <div className="w-2 h-2 rounded-full bg-green-400" />
            </div>
          ))
        )}
      </div>

      {/* Footer summary */}
      {users.length > 0 && (
        <div className="pt-2 border-t border-white/10 mt-2">
          <div className="flex justify-between text-xs text-theme-foreground-muted">
            <span>{users.filter(u => u.role === 'ADMIN').length} Admins</span>
            <span>{users.filter(u => u.role === 'WRITER').length} Writers</span>
            <span>{users.filter(u => u.role === 'CUSTOMER').length} Customers</span>
          </div>
        </div>
      )}
    </div>
  );
}
