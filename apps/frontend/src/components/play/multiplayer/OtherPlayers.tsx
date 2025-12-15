import { useRef, useEffect, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, useGLTF, useAnimations, useFBX } from '@react-three/drei';
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

// All animations to load for other players (comprehensive set)
const ANIMATIONS_TO_LOAD = {
  // Core locomotion
  idle: ANIMATION_CONFIG.idle.url,
  walking: ANIMATION_CONFIG.walking.url,
  running: ANIMATION_CONFIG.running.url,
  // Jumps
  jump: ANIMATION_CONFIG.jump.url,
  jumpJog: ANIMATION_CONFIG.jumpJog.url,
  jumpRun: ANIMATION_CONFIG.jumpRun.url,
  // Dance
  dance1: ANIMATION_CONFIG.dance1.url,
  dance2: ANIMATION_CONFIG.dance2.url,
  dance3: ANIMATION_CONFIG.dance3.url,
  // Crouch
  crouchIdle: ANIMATION_CONFIG.crouchIdle.url,
  crouchWalk: ANIMATION_CONFIG.crouchWalk.url,
  crouchStrafeLeft: ANIMATION_CONFIG.crouchStrafeLeft.url,
  crouchStrafeRight: ANIMATION_CONFIG.crouchStrafeRight.url,
  // Weapons - Rifle
  rifleIdle: ANIMATION_CONFIG.rifleIdle.url,
  rifleWalk: ANIMATION_CONFIG.rifleWalk.url,
  rifleRun: ANIMATION_CONFIG.rifleRun.url,
  // Weapons - Pistol
  pistolIdle: ANIMATION_CONFIG.pistolIdle.url,
  pistolWalk: ANIMATION_CONFIG.pistolWalk.url,
  pistolRun: ANIMATION_CONFIG.pistolRun.url,
  // Crouch + Weapons
  crouchRifleIdle: ANIMATION_CONFIG.crouchRifleIdle.url,
  crouchRifleWalk: ANIMATION_CONFIG.crouchRifleWalk.url,
  crouchPistolIdle: ANIMATION_CONFIG.crouchPistolIdle.url,
  crouchPistolWalk: ANIMATION_CONFIG.crouchPistolWalk.url,
} as const;

// One-shot animations that should play once and hold
const ONE_SHOT_ANIMATIONS = ['jump', 'jumpJog', 'jumpRun'];

// Weapon model paths
const WEAPON_MODELS = {
  rifle: '/models/weapons/ak47.fbx',
  pistol: '/models/weapons/orange.fbx',
};

// Weapon transforms (from WeaponAttachment.tsx)
const WEAPON_TRANSFORMS = {
  rifle: {
    position: [0.01, 0.23, 0.03] as [number, number, number],
    rotation: [89 * (Math.PI / 180), -144 * (Math.PI / 180), 85 * (Math.PI / 180)] as [number, number, number],
    scale: 1,
  },
  pistol: {
    position: [0, 0.07, 0.05] as [number, number, number],
    rotation: [0, -3 * (Math.PI / 180), -90 * (Math.PI / 180)] as [number, number, number],
    scale: 1,
  },
};

// Weapon component for other players
function OtherPlayerWeapon({
  weaponType,
  parentBone,
}: {
  weaponType: 'rifle' | 'pistol';
  parentBone: THREE.Bone;
}) {
  const weaponRef = useRef<THREE.Group>(null);
  const fbx = useFBX(WEAPON_MODELS[weaponType]);

  const clonedWeapon = useMemo(() => {
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        // Darken the weapon material a bit
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.metalness = 0.8;
          mat.roughness = 0.3;
          mesh.material = mat;
        }
      }
    });
    return clone;
  }, [fbx]);

  const transform = WEAPON_TRANSFORMS[weaponType];

  // Attach to parent bone each frame
  useFrame(() => {
    if (weaponRef.current && parentBone) {
      // Get world matrix of the hand bone
      parentBone.updateWorldMatrix(true, false);

      // Apply the transform relative to the bone
      weaponRef.current.position.set(...transform.position);
      weaponRef.current.rotation.set(...transform.rotation);
      weaponRef.current.scale.setScalar(transform.scale);

      // Parent to bone
      parentBone.add(weaponRef.current);
    }
  });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (weaponRef.current && weaponRef.current.parent) {
        weaponRef.current.parent.remove(weaponRef.current);
      }
    };
  }, []);

  return <primitive ref={weaponRef} object={clonedWeapon} />;
}

// Animated RPM Avatar for other players
function AnimatedRPMAvatar({
  url,
  color,
  animationState = 'idle',
  weaponType = 'none',
}: {
  url: string;
  color: string;
  animationState?: string;
  weaponType?: 'none' | 'rifle' | 'pistol';
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  // Load all animations
  const idleGltf = useGLTF(ANIMATIONS_TO_LOAD.idle);
  const walkingGltf = useGLTF(ANIMATIONS_TO_LOAD.walking);
  const runningGltf = useGLTF(ANIMATIONS_TO_LOAD.running);
  const jumpGltf = useGLTF(ANIMATIONS_TO_LOAD.jump);
  const jumpJogGltf = useGLTF(ANIMATIONS_TO_LOAD.jumpJog);
  const jumpRunGltf = useGLTF(ANIMATIONS_TO_LOAD.jumpRun);
  const dance1Gltf = useGLTF(ANIMATIONS_TO_LOAD.dance1);
  const dance2Gltf = useGLTF(ANIMATIONS_TO_LOAD.dance2);
  const dance3Gltf = useGLTF(ANIMATIONS_TO_LOAD.dance3);
  const crouchIdleGltf = useGLTF(ANIMATIONS_TO_LOAD.crouchIdle);
  const crouchWalkGltf = useGLTF(ANIMATIONS_TO_LOAD.crouchWalk);
  const crouchStrafeLeftGltf = useGLTF(ANIMATIONS_TO_LOAD.crouchStrafeLeft);
  const crouchStrafeRightGltf = useGLTF(ANIMATIONS_TO_LOAD.crouchStrafeRight);
  const rifleIdleGltf = useGLTF(ANIMATIONS_TO_LOAD.rifleIdle);
  const rifleWalkGltf = useGLTF(ANIMATIONS_TO_LOAD.rifleWalk);
  const rifleRunGltf = useGLTF(ANIMATIONS_TO_LOAD.rifleRun);
  const pistolIdleGltf = useGLTF(ANIMATIONS_TO_LOAD.pistolIdle);
  const pistolWalkGltf = useGLTF(ANIMATIONS_TO_LOAD.pistolWalk);
  const pistolRunGltf = useGLTF(ANIMATIONS_TO_LOAD.pistolRun);
  const crouchRifleIdleGltf = useGLTF(ANIMATIONS_TO_LOAD.crouchRifleIdle);
  const crouchRifleWalkGltf = useGLTF(ANIMATIONS_TO_LOAD.crouchRifleWalk);
  const crouchPistolIdleGltf = useGLTF(ANIMATIONS_TO_LOAD.crouchPistolIdle);
  const crouchPistolWalkGltf = useGLTF(ANIMATIONS_TO_LOAD.crouchPistolWalk);

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

  // Find RightHand bone for weapon attachment
  const rightHandBone = useMemo(() => {
    let hand: THREE.Bone | null = null;
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Bone && child.name === 'RightHand') {
        hand = child;
      }
    });
    return hand;
  }, [clonedScene]);

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

    // Core
    addAnim(idleGltf, 'idle');
    addAnim(walkingGltf, 'walking');
    addAnim(runningGltf, 'running');
    // Jumps
    addAnim(jumpGltf, 'jump');
    addAnim(jumpJogGltf, 'jumpJog');
    addAnim(jumpRunGltf, 'jumpRun');
    // Dances
    addAnim(dance1Gltf, 'dance1');
    addAnim(dance2Gltf, 'dance2');
    addAnim(dance3Gltf, 'dance3');
    // Crouch
    addAnim(crouchIdleGltf, 'crouchIdle');
    addAnim(crouchWalkGltf, 'crouchWalk');
    addAnim(crouchStrafeLeftGltf, 'crouchStrafeLeft');
    addAnim(crouchStrafeRightGltf, 'crouchStrafeRight');
    // Weapons
    addAnim(rifleIdleGltf, 'rifleIdle');
    addAnim(rifleWalkGltf, 'rifleWalk');
    addAnim(rifleRunGltf, 'rifleRun');
    addAnim(pistolIdleGltf, 'pistolIdle');
    addAnim(pistolWalkGltf, 'pistolWalk');
    addAnim(pistolRunGltf, 'pistolRun');
    // Crouch + Weapons
    addAnim(crouchRifleIdleGltf, 'crouchRifleIdle');
    addAnim(crouchRifleWalkGltf, 'crouchRifleWalk');
    addAnim(crouchPistolIdleGltf, 'crouchPistolIdle');
    addAnim(crouchPistolWalkGltf, 'crouchPistolWalk');

    return anims;
  }, [
    idleGltf.animations, walkingGltf.animations, runningGltf.animations,
    jumpGltf.animations, jumpJogGltf.animations, jumpRunGltf.animations,
    dance1Gltf.animations, dance2Gltf.animations, dance3Gltf.animations,
    crouchIdleGltf.animations, crouchWalkGltf.animations,
    crouchStrafeLeftGltf.animations, crouchStrafeRightGltf.animations,
    rifleIdleGltf.animations, rifleWalkGltf.animations, rifleRunGltf.animations,
    pistolIdleGltf.animations, pistolWalkGltf.animations, pistolRunGltf.animations,
    crouchRifleIdleGltf.animations, crouchRifleWalkGltf.animations,
    crouchPistolIdleGltf.animations, crouchPistolWalkGltf.animations,
  ]);

  const { actions } = useAnimations(animations, group);
  const currentAction = useRef<string>('idle');

  // Configure loop modes for all animations
  useEffect(() => {
    if (!actions) return;

    Object.entries(actions).forEach(([name, action]) => {
      if (action) {
        if (ONE_SHOT_ANIMATIONS.includes(name)) {
          // One-shot animations play once and hold final frame
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        } else {
          // Looping animations
          action.setLoop(THREE.LoopRepeat, Infinity);
        }
      }
    });
  }, [actions]);

  // Start with idle animation
  useEffect(() => {
    if (actions?.idle) {
      actions.idle.play();
    }
  }, [actions]);

  // Switch animations based on animationState
  useEffect(() => {
    if (!actions) return;

    // Direct mapping - use the exact animation name sent from server
    // Fall back to idle if animation doesn't exist
    let targetAnim = animationState;
    if (!actions[targetAnim]) {
      // Fallback logic
      if (targetAnim.includes('Run') || targetAnim.includes('running')) {
        targetAnim = 'running';
      } else if (targetAnim.includes('Walk') || targetAnim.includes('walking')) {
        targetAnim = 'walking';
      } else {
        targetAnim = 'idle';
      }
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

      {/* Weapon attachment */}
      {weaponType !== 'none' && rightHandBone && (
        <Suspense fallback={null}>
          <OtherPlayerWeapon weaponType={weaponType} parentBone={rightHandBone} />
        </Suspense>
      )}

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
    console.log(`👤 OtherPlayer ${player.username}: avatarUrl=${player.avatarUrl || 'none'}, anim=${player.animationState || 'none'}, weapon=${player.weaponType || 'none'}`);
  }, [player.username, player.avatarUrl, player.animationState, player.weaponType]);

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
            weaponType={player.weaponType}
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

// Preload all animations
Object.values(ANIMATIONS_TO_LOAD).forEach(url => useGLTF.preload(url));

// Preload weapon models
Object.values(WEAPON_MODELS).forEach(path => useFBX.preload(path));
