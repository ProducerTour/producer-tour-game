import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, statementApi, userApi } from '../lib/api';
import type { WriterAssignmentsPayload } from '../lib/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import ToolsHub from '../components/ToolsHub';
import DocumentsTab from '../components/DocumentsTab';
import { formatIpiDisplay } from '../utils/ipi-helper';

type TabType = 'overview' | 'statements' | 'users' | 'analytics' | 'documents' | 'tools' | 'commission';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const adminTabs = [
    { id: 'overview', label: 'Dashboard', icon: '🏠' },
    { id: 'statements', label: 'Statements', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'tools', label: 'Tools Hub', icon: '🛠️' },
    { id: 'commission', label: 'Commission Settings', icon: '💼' },
  ];

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
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
          {activeTab === 'documents' && <DocumentsTab />}
          {activeTab === 'tools' && <ToolsHub />}
          {activeTab === 'commission' && <CommissionSettingsPage />}
        </div>
      </main>
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
          percentage="+23%"
          trend="up"
          icon="💰"
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Total Writers"
          value={stats?.totalWriters || 0}
          percentage="+8%"
          trend="up"
          icon="👥"
          gradient="from-cyan-500 to-cyan-600"
        />
        <StatCard
          title="Active Statements"
          value={stats?.processedStatements || 0}
          percentage="-2%"
          trend="down"
          icon="📊"
          gradient="from-pink-500 to-pink-600"
        />
        <StatCard
          title="Unique Works"
          value={stats?.uniqueWorks || 0}
          percentage="+12%"
          trend="up"
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
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
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
        ) : statementsData?.statements?.length > 0 ? (
          <div className="space-y-3">
            {statementsData.statements.map((statement: any) => (
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
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this statement?')) {
                        deleteMutation.mutate(statement.id);
                      }
                    }}
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
          <p className="text-gray-400 text-center py-8">No statements uploaded yet</p>
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
    </div>
  );
}

function ReviewAssignmentModal({ statement, writers, onClose, onSave }: any) {
  // assignments: { "Song Title": [{ userId, writerIpiNumber, publisherIpiNumber, splitPercentage }, ...], ... }
  const [assignments, setAssignments] = useState<WriterAssignmentsPayload>({});
  const [assignAllWriter, setAssignAllWriter] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [smartAssigning, setSmartAssigning] = useState(false);
  const [smartAssignResults, setSmartAssignResults] = useState<any>(null);

  const parsedSongs = statement.metadata?.songs || [];
  const writersList = writers.filter((w: any) => w.role === 'WRITER');

  // Format currency to avoid "-0.00" display issue with micro-pennies
  const formatCurrency = (amount: number): string => {
    const rounded = Number(amount.toFixed(2));
    // If rounding results in -0.00 or 0.00, always show as positive 0.00
    return (rounded === 0 ? 0 : rounded).toFixed(2);
  };

  const handleAssignAll = () => {
    if (!assignAllWriter) return;
    const newAssignments: Record<string, Array<{ userId: string; writerIpiNumber: string; publisherIpiNumber: string; splitPercentage: number }>> = {};
    const selectedWriter = writersList.find((w: any) => w.id === assignAllWriter);
    parsedSongs.forEach((song: any) => {
      newAssignments[song.title] = [{
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

      // Auto-populate assignments with high-confidence matches (>=90%)
      const newAssignments: WriterAssignmentsPayload = {};

      // Auto-assigned matches (>=90% confidence)
      results.autoAssigned?.forEach((match: any) => {
        newAssignments[match.workTitle] = [{
          userId: match.writer.id,
          writerIpiNumber: match.writer.writerIpiNumber || '',
          publisherIpiNumber: match.writer.publisherIpiNumber || '',
          splitPercentage: 100
        }];
      });

      // For suggested matches (70-90% confidence), use top match if only one writer
      results.suggested?.forEach((suggestion: any) => {
        if (suggestion.matches && suggestion.matches.length > 0) {
          const topMatch = suggestion.matches[0];
          newAssignments[suggestion.workTitle] = [{
            userId: topMatch.writer.id,
            writerIpiNumber: topMatch.writer.writerIpiNumber || '',
            publisherIpiNumber: topMatch.writer.publisherIpiNumber || '',
            splitPercentage: 100
          }];
        }
      });

      setAssignments(newAssignments);
      alert(`Smart Assign Complete!\n\n✓ Auto-assigned: ${results.autoAssignedCount} songs (high confidence)\n⚠ Suggested: ${results.suggestedCount} songs (review recommended)\n✗ Unmatched: ${results.unmatchedCount} songs (manual assignment needed)`);
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

  const getMatchConfidence = (songTitle: string) => {
    if (!smartAssignResults) return null;

    // Check auto-assigned (>=90% confidence)
    const autoMatch = smartAssignResults.autoAssigned?.find((m: any) => m.workTitle === songTitle);
    if (autoMatch) {
      return {
        level: 'high',
        confidence: autoMatch.confidence,
        reason: autoMatch.reason,
        badge: '✓ Auto-assigned',
        badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30'
      };
    }

    // Check suggested (70-90% confidence)
    const suggested = smartAssignResults.suggested?.find((s: any) => s.workTitle === songTitle);
    if (suggested) {
      return {
        level: 'medium',
        confidence: suggested.matches[0]?.confidence,
        reason: suggested.matches[0]?.reason,
        badge: '⚠ Review Suggested',
        badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      };
    }

    // Check unmatched (<70% or no match)
    const unmatched = smartAssignResults.unmatched?.find((u: any) => u.workTitle === songTitle);
    if (unmatched) {
      return {
        level: 'low',
        confidence: 0,
        reason: unmatched.reason,
        badge: '✗ Manual Required',
        badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30'
      };
    }

    return null;
  };

  const handleSave = async () => {
    // Check if all songs have at least one assignment
    const unassigned = parsedSongs.filter((song: any) => {
      const songAssignments = assignments[song.title] || [];
      return songAssignments.length === 0 || songAssignments.some(a => !a.userId);
    });

    if (unassigned.length > 0) {
      alert(`Please assign writers to all songs. ${unassigned.length} songs have incomplete assignments.`);
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
            {statement.filename} • {parsedSongs.length} songs
          </p>
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
                      {writer.firstName || writer.lastName
                        ? `${writer.firstName || ''} ${writer.lastName || ''}`.trim()
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

          {/* Individual Song Assignments */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white">Assign Writers to Songs</h4>
            {parsedSongs.map((song: any, songIndex: number) => {
              const songAssignments = assignments[song.title] || [{ userId: '', writerIpiNumber: '', publisherIpiNumber: '', splitPercentage: 100 }];
              const splitTotal = getSplitTotal(song.title);
              const matchInfo = getMatchConfidence(song.title);
              return (
                <div key={songIndex} className="bg-slate-700/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white">{song.title}</p>
                        {matchInfo && (
                          <span className={`px-2 py-0.5 text-xs border rounded ${matchInfo.badgeClass}`}>
                            {matchInfo.badge} {matchInfo.confidence > 0 && `(${matchInfo.confidence}%)`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        ${formatCurrency(song.totalRevenue)} • {song.totalPerformances || song.performances || 0} performances
                      </p>
                      {matchInfo && matchInfo.reason && (
                        <p className="text-xs text-gray-500 mt-1">
                          {matchInfo.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => addWriter(song.title)}
                      className="px-3 py-1 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors whitespace-nowrap"
                    >
                      + Add Writer
                    </button>
                  </div>

                  {/* Writer Assignments */}
                  <div className="space-y-2">
                    {songAssignments.map((assignment, writerIndex) => (
                      <div key={writerIndex} className="grid grid-cols-12 gap-2 items-center">
                        {/* Writer Select */}
                        <select
                          value={assignment.userId}
                          onChange={(e) => updateWriter(song.title, writerIndex, 'userId', e.target.value)}
                          className={`col-span-3 px-3 py-2 border rounded-lg focus:outline-none ${
                            assignment.userId
                              ? 'bg-slate-700 border-green-500/50 text-white'
                              : 'bg-slate-700 border-slate-600 text-gray-400'
                          }`}
                        >
                          <option value="">Select writer...</option>
                          {writersList.map((writer: any) => (
                            <option key={writer.id} value={writer.id}>
                              {writer.firstName || writer.lastName
                                ? `${writer.firstName || ''} ${writer.lastName || ''}`.trim()
                                : writer.email}
                            </option>
                          ))}
                        </select>

                        {/* Writer IPI Number */}
                        <input
                          type="text"
                          placeholder="Writer IPI"
                          value={assignment.writerIpiNumber}
                          onChange={(e) => updateWriter(song.title, writerIndex, 'writerIpiNumber', e.target.value)}
                          className="col-span-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        />

                        {/* Publisher IPI Number */}
                        <input
                          type="text"
                          placeholder="Publisher IPI"
                          value={assignment.publisherIpiNumber}
                          onChange={(e) => updateWriter(song.title, writerIndex, 'publisherIpiNumber', e.target.value)}
                          className="col-span-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        />

                        {/* Split Percentage */}
                        <div className="col-span-3 relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="Split %"
                            value={assignment.splitPercentage}
                            onChange={(e) => updateWriter(song.title, writerIndex, 'splitPercentage', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">%</span>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeWriter(song.title, writerIndex)}
                          disabled={songAssignments.length <= 1}
                          className="col-span-2 px-2 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
              );
            })}
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

function UsersTab() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'WRITER',
    writerIpiNumber: '',
    publisherIpiNumber: '',
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
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'WRITER', writerIpiNumber: '', publisherIpiNumber: '', proAffiliation: 'BMI', commissionOverrideRate: '', canUploadStatements: false });
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
                      {user.firstName || user.lastName
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
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

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

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
              <div className="bg-slate-700/30 rounded-lg p-6">
                <h4 className="text-md font-medium text-white mb-4">Revenue Over Time (12 Months)</h4>
                <ResponsiveContainer width="100%" height={300}>
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
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
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
              </div>
            )}

            {/* PRO Breakdown Pie Chart */}
            {stats?.proBreakdown && stats.proBreakdown.length > 0 && (
              <div className="bg-slate-700/30 rounded-lg p-6">
                <h4 className="text-md font-medium text-white mb-4">Revenue by PRO</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.proBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ proType, percent }: any) => `${proType} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="revenue"
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
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* PRO Breakdown Bar Chart */}
          {stats?.proBreakdown && stats.proBreakdown.length > 0 && (
            <div className="bg-slate-700/30 rounded-lg p-6">
              <h4 className="text-md font-medium text-white mb-4">PRO Statistics</h4>
              <ResponsiveContainer width="100%" height={300}>
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
            </div>
          )}

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
