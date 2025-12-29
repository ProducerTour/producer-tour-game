import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';

interface LevelUpModalProps {
  isOpen: boolean;
  newTier: string;
  previousTier: string;
  points: number;
  onClose: () => void;
}

const TIER_COLORS = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  DIAMOND: '#B9F2FF',
  ELITE: '#9333EA'
};

const TIER_EMOJIS = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  DIAMOND: '💎',
  ELITE: '👑'
};

export default function LevelUpModal({ isOpen, newTier, previousTier, points, onClose }: LevelUpModalProps) {
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCanDismiss(false);
      // Prevent dismissal for 3 seconds to let user celebrate
      const timer = setTimeout(() => setCanDismiss(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={canDismiss ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border-2 animate-scale-in"
        style={{ borderColor: TIER_COLORS[newTier as keyof typeof TIER_COLORS] }}
      >
        {/* Confetti Effect */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Close Button (only after 3 seconds) */}
        {canDismiss && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Content */}
        <div className="text-center relative z-10">
          {/* Trophy Icon */}
          <div className="mb-6 flex justify-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center animate-bounce-slow shadow-2xl"
              style={{ backgroundColor: TIER_COLORS[newTier as keyof typeof TIER_COLORS] }}
            >
              <Trophy className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-2 animate-fade-in">
            🎉 Level Up! 🎉
          </h2>

          {/* Tier Change */}
          <div className="flex items-center justify-center gap-4 my-6">
            <div className="text-center">
              <div className="text-4xl mb-2">{TIER_EMOJIS[previousTier as keyof typeof TIER_EMOJIS]}</div>
              <div
                className="text-lg font-bold"
                style={{ color: TIER_COLORS[previousTier as keyof typeof TIER_COLORS] }}
              >
                {previousTier}
              </div>
            </div>

            <div className="text-3xl text-white animate-pulse">→</div>

            <div className="text-center">
              <div className="text-4xl mb-2 animate-pulse">{TIER_EMOJIS[newTier as keyof typeof TIER_EMOJIS]}</div>
              <div
                className="text-xl font-bold"
                style={{ color: TIER_COLORS[newTier as keyof typeof TIER_COLORS] }}
              >
                {newTier}
              </div>
            </div>
          </div>

          {/* Message */}
          <p className="text-slate-300 text-lg mb-6">
            You've reached <span className="font-bold" style={{ color: TIER_COLORS[newTier as keyof typeof TIER_COLORS] }}>{newTier}</span> tier!
          </p>

          {/* Points */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Current Points</div>
            <div className="text-3xl font-bold text-yellow-400">{points.toLocaleString()} TM</div>
          </div>

          {/* Dismiss Hint */}
          {!canDismiss && (
            <div className="mt-6 text-xs text-slate-500 animate-pulse">
              Celebrating your achievement...
            </div>
          )}
          {canDismiss && (
            <div className="mt-6">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
              >
                Continue
              </button>
            </div>
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

        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
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

        .animate-confetti {
          animation: confetti linear forwards;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out 0.3s both;
        }
      `}</style>
    </div>
  );
}
