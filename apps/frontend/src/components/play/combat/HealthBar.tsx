/**
 * World Health Bar Component
 * 3D health bar that appears above NPCs/targets in the game world
 */

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { type CombatTarget } from './useCombatStore';

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

export default WorldHealthBar;
