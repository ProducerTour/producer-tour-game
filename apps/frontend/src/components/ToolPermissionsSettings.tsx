import { useState } from 'react';

interface ToolPermission {
  id: string;
  name: string;
  icon: string;
  roles: string[];
}

// This would ideally come from the backend/database
// For now, it mirrors the TOOLS array from ToolsHub
const INITIAL_TOOL_PERMISSIONS: ToolPermission[] = [
  {
    id: 'pub-deal-simulator',
    name: 'Pub Deal Simulator',
    icon: '💰',
    roles: ['ADMIN']
  },
  {
    id: 'consultation-form',
    name: 'Consultation Form',
    icon: '📋',
    roles: ['ADMIN']
  },
  {
    id: 'case-study',
    name: 'Case Study',
    icon: '📚',
    roles: ['ADMIN']
  },
  {
    id: 'royalty-tracker',
    name: 'Royalty Portal',
    icon: '📊',
    roles: ['ADMIN']
  },
  {
    id: 'opportunities',
    name: 'Opportunities',
    icon: '🎯',
    roles: ['ADMIN']
  },
  {
    id: 'advance-estimator',
    name: 'Advance Estimator',
    icon: '💰',
    roles: ['ADMIN']
  },
  {
    id: 'placement-tracker',
    name: 'Placement Tracker',
    icon: '🎵',
    roles: ['ADMIN']
  },
  {
    id: 'work-registration',
    name: 'Work Registration Tool',
    icon: '✨',
    roles: ['ADMIN', 'WRITER', 'MANAGER', 'LEGAL']
  }
];

const AVAILABLE_ROLES = ['ADMIN', 'WRITER', 'MANAGER', 'LEGAL'];

export default function ToolPermissionsSettings() {
  const [toolPermissions, setToolPermissions] = useState<ToolPermission[]>(INITIAL_TOOL_PERMISSIONS);
  const [hasChanges, setHasChanges] = useState(false);

  const toggleRoleForTool = (toolId: string, role: string) => {
    setToolPermissions(prev => prev.map(tool => {
      if (tool.id === toolId) {
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
    // TODO: Send to backend API to save permissions
    console.log('Saving tool permissions:', toolPermissions);
    alert('Tool permissions saved! (Note: This will be connected to the backend in a future update)');
    setHasChanges(false);
  };

  const handleReset = () => {
    setToolPermissions(INITIAL_TOOL_PERMISSIONS);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Tool Permissions</h2>
          <p className="text-gray-400">
            Configure which roles have access to each tool in the Tools Hub
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          💡 <strong>Tip:</strong> Enable access for specific roles by checking the boxes below.
          Changes will apply to all users with those roles immediately after saving.
        </p>
      </div>

      {/* Permissions Table */}
      <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
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
            <tbody className="divide-y divide-slate-700">
              {toolPermissions.map((tool, index) => (
                <tr
                  key={tool.id}
                  className={index % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800'}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{tool.icon}</span>
                      <span className="text-white font-medium">{tool.name}</span>
                    </div>
                  </td>
                  {AVAILABLE_ROLES.map(role => {
                    const hasAccess = tool.roles.includes(role);
                    return (
                      <td key={role} className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleRoleForTool(tool.id, role)}
                          className={`relative inline-flex items-center justify-center w-6 h-6 rounded transition-all ${
                            hasAccess
                              ? 'bg-green-500 hover:bg-green-600'
                              : 'bg-slate-600 hover:bg-slate-500'
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
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">Quick Presets</h3>
          <p className="text-sm text-gray-400 mb-4">
            Apply common permission configurations
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setToolPermissions(prev => prev.map(tool => ({
                  ...tool,
                  roles: tool.id === 'work-registration' ? ['ADMIN', 'WRITER', 'MANAGER', 'LEGAL'] : ['ADMIN']
                })));
                setHasChanges(true);
              }}
              className="w-full px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
            >
              ✏️ Writers: Work Registration Only
            </button>
            <button
              onClick={() => {
                setToolPermissions(prev => prev.map(tool => ({
                  ...tool,
                  roles: AVAILABLE_ROLES
                })));
                setHasChanges(true);
              }}
              className="w-full px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
            >
              🌐 All Roles: Full Access
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">Permission Summary</h3>
          <p className="text-sm text-gray-400 mb-4">
            Current access counts by role
          </p>
          <div className="space-y-2">
            {AVAILABLE_ROLES.map(role => {
              const toolCount = toolPermissions.filter(tool => tool.roles.includes(role)).length;
              return (
                <div key={role} className="flex justify-between items-center text-sm">
                  <span className="text-gray-300 font-medium">{role}</span>
                  <span className="text-blue-400">
                    {toolCount} / {toolPermissions.length} tools
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
