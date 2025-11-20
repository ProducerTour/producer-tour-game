import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, statementApi, userApi, authApi } from '../lib/api';
import type { WriterAssignmentsPayload } from '../lib/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import ToolsHub from '../components/ToolsHub';
import ToolPermissionsSettings from '../components/ToolPermissionsSettings';
import DocumentsTab from '../components/DocumentsTab';
import PayoutsTab from '../components/PayoutsTab';
import ImpersonationBanner from '../components/ImpersonationBanner';
import PlacementTracker from '../components/admin/PlacementTracker';
import PendingPlacementsQueue from './PendingPlacementsQueue';
import { ChartCard } from '../components/ChartCard';
import { TerritoryHeatmap } from '../components/TerritoryHeatmap';
import { formatIpiDisplay } from '../utils/ipi-helper';
import { useAuthStore } from '../store/auth.store';

type TabType = 'overview' | 'statements' | 'users' | 'analytics' | 'documents' | 'tools' | 'commission' | 'payouts' | 'active-placements' | 'pending-placements' | 'tool-permissions';

// Smart currency formatter for charts: 2 decimals normally, 4 decimals for micro-amounts
const formatChartCurrency = (value: any): string => {
  const num = Number(value);
  const rounded2 = Math.round(num * 100) / 100;
  if (rounded2 === 0 && num > 0) {
    return `$${(Math.round(num * 10000) / 10000).toFixed(4)}`;
  }
  return `$${rounded2.toFixed(2)}`;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const adminTabs = [
    { id: 'overview', label: 'Dashboard', icon: '🏠' },
    { id: 'statements', label: 'Statements', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'payouts', label: 'Payouts', icon: '💰' },
    {
      id: 'placement-deals',
      label: 'Placement Tracker',
      icon: '🎵',
      children: [
        { id: 'pending-placements', label: 'Pending Placements', icon: '⏳' },
        { id: 'active-placements', label: 'Producer Clearances', icon: '✅' },
      ],
    },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'tools', label: 'Tools Hub', icon: '🛠️' },
    { id: 'tool-permissions', label: 'Tool Permissions', icon: '🔐' },
    { id: 'commission', label: 'Commission Settings', icon: '💼' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
          tabs={adminTabs}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {activeTab === 'overview' && <DashboardOverview />}
            {activeTab === 'statements' && <StatementsTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'payouts' && <PayoutsTab />}
            {activeTab === 'pending-placements' && <PendingPlacementsQueue />}
            {activeTab === 'active-placements' && <PlacementTracker />}
            {activeTab === 'documents' && <DocumentsTab />}
            {activeTab === 'tools' && <ToolsHub />}
            {activeTab === 'tool-permissions' && <ToolPermissionsSettings />}
            {activeTab === 'commission' && <CommissionSettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

import CommissionSettingsPage from './CommissionSettingsPage';

function DashboardOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
  });

  const { data: statementsData } = useQuery({
    queryKey: ['recent-statements'],
    queryFn: async () => {
      const response = await statementApi.list();
      return response.data;
    },
  });

  const recentStatements = statementsData?.statements?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${Number(stats?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          percentage={stats?.totalRevenueChange !== null && stats?.totalRevenueChange !== undefined ? `${stats.totalRevenueChange > 0 ? '+' : ''}${stats.totalRevenueChange}%` : undefined}
          trend={stats?.totalRevenueTrend || undefined}
          icon="💰"
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Total Writers"
          value={stats?.totalWriters || 0}
          percentage={stats?.totalWritersChange !== null && stats?.totalWritersChange !== undefined ? `${stats.totalWritersChange > 0 ? '+' : ''}${stats.totalWritersChange}%` : undefined}
          trend={stats?.totalWritersTrend || undefined}
          icon="👥"
          gradient="from-cyan-500 to-cyan-600"
        />
        <StatCard
          title="Active Statements"
          value={stats?.processedStatements || 0}
          percentage={stats?.processedStatementsChange !== null && stats?.processedStatementsChange !== undefined ? `${stats.processedStatementsChange > 0 ? '+' : ''}${stats.processedStatementsChange}%` : undefined}
          trend={stats?.processedStatementsTrend || undefined}
          icon="📊"
          gradient="from-pink-500 to-pink-600"
        />
        <StatCard
          title="Unique Works"
          value={stats?.uniqueWorks || 0}
          percentage={stats?.uniqueWorksChange !== null && stats?.uniqueWorksChange !== undefined ? `${stats.uniqueWorksChange > 0 ? '+' : ''}${stats.uniqueWorksChange}%` : undefined}
          trend={stats?.uniqueWorksTrend || undefined}
          icon="🎵"
          gradient="from-orange-500 to-orange-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Revenue Overview</h3>
            <select className="bg-slate-700 text-gray-300 text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option>Last 12 months</option>
              <option>Last 6 months</option>
              <option>Last 3 months</option>
            </select>
          </div>
          {stats?.revenueTimeline && stats.revenueTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.revenueTimeline}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                  itemStyle={{ color: '#3b82f6' }}
                  formatter={(value: any) => [formatChartCurrency(value), 'Revenue']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  fill="url(#revenueGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No revenue data available
            </div>
          )}
        </div>

        {/* PRO Distribution */}
        <div className="bg-slate-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Statement Distribution</h3>
          {stats?.statementsByPRO && stats.statementsByPRO.length > 0 ? (
            <div className="space-y-4">
              {stats.statementsByPRO.map((item: any, index: number) => {
                const total = stats.statementsByPRO.reduce((acc: number, curr: any) => acc + curr.count, 0);
                const percentage = ((item.count / total) * 100).toFixed(1);
                const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-purple-500'];

                return (
                  <div key={item.proType} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[index % 3]}`}></div>
                        <span className="text-gray-300 font-medium">{item.proType}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-semibold">{item.count}</span>
                        <span className="text-gray-400 text-sm ml-2">{percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`${colors[index % 3]} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No statement data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Statements */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Statements</h3>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {recentStatements.length > 0 ? (
              recentStatements.map((statement: any) => (
                <div
                  key={statement.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      statement.proType === 'BMI' ? 'bg-blue-500/20' :
                      statement.proType === 'ASCAP' ? 'bg-cyan-500/20' :
                      'bg-purple-500/20'
                    }`}>
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{statement.filename}</p>
                      <p className="text-gray-400 text-sm">
                        {statement.proType} • {statement.itemCount || 0} items
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">
                      ${Number(statement.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      statement.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' :
                      statement.status === 'PROCESSED' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {statement.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">No recent statements</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg text-white font-medium transition-all shadow-lg shadow-blue-500/50">
              <span className="text-xl">📊</span>
              <span>Upload Statement</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">
              <span className="text-xl">👥</span>
              <span>Add Writer</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">
              <span className="text-xl">📄</span>
              <span>Upload Document</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">
              <span className="text-xl">📈</span>
              <span>View Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatementsTab() {
  const queryClient = useQueryClient();
  const [selectedPRO, setSelectedPRO] = useState<'BMI' | 'ASCAP' | 'SESAC' | 'MLC'>('BMI');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [reviewingStatement, setReviewingStatement] = useState<any>(null);
  const [deletingStatement, setDeletingStatement] = useState<any>(null);

  const { data: statementsData, isLoading } = useQuery({
    queryKey: ['admin-statements'],
    queryFn: async () => {
      const response = await statementApi.list();
      return response.data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-for-assignment'],
    queryFn: async () => {
      const response = await userApi.list();
      return response.data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: (statementId: string) => statementApi.publish(statementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-statements'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to publish statement');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (statementId: string) => statementApi.delete(statementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-statements'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await statementApi.upload(selectedFile, selectedPRO);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-statements'] });
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      setUploadError(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Filter statements into queue (UPLOADED, PROCESSED) and completed (PUBLISHED)
  const queueStatements = statementsData?.statements?.filter((s: any) =>
    s.status === 'UPLOADED' || s.status === 'PROCESSED' || s.status === 'ERROR'
  ) || [];

  const completedStatements = statementsData?.statements?.filter((s: any) =>
    s.status === 'PUBLISHED'
  ) || [];

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-slate-700/30 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Upload New Statement</h3>

        <div className="space-y-4">
          {/* PRO Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Statement Type
            </label>
            <div className="flex gap-3">
              {(['BMI', 'ASCAP', 'SESAC', 'MLC'] as const).map((pro) => (
                <button
                  key={pro}
                  onClick={() => setSelectedPRO(pro)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedPRO === pro
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                  }`}
                >
                  {pro}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {selectedPRO === 'MLC' ? 'TSV File' : 'CSV File'}
            </label>
            <div className="flex items-center gap-4">
              <input
                id="file-upload"
                type="file"
                accept={selectedPRO === 'MLC' ? '.tsv,.txt' : '.csv'}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-500 file:text-white
                  hover:file:bg-primary-600
                  file:cursor-pointer cursor-pointer"
              />
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload & Process'}
              </button>
            </div>
            {selectedFile && (
              <p className="mt-2 text-sm text-green-400">
                Selected: {selectedFile.name}
              </p>
            )}
            {uploadError && (
              <p className="mt-2 text-sm text-red-400">
                {uploadError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statements Queue */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Statement Queue</h3>
        {isLoading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : queueStatements.length > 0 ? (
          <div className="space-y-3">
            {queueStatements.map((statement: any) => (
              <div
                key={statement.id}
                className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      statement.proType === 'BMI' ? 'bg-blue-500/20 text-blue-400' :
                      statement.proType === 'ASCAP' ? 'bg-green-500/20 text-green-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {statement.proType}
                    </span>
                    <span className="text-white font-medium">{statement.filename}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      statement.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' :
                      statement.status === 'PROCESSED' ? 'bg-yellow-500/20 text-yellow-400' :
                      statement.status === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {statement.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-gray-400">
                    <span>Items: {statement.itemCount || 0}</span>
                    <span>Performances: {Number(statement.totalPerformances).toLocaleString()}</span>
                    <span className="text-green-400">
                      ${Number(statement.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {statement.status === 'UPLOADED' && (
                    <button
                      onClick={() => setReviewingStatement(statement)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      Review & Assign
                    </button>
                  )}
                  {statement.status === 'PROCESSED' && (
                    <button
                      onClick={() => publishMutation.mutate(statement.id)}
                      disabled={publishMutation.isPending}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-600 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => setDeletingStatement(statement)}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:bg-gray-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No statements in queue</p>
        )}
      </div>

      {/* Completed Statements */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Completed Statements</h3>
        {isLoading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : completedStatements.length > 0 ? (
          <div className="space-y-3">
            {completedStatements.map((statement: any) => (
              <div
                key={statement.id}
                className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      statement.proType === 'BMI' ? 'bg-blue-500/20 text-blue-400' :
                      statement.proType === 'ASCAP' ? 'bg-green-500/20 text-green-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {statement.proType}
                    </span>
                    <span className="text-white font-medium">{statement.filename}</span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                      PUBLISHED
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-gray-400">
                    <span>Items: {statement.itemCount || 0}</span>
                    <span>Performances: {Number(statement.totalPerformances).toLocaleString()}</span>
                    <span className="text-green-400">
                      ${Number(statement.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setDeletingStatement(statement)}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:bg-gray-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No completed statements</p>
        )}
      </div>

      {/* Review & Assignment Modal */}
      {reviewingStatement && (
        <ReviewAssignmentModal
          statement={reviewingStatement}
          writers={usersData?.users || []}
          onClose={() => setReviewingStatement(null)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-statements'] });
            setReviewingStatement(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingStatement && (
        <DeleteConfirmationModal
          statement={deletingStatement}
          onClose={() => setDeletingStatement(null)}
          onConfirm={() => {
            deleteMutation.mutate(deletingStatement.id);
            setDeletingStatement(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewAssignmentModal({ statement, writers, onClose, onSave }: any) {
  const [assignments, setAssignments] = useState<WriterAssignmentsPayload>({});
  const [assignAllWriter, setAssignAllWriter] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [smartAssigning, setSmartAssigning] = useState(false);
  const [smartAssignResults, setSmartAssignResults] = useState<any>(null);

  // Filter/Search/Sort state
  const [statusFilter, setStatusFilter] = useState<'all' | 'auto' | 'suggested' | 'manual'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'revenue-desc' | 'revenue-asc' | 'title-asc' | 'title-desc'>('revenue-desc');

  // Virtual scrolling ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const writersList = writers.filter((w: any) => w.role === 'WRITER');

  // Detect MLC format from statement metadata
  const isMLC = statement.metadata?.pro === 'MLC';

  // Get rows to display - MLC uses parsedItems (publisher rows), Traditional uses songs
  const getDisplayRows = () => {
    if (isMLC) {
      // MLC: Each parsedItem is a publisher row
      return (statement.metadata?.parsedItems || []).map((item: any) => ({
        workTitle: item.workTitle,
        revenue: item.revenue || 0,
        performances: item.performances || 0,
        publisherInfo: {
          originalPublisherName: item.metadata?.originalPublisherName,
          originalPublisherIpi: item.metadata?.originalPublisherIpi,
          dspName: item.metadata?.dspName,
          consumerOffering: item.metadata?.consumerOffering,
          territory: item.metadata?.territory,
          workWriterList: item.metadata?.workWriterList || []
        }
      }));
    } else {
      // Traditional: Aggregated songs
      return (statement.metadata?.songs || []).map((song: any) => ({
        workTitle: song.title,
        revenue: song.totalRevenue || song.totalAmount || 0,
        performances: song.performances || 0
      }));
    }
  };

  const displayRows = getDisplayRows();

  // Generate key for row - composite for MLC, simple for traditional
  const getRowKey = (row: any) => {
    if (isMLC) {
      const publisherIpi = row.publisherInfo?.originalPublisherIpi || 'none';
      const dspName = row.publisherInfo?.dspName || 'none';
      return `${row.workTitle}|${publisherIpi}|${dspName}`;
    }
    return row.workTitle;
  };

  // Get confidence badge info from Smart Assign results
  const getConfidenceBadge = (rowKey: string) => {
    if (!smartAssignResults) return null;

    const autoMatch = smartAssignResults.autoAssigned?.find((m: any) => getRowKey(m) === rowKey);
    if (autoMatch) {
      return { badge: '✓ Auto-assigned', class: 'bg-green-500/20 text-green-400 border-green-500/30', level: 'high' };
    }

    const suggested = smartAssignResults.suggested?.find((s: any) => getRowKey(s) === rowKey);
    if (suggested) {
      return { badge: '⚠ Review Suggested', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', level: 'medium' };
    }

    const unmatched = smartAssignResults.unmatched?.find((u: any) => getRowKey(u) === rowKey);
    if (unmatched) {
      return { badge: '✗ Manual Required', class: 'bg-red-500/20 text-red-400 border-red-500/30', level: 'low' };
    }

    return null;
  };

  // Filter, search, and sort displayRows
  const filteredAndSortedRows = useMemo(() => {
    let rows = [...displayRows];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      rows = rows.filter((row: any) => {
        const titleMatch = row.workTitle?.toLowerCase().includes(query);
        const publisherMatch = row.publisherInfo?.originalPublisherName?.toLowerCase().includes(query);
        return titleMatch || publisherMatch;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      rows = rows.filter((row: any) => {
        const rowKey = getRowKey(row);
        const badge = getConfidenceBadge(rowKey);
        if (statusFilter === 'auto') return badge?.level === 'high';
        if (statusFilter === 'suggested') return badge?.level === 'medium';
        if (statusFilter === 'manual') return badge?.level === 'low' || !badge;
        return true;
      });
    }

    // Apply sorting
    rows.sort((a: any, b: any) => {
      if (sortBy === 'revenue-desc') return (b.revenue || 0) - (a.revenue || 0);
      if (sortBy === 'revenue-asc') return (a.revenue || 0) - (b.revenue || 0);
      if (sortBy === 'title-asc') return (a.workTitle || '').localeCompare(b.workTitle || '');
      if (sortBy === 'title-desc') return (b.workTitle || '').localeCompare(a.workTitle || '');
      return 0;
    });

    return rows;
  }, [displayRows, searchQuery, statusFilter, sortBy, smartAssignResults, isMLC]);

  const formatCurrency = (amount: number): string => {
    // Smart rounding: 2 decimals normally, 4 decimals for micro-amounts
    const rounded2 = Math.round(amount * 100) / 100;
    if (rounded2 === 0 && amount > 0) {
      // Micro-amount: use 4 decimals
      return (Math.round(amount * 10000) / 10000).toFixed(4);
    }
    return rounded2.toFixed(2);
  };

  const handleAssignAll = () => {
    if (!assignAllWriter) return;
    const newAssignments: WriterAssignmentsPayload = { ...assignments };
    const selectedWriter = writersList.find((w: any) => w.id === assignAllWriter);
    filteredAndSortedRows.forEach((row: any) => {
      newAssignments[getRowKey(row)] = [{
        userId: assignAllWriter,
        writerIpiNumber: selectedWriter?.writerIpiNumber || '',
        publisherIpiNumber: selectedWriter?.publisherIpiNumber || '',
        splitPercentage: 100
      }];
    });
    setAssignments(newAssignments);
  };

  const handleSmartAssign = async () => {
    setSmartAssigning(true);
    try {
      const response = await statementApi.smartAssign(statement.id);
      const results = response.data;
      setSmartAssignResults(results);

      const newAssignments: WriterAssignmentsPayload = {};

      // Process auto-assigned matches (>=90% confidence)
      results.autoAssigned?.forEach((match: any) => {
        if (!match.writers || match.writers.length === 0) return;

        const numWriters = match.writers.length;
        const equalSplit = parseFloat((100 / numWriters).toFixed(2));
        const key = getRowKey(match); // Uses isMLC to generate correct key

        newAssignments[key] = match.writers.map((w: any) => ({
          userId: w.writer.id,
          writerIpiNumber: w.writer.writerIpiNumber || '',
          publisherIpiNumber: w.writer.publisherIpiNumber || '',
          splitPercentage: equalSplit
        }));
      });

      // Process suggested matches (70-90% confidence) - use top match
      results.suggested?.forEach((suggestion: any) => {
        if (suggestion.matches && suggestion.matches.length > 0) {
          const topMatch = suggestion.matches[0];
          const key = getRowKey(suggestion);

          newAssignments[key] = [{
            userId: topMatch.writer.id,
            writerIpiNumber: topMatch.writer.writerIpiNumber || '',
            publisherIpiNumber: topMatch.writer.publisherIpiNumber || '',
            splitPercentage: 100
          }];
        }
      });

      setAssignments(newAssignments);
      alert(`Smart Assign Complete!\n\n✓ Auto-assigned: ${results.summary.autoAssignedCount} rows\n⚠ Suggested: ${results.summary.suggestedCount} rows\n✗ Unmatched: ${results.summary.unmatchedCount} rows`);
    } catch (error: any) {
      console.error('Smart assign error:', error);
      alert(error.response?.data?.error || 'Failed to smart assign writers');
    } finally {
      setSmartAssigning(false);
    }
  };

  const addWriter = (songTitle: string) => {
    const currentAssignments = assignments[songTitle] || [];
    const newWriterCount = currentAssignments.length + 1;
    const equalSplit = parseFloat((100 / newWriterCount).toFixed(2));

    const updatedAssignments = currentAssignments.map(a => ({
      ...a,
      splitPercentage: equalSplit
    }));

    setAssignments({
      ...assignments,
      [songTitle]: [...updatedAssignments, { userId: '', writerIpiNumber: '', publisherIpiNumber: '', splitPercentage: equalSplit }]
    });
  };

  const removeWriter = (songTitle: string, index: number) => {
    const currentAssignments = assignments[songTitle] || [];
    if (currentAssignments.length <= 1) return;

    const updatedAssignments = currentAssignments.filter((_, i) => i !== index);
    const equalSplit = parseFloat((100 / updatedAssignments.length).toFixed(2));

    setAssignments({
      ...assignments,
      [songTitle]: updatedAssignments.map(a => ({
        ...a,
        splitPercentage: equalSplit
      }))
    });
  };

  const updateWriter = (songTitle: string, index: number, field: 'userId' | 'writerIpiNumber' | 'publisherIpiNumber' | 'splitPercentage', value: any) => {
    const currentAssignments = assignments[songTitle] || [];
    const updatedAssignments = [...currentAssignments];

    // Ensure the assignment object exists at this index
    if (!updatedAssignments[index]) {
      updatedAssignments[index] = { userId: '', writerIpiNumber: '', publisherIpiNumber: '', splitPercentage: 100 };
    }

    if (field === 'userId') {
      const selectedWriter = writersList.find((w: any) => w.id === value);
      updatedAssignments[index] = {
        ...updatedAssignments[index],
        userId: value,
        writerIpiNumber: selectedWriter?.writerIpiNumber || updatedAssignments[index].writerIpiNumber || '',
        publisherIpiNumber: selectedWriter?.publisherIpiNumber || updatedAssignments[index].publisherIpiNumber || ''
      };
    } else {
      updatedAssignments[index] = {
        ...updatedAssignments[index],
        [field]: field === 'splitPercentage' ? parseFloat(value) || 0 : value
      };
    }

    setAssignments({
      ...assignments,
      [songTitle]: updatedAssignments
    });
  };

  const getSplitTotal = (songTitle: string) => {
    const songAssignments = assignments[songTitle] || [];
    return songAssignments.reduce((sum, a) => sum + (a.splitPercentage || 0), 0);
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalRevenue = displayRows.reduce((sum: number, row: any) => sum + (row.revenue || 0), 0);
    const autoCount = smartAssignResults?.summary?.autoAssignedCount || 0;
    const suggestedCount = smartAssignResults?.summary?.suggestedCount || 0;
    const manualCount = smartAssignResults?.summary?.unmatchedCount || 0;

    return {
      totalRows: displayRows.length,
      filteredRows: filteredAndSortedRows.length,
      totalRevenue,
      autoCount,
      suggestedCount,
      manualCount
    };
  }, [displayRows, filteredAndSortedRows.length, smartAssignResults]);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: filteredAndSortedRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 220, // Approximate row height in pixels
    overscan: 5, // Render 5 extra rows above/below viewport for smoother scrolling
  });

  const handleSave = async () => {
    // Check if all rows have at least one assignment
    const unassigned = displayRows.filter((row: any) => {
      const rowKey = getRowKey(row);
      const rowAssignments = assignments[rowKey] || [];
      return rowAssignments.length === 0 || rowAssignments.some(a => !a.userId);
    });

    if (unassigned.length > 0) {
      alert(`Please assign writers to all rows. ${unassigned.length} ${isMLC ? 'publisher rows' : 'songs'} have incomplete assignments.`);
      return;
    }

    setSaving(true);
    try {
      await statementApi.assignWriters(statement.id, assignments);
      onSave();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-xl font-bold text-white">Review & Assign Writers</h3>
          <p className="text-sm text-gray-400 mt-1">
            {statement.filename} • {displayRows.length} {isMLC ? 'publisher rows' : 'songs'}
          </p>
        </div>

        {/* Summary Stats Bar */}
        <div className="px-6 pt-4 pb-2 bg-slate-700/20 border-b border-slate-700/50">
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Total Revenue</div>
              <div className="text-white font-semibold">${formatCurrency(summaryStats.totalRevenue)}</div>
            </div>
            {smartAssignResults && (
              <>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="text-green-400 text-xs mb-1">✓ Auto-assigned</div>
                  <div className="text-white font-semibold">{summaryStats.autoCount}</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <div className="text-yellow-400 text-xs mb-1">⚠ Review Suggested</div>
                  <div className="text-white font-semibold">{summaryStats.suggestedCount}</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="text-red-400 text-xs mb-1">✗ Manual Required</div>
                  <div className="text-white font-semibold">{summaryStats.manualCount}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-slate-700/10 border-b border-slate-700/50 space-y-3">
          <div className="flex gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="🔍 Search songs or publishers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter */}
            {smartAssignResults && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="all">All Rows</option>
                <option value="auto">✓ Auto-assigned</option>
                <option value="suggested">⚠ Review Suggested</option>
                <option value="manual">✗ Manual Required</option>
              </select>
            )}

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="revenue-desc">Revenue: High → Low</option>
              <option value="revenue-asc">Revenue: Low → High</option>
              <option value="title-asc">Title: A → Z</option>
              <option value="title-desc">Title: Z → A</option>
            </select>
          </div>

          {/* Showing X of Y */}
          <div className="text-xs text-gray-400">
            Showing {summaryStats.filteredRows} of {summaryStats.totalRows} rows
            {summaryStats.filteredRows < summaryStats.totalRows && (
              <span className="text-primary-400 ml-1">(filtered)</span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Smart Assign & Quick Assign Section */}
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-4">
            {/* Smart Assign */}
            <div>
              <h4 className="text-sm font-medium text-white mb-3">🧠 Smart Assign (AI Matching)</h4>
              <p className="text-xs text-gray-400 mb-3">
                Automatically match writers using IPI numbers, name similarity, and historical assignments
              </p>
              <button
                onClick={handleSmartAssign}
                disabled={smartAssigning}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {smartAssigning ? '⏳ Analyzing...' : '✨ Smart Assign Writers'}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-600"></div>

            {/* Manual Assign All */}
            <div>
              <h4 className="text-sm font-medium text-white mb-3">Manual: Assign All to One Writer</h4>
              <div className="flex gap-3">
                <select
                  value={assignAllWriter}
                  onChange={(e) => setAssignAllWriter(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">Select a writer...</option>
                  {writersList.map((writer: any) => (
                    <option key={writer.id} value={writer.id}>
                      {writer.firstName || writer.middleName || writer.lastName
                        ? `${writer.firstName || ''} ${writer.middleName || ''} ${writer.lastName || ''}`.trim().replace(/\s+/g, ' ')
                        : writer.email}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignAll}
                  disabled={!assignAllWriter}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  Assign All
                </button>
              </div>
            </div>
          </div>

          {/* Individual Row Assignments - Unified UI for both MLC and Traditional */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white">
              {isMLC ? `MLC Publisher Rows (${summaryStats.filteredRows} rows)` : `Assign Writers to Songs (${summaryStats.filteredRows} songs)`}
            </h4>
            {isMLC && <p className="text-xs text-gray-400">Each row represents a unique publisher/platform combination</p>}

            {/* Virtual scrolling container */}
            <div
              ref={scrollContainerRef}
              className="overflow-auto"
              style={{ maxHeight: '500px' }}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = filteredAndSortedRows[virtualRow.index];
                  const rowKey = getRowKey(row);
                  const rowAssignments = assignments[rowKey] || [{ userId: '', writerIpiNumber: '', publisherIpiNumber: '', splitPercentage: 100 }];
                  const splitTotal = getSplitTotal(rowKey);
                  const badgeInfo = getConfidenceBadge(rowKey);

                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="pb-4"
                    >
                      <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {/* Title + Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-white">{row.workTitle}</p>
                        {badgeInfo && (
                          <span className={`px-2 py-0.5 text-xs border rounded ${badgeInfo.class}`}>
                            {badgeInfo.badge}
                          </span>
                        )}
                      </div>

                      {/* Revenue + Performances */}
                      <p className="text-sm text-gray-400 mb-3">
                        ${formatCurrency(row.revenue)} • {row.performances} performances
                      </p>

                      {/* MLC: Publisher Info Card */}
                      {isMLC && row.publisherInfo && (
                        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 border border-slate-600/30 mb-3">
                          {row.publisherInfo.originalPublisherName && (
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-gray-500 font-medium min-w-[75px]">Publisher:</span>
                              <div>
                                <span className="text-blue-400 font-medium">{row.publisherInfo.originalPublisherName}</span>
                                {row.publisherInfo.originalPublisherIpi && (
                                  <span className="text-gray-500 text-xs ml-2">IPI: {row.publisherInfo.originalPublisherIpi}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {(row.publisherInfo.dspName || row.publisherInfo.territory) && (
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              {row.publisherInfo.dspName && (
                                <div>
                                  <span className="text-gray-500">Platform:</span> {row.publisherInfo.dspName}
                                  {row.publisherInfo.consumerOffering && <span className="text-gray-500"> ({row.publisherInfo.consumerOffering})</span>}
                                </div>
                              )}
                              {row.publisherInfo.territory && (
                                <div><span className="text-gray-500">Territory:</span> {row.publisherInfo.territory}</div>
                              )}
                            </div>
                          )}

                          {row.publisherInfo.workWriterList && row.publisherInfo.workWriterList.length > 0 && (
                            <div className="text-sm">
                              <span className="text-gray-500">Work Writers:</span>{' '}
                              <span className="text-gray-400">{row.publisherInfo.workWriterList.map((w: any) => w.name).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => addWriter(rowKey)}
                      className="px-3 py-1 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors whitespace-nowrap"
                    >
                      + Add Writer
                    </button>
                  </div>

                  {/* Writer Assignment Inputs */}
                  <div className="space-y-2">
                    {rowAssignments.map((assignment, writerIndex) => (
                      <div key={writerIndex} className="grid grid-cols-12 gap-2 items-center">
                        <select
                          value={assignment.userId}
                          onChange={(e) => updateWriter(rowKey, writerIndex, 'userId', e.target.value)}
                          className={`col-span-4 px-3 py-2 border rounded-lg focus:outline-none ${
                            assignment.userId ? 'bg-slate-700 border-green-500/50 text-white' : 'bg-slate-700 border-slate-600 text-gray-400'
                          }`}
                        >
                          <option value="">Select writer...</option>
                          {writersList.map((writer: any) => (
                            <option key={writer.id} value={writer.id}>
                              {writer.firstName || writer.middleName || writer.lastName
                                ? `${writer.firstName || ''} ${writer.middleName || ''} ${writer.lastName || ''}`.trim().replace(/\s+/g, ' ')
                                : writer.email}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="Writer IPI"
                          value={assignment.writerIpiNumber}
                          onChange={(e) => updateWriter(rowKey, writerIndex, 'writerIpiNumber', e.target.value)}
                          className="col-span-2 px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                        />

                        <input
                          type="text"
                          placeholder="Publisher IPI"
                          value={assignment.publisherIpiNumber}
                          onChange={(e) => updateWriter(rowKey, writerIndex, 'publisherIpiNumber', e.target.value)}
                          className="col-span-2 px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                        />

                        <div className="col-span-2 relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={assignment.splitPercentage}
                            onChange={(e) => updateWriter(rowKey, writerIndex, 'splitPercentage', e.target.value)}
                            className="w-full px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">%</span>
                        </div>

                        <button
                          onClick={() => removeWriter(rowKey, writerIndex)}
                          disabled={rowAssignments.length <= 1}
                          className="col-span-2 px-2 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Split Total Warning */}
                  {Math.abs(splitTotal - 100) > 0.01 && (
                    <div className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                      Total: {splitTotal.toFixed(2)}% (Note: Splits don't equal 100%, but this is allowed)
                    </div>
                  )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>


        <div className="p-6 border-t border-slate-700 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-600 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ statement, onClose, onConfirm }: any) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmEnabled = confirmText.toLowerCase() === 'delete';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold text-white mb-4">Delete Statement</h3>

        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">
              ⚠️ Warning: This action cannot be undone!
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-gray-300">
              You are about to delete the following statement:
            </p>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-white font-medium">{statement.filename}</p>
              <p className="text-sm text-gray-400 mt-1">
                {statement.proType} • {statement.itemCount || 0} items
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-gray-300 text-sm">
              This will permanently remove this statement and all associated data from the system.
            </p>
            <p className="text-gray-300 text-sm font-medium">
              To confirm deletion, type <span className="text-red-400 font-mono">delete</span> below:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isConfirmEnabled}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Delete Statement
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { startImpersonation } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    middleName: '',
    lastName: '',
    role: 'WRITER',
    writerIpiNumber: '',
    publisherName: '',
    publisherIpiNumber: '',
    subPublisherName: '',
    subPublisherIpiNumber: '',
    proAffiliation: 'BMI',
    commissionOverrideRate: '',
    canUploadStatements: false,
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await userApi.list();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => userApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowAddModal(false);
      setNewUser({ email: '', password: '', firstName: '', middleName: '', lastName: '', role: 'WRITER', writerIpiNumber: '', publisherName: '', publisherIpiNumber: '', subPublisherName: '', subPublisherIpiNumber: '', proAffiliation: 'BMI', commissionOverrideRate: '', canUploadStatements: false });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => userApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const handleAddUser = () => {
    if (!newUser.email || !newUser.password) {
      alert('Email and password are required');
      return;
    }
    // Prepare payload with optional commission override
    const payload: any = { ...newUser };
    if (payload.commissionOverrideRate === '') delete payload.commissionOverrideRate;
    else payload.commissionOverrideRate = parseFloat(payload.commissionOverrideRate);
    createMutation.mutate(payload);
  };

  const handleUpdateUser = () => {
    if (!editingUser.email) {
      alert('Email is required');
      return;
    }
    const { id, ...data } = editingUser;
    // Only include password if it was changed
    if (!data.password) {
      delete data.password;
    }
    // Normalize commission override rate
    if (data.commissionOverrideRate === '') {
      data.commissionOverrideRate = null;
    } else if (data.commissionOverrideRate !== undefined) {
      data.commissionOverrideRate = parseFloat(data.commissionOverrideRate);
    }
    // Flatten producer.proAffiliation into top-level update payload
    if (data.producer && data.producer.proAffiliation !== undefined) {
      data.proAffiliation = data.producer.proAffiliation;
      delete data.producer;
    }
    updateMutation.mutate({ id, data });
  };

  const handleViewAs = async (user: any) => {
    try {
      const response = await authApi.impersonate(user.id);
      const { token, user: impersonatedUser } = response.data;
      startImpersonation(impersonatedUser, token);
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to impersonate user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">User Management</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
        >
          + Add User
        </button>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      ) : usersData?.users?.length > 0 ? (
        <div className="bg-slate-700/30 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Writer IPI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Publisher IPI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">PRO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {usersData.users.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {user.firstName || user.middleName || user.lastName
                        ? `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim().replace(/\s+/g, ' ')
                        : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">{formatIpiDisplay(user.writerIpiNumber)}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">{formatIpiDisplay(user.publisherIpiNumber)}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">{user.producer?.proAffiliation || '-'}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">{user.commissionOverrideRate != null ? `${Number(user.commissionOverrideRate).toFixed(2)}%` : 'Default'}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleViewAs(user)}
                        className="text-cyan-400 hover:text-cyan-300"
                        title="View dashboard as this user"
                      >
                        View As
                      </button>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      {user.role !== 'ADMIN' && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${user.email}?`)) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400 text-center py-8">No users found</p>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Add New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="WRITER">Writer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="LEGAL">Legal</option>
                  <option value="MANAGER">Manager</option>
                  <option value="PUBLISHER">Publisher</option>
                  <option value="STAFF">Staff</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={newUser.middleName}
                  onChange={(e) => setNewUser({ ...newUser, middleName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Writer and Publisher specific fields */}
              {(newUser.role === 'WRITER' || newUser.role === 'PUBLISHER') && (
                <>
                  {newUser.role === 'WRITER' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Writer IPI Number
                      </label>
                      <input
                        type="text"
                        value={newUser.writerIpiNumber}
                        onChange={(e) => setNewUser({ ...newUser, writerIpiNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        placeholder="Writer IPI/CAE Number"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Publisher Name
                    </label>
                    <input
                      type="text"
                      value={newUser.publisherName}
                      onChange={(e) => setNewUser({ ...newUser, publisherName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="Publisher Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Publisher IPI Number
                    </label>
                    <input
                      type="text"
                      value={newUser.publisherIpiNumber}
                      onChange={(e) => setNewUser({ ...newUser, publisherIpiNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="Publisher IPI/CAE Number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Sub Publisher Name / Administrator
                    </label>
                    <input
                      type="text"
                      value={newUser.subPublisherName}
                      onChange={(e) => setNewUser({ ...newUser, subPublisherName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="Sub Publisher Name / Administrator"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Sub Publisher IPI Number
                    </label>
                    <input
                      type="text"
                      value={newUser.subPublisherIpiNumber}
                      onChange={(e) => setNewUser({ ...newUser, subPublisherIpiNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="Sub Publisher IPI Number"
                    />
                  </div>
                  {newUser.role === 'WRITER' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          PRO Affiliation
                        </label>
                        <select
                          value={newUser.proAffiliation}
                          onChange={(e) => setNewUser({ ...newUser, proAffiliation: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        >
                          <option value="BMI">BMI</option>
                          <option value="ASCAP">ASCAP</option>
                          <option value="SESAC">SESAC</option>
                          <option value="GMR">GMR</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Commission Override (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={newUser.commissionOverrideRate}
                          onChange={(e) => setNewUser({ ...newUser, commissionOverrideRate: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                          placeholder="Leave blank to use default"
                        />
                        <p className="text-xs text-gray-400 mt-1">If left blank, uses the global commission rate.</p>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Viewer-specific fields */}
              {newUser.role === 'VIEWER' && (
                <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="canUploadStatements"
                    checked={newUser.canUploadStatements}
                    onChange={(e) => setNewUser({ ...newUser, canUploadStatements: e.target.checked })}
                    className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <label htmlFor="canUploadStatements" className="text-sm text-gray-300">
                    Allow statement uploads
                  </label>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddUser}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-600 transition-colors"
              >
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Role *
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="WRITER">Writer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="LEGAL">Legal</option>
                  <option value="MANAGER">Manager</option>
                  <option value="PUBLISHER">Publisher</option>
                  <option value="STAFF">Staff</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={editingUser.firstName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={editingUser.middleName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, middleName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editingUser.lastName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Writer and Publisher specific fields */}
              {(editingUser.role === 'WRITER' || editingUser.role === 'PUBLISHER') && (
                <>
                  {editingUser.role === 'WRITER' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Writer IPI Number
                      </label>
                      <input
                        type="text"
                        value={editingUser.writerIpiNumber || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, writerIpiNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        placeholder="Writer IPI/CAE Number"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Publisher Name
                    </label>
                    <input
                      type="text"
                      value={editingUser.publisherName || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, publisherName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="Publisher Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Publisher IPI Number
                    </label>
                    <input
                      type="text"
                      value={editingUser.publisherIpiNumber || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, publisherIpiNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="Publisher IPI/CAE Number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Sub Publisher Name / Administrator
                    </label>
                    <input
                      type="text"
                      value={editingUser.subPublisherName || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, subPublisherName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="Sub Publisher Name / Administrator"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Sub Publisher IPI Number
                    </label>
                    <input
                      type="text"
                      value={editingUser.subPublisherIpiNumber || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, subPublisherIpiNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="Sub Publisher IPI Number"
                    />
                  </div>
                  {editingUser.role === 'WRITER' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          PRO Affiliation
                        </label>
                        <select
                          value={editingUser.producer?.proAffiliation || 'OTHER'}
                          onChange={(e) => setEditingUser({ ...editingUser, producer: { ...(editingUser.producer || {}), proAffiliation: e.target.value } })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        >
                          <option value="BMI">BMI</option>
                          <option value="ASCAP">ASCAP</option>
                          <option value="SESAC">SESAC</option>
                          <option value="GMR">GMR</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Commission Override (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={editingUser.commissionOverrideRate ?? ''}
                          onChange={(e) => setEditingUser({ ...editingUser, commissionOverrideRate: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                          placeholder="Leave blank to use default"
                        />
                        <p className="text-xs text-gray-400 mt-1">Writer sees net = writer split minus commission. Blank uses global rate.</p>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Viewer-specific fields */}
              {editingUser.role === 'VIEWER' && (
                <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="editCanUploadStatements"
                    checked={editingUser.canUploadStatements || false}
                    onChange={(e) => setEditingUser({ ...editingUser, canUploadStatements: e.target.checked })}
                    className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <label htmlFor="editCanUploadStatements" className="text-sm text-gray-300">
                    Allow statement uploads
                  </label>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateUser}
                disabled={updateMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-600 transition-colors"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update User'}
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
  });

  const { data: platformData, isLoading: platformLoading } = useQuery({
    queryKey: ['platform-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getPlatformBreakdown();
      return response.data;
    },
  });

  const { data: organizationData, isLoading: organizationLoading } = useQuery({
    queryKey: ['organization-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getOrganizationBreakdown();
      return response.data;
    },
  });

  const { data: territoryData, isLoading: territoryLoading } = useQuery({
    queryKey: ['territory-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getTerritoryBreakdown();
      return response.data;
    },
  });

  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});

  const toggleChartExpansion = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#a855f7', // Violet
    '#f43f5e', // Rose
    '#14b8a6', // Teal
  ];

  // Smart pie chart label configuration based on item count
  const getSmartPieLabel = (itemCount: number) => {
    if (itemCount <= 3) {
      // 1-3 items: Full labels with name, amount, and percentage
      return (props: any) => {
        const { name, percent, value, revenue } = props;
        const amount = Number(revenue || value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return `${name} - $${amount} (${(percent * 100).toFixed(0)}%)`;
      };
    } else if (itemCount <= 6) {
      // 4-6 items: Compact labels (percentage only)
      return (props: any) => {
        const { name, percent } = props;
        return `${name} ${(percent * 100).toFixed(0)}%`;
      };
    } else {
      // 7+ items: No labels (legend only to avoid overlap)
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white">Platform Analytics</h3>

      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      ) : (
        <>
          {/* Stats Cards - 5 across */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StatCard
              title="Total Writers"
              value={stats?.totalWriters || 0}
              icon="👥"
              color="blue"
            />
            <StatCard
              title="Total Statements"
              value={stats?.totalStatements || 0}
              icon="📊"
              color="green"
            />
            <StatCard
              title="Processed Statements"
              value={stats?.processedStatements || 0}
              icon="✅"
              color="purple"
            />
            <StatCard
              title="Unique Works"
              value={stats?.uniqueWorks || 0}
              icon="🎵"
              color="orange"
            />
            <StatCard
              title="Total Revenue"
              value={`$${Number(stats?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon="💰"
              color="teal"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Timeline Chart */}
            {stats?.revenueTimeline && stats.revenueTimeline.length > 0 && (
              <ChartCard
                title="Revenue Over Time (12 Months)"
                chartId="revenue-timeline"
                isExpanded={expandedCharts['revenue-timeline'] || false}
                onToggleExpand={toggleChartExpansion}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.revenueTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#f1f5f9' }}
                      itemStyle={{ color: '#10b981' }}
                      formatter={(value: any) => [formatChartCurrency(value), 'Revenue']}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* PRO Breakdown Pie Chart */}
            {stats?.proBreakdown && stats.proBreakdown.length > 0 && (
              <ChartCard
                title="Revenue by Statement"
                chartId="revenue-by-pro"
                isExpanded={expandedCharts['revenue-by-pro'] || false}
                onToggleExpand={toggleChartExpansion}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.proBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={getSmartPieLabel(stats.proBreakdown.length)}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="revenue"
                      nameKey="proType"
                    >
                      {stats.proBreakdown.map((breakdown: any, index: number) => (
                        <Cell
                          key={`cell-${breakdown.proType ?? index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value: any) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    />
                    {stats.proBreakdown.length > 6 && (
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {/* PRO Breakdown Bar Chart */}
          {stats?.proBreakdown && stats.proBreakdown.length > 0 && (
            <ChartCard
              title="PRO Statistics"
              chartId="pro-statistics"
              isExpanded={expandedCharts['pro-statistics'] || false}
              onToggleExpand={toggleChartExpansion}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.proBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="proType"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'revenue') return [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Revenue'];
                      return [value, 'Statements'];
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                  <Bar dataKey="count" fill="#3b82f6" name="Statements" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Platform Breakdown (YouTube, Spotify, etc.) */}
          {!platformLoading && platformData?.platforms && platformData.platforms.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-white mb-3">Revenue by Platform (DSP)</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Platform Pie Chart */}
                <ChartCard
                  title="Platform Distribution"
                  chartId="platform-distribution"
                  isExpanded={expandedCharts['platform-distribution'] || false}
                  onToggleExpand={toggleChartExpansion}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformData.platforms}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={getSmartPieLabel(platformData.platforms.length)}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="revenue"
                        nameKey="platform"
                      >
                        {platformData.platforms.map((p: any, index: number) => (
                          <Cell
                            key={`cell-${p.platform}-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value: any) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                      />
                      {platformData.platforms.length > 6 && (
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Platform Bar Chart */}
                <ChartCard
                  title="Platform Revenue"
                  chartId="platform-revenue"
                  isExpanded={expandedCharts['platform-revenue'] || false}
                  onToggleExpand={toggleChartExpansion}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformData.platforms}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="platform"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#f1f5f9' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'revenue') return [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Revenue'];
                          if (name === 'count') return [value, 'Items'];
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      <Bar dataKey="count" fill="#3b82f6" name="Items" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Platform Details Table */}
              <div className="bg-slate-700/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-md font-medium text-white">Platform Details</h5>
                  <span className="text-xs text-gray-400">
                    {platformData.platforms.length} platform{platformData.platforms.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b-2 border-slate-600">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Platform</th>
                        <th className="text-left text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Service Type</th>
                        <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Items</th>
                        <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Gross Revenue</th>
                        <th className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider py-3 px-2">Net Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformData.platforms.map((platform: any) => (
                        <tr
                          key={platform.platform}
                          className="border-b border-slate-700/50 hover:bg-slate-600/20 transition-colors"
                        >
                          <td className="py-3.5 px-2 text-white font-semibold">{platform.platform}</td>
                          <td className="py-3.5 px-2 text-sm text-gray-400">
                            <span className="inline-flex flex-wrap gap-1">
                              {platform.offerings.length > 0 ? (
                                platform.offerings.map((offering: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-600/40 rounded text-xs">
                                    {offering}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-right text-gray-300 font-medium">{platform.count.toLocaleString()}</td>
                          <td className="py-3.5 px-2 text-right text-green-400 font-semibold">
                            ${Number(platform.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-2 text-right text-green-300 font-medium">
                            ${Number(platform.netRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-600 bg-slate-700/20">
                      <tr>
                        <td className="py-3.5 px-2 text-white font-bold text-sm">TOTAL</td>
                        <td className="py-3.5 px-2"></td>
                        <td className="py-3.5 px-2 text-right text-white font-bold">{platformData.totalCount.toLocaleString()}</td>
                        <td className="py-3.5 px-2 text-right text-green-400 font-bold">
                          ${Number(platformData.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-2 text-right text-green-300 font-bold">
                          ${Number(platformData.totalNetRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Organization Breakdown (MLC, BMI, ASCAP, etc.) */}
          {!organizationLoading && organizationData?.organizations && organizationData.organizations.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-white mb-3">Revenue by Organization</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Organization Pie Chart */}
                <ChartCard
                  title="Organization Distribution"
                  chartId="organization-distribution"
                  isExpanded={expandedCharts['organization-distribution'] || false}
                  onToggleExpand={toggleChartExpansion}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={organizationData.organizations}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={getSmartPieLabel(organizationData.organizations.length)}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="revenue"
                        nameKey="organization"
                      >
                        {organizationData.organizations.map((org: any, index: number) => (
                          <Cell
                            key={`cell-${org.organization}-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value: any) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                      />
                      {organizationData.organizations.length > 6 && (
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Organization Bar Chart */}
                <ChartCard
                  title="Organization Revenue"
                  chartId="organization-revenue"
                  isExpanded={expandedCharts['organization-revenue'] || false}
                  onToggleExpand={toggleChartExpansion}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={organizationData.organizations}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="organization"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#f1f5f9' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'revenue') return [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Revenue'];
                          if (name === 'count') return [value, 'Statements'];
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
                      <Bar dataKey="count" fill="#f59e0b" name="Statements" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Organization Details Table */}
              <div className="bg-slate-700/30 rounded-lg p-6">
                <h5 className="text-sm font-medium text-gray-400 mb-4">Organization Details</h5>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-600">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase py-2">Organization</th>
                        <th className="text-right text-xs font-medium text-gray-400 uppercase py-2">Statements</th>
                        <th className="text-right text-xs font-medium text-gray-400 uppercase py-2">Revenue</th>
                        <th className="text-right text-xs font-medium text-gray-400 uppercase py-2">Net</th>
                        <th className="text-right text-xs font-medium text-gray-400 uppercase py-2">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizationData.organizations.map((org: any) => (
                        <tr key={org.organization} className="border-b border-slate-700/50">
                          <td className="py-3 text-white font-medium">{org.organization}</td>
                          <td className="py-3 text-right text-gray-300">{org.count}</td>
                          <td className="py-3 text-right text-green-400 font-medium">
                            ${Number(org.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-right text-green-300">
                            ${Number(org.netRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-right text-blue-400">
                            ${Number(org.commissionAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-600">
                      <tr>
                        <td className="py-3 text-white font-bold">Total</td>
                        <td className="text-right text-white font-bold">{organizationData.totalCount}</td>
                        <td className="text-right text-green-400 font-bold">
                          ${Number(organizationData.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Territory Revenue Heatmap */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">Revenue by Territory</h4>
            <ChartCard
              title="Global Revenue Heatmap"
              chartId="territory-heatmap"
              isExpanded={expandedCharts['territory-heatmap'] || false}
              onToggleExpand={toggleChartExpansion}
            >
              {territoryLoading ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Loading territory data...
                </div>
              ) : territoryData?.territories && territoryData.territories.length > 0 ? (
                <TerritoryHeatmap territories={territoryData.territories} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No territory data available yet. Territory information will appear once statements with location data are processed.
                </div>
              )}
            </ChartCard>
          </div>

          {/* Recent Statements */}
          {stats?.recentStatements?.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-white mb-3">Recent Statements</h4>
              <div className="space-y-2">
                {stats.recentStatements.map((statement: any) => (
                  <div
                    key={statement.id}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        statement.proType === 'BMI' ? 'bg-blue-500/20 text-blue-400' :
                        statement.proType === 'ASCAP' ? 'bg-green-500/20 text-green-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {statement.proType}
                      </span>
                      <span className="text-white text-sm">{statement.filename}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        statement.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' :
                        statement.status === 'PROCESSED' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {statement.status}
                      </span>
                    </div>
                    <span className="text-green-400 text-sm font-medium">
                      ${Number(statement.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, percentage, trend, gradient }: any) {
  // Support both old color prop and new gradient prop
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    teal: 'from-teal-500/20 to-teal-600/20 border-teal-500/30',
  };

  // New modern card design with gradient
  if (gradient) {
    return (
      <div className="bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-lg`}>
            {icon}
          </div>
          {percentage && (
            <span className={`flex items-center gap-1 text-sm font-semibold ${
              trend === 'up' ? 'text-green-400' : 'text-red-400'
            }`}>
              {trend === 'up' ? '↑' : '↓'} {percentage}
            </span>
          )}
        </div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    );
  }

  // Legacy card design
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6`}>
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
