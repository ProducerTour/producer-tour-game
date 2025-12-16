/**
 * Health Bar Components
 * Player HUD health bar and 3D world health bars for targets
 */

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useCombatStore, type CombatTarget } from './useCombatStore';

// Player HUD Health Bar
export function PlayerHealthBar() {
  const { playerHealth, playerMaxHealth, isInCombat } = useCombatStore();

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

// Ammo Display
export function AmmoDisplay() {
  const { currentWeapon, ammo, isReloading } = useCombatStore();

  if (currentWeapon === 'none') return null;

  const currentAmmo = ammo[currentWeapon] || 0;

  return (
    <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
      <div className="relative bg-black/80 rounded-lg border border-gray-700 p-3">
        {/* Weapon name */}
        <div className="text-xs text-gray-400 uppercase mb-1">{currentWeapon}</div>

        {/* Ammo count */}
        <div className="text-3xl font-bold text-white font-mono">
          {isReloading ? (
            <span className="text-yellow-400 animate-pulse">RELOADING...</span>
          ) : (
            <>
              <span className={currentAmmo <= 5 ? 'text-red-400' : 'text-white'}>
                {currentAmmo}
              </span>
              <span className="text-gray-500 text-lg"> / {
                currentWeapon === 'rifle' ? 30 : 12
              }</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 3D World Health Bar (for NPCs/targets)
interface WorldHealthBarProps {
  target: CombatTarget;
  offset?: [number, number, number];
}

export function WorldHealthBar({ target, offset = [0, 2, 0] }: WorldHealthBarProps) {
  const healthPercent = (target.health / target.maxHealth) * 100;

  const healthColor = useMemo(() => {
    if (healthPercent > 60) return '#22c55e';
    if (healthPercent > 30) return '#eab308';
    return '#ef4444';
  }, [healthPercent]);

  // Don't show if full health
  if (healthPercent >= 100) return null;

  return (
    <group position={[target.position.x + offset[0], target.position.y + offset[1], target.position.z + offset[2]]}>
      <Html center sprite distanceFactor={10}>
        <div
          className="pointer-events-none"
          style={{ transform: 'scale(0.8)' }}
        >
          {/* Name */}
          <div className="text-white text-xs text-center mb-1 drop-shadow-lg">
            {target.type.toUpperCase()}
          </div>

          {/* Health bar */}
          <div className="w-20 h-2 bg-gray-900/80 rounded-full overflow-hidden border border-gray-700">
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${healthPercent}%`,
                backgroundColor: healthColor,
                boxShadow: `0 0 8px ${healthColor}`,
              }}
            />
          </div>

          {/* Health text */}
          <div className="text-white text-[10px] text-center mt-0.5">
            {Math.round(target.health)} / {target.maxHealth}
          </div>
        </div>
      </Html>
    </group>
  );
}

// Crosshair for aiming
export function Crosshair() {
  const { currentWeapon, isReloading, isAiming, isFiring } = useCombatStore();

  if (currentWeapon === 'none') return null;

  // Different crosshair sizes based on state
  // Aiming = tight crosshair, Hip-fire = wider crosshair
  const spread = isAiming ? 3 : 6;  // Distance from center to cross lines
  const lineLength = isAiming ? 3 : 2;  // Length of cross lines
  const dotSize = isAiming ? 'w-1 h-1' : 'w-1.5 h-1.5';
  const lineWidth = isAiming ? 'w-0.5' : 'w-[3px]';
  const lineHeight = isAiming ? 'h-0.5' : 'h-[3px]';

  // Color feedback
  const color = isFiring ? 'bg-red-400' : isAiming ? 'bg-white' : 'bg-white/70';
  const shadowColor = isFiring ? 'shadow-red-500/50' : 'shadow-white/50';

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div
        className={`relative transition-all duration-100 ${isReloading ? 'opacity-50' : 'opacity-100'}`}
        style={{ transform: isFiring ? 'scale(1.2)' : 'scale(1)' }}
      >
        {/* Center dot - only show when aiming */}
        {isAiming && (
          <div className={`${dotSize} ${color} rounded-full shadow-lg ${shadowColor}`} />
        )}

        {/* Cross lines with dynamic spread */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Top */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 ${lineWidth} ${color} transition-all duration-100`}
            style={{
              top: `-${spread + lineLength}px`,
              height: `${lineLength * 4}px`
            }}
          />
          {/* Bottom */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 ${lineWidth} ${color} transition-all duration-100`}
            style={{
              top: `${spread}px`,
              height: `${lineLength * 4}px`
            }}
          />
          {/* Left */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${lineHeight} ${color} transition-all duration-100`}
            style={{
              left: `-${spread + lineLength}px`,
              width: `${lineLength * 4}px`
            }}
          />
          {/* Right */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${lineHeight} ${color} transition-all duration-100`}
            style={{
              left: `${spread}px`,
              width: `${lineLength * 4}px`
            }}
          />
        </div>

        {/* Aim mode indicator */}
        {isAiming && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-white/60 font-mono">
            ADS
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerHealthBar;
