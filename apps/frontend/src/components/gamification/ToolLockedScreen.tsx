import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Check, Loader2, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gamificationApi } from '../../lib/api';

interface ToolLockedScreenProps {
  toolName: string;
  toolId: string;
  toolDescription?: string;
  cost: number;
  features?: string[];
  icon?: React.ReactNode;
}

export function ToolLockedScreen({
  toolName,
  toolId,
  toolDescription,
  cost,
  features = [],
  icon,
}: ToolLockedScreenProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Get user's current Tour Miles balance
  const { data: stats } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getStats();
      return response.data;
    },
  });

  // Get the specific reward for this tool (creates it if it doesn't exist)
  const { data: toolReward, isLoading: isLoadingReward } = useQuery({
    queryKey: ['tool-reward', toolId],
    queryFn: async () => {
      const response = await gamificationApi.getToolReward(toolId);
      return response.data;
    },
  });

  const actualCost = toolReward?.cost || cost;
  const canAfford = (stats?.points || 0) >= actualCost;

  // Redeem mutation
  const redeemMutation = useMutation({
    mutationFn: async () => {
      if (!toolReward?.id) {
        throw new Error('Tool access reward not found');
      }
      const response = await gamificationApi.redeemReward(toolReward.id);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries to refresh access status
      queryClient.invalidateQueries({ queryKey: ['tool-access', toolId] });
      queryClient.invalidateQueries({ queryKey: ['user-tool-access'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-rewards'] });
    },
    onError: (error: any) => {
      setRedeemError(error.response?.data?.error || 'Failed to redeem reward');
    },
  });

  const handleRedeem = () => {
    setRedeemError(null);
    redeemMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          {/* Lock icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center">
            {icon || <Lock className="w-10 h-10 text-amber-400" />}
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">{toolName}</h1>
          <p className="text-gray-400 mb-6">
            {toolDescription || 'This tool requires Tour Miles to unlock.'}
          </p>

          {/* Cost badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-amber-300 font-semibold">{actualCost} Tour Miles</span>
            <span className="text-gray-400 text-sm">for 30 days</span>
          </div>

          {/* Features list */}
          {features.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">What you'll get:</h3>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Balance display */}
          <div className="mb-6 p-4 bg-white/5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Your Balance:</span>
              <span className={`font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                {stats?.points?.toLocaleString() || 0} Tour Miles
              </span>
            </div>
            {!canAfford && (
              <p className="text-red-400/80 text-xs mt-2">
                You need {(actualCost - (stats?.points || 0)).toLocaleString()} more Tour Miles
              </p>
            )}
          </div>

          {/* Error message */}
          {redeemError && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{redeemError}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {isLoadingReward ? (
              <button
                disabled
                className="w-full py-3 px-6 bg-gradient-to-r from-amber-500/50 to-orange-500/50 text-white font-semibold rounded-xl transition-all opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </button>
            ) : canAfford && toolReward ? (
              <button
                onClick={handleRedeem}
                disabled={redeemMutation.isPending}
                className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {redeemMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Unlock with {actualCost} Tour Miles
                  </>
                )}
              </button>
            ) : !canAfford ? (
              <Link
                to="/tour-miles"
                className="block w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all text-center"
              >
                Earn More Tour Miles
              </Link>
            ) : (
              <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-300 text-sm">This reward is currently unavailable. Please try again later or contact support.</p>
              </div>
            )}

            <Link
              to="/tour-miles/rewards"
              className="block w-full py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all text-center"
            >
              View All Rewards
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
