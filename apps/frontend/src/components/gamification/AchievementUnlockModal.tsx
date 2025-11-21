import { useEffect, useState } from 'react';
import { Award, X } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  tier: string;
}

interface AchievementUnlockModalProps {
  isOpen: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

const tierColors = {
  BRONZE: 'from-amber-700 to-amber-900',
  SILVER: 'from-gray-400 to-gray-600',
  GOLD: 'from-yellow-400 to-yellow-600',
  PLATINUM: 'from-purple-400 to-purple-600',
  DIAMOND: 'from-cyan-400 to-cyan-600',
};

export default function AchievementUnlockModal({ isOpen, achievement, onClose }: AchievementUnlockModalProps) {
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    if (isOpen && achievement) {
      setCanDismiss(false);
      // Prevent dismissal for 2 seconds
      const timer = setTimeout(() => setCanDismiss(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, achievement]);

  if (!isOpen || !achievement) return null;

  const tierGradient = tierColors[achievement.tier as keyof typeof tierColors] || tierColors.BRONZE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={canDismiss ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border-2 border-yellow-500 animate-scale-in">
        {/* Sparkle Effect */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>

        {/* Close Button (only after 2 seconds) */}
        {canDismiss && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Content */}
        <div className="text-center relative z-10">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl animate-bounce-slow shadow-2xl bg-gradient-to-br ${tierGradient}`}>
              {achievement.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2 animate-fade-in">
            Achievement Unlocked!
          </h2>

          {/* Achievement Name */}
          <h3 className="text-xl font-semibold text-yellow-400 mb-4">
            {achievement.name}
          </h3>

          {/* Description */}
          <p className="text-slate-300 mb-6">
            {achievement.description}
          </p>

          {/* Tier Badge */}
          <div className="mb-6">
            <div className={`inline-block bg-gradient-to-r ${tierGradient} px-4 py-2 rounded-full text-sm font-bold text-white`}>
              {achievement.tier} TIER
            </div>
          </div>

          {/* Points Earned */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mb-6">
            <div className="flex items-center justify-center gap-2">
              <Award className="w-6 h-6 text-yellow-400" />
              <div>
                <div className="text-sm text-slate-400">Points Earned</div>
                <div className="text-2xl font-bold text-yellow-400">+{achievement.points} TP</div>
              </div>
            </div>
          </div>

          {/* Dismiss Hint */}
          {!canDismiss && (
            <div className="text-xs text-slate-500 animate-pulse">
              Celebrating your achievement...
            </div>
          )}
          {canDismiss && (
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all shadow-lg"
            >
              Awesome!
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.1);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
}
