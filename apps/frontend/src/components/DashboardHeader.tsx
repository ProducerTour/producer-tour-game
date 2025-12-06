import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Bell, Search, ChevronLeft, Mail, X, Sparkles, Wrench, Bug } from 'lucide-react';
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
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [hasSeenUpdates, setHasSeenUpdates] = useState(() => {
    const seen = localStorage.getItem('lastSeenUpdate');
    return seen === SITE_UPDATES[0]?.id;
  });
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popup when clicking outside
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
      'sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100',
      className
    )}>
      {/* Left: Back button + Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search - hidden on mobile */}
        <button className="hidden sm:flex p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
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
        )}

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
          {/* Notification dot - show when there are unread notifications */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

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
    </header>
  );
}

export default DashboardHeader;
