import React from 'react';
import { motion } from 'framer-motion';
import { Clock, FileText, CheckCircle, XCircle, Activity, Archive } from 'lucide-react';

interface SubmissionStatusBadgeProps {
  status: 'PENDING' | 'DOCUMENTS_REQUESTED' | 'APPROVED' | 'DENIED' | 'TRACKING' | 'COMPLETED';
  size?: 'sm' | 'md' | 'lg';
}

export const SubmissionStatusBadge: React.FC<SubmissionStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const configs = {
    PENDING: {
      label: 'Pending Review',
      icon: Clock,
      colors: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      glowColor: 'rgba(234, 179, 8, 0.3)',
      animate: true,
    },
    DOCUMENTS_REQUESTED: {
      label: 'Docs Requested',
      icon: FileText,
      colors: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      glowColor: 'rgba(249, 115, 22, 0.3)',
      animate: true,
    },
    APPROVED: {
      label: 'Approved',
      icon: CheckCircle,
      colors: 'bg-green-500/20 text-green-300 border-green-500/40',
      glowColor: 'rgba(34, 197, 94, 0.3)',
      animate: false,
    },
    DENIED: {
      label: 'Denied',
      icon: XCircle,
      colors: 'bg-red-500/20 text-red-300 border-red-500/40',
      glowColor: 'rgba(239, 68, 68, 0.3)',
      animate: false,
    },
    TRACKING: {
      label: 'Tracking',
      icon: Activity,
      colors: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      glowColor: 'rgba(59, 130, 246, 0.3)',
      animate: false,
    },
    COMPLETED: {
      label: 'Completed',
      icon: Archive,
      colors: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      glowColor: 'rgba(168, 85, 247, 0.3)',
      animate: false,
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm font-medium ${config.colors} ${sizeClasses[size]}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        boxShadow: config.animate
          ? [
              `0 0 0px ${config.glowColor}`,
              `0 0 20px ${config.glowColor}`,
              `0 0 0px ${config.glowColor}`,
            ]
          : `0 0 10px ${config.glowColor}`
      }}
      transition={{
        duration: 0.3,
        boxShadow: {
          duration: 2,
          repeat: config.animate ? Infinity : 0,
          repeatType: "reverse",
        },
      }}
    >
      <motion.div
        animate={config.animate ? { rotate: [0, 360] } : {}}
        transition={{
          duration: 2,
          repeat: config.animate ? Infinity : 0,
          ease: "linear",
        }}
      >
        <Icon size={iconSizes[size]} />
      </motion.div>
      <span>{config.label}</span>
    </motion.div>
  );
};
