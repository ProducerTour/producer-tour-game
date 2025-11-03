import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, statementApi, userApi } from '../lib/api';
import type { WriterAssignmentsPayload } from '../lib/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Navigation from '../components/Navigation';
import ToolsHub from '../components/ToolsHub';
import DocumentsTab from '../components/DocumentsTab';

type TabType = 'statements' | 'writers' | 'analytics' | 'documents' | 'tools';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('statements');

  const adminTabs = [
    { id: 'statements', label: 'Statements', icon: '📊' },
    { id: 'writers', label: 'Writers', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'tools', label: 'Tools Hub', icon: '🛠️' },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabType)}
        tabs={adminTabs}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={activeTab === 'tools' ? '' : 'bg-slate-800 rounded-lg shadow-xl p-6'}>
          {activeTab === 'statements' && <StatementsTab />}
          {activeTab === 'writers' && <WritersTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'documents' && <DocumentsTab />}
          {activeTab === 'tools' && <ToolsHub />}
        </div>
      </main>
    </div>
  );
}

function StatementsTab() {
  const queryClient = useQueryClient();
  const [selectedPRO, setSelectedPRO] = useState<'BMI' | 'ASCAP' | 'SESAC'>('BMI');
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
              Select PRO Type
            </label>
            <div className="flex gap-3">
              {(['BMI', 'ASCAP', 'SESAC'] as const).map((pro) => (
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
              CSV File
            </label>
            <div className="flex items-center gap-4">
              <input
                id="file-upload"
                type="file"
                accept=".csv"
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
  // assignments: { "Song Title": [{ userId, ipiNumber, splitPercentage }, ...], ... }
  const [assignments, setAssignments] = useState<WriterAssignmentsPayload>({});
  const [assignAllWriter, setAssignAllWriter] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const parsedSongs = statement.metadata?.songs || [];
  const writersList = writers.filter((w: any) => w.role === 'WRITER');

  const handleAssignAll = () => {
    if (!assignAllWriter) return;
    const newAssignments: Record<string, Array<{ userId: string; ipiNumber: string; splitPercentage: number }>> = {};
    const selectedWriter = writersList.find((w: any) => w.id === assignAllWriter);
    parsedSongs.forEach((song: any) => {
      newAssignments[song.title] = [{
        userId: assignAllWriter,
        ipiNumber: selectedWriter?.ipiNumber || '',
        splitPercentage: 100
      }];
    });
    setAssignments(newAssignments);
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
      [songTitle]: [...updatedAssignments, { userId: '', ipiNumber: '', splitPercentage: equalSplit }]
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

  const updateWriter = (songTitle: string, index: number, field: 'userId' | 'ipiNumber' | 'splitPercentage', value: any) => {
    const currentAssignments = assignments[songTitle] || [];
    const updatedAssignments = [...currentAssignments];

    // Ensure the assignment object exists at this index
    if (!updatedAssignments[index]) {
      updatedAssignments[index] = { userId: '', ipiNumber: '', splitPercentage: 100 };
    }

    if (field === 'userId') {
      const selectedWriter = writersList.find((w: any) => w.id === value);
      updatedAssignments[index] = {
        ...updatedAssignments[index],
        userId: value,
        ipiNumber: selectedWriter?.ipiNumber || updatedAssignments[index].ipiNumber || ''
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
          {/* Assign All Section */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">Quick Assign All Songs</h4>
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

          {/* Individual Song Assignments */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white">Assign Writers to Songs</h4>
            {parsedSongs.map((song: any, songIndex: number) => {
              const songAssignments = assignments[song.title] || [{ userId: '', ipiNumber: '', splitPercentage: 100 }];
              const splitTotal = getSplitTotal(song.title);
              return (
                <div key={songIndex} className="bg-slate-700/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">{song.title}</p>
                      <p className="text-sm text-gray-400">
                        ${Number(song.totalAmount).toFixed(2)} • {song.performances} performances
                      </p>
                    </div>
                    <button
                      onClick={() => addWriter(song.title)}
                      className="px-3 py-1 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors"
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
                          className={`col-span-4 px-3 py-2 border rounded-lg focus:outline-none ${
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

                        {/* IPI Number */}
                        <input
                          type="text"
                          placeholder="IPI Number"
                          value={assignment.ipiNumber}
                          onChange={(e) => updateWriter(song.title, writerIndex, 'ipiNumber', e.target.value)}
                          className="col-span-3 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
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

function WritersTab() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWriter, setEditingWriter] = useState<any>(null);
  const [newWriter, setNewWriter] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    ipiNumber: '',
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
      setNewWriter({ email: '', password: '', firstName: '', lastName: '', ipiNumber: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingWriter(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => userApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const handleAddWriter = () => {
    if (!newWriter.email || !newWriter.password) {
      alert('Email and password are required');
      return;
    }
    createMutation.mutate({ ...newWriter, role: 'WRITER' });
  };

  const handleUpdateWriter = () => {
    if (!editingWriter.email) {
      alert('Email is required');
      return;
    }
    const { id, ...data } = editingWriter;
    // Only include password if it was changed
    if (!data.password) {
      delete data.password;
    }
    updateMutation.mutate({ id, data });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Writer Management</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
        >
          + Add Writer
        </button>
      </div>

      {/* Writers Table */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      ) : usersData?.users?.length > 0 ? (
        <div className="bg-slate-700/30 rounded-lg overflow-hidden">
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
                  IPI Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {usersData.users.map((writer: any) => (
                <tr key={writer.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {writer.firstName || writer.lastName
                        ? `${writer.firstName || ''} ${writer.lastName || ''}`.trim()
                        : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">{writer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">{writer.ipiNumber || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      writer.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {writer.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingWriter(writer)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      {writer.role !== 'ADMIN' && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${writer.email}?`)) {
                              deleteMutation.mutate(writer.id);
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
        <p className="text-gray-400 text-center py-8">No writers found</p>
      )}

      {/* Add Writer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Add New Writer</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newWriter.email}
                  onChange={(e) => setNewWriter({ ...newWriter, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="writer@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newWriter.password}
                  onChange={(e) => setNewWriter({ ...newWriter, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={newWriter.firstName}
                  onChange={(e) => setNewWriter({ ...newWriter, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={newWriter.lastName}
                  onChange={(e) => setNewWriter({ ...newWriter, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  IPI Number
                </label>
                <input
                  type="text"
                  value={newWriter.ipiNumber}
                  onChange={(e) => setNewWriter({ ...newWriter, ipiNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="IPI/CAE Number"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddWriter}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-600 transition-colors"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Writer'}
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

      {/* Edit Writer Modal */}
      {editingWriter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Edit Writer</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={editingWriter.email}
                  onChange={(e) => setEditingWriter({ ...editingWriter, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editingWriter.password || ''}
                  onChange={(e) => setEditingWriter({ ...editingWriter, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={editingWriter.firstName || ''}
                  onChange={(e) => setEditingWriter({ ...editingWriter, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editingWriter.lastName || ''}
                  onChange={(e) => setEditingWriter({ ...editingWriter, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  IPI Number
                </label>
                <input
                  type="text"
                  value={editingWriter.ipiNumber || ''}
                  onChange={(e) => setEditingWriter({ ...editingWriter, ipiNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="IPI/CAE Number"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateWriter}
                disabled={updateMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-600 transition-colors"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Writer'}
              </button>
              <button
                onClick={() => setEditingWriter(null)}
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

function StatCard({ title, value, icon, color }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    teal: 'from-teal-500/20 to-teal-600/20 border-teal-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6`}>
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
