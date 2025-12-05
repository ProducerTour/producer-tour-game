import { Link, useLocation } from 'react-router-dom';
import { Home, Sparkles, User, Wrench } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

const tabs: TabItem[] = [
  {
    path: '/dashboard',
    label: 'Home',
    icon: <Home className="w-5 h-5" />,
  },
  {
    path: '/tour-miles',
    label: 'Miles',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    path: '/tools',
    label: 'Tools',
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    path: '/my-profile',
    label: 'Profile',
    icon: <User className="w-5 h-5" />,
  },
];

export function BottomTabBar() {
  const location = useLocation();

  // Check if current path matches tab (including sub-routes)
  const isActiveTab = (tabPath: string) => {
    if (tabPath === '/dashboard') {
      return location.pathname === '/dashboard' ||
             location.pathname === '/customer' ||
             (location.pathname.startsWith('/customer/') && !location.pathname.includes('tour-miles'));
    }
    if (tabPath === '/tour-miles') {
      return location.pathname.includes('tour-miles');
    }
    if (tabPath === '/tools') {
      return location.pathname === '/tools' ||
             location.pathname.startsWith('/tools/');
    }
    if (tabPath === '/my-profile') {
      return location.pathname === '/my-profile' ||
             location.pathname.startsWith('/settings');
    }
    return location.pathname === tabPath;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = isActiveTab(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors',
                isActive
                  ? 'text-brand-blue'
                  : 'text-text-secondary hover:text-white'
              )}
            >
              <div className={cn(
                'relative p-1 rounded-xl transition-all',
                isActive && 'bg-brand-blue/10'
              )}>
                {tab.icon}
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-blue rounded-full" />
                )}
              </div>
              <span className={cn(
                'text-xs mt-1 font-medium',
                isActive ? 'text-brand-blue' : 'text-text-secondary'
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomTabBar;
