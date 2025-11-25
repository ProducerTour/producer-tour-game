import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Package, Gift } from 'lucide-react';

interface Redemption {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  reward: {
    id: string;
    name: string;
    description: string;
    type: string;
    cost: number;
  };
  pointsCost: number;
  status: string;
  redeemedAt: string;
  adminNotes?: string;
}

export default function RewardRedemptionsTab() {
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'deny'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-redemptions'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/admin/redemptions`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch redemptions');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/admin/redemptions/${id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ adminNotes: notes }),
        }
      );
      if (!response.ok) throw new Error('Failed to approve redemption');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      toast.success('Redemption approved');
      closeModal();
    },
    onError: () => {
      toast.error('Failed to approve redemption');
    },
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/admin/redemptions/${id}/deny`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ adminNotes: notes }),
        }
      );
      if (!response.ok) throw new Error('Failed to deny redemption');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      toast.success('Redemption denied and points refunded');
      closeModal();
    },
    onError: () => {
      toast.error('Failed to deny redemption');
    },
  });

  const openModal = (redemption: Redemption, action: 'approve' | 'deny') => {
    setSelectedRedemption(redemption);
    setModalAction(action);
    setAdminNotes('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRedemption(null);
    setAdminNotes('');
  };

  const handleConfirm = async () => {
    if (!selectedRedemption) return;

    if (modalAction === 'approve') {
      await approveMutation.mutateAsync({ id: selectedRedemption.id, notes: adminNotes });
    } else {
      await denyMutation.mutateAsync({ id: selectedRedemption.id, notes: adminNotes });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading redemptions...</div>
      </div>
    );
  }

  const redemptions = data?.redemptions || [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Reward Redemptions</h2>
        <p className="text-slate-400">Manage pending physical reward redemptions</p>
      </div>

      {redemptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Gift className="w-16 h-16 mb-4 opacity-20" />
          <div className="text-lg mb-2">No pending redemptions</div>
          <div className="text-sm">Physical reward redemptions will appear here</div>
        </div>
      ) : (
        <div className="space-y-4">
          {redemptions.map((redemption: Redemption) => (
            <div
              key={redemption.id}
              className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">{redemption.reward.name}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">User</div>
                      <div className="text-sm text-white">{redemption.userName}</div>
                      <div className="text-xs text-slate-400">{redemption.userEmail}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Redeemed</div>
                      <div className="text-sm text-white">
                        {new Date(redemption.redeemedAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Cost</div>
                      <div className="text-sm font-semibold text-yellow-400">
                        {redemption.pointsCost.toLocaleString()} TP
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Type</div>
                      <div className="text-sm text-white">{redemption.reward.type}</div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-300 mb-4">
                    {redemption.reward.description}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => openModal(redemption, 'approve')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => openModal(redemption, 'deny')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && selectedRedemption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-md w-full p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {modalAction === 'approve' ? 'Approve' : 'Deny'} Redemption
            </h3>
            <p className="text-slate-300 mb-4">
              {modalAction === 'approve'
                ? `Approve ${selectedRedemption.userName}'s redemption of "${selectedRedemption.reward.name}"?`
                : `Deny ${selectedRedemption.userName}'s redemption and refund ${selectedRedemption.pointsCost} TP?`}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Admin Notes {modalAction === 'deny' && '(Required for denial)'}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder={modalAction === 'approve' ? 'Optional notes...' : 'Reason for denial...'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  (modalAction === 'deny' && !adminNotes.trim()) ||
                  approveMutation.isPending ||
                  denyMutation.isPending
                }
                className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${
                  modalAction === 'approve'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {approveMutation.isPending || denyMutation.isPending
                  ? 'Processing...'
                  : modalAction === 'approve'
                  ? 'Approve'
                  : 'Deny & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
