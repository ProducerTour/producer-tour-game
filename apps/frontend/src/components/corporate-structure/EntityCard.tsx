import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EntityCardProps {
  name: string;
  type: string;
  jurisdiction: string;
  icon: LucideIcon;
  color: string;
  purpose: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function EntityCard({
  name,
  type,
  jurisdiction,
  icon: Icon,
  color,
  purpose,
  isActive = false,
  onClick
}: EntityCardProps) {
  const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/50', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400', glow: 'shadow-green-500/20' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      className={`
        p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300
        ${colors.border} ${colors.bg}
        ${isActive ? `shadow-lg ${colors.glow}` : 'hover:shadow-md'}
      `}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={`
          w-14 h-14 rounded-xl flex items-center justify-center
          ${colors.bg} border ${colors.border}
        `}>
          <Icon className={`w-7 h-7 ${colors.text}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white leading-tight">{name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
              {type}
            </span>
            <span className="text-xs text-text-muted">({jurisdiction})</span>
          </div>
          <p className="text-sm text-text-secondary mt-2 line-clamp-2">{purpose}</p>
        </div>
      </div>
    </motion.div>
  );
}
