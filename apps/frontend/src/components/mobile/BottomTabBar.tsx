import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Sparkles, User, Wrench, Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';

interface TabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  state?: Record<string, any>;
}

// Role-based tab configurations
const getTabsForRole = (role: string): TabItem[] => {
  switch (role) {
    case 'ADMIN':
      return [
        {
          path: '/admin',
          label: 'Home',
          icon: <Home className="w-[22px] h-[22px]" />,
          state: { activeTab: 'overview' },
        },
        {
          path: '/admin',
          label: 'Tools',
          icon: <Wrench className="w-[22px] h-[22px]" />,
          state: { activeTab: 'tools' },
        },
        {
          path: '/admin',
          label: 'Insights',
          icon: <Lightbulb className="w-[22px] h-[22px]" />,
          state: { activeTab: 'insights' },
        },
        {
          path: '/tour-miles',
          label: 'Miles',
          icon: <Sparkles className="w-[22px] h-[22px]" />,
        },
        {
          path: '/my-profile',
          label: 'Profile',
          icon: <User className="w-[22px] h-[22px]" />,
        },
      ];
    case 'CUSTOMER':
      return [
        {
          path: '/customer',
          label: 'Home',
          icon: <Home className="w-[22px] h-[22px]" />,
        },
        {
          path: '/tools',
          label: 'Tools',
          icon: <Wrench className="w-[22px] h-[22px]" />,
        },
        {
          path: '/insights',
          label: 'Insights',
          icon: <Lightbulb className="w-[22px] h-[22px]" />,
        },
        {
          path: '/customer/tour-miles',
          label: 'Miles',
          icon: <Sparkles className="w-[22px] h-[22px]" />,
        },
        {
          path: '/my-profile',
          label: 'Profile',
          icon: <User className="w-[22px] h-[22px]" />,
        },
      ];
    case 'WRITER':
    default:
      return [
        {
          path: '/dashboard',
          label: 'Home',
          icon: <Home className="w-[22px] h-[22px]" />,
        },
        {
          path: '/tools',
          label: 'Tools',
          icon: <Wrench className="w-[22px] h-[22px]" />,
        },
        {
          path: '/insights',
          label: 'Insights',
          icon: <Lightbulb className="w-[22px] h-[22px]" />,
        },
        {
          path: '/tour-miles',
          label: 'Miles',
          icon: <Sparkles className="w-[22px] h-[22px]" />,
        },
        {
          path: '/my-profile',
          label: 'Profile',
          icon: <User className="w-[22px] h-[22px]" />,
        },
      ];
  }
};

// Pages that use hardcoded light theme styling
const LIGHT_THEMED_ROUTES = [
  '/dashboard', // Writer dashboard with new default theme
  '/my-profile',
  '/settings',
  '/user/', // Public profile pages
  '/my-store',
  '/affiliates', // Affiliate hub
  '/tour-miles', // Tour Miles page
  '/customer', // Customer dashboard and sub-routes
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const tabs = getTabsForRole(user?.role || 'WRITER');

  // Detect if we're on a light-themed page
  const isLightThemedPage = LIGHT_THEMED_ROUTES.some(
    route => location.pathname === route || location.pathname.startsWith(route)
  );

  // Check if current path matches tab (including sub-routes and state)
  const isActiveTab = (tab: TabItem) => {
    const role = user?.role || 'WRITER';

    // For admin, check if we're on /admin and the state matches
    if (role === 'ADMIN' && tab.path === '/admin') {
      if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) {
        // Check the location state for admin tab matching
        const stateTab = (location.state as { activeTab?: string })?.activeTab;
        if (tab.state?.activeTab && stateTab) {
          return stateTab === tab.state.activeTab;
        }
        // If no state, default to overview
        if (tab.state?.activeTab === 'overview' && !stateTab) {
          return true;
        }
      }
      return false;
    }

    // Customer home
    if (tab.path === '/customer') {
      return location.pathname === '/customer' ||
             (location.pathname.startsWith('/customer/') && !location.pathname.includes('tour-miles'));
    }

    // Writer home
    if (tab.path === '/dashboard') {
      return location.pathname === '/dashboard';
    }

    // Tour miles (check for role-specific paths)
    if (tab.label === 'Miles') {
      return location.pathname.includes('tour-miles');
    }

    // Tools
    if (tab.path === '/tools') {
      return location.pathname === '/tools' ||
             location.pathname.startsWith('/tools/');
    }

    // Insights
    if (tab.path === '/insights') {
      return location.pathname === '/insights' ||
             location.pathname.startsWith('/insights/');
    }

    // Profile
    if (tab.path === '/my-profile') {
      return location.pathname === '/my-profile' ||
             location.pathname.startsWith('/settings');
    }

    return location.pathname === tab.path;
  };

  // Handle tab click - prevent navigation if already on this tab
  const handleTabClick = (tab: TabItem, isActive: boolean) => {
    if (isActive) {
      // Don't navigate if already on this tab
      return;
    }
    navigate(tab.path, { state: tab.state });
  };

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t safe-area-bottom',
      isLightThemedPage
        ? 'bg-white/95 border-gray-200'
        : 'bg-theme-card/95 border-theme-border'
    )}>
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab, index) => {
          const isActive = isActiveTab(tab);
          return (
            <button
              key={`${tab.path}-${tab.label}-${index}`}
              onClick={() => handleTabClick(tab, isActive)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors',
                isActive
                  ? isLightThemedPage ? 'text-blue-600' : 'text-theme-primary'
                  : isLightThemedPage ? 'text-gray-400 hover:text-gray-600' : 'text-theme-foreground-muted hover:text-theme-foreground'
              )}
            >
              <div className={cn(
                'relative p-1 rounded-xl transition-all',
                isActive && (isLightThemedPage ? 'bg-blue-100' : 'bg-theme-primary/10')
              )}>
                {tab.icon}
                {isActive && (
                  <span className={cn(
                    'absolute -top-1 -right-1 w-2 h-2 rounded-full',
                    isLightThemedPage ? 'bg-blue-600' : 'bg-theme-primary'
                  )} />
                )}
              </div>
              <span className={cn(
                'text-xs mt-1 font-medium',
                isActive
                  ? isLightThemedPage ? 'text-blue-600' : 'text-theme-primary'
                  : isLightThemedPage ? 'text-gray-400' : 'text-theme-foreground-muted'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomTabBar;
