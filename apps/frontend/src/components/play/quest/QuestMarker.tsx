/**
 * Quest Marker Component
 * 3D marker for quest objectives in the world
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { QuestObjective } from './useQuestStore';

interface QuestMarkerProps {
  objective: QuestObjective;
  questColor?: string;
  playerPosition?: { x: number; y: number; z: number };
}

export function QuestMarker({ objective, questColor = '#fbbf24', playerPosition }: QuestMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  const position = objective.position;
  if (!position) return null;

  // Calculate distance to player
  const distance = useMemo(() => {
    if (!playerPosition) return Infinity;
    const dx = position.x - playerPosition.x;
    const dz = position.z - playerPosition.z;
    return Math.sqrt(dx * dx + dz * dz);
  }, [position, playerPosition]);

  // Animate marker
  useFrame((state) => {
    if (!groupRef.current || !ringRef.current || !beamRef.current) return;

    const time = state.clock.elapsedTime;

    // Rotate ring
    ringRef.current.rotation.z = time * 2;

    // Pulse beam
    const pulse = 0.8 + Math.sin(time * 3) * 0.2;
    beamRef.current.scale.set(1, pulse, 1);

    // Bob up and down
    groupRef.current.position.y = position.y + 0.5 + Math.sin(time * 2) * 0.2;
  });

  // Scale based on distance
  const scale = useMemo(() => {
    if (distance < 10) return 1;
    if (distance < 30) return 1 + (distance - 10) * 0.02;
    return 1.4;
  }, [distance]);

  return (
    <group ref={groupRef} position={[position.x, position.y + 0.5, position.z]} scale={scale}>
      {/* Ground ring */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.4, 0]}
      >
        <ringGeometry args={[objective.radius || 2.5, (objective.radius || 2.5) + 0.3, 32]} />
        <meshBasicMaterial color={questColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Vertical beam */}
      <mesh ref={beamRef} position={[0, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.15, 5, 8]} />
        <meshBasicMaterial color={questColor} transparent opacity={0.6} />
      </mesh>

      {/* Floating diamond */}
      <mesh position={[0, 4.5, 0]}>
        <octahedronGeometry args={[0.4]} />
        <meshStandardMaterial
          color={questColor}
          emissive={questColor}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Point light */}
      <pointLight color={questColor} intensity={1} distance={10} position={[0, 2, 0]} />

      {/* Distance indicator */}
      {distance > 5 && (
        <Billboard position={[0, 5.5, 0]}>
          <Html center sprite distanceFactor={15}>
            <div
              className="pointer-events-none text-center"
              style={{
                color: questColor,
                textShadow: '0 0 10px black',
              }}
            >
              <div className="text-lg font-bold">{Math.round(distance)}m</div>
            </div>
          </Html>
        </Billboard>
      )}

      {/* Objective description when close */}
      {distance <= 15 && (
        <Html position={[0, 6, 0]} center sprite distanceFactor={10}>
          <div
            className="pointer-events-none text-center max-w-48 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: `${questColor}22`,
              border: `2px solid ${questColor}`,
              opacity: Math.max(0, 1 - (distance - 5) / 10),
            }}
          >
            <div className="text-white text-sm font-medium">{objective.description}</div>
            {objective.target !== undefined && (
              <div className="text-gray-300 text-xs mt-1">
                {objective.current || 0} / {objective.target}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// Minimap/compass direction indicator
interface QuestDirectionIndicatorProps {
  objective: QuestObjective;
  playerPosition: { x: number; y: number; z: number };
  playerRotation: number;
  questColor?: string;
}

export function QuestDirectionIndicator({
  objective,
  playerPosition,
  playerRotation,
  questColor = '#fbbf24',
}: QuestDirectionIndicatorProps) {
  const position = objective.position;
  if (!position) return null;

  // Calculate angle to objective
  const dx = position.x - playerPosition.x;
  const dz = position.z - playerPosition.z;
  const angleToObjective = Math.atan2(dx, dz);
  const relativeAngle = angleToObjective - playerRotation;

  // Calculate distance
  const distance = Math.sqrt(dx * dx + dz * dz);

  // Position on screen edge (compass style)
  const radius = 40; // Distance from center
  const indicatorX = Math.sin(relativeAngle) * radius;
  const indicatorY = -Math.cos(relativeAngle) * radius;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: '50%',
        left: '50%',
        transform: `translate(calc(-50% + ${indicatorX}vh), calc(-50% + ${indicatorY}vh))`,
      }}
    >
      <div
        className="w-4 h-4 rotate-45"
        style={{
          backgroundColor: questColor,
          boxShadow: `0 0 10px ${questColor}`,
          transform: `rotate(${relativeAngle}rad)`,
        }}
      />
      <div
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap"
        style={{ color: questColor }}
      >
        {Math.round(distance)}m
      </div>
    </div>
  );
}

export default QuestMarker;
