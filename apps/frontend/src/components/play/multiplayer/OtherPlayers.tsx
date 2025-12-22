import { useRef, useEffect, useMemo, Suspense, useState, memo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import type { Player3D } from '../hooks/usePlayMultiplayer';
import { ANIMATION_CONFIG } from '../animations.config';
import { getPooledClipRPM } from '../avatars/AnimationClipPool';

// Debug logging - set to false to reduce console spam
const DEBUG_OTHER_PLAYERS = false;

// Render distance constants
const FULL_RENDER_DISTANCE = 30; // Full animated avatar within this range
const MAX_RENDER_DISTANCE = 100; // Don't render beyond this
const LOD_UPDATE_INTERVAL = 500; // Check distance every 500ms

// Snapshot interpolation constants
const INTERPOLATION_DELAY = 100;
const MAX_BUFFER_SIZE = 20;

interface PositionSnapshot {
  pos: THREE.Vector3;
  rot: number;
  time: number;
}

function findSurroundingSnapshots(
  buffer: PositionSnapshot[],
  targetTime: number
): { p1: PositionSnapshot; p2: PositionSnapshot; t: number } | null {
  if (buffer.length < 2) return null;

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

// All animations for other players
const ALL_ANIMATIONS = {
  // Core
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
  // NOTE: crouch+weapon animations not yet available on CDN
} as const;

const ONE_SHOT_ANIMATIONS = ['jump', 'jumpJog', 'jumpRun'];

// stripRootMotion is now handled by AnimationClipPool.getPooledClipRPM()

// Use local path in dev, R2 CDN in production
const MODELS_BASE = import.meta.env.DEV
  ? '/models'
  : `${import.meta.env.VITE_ASSETS_URL || ''}/models`;

// Weapon model paths - same as WeaponAttachment.tsx
const WEAPON_MODELS = {
  rifle: `${MODELS_BASE}/weapons/ak47fbx_gltf/scene.gltf`,
  pistol: `${MODELS_BASE}/weapons/pistolorange_gltf/scene.gltf`,
};

// Transforms matching local player's WeaponAttachment.tsx
const DEG_TO_RAD = Math.PI / 180;
const WEAPON_TRANSFORMS = {
  rifle: {
    position: [0.01, 0.23, 0.03] as [number, number, number],
    rotation: [89 * DEG_TO_RAD, -144 * DEG_TO_RAD, 85 * DEG_TO_RAD] as [number, number, number],
    scale: 1.1,
  },
  pistol: {
    position: [0.03, 0.08, 0.03] as [number, number, number],
    rotation: [20 * DEG_TO_RAD, 0, -90 * DEG_TO_RAD] as [number, number, number],
    scale: 1.8,
  },
};

// Weapon component for other players
// This component attaches the weapon directly to the bone (not via JSX)
// Returns null - weapon is added to scene graph via bone.add()
function OtherPlayerWeapon({
  weaponType,
  parentBone,
}: {
  weaponType: 'rifle' | 'pistol';
  parentBone: THREE.Bone;
}) {
  const { scene } = useGLTF(WEAPON_MODELS[weaponType]);
  const attachedWeapon = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!parentBone) {
      if (DEBUG_OTHER_PLAYERS) console.warn('[OtherPlayerWeapon] No parent bone provided');
      return;
    }

    // Clone the weapon scene
    const weaponClone = scene.clone(true);
    weaponClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.metalness = 0.8;
          mat.roughness = 0.3;
          mesh.material = mat;
        }
      }
    });

    // Apply transforms
    const transform = WEAPON_TRANSFORMS[weaponType];
    weaponClone.position.set(...transform.position);
    weaponClone.rotation.set(...transform.rotation);
    weaponClone.scale.setScalar(transform.scale);

    // Create a container and attach to bone
    const container = new THREE.Group();
    container.name = 'OtherPlayerWeaponContainer';
    container.add(weaponClone);
    parentBone.add(container);
    attachedWeapon.current = container;

    // Cleanup on unmount or weapon change
    return () => {
      if (attachedWeapon.current && attachedWeapon.current.parent) {
        attachedWeapon.current.parent.remove(attachedWeapon.current);
      }
      attachedWeapon.current = null;
    };
  }, [scene, weaponType, parentBone]);

  // This component doesn't render anything - weapon is added directly to bone
  return null;
}

// Full animated RPM Avatar for nearby players
function FullAnimatedAvatar({
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
  const idleGltf = useGLTF(ALL_ANIMATIONS.idle);
  const walkingGltf = useGLTF(ALL_ANIMATIONS.walking);
  const runningGltf = useGLTF(ALL_ANIMATIONS.running);
  const jumpGltf = useGLTF(ALL_ANIMATIONS.jump);
  const jumpJogGltf = useGLTF(ALL_ANIMATIONS.jumpJog);
  const jumpRunGltf = useGLTF(ALL_ANIMATIONS.jumpRun);
  const dance1Gltf = useGLTF(ALL_ANIMATIONS.dance1);
  const dance2Gltf = useGLTF(ALL_ANIMATIONS.dance2);
  const dance3Gltf = useGLTF(ALL_ANIMATIONS.dance3);
  const crouchIdleGltf = useGLTF(ALL_ANIMATIONS.crouchIdle);
  const crouchWalkGltf = useGLTF(ALL_ANIMATIONS.crouchWalk);
  const crouchStrafeLeftGltf = useGLTF(ALL_ANIMATIONS.crouchStrafeLeft);
  const crouchStrafeRightGltf = useGLTF(ALL_ANIMATIONS.crouchStrafeRight);
  const rifleIdleGltf = useGLTF(ALL_ANIMATIONS.rifleIdle);
  const rifleWalkGltf = useGLTF(ALL_ANIMATIONS.rifleWalk);
  const rifleRunGltf = useGLTF(ALL_ANIMATIONS.rifleRun);
  const pistolIdleGltf = useGLTF(ALL_ANIMATIONS.pistolIdle);
  const pistolWalkGltf = useGLTF(ALL_ANIMATIONS.pistolWalk);
  const pistolRunGltf = useGLTF(ALL_ANIMATIONS.pistolRun);

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

  // CRITICAL: Dispose cloned scene on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat) => mat.dispose());
          }
        }
      });
    };
  }, [clonedScene]);

  // Find RightHand bone for weapon attachment
  // RPM avatars use 'RightHand', Mixamo uses 'mixamorigRightHand'
  const rightHandBone = useMemo(() => {
    let hand: THREE.Bone | null = null;
    const possibleNames = ['RightHand', 'mixamorigRightHand', 'rightHand', 'Right_Hand', 'hand_r', 'hand.R'];

    // First check skeleton bones (RPM avatars store bones this way)
    clonedScene.traverse((child) => {
      if (hand) return;
      const skinnedMesh = child as THREE.SkinnedMesh;
      if (skinnedMesh.isSkinnedMesh && skinnedMesh.skeleton) {
        for (const bone of skinnedMesh.skeleton.bones) {
          if (hand) break;
          for (const name of possibleNames) {
            if (bone.name === name || bone.name.includes(name)) {
              hand = bone;
              break;
            }
          }
        }
      }
    });

    // Fallback: check direct bone children
    if (!hand) {
      clonedScene.traverse((child) => {
        if (hand) return;
        if (child instanceof THREE.Bone) {
          for (const name of possibleNames) {
            if (child.name === name || child.name.includes(name)) {
              hand = child;
              return;
            }
          }
        }
      });
    }

    return hand;
  }, [clonedScene]);

  // Use shared animation pool for clip reuse across all remote players
  // PERF: With 20 players, this saves ~50MB memory and +5-10 FPS
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    const addAnim = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations.length > 0) {
        // Use pooled clip instead of creating new one per player
        const clip = getPooledClipRPM(gltf.animations[0], name);
        anims.push(clip);
      }
    };

    addAnim(idleGltf, 'idle');
    addAnim(walkingGltf, 'walking');
    addAnim(runningGltf, 'running');
    addAnim(jumpGltf, 'jump');
    addAnim(jumpJogGltf, 'jumpJog');
    addAnim(jumpRunGltf, 'jumpRun');
    addAnim(dance1Gltf, 'dance1');
    addAnim(dance2Gltf, 'dance2');
    addAnim(dance3Gltf, 'dance3');
    addAnim(crouchIdleGltf, 'crouchIdle');
    addAnim(crouchWalkGltf, 'crouchWalk');
    addAnim(crouchStrafeLeftGltf, 'crouchStrafeLeft');
    addAnim(crouchStrafeRightGltf, 'crouchStrafeRight');
    addAnim(rifleIdleGltf, 'rifleIdle');
    addAnim(rifleWalkGltf, 'rifleWalk');
    addAnim(rifleRunGltf, 'rifleRun');
    addAnim(pistolIdleGltf, 'pistolIdle');
    addAnim(pistolWalkGltf, 'pistolWalk');
    addAnim(pistolRunGltf, 'pistolRun');

    return anims;
  }, [
    idleGltf.animations, walkingGltf.animations, runningGltf.animations,
    jumpGltf.animations, jumpJogGltf.animations, jumpRunGltf.animations,
    dance1Gltf.animations, dance2Gltf.animations, dance3Gltf.animations,
    crouchIdleGltf.animations, crouchWalkGltf.animations,
    crouchStrafeLeftGltf.animations, crouchStrafeRightGltf.animations,
    rifleIdleGltf.animations, rifleWalkGltf.animations, rifleRunGltf.animations,
    pistolIdleGltf.animations, pistolWalkGltf.animations, pistolRunGltf.animations,
  ]);

  const { actions } = useAnimations(animations, group);
  const currentAction = useRef<string>('idle');

  // Configure loop modes
  useEffect(() => {
    if (!actions) return;

    Object.entries(actions).forEach(([name, action]) => {
      if (action) {
        if (ONE_SHOT_ANIMATIONS.includes(name)) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        } else {
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

  // Switch animations
  useEffect(() => {
    if (!actions) return;

    // Direct mapping - use exact animation name if available
    let targetAnim = animationState;
    if (!actions[targetAnim]) {
      // Fallback mapping for animations not loaded
      if (targetAnim.includes('crouchRifle') || targetAnim.includes('crouchPistol')) {
        // Crouch+weapon → fallback to crouch
        if (targetAnim.includes('Walk')) {
          targetAnim = 'crouchWalk';
        } else {
          targetAnim = 'crouchIdle';
        }
      } else if (targetAnim.includes('Run') || targetAnim.includes('running')) {
        targetAnim = 'running';
      } else if (targetAnim.includes('Walk') || targetAnim.includes('walking')) {
        targetAnim = 'walking';
      } else if (targetAnim.includes('crouch')) {
        targetAnim = 'crouchIdle';
      } else {
        targetAnim = 'idle';
      }
    }

    if (targetAnim !== currentAction.current && actions[targetAnim]) {
      const prevAction = actions[currentAction.current];
      const nextAction = actions[targetAnim];

      // Use longer fade time for other players to smooth network jitter
      const fadeTime = 0.25;

      if (prevAction && nextAction) {
        prevAction.fadeOut(fadeTime);
        nextAction.reset().fadeIn(fadeTime).play();
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
      {weaponType && weaponType !== 'none' && rightHandBone && (
        <Suspense fallback={null}>
          <OtherPlayerWeapon weaponType={weaponType} parentBone={rightHandBone} />
        </Suspense>
      )}

      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.4, 0.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// Simple avatar for distant players (no animations loaded)
function SimpleAvatar({ color }: { color: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.4, 0.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.6, 8, 16]} />
        <meshStandardMaterial color="#1a1a2e" emissive={color} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 1.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 1, 0]} intensity={0.3} color={color} distance={3} />
    </group>
  );
}

interface OtherPlayerProps {
  player: Player3D;
}

// Memoized to prevent re-renders when other players update
const OtherPlayer = memo(function OtherPlayer({ player }: OtherPlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [lod, setLod] = useState<'full' | 'simple' | 'hidden'>('simple');
  const lastLodCheck = useRef(0);

  const positionBuffer = useRef<PositionSnapshot[]>([]);
  const lastReceivedPos = useRef({ x: player.position.x, y: player.position.y, z: player.position.z });
  const lastReceivedRot = useRef(player.rotation.y);
  const interpolatedPos = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z));
  const interpolatedRot = useRef(player.rotation.y);

  useEffect(() => {
    const posChanged =
      player.position.x !== lastReceivedPos.current.x ||
      player.position.y !== lastReceivedPos.current.y ||
      player.position.z !== lastReceivedPos.current.z;

    if (posChanged) {
      positionBuffer.current.push({
        pos: new THREE.Vector3(player.position.x, player.position.y, player.position.z),
        rot: player.rotation.y,
        time: Date.now(),
      });

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

    const cutoffTime = Date.now() - 1000;
    while (buffer.length > 0 && buffer[0].time < cutoffTime) {
      buffer.shift();
    }

    const snapshots = findSurroundingSnapshots(buffer, renderTime);

    if (snapshots) {
      interpolatedPos.current.lerpVectors(snapshots.p1.pos, snapshots.p2.pos, snapshots.t);
      let rotDiff = snapshots.p2.rot - snapshots.p1.rot;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      interpolatedRot.current = snapshots.p1.rot + rotDiff * snapshots.t;
    } else if (buffer.length > 0) {
      const latest = buffer[buffer.length - 1];
      interpolatedPos.current.copy(latest.pos);
      interpolatedRot.current = latest.rot;
    } else {
      interpolatedPos.current.set(player.position.x, player.position.y, player.position.z);
      interpolatedRot.current = player.rotation.y;
    }

    const smoothingSpeed = 12;
    groupRef.current.position.lerp(interpolatedPos.current, 1 - Math.exp(-smoothingSpeed * delta));

    let finalRotDiff = interpolatedRot.current - groupRef.current.rotation.y;
    while (finalRotDiff > Math.PI) finalRotDiff -= Math.PI * 2;
    while (finalRotDiff < -Math.PI) finalRotDiff += Math.PI * 2;
    groupRef.current.rotation.y += finalRotDiff * Math.min(1, delta * smoothingSpeed);

    // LOD check (throttled)
    const now = Date.now();
    if (now - lastLodCheck.current > LOD_UPDATE_INTERVAL) {
      lastLodCheck.current = now;
      const distance = camera.position.distanceTo(groupRef.current.position);

      if (distance > MAX_RENDER_DISTANCE) {
        setLod('hidden');
      } else if (distance > FULL_RENDER_DISTANCE) {
        setLod('simple');
      } else {
        setLod('full');
      }
    }
  });

  // Don't render if too far
  if (lod === 'hidden') return null;

  return (
    <group ref={groupRef} position={[player.position.x, player.position.y, player.position.z]}>
      {lod === 'full' && player.avatarUrl ? (
        <Suspense fallback={<SimpleAvatar color={player.color} />}>
          <FullAnimatedAvatar
            url={player.avatarUrl}
            color={player.color}
            animationState={player.animationState}
            weaponType={player.weaponType}
          />
        </Suspense>
      ) : (
        <SimpleAvatar color={player.color} />
      )}

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
}, (prevProps, nextProps) => {
  // Custom comparison to check if player data actually changed
  const prev = prevProps.player;
  const next = nextProps.player;
  return (
    prev.id === next.id &&
    prev.position.x === next.position.x &&
    prev.position.y === next.position.y &&
    prev.position.z === next.position.z &&
    prev.rotation.y === next.rotation.y &&
    prev.animationState === next.animationState &&
    prev.weaponType === next.weaponType &&
    prev.avatarUrl === next.avatarUrl &&
    prev.color === next.color
  );
});

export interface OtherPlayersProps {
  players: Player3D[];
}

export function OtherPlayers({ players }: OtherPlayersProps) {
  return (
    <>
      {players.map((player) => (
        <OtherPlayer key={player.id} player={player} />
      ))}
    </>
  );
}

// Preload all animations at module level
Object.values(ALL_ANIMATIONS).forEach(url => useGLTF.preload(url));

// Preload weapon models
useGLTF.preload(WEAPON_MODELS.rifle);
useGLTF.preload(WEAPON_MODELS.pistol);
