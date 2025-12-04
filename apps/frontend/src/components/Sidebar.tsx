import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { getNavigationForRole, type NavSection, type NavItem } from '../config/navigation.config';
import { SaasIcon, IconName } from './ui/SaasIcon';
import { LogOut, Settings, ChevronDown, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { getAuthToken, gamificationApi } from '../lib/api';
import { AnimatedBorder, parseBorderConfig } from './AnimatedBorder';
import { ProfileBadge, parseBadgeConfig } from './ProfileBadge';
import whiteLogo from '@/assets/images/logos/whitetransparentpt.png';
import blackLogo from '@/assets/images/logos/blacktransparentpt.png';
import { useThemeOptional } from '@/contexts/ThemeContext';

// Re-export types for backward compatibility
export type { NavSection, NavItem };

// Theme colors are now managed via CSS variables (see config/themes.ts)
// Use theme-* Tailwind classes for dynamic theming

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: NavItem[]; // Optional override for custom tabs in dashboard
}

export default function Sidebar({ activeTab, onTabChange, tabs }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const themeContext = useThemeOptional();
  const isLightTheme = themeContext?.themeId === 'light';
  const [expandedSections, setExpandedSections] = useState<string[]>(['main']);
  const [expandedTabs, setExpandedTabs] = useState<string[]>(['placement-deals']); // Auto-expand placement tracker

  // Sidebar collapse state - persisted to localStorage (desktop only)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    // Dispatch event so other components can react to sidebar changes
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { isCollapsed, isMobileMenuOpen } }));
  }, [isCollapsed, isMobileMenuOpen]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const isAdmin = user?.role === 'ADMIN';

  // Fetch user's equipped customizations (badge & border)
  const { data: customizations } = useQuery({
    queryKey: ['customizations'],
    queryFn: async () => {
      const response = await gamificationApi.getCustomizations();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Fetch claims count for writers
  const { data: claimsData } = useQuery({
    queryKey: ['my-work-submissions'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/work-registration/my-submissions`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
    enabled: !isAdmin, // Only fetch for writers
  });

  const approvedClaimsCount = claimsData?.submissions?.filter((s: any) => s.status === 'APPROVED').length || 0;

  // Navigation helpers
  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleTab = (tabId: string) => {
    setExpandedTabs(prev =>
      prev.includes(tabId)
        ? prev.filter(t => t !== tabId)
        : [...prev, tabId]
    );
  };

  // Get navigation from centralized config and apply dynamic badges
  const sections = useMemo(() => {
    const baseNav = getNavigationForRole(user?.role || 'WRITER');

    // If tabs prop is provided, override the first section's items (for dashboard compatibility)
    if (tabs) {
      return [
        {
          ...baseNav[0],
          items: tabs,
        },
        ...baseNav.slice(1),
      ];
    }

    // Apply dynamic badges to navigation items
    return baseNav.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        // Add claims badge for writers
        if (item.id === 'claims' && !isAdmin) {
          return {
            ...item,
            badge: approvedClaimsCount > 0 ? approvedClaimsCount : undefined,
            badgeColor: 'yellow' as const,
          };
        }
        return item;
      }),
    }));
  }, [user?.role, tabs, approvedClaimsCount, isAdmin]);

  // Render icon helper
  const renderIcon = (icon: IconName, size: 'sm' | 'md' = 'md') => {
    return <SaasIcon name={icon} size={size} color="default" className="flex-shrink-0" />;
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-theme-background/95 backdrop-blur-xl border-b border-theme-border z-[70] flex items-center justify-between px-4">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img
            src={isLightTheme ? blackLogo : whiteLogo}
            alt="Producer Tour"
            className="h-10 w-auto"
          />
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center text-theme-foreground-secondary hover:text-theme-primary hover:bg-theme-primary/10 transition-colors"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-theme-background/80 backdrop-blur-sm z-[55]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 flex flex-col h-screen bg-theme-background border-r border-theme-border z-[60] transition-all duration-300
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {/* Logo Section */}
        <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-theme-border relative`}>
          <Link to="/" className="flex items-center justify-center hover:opacity-80 transition-opacity">
            <img
              src={isLightTheme ? blackLogo : whiteLogo}
              alt="Producer Tour"
              className={`${isCollapsed ? 'h-10' : 'h-14'} w-auto transition-all duration-300`}
            />
          </Link>
          {/* Collapse Toggle Button - hidden on mobile */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-theme-card border border-theme-border rounded-full items-center justify-center text-theme-foreground hover:text-theme-primary hover:bg-theme-primary/10 transition-all"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

      {/* User Profile Section */}
      <div className={`${isCollapsed ? 'px-3 py-4' : 'px-6 py-4'} border-b border-theme-border bg-theme-card/50`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          {/* Profile Photo with Animated Border */}
          <div className="relative flex-shrink-0">
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
                  title={isCollapsed ? `${user?.firstName} ${user?.lastName}` : undefined}
                />
              ) : (
                <div
                  className="w-full h-full rounded-full bg-theme-primary flex items-center justify-center text-theme-primary-foreground font-semibold"
                  title={isCollapsed ? `${user?.firstName} ${user?.lastName}` : undefined}
                >
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </AnimatedBorder>
            {/* Equipped Badge */}
            {customizations?.badge && !isCollapsed && (
              <div className="absolute -bottom-1 -right-1">
                <ProfileBadge
                  badge={parseBadgeConfig(customizations.badge)!}
                  size="xs"
                  owned={true}
                  isEquipped={true}
                  showTooltip={true}
                />
              </div>
            )}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme-foreground truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email}
                </p>
                <p className="text-xs text-theme-primary/60 uppercase tracking-wider">{user?.role.toLowerCase()}</p>
              </div>
              <button
                onClick={logout}
                className="text-theme-foreground-muted hover:text-theme-primary transition-colors p-2 hover:bg-theme-primary/10"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-theme">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            {!isCollapsed && (
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-2 flex items-center justify-between text-theme-foreground-muted hover:text-theme-primary transition-colors"
              >
                <span className="text-xs font-medium uppercase tracking-[0.2em]">
                  {section.label}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    expandedSections.includes(section.id) ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}

            {(isCollapsed || expandedSections.includes(section.id)) && (
              <div className={`${isCollapsed ? '' : 'mt-2'} space-y-1`}>
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = expandedTabs.includes(item.id);

                  return (
                    <div key={item.id}>
                      {/* Use Link for navigation paths, button for tab changes */}
                      {item.path && !hasChildren ? (
                        <Link
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          title={isCollapsed ? item.label : undefined}
                          className={`w-full ${isCollapsed ? 'px-0 py-3 justify-center' : 'px-6 py-3 gap-3'} flex items-center transition-all ${
                            isActive
                              ? 'bg-theme-primary/10 border-l-2 border-theme-primary text-theme-primary'
                              : 'text-theme-foreground-secondary hover:text-theme-foreground hover:bg-theme-border-strong border-l-2 border-transparent'
                          }`}
                        >
                          {renderIcon(item.icon)}
                          {!isCollapsed && (
                            <>
                              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className={`
                                  px-2 py-0.5 text-xs font-medium uppercase tracking-wider
                                  ${item.badgeColor === 'green' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : ''}
                                  ${item.badgeColor === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : ''}
                                  ${item.badgeColor === 'yellow' ? 'bg-theme-primary/20 text-theme-primary border border-theme-primary/40' : ''}
                                  ${item.badgeColor === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : ''}
                                  ${item.badgeColor === 'purple' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : ''}
                                  ${!item.badgeColor ? 'bg-theme-border-strong text-theme-foreground-secondary border border-theme-border' : ''}
                                `}>
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      ) : (
                        <div className={`w-full ${isCollapsed ? 'px-0 py-3 justify-center' : 'px-6 py-3 gap-3'} flex items-center transition-all ${
                          isActive
                            ? 'bg-theme-primary/10 border-l-2 border-theme-primary text-theme-primary'
                            : 'text-theme-foreground-secondary hover:text-theme-foreground hover:bg-theme-border-strong border-l-2 border-transparent'
                        }`}>
                          {/* Main clickable area - always navigates to tab */}
                          <button
                            onClick={() => {
                              if (onTabChange) {
                                onTabChange(item.id);
                                setIsMobileMenuOpen(false);
                              } else {
                                // If no onTabChange (e.g., from /tour-miles), navigate to dashboard with target tab
                                const dashboardPath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'CUSTOMER' ? '/customer' : '/dashboard';
                                navigate(dashboardPath, { state: { activeTab: item.id } });
                                setIsMobileMenuOpen(false);
                              }
                            }}
                            title={isCollapsed ? item.label : undefined}
                            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 flex-1 text-left'}`}
                          >
                            {renderIcon(item.icon)}
                            {!isCollapsed && (
                              <>
                                <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                                {item.badge !== undefined && item.badge > 0 && (
                                  <span className={`
                                    px-2 py-0.5 text-xs font-medium uppercase tracking-wider
                                    ${item.badgeColor === 'green' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : ''}
                                    ${item.badgeColor === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : ''}
                                    ${item.badgeColor === 'yellow' ? 'bg-theme-primary/20 text-theme-primary border border-theme-primary/40' : ''}
                                    ${item.badgeColor === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : ''}
                                    ${item.badgeColor === 'purple' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : ''}
                                    ${!item.badgeColor ? 'bg-theme-border-strong text-theme-foreground-secondary border border-theme-border' : ''}
                                  `}>
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </button>
                          {/* Separate chevron button for dropdown toggle */}
                          {hasChildren && !isCollapsed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTab(item.id);
                              }}
                              className="p-1 hover:bg-theme-primary/10 transition-colors"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Sub-items - hide when collapsed */}
                      {hasChildren && isExpanded && !isCollapsed && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.children?.map((child) => {
                            const isChildActive = activeTab === child.id;
                            const childClassName = `w-full px-6 py-2 flex items-center gap-3 transition-all ${
                              isChildActive
                                ? 'bg-theme-primary/5 border-l-2 border-theme-primary/60 text-theme-primary'
                                : 'text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-border-strong border-l-2 border-transparent'
                            }`;

                            // Use Link for children with paths, button for tab changes
                            return child.path ? (
                              <Link
                                key={child.id}
                                to={child.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={childClassName}
                              >
                                {renderIcon(child.icon, 'sm')}
                                <span className="text-sm font-medium">{child.label}</span>
                              </Link>
                            ) : (
                              <button
                                key={child.id}
                                onClick={() => {
                                  if (onTabChange) {
                                    onTabChange(child.id);
                                    setIsMobileMenuOpen(false);
                                  } else {
                                    // If no onTabChange (e.g., from /tour-miles), navigate to dashboard
                                    const dashboardPath = user?.role === 'ADMIN' ? '/admin' : '/dashboard';
                                    navigate(dashboardPath, { state: { activeTab: child.id } });
                                    setIsMobileMenuOpen(false);
                                  }
                                }}
                                className={childClassName}
                              >
                                {renderIcon(child.icon, 'sm')}
                                <span className="text-sm font-medium">{child.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

        {/* Bottom Actions */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-theme-border space-y-2`}>
          <Link
            to="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            title={isCollapsed ? 'Settings' : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 text-theme-foreground-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-colors`}
          >
            <Settings className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>
          {isCollapsed && (
            <button
              onClick={logout}
              title="Logout"
              className="w-full flex items-center justify-center px-2 py-3 text-theme-foreground-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
