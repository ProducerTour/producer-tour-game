import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface PlaceholderAvatarProps {
  isMoving?: boolean;
}

// Simple placeholder avatar when no RPM avatar is loaded
export function PlaceholderAvatar({ isMoving = false }: PlaceholderAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (isMoving) {
      phase.current += delta * 10;
      groupRef.current.position.y = Math.abs(Math.sin(phase.current)) * 0.08;
    } else {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.03;
      phase.current = 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.5, 0.8, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.35} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.6, 8, 16]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#8b5cf6" emissiveIntensity={0.1} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.2} />
      </mesh>

      {/* Headphones */}
      <mesh position={[0, 1.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
