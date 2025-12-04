import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import ToolsHub from '../components/ToolsHub';
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
  Clock,
  Trophy,
  ChevronRight,
  Zap,
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

  // Mock recent activity (placeholder until backend endpoint is added)
  const recentActivity = [
    { id: '1', type: 'check_in', description: 'Daily check-in', points: 10, createdAt: new Date().toISOString() },
  ];

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

  // Tier colors for display
  const tierColors: Record<string, { bg: string; border: string; text: string }> = {
    BRONZE: { bg: 'from-amber-700/20 to-amber-900/20', border: 'border-amber-600/40', text: 'text-amber-400' },
    SILVER: { bg: 'from-slate-400/20 to-slate-600/20', border: 'border-slate-400/40', text: 'text-slate-300' },
    GOLD: { bg: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400' },
    DIAMOND: { bg: 'from-blue-400/20 to-purple-500/20', border: 'border-blue-400/40', text: 'text-blue-300' },
    ELITE: { bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/40', text: 'text-purple-300' },
  };

  const currentTier = stats?.tier || 'BRONZE';
  const tierStyle = tierColors[currentTier] || tierColors.BRONZE;

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Impersonation Banner */}
      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
        />

        {/* Main Content Area */}
        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 md:pt-8">

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <>
                {/* Welcome Header - only on overview tab */}
                <div className="mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-theme-foreground mb-2">
                    Welcome back, {user?.firstName || 'Guest'}!
                  </h1>
                  <p className="text-text-secondary">
                    Explore tools, earn Tour Miles, and connect with the Producer Tour community.
                  </p>
                </div>
              <div className="space-y-6">
                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Tour Miles Balance */}
                  <div className={`bg-gradient-to-br ${tierStyle.bg} border ${tierStyle.border} rounded-2xl p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <Sparkles className={`w-6 h-6 ${tierStyle.text}`} />
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${tierStyle.text}`}>
                        {currentTier}
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-theme-foreground mb-1">
                      {stats?.points?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-text-secondary">Tour Miles</p>
                  </div>

                  {/* Daily Streak */}
                  <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-orange-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-theme-foreground mb-1">
                      {stats?.currentStreak || 0}
                    </p>
                    <p className="text-sm text-text-secondary">Day Streak</p>
                  </div>

                  {/* Achievements */}
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-theme-foreground mb-1">
                      {stats?.achievementsUnlocked || 0}
                    </p>
                    <p className="text-sm text-text-secondary">Achievements</p>
                  </div>

                  {/* Profile Completion */}
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <Target className="w-6 h-6 text-green-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-theme-foreground mb-1">{profileCompletion}%</p>
                    <p className="text-sm text-text-secondary">Profile Complete</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    to="/customer/tour-miles"
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-theme-foreground font-semibold mb-1">Tour Miles Hub</h3>
                        <p className="text-sm text-text-secondary">Earn points, unlock rewards</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-white transition-colors" />
                    </div>
                  </Link>

                  <Link
                    to="/settings?section=tourhub"
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                        <Target className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-theme-foreground font-semibold mb-1">Complete Profile</h3>
                        <p className="text-sm text-text-secondary">Earn bonus Tour Miles</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-white transition-colors" />
                    </div>
                  </Link>

                  <button
                    onClick={() => setActiveTab('tools')}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
                        <Play className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-theme-foreground font-semibold mb-1">Explore Tools</h3>
                        <p className="text-sm text-text-secondary">Unlock with Tour Miles</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-white transition-colors" />
                    </div>
                  </button>
                </div>

                {/* Recent Activity */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-theme-foreground">Recent Activity</h2>
                    <Link to="/customer/tour-miles" className="text-sm text-brand-blue hover:underline">
                      View All
                    </Link>
                  </div>
                  {recentActivity && recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.slice(0, 5).map((activity: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                              <Clock className="w-5 h-5 text-text-secondary" />
                            </div>
                            <div>
                              <p className="text-theme-foreground text-sm">{activity.eventType?.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-text-secondary">
                                {new Date(activity.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-semibold ${activity.pointsEarned > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {activity.pointsEarned > 0 ? '+' : ''}{activity.pointsEarned} TP
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
                      <p className="text-text-secondary">No recent activity</p>
                      <p className="text-sm text-text-secondary mt-1">Start earning Tour Miles to see your activity here!</p>
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {activeTab === 'discover' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <Music className="w-16 h-16 text-brand-blue mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold text-theme-foreground mb-2">Discover Content Coming Soon</h2>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Curated playlists, new releases from Producer Tour artists, and featured producers will be available here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <Calendar className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold text-theme-foreground mb-2">Events Coming Soon</h2>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Community events, workshops, and networking opportunities will be listed here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'learning' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <BookOpen className="w-16 h-16 text-green-400 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold text-theme-foreground mb-2">Learning Center Coming Soon</h2>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Tips, tutorials, and educational content about music production and the industry.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <Heart className="w-16 h-16 text-red-400 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold text-theme-foreground mb-2">Wishlist Coming Soon</h2>
                  <p className="text-text-secondary max-w-md mx-auto">
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
