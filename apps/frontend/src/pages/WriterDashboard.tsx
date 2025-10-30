import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useState } from 'react';

export default function WriterDashboard() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'songs' | 'statements'>('overview');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return response.data;
    },
  });

  const { data: songsData } = useQuery({
    queryKey: ['dashboard-songs'],
    queryFn: async () => {
      const response = await dashboardApi.getSongs({ limit: 10 });
      return response.data;
    },
    enabled: activeTab === 'songs',
  });

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Writer Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1">
                Welcome back, {user?.firstName || user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-slate-600 rounded-lg hover:border-slate-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {summaryLoading ? (
          <div className="text-center text-gray-400 py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Earnings"
              value={`$${Number(summary?.totalEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="All time"
              color="blue"
            />
            <StatCard
              title="Year to Date"
              value={`$${Number(summary?.yearToDate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle={new Date().getFullYear().toString()}
              color="green"
            />
            <StatCard
              title="Last Month"
              value={`$${Number(summary?.lastMonth || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle={new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('en-US', { month: 'long' })}
              color="purple"
            />
            <StatCard
              title="Total Performances"
              value={Number(summary?.totalPerformances || 0).toLocaleString()}
              subtitle={`${summary?.totalSongs || 0} songs`}
              color="orange"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-slate-800 rounded-lg shadow-xl">
          <div className="border-b border-slate-700">
            <nav className="flex -mb-px">
              <TabButton
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </TabButton>
              <TabButton
                active={activeTab === 'songs'}
                onClick={() => setActiveTab('songs')}
              >
                My Songs
              </TabButton>
              <TabButton
                active={activeTab === 'statements'}
                onClick={() => setActiveTab('statements')}
              >
                Statements
              </TabButton>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="text-gray-300">
                <h3 className="text-lg font-medium text-white mb-4">Recent Activity</h3>
                <p className="text-gray-400">
                  Your statements and earnings will appear here.
                </p>
              </div>
            )}

            {activeTab === 'songs' && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Top Earning Songs</h3>
                {songsData?.songs?.length > 0 ? (
                  <div className="space-y-3">
                    {songsData.songs.map((song: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-white">{song.title}</p>
                          <p className="text-sm text-gray-400">
                            {song.totalPerformances} performances • {song.statementCount} statements
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-400">
                            ${Number(song.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No songs found</p>
                )}
              </div>
            )}

            {activeTab === 'statements' && (
              <div className="text-gray-300">
                <h3 className="text-lg font-medium text-white mb-4">Statements</h3>
                <p className="text-gray-400">
                  Your royalty statements will be listed here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle, color }: any) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6`}>
      <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary-500 text-primary-400'
          : 'border-transparent text-gray-400 hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  );
}
