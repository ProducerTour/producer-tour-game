import { useEffect, useState } from 'react';
import { CheckCircle2, PartyPopper, Sparkles } from 'lucide-react';

interface SuccessAnimationProps {
  show: boolean;
  videoCount?: number;
  onComplete?: () => void;
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

const COLORS = [
  '#60A5FA', // blue
  '#F59E0B', // amber
  '#10B981', // green
  '#EC4899', // pink
  '#8B5CF6', // purple
  '#EF4444', // red
  '#14B8A6', // teal
];

export function SuccessAnimation({ show, videoCount = 1, onComplete }: SuccessAnimationProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);

      // Generate confetti particles
      const particles: Confetti[] = [];
      for (let i = 0; i < 50; i++) {
        particles.push({
          id: i,
          x: Math.random() * 100,
          y: -10 - Math.random() * 20,
          rotation: Math.random() * 360,
          scale: 0.5 + Math.random() * 0.5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 0.5,
        });
      }
      setConfetti(particles);

      // Auto-hide after animation
      const timer = setTimeout(() => {
        setVisible(false);
        setConfetti([]);
        onComplete?.();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      {/* Confetti particles */}
      {confetti.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: particle.color }}
          />
        </div>
      ))}

      {/* Success message */}
      <div className="animate-success-pop bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          {/* Animated icon */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping-slow">
              <div className="w-20 h-20 rounded-full bg-green-500/20" />
            </div>
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center animate-bounce-subtle">
              <CheckCircle2 size={40} className="text-white" />
            </div>

            {/* Sparkles */}
            <Sparkles
              size={20}
              className="absolute -top-2 -right-2 text-yellow-400 animate-sparkle"
            />
            <PartyPopper
              size={20}
              className="absolute -bottom-1 -left-2 text-pink-400 animate-sparkle-delayed"
            />
          </div>

          {/* Text */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-1">
              {videoCount > 1 ? 'All Videos Generated!' : 'Video Generated!'}
            </h3>
            <p className="text-zinc-400">
              {videoCount} video{videoCount > 1 ? 's' : ''} ready for download
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Processing complete
          </div>
        </div>
      </div>
    </div>
  );
}
