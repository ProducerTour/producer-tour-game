import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Package, Gift } from 'lucide-react';
import { getAuthToken } from '../../lib/api';

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
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch redemptions');
      return response.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/admin/redemptions/${id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
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
            Authorization: `Bearer ${getAuthToken()}`,
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
        <div className="w-8 h-8 border-2 border-[#f0e226]/20 border-t-[#f0e226] rounded-full animate-spin" />
      </div>
    );
  }

  const redemptions = data?.redemptions || [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-light text-white mb-2">Reward Redemptions</h2>
        <p className="text-white/40">Manage pending physical reward redemptions</p>
      </div>

      {redemptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-white/40">
          <div className="w-16 h-16 mb-4 bg-[#f0e226]/10 flex items-center justify-center">
            <Gift className="w-8 h-8 text-[#f0e226]" />
          </div>
          <div className="text-lg mb-2">No pending redemptions</div>
          <div className="text-sm text-white/30">Physical reward redemptions will appear here</div>
        </div>
      ) : (
        <div className="space-y-4">
          {redemptions.map((redemption: Redemption) => (
            <div
              key={redemption.id}
              className="group relative overflow-hidden bg-[#19181a] p-6 border border-white/5 hover:border-[#f0e226]/30 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#f0e226]/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#f0e226]" />
                    </div>
                    <h3 className="text-lg font-medium text-white">{redemption.reward.name}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">User</div>
                      <div className="text-sm text-white">{redemption.userName}</div>
                      <div className="text-xs text-white/40">{redemption.userEmail}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Redeemed</div>
                      <div className="text-sm text-white">
                        {new Date(redemption.redeemedAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Cost</div>
                      <div className="text-lg font-light text-[#f0e226]">
                        {redemption.pointsCost.toLocaleString()} TP
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Type</div>
                      <div className="text-sm text-white">{redemption.reward.type}</div>
                    </div>
                  </div>

                  <div className="text-sm text-white/60 mb-4">
                    {redemption.reward.description}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => openModal(redemption, 'approve')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#f0e226] text-black hover:bg-[#d9cc22] transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => openModal(redemption, 'deny')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-colors"
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative overflow-hidden bg-[#19181a] max-w-md w-full p-6 border border-white/10">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
            <h3 className="text-xl font-light text-white mb-4">
              {modalAction === 'approve' ? 'Approve' : 'Deny'} Redemption
            </h3>
            <p className="text-white/60 mb-4">
              {modalAction === 'approve'
                ? <>Approve <span className="text-[#f0e226]">{selectedRedemption.userName}</span>'s redemption of "<span className="text-white">{selectedRedemption.reward.name}</span>"?</>
                : <>Deny <span className="text-[#f0e226]">{selectedRedemption.userName}</span>'s redemption and refund <span className="text-[#f0e226]">{selectedRedemption.pointsCost} TP</span>?</>}
            </p>

            <div className="mb-6">
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Admin Notes {modalAction === 'deny' && '(Required for denial)'}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#f0e226]/50"
                rows={3}
                placeholder={modalAction === 'approve' ? 'Optional notes...' : 'Reason for denial...'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
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
                className={`flex-1 px-4 py-2 transition-colors ${
                  modalAction === 'approve'
                    ? 'bg-[#f0e226] text-black hover:bg-[#d9cc22]'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
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
