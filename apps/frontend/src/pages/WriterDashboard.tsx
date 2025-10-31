import { useQuery } from '@tanstack/react-query';
import { dashboardApi, statementApi } from '../lib/api';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Navigation from '../components/Navigation';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function WriterDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'songs' | 'statements'>('overview');

  const writerTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'songs', label: 'My Songs', icon: '🎵' },
    { id: 'statements', label: 'Statements', icon: '📄' },
  ];

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return response.data;
    },
  });

  const { data: timelineData } = useQuery({
    queryKey: ['dashboard-timeline'],
    queryFn: async () => {
      const response = await dashboardApi.getTimeline();
      return response.data;
    },
    enabled: activeTab === 'overview',
  });

  const { data: statementsData, isLoading: statementsLoading } = useQuery({
    queryKey: ['user-statements'],
    queryFn: async () => {
      const response = await statementApi.getStatements();
      return response.data;
    },
    enabled: activeTab === 'statements' || activeTab === 'overview',
  });

  const { data: songsData } = useQuery({
    queryKey: ['dashboard-songs'],
    queryFn: async () => {
      const response = await dashboardApi.getSongs({ limit: 10 });
      return response.data;
    },
    enabled: activeTab === 'songs',
  });

  // Calculate PRO breakdown for pie chart
  const getProBreakdown = () => {
    if (!statementsData?.statements) return [];
    const proTotals: Record<string, number> = {};
    statementsData.statements.forEach((statement: any) => {
      const revenue = Number(statement.totalRevenue);
      proTotals[statement.proType] = (proTotals[statement.proType] || 0) + revenue;
    });
    return Object.entries(proTotals).map(([name, value]) => ({ name, value }));
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as 'overview' | 'songs' | 'statements')}
        tabs={writerTabs}
      />

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

        {/* Content */}
        <div className="bg-slate-800 rounded-lg shadow-xl p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Earnings Timeline Chart */}
                  <div className="bg-slate-700/30 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Earnings Timeline</h3>
                    {timelineData?.timeline?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={timelineData.timeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis
                            dataKey="month"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                          />
                          <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-400">
                        No earnings data available yet
                      </div>
                    )}
                  </div>

                  {/* PRO Breakdown Chart */}
                  <div className="bg-slate-700/30 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Revenue by PRO</h3>
                    {getProBreakdown().length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={getProBreakdown()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getProBreakdown().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-400">
                        No PRO data available yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Statements */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Recent Statements</h3>
                  {statementsLoading ? (
                    <div className="text-center text-gray-400 py-8">Loading...</div>
                  ) : statementsData?.statements?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {statementsData.statements.slice(0, 6).map((statement: any) => (
                        <StatementCard key={statement.id} statement={statement} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No statements available yet</p>
                  )}
                </div>
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
                        className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
                      >
                        {/* Rank Number */}
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-400">#{index + 1}</span>
                        </div>

                        {/* Song Info */}
                        <div className="flex-1">
                          <p className="font-medium text-white text-lg">{song.title}</p>
                          <p className="text-sm text-gray-400">
                            {song.totalPerformances.toLocaleString()} performances • {song.statementCount} statements
                          </p>
                        </div>

                        {/* Revenue */}
                        <div className="text-right">
                          <p className="font-semibold text-green-400 text-xl">
                            ${Number(song.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No songs found</p>
                )}
              </div>
            )}

            {activeTab === 'statements' && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">All Statements</h3>
                {statementsLoading ? (
                  <div className="text-center text-gray-400 py-8">Loading...</div>
                ) : statementsData?.statements?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statementsData.statements.map((statement: any) => (
                      <StatementCard key={statement.id} statement={statement} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No statements available yet</p>
                )}
              </div>
            )}
          </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle, color }: { title: string; value: string; subtitle: string; color: 'blue' | 'green' | 'purple' | 'orange' }) {
  const colorClasses: Record<string, string> = {
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

function StatementCard({ statement }: { statement: any }) {
  const proColors: Record<string, string> = {
    BMI: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    ASCAP: 'from-green-500/20 to-green-600/20 border-green-500/30',
    SESAC: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  };

  const statusColors: Record<string, string> = {
    PUBLISHED: 'bg-green-500/10 text-green-400 border-green-500/30',
    UPLOADED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    ERROR: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const formatPeriod = (statement: any) => {
    if (statement.periodStart && statement.periodEnd) {
      const start = new Date(statement.periodStart);
      const end = new Date(statement.periodEnd);
      return `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    return 'Period not specified';
  };

  return (
    <div className={`bg-gradient-to-br ${proColors[statement.proType] || proColors.BMI} border rounded-lg p-5 hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-bold text-white">{statement.proType}</h4>
          <p className="text-xs text-gray-400 mt-1">{formatPeriod(statement)}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[statement.status] || statusColors.UPLOADED}`}>
          {statement.status}
        </span>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Items:</span>
          <span className="text-white font-medium">{statement.itemCount || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Performances:</span>
          <span className="text-white font-medium">{Number(statement.totalPerformances || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-white/10">
          <span className="text-gray-400">Revenue:</span>
          <span className="text-green-400 font-bold text-lg">
            ${Number(statement.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
