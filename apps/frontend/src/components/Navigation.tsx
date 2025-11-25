import { useAuthStore } from '../store/auth.store';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sessionPayoutApi } from '@/lib/api';
import { Bell, DollarSign, ChevronRight, X } from 'lucide-react';
import whiteLogo from '@/assets/images/logos/whitetransparentpt.png';
import { format } from 'date-fns';

interface NavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: Array<{ id: string; label: string; icon: string }>;
}

export default function Navigation({ activeTab, onTabChange, tabs }: NavigationProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  // Fetch pending session payouts for admin notifications
  const { data: pendingData } = useQuery({
    queryKey: ['pending-session-payouts'],
    queryFn: async () => {
      const response = await sessionPayoutApi.getPending();
      return response.data;
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const pendingCount = pendingData?.count || 0;
  const pendingPayouts = pendingData?.pendingPayouts || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 backdrop-blur-sm shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-3">
                <img
                  src={whiteLogo}
                  alt="Producer Tour"
                  className="h-14 w-auto"
                />
              </div>
            </Link>

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
              {/* Admin Notifications Bell */}
              {isAdmin && (
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 text-gray-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          Notifications
                        </h3>
                        <button
                          onClick={() => setNotificationsOpen(false)}
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {pendingPayouts.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-400">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No pending notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-700">
                            {pendingPayouts.map((payout: any) => (
                              <button
                                key={payout.id}
                                onClick={() => {
                                  setNotificationsOpen(false);
                                  navigate('/admin?tab=payouts');
                                }}
                                className="w-full px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-teal-500/20 rounded-lg flex-shrink-0">
                                    <DollarSign className="w-4 h-4 text-teal-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                      Session Payout Request
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                      {payout.artistName} - {payout.songTitles}
                                    </p>
                                    <p className="text-xs text-teal-400 font-semibold mt-1">
                                      ${Number(payout.payoutAmount).toFixed(2)} • {payout.submittedByName}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(payout.createdAt), 'MMM d')}
                                    </p>
                                    <ChevronRight className="w-4 h-4 text-gray-500 mt-1" />
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {pendingCount > 0 && (
                        <div className="px-4 py-3 bg-slate-700/30 border-t border-slate-700">
                          <button
                            onClick={() => {
                              setNotificationsOpen(false);
                              navigate('/admin?tab=payouts');
                            }}
                            className="w-full text-center text-sm text-primary-400 hover:text-primary-300 font-medium"
                          >
                            View All Payout Requests
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

              {/* Settings Button */}
              <Link
                to="/settings"
                className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-slate-600 rounded-lg hover:border-slate-500 transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>

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
            <div className="mt-3 px-2 space-y-1">
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-slate-700"
              >
                Settings
              </Link>
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
