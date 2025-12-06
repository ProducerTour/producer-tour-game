import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import ToolsHub from '../components/ToolsHub';
import { InstallAppButton } from '../components/mobile/InstallAppButton';
import { useAuthStore } from '../store/auth.store';
import { gamificationApi } from '../lib/api';
import {
  Sparkles,
  Target,
  Calendar,
  BookOpen,
  Heart,
  Music,
  Play,
  Trophy,
  ChevronRight,
  Zap,
  Bell,
  TrendingUp,
} from 'lucide-react';

type TabType = 'overview' | 'discover' | 'events' | 'learning' | 'wishlist' | 'tools';

export default function CustomerDashboard() {
  const location = useLocation();
  const initialTab = (location.state as { activeTab?: TabType })?.activeTab || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const { user } = useAuthStore();

  // Handle navigation state changes when navigating back to dashboard
  useEffect(() => {
    const stateTab = (location.state as { activeTab?: TabType })?.activeTab;
    if (stateTab) {
      setActiveTab(stateTab);
    }
  }, [location.state]);

  // Track sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent<{ isCollapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
  }, []);

  // Fetch Tour Miles stats
  const { data: stats } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getStats();
      return response.data;
    },
  });

  // Profile completion calculation
  const calculateProfileCompletion = () => {
    if (!user) return 0;
    let completed = 0;
    const fields = ['firstName', 'lastName', 'email'];
    fields.forEach((field) => {
      if ((user as any)[field]) completed++;
    });
    return Math.round((completed / fields.length) * 100);
  };

  const profileCompletion = calculateProfileCompletion();

  // Current tier for display
  const currentTier = stats?.tier || 'BRONZE';

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      {/* Mobile App Install Banner - shows on mobile browsers when not already installed */}
      <InstallAppButton variant="banner" />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - hidden on mobile */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
        />

        {/* Main Content Area */}
        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pt-14 sm:pt-20 md:pt-8 pb-24 sm:pb-8">

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <>
                {/* Welcome Header with Avatar - Mobile Style */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg">
                      {user?.firstName?.[0] || 'P'}
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500">Welcome Back!</p>
                      <h1 className="text-sm sm:text-lg font-bold text-gray-900">
                        {user?.firstName || 'Producer'} 👋
                      </h1>
                    </div>
                  </div>
                  <button className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center relative">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                  </button>
                </div>

                {/* Hero Card - Tour Miles Balance */}
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-5 sm:p-8 mb-4 sm:mb-6 shadow-xl">
                  {/* Enhanced Sparkline Chart */}
                  <svg className="absolute bottom-0 left-0 right-0 h-28 sm:h-36" viewBox="0 0 400 120" preserveAspectRatio="none">
                    {/* Gradient definitions */}
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                      </linearGradient>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.8)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,1)" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Background grid lines */}
                    <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1="0" y1="70" x2="400" y2="70" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                    {/* Filled area under curve */}
                    <path
                      d="M0,95 C30,90 50,85 80,80 C120,72 140,78 180,65 C220,52 260,58 300,45 C340,32 370,28 400,25 L400,120 L0,120 Z"
                      fill="url(#chartGradient)"
                    />

                    {/* Secondary subtle line */}
                    <path
                      d="M0,98 C40,95 70,92 110,88 C160,82 200,85 250,75 C300,65 350,55 400,48"
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="2"
                    />

                    {/* Main chart line */}
                    <path
                      d="M0,95 C30,90 50,85 80,80 C120,72 140,78 180,65 C220,52 260,58 300,45 C340,32 370,28 400,25"
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data points */}
                    <circle cx="80" cy="80" r="3" fill="rgba(255,255,255,0.4)" />
                    <circle cx="180" cy="65" r="3" fill="rgba(255,255,255,0.5)" />
                    <circle cx="300" cy="45" r="4" fill="rgba(255,255,255,0.7)" />

                    {/* Glowing end point */}
                    <circle cx="400" cy="25" r="8" fill="rgba(255,255,255,0.3)" filter="url(#glow)" />
                    <circle cx="400" cy="25" r="5" fill="white" />
                    <circle cx="400" cy="25" r="2" fill="rgba(255,200,100,0.8)" />
                  </svg>

                  <div className="relative z-10">
                    <p className="text-white/80 text-xs sm:text-sm font-medium mb-1">Tour Miles Balance</p>
                    <p className="text-3xl sm:text-5xl font-bold text-white mb-2 sm:mb-3">
                      {stats?.points?.toLocaleString() || '0'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +{stats?.currentStreak || 0} day streak
                      </span>
                      <span className="text-white/70 text-[10px] sm:text-xs">Keep it up!</span>
                    </div>
                  </div>

                  {/* Tier Badge */}
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-sm ${
                      currentTier === 'DIAMOND' ? 'bg-blue-500/30 text-blue-100' :
                      currentTier === 'GOLD' ? 'bg-yellow-500/30 text-yellow-100' :
                      currentTier === 'SILVER' ? 'bg-gray-400/30 text-gray-100' :
                      currentTier === 'ELITE' ? 'bg-purple-500/30 text-purple-100' :
                      'bg-amber-700/30 text-amber-100'
                    }`}>
                      {currentTier}
                    </span>
                  </div>
                </div>

                {/* Stats Grid - 2x2 */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {/* Day Streak */}
                  <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 border-l-4 border-l-orange-500">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-100 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full">
                          🔥 Active
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-0.5">
                        {stats?.currentStreak || 0}
                      </p>
                      <p className="text-[11px] sm:text-sm text-gray-500 font-medium">Day Streak</p>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 mt-2">Best: {stats?.longestStreak || 0} days</p>
                    </div>
                  </div>

                  {/* Achievements */}
                  <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-100 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-purple-600" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                          +2 New
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-0.5">
                        {stats?.achievementsUnlocked || 0}
                      </p>
                      <p className="text-[11px] sm:text-sm text-gray-500 font-medium">Achievements</p>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 mt-2">Unlocked badges</p>
                    </div>
                  </div>

                  {/* Profile Completion */}
                  <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Target className="w-5 h-5 text-emerald-600" />
                        </div>
                        {profileCompletion === 100 ? (
                          <span className="text-[10px] sm:text-xs text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                            ✓ Complete
                          </span>
                        ) : (
                          <span className="text-[10px] sm:text-xs text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-0.5">
                        {profileCompletion}%
                      </p>
                      <p className="text-[11px] sm:text-sm text-gray-500 font-medium">Profile</p>
                      {/* Mini progress bar */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${profileCompletion}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tools Unlocked */}
                  <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                          <Play className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                          Explore →
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-0.5">
                        3
                      </p>
                      <p className="text-[11px] sm:text-sm text-gray-500 font-medium">Tools Available</p>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 mt-2">Tap to explore</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions - Hidden on mobile, visible on larger screens */}
                <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Link
                    to="/customer/tour-miles"
                    className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-6 transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-semibold text-base mb-1 truncate">Tour Miles</h3>
                        <p className="text-sm text-gray-500">Earn points, unlock rewards</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </Link>

                  <Link
                    to="/settings?section=tourhub"
                    className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-6 transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Target className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-semibold text-base mb-1 truncate">Profile</h3>
                        <p className="text-sm text-gray-500">Earn bonus Tour Miles</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </Link>

                  <Link
                    to="/tools"
                    className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-6 transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Play className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-semibold text-base mb-1 truncate">Explore Tools</h3>
                        <p className="text-sm text-gray-500">Unlock with Tour Miles</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </Link>
                </div>
              </>
            )}

            {activeTab === 'discover' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
                  <Music className="w-16 h-16 text-blue-500 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Discover Content Coming Soon</h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Curated playlists, new releases from Producer Tour artists, and featured producers will be available here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
                  <Calendar className="w-16 h-16 text-purple-500 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Events Coming Soon</h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Community events, workshops, and networking opportunities will be listed here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'learning' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
                  <BookOpen className="w-16 h-16 text-emerald-500 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Learning Center Coming Soon</h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Tips, tutorials, and educational content about music production and the industry.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
                  <Heart className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Wishlist Coming Soon</h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Save tools and rewards you're interested in, and track Tour Miles prices.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'tools' && (
              <div className="space-y-6">
                <ToolsHub />
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
