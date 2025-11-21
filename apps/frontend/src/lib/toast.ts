import toast from 'react-hot-toast';

/**
 * Gamification Toast Notifications
 * Custom styled toasts for Tour Points, achievements, and more
 */

// Points earned notification
export const showPointsEarned = (points: number, reason?: string) => {
  toast.custom(
    (t) => (
      `<div class="${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 rounded-xl p-4 shadow-lg">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0 w-10 h-10 bg-yellow-500/30 rounded-full flex items-center justify-center">
            <span class="text-xl">+</span>
          </div>
          <div class="flex-1">
            <p class="text-yellow-400 font-bold text-lg">+${points} TP</p>
            ${reason ? `<p class="text-slate-300 text-sm">${reason}</p>` : ''}
          </div>
        </div>
      </div>`
    ),
    { duration: 4000, position: 'top-right' }
  );
};

// Simple points toast with emoji
export const pointsToast = (points: number, message?: string) => {
  toast(message || `Earned ${points} Tour Points!`, {
    icon: '🎯',
    style: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: '#fbbf24',
      border: '1px solid rgba(250, 204, 21, 0.3)',
      fontWeight: '600',
    },
  });
};

// Achievement unlocked notification
export const achievementToast = (achievementName: string, points: number, icon?: string) => {
  toast(
    `${icon || '🏆'} Achievement Unlocked: ${achievementName}! +${points} TP`,
    {
      duration: 5000,
      style: {
        background: 'linear-gradient(135deg, #1e293b 0%, #312e81 100%)',
        color: '#a78bfa',
        border: '1px solid rgba(167, 139, 250, 0.4)',
        fontWeight: '600',
      },
    }
  );
};

// Tier upgrade notification
export const tierUpgradeToast = (newTier: string) => {
  const tierColors: Record<string, { bg: string; border: string; text: string }> = {
    BRONZE: { bg: '#78350f', border: '#92400e', text: '#fbbf24' },
    SILVER: { bg: '#1e293b', border: '#64748b', text: '#e2e8f0' },
    GOLD: { bg: '#78350f', border: '#fbbf24', text: '#fef08a' },
    DIAMOND: { bg: '#1e1b4b', border: '#818cf8', text: '#c4b5fd' },
    ELITE: { bg: '#1f2937', border: '#f59e0b', text: '#fcd34d' },
  };

  const colors = tierColors[newTier] || tierColors.BRONZE;

  toast(`🎉 Congratulations! You've reached ${newTier} tier!`, {
    duration: 6000,
    style: {
      background: colors.bg,
      color: colors.text,
      border: `2px solid ${colors.border}`,
      fontWeight: '700',
    },
  });
};

// Daily check-in notification
export const checkInToast = (points: number, streakDay: number) => {
  let message = `Daily check-in complete! +${points} TP`;
  if (streakDay > 1) {
    message += ` (Day ${streakDay} streak!)`;
  }

  toast(message, {
    icon: '📅',
    style: {
      background: 'linear-gradient(135deg, #1e293b 0%, #065f46 100%)',
      color: '#34d399',
      border: '1px solid rgba(52, 211, 153, 0.4)',
      fontWeight: '600',
    },
  });
};

// Referral notification
export const referralToast = (type: 'signup' | 'conversion', points: number) => {
  const messages = {
    signup: `Someone used your referral code! +${points} TP`,
    conversion: `Your referral made their first contribution! +${points} TP`,
  };

  toast(messages[type], {
    icon: '🤝',
    duration: 5000,
    style: {
      background: 'linear-gradient(135deg, #1e293b 0%, #1e3a5f 100%)',
      color: '#38bdf8',
      border: '1px solid rgba(56, 189, 248, 0.4)',
      fontWeight: '600',
    },
  });
};

// Reward redeemed notification
export const rewardRedeemedToast = (rewardName: string, cost: number) => {
  toast(`${rewardName} redeemed for ${cost} TP!`, {
    icon: '🎁',
    duration: 5000,
    style: {
      background: 'linear-gradient(135deg, #1e293b 0%, #4c1d95 100%)',
      color: '#c4b5fd',
      border: '1px solid rgba(196, 181, 253, 0.4)',
      fontWeight: '600',
    },
  });
};

// Social share notification
export const socialShareToast = (platform: string, points: number) => {
  toast(`Shared on ${platform}! +${points} TP`, {
    icon: '📣',
    style: {
      background: 'linear-gradient(135deg, #1e293b 0%, #1e3a5f 100%)',
      color: '#60a5fa',
      border: '1px solid rgba(96, 165, 250, 0.4)',
      fontWeight: '600',
    },
  });
};

// Success toast
export const successToast = (message: string) => {
  toast.success(message);
};

// Error toast
export const errorToast = (message: string) => {
  toast.error(message);
};

// Info toast
export const infoToast = (message: string) => {
  toast(message, {
    icon: 'ℹ️',
    style: {
      background: '#1e293b',
      color: '#94a3b8',
      border: '1px solid #475569',
    },
  });
};

// Warning toast
export const warningToast = (message: string) => {
  toast(message, {
    icon: '⚠️',
    style: {
      background: '#1e293b',
      color: '#fbbf24',
      border: '1px solid rgba(251, 191, 36, 0.4)',
    },
  });
};

export default toast;
