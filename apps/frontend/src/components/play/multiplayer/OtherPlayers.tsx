import { useRef, useEffect, useMemo, Suspense, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text, useGLTF, useAnimations, useFBX } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import type { Player3D } from '../hooks/usePlayMultiplayer';
import { ANIMATION_CONFIG, isMixamoAnimation } from '../animations.config';

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

/**
 * Strip root motion, scale tracks, and remap bone names from Mixamo format
 * This prevents the "giant player" bug from Mixamo animations
 */
function stripRootMotion(clip: THREE.AnimationClip, clipName: string): THREE.AnimationClip {
  const newClip = clip.clone();
  const isMixamoAnim = isMixamoAnimation(clipName);

  // Process tracks: remap bone names and filter problematic tracks
  newClip.tracks = newClip.tracks
    .map(track => {
      let newName = track.name;

      // Remove armature prefix if present
      if (newName.includes('|')) {
        newName = newName.split('|').pop() || newName;
      }

      // Remove mixamorig variants (with colon, without, numbered)
      newName = newName.replace(/mixamorig\d*:/g, '');
      newName = newName.replace(/^mixamorig(\d*)([A-Z])/g, '$2');

      if (newName !== track.name) {
        const newTrack = track.clone();
        newTrack.name = newName;
        return newTrack;
      }
      return track;
    })
    .filter(track => {
      if (isMixamoAnim) {
        // For Mixamo: keep only quaternion (rotation) tracks
        // Remove position and scale tracks to prevent drift/glitching
        if (!track.name.endsWith('.quaternion')) {
          return false;
        }
        return true;
      }

      // For regular animations: keep rotations and non-Hips positions
      if (!track.name.endsWith('.quaternion')) {
        if (track.name.endsWith('.position') && !track.name.includes('Hips')) {
          return true;
        }
        return false;
      }
      return true;
    });

  return newClip;
}

// Weapon model paths
const WEAPON_MODELS = {
  rifle: '/models/weapons/ak47.fbx',
  pistol: '/models/weapons/orange.fbx',
};

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

  useFrame(() => {
    if (weaponRef.current && parentBone) {
      parentBone.updateWorldMatrix(true, false);
      weaponRef.current.position.set(...transform.position);
      weaponRef.current.rotation.set(...transform.rotation);
      weaponRef.current.scale.setScalar(transform.scale);
      parentBone.add(weaponRef.current);
    }
  });

  useEffect(() => {
    return () => {
      if (weaponRef.current && weaponRef.current.parent) {
        weaponRef.current.parent.remove(weaponRef.current);
      }
    };
  }, []);

  return <primitive ref={weaponRef} object={clonedWeapon} />;
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

  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    const addAnim = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations.length > 0) {
        // Apply stripRootMotion to fix Mixamo scale/position track issues
        const clip = stripRootMotion(gltf.animations[0], name);
        clip.name = name;
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

function OtherPlayer({ player }: OtherPlayerProps) {
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
}

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
useFBX.preload(WEAPON_MODELS.rifle);
useFBX.preload(WEAPON_MODELS.pistol);
