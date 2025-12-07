/**
 * NotificationBell Component
 *
 * A notification bell icon with badge count and dropdown for viewing/managing notifications.
 * Integrates with socket.io for real-time notification updates.
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Trash2, X, Loader2, UserPlus, MessageCircle, Trophy, DollarSign, Star, Megaphone } from 'lucide-react';
import { notificationApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

interface NotificationProps {
  isCollapsed?: boolean;
  variant?: 'sidebar' | 'header';
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actor?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
  };
}

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'NEW_FOLLOWER':
    case 'FOLLOW_REQUEST':
    case 'FOLLOW_ACCEPTED':
      return <UserPlus className="w-4 h-4 text-blue-400" />;
    case 'NEW_MESSAGE':
      return <MessageCircle className="w-4 h-4 text-green-400" />;
    case 'ACHIEVEMENT_UNLOCKED':
    case 'LEVEL_UP':
      return <Trophy className="w-4 h-4 text-yellow-400" />;
    case 'PAYMENT_RECEIVED':
      return <DollarSign className="w-4 h-4 text-emerald-400" />;
    case 'MILESTONE_REACHED':
    case 'REFERRAL_SIGNUP':
    case 'REFERRAL_CONVERTED':
      return <Star className="w-4 h-4 text-purple-400" />;
    case 'SYSTEM_ANNOUNCEMENT':
      return <Megaphone className="w-4 h-4 text-orange-400" />;
    default:
      return <Bell className="w-4 h-4 text-gray-400" />;
  }
};

export function NotificationBell({ isCollapsed = false, variant = 'sidebar' }: NotificationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Fetch unread count
  const { data: countData } = useQuery({
    queryKey: ['notification-count'],
    queryFn: async () => {
      const response = await notificationApi.getUnreadCount();
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch notifications when dropdown is open
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationApi.getAll({ limit: 10 });
      return response.data;
    },
    enabled: isOpen,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => notificationApi.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      if (isOpen) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, isOpen, queryClient]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.actionUrl) {
      setIsOpen(false);
      navigate(notification.actionUrl);
    }
  };

  const unreadCount = countData?.count || 0;
  const notifications = notificationsData?.notifications || [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative flex items-center justify-center transition-all
          ${variant === 'header'
            ? 'w-10 h-10 rounded-full hover:bg-theme-primary/10 text-theme-foreground-secondary hover:text-theme-foreground'
            : isCollapsed
              ? 'w-10 h-10 rounded-lg hover:bg-theme-primary/10 text-theme-foreground-secondary hover:text-theme-primary'
              : 'w-full px-4 py-2.5 rounded-lg hover:bg-theme-primary/10 text-theme-foreground-secondary hover:text-theme-primary gap-3'
          }
        `}
        title={isCollapsed ? 'Notifications' : undefined}
      >
        <Bell className="w-5 h-5" />
        {!isCollapsed && variant === 'sidebar' && (
          <span className="text-sm font-medium flex-1 text-left">Notifications</span>
        )}
        {/* Badge */}
        {unreadCount > 0 && (
          <span className={`
            absolute flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1
            ${variant === 'header' || isCollapsed ? 'top-0 right-0' : 'top-1/2 -translate-y-1/2 right-3'}
          `}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`
          absolute bg-theme-card border border-theme-border rounded-xl shadow-2xl overflow-hidden z-[100]
          ${variant === 'header'
            ? 'right-0 mt-2 w-80 sm:w-96'
            : 'left-full ml-2 top-0 w-80 sm:w-96'
          }
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border bg-theme-background/50">
            <h3 className="text-sm font-semibold text-theme-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs text-theme-primary hover:underline flex items-center gap-1"
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-theme-primary/10 rounded text-theme-foreground-muted hover:text-theme-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-theme-primary animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="w-10 h-10 text-theme-foreground-muted mb-2 opacity-50" />
                <p className="text-sm text-theme-foreground-muted">No notifications yet</p>
                <p className="text-xs text-theme-foreground-muted mt-1">
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-theme-border">
                {notifications.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`
                      flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                      ${notification.isRead
                        ? 'bg-transparent hover:bg-theme-primary/5'
                        : 'bg-theme-primary/5 hover:bg-theme-primary/10'
                      }
                    `}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Actor Avatar or Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.actor?.profilePhotoUrl ? (
                        <img
                          src={notification.actor.profilePhotoUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                          <NotificationIcon type={notification.type} />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${notification.isRead ? 'text-theme-foreground-secondary' : 'text-theme-foreground font-medium'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-theme-foreground-muted mt-0.5">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          className="p-1.5 hover:bg-theme-primary/10 rounded text-theme-foreground-muted hover:text-theme-primary"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notification.id);
                        }}
                        className="p-1.5 hover:bg-red-500/10 rounded text-theme-foreground-muted hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-theme-border bg-theme-background/50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="w-full text-center text-xs text-theme-primary hover:underline py-1"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
