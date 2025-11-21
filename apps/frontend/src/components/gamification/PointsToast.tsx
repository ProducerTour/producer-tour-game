import { useEffect } from 'react';
import { Star, TrendingUp } from 'lucide-react';

interface PointsToastProps {
  points: number;
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function PointsToast({ points, message, isVisible, onClose }: PointsToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto-dismiss after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-6 z-50 animate-slide-in-right">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-2xl p-4 flex items-center gap-3 min-w-[300px] border border-blue-400">
        {/* Icon */}
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          {points > 0 ? (
            <TrendingUp className="w-5 h-5" />
          ) : (
            <Star className="w-5 h-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="font-semibold text-sm">{message}</div>
          <div className="text-2xl font-bold">
            {points > 0 ? '+' : ''}{points} TP
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
