import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { usePlatform } from '../../hooks/usePlatform';

interface MobileLayoutProps {
  children: ReactNode;
}

// Routes that should show the bottom tab bar
const TAB_BAR_ROUTES = [
  '/dashboard',
  '/admin',
  '/customer',
  '/customer/tour-miles',
  '/my-profile',
  '/tour-miles',
  '/tools',
  '/insights',
  '/settings',
];

// Routes that should never show tab bar (login, landing, etc.)
const EXCLUDED_ROUTES = [
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/apply',
  '/pricing',
  '/shop',
  '/cart',
  '/checkout',
  '/opportunities',
  '/contact',
  '/landing-preview',
];

/**
 * MobileLayout wrapper component that provides:
 * - Bottom tab bar navigation for native/mobile views
 * - Safe area padding for iOS notch/home indicator
 * - Conditional rendering based on platform and route
 */
export function MobileLayout({ children }: MobileLayoutProps) {
  const { isMobileUI, isNative } = usePlatform();
  const location = useLocation();

  // Determine if we should show the tab bar
  const shouldShowTabBar = () => {
    // Don't show on excluded routes
    if (EXCLUDED_ROUTES.some(route => location.pathname === route)) {
      return false;
    }

    // Check if current path starts with any tab bar route
    const isTabBarRoute = TAB_BAR_ROUTES.some(route =>
      location.pathname === route || location.pathname.startsWith(route + '/')
    );

    // Show tab bar on mobile UI when on tab bar routes
    return isMobileUI && isTabBarRoute;
  };

  const showTabBar = shouldShowTabBar();

  return (
    <div className={`mobile-layout ${isNative ? 'native-app' : ''}`}>
      {/* Main content with bottom padding when tab bar is visible */}
      <div className={showTabBar ? 'pb-20' : ''}>
        {children}
      </div>

      {/* Bottom Tab Bar */}
      {showTabBar && <BottomTabBar />}
    </div>
  );
}

export default MobileLayout;
