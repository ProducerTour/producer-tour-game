import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { feedApi } from '../lib/api';
import { getNavigationForRole, flattenNavItems, type NavItem } from '../config/navigation.config';
import { SaasIcon } from './ui/SaasIcon';
import { Bell, Search, ChevronLeft, Mail, X, Sparkles, Wrench, Bug, DollarSign, Music, Users, MessageCircle, Loader2, Heart, Command } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardHeaderProps {
  title?: string;
  showBackButton?: boolean;
  className?: string;
  /** Show the site updates mailbox icon */
  showUpdates?: boolean;
}

// Site updates/changelog - add new entries at the top
const SITE_UPDATES = [
  {
    id: '2024-12-06-contacts',
    date: 'December 6, 2024',
    title: 'Contacts Feature',
    description: 'Added Contacts section to profile page. View and manage your friends directly from your profile, alongside your chat contacts.',
    type: 'feature' as const,
  },
  {
    id: '2024-12-06-charts',
    date: 'December 6, 2024',
    title: 'Light Theme Chart Improvements',
    description: 'All charts now properly display with visible axis labels and tooltips on the new light theme.',
    type: 'fix' as const,
  },
  {
    id: '2024-12-06-theme',
    date: 'December 6, 2024',
    title: 'New Default Light Theme',
    description: 'Redesigned dashboard with a clean, modern fintech-style light theme. White cards, blue accents, and improved readability.',
    type: 'feature' as const,
  },
  {
    id: '2024-12-05-mobile',
    date: 'December 5, 2024',
    title: 'Mobile PWA Layout Fixes',
    description: 'Fixed mobile PWA layout issues for Tour Miles and Profile pages. Better responsive design across all devices.',
    type: 'fix' as const,
  },
];

// Updates popup component
function UpdatesPopup({
  isOpen,
  onClose,
  popupRef
}: {
  isOpen: boolean;
  onClose: () => void;
  popupRef: React.RefObject<HTMLDivElement>;
}) {
  if (!isOpen) return null;

  const typeIcons = {
    feature: <Sparkles className="w-4 h-4 text-blue-500" />,
    fix: <Wrench className="w-4 h-4 text-amber-500" />,
    bug: <Bug className="w-4 h-4 text-red-500" />,
  };

  const typeColors = {
    feature: 'bg-blue-50 text-blue-700 border-blue-200',
    fix: 'bg-amber-50 text-amber-700 border-amber-200',
    bug: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div
      ref={popupRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-theme-card rounded-2xl shadow-xl border border-theme-border overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-theme-background-30 border-b border-theme-border">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-theme-primary" />
          <h3 className="font-semibold text-theme-foreground">Site Updates</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background-20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Updates list */}
      <div className="max-h-80 overflow-y-auto">
        {SITE_UPDATES.map((update, index) => (
          <div
            key={update.id}
            className={cn(
              "px-4 py-3 hover:bg-theme-background-20 transition-colors",
              index !== SITE_UPDATES.length - 1 && "border-b border-theme-border/50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {typeIcons[update.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-theme-foreground text-sm">{update.title}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase",
                    typeColors[update.type]
                  )}>
                    {update.type}
                  </span>
                </div>
                <p className="text-xs text-theme-foreground-secondary mb-1">{update.description}</p>
                <span className="text-[10px] text-theme-foreground-muted">{update.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-theme-background-30 border-t border-theme-border">
        <p className="text-[10px] text-theme-foreground-muted text-center">
          Last updated: {SITE_UPDATES[0]?.date || 'N/A'}
        </p>
      </div>
    </div>
  );
}

// Notifications popup component
function NotificationsPopup({
  isOpen,
  onClose,
  popupRef,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  popupRef: React.RefObject<HTMLDivElement>;
  userId?: string;
}) {
  // Fetch recent activity/notifications
  const { data: activityData, isLoading } = useQuery({
    queryKey: ['user-notifications', userId],
    queryFn: async () => {
      const response = await feedApi.getActivity({ limit: 10 });
      return response.data;
    },
    enabled: isOpen && !!userId,
    staleTime: 30000, // 30 seconds
  });

  if (!isOpen) return null;

  const activities = activityData?.activities || [];

  // Get icon and color based on activity type
  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'statement_processed':
      case 'payment_received':
        return { icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-500', bg: 'bg-emerald-100' };
      case 'placement_confirmed':
      case 'placement_created':
        return { icon: <Music className="w-4 h-4" />, color: 'text-purple-500', bg: 'bg-purple-100' };
      case 'new_follower':
      case 'follow':
        return { icon: <Users className="w-4 h-4" />, color: 'text-blue-500', bg: 'bg-blue-100' };
      case 'like':
        return { icon: <Heart className="w-4 h-4" />, color: 'text-pink-500', bg: 'bg-pink-100' };
      case 'comment':
        return { icon: <MessageCircle className="w-4 h-4" />, color: 'text-amber-500', bg: 'bg-amber-100' };
      default:
        return { icon: <Bell className="w-4 h-4" />, color: 'text-gray-500', bg: 'bg-gray-100' };
    }
  };

  // Format relative time
  const formatTimeAgo = (dateStr: string) => {
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      ref={popupRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-theme-card rounded-2xl shadow-xl border border-theme-border overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-theme-background-30 border-b border-theme-border">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-theme-primary" />
          <h3 className="font-semibold text-theme-foreground">Notifications</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background-20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notifications list */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-theme-primary animate-spin" />
          </div>
        ) : activities.length > 0 ? (
          activities.map((activity: any, index: number) => {
            const style = getActivityStyle(activity.type);
            return (
              <div
                key={activity.id || index}
                className={cn(
                  "px-4 py-3 hover:bg-theme-background-20 transition-colors",
                  index !== activities.length - 1 && "border-b border-theme-border/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-full", style.bg)}>
                    <span className={style.color}>{style.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme-foreground">
                      {activity.message || activity.content || 'New activity'}
                    </p>
                    <span className="text-[10px] text-theme-foreground-muted">
                      {formatTimeAgo(activity.createdAt || activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center">
            <Bell className="w-10 h-10 text-theme-foreground-muted/30 mx-auto mb-3" />
            <p className="text-sm text-theme-foreground-secondary">No notifications yet</p>
            <p className="text-xs text-theme-foreground-muted mt-1">
              You'll see updates here when something happens
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="px-4 py-2 bg-theme-background-30 border-t border-theme-border">
          <button className="w-full text-center text-xs text-theme-primary hover:text-theme-primary-hover font-medium">
            View all activity
          </button>
        </div>
      )}
    </div>
  );
}

// Search command palette component
function SearchCommandPalette({
  isOpen,
  onClose,
  userRole,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  onNavigate: (path: string, tabId?: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get navigation items based on user role
  const navItems = useMemo(() => {
    const sections = getNavigationForRole(userRole);
    return flattenNavItems(sections);
  }, [userRole]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems;
    const query = searchQuery.toLowerCase();
    return navItems.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
    );
  }, [navItems, searchQuery]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredItems.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredItems.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelectItem(filteredItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredItems, selectedIndex, onClose]);

  const handleSelectItem = (item: NavItem) => {
    if (item.path) {
      // Direct navigation route
      onNavigate(item.path);
    } else {
      // Tab-based navigation - go to dashboard with tab
      const dashboardPath = userRole === 'ADMIN' ? '/admin' : userRole === 'CUSTOMER' ? '/customer' : '/dashboard';
      onNavigate(dashboardPath, item.id);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Command Palette Modal */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-theme-card rounded-2xl shadow-2xl border border-theme-border overflow-hidden z-50">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-theme-border">
          <Search className="w-5 h-5 text-theme-foreground-muted" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="flex-1 text-sm text-theme-foreground placeholder:text-theme-foreground-muted outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-theme-foreground-muted bg-theme-background-30 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-theme-primary-15 text-theme-primary"
                    : "text-theme-foreground-secondary hover:bg-theme-background-20"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  index === selectedIndex ? "bg-theme-primary-20" : "bg-theme-background-30"
                )}>
                  <SaasIcon name={item.icon} className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  {item.path && (
                    <p className="text-xs text-theme-foreground-muted truncate">{item.path}</p>
                  )}
                </div>
                {index === selectedIndex && (
                  <span className="text-xs text-theme-primary">Enter ↵</span>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <Search className="w-10 h-10 text-theme-foreground-muted/30 mx-auto mb-3" />
              <p className="text-sm text-theme-foreground-secondary">No results found</p>
              <p className="text-xs text-theme-foreground-muted mt-1">
                Try searching for something else
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-theme-background-30 border-t border-theme-border text-[10px] text-theme-foreground-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-theme-background-20 rounded text-theme-foreground-secondary">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-theme-background-20 rounded text-theme-foreground-secondary">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-theme-background-20 rounded text-theme-foreground-secondary">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />K to open
          </span>
        </div>
      </div>
    </>
  );
}

/**
 * Minimal top header for dashboard pages
 * Shows page title on left, profile avatar + actions on right
 * Designed for the new "default" clean theme
 */
export function DashboardHeader({
  title = 'Dashboard',
  showBackButton = false,
  className,
  showUpdates = false,
}: DashboardHeaderProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Updates popup state
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [hasSeenUpdates, setHasSeenUpdates] = useState(() => {
    const seen = localStorage.getItem('lastSeenUpdate');
    return seen === SITE_UPDATES[0]?.id;
  });
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Notifications popup state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsPopupRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);

  // Search command palette state
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle navigation from search
  const handleSearchNavigate = useCallback((path: string, tabId?: string) => {
    if (tabId) {
      // Navigate to dashboard with tab state
      navigate(path, { state: { activeTab: tabId } });
    } else {
      navigate(path);
    }
  }, [navigate]);

  // Close updates popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setUpdatesOpen(false);
      }
    };

    if (updatesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [updatesOpen]);

  // Close notifications popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsPopupRef.current &&
        !notificationsPopupRef.current.contains(event.target as Node) &&
        notificationsButtonRef.current &&
        !notificationsButtonRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleProfileClick = () => {
    navigate('/my-profile');
  };

  const handleUpdatesClick = () => {
    setUpdatesOpen(!updatesOpen);
    if (!hasSeenUpdates && SITE_UPDATES[0]) {
      localStorage.setItem('lastSeenUpdate', SITE_UPDATES[0].id);
      setHasSeenUpdates(true);
    }
  };

  return (
    <header className={cn(
      'sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-theme-card border-b border-theme-border',
      'pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:pt-4',
      className
    )}>
      {/* Left: Back button + Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1.5 text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background-20 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg sm:text-xl font-semibold text-theme-foreground">{title}</h1>
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search button with keyboard shortcut hint */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-theme-foreground-muted hover:text-theme-foreground rounded-lg hover:bg-theme-background-20 transition-colors border border-theme-border"
        >
          <Search className="w-4 h-4" />
          <span className="text-xs text-theme-foreground-muted">Search...</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-theme-background-30 rounded text-theme-foreground-secondary">
            ⌘K
          </kbd>
        </button>
        {/* Mobile search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="sm:hidden p-2 text-theme-foreground-muted hover:text-theme-foreground rounded-lg hover:bg-theme-background-20 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Site Updates - Mailbox icon */}
        {showUpdates && (
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={handleUpdatesClick}
              className={cn(
                "relative p-2 rounded-lg transition-colors",
                updatesOpen
                  ? "text-theme-primary bg-theme-primary-15"
                  : "text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background-20"
              )}
            >
              <Mail className="w-5 h-5" />
              {/* New updates indicator */}
              {!hasSeenUpdates && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-theme-primary rounded-full" />
              )}
            </button>
            <UpdatesPopup
              isOpen={updatesOpen}
              onClose={() => setUpdatesOpen(false)}
              popupRef={popupRef}
            />
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            ref={notificationsButtonRef}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={cn(
              "relative p-2 rounded-lg transition-colors",
              notificationsOpen
                ? "text-theme-primary bg-theme-primary-15"
                : "text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background-20"
            )}
          >
            <Bell className="w-5 h-5" />
          </button>
          <NotificationsPopup
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            popupRef={notificationsPopupRef}
            userId={user?.id}
          />
        </div>

        {/* Profile Avatar */}
        <button
          onClick={handleProfileClick}
          className="flex items-center gap-2 p-1 rounded-full hover:bg-theme-background-20 transition-colors"
        >
          {(user as any)?.profilePhotoUrl ? (
            <img
              src={(user as any).profilePhotoUrl}
              alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Profile'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-theme-border"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-theme-primary to-theme-primary-hover flex items-center justify-center text-theme-primary-foreground font-medium text-sm">
              {user?.firstName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </button>
      </div>

      {/* Search Command Palette */}
      <SearchCommandPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        userRole={user?.role || 'WRITER'}
        onNavigate={handleSearchNavigate}
      />
    </header>
  );
}

export default DashboardHeader;
