/**
 * Damage Numbers Component
 * Renders floating damage numbers that rise and fade
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useCombatStore } from './useCombatStore';

interface DamageNumberProps {
  id: string;
  value: number;
  position: { x: number; y: number; z: number };
  isCritical: boolean;
  createdAt: number;
}

function DamageNumber({ value, position, isCritical, createdAt }: DamageNumberProps) {
  const ref = useRef<THREE.Group>(null);
  const startY = useRef(position.y);

  // Random horizontal offset for variety
  const offset = useMemo(
    () => ({
      x: (Math.random() - 0.5) * 0.5,
      z: (Math.random() - 0.5) * 0.5,
    }),
    []
  );

  useFrame(() => {
    if (!ref.current) return;

    const age = Date.now() - createdAt;
    const progress = Math.min(age / 1500, 1);

    // Rise up
    ref.current.position.y = startY.current + progress * 2;

    // Slight horizontal drift
    ref.current.position.x = position.x + offset.x * progress;
    ref.current.position.z = position.z + offset.z * progress;
  });

  const age = Date.now() - createdAt;
  const opacity = Math.max(0, 1 - age / 1500);
  const scale = isCritical ? 1.5 : 1;

  return (
    <group ref={ref} position={[position.x, position.y, position.z]}>
      <Html center sprite>
        <div
          style={{
            fontSize: `${16 * scale}px`,
            fontWeight: 'bold',
            color: isCritical ? '#fbbf24' : '#ef4444',
            textShadow: isCritical
              ? '0 0 10px #fbbf24, 0 0 20px #f59e0b, 2px 2px 0 #000'
              : '2px 2px 0 #000, -1px -1px 0 #000',
            opacity,
            transform: `scale(${1 + (1 - opacity) * 0.5})`,
            transition: 'transform 0.1s',
            pointerEvents: 'none',
            userSelect: 'none',
            fontFamily: 'monospace',
          }}
        >
          {isCritical && '! '}
          {value}
          {isCritical && ' !'}
        </div>
      </Html>
    </group>
  );
}

export function DamageNumbers() {
  const damageNumbers = useCombatStore((state) => state.damageNumbers);

  return (
    <group name="DamageNumbers">
      {damageNumbers.map((dmg) => (
        <DamageNumber
          key={dmg.id}
          id={dmg.id}
          value={dmg.value}
          position={dmg.position}
          isCritical={dmg.isCritical}
          createdAt={dmg.createdAt}
        />
      ))}
    </group>
  );
}

export default DamageNumbers;
