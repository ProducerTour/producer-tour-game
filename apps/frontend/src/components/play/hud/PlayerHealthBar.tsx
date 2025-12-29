/**
 * Player Health Bar Component
 * HUD overlay showing player health
 */

import { useMemo } from 'react';
import { useCombatStore } from '../combat/useCombatStore';

export function PlayerHealthBar() {
  // Use selectors to prevent re-renders when unrelated state changes
  const playerHealth = useCombatStore((s) => s.playerHealth);
  const playerMaxHealth = useCombatStore((s) => s.playerMaxHealth);
  const isInCombat = useCombatStore((s) => s.isInCombat);

  const healthPercent = (playerHealth / playerMaxHealth) * 100;
  const healthColor = useMemo(() => {
    if (healthPercent > 60) return '#22c55e'; // green
    if (healthPercent > 30) return '#eab308'; // yellow
    return '#ef4444'; // red
  }, [healthPercent]);

  return (
    <div
      className="fixed bottom-8 left-8 z-50 pointer-events-none"
      style={{ opacity: isInCombat ? 1 : 0.7, transition: 'opacity 0.3s' }}
    >
      {/* Health bar container */}
      <div className="relative w-64">
        {/* Background */}
        <div className="absolute inset-0 bg-black/80 rounded-lg border border-gray-700" />

        {/* Health bar */}
        <div className="relative p-2">
          <div className="h-6 bg-gray-900 rounded overflow-hidden">
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${healthPercent}%`,
                background: `linear-gradient(180deg, ${healthColor} 0%, ${healthColor}88 100%)`,
                boxShadow: `0 0 10px ${healthColor}66`,
              }}
            />
          </div>

          {/* Health text */}
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
            {Math.round(playerHealth)} / {playerMaxHealth}
          </div>
        </div>

        {/* Label */}
        <div className="text-xs text-gray-400 mt-1 ml-2">HEALTH</div>
      </div>
    </div>
  );
}

export default PlayerHealthBar;
