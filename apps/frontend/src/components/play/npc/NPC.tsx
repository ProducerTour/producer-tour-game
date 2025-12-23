/**
 * NPC Component
 * Renders an NPC with basic AI behavior, physics collision, and animated avatar support
 *
 * Features:
 * - Uses MixamoAnimatedAvatar when avatarUrl is provided (same as player)
 * - Falls back to simple capsule geometry if no avatar
 * - Physics collision via kinematic RigidBody
 * - AI behaviors: idle, patrol, wander, follow, flee, attack
 */

import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useNPCStore, type NPCData } from './useNPCStore';
import { MixamoAnimatedAvatar } from '../avatars';
import { useGamePause } from '../context';

/**
 * Static model component for NPCs without animations
 * Uses SkeletonUtils.clone for proper SkinnedMesh cloning
 */
function StaticModel({ url, scale = 1 }: { url: string; scale?: number }) {
  const gltf = useGLTF(url);

  const model = useMemo(() => {
    // For SkinnedMesh models, we need to use SkeletonUtils.clone
    // But since we may have multiple Three.js instances, let's just use the scene directly
    // and ensure materials render properly
    const scene = gltf.scene;

    // Setup meshes for rendering
    scene.traverse((child) => {
      if (child.type === 'SkinnedMesh' || child.type === 'Mesh') {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        // Ensure materials render properly
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => {
              (mat as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
              mat.needsUpdate = true;
            });
          } else {
            (mesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
            mesh.material.needsUpdate = true;
          }
        }
      }
    });

    return scene;
  }, [gltf]);

  // Calculate bounding box to position model with feet at ground level
  const yOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    return -box.min.y;
  }, [model]);

  return (
    <primitive object={model} scale={scale} position={[0, yOffset, 0]} />
  );
}

// Collider dimensions - same as player for consistent collision
const COLLIDER_HALF_HEIGHT = 0.55;
const COLLIDER_RADIUS = 0.3;
const COLLIDER_Y_OFFSET = 0.85;

// Movement speeds
const WALK_SPEED = 1.5;
const RUN_SPEED = 3.5;
const ROTATION_SPEED = 5;

// AI update interval (ms)
const AI_UPDATE_INTERVAL = 100;

// LOD distances - render simpler geometry when far away
const LOD_FULL_AVATAR_DISTANCE = 25; // Full avatar with animations (capsule beyond)

interface NPCProps {
  data: NPCData;
  playerPosition?: { x: number; y: number; z: number };
  onInteract?: (npc: NPCData) => void;
  /** If true, NPC position is controlled by server - disable local AI */
  serverControlled?: boolean;
  /** Enable physics collision (default: true) */
  enablePhysics?: boolean;
  /** Function to get terrain height at x,z position - for terrain following */
  getTerrainHeight?: (x: number, z: number) => number;
}

/**
 * Simple placeholder while avatar loads
 */
function NPCPlaceholder({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.9, 0]}>
      <capsuleGeometry args={[COLLIDER_RADIUS, 1, 8, 16]} />
      <meshStandardMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

export function NPC({ data, playerPosition, onInteract, serverControlled = false, enablePhysics = true, getTerrainHeight }: NPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const isPaused = useGamePause();
  const lastAIUpdate = useRef(0);
  const currentTarget = useRef<{ x: number; z: number } | null>(null);
  const waitUntil = useRef(0);

  // Local position ref - prevents store updates every frame during movement
  // Only syncs to store every POSITION_SYNC_INTERVAL ms
  const localPosition = useRef({ x: data.position.x, y: data.position.y, z: data.position.z });
  const localRotation = useRef(data.rotation);
  const lastPositionSync = useRef(0);
  const POSITION_SYNC_INTERVAL = 200; // Sync to store every 200ms


  // For smooth interpolation when server-controlled
  const interpolatedPos = useRef({ x: data.position.x, y: data.position.y, z: data.position.z });
  const interpolatedRot = useRef(data.rotation);

  // Use individual selectors to prevent re-renders on unrelated store changes
  const updateNPC = useNPCStore((s) => s.updateNPC);
  const setNPCPosition = useNPCStore((s) => s.setNPCPosition);
  const setNPCState = useNPCStore((s) => s.setNPCState);

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

  // Calculate distance to player - uses store position (synced periodically)
  // For real-time distance we'd use localPosition, but store position is good enough for AI decisions
  const distanceToPlayer = useMemo(() => {
    if (!playerPosition) return Infinity;
    // Use store position for distance - it's synced every 200ms which is fine for AI
    const dx = data.position.x - playerPosition.x;
    const dz = data.position.z - playerPosition.z;
    return Math.sqrt(dx * dx + dz * dz);
  }, [data.position, playerPosition]);

  // Map NPC state to animation props for MixamoAnimatedAvatar
  const animationProps = useMemo(() => {
    const isDying = data.state === 'dead';
    const isMoving = !isDying && (data.state === 'walking' || data.state === 'running');
    const isRunning = !isDying && data.state === 'running';

    return {
      isMoving,
      isRunning,
      isGrounded: true, // NPCs are always grounded for now
      isJumping: false,
      isFalling: false,
      isLanding: false,
      isDancing: false,
      isCrouching: false,
      isStrafingLeft: false,
      isStrafingRight: false,
      isAiming: false,
      isFiring: false,
      isDying, // Death animation trigger
      velocityY: 0,
      weaponType: null, // No weapon equipped
    };
  }, [data.state]);

  // AI behavior logic (skip when paused for performance)
  useFrame((_, delta) => {
    if (isPaused || !groupRef.current || data.state === 'dead') return;

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

      // Update position based on physics mode
      if (enablePhysics && rigidBodyRef.current) {
        // For physics-enabled, update the kinematic rigidbody
        rigidBodyRef.current.setNextKinematicTranslation(interpolatedPos.current);
      } else if (groupRef.current) {
        // For non-physics, update group position directly
        groupRef.current.position.set(
          interpolatedPos.current.x,
          interpolatedPos.current.y,
          interpolatedPos.current.z
        );
      }
      if (groupRef.current) {
        groupRef.current.rotation.y = interpolatedRot.current;
      }
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

      // Update position based on physics mode - use local refs for smooth movement
      if (enablePhysics && rigidBodyRef.current) {
        // For physics-enabled NPCs, update the kinematic rigidbody with local position
        rigidBodyRef.current.setNextKinematicTranslation(localPosition.current);
      } else {
        // For non-physics NPCs, update group position directly with local position
        groupRef.current.position.set(
          localPosition.current.x,
          localPosition.current.y,
          localPosition.current.z
        );
      }

      // Update rotation from local ref
      if (groupRef.current) {
        groupRef.current.rotation.y = localRotation.current;
      }
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

  // Movement logic - uses local refs, syncs to store periodically
  const moveTowardTarget = (delta: number) => {
    if (!currentTarget.current) return;

    // Use local position for calculations (not store position)
    const dx = currentTarget.current.x - localPosition.current.x;
    const dz = currentTarget.current.z - localPosition.current.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.1) {
      currentTarget.current = null;
      return;
    }

    // Calculate direction and speed
    const dirX = dx / distance;
    const dirZ = dz / distance;
    const speed = data.state === 'running' ? RUN_SPEED : WALK_SPEED;

    // Move - update local refs (not store)
    const moveAmount = Math.min(speed * delta, distance);
    localPosition.current.x += dirX * moveAmount;
    localPosition.current.z += dirZ * moveAmount;

    // Sample terrain height at new position for terrain following
    if (getTerrainHeight) {
      localPosition.current.y = getTerrainHeight(localPosition.current.x, localPosition.current.z);
    }

    // Rotate to face direction - update local ref
    const targetRotation = Math.atan2(dirX, dirZ);
    let rotationDiff = targetRotation - localRotation.current;

    // Normalize rotation difference
    while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
    while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

    localRotation.current += rotationDiff * Math.min(1, ROTATION_SPEED * delta);

    // Sync to store periodically (for other systems that need position)
    const now = Date.now();
    if (now - lastPositionSync.current > POSITION_SYNC_INTERVAL) {
      lastPositionSync.current = now;
      setNPCPosition(data.id, { ...localPosition.current });
      updateNPC(data.id, { rotation: localRotation.current });
    }
  };

  // Handle interaction
  const handleClick = () => {
    if (data.isInteractable && distanceToPlayer <= data.interactionRange) {
      onInteract?.(data);
    }
  };

  // Check if NPC is dead (used to disable physics and hide interaction prompts)
  const isDead = data.state === 'dead';

  // Render NPC body with LOD - simpler geometry when far away
  const renderBody = () => {
    // LOD: Use simple capsule when far from player (saves GPU/CPU)
    // This skips expensive avatar loading, animation, and Suspense overhead
    if (distanceToPlayer > LOD_FULL_AVATAR_DISTANCE) {
      // LOD1: Simple capsule for distant NPCs
      return (
        <>
          <mesh
            ref={meshRef}
            position={[0, 0.9, 0]}
            onClick={handleClick}
            userData={{ targetId: data.id }}
          >
            {/* Reduced geometry for distant NPCs: 4 segments instead of 8/16 */}
            <capsuleGeometry args={[COLLIDER_RADIUS, 1, 4, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh position={[0, 1.7, 0]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </>
      );
    }

    // LOD0: Full detail for nearby NPCs

    // Priority 1: Animated GLB model with Mixamo rig
    // These models keep the 'mixamorig:' prefix on bone names
    if (data.modelUrl && data.animated) {
      return (
        <Suspense fallback={<NPCPlaceholder color={color} />}>
          <MixamoAnimatedAvatar
            url={data.modelUrl}
            keepMixamoPrefix={true}
            {...animationProps}
          />
        </Suspense>
      );
    }

    // Priority 2: Static GLB model (no animations)
    if (data.modelUrl) {
      return (
        <Suspense fallback={<NPCPlaceholder color={color} />}>
          <StaticModel url={data.modelUrl} scale={data.scale ?? 1} />
        </Suspense>
      );
    }

    // Priority 3: Mixamo-animated RPM avatar
    if (data.avatarUrl) {
      return (
        <Suspense fallback={<NPCPlaceholder color={color} />}>
          <MixamoAnimatedAvatar
            url={data.avatarUrl}
            {...animationProps}
          />
        </Suspense>
      );
    }

    // Fallback: simple capsule body (for NPCs with no avatar defined)
    return (
      <>
        <mesh
          ref={meshRef}
          position={[0, 0.9, 0]}
          onClick={handleClick}
          userData={{ targetId: data.id }}
        >
          <capsuleGeometry args={[COLLIDER_RADIUS, 1, 8, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={data.isInteractable && distanceToPlayer <= data.interactionRange ? 0.3 : 0.1}
          />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </>
    );
  };

  // Inner content (body + label + effects)
  const innerContent = (
    <>
      {/* NPC body (avatar or capsule) */}
      <group rotation={[0, data.rotation, 0]}>
        {renderBody()}
      </group>

      {/* Name label - hide when dead */}
      {!isDead && (
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
      )}

      {/* Glow effect for hostile NPCs - disable when dead */}
      {data.type === 'hostile' && !isDead && (
        <pointLight color="#ef4444" intensity={0.5} distance={3} position={[0, 1, 0]} />
      )}
    </>
  );

  // With physics collision (disabled when dead so player can walk through)
  if (enablePhysics && !isDead) {
    return (
      <RigidBody
        ref={rigidBodyRef}
        type="kinematicPosition"
        position={[data.position.x, data.position.y, data.position.z]}
        colliders={false}
        name={`npc-${data.id}`}
      >
        {/* Physics collider - same dimensions as player */}
        <CapsuleCollider
          args={[COLLIDER_HALF_HEIGHT, COLLIDER_RADIUS]}
          position={[0, COLLIDER_Y_OFFSET, 0]}
        />

        <group
          ref={groupRef}
          scale={data.scale ?? 1}
          userData={{ targetId: data.id }}
        >
          {innerContent}
        </group>
      </RigidBody>
    );
  }

  // Without physics (legacy behavior)
  return (
    <group
      ref={groupRef}
      position={[data.position.x, data.position.y, data.position.z]}
      scale={data.scale ?? 1}
      userData={{ targetId: data.id }}
    >
      {innerContent}
    </group>
  );
}

export default NPC;
