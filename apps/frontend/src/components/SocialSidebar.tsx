import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  Settings,
  LayoutDashboard,
  Store,
  User,
  TrendingUp,
} from 'lucide-react';
import { gamificationApi } from '../lib/api';
import { AnimatedBorder, parseBorderConfig } from './AnimatedBorder';
import whiteLogo from '@/assets/images/logos/whitetransparentpt.png';
import blackLogo from '@/assets/images/logos/blacktransparentpt.png';
import { useThemeOptional } from '@/contexts/ThemeContext';

interface SocialSidebarProps {
  activePage?: 'profile' | 'store' | 'feed' | 'insights';
}

export default function SocialSidebar({ activePage }: SocialSidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const themeContext = useThemeOptional();
  const isLightTheme = themeContext?.themeId === 'light';

  // Fetch user's equipped customizations (border)
  const { data: customizations } = useQuery({
    queryKey: ['customizations'],
    queryFn: async () => {
      const response = await gamificationApi.getCustomizations();
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const dashboardPath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'CUSTOMER' ? '/customer' : '/dashboard';

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: dashboardPath },
    { id: 'profile', icon: User, label: 'My Profile', path: '/my-profile' },
    { id: 'store', icon: Store, label: 'My Store', path: '/my-store' },
    { id: 'insights', icon: TrendingUp, label: 'Insights', path: '/insights' },
  ];

  return (
    <div className="fixed left-0 top-0 flex flex-col h-screen w-20 bg-theme-background border-r border-theme-border z-[60]">
      {/* Logo */}
      <div className="p-4 border-b border-theme-border">
        <Link to="/" className="flex items-center justify-center hover:opacity-80 transition-opacity">
          <img
            src={isLightTheme ? blackLogo : whiteLogo}
            alt="Producer Tour"
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* User Avatar */}
      <div className="px-3 py-4 border-b border-theme-border flex justify-center">
        <div
          onClick={() => {
            if (user?.profileSlug) {
              navigate(`/user/${user.profileSlug}`);
            }
          }}
          className="relative cursor-pointer hover:opacity-90 transition-opacity"
          title="View your public profile"
        >
          <AnimatedBorder
            border={customizations?.border ? parseBorderConfig(customizations.border) : null}
            size="sm"
            showBorder={!!customizations?.border}
          >
            {(user as any)?.profilePhotoUrl ? (
              <img
                src={(user as any).profilePhotoUrl}
                alt={`${user?.firstName} ${user?.lastName}`}
                className="w-full h-full rounded-full object-cover"
                title={`${user?.firstName} ${user?.lastName}`}
              />
            ) : (
              <div
                className="w-full h-full rounded-full bg-theme-primary flex items-center justify-center text-theme-primary-foreground font-semibold"
                title={`${user?.firstName} ${user?.lastName}`}
              >
                {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </AnimatedBorder>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <Link
              key={item.id}
              to={item.path}
              title={item.label}
              className={`w-full px-0 py-3 flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-theme-primary/10 border-l-2 border-theme-primary text-theme-primary'
                  : 'text-theme-foreground-secondary hover:text-theme-foreground hover:bg-theme-border-strong border-l-2 border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-theme-border space-y-2">
        <Link
          to="/settings"
          title="Settings"
          className="flex items-center justify-center px-2 py-3 text-theme-foreground-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </Link>
        <button
          onClick={logout}
          title="Logout"
          className="w-full flex items-center justify-center px-2 py-3 text-theme-foreground-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
