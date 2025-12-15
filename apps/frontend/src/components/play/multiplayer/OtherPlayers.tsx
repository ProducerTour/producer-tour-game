import { useRef, useEffect, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import type { Player3D } from '../hooks/usePlayMultiplayer';
import { ANIMATION_CONFIG } from '../animations.config';

// Snapshot interpolation constants
const INTERPOLATION_DELAY = 100; // ms behind real-time for smooth interpolation
const MAX_BUFFER_SIZE = 20; // ~1 second of snapshots at 20Hz

interface PositionSnapshot {
  pos: THREE.Vector3;
  rot: number;
  time: number;
}

// Find two snapshots surrounding the target time for interpolation
function findSurroundingSnapshots(
  buffer: PositionSnapshot[],
  targetTime: number
): { p1: PositionSnapshot; p2: PositionSnapshot; t: number } | null {
  if (buffer.length < 2) return null;

  // Find the two snapshots that surround our target time
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i].time <= targetTime && buffer[i + 1].time >= targetTime) {
      const p1 = buffer[i];
      const p2 = buffer[i + 1];
      const timeDiff = p2.time - p1.time;
      const t = timeDiff > 0 ? (targetTime - p1.time) / timeDiff : 0;
      return { p1, p2, t: Math.max(0, Math.min(1, t)) };
    }
  }

  return null;
}

// Core animation URLs for other players (simplified set)
const CORE_ANIMATIONS = {
  idle: ANIMATION_CONFIG.idle.url,
  walking: ANIMATION_CONFIG.walking.url,
  running: ANIMATION_CONFIG.running.url,
};

// Animated RPM Avatar for other players
function AnimatedRPMAvatar({
  url,
  color,
  animationState = 'idle'
}: {
  url: string;
  color: string;
  animationState?: string;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  // Load core animations
  const idleGltf = useGLTF(CORE_ANIMATIONS.idle);
  const walkingGltf = useGLTF(CORE_ANIMATIONS.walking);
  const runningGltf = useGLTF(CORE_ANIMATIONS.running);

  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  // Combine all animations
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    const addAnim = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations.length > 0) {
        const clip = gltf.animations[0].clone();
        clip.name = name;
        anims.push(clip);
      }
    };

    addAnim(idleGltf, 'idle');
    addAnim(walkingGltf, 'walking');
    addAnim(runningGltf, 'running');

    return anims;
  }, [idleGltf.animations, walkingGltf.animations, runningGltf.animations]);

  const { actions } = useAnimations(animations, group);
  const currentAction = useRef<string>('idle');

  // Start with idle animation
  useEffect(() => {
    if (actions?.idle) {
      actions.idle.play();
    }
  }, [actions]);

  // Switch animations based on animationState
  useEffect(() => {
    if (!actions) return;

    // Map received animation state to available animations
    let targetAnim = 'idle';
    if (animationState.includes('running') || animationState.includes('Run')) {
      targetAnim = 'running';
    } else if (animationState.includes('walking') || animationState.includes('Walk') || animationState === 'crouchWalk') {
      targetAnim = 'walking';
    }

    if (targetAnim !== currentAction.current && actions[targetAnim]) {
      const prevAction = actions[currentAction.current];
      const nextAction = actions[targetAnim];

      if (prevAction && nextAction) {
        prevAction.fadeOut(0.15);
        nextAction.reset().fadeIn(0.15).play();
      } else if (nextAction) {
        nextAction.reset().play();
      }

      currentAction.current = targetAnim;
    }
  }, [animationState, actions]);

  return (
    <group ref={group}>
      <primitive object={clonedScene} position={[0, 0, 0]} />
      {/* Glow ring on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.4, 0.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// Fallback geometric avatar when no RPM model is available
function FallbackAvatar({ color }: { color: string }) {
  return (
    <group>
      {/* Glow ring on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.4, 0.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.6, 8, 16]} />
        <meshStandardMaterial color="#1a1a2e" emissive={color} emissiveIntensity={0.2} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>

      {/* Headphones */}
      <mesh position={[0, 1.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>

      {/* Point light for glow effect */}
      <pointLight position={[0, 1, 0]} intensity={0.3} color={color} distance={3} />
    </group>
  );
}

interface OtherPlayerProps {
  player: Player3D;
}

// Other Player - renders RPM avatar or fallback with snapshot interpolation
function OtherPlayer({ player }: OtherPlayerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Debug: log player avatar info on mount
  useEffect(() => {
    console.log(`👤 OtherPlayer ${player.username}: avatarUrl=${player.avatarUrl || 'none'}, anim=${player.animationState || 'none'}`);
  }, [player.username, player.avatarUrl, player.animationState]);

  const positionBuffer = useRef<PositionSnapshot[]>([]);
  const lastReceivedPos = useRef({ x: player.position.x, y: player.position.y, z: player.position.z });
  const lastReceivedRot = useRef(player.rotation.y);
  const interpolatedPos = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z));
  const interpolatedRot = useRef(player.rotation.y);

  // Track when player position changes and add to buffer
  useEffect(() => {
    const posChanged =
      player.position.x !== lastReceivedPos.current.x ||
      player.position.y !== lastReceivedPos.current.y ||
      player.position.z !== lastReceivedPos.current.z;

    if (posChanged) {
      // Add new snapshot to buffer
      positionBuffer.current.push({
        pos: new THREE.Vector3(player.position.x, player.position.y, player.position.z),
        rot: player.rotation.y,
        time: Date.now(),
      });

      // Trim buffer to max size
      if (positionBuffer.current.length > MAX_BUFFER_SIZE) {
        positionBuffer.current.shift();
      }

      lastReceivedPos.current = { ...player.position };
      lastReceivedRot.current = player.rotation.y;
    }
  }, [player.position.x, player.position.y, player.position.z, player.rotation.y]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const buffer = positionBuffer.current;
    const renderTime = Date.now() - INTERPOLATION_DELAY;

    // Clean old snapshots (older than 1 second)
    const cutoffTime = Date.now() - 1000;
    while (buffer.length > 0 && buffer[0].time < cutoffTime) {
      buffer.shift();
    }

    // Try to interpolate between buffered snapshots
    const snapshots = findSurroundingSnapshots(buffer, renderTime);

    if (snapshots) {
      // Interpolate position between two snapshots
      interpolatedPos.current.lerpVectors(snapshots.p1.pos, snapshots.p2.pos, snapshots.t);

      // Interpolate rotation (handling wrap-around)
      let rotDiff = snapshots.p2.rot - snapshots.p1.rot;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      interpolatedRot.current = snapshots.p1.rot + rotDiff * snapshots.t;
    } else if (buffer.length > 0) {
      // No surrounding snapshots - use latest available
      const latest = buffer[buffer.length - 1];
      interpolatedPos.current.copy(latest.pos);
      interpolatedRot.current = latest.rot;
    } else {
      // Empty buffer - use direct position (fallback)
      interpolatedPos.current.set(player.position.x, player.position.y, player.position.z);
      interpolatedRot.current = player.rotation.y;
    }

    // Smooth final application to prevent any remaining jitter
    const smoothingSpeed = 12;
    groupRef.current.position.lerp(interpolatedPos.current, 1 - Math.exp(-smoothingSpeed * delta));

    // Smooth rotation
    let finalRotDiff = interpolatedRot.current - groupRef.current.rotation.y;
    while (finalRotDiff > Math.PI) finalRotDiff -= Math.PI * 2;
    while (finalRotDiff < -Math.PI) finalRotDiff += Math.PI * 2;
    groupRef.current.rotation.y += finalRotDiff * Math.min(1, delta * smoothingSpeed);
  });

  return (
    <group ref={groupRef} position={[player.position.x, player.position.y, player.position.z]}>
      {/* Render animated RPM avatar if URL available, otherwise fallback */}
      {player.avatarUrl ? (
        <Suspense fallback={<FallbackAvatar color={player.color} />}>
          <AnimatedRPMAvatar
            url={player.avatarUrl}
            color={player.color}
            animationState={player.animationState}
          />
        </Suspense>
      ) : (
        <FallbackAvatar color={player.color} />
      )}

      {/* Username label */}
      <Billboard position={[0, 2.2, 0]}>
        <Text
          fontSize={0.18}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {player.username}
        </Text>
      </Billboard>
    </group>
  );
}

export interface OtherPlayersProps {
  players: Player3D[];
}

// Render all other players
export function OtherPlayers({ players }: OtherPlayersProps) {
  return (
    <>
      {players.map((player) => (
        <OtherPlayer key={player.id} player={player} />
      ))}
    </>
  );
}

// Preload core animations
useGLTF.preload(CORE_ANIMATIONS.idle);
useGLTF.preload(CORE_ANIMATIONS.walking);
useGLTF.preload(CORE_ANIMATIONS.running);
