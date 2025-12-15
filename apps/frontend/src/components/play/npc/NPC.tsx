/**
 * NPC Component
 * Renders an NPC with basic AI behavior
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useNPCStore, type NPCData } from './useNPCStore';

// Movement speeds
const WALK_SPEED = 1.5;
const RUN_SPEED = 3.5;
const ROTATION_SPEED = 5;

// AI update interval (ms)
const AI_UPDATE_INTERVAL = 100;

interface NPCProps {
  data: NPCData;
  playerPosition?: { x: number; y: number; z: number };
  onInteract?: (npc: NPCData) => void;
  /** If true, NPC position is controlled by server - disable local AI */
  serverControlled?: boolean;
}

export function NPC({ data, playerPosition, onInteract, serverControlled = false }: NPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const lastAIUpdate = useRef(0);
  const currentTarget = useRef<{ x: number; z: number } | null>(null);
  const waitUntil = useRef(0);

  // For smooth interpolation when server-controlled
  const interpolatedPos = useRef({ x: data.position.x, y: data.position.y, z: data.position.z });
  const interpolatedRot = useRef(data.rotation);

  const { updateNPC, setNPCPosition, setNPCState } = useNPCStore();

  // NPC color based on type
  const color = useMemo(() => {
    switch (data.type) {
      case 'friendly':
        return '#22c55e';
      case 'hostile':
        return '#ef4444';
      default:
        return data.color || '#8b5cf6';
    }
  }, [data.type, data.color]);

  // Calculate distance to player
  const distanceToPlayer = useMemo(() => {
    if (!playerPosition) return Infinity;
    const dx = data.position.x - playerPosition.x;
    const dz = data.position.z - playerPosition.z;
    return Math.sqrt(dx * dx + dz * dz);
  }, [data.position, playerPosition]);

  // AI behavior logic
  useFrame((_, delta) => {
    if (!groupRef.current || data.state === 'dead') return;

    if (serverControlled) {
      // Server-controlled: smoothly interpolate to server position
      const lerpSpeed = 8;
      const t = 1 - Math.exp(-lerpSpeed * delta);

      interpolatedPos.current.x += (data.position.x - interpolatedPos.current.x) * t;
      interpolatedPos.current.y += (data.position.y - interpolatedPos.current.y) * t;
      interpolatedPos.current.z += (data.position.z - interpolatedPos.current.z) * t;

      // Interpolate rotation (handling wrap-around)
      let rotDiff = data.rotation - interpolatedRot.current;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      interpolatedRot.current += rotDiff * t;

      groupRef.current.position.set(
        interpolatedPos.current.x,
        interpolatedPos.current.y,
        interpolatedPos.current.z
      );
      groupRef.current.rotation.y = interpolatedRot.current;
    } else {
      // Local AI mode
      const now = Date.now();

      // Update AI at fixed intervals
      if (now - lastAIUpdate.current > AI_UPDATE_INTERVAL) {
        lastAIUpdate.current = now;
        updateAI();
      }

      // Move toward target
      if (currentTarget.current && now > waitUntil.current) {
        moveTowardTarget(delta);
      }

      // Always update visual position
      groupRef.current.position.set(data.position.x, data.position.y, data.position.z);
    }
  });

  // AI decision making
  const updateAI = () => {
    const now = Date.now();

    switch (data.behavior) {
      case 'idle':
        // Just stand there
        if (data.state !== 'idle') {
          setNPCState(data.id, 'idle');
        }
        currentTarget.current = null;
        break;

      case 'patrol':
        handlePatrolBehavior(now);
        break;

      case 'wander':
        handleWanderBehavior(now);
        break;

      case 'follow':
        handleFollowBehavior();
        break;

      case 'flee':
        handleFleeBehavior();
        break;

      case 'attack':
        handleAttackBehavior();
        break;
    }
  };

  // Patrol between points
  const handlePatrolBehavior = (now: number) => {
    if (!data.patrolPoints || data.patrolPoints.length === 0) return;

    const currentIndex = data.currentPatrolIndex ?? 0;
    const targetPoint = data.patrolPoints[currentIndex];

    // Check if we've reached the target
    const dx = data.position.x - targetPoint.x;
    const dz = data.position.z - targetPoint.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.5) {
      // Reached point, wait then move to next
      if (now < waitUntil.current) return;

      const waitTime = targetPoint.waitTime ?? 2000;
      waitUntil.current = now + waitTime;

      const nextIndex = (currentIndex + 1) % data.patrolPoints.length;
      updateNPC(data.id, { currentPatrolIndex: nextIndex });
      setNPCState(data.id, 'idle');
    } else {
      // Move to target
      currentTarget.current = { x: targetPoint.x, z: targetPoint.z };
      if (data.state !== 'walking') {
        setNPCState(data.id, 'walking');
      }
    }
  };

  // Random wandering
  const handleWanderBehavior = (now: number) => {
    if (now < waitUntil.current) return;

    if (!currentTarget.current || Math.random() < 0.01) {
      // Pick a new random point within 10 units
      const angle = Math.random() * Math.PI * 2;
      const distance = 3 + Math.random() * 7;
      currentTarget.current = {
        x: data.position.x + Math.cos(angle) * distance,
        z: data.position.z + Math.sin(angle) * distance,
      };
      setNPCState(data.id, 'walking');
    }

    // Check if reached target
    if (currentTarget.current) {
      const dx = data.position.x - currentTarget.current.x;
      const dz = data.position.z - currentTarget.current.z;
      if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
        currentTarget.current = null;
        waitUntil.current = now + 1000 + Math.random() * 3000;
        setNPCState(data.id, 'idle');
      }
    }
  };

  // Follow player
  const handleFollowBehavior = () => {
    if (!playerPosition) return;

    // Keep some distance from player
    const followDistance = 3;
    if (distanceToPlayer > followDistance + 0.5) {
      currentTarget.current = { x: playerPosition.x, z: playerPosition.z };
      setNPCState(data.id, distanceToPlayer > 8 ? 'running' : 'walking');
    } else if (distanceToPlayer < followDistance - 0.5) {
      // Too close, stop
      currentTarget.current = null;
      setNPCState(data.id, 'idle');
    }
  };

  // Flee from player
  const handleFleeBehavior = () => {
    if (!playerPosition || distanceToPlayer > 15) {
      setNPCState(data.id, 'idle');
      currentTarget.current = null;
      return;
    }

    // Run away from player
    const dx = data.position.x - playerPosition.x;
    const dz = data.position.z - playerPosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;

    currentTarget.current = {
      x: data.position.x + (dx / dist) * 10,
      z: data.position.z + (dz / dist) * 10,
    };
    setNPCState(data.id, 'running');
  };

  // Attack behavior (move toward player)
  const handleAttackBehavior = () => {
    if (!playerPosition) return;

    const attackRange = 2;
    if (distanceToPlayer > attackRange) {
      currentTarget.current = { x: playerPosition.x, z: playerPosition.z };
      setNPCState(data.id, 'running');
    } else {
      currentTarget.current = null;
      // TODO: Trigger attack animation/damage
    }
  };

  // Movement logic
  const moveTowardTarget = (delta: number) => {
    if (!currentTarget.current) return;

    const dx = currentTarget.current.x - data.position.x;
    const dz = currentTarget.current.z - data.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.1) {
      currentTarget.current = null;
      return;
    }

    // Calculate direction and speed
    const dirX = dx / distance;
    const dirZ = dz / distance;
    const speed = data.state === 'running' ? RUN_SPEED : WALK_SPEED;

    // Move
    const moveAmount = Math.min(speed * delta, distance);
    const newX = data.position.x + dirX * moveAmount;
    const newZ = data.position.z + dirZ * moveAmount;

    // Update position
    setNPCPosition(data.id, { x: newX, y: data.position.y, z: newZ });

    // Rotate to face direction
    const targetRotation = Math.atan2(dirX, dirZ);
    const currentRotation = data.rotation;
    let rotationDiff = targetRotation - currentRotation;

    // Normalize rotation difference
    while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
    while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

    const newRotation = currentRotation + rotationDiff * Math.min(1, ROTATION_SPEED * delta);
    updateNPC(data.id, { rotation: newRotation });
  };

  // Handle interaction
  const handleClick = () => {
    if (data.isInteractable && distanceToPlayer <= data.interactionRange) {
      onInteract?.(data);
    }
  };

  // Don't render dead NPCs (or render differently)
  if (data.state === 'dead') {
    return (
      <group ref={groupRef} position={[data.position.x, data.position.y, data.position.z]}>
        <mesh rotation={[Math.PI / 2, 0, data.rotation]} position={[0, 0.1, 0]}>
          <capsuleGeometry args={[0.3, 1, 8, 16]} />
          <meshStandardMaterial color="#333" transparent opacity={0.5} />
        </mesh>
      </group>
    );
  }

  return (
    <group
      ref={groupRef}
      position={[data.position.x, data.position.y, data.position.z]}
      rotation={[0, data.rotation, 0]}
      scale={data.scale ?? 1}
      userData={{ targetId: data.id }}
    >
      {/* NPC body */}
      <mesh
        ref={meshRef}
        position={[0, 0.9, 0]}
        onClick={handleClick}
        userData={{ targetId: data.id }}
      >
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={data.isInteractable && distanceToPlayer <= data.interactionRange ? 0.3 : 0.1}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Name label */}
      <Html position={[0, 2.2, 0]} center sprite distanceFactor={10}>
        <div
          className="pointer-events-none text-center"
          style={{
            opacity: distanceToPlayer < 15 ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        >
          <div
            className="text-white text-sm font-bold px-2 py-1 rounded"
            style={{
              backgroundColor: `${color}cc`,
              textShadow: '1px 1px 2px black',
            }}
          >
            {data.name}
          </div>
          {data.isInteractable && distanceToPlayer <= data.interactionRange && (
            <div className="text-yellow-300 text-xs mt-1 animate-pulse">
              [E] Interact
            </div>
          )}
        </div>
      </Html>

      {/* Glow effect for hostile NPCs */}
      {data.type === 'hostile' && (
        <pointLight color="#ef4444" intensity={0.5} distance={3} position={[0, 1, 0]} />
      )}
    </group>
  );
}

export default NPC;
