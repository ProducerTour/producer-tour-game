import { useAuthStore } from '../store/auth.store';
import { useState } from 'react';

interface NavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: Array<{ id: string; label: string; icon: string }>;
}

export default function Navigation({ activeTab, onTabChange, tabs }: NavigationProps) {
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">PT</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Producer Tour</h1>
                  <p className="text-xs text-gray-400">Publishing Portal</p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            {tabs && tabs.length > 0 && (
              <div className="hidden md:ml-8 md:flex md:space-x-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right side - User info and actions */}
          <div className="flex items-center">
            <div className="hidden md:flex md:items-center md:gap-4">
              {/* User Info */}
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user?.firstName || user?.lastName
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : user?.email}
                </p>
                <p className="text-xs text-gray-400">
                  {isAdmin ? 'Administrator' : 'Writer'}
                </p>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-slate-600 rounded-lg hover:border-slate-500 transition-colors"
              >
                Sign Out
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-slate-700 focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {tabs?.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange?.(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  activeTab === tab.id
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-slate-700">
            <div className="px-4">
              <div className="text-base font-medium text-white">
                {user?.firstName || user?.lastName
                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                  : user?.email}
              </div>
              <div className="text-sm font-medium text-gray-400">
                {isAdmin ? 'Administrator' : 'Writer'}
              </div>
            </div>
            <div className="mt-3 px-2">
              <button
                onClick={logout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-slate-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
