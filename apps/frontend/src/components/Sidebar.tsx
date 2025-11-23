import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { getNavigationForRole, type NavSection, type NavItem } from '../config/navigation.config';
import { SaasIcon, IconName } from './ui/SaasIcon';
import { LogOut, Settings, ChevronDown, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import whiteLogo from '@/assets/images/logos/whitetransparentpt.png';

// Re-export types for backward compatibility
export type { NavSection, NavItem };

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: NavItem[]; // Optional override for custom tabs in dashboard
}

export default function Sidebar({ activeTab, onTabChange, tabs }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
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

  // Fetch claims count for writers
  const { data: claimsData } = useQuery({
    queryKey: ['my-work-submissions'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/work-registration/my-submissions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
    enabled: !isAdmin, // Only fetch for writers
    refetchInterval: 30000, // Refetch every 30 seconds to catch new approvals
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
            badgeColor: 'green' as const,
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
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl border-b border-white/[0.08] z-[70] flex items-center justify-between px-4">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img
            src={whiteLogo}
            alt="Producer Tour"
            className="h-10 w-auto"
          />
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 flex flex-col h-screen bg-gradient-to-b from-surface to-surface-100 border-r border-white/[0.08] shadow-2xl z-[60] transition-all duration-300
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {/* Logo Section */}
        <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-white/[0.08] relative`}>
          <Link to="/" className="flex items-center justify-center hover:opacity-80 transition-opacity">
            <img
              src={whiteLogo}
              alt="Producer Tour"
              className={`${isCollapsed ? 'h-10' : 'h-14'} w-auto transition-all duration-300`}
            />
          </Link>
          {/* Collapse Toggle Button - hidden on mobile */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface border border-white/[0.15] rounded-full items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-all shadow-lg"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

      {/* User Profile Section */}
      <div className={`${isCollapsed ? 'px-3 py-4' : 'px-6 py-4'} border-b border-white/[0.08]`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          {(user as any)?.profilePhotoUrl ? (
            <img
              src={(user as any).profilePhotoUrl}
              alt={`${user?.firstName} ${user?.lastName}`}
              className="w-10 h-10 rounded-xl object-cover shadow-lg"
              title={isCollapsed ? `${user?.firstName} ${user?.lastName}` : undefined}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-green-500 flex items-center justify-center text-white font-semibold shadow-lg"
              title={isCollapsed ? `${user?.firstName} ${user?.lastName}` : undefined}
            >
              {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
          )}
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email}
                </p>
                <p className="text-xs text-text-muted capitalize">{user?.role.toLowerCase()}</p>
              </div>
              <button
                onClick={logout}
                className="text-text-muted hover:text-white transition-colors p-2 hover:bg-white/[0.05] rounded-lg"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            {!isCollapsed && (
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-2 flex items-center justify-between text-text-muted hover:text-white transition-colors"
              >
                <span className="text-xs font-semibold uppercase tracking-wider">
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
                          className={`w-full ${isCollapsed ? 'px-0 py-3 justify-center' : 'px-6 py-3'} flex items-center gap-3 transition-all ${
                            isActive
                              ? `bg-gradient-to-r from-white/[0.12] to-white/[0.06] ${isCollapsed ? 'border-l-2' : 'border-l-4'} border-white text-white`
                              : `text-text-secondary hover:text-white hover:bg-white/[0.05] ${isCollapsed ? 'border-l-2' : 'border-l-4'} border-transparent`
                          }`}
                        >
                          {renderIcon(item.icon)}
                          {!isCollapsed && (
                            <>
                              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className={`
                                  px-2 py-0.5 rounded-full text-xs font-semibold
                                  ${item.badgeColor === 'green' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : ''}
                                  ${item.badgeColor === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : ''}
                                  ${item.badgeColor === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : ''}
                                  ${item.badgeColor === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : ''}
                                  ${item.badgeColor === 'purple' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : ''}
                                  ${!item.badgeColor ? 'bg-white/10 text-gray-400 border border-white/20' : ''}
                                `}>
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            if (hasChildren && !isCollapsed) {
                              toggleTab(item.id);
                            } else if (onTabChange) {
                              onTabChange(item.id);
                              setIsMobileMenuOpen(false);
                            } else {
                              // If no onTabChange (e.g., from /tour-miles), navigate to dashboard
                              const dashboardPath = user?.role === 'ADMIN' ? '/admin' : '/dashboard';
                              navigate(dashboardPath);
                              setIsMobileMenuOpen(false);
                            }
                          }}
                          title={isCollapsed ? item.label : undefined}
                          className={`w-full ${isCollapsed ? 'px-0 py-3 justify-center' : 'px-6 py-3'} flex items-center gap-3 transition-all ${
                            isActive
                              ? `bg-gradient-to-r from-white/[0.12] to-white/[0.06] ${isCollapsed ? 'border-l-2' : 'border-l-4'} border-white text-white`
                              : `text-text-secondary hover:text-white hover:bg-white/[0.05] ${isCollapsed ? 'border-l-2' : 'border-l-4'} border-transparent`
                          }`}
                        >
                          {renderIcon(item.icon)}
                          {!isCollapsed && (
                            <>
                              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className={`
                                  px-2 py-0.5 rounded-full text-xs font-semibold
                                  ${item.badgeColor === 'green' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : ''}
                                  ${item.badgeColor === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : ''}
                                  ${item.badgeColor === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : ''}
                                  ${item.badgeColor === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : ''}
                                  ${item.badgeColor === 'purple' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : ''}
                                  ${!item.badgeColor ? 'bg-white/10 text-gray-400 border border-white/20' : ''}
                                `}>
                                  {item.badge}
                                </span>
                              )}
                              {hasChildren && (
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              )}
                            </>
                          )}
                        </button>
                      )}

                      {/* Sub-items - hide when collapsed */}
                      {hasChildren && isExpanded && !isCollapsed && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.children?.map((child) => {
                            const isChildActive = activeTab === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  if (onTabChange) {
                                    onTabChange(child.id);
                                    setIsMobileMenuOpen(false);
                                  } else {
                                    // If no onTabChange (e.g., from /tour-miles), navigate to dashboard
                                    const dashboardPath = user?.role === 'ADMIN' ? '/admin' : '/dashboard';
                                    navigate(dashboardPath);
                                    setIsMobileMenuOpen(false);
                                  }
                                }}
                                className={`w-full px-6 py-2 flex items-center gap-3 transition-all ${
                                  isChildActive
                                    ? 'bg-gradient-to-r from-white/[0.10] to-white/[0.05] border-l-4 border-white/60 text-white'
                                    : 'text-text-muted hover:text-white hover:bg-white/[0.03] border-l-4 border-transparent'
                                }`}
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
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-white/[0.08] space-y-2`}>
          <Link
            to="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            title={isCollapsed ? 'Settings' : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 text-text-secondary hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors`}
          >
            <Settings className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>
          {isCollapsed && (
            <button
              onClick={logout}
              title="Logout"
              className="w-full flex items-center justify-center px-2 py-3 text-text-secondary hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
