import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { feedApi } from '../lib/api';
import {
  Bell,
  Search,
  Mail,
  X,
  Sparkles,
  Wrench,
  Bug,
  Users,
  MessageCircle,
  Loader2,
  Heart,
  User,
  FileText,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SocialHeaderProps {
  title?: string;
  className?: string;
}

// Site updates/changelog - same as DashboardHeader
const SITE_UPDATES = [
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
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Site Updates</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
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
              "px-4 py-3 hover:bg-gray-50 transition-colors",
              index !== SITE_UPDATES.length - 1 && "border-b border-gray-100"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {typeIcons[update.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">{update.title}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase",
                    typeColors[update.type]
                  )}>
                    {update.type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{update.description}</p>
                <span className="text-[10px] text-gray-400">{update.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">
          Last updated: {SITE_UPDATES[0]?.date || 'N/A'}
        </p>
      </div>
    </div>
  );
}

// Social Notifications popup component
function SocialNotificationsPopup({
  isOpen,
  onClose,
  popupRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  popupRef: React.RefObject<HTMLDivElement>;
}) {
  const navigate = useNavigate();

  // Fetch social notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['social-notifications'],
    queryFn: async () => {
      const response = await feedApi.getNotifications({ limit: 20 });
      return response.data;
    },
    enabled: isOpen,
    staleTime: 30000,
  });

  if (!isOpen) return null;

  const notifications = notificationsData?.notifications || [];

  // Get icon based on notification type
  const getNotificationStyle = (type: string) => {
    switch (type) {
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

  const handleNotificationClick = (notification: any) => {
    if (notification.type === 'follow' && notification.user?.profileSlug) {
      navigate(`/user/${notification.user.profileSlug}`);
    } else if ((notification.type === 'like' || notification.type === 'comment') && notification.feedItem?.id) {
      navigate(`/post/${notification.feedItem.id}`);
    }
    onClose();
  };

  return (
    <div
      ref={popupRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notifications list */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification: any, index: number) => {
            const style = getNotificationStyle(notification.type);
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer",
                  index !== notifications.length - 1 && "border-b border-gray-100"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-full", style.bg)}>
                    <span className={style.color}>{style.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {notification.user?.profilePhotoUrl ? (
                        <img
                          src={notification.user.profilePhotoUrl}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {notification.user?.firstName} {notification.user?.lastName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">
              You'll see activity here when people interact with you
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Social Search Command Palette
function SocialSearchPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'users' | 'posts'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Search query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['social-search', searchQuery, searchType],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return { users: [], posts: [] };
      const response = await feedApi.search({ q: searchQuery, type: searchType, limit: 10 });
      return response.data;
    },
    enabled: isOpen && searchQuery.length >= 2,
    staleTime: 10000,
  });

  // Combine results for navigation
  const combinedResults = [
    ...(searchResults?.users || []).map((u: any) => ({ ...u, resultType: 'user' })),
    ...(searchResults?.posts || []).map((p: any) => ({ ...p, resultType: 'post' })),
  ];

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, searchType]);

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
    if (listRef.current && combinedResults.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, combinedResults.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, combinedResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (combinedResults[selectedIndex]) {
          handleSelectItem(combinedResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [combinedResults, selectedIndex, onClose]);

  const handleSelectItem = (item: any) => {
    if (item.resultType === 'user') {
      navigate(`/user/${item.profileSlug}`);
    } else if (item.resultType === 'post') {
      navigate(`/post/${item.id}`);
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

      {/* Search Modal */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search users, posts, keywords..."
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-400 bg-gray-100 rounded">
            ESC
          </kbd>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100">
          {[
            { key: 'all', label: 'All' },
            { key: 'users', label: 'Users' },
            { key: 'posts', label: 'Posts' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSearchType(tab.key as typeof searchType)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                searchType === tab.key
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : searchQuery.length < 2 ? (
            <div className="px-4 py-8 text-center">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Type at least 2 characters to search</p>
            </div>
          ) : combinedResults.length > 0 ? (
            combinedResults.map((item, index) => (
              <button
                key={item.resultType === 'user' ? `user-${item.id}` : `post-${item.id}`}
                onClick={() => handleSelectItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {item.resultType === 'user' ? (
                  <>
                    {item.profilePhotoUrl ? (
                      <img
                        src={item.profilePhotoUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.firstName} {item.lastName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        @{item.profileSlug}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      User
                    </span>
                  </>
                ) : (
                  <>
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      index === selectedIndex ? "bg-blue-100" : "bg-gray-100"
                    )}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        by {item.user?.firstName} {item.user?.lastName}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      Post
                    </span>
                  </>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No results found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try searching for something else
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500">↵</kbd>
              Select
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Top header for social pages (My Profile, My Store, Insights, etc.)
 * Shows search (for users/posts), notifications (follows/likes/comments), and site updates
 */
export function SocialHeader({
  title = 'Social',
  className,
}: SocialHeaderProps) {
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
      'sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100',
      'pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:pt-4',
      className
    )}>
      {/* Left: Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search button with keyboard shortcut hint */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <Search className="w-4 h-4" />
          <span className="text-xs text-gray-400">Search...</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 rounded text-gray-500">
            ⌘K
          </kbd>
        </button>
        {/* Mobile search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="sm:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Site Updates - Mailbox icon */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={handleUpdatesClick}
            className={cn(
              "relative p-2 rounded-lg transition-colors",
              updatesOpen
                ? "text-blue-600 bg-blue-50"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            )}
          >
            <Mail className="w-5 h-5" />
            {/* New updates indicator */}
            {!hasSeenUpdates && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </button>
          <UpdatesPopup
            isOpen={updatesOpen}
            onClose={() => setUpdatesOpen(false)}
            popupRef={popupRef}
          />
        </div>

        {/* Social Notifications */}
        <div className="relative">
          <button
            ref={notificationsButtonRef}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={cn(
              "relative p-2 rounded-lg transition-colors",
              notificationsOpen
                ? "text-blue-600 bg-blue-50"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            )}
          >
            <Bell className="w-5 h-5" />
          </button>
          <SocialNotificationsPopup
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            popupRef={notificationsPopupRef}
          />
        </div>

        {/* Profile Avatar */}
        <button
          onClick={handleProfileClick}
          className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          {(user as any)?.profilePhotoUrl ? (
            <img
              src={(user as any).profilePhotoUrl}
              alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Profile'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
              {user?.firstName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </button>
      </div>

      {/* Social Search Palette */}
      <SocialSearchPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </header>
  );
}

export default SocialHeader;
