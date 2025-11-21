import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { getNavigationForRole, type NavSection, type NavItem } from '../config/navigation.config';

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

  return (
    <div className="fixed left-0 top-0 flex flex-col h-screen w-64 bg-gradient-to-b from-surface to-surface-100 border-r border-white/[0.08] shadow-2xl z-[60]">
      {/* Logo Section */}
      <div className="p-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <img
            src="/451293708_472378049044476_4990757197796537602_n.jpg"
            alt="Producer Tour"
            className="h-10 w-10 rounded-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-xl font-bold text-white">Producer Tour</h1>
            <p className="text-xs text-gray-400">Publishing Platform</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="px-6 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-green-500 flex items-center justify-center text-white font-semibold shadow-lg">
            {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
          </div>
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
            className="text-text-muted hover:text-white transition-colors"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-2 flex items-center justify-between text-text-muted hover:text-white transition-colors"
            >
              <span className="text-xs font-semibold uppercase tracking-wider">
                {section.label}
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  expandedSections.includes(section.id) ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSections.includes(section.id) && (
              <div className="mt-2 space-y-1">
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
                          className={`w-full px-6 py-3 flex items-center gap-3 transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-brand-blue/20 to-brand-blue/10 border-l-4 border-brand-blue text-white'
                              : 'text-text-secondary hover:text-white hover:bg-white/[0.05] border-l-4 border-transparent'
                          }`}
                        >
                          <span className="text-xl">{item.icon}</span>
                          <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className={`
                              px-2 py-0.5 rounded-full text-xs font-semibold
                              ${item.badgeColor === 'green' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : ''}
                              ${item.badgeColor === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : ''}
                              ${item.badgeColor === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : ''}
                              ${item.badgeColor === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : ''}
                              ${item.badgeColor === 'purple' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : ''}
                              ${!item.badgeColor ? 'bg-slate-500/20 text-slate-400 border border-slate-500/40' : ''}
                            `}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            if (hasChildren) {
                              toggleTab(item.id);
                            } else if (onTabChange) {
                              onTabChange(item.id);
                            } else {
                              // If no onTabChange (e.g., from /tour-miles), navigate to dashboard
                              const dashboardPath = user?.role === 'ADMIN' ? '/admin' : '/dashboard';
                              navigate(dashboardPath);
                            }
                          }}
                          className={`w-full px-6 py-3 flex items-center gap-3 transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-brand-blue/20 to-brand-blue/10 border-l-4 border-brand-blue text-white'
                              : 'text-text-secondary hover:text-white hover:bg-white/[0.05] border-l-4 border-transparent'
                          }`}
                        >
                          <span className="text-xl">{item.icon}</span>
                          <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className={`
                              px-2 py-0.5 rounded-full text-xs font-semibold
                              ${item.badgeColor === 'green' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : ''}
                              ${item.badgeColor === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : ''}
                              ${item.badgeColor === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : ''}
                              ${item.badgeColor === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : ''}
                              ${item.badgeColor === 'purple' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : ''}
                              ${!item.badgeColor ? 'bg-slate-500/20 text-slate-400 border border-slate-500/40' : ''}
                            `}>
                              {item.badge}
                            </span>
                          )}
                          {hasChildren && (
                            <svg
                              className={`w-4 h-4 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      )}

                      {/* Sub-items */}
                      {hasChildren && isExpanded && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.children?.map((child) => {
                            const isChildActive = activeTab === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  if (onTabChange) {
                                    onTabChange(child.id);
                                  } else {
                                    // If no onTabChange (e.g., from /tour-miles), navigate to dashboard
                                    const dashboardPath = user?.role === 'ADMIN' ? '/admin' : '/dashboard';
                                    navigate(dashboardPath);
                                  }
                                }}
                                className={`w-full px-6 py-2 flex items-center gap-3 transition-all ${
                                  isChildActive
                                    ? 'bg-gradient-to-r from-purple-500/20 to-purple-500/10 border-l-4 border-purple-500 text-white'
                                    : 'text-text-muted hover:text-white hover:bg-white/[0.03] border-l-4 border-transparent'
                                }`}
                              >
                                <span className="text-lg">{child.icon}</span>
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
      <div className="p-4 border-t border-white/[0.08] space-y-2">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </div>
    </div>
  );
}
