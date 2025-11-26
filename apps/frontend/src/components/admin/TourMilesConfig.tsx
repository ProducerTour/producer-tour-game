import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAuthToken } from '../../lib/api';
import {
  Users,
  Gift,
  Settings,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Trophy,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const getAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

// Types - matches the flat structure returned by /api/gamification/admin/users
interface GamificationUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  points: number;
  totalEarned: number;
  totalSpent: number;
  tier: string;
  currentStreak: number;
  longestStreak: number;
  referralCode: string | null;
  achievementCount: number;
  redemptionCount: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: string;
  type: string;
  roleRestriction: string | null;
  tierRestriction: string | null;
  details: Record<string, any>;
  inventory: number | null;
  isActive: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  points: number;
  criteria: Record<string, any>;
  iconUrl: string | null;
  isActive: boolean;
  _count: { userAchievements: number };
}

interface PointConfig {
  key: string;
  value: Record<string, number>;
}

type TabType = 'users' | 'rewards' | 'achievements' | 'config';

export default function TourMilesConfig() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  const tabs = [
    { id: 'users' as TabType, label: 'User Management', icon: Users },
    { id: 'rewards' as TabType, label: 'Rewards', icon: Gift },
    { id: 'achievements' as TabType, label: 'Achievements', icon: Trophy },
    { id: 'config' as TabType, label: 'Point Config', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Tour Miles Configuration</h2>
        <p className="text-text-muted text-sm">Manage gamification settings, users, rewards, and achievements</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/[0.04] p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-text-muted hover:text-white hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'rewards' && <RewardManagement />}
        {activeTab === 'achievements' && <AchievementManagement />}
        {activeTab === 'config' && <PointConfiguration />}
      </div>
    </div>
  );
}

// ============ USER MANAGEMENT ============
function UserManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [pointsModal, setPointsModal] = useState<{ userId: string; name: string; action: 'award' | 'deduct' } | null>(null);

  const { data: users, isLoading, refetch } = useQuery<GamificationUser[]>({
    queryKey: ['admin-gamification-users'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/gamification/admin/users`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      return data.users;
    },
  });

  const filteredUsers = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers?.map((user) => (
            <div key={user.id} className="bg-white/[0.06] rounded-lg border border-white/[0.08]">
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-white font-medium">
                      {user.name}
                    </p>
                    <p className="text-text-muted text-sm">{user.email}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">
                      {user.points?.toLocaleString() || 0} TP
                    </p>
                    <p className="text-text-muted text-xs">
                      {user.tier || 'BRONZE'} • {user.achievementCount} achievements
                    </p>
                  </div>
                  {expandedUser === user.id ? (
                    <ChevronUp className="w-5 h-5 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-text-muted" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedUser === user.id && (
                <div className="border-t border-white/[0.08] p-4 space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white/[0.06] rounded p-3">
                      <p className="text-text-muted text-xs">Total Points</p>
                      <p className="text-white font-bold">{user.points?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-white/[0.06] rounded p-3">
                      <p className="text-text-muted text-xs">Lifetime Points</p>
                      <p className="text-white font-bold">{user.totalEarned?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-white/[0.06] rounded p-3">
                      <p className="text-text-muted text-xs">Current Streak</p>
                      <p className="text-white font-bold">{user.currentStreak || 0} days</p>
                    </div>
                    <div className="bg-white/[0.06] rounded p-3">
                      <p className="text-text-muted text-xs">Redemptions</p>
                      <p className="text-white font-bold">{user.redemptionCount}</p>
                    </div>
                  </div>

                  {user.role !== 'ADMIN' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPointsModal({ userId: user.id, name: user.name, action: 'award' })}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
                      >
                        <Plus className="w-4 h-4" />
                        Award Points
                      </button>
                      <button
                        onClick={() => setPointsModal({ userId: user.id, name: user.name, action: 'deduct' })}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
                      >
                        <Minus className="w-4 h-4" />
                        Deduct Points
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Points Modal */}
      {pointsModal && (
        <PointsModal
          userId={pointsModal.userId}
          userName={pointsModal.name}
          action={pointsModal.action}
          onClose={() => setPointsModal(null)}
          onSuccess={() => {
            setPointsModal(null);
            queryClient.invalidateQueries({ queryKey: ['admin-gamification-users'] });
          }}
        />
      )}
    </div>
  );
}

function PointsModal({
  userId,
  userName,
  action,
  onClose,
  onSuccess,
}: {
  userId: string;
  userName: string;
  action: 'award' | 'deduct';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (points <= 0 || !reason.trim()) return;
    setIsSubmitting(true);

    try {
      const endpoint = action === 'award' ? 'award-points' : 'deduct-points';
      const res = await fetch(`${API_URL}/api/gamification/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ points, reason }),
      });

      if (!res.ok) throw new Error('Failed to update points');
      toast.success(`${action === 'award' ? 'Awarded' : 'Deducted'} ${points} TP ${action === 'award' ? 'to' : 'from'} ${userName}`);
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${action} points`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl p-6 w-full max-w-md border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {action === 'award' ? 'Award Points' : 'Deduct Points'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-text-muted mb-4">
          {action === 'award' ? 'Award points to' : 'Deduct points from'} <span className="text-white">{userName}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Points</label>
            <input
              type="number"
              min="1"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for this adjustment..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={points <= 0 || !reason.trim() || isSubmitting}
            className={`px-4 py-2 rounded-lg text-white ${
              action === 'award' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? 'Processing...' : action === 'award' ? 'Award Points' : 'Deduct Points'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ REWARD MANAGEMENT ============
function RewardManagement() {
  const queryClient = useQueryClient();
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: rewards, isLoading, refetch } = useQuery<Reward[]>({
    queryKey: ['admin-rewards'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/gamification/admin/rewards`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch rewards');
      const data = await res.json();
      return data.rewards;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const res = await fetch(`${API_URL}/api/gamification/admin/rewards/${rewardId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete reward');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
      toast.success('Reward deleted');
    },
    onError: () => {
      toast.error('Failed to delete reward');
    },
  });

  const categories = ['COMMISSION', 'PAYOUT', 'PLATFORM', 'SUBSCRIPTION', 'PHYSICAL'];
  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Rewards Management</h3>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            <Plus className="w-4 h-4" />
            Add Reward
          </button>
        </div>
      </div>

      {/* Rewards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards?.map((reward) => (
            <div
              key={reward.id}
              className={`bg-white/[0.06] rounded-lg border p-4 ${
                reward.isActive ? 'border-white/[0.08]' : 'border-red-500/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">{reward.name}</h4>
                  <p className="text-text-muted text-sm line-clamp-2">{reward.description}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingReward(reward)}
                    className="p-1 text-text-muted hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this reward?')) {
                        deleteMutation.mutate(reward.id);
                      }
                    }}
                    className="p-1 text-text-muted hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                  {reward.cost} TP
                </span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                  {reward.category}
                </span>
                {reward.tierRestriction && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                    {reward.tierRestriction}+
                  </span>
                )}
                {reward.roleRestriction && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                    {reward.roleRestriction}
                  </span>
                )}
                {reward.inventory !== null && (
                  <span className="px-2 py-1 bg-white/10 text-text-secondary rounded text-xs">
                    {reward.inventory} left
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || editingReward) && (
        <RewardModal
          reward={editingReward}
          categories={categories}
          tiers={tiers}
          onClose={() => {
            setIsCreating(false);
            setEditingReward(null);
          }}
          onSuccess={() => {
            setIsCreating(false);
            setEditingReward(null);
            queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
          }}
        />
      )}
    </div>
  );
}

function RewardModal({
  reward,
  categories,
  tiers,
  onClose,
  onSuccess,
}: {
  reward: Reward | null;
  categories: string[];
  tiers: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: reward?.name || '',
    description: reward?.description || '',
    cost: reward?.cost || 100,
    category: reward?.category || 'PLATFORM',
    type: reward?.type || 'CUSTOM',
    roleRestriction: reward?.roleRestriction || '',
    tierRestriction: reward?.tierRestriction || '',
    inventory: reward?.inventory?.toString() || '',
    isActive: reward?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim()) return;
    setIsSubmitting(true);

    try {
      const endpoint = reward
        ? `${API_URL}/api/gamification/admin/rewards/${reward.id}`
        : `${API_URL}/api/gamification/admin/rewards`;

      const res = await fetch(endpoint, {
        method: reward ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          roleRestriction: formData.roleRestriction || null,
          tierRestriction: formData.tierRestriction || null,
          inventory: formData.inventory ? parseInt(formData.inventory) : null,
        }),
      });

      if (!res.ok) throw new Error('Failed to save reward');
      toast.success(reward ? 'Reward updated' : 'Reward created');
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save reward');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-surface rounded-xl p-6 w-full max-w-lg border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {reward ? 'Edit Reward' : 'Create Reward'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">Cost (TP)</label>
              <input
                type="number"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">Role Restriction</label>
              <select
                value={formData.roleRestriction}
                onChange={(e) => setFormData({ ...formData, roleRestriction: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="">All Roles</option>
                <option value="WRITER">WRITER only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Tier Restriction</label>
              <select
                value={formData.tierRestriction}
                onChange={(e) => setFormData({ ...formData, tierRestriction: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="">All Tiers</option>
                {tiers.map((tier) => (
                  <option key={tier} value={tier}>{tier}+</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">Inventory (optional)</label>
              <input
                type="number"
                min="0"
                value={formData.inventory}
                onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
                placeholder="Unlimited"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10"
                />
                <span className="text-text-muted">Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-text-muted hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || !formData.description.trim() || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Reward'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ ACHIEVEMENT MANAGEMENT ============
function AchievementManagement() {
  const queryClient = useQueryClient();
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: achievements, isLoading, refetch } = useQuery<Achievement[]>({
    queryKey: ['admin-achievements'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/gamification/admin/achievements`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch achievements');
      const data = await res.json();
      return data.achievements;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      const res = await fetch(`${API_URL}/api/gamification/admin/achievements/${achievementId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete achievement');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
      toast.success('Achievement deleted');
    },
    onError: () => {
      toast.error('Failed to delete achievement');
    },
  });

  const categories = ['ENGAGEMENT', 'MILESTONE', 'SOCIAL', 'SPECIAL'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Achievements Management</h3>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            <Plus className="w-4 h-4" />
            Add Achievement
          </button>
        </div>
      </div>

      {/* Achievements Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements?.map((achievement) => (
            <div
              key={achievement.id}
              className={`bg-white/[0.06] rounded-lg border p-4 ${
                achievement.isActive ? 'border-white/[0.08]' : 'border-red-500/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{achievement.name}</h4>
                    <p className="text-text-muted text-sm line-clamp-1">{achievement.description}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingAchievement(achievement)}
                    className="p-1 text-text-muted hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this achievement?')) {
                        deleteMutation.mutate(achievement.id);
                      }
                    }}
                    className="p-1 text-text-muted hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                  +{achievement.points} TP
                </span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                  {achievement.category}
                </span>
                <span className="px-2 py-1 bg-white/10 text-text-secondary rounded text-xs">
                  {achievement._count.userAchievements} unlocked
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || editingAchievement) && (
        <AchievementModal
          achievement={editingAchievement}
          categories={categories}
          onClose={() => {
            setIsCreating(false);
            setEditingAchievement(null);
          }}
          onSuccess={() => {
            setIsCreating(false);
            setEditingAchievement(null);
            queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
          }}
        />
      )}
    </div>
  );
}

function AchievementModal({
  achievement,
  categories,
  onClose,
  onSuccess,
}: {
  achievement: Achievement | null;
  categories: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: achievement?.name || '',
    description: achievement?.description || '',
    category: achievement?.category || 'ENGAGEMENT',
    points: achievement?.points || 50,
    isActive: achievement?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim()) return;
    setIsSubmitting(true);

    try {
      const endpoint = achievement
        ? `${API_URL}/api/gamification/admin/achievements/${achievement.id}`
        : `${API_URL}/api/gamification/admin/achievements`;

      const res = await fetch(endpoint, {
        method: achievement ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save achievement');
      toast.success(achievement ? 'Achievement updated' : 'Achievement created');
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save achievement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl p-6 w-full max-w-lg border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {achievement ? 'Edit Achievement' : 'Create Achievement'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">Points Reward</label>
              <input
                type="number"
                min="0"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-white/10"
            />
            <span className="text-text-muted">Active</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-text-muted hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || !formData.description.trim() || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Achievement'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ POINT CONFIGURATION ============
function PointConfiguration() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<Record<string, number>>({});

  const { data: config, isLoading, refetch } = useQuery<PointConfig | null>({
    queryKey: ['point-config'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/gamification/admin/config/points`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch config');
      const data = await res.json();
      return data.config;
    },
  });

  const defaultConfig: Record<string, number> = {
    DAILY_CHECK_IN: 10,
    WORK_REGISTERED: 25,
    FIRST_PLACEMENT: 100,
    PLACEMENT_RECEIVED: 50,
    PROFILE_COMPLETE: 50,
    REFERRAL_SIGNUP: 75,
    REFERRAL_FIRST_PLACEMENT: 150,
    SOCIAL_SHARE: 15,
    REVENUE_MILESTONE_1K: 200,
    REVENUE_MILESTONE_10K: 500,
    REVENUE_MILESTONE_100K: 1000,
  };

  const currentConfig = config?.value || defaultConfig;

  const saveMutation = useMutation({
    mutationFn: async (newConfig: Record<string, number>) => {
      const res = await fetch(`${API_URL}/api/gamification/admin/config/points`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ config: newConfig }),
      });
      if (!res.ok) throw new Error('Failed to save config');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['point-config'] });
      setIsEditing(false);
      toast.success('Point configuration saved');
    },
    onError: () => {
      toast.error('Failed to save configuration');
    },
  });

  const handleStartEdit = () => {
    setEditedConfig({ ...currentConfig });
    setIsEditing(true);
  };

  const handleSave = () => {
    saveMutation.mutate(editedConfig);
  };

  const eventLabels: Record<string, string> = {
    DAILY_CHECK_IN: 'Daily Check-In',
    WORK_REGISTERED: 'Work Registered',
    FIRST_PLACEMENT: 'First Placement',
    PLACEMENT_RECEIVED: 'Placement Received',
    PROFILE_COMPLETE: 'Profile Complete',
    REFERRAL_SIGNUP: 'Referral Signup',
    REFERRAL_FIRST_PLACEMENT: 'Referral First Placement',
    SOCIAL_SHARE: 'Social Share',
    REVENUE_MILESTONE_1K: 'Revenue Milestone ($1K)',
    REVENUE_MILESTONE_10K: 'Revenue Milestone ($10K)',
    REVENUE_MILESTONE_100K: 'Revenue Milestone ($100K)',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Point Configuration</h3>
          <p className="text-text-muted text-sm">Configure how many Tour Points are awarded for each action</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-text-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
            >
              <Edit2 className="w-4 h-4" />
              Edit Config
            </button>
          )}
        </div>
      </div>

      {/* Config Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(isEditing ? editedConfig : currentConfig).map(([key, value]) => (
            <div key={key} className="bg-white/[0.06] rounded-lg border border-white/[0.08] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{eventLabels[key] || key}</p>
                  <p className="text-text-muted text-xs">{key}</p>
                </div>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={editedConfig[key] || 0}
                    onChange={(e) =>
                      setEditedConfig({ ...editedConfig, [key]: parseInt(e.target.value) || 0 })
                    }
                    className="w-24 px-3 py-1 bg-white/5 border border-white/10 rounded text-white text-right"
                  />
                ) : (
                  <span className="text-yellow-400 font-bold text-lg">{value} TP</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400 text-sm">
          <strong>Note:</strong> Changes to point values only affect future actions. Previously awarded points will not be recalculated.
        </p>
      </div>
    </div>
  );
}
