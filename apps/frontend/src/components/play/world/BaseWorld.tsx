import { useState, useRef, useEffect, useCallback, Suspense, ReactNode } from 'react';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Stars, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

import { PlaceholderAvatar, DefaultAvatar } from '../avatars';
import { OtherPlayers } from '../multiplayer';
import { usePlayMultiplayer } from '../hooks/usePlayMultiplayer';
import { PhysicsPlayerController } from '../PhysicsPlayerController';

export interface BaseWorldProps {
  /** Spawn position for the player */
  spawn: [number, number, number];
  /** Callback when player position changes */
  onPlayerPositionChange?: (pos: THREE.Vector3) => void;
  /** Callback when multiplayer is ready */
  onMultiplayerReady?: (data: { playerCount: number; isConnected: boolean }) => void;
  /** Map-specific content (ground, buildings, colliders, etc.) */
  children?: ReactNode;
  /** Ground size for the default collider (default: 500) */
  groundSize?: number;
  /** Custom fog settings */
  fog?: { color: string; near: number; far: number };
  /** Background color */
  backgroundColor?: string;
}

/**
 * BaseWorld - Core gameplay wrapper component for all maps
 *
 * Provides:
 * - Physics (Rapier)
 * - Player controller (PhysicsPlayerController)
 * - Avatar system with animation state
 * - Multiplayer
 * - Lighting & environment
 * - Contact shadows
 *
 * Maps provide their own:
 * - Ground visuals
 * - Buildings/props
 * - Custom colliders
 * - Zone markers
 */
export function BaseWorld({
  spawn,
  onPlayerPositionChange,
  onMultiplayerReady,
  children,
  groundSize = 500,
  fog = { color: '#0a0a0f', near: 30, far: 120 },
  backgroundColor = '#0a0a0f',
}: BaseWorldProps) {
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(...spawn));
  const playerRotation = useRef(new THREE.Euler());
  const [physicsDebug, setPhysicsDebug] = useState(false);

  // Physics debug toggle (F3 key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setPhysicsDebug(prev => {
          console.log(`🔧 Physics debug: ${!prev ? 'ON' : 'OFF'}`);
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Multiplayer
  const { otherPlayers, playerCount, isConnected, updatePosition } = usePlayMultiplayer({
    enabled: true,
  });

  // Notify parent of multiplayer status
  useEffect(() => {
    onMultiplayerReady?.({ playerCount, isConnected });
  }, [playerCount, isConnected, onMultiplayerReady]);

  const handlePositionChange = useCallback((pos: THREE.Vector3, rotation?: THREE.Euler) => {
    setPlayerPos(pos);
    if (rotation) {
      playerRotation.current.copy(rotation);
    }
    onPlayerPositionChange?.(pos);
    updatePosition(pos, playerRotation.current);
  }, [onPlayerPositionChange, updatePosition]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-15, 8, -15]} intensity={1} color="#8b5cf6" distance={30} />
      <pointLight position={[15, 8, -15]} intensity={1} color="#22c55e" distance={30} />
      <pointLight position={[0, 5, 5]} intensity={0.5} color="#8b5cf6" distance={20} />
      <hemisphereLight args={['#8b5cf6', '#0a0a0f', 0.3]} />

      {/* Environment */}
      <fog attach="fog" args={[fog.color, fog.near, fog.far]} />
      <color attach="background" args={[backgroundColor]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Physics World with Character Controller */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} timeStep={1/60} debug={physicsDebug}>
          {/* Default Ground Collider */}
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[groundSize / 2, 0.1, groundSize / 2]} position={[0, -0.1, 0]} />
          </RigidBody>

          {/* Map-specific content (ground, buildings, custom colliders) */}
          {children}

          {/* Physics Player Controller with animation state */}
          <PhysicsPlayerController onPositionChange={handlePositionChange}>
            {({ isMoving, isRunning }) => (
              <Suspense fallback={<PlaceholderAvatar isMoving={false} />}>
                <DefaultAvatar
                  isMoving={isMoving}
                  isRunning={isRunning}
                  isPlayer={true}
                />
              </Suspense>
            )}
          </PhysicsPlayerController>

          {/* Contact shadow - sits just above ground */}
          <ContactShadows
            position={[playerPos.x, 0.005, playerPos.z]}
            opacity={0.6}
            scale={10}
            blur={1.5}
            far={3}
            color="#8b5cf6"
          />
        </Physics>
      </Suspense>

      {/* Other Players (multiplayer) - outside physics for performance */}
      <OtherPlayers players={otherPlayers} />
    </>
  );
}
