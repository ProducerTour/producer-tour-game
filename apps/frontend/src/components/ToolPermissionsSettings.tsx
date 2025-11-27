import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toolPermissionsApi, gamificationApi, userApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2, Save, RotateCcw, Shield, CheckCircle, UserPlus, Search, X, Trash2, Users } from 'lucide-react';

interface ToolPermission {
  id: string;
  toolId: string;
  toolName: string;
  roles: string[];
  isActive: boolean;
}

const AVAILABLE_ROLES = ['ADMIN', 'WRITER', 'MANAGER', 'LEGAL', 'CUSTOMER'];

interface AvailableTool {
  id: string;
  name: string;
  description: string;
}

interface UserToolGrant {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  toolId: string;
  toolName: string;
  type: string;
  expiresAt: string | null;
  grantReason: string | null;
  createdAt: string;
}

export default function ToolPermissionsSettings() {
  const queryClient = useQueryClient();
  const [localPermissions, setLocalPermissions] = useState<ToolPermission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Tab state: 'roles' or 'users'
  const [activeSection, setActiveSection] = useState<'roles' | 'users'>('users');

  // User permissions state
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
  const [selectedTool, setSelectedTool] = useState('');
  const [grantReason, setGrantReason] = useState('Beta tester access');
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);

  // Fetch permissions from backend
  const { data, isLoading, error } = useQuery({
    queryKey: ['tool-permissions'],
    queryFn: async () => {
      const response = await toolPermissionsApi.getAll();
      return response.data;
    },
  });

  // Update local state when data loads
  useEffect(() => {
    if (data?.permissions) {
      setLocalPermissions(data.permissions);
      setHasChanges(false);
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const permissionsToSave = localPermissions.map(p => ({
        toolId: p.toolId,
        toolName: p.toolName,
        roles: p.roles,
      }));
      return toolPermissionsApi.updateAll(permissionsToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-tool-permissions'] });
      toast.success('Tool permissions saved successfully!');
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save tool permissions');
    },
  });

  const toggleRoleForTool = (toolId: string, role: string) => {
    setLocalPermissions(prev => prev.map(tool => {
      if (tool.toolId === toolId) {
        const hasRole = tool.roles.includes(role);
        return {
          ...tool,
          roles: hasRole
            ? tool.roles.filter(r => r !== role)
            : [...tool.roles, role]
        };
      }
      return tool;
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleReset = () => {
    if (data?.permissions) {
      setLocalPermissions(data.permissions);
      setHasChanges(false);
    }
  };

  const applyPreset = (preset: 'writers-limited' | 'full-access') => {
    if (preset === 'writers-limited') {
      setLocalPermissions(prev => prev.map(tool => ({
        ...tool,
        roles: tool.toolId === 'work-registration' ? ['ADMIN', 'WRITER', 'MANAGER', 'LEGAL'] : ['ADMIN']
      })));
    } else if (preset === 'full-access') {
      setLocalPermissions(prev => prev.map(tool => ({
        ...tool,
        roles: AVAILABLE_ROLES
      })));
    }
    setHasChanges(true);
  };

  // === USER PERMISSIONS QUERIES & MUTATIONS ===

  // Fetch available tools
  const { data: availableToolsData } = useQuery({
    queryKey: ['available-tools'],
    queryFn: async () => {
      const response = await gamificationApi.adminGetAvailableTools();
      return response.data;
    },
  });

  // Fetch all user tool grants
  const { data: userGrantsData, isLoading: isLoadingGrants } = useQuery({
    queryKey: ['user-tool-grants', userSearch],
    queryFn: async () => {
      const response = await gamificationApi.adminGetToolPermissions({
        search: userSearch || undefined,
        type: 'ADMIN_GRANTED',
        limit: 50,
      });
      return response.data;
    },
  });

  // Search users
  const { data: searchUsersData } = useQuery({
    queryKey: ['search-users', userSearch],
    queryFn: async () => {
      if (!userSearch || userSearch.length < 2) return { users: [] };
      const response = await userApi.list({ search: userSearch, limit: 10 });
      return response.data;
    },
    enabled: userSearch.length >= 2 && showGrantModal,
  });

  // Grant tool access mutation
  const grantMutation = useMutation({
    mutationFn: async (params: { userId: string; toolId: string; reason: string; expiresInDays?: number }) => {
      return gamificationApi.adminGrantToolAccess(params.userId, {
        toolId: params.toolId,
        reason: params.reason,
        expiresInDays: params.expiresInDays,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tool-grants'] });
      toast.success(`Tool access granted to ${selectedUser?.email}`);
      setShowGrantModal(false);
      setSelectedUser(null);
      setSelectedTool('');
      setGrantReason('Beta tester access');
      setExpiresInDays(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to grant tool access');
    },
  });

  // Revoke tool access mutation
  const revokeMutation = useMutation({
    mutationFn: async (params: { userId: string; permissionId: string }) => {
      return gamificationApi.adminRevokeToolAccess(params.userId, {
        permissionId: params.permissionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tool-grants'] });
      toast.success('Tool access revoked');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to revoke tool access');
    },
  });

  const handleGrantAccess = () => {
    if (!selectedUser || !selectedTool) {
      toast.error('Please select a user and tool');
      return;
    }
    grantMutation.mutate({
      userId: selectedUser.id,
      toolId: selectedTool,
      reason: grantReason,
      expiresInDays: expiresInDays || undefined,
    });
  };

  const handleRevokeAccess = (grant: UserToolGrant) => {
    if (confirm(`Revoke "${grant.toolName}" access from ${grant.userEmail}?`)) {
      revokeMutation.mutate({
        userId: grant.userId,
        permissionId: grant.id,
      });
    }
  };

  const availableTools: AvailableTool[] = availableToolsData?.tools || [];
  const userGrants: UserToolGrant[] = userGrantsData?.permissions || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-text-muted">Loading tool permissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
        <p className="text-red-400">Failed to load tool permissions. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            Tool Permissions
          </h2>
          <p className="text-text-muted">
            Grant tool access to individual users or configure role-based permissions
          </p>
        </div>
        {activeSection === 'users' && (
          <button
            onClick={() => setShowGrantModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Grant Access
          </button>
        )}
        {activeSection === 'roles' && hasChanges && (
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveSection('users')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeSection === 'users'
              ? 'bg-blue-500 text-white'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          User Access
        </button>
        <button
          onClick={() => setActiveSection('roles')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeSection === 'roles'
              ? 'bg-blue-500 text-white'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          Role-Based Access
        </button>
      </div>

      {/* Grant Access Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowGrantModal(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-400" />
                Grant Tool Access
              </h3>
              <button onClick={() => setShowGrantModal(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Search User</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={selectedUser ? selectedUser.email : userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setSelectedUser(null);
                    }}
                    placeholder="Search by email or name..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* Search Results */}
                {!selectedUser && searchUsersData?.users && searchUsersData.users.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-lg">
                    {searchUsersData.users.map((user: any) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser({
                            id: user.id,
                            email: user.email,
                            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                            role: user.role,
                          });
                          setUserSearch('');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-zinc-700 transition-colors"
                      >
                        <div className="text-white text-sm">{user.firstName} {user.lastName}</div>
                        <div className="text-zinc-400 text-xs">{user.email} ({user.role})</div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-2 p-2 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-white text-sm">{selectedUser.name}</div>
                      <div className="text-zinc-400 text-xs">{selectedUser.email} ({selectedUser.role})</div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="p-1 text-zinc-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tool Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Select Tool</label>
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a tool...</option>
                  {availableTools.map((tool) => (
                    <option key={tool.id} value={tool.id}>{tool.name}</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Reason</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g., Beta tester access"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Expires In (days)</label>
                <input
                  type="number"
                  value={expiresInDays || ''}
                  onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Leave empty for permanent"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-zinc-500 mt-1">Leave empty for permanent access</p>
              </div>

              {/* Submit */}
              <button
                onClick={handleGrantAccess}
                disabled={!selectedUser || !selectedTool || grantMutation.isPending}
                className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {grantMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Grant Access
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER ACCESS SECTION */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              Grant specific users access to tools regardless of their role. This is useful for beta testers or special access.
            </p>
          </div>

          {/* Active Grants Table */}
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] overflow-hidden">
            <div className="p-4 border-b border-white/[0.08]">
              <h3 className="text-lg font-semibold text-white">Active User Grants</h3>
              <p className="text-sm text-zinc-400">Users with individually granted tool access</p>
            </div>
            {isLoadingGrants ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
              </div>
            ) : userGrants.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                No users have been granted individual tool access yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/[0.04]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Tool</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Reason</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Expires</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {userGrants.map((grant) => (
                      <tr key={grant.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="text-white text-sm">{grant.userName}</div>
                          <div className="text-zinc-500 text-xs">{grant.userEmail}</div>
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{grant.toolName}</td>
                        <td className="px-4 py-3 text-zinc-400 text-sm">{grant.grantReason || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {grant.expiresAt ? (
                            <span className="text-yellow-400">
                              {new Date(grant.expiresAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-green-400">Never</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRevokeAccess(grant)}
                            disabled={revokeMutation.isPending}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Revoke access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROLE-BASED ACCESS SECTION */}
      {activeSection === 'roles' && (
        <div className="space-y-6">
          {/* Success indicator */}
          {!hasChanges && localPermissions.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300">
                Tool permissions are saved and active. Changes take effect immediately.
              </p>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              Enable access for specific roles by checking the boxes below.
              Changes will apply to all users with those roles immediately after saving.
            </p>
          </div>

          {/* Permissions Table */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.08]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                  Tool
                </th>
                {AVAILABLE_ROLES.map(role => (
                  <th key={role} className="px-6 py-4 text-center text-sm font-semibold text-white">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {localPermissions.map((tool, index) => (
                <tr
                  key={tool.toolId}
                  className={index % 2 === 0 ? 'bg-white/[0.04]' : 'bg-surface'}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{tool.toolName}</span>
                    </div>
                  </td>
                  {AVAILABLE_ROLES.map(role => {
                    const hasAccess = tool.roles.includes(role);
                    return (
                      <td key={role} className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleRoleForTool(tool.toolId, role)}
                          className={`relative inline-flex items-center justify-center w-6 h-6 rounded transition-all ${
                            hasAccess
                              ? 'bg-green-500 hover:bg-green-600'
                              : 'bg-white/20 hover:bg-white/30'
                          }`}
                        >
                          {hasAccess && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-lg p-6 border border-white/[0.08]">
          <h3 className="text-lg font-semibold text-white mb-2">Quick Presets</h3>
          <p className="text-sm text-text-muted mb-4">
            Apply common permission configurations
          </p>
          <div className="space-y-2">
            <button
              onClick={() => applyPreset('writers-limited')}
              className="w-full px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
            >
              ✏️ Writers: Work Registration Only
            </button>
            <button
              onClick={() => applyPreset('full-access')}
              className="w-full px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
            >
              🌐 All Roles: Full Access
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-white/[0.08]">
          <h3 className="text-lg font-semibold text-white mb-2">Permission Summary</h3>
          <p className="text-sm text-text-muted mb-4">
            Current access counts by role
          </p>
          <div className="space-y-2">
            {AVAILABLE_ROLES.map(role => {
              const toolCount = localPermissions.filter(tool => tool.roles.includes(role)).length;
              return (
                <div key={role} className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary font-medium">{role}</span>
                  <span className="text-blue-400">
                    {toolCount} / {localPermissions.length} tools
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
