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

  // Only show loading for role-based permissions when on roles tab
  // User access tab should work independently

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-theme-foreground mb-2 flex items-center gap-2">
            <div className="w-8 h-8 bg-theme-primary-10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-theme-primary" />
            </div>
            Tool Permissions
          </h2>
          <p className="text-theme-foreground-muted">
            Grant tool access to individual users or configure role-based permissions
          </p>
        </div>
        {activeSection === 'users' && (
          <button
            onClick={() => setShowGrantModal(true)}
            className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-medium transition-colors flex items-center gap-2"
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
              className="px-4 py-2 bg-theme-card-hover hover:bg-theme-card text-theme-foreground font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
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
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveSection('users')}
          className={`px-4 py-2 text-sm font-medium uppercase tracking-wider transition-colors flex items-center gap-2 ${
            activeSection === 'users'
              ? 'bg-theme-primary text-theme-primary-foreground'
              : 'text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-card-hover'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          User Access
        </button>
        <button
          onClick={() => setActiveSection('roles')}
          className={`px-4 py-2 text-sm font-medium uppercase tracking-wider transition-colors flex items-center gap-2 ${
            activeSection === 'roles'
              ? 'bg-theme-primary text-theme-primary-foreground'
              : 'text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-card-hover'
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
          <div className="relative w-full max-w-md bg-theme-card border border-theme-border-strong shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
            <div className="flex items-center justify-between p-4 border-b border-theme-border-strong">
              <h3 className="text-lg font-light text-theme-foreground flex items-center gap-2">
                <div className="w-8 h-8 bg-theme-primary-10 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-theme-primary" />
                </div>
                Grant Tool Access
              </h3>
              <button onClick={() => setShowGrantModal(false)} className="p-2 text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-card-hover transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* User Search */}
              <div>
                <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">Search User</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-foreground-muted" />
                  <input
                    type="text"
                    value={selectedUser ? selectedUser.email : userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setSelectedUser(null);
                    }}
                    placeholder="Search by email or name..."
                    className="w-full pl-10 pr-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus transition-colors"
                  />
                </div>
                {/* Search Results */}
                {!selectedUser && searchUsersData?.users && searchUsersData.users.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto bg-theme-input border border-theme-border-strong">
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
                          className="w-full px-4 py-2 text-left hover:bg-theme-card-hover transition-colors"
                        >
                          <div className="text-theme-foreground text-sm">{user.firstName} {user.lastName}</div>
                          <div className="text-theme-foreground-muted text-xs">{user.email} ({user.role})</div>
                        </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-2 p-2 bg-theme-primary-10 border border-theme-border-hover flex items-center justify-between">
                    <div>
                      <div className="text-theme-foreground text-sm">{selectedUser.name}</div>
                      <div className="text-theme-foreground-muted text-xs">{selectedUser.email} ({selectedUser.role})</div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="p-1 text-theme-foreground-muted hover:text-theme-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tool Selection */}
              <div>
                <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">Select Tool</label>
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus transition-colors"
                >
                  <option value="">Choose a tool...</option>
                  {availableTools.map((tool) => (
                    <option key={tool.id} value={tool.id}>{tool.name}</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">Reason</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g., Beta tester access"
                  className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus transition-colors"
                />
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">Expires In (days)</label>
                <input
                  type="number"
                  value={expiresInDays || ''}
                  onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Leave empty for permanent"
                  className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus transition-colors"
                />
                <p className="text-xs text-theme-foreground-muted mt-1">Leave empty for permanent access</p>
              </div>

              {/* Submit */}
              <button
                onClick={handleGrantAccess}
                disabled={!selectedUser || !selectedTool || grantMutation.isPending}
                className="w-full px-4 py-3 bg-theme-primary text-theme-primary-foreground font-medium hover:bg-theme-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-theme-primary-5 border border-theme-primary-20 p-4">
            <p className="text-sm text-theme-primary">
              Grant specific users access to tools regardless of their role. This is useful for beta testers or special access.
            </p>
          </div>

          {/* Active Grants Table */}
          <div className="relative overflow-hidden bg-theme-card border border-theme-border">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
            <div className="p-4 border-b border-theme-border-strong">
              <h3 className="text-lg font-light text-theme-foreground">Active User Grants</h3>
              <p className="text-sm text-theme-foreground-muted">Users with individually granted tool access</p>
            </div>
            {isLoadingGrants ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-theme-primary-20 border-t-theme-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : userGrants.length === 0 ? (
              <div className="p-8 text-center text-theme-foreground-muted">
                No users have been granted individual tool access yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-theme-card-hover">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-foreground-muted">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-foreground-muted">Tool</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-foreground-muted">Reason</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-foreground-muted">Expires</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-theme-foreground-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {userGrants.map((grant) => (
                      <tr key={grant.id} className="hover:bg-theme-card-hover">
                        <td className="px-4 py-3">
                          <div className="text-theme-foreground text-sm">{grant.userName}</div>
                          <div className="text-theme-foreground-muted text-xs">{grant.userEmail}</div>
                        </td>
                        <td className="px-4 py-3 text-theme-foreground text-sm">{grant.toolName}</td>
                        <td className="px-4 py-3 text-theme-foreground-secondary text-sm">{grant.grantReason || '-'}</td>
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
          {/* Loading state for roles */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-theme-primary-20 border-t-theme-primary rounded-full animate-spin" />
              <span className="ml-3 text-theme-foreground-muted">Loading role permissions...</span>
            </div>
          )}

          {/* Error state for roles */}
          {error && !isLoading && (
            <div className="p-6 bg-red-500/10 border border-red-500/30">
              <p className="text-red-400">Failed to load role permissions. Please try again.</p>
            </div>
          )}

          {/* Content when loaded */}
          {!isLoading && !error && (
            <>
              {/* Success indicator */}
              {!hasChanges && localPermissions.length > 0 && (
                <div className="bg-theme-primary-5 border border-theme-primary-20 p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-theme-primary flex-shrink-0" />
                  <p className="text-sm text-theme-primary">
                    Tool permissions are saved and active. Changes take effect immediately.
                  </p>
                </div>
              )}

              {/* Info Banner */}
              <div className="bg-theme-card-hover border border-theme-border-strong p-4">
                <p className="text-sm text-theme-foreground-secondary">
                  Enable access for specific roles by checking the boxes below.
                  Changes will apply to all users with those roles immediately after saving.
                </p>
              </div>

              {/* Permissions Table */}
      <div className="relative overflow-hidden bg-theme-card border border-theme-border">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-card-hover">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                  Tool
                </th>
                {AVAILABLE_ROLES.map(role => (
                  <th key={role} className="px-6 py-4 text-center text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {localPermissions.map((tool, index) => (
                <tr
                  key={tool.toolId}
                  className={`${index % 2 === 0 ? 'bg-theme-card' : ''} hover:bg-theme-card-hover transition-colors`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-theme-foreground font-medium">{tool.toolName}</span>
                    </div>
                  </td>
                  {AVAILABLE_ROLES.map(role => {
                    const hasAccess = tool.roles.includes(role);
                    return (
                      <td key={role} className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleRoleForTool(tool.toolId, role)}
                          className={`relative inline-flex items-center justify-center w-6 h-6 transition-all border ${
                            hasAccess
                              ? 'bg-theme-primary hover:bg-theme-primary-hover border-theme-primary'
                              : 'bg-theme-card hover:bg-theme-card-hover border-theme-border-strong'
                          }`}
                        >
                          {hasAccess && (
                            <svg
                              className="w-4 h-4 text-black"
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
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-primary-20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
          <h3 className="text-lg font-light text-theme-foreground mb-2">Quick Presets</h3>
          <p className="text-sm text-theme-foreground-muted mb-4">
            Apply common permission configurations
          </p>
          <div className="space-y-2">
            <button
              onClick={() => applyPreset('writers-limited')}
              className="w-full px-4 py-2 bg-theme-card-hover text-theme-foreground-secondary hover:bg-theme-card hover:text-theme-foreground transition-colors text-sm border border-theme-border-strong"
            >
              Writers: Work Registration Only
            </button>
            <button
              onClick={() => applyPreset('full-access')}
              className="w-full px-4 py-2 bg-theme-primary-10 text-theme-primary hover:bg-theme-primary-20 transition-colors text-sm border border-theme-border-hover"
            >
              All Roles: Full Access
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-primary-20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
          <h3 className="text-lg font-light text-theme-foreground mb-2">Permission Summary</h3>
          <p className="text-sm text-theme-foreground-muted mb-4">
            Current access counts by role
          </p>
          <div className="space-y-2">
            {AVAILABLE_ROLES.map(role => {
              const toolCount = localPermissions.filter(tool => tool.roles.includes(role)).length;
              return (
                <div key={role} className="flex justify-between items-center text-sm py-1">
                  <span className="text-theme-foreground-secondary font-medium">{role}</span>
                  <span className="text-theme-primary">
                    {toolCount} / {localPermissions.length} tools
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
