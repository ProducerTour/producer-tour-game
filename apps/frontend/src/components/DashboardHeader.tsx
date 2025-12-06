import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Bell, Search, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardHeaderProps {
  title?: string;
  showBackButton?: boolean;
  className?: string;
}

/**
 * Minimal top header for dashboard pages
 * Shows page title on left, profile avatar + actions on right
 * Designed for the new "default" clean theme
 */
export function DashboardHeader({
  title = 'Dashboard',
  showBackButton = false,
  className
}: DashboardHeaderProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleProfileClick = () => {
    navigate('/my-profile');
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
