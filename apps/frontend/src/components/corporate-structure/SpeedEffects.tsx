import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpeedEffectsProps {
  shipPosition: THREE.Vector3;
  shipRotation: THREE.Euler;
  velocity: number; // Speed magnitude
  isActive: boolean;
}

// Individual speed streak
function SpeedStreak({
  shipPosition,
  shipRotation,
  velocity,
  baseOffset
}: {
  shipPosition: THREE.Vector3;
  shipRotation: THREE.Euler;
  velocity: number;
  baseOffset: THREE.Vector3;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;

    // Only show when moving fast enough
    const minVelocity = 0.5;
    const maxVelocity = 3.0;
    const normalizedVelocity = Math.min(1, Math.max(0, (velocity - minVelocity) / (maxVelocity - minVelocity)));

    if (velocity < minVelocity) {
      materialRef.current.opacity = 0;
      return;
    }

    // Calculate position relative to ship
    const rotatedOffset = baseOffset.clone().applyEuler(shipRotation);
    meshRef.current.position.copy(shipPosition).add(rotatedOffset);

    // Rotate streak to face ship direction
    meshRef.current.rotation.copy(shipRotation);

    // Scale streak length based on velocity
    const streakLength = 2 + normalizedVelocity * 8;
    meshRef.current.scale.set(0.02, 0.02, streakLength);

    // Opacity based on velocity
    materialRef.current.opacity = normalizedVelocity * 0.4;
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#a5b4fc"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

export function SpeedEffects({ shipPosition, shipRotation, velocity, isActive }: SpeedEffectsProps) {
  // Generate streak offsets around the ship
  const streakOffsets = useMemo(() => {
    const offsets: THREE.Vector3[] = [];
    const numStreaks = 24;
    const radius = 3;

    for (let i = 0; i < numStreaks; i++) {
      const angle = (i / numStreaks) * Math.PI * 2;
      const randomRadius = radius + (Math.random() - 0.5) * 2;
      const randomZ = -5 + Math.random() * 3; // Behind the ship

      offsets.push(new THREE.Vector3(
        Math.cos(angle) * randomRadius,
        Math.sin(angle) * randomRadius,
        randomZ
      ));
    }
    return offsets;
  }, []);

  if (!isActive) return null;

  return (
    <group>
      {streakOffsets.map((offset, i) => (
        <SpeedStreak
          key={i}
          shipPosition={shipPosition}
          shipRotation={shipRotation}
          velocity={velocity}
          baseOffset={offset}
        />
      ))}
    </group>
  );
}

export default SpeedEffects;
