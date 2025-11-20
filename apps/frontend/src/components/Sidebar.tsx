import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

interface TabItem {
  id: string;
  label: string;
  icon: string;
  children?: Array<{ id: string; label: string; icon: string }>;
  path?: string;
}

interface NavSection {
  id: string;
  label: string;
  items: TabItem[];
}

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: TabItem[];
}

export default function Sidebar({ activeTab, onTabChange, tabs }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const [expandedSections, setExpandedSections] = useState<string[]>(['main']);
  const [expandedTabs, setExpandedTabs] = useState<string[]>(['placement-deals']); // Auto-expand placement tracker

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

  const isAdmin = user?.role === 'ADMIN';

  // Admin navigation structure
  const adminSections: NavSection[] = [
    {
      id: 'main',
      label: 'Main',
      items: tabs || [
        { id: 'overview', label: 'Dashboard', icon: '🏠', path: '/admin' },
        { id: 'statements', label: 'Statements', icon: '📊', path: '/admin' },
        { id: 'writers', label: 'Writers', icon: '👥', path: '/admin' },
        { id: 'analytics', label: 'Analytics', icon: '📈', path: '/admin' },
        { id: 'documents', label: 'Documents', icon: '📄', path: '/admin' },
      ]
    },
    {
      id: 'tools',
      label: 'Tools & Apps',
      items: [
        { id: 'tools', label: 'Tools Hub', icon: '🛠️', path: '/admin' },
        { id: 'spotify', label: 'Spotify Lookup', icon: '🎵', path: '/admin' },
      ]
    }
  ];

  // Writer navigation structure
  const writerSections: NavSection[] = [
    {
      id: 'main',
      label: 'Main',
      items: [
        { id: 'overview', label: 'Dashboard', icon: '🏠', path: '/writer' },
        { id: 'songs', label: 'My Songs', icon: '🎵', path: '/writer' },
        { id: 'statements', label: 'My Statements', icon: '📊', path: '/writer' },
        { id: 'documents', label: 'Documents', icon: '📄', path: '/writer' },
        { id: 'payments', label: 'Payments', icon: '💳', path: '/writer' },
        { id: 'profile', label: 'Profile', icon: '👤', path: '/writer' },
      ]
    },
    {
      id: 'tools',
      label: 'Tools & Apps',
      items: [
        { id: 'tools', label: 'Tools Hub', icon: '🛠️', path: '/writer' },
      ]
    }
  ];

  const sections = isAdmin ? adminSections : writerSections;

  return (
    <div className="flex flex-col h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 shadow-2xl">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-700">
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
      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
            {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role.toLowerCase()}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-white transition-colors"
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
              className="w-full px-6 py-2 flex items-center justify-between text-gray-400 hover:text-white transition-colors"
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
                      <button
                        onClick={() => {
                          if (hasChildren) {
                            toggleTab(item.id);
                          } else {
                            onTabChange?.(item.id);
                          }
                        }}
                        className={`w-full px-6 py-3 flex items-center gap-3 transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-l-4 border-blue-500 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-slate-700/50 border-l-4 border-transparent'
                        }`}
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
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

                      {/* Sub-items */}
                      {hasChildren && isExpanded && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.children?.map((child) => {
                            const isChildActive = activeTab === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => onTabChange?.(child.id)}
                                className={`w-full px-6 py-2 flex items-center gap-3 transition-all ${
                                  isChildActive
                                    ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-l-4 border-purple-500 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-slate-700/30 border-l-4 border-transparent'
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
      <div className="p-4 border-t border-slate-700 space-y-2">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
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
