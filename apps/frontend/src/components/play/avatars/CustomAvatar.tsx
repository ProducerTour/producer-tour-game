/**
 * CustomAvatar
 * Animated avatar component for gameplay that uses the custom character creator meshes.
 * Integrates with the existing animation system (AnimationClipPool, FSM).
 * Supports weapon attachment and equipment like MixamoAnimatedAvatar.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useControls, folder } from 'leva';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

import type { CharacterConfig } from '../../../lib/character/types';
import { HEIGHT_CONFIG } from '../../../lib/character/defaults';
import {
  applyFaceMorphs,
  applyBuildMorphs,
  applySkinMaterial,
  applyEyeMaterial,
  cloneMaterials,
} from '../../../lib/character/morphUtils';

/**
 * Create a default skin material for meshes without materials
 */
function createDefaultSkinMaterial(skinColor: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(skinColor),
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
}

/**
 * Ensure all meshes have proper materials
 */
function ensureMaterials(meshes: THREE.Mesh[], skinColor: string): void {
  for (const mesh of meshes) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const needsNewMaterial = materials.every(
      (mat) => !mat || (mat instanceof THREE.MeshBasicMaterial && mat.color.getHex() === 0xffffff)
    );

    if (needsNewMaterial || !mesh.material) {
      mesh.material = createDefaultSkinMaterial(skinColor);
    }
  }
}

import { WeaponAttachment, type WeaponType } from '../WeaponAttachment';
import { EquipmentAttachment } from '../EquipmentAttachment';
import { HairAttachment } from '../../character-creator/HairAttachment';
import { useGamePause } from '../context';
import { useCombatStore } from '../combat/useCombatStore';
import {
  ANIMATION_CONFIG,
  type AnimationName,
} from '../animations.config';
import { configureAllActions } from '../hooks/useAnimationLoader';
import { AnimationClipPool, PRESERVE_HIPS_ROTATION_ANIMS, PRESERVE_HIPS_POSITION_ANIMS } from './AnimationClipPool';
import {
  useAnimationStateMachine,
  type AnimationInput,
  type WeaponType as FSMWeaponType,
} from '../hooks/useAnimationStateMachine';

// Debug logging
const DEBUG_AVATAR = false;

// Base mesh paths by body type
const BASE_MESH_PATHS: Record<string, string> = {
  male: '/assets/avatars/base_male.glb',
  female: '/assets/avatars/base_female.glb',
  neutral: '/assets/avatars/base_male.glb',
};

// Animation URLs derived from config
const ANIMATIONS = Object.fromEntries(
  Object.entries(ANIMATION_CONFIG).map(([name, config]) => [name, config.url])
) as Record<AnimationName, string>;

// Critical animations to preload
const CRITICAL_ANIMATIONS: AnimationName[] = [
  'idle', 'walking', 'running', 'jump', 'jumpJog', 'jumpRun',
];

// Preload critical animations
CRITICAL_ANIMATIONS.forEach(name => {
  if (ANIMATIONS[name]) {
    useGLTF.preload(ANIMATIONS[name]);
  }
});

// Preload base meshes
Object.values(BASE_MESH_PATHS).forEach(path => {
  useGLTF.preload(path);
});

export interface CustomAvatarProps {
  config: CharacterConfig;
  isMoving?: boolean;
  isRunning?: boolean;
  isGrounded?: boolean;
  isJumping?: boolean;
  isFalling?: boolean;
  isLanding?: boolean;
  isDancing?: boolean;
  dancePressed?: boolean;
  isCrouching?: boolean;
  isStrafingLeft?: boolean;
  isStrafingRight?: boolean;
  isAiming?: boolean;
  isFiring?: boolean;
  isDying?: boolean;
  velocityY?: number;
  weaponType?: WeaponType;
  aimPitch?: number;
  isPlayer?: boolean;
}

/**
 * CustomAvatar - Gameplay avatar with full animation support
 */
export function CustomAvatar({
  config,
  isMoving = false,
  isRunning = false,
  isGrounded = true,
  isJumping = false,
  isFalling = false,
  isLanding = false,
  isDancing = false,
  dancePressed = false,
  isCrouching = false,
  isStrafingLeft = false,
  isStrafingRight = false,
  isAiming = false,
  isFiring = false,
  isDying = false,
  velocityY = 0,
  weaponType = null,
  aimPitch = 0,
  isPlayer = false,
}: CustomAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const isPaused = useGamePause();
  const avatarRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Bone | null>(null);
  const detectedBonePrefixRef = useRef<'none' | 'mixamorig' | 'mixamorig:'>('none');
  const detectedBoneSuffixRef = useRef<string>('');
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const lastConfigHashRef = useRef<string>('');

  // Get the base mesh path for current body type
  const meshPath = BASE_MESH_PATHS[config.bodyType] || BASE_MESH_PATHS.male;
  const { scene } = useGLTF(meshPath);

  // Load animation files
  const idleGltf = useGLTF(ANIMATIONS.idle);
  const idleVar1Gltf = useGLTF(ANIMATIONS.idleVar1);
  const idleVar2Gltf = useGLTF(ANIMATIONS.idleVar2);
  const walkingGltf = useGLTF(ANIMATIONS.walking);
  const runningGltf = useGLTF(ANIMATIONS.running);
  const jumpGltf = useGLTF(ANIMATIONS.jump);
  const jumpJogGltf = useGLTF(ANIMATIONS.jumpJog);
  const jumpRunGltf = useGLTF(ANIMATIONS.jumpRun);
  const dance1Gltf = useGLTF(ANIMATIONS.dance1);
  const dance2Gltf = useGLTF(ANIMATIONS.dance2);
  const dance3Gltf = useGLTF(ANIMATIONS.dance3);
  const crouchWalkGltf = useGLTF(ANIMATIONS.crouchWalk);
  const crouchIdleGltf = useGLTF(ANIMATIONS.crouchIdle);
  const crouchStrafeLeftGltf = useGLTF(ANIMATIONS.crouchStrafeLeft);
  const crouchStrafeRightGltf = useGLTF(ANIMATIONS.crouchStrafeRight);
  const standToCrouchGltf = useGLTF(ANIMATIONS.standToCrouch);
  const crouchToStandGltf = useGLTF(ANIMATIONS.crouchToStand);
  const crouchToSprintGltf = useGLTF(ANIMATIONS.crouchToSprint);
  const rifleIdleGltf = useGLTF(ANIMATIONS.rifleIdle);
  const rifleAimIdleGltf = useGLTF(ANIMATIONS.rifleAimIdle);
  const rifleWalkGltf = useGLTF(ANIMATIONS.rifleWalk);
  const rifleRunGltf = useGLTF(ANIMATIONS.rifleRun);
  const pistolIdleGltf = useGLTF(ANIMATIONS.pistolIdle);
  const pistolWalkGltf = useGLTF(ANIMATIONS.pistolWalk);
  const pistolRunGltf = useGLTF(ANIMATIONS.pistolRun);
  const crouchRifleIdleGltf = useGLTF(ANIMATIONS.crouchRifleIdle);
  const crouchRifleWalkGltf = useGLTF(ANIMATIONS.crouchRifleWalk);
  const crouchRifleStrafeLeftGltf = useGLTF(ANIMATIONS.crouchRifleStrafeLeft);
  const crouchRifleStrafeRightGltf = useGLTF(ANIMATIONS.crouchRifleStrafeRight);
  const rifleJumpGltf = useGLTF(ANIMATIONS.rifleJump);
  const rifleFireStillGltf = useGLTF(ANIMATIONS.rifleFireStill);
  const rifleFireWalkGltf = useGLTF(ANIMATIONS.rifleFireWalk);
  const rifleFireCrouchGltf = useGLTF(ANIMATIONS.rifleFireCrouch);
  const crouchFireRifleTapGltf = useGLTF(ANIMATIONS.crouchFireRifleTap);
  const crouchRapidFireRifleGltf = useGLTF(ANIMATIONS.crouchRapidFireRifle);
  const rifleReloadStandGltf = useGLTF(ANIMATIONS.rifleReloadStand);
  const rifleReloadWalkGltf = useGLTF(ANIMATIONS.rifleReloadWalk);
  const rifleReloadCrouchGltf = useGLTF(ANIMATIONS.rifleReloadCrouch);
  const deathGltf = useGLTF(ANIMATIONS.death);

  // Clone scene and set up bones
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);

    // Enable shadows and find meshes
    const meshes: THREE.Mesh[] = [];
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        meshes.push(child as THREE.Mesh);
      }
      // Find spine bone for aiming
      if ((child as THREE.Bone).isBone) {
        const boneName = child.name.toLowerCase();
        if (boneName.includes('spine2') || boneName.includes('spine1')) {
          if (boneName.includes('spine2') || !spineRef.current) {
            spineRef.current = child as THREE.Bone;
          }
        }
      }
    });

    // Store meshes reference
    meshesRef.current = meshes;

    // Ensure all meshes have proper materials (fallback for missing materials)
    ensureMaterials(meshes, config.skinTone);

    // Clone materials
    cloneMaterials(meshes);

    // Detect bone prefix
    const bones: string[] = [];
    clone.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        bones.push(child.name);
      }
    });

    const hipsBone = bones.find(b => b.toLowerCase().includes('hips'));
    if (hipsBone) {
      if (hipsBone.startsWith('mixamorig:')) {
        detectedBonePrefixRef.current = 'mixamorig:';
      } else if (hipsBone.startsWith('mixamorig')) {
        detectedBonePrefixRef.current = 'mixamorig';
      } else {
        detectedBonePrefixRef.current = 'none';
      }
    }

    // Detect skeleton suffix
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        skinnedMeshes.push(child as THREE.SkinnedMesh);
      }
    });

    for (const mesh of skinnedMeshes) {
      const skeleton = mesh.skeleton;
      if (skeleton && skeleton.bones.length > 0) {
        const hipsBoneInSkeleton = skeleton.bones.find(b => b.name.toLowerCase().includes('hips'));
        if (hipsBoneInSkeleton) {
          const match = hipsBoneInSkeleton.name.match(/Hips(_\d+)?$/i);
          if (match) {
            detectedBoneSuffixRef.current = match[1] || '';
            break;
          }
        }
      }
    }

    if (DEBUG_AVATAR) {
      console.log(`🧍 CustomAvatar loaded ${config.bodyType} mesh with ${meshes.length} meshes`);
    }

    return clone;
  }, [scene, config.bodyType, config.skinTone]);

  // Apply character customizations when config changes
  useEffect(() => {
    const meshes = meshesRef.current;
    if (meshes.length === 0) return;

    const configHash = JSON.stringify({
      skinTone: config.skinTone,
      eyeColor: config.eyeColor,
      build: config.build,
      facePreset: config.facePreset,
      eyeSize: config.eyeSize,
      eyeSpacing: config.eyeSpacing,
      noseWidth: config.noseWidth,
      noseLength: config.noseLength,
      jawWidth: config.jawWidth,
      chinLength: config.chinLength,
      lipFullness: config.lipFullness,
      cheekboneHeight: config.cheekboneHeight,
    });

    if (configHash === lastConfigHashRef.current) return;
    lastConfigHashRef.current = configHash;

    // Apply customizations
    applyFaceMorphs(meshes, config);
    applyBuildMorphs(meshes, config.build);
    applySkinMaterial(meshes, config.skinTone);
    applyEyeMaterial(meshes, config.eyeColor);
  }, [config]);

  // Correction quaternion for Mixamo→custom rig Hips rotation
  const hipsCorrection = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    return q;
  }, []);

  // Get processed clip from shared pool
  const getPooledClip = (rawClip: THREE.AnimationClip, clipName: string): THREE.AnimationClip => {
    const detectedPrefix = detectedBonePrefixRef.current;
    const boneSuffix = detectedBoneSuffixRef.current;
    const preserveHipsRotation = PRESERVE_HIPS_ROTATION_ANIMS.has(clipName);
    const preserveHipsPosition = PRESERVE_HIPS_POSITION_ANIMS.has(clipName);

    return AnimationClipPool.getClip(
      rawClip,
      clipName,
      detectedPrefix,
      boneSuffix,
      hipsCorrection,
      preserveHipsRotation,
      preserveHipsPosition
    );
  };

  // Collect all animations
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    const addAnim = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations[0]) {
        const clip = getPooledClip(gltf.animations[0], name);
        anims.push(clip);
      }
    };

    // Core animations
    addAnim(idleGltf, 'idle');
    addAnim(idleVar1Gltf, 'idleVar1');
    addAnim(idleVar2Gltf, 'idleVar2');
    addAnim(walkingGltf, 'walking');
    addAnim(runningGltf, 'running');
    addAnim(jumpGltf, 'jump');
    addAnim(jumpJogGltf, 'jumpJog');
    addAnim(jumpRunGltf, 'jumpRun');
    addAnim(dance1Gltf, 'dance1');
    addAnim(dance2Gltf, 'dance2');
    addAnim(dance3Gltf, 'dance3');

    // Crouch animations
    addAnim(crouchIdleGltf, 'crouchIdle');
    addAnim(crouchWalkGltf, 'crouchWalk');
    addAnim(crouchStrafeLeftGltf, 'crouchStrafeLeft');
    addAnim(crouchStrafeRightGltf, 'crouchStrafeRight');
    addAnim(standToCrouchGltf, 'standToCrouch');
    addAnim(crouchToStandGltf, 'crouchToStand');
    addAnim(crouchToSprintGltf, 'crouchToSprint');

    // Weapon animations
    addAnim(rifleIdleGltf, 'rifleIdle');
    addAnim(rifleAimIdleGltf, 'rifleAimIdle');
    addAnim(rifleWalkGltf, 'rifleWalk');
    addAnim(rifleRunGltf, 'rifleRun');
    addAnim(pistolIdleGltf, 'pistolIdle');
    addAnim(pistolWalkGltf, 'pistolWalk');
    addAnim(pistolRunGltf, 'pistolRun');

    // Crouch + weapon
    addAnim(crouchRifleIdleGltf, 'crouchRifleIdle');
    addAnim(crouchRifleWalkGltf, 'crouchRifleWalk');
    addAnim(crouchRifleStrafeLeftGltf, 'crouchRifleStrafeLeft');
    addAnim(crouchRifleStrafeRightGltf, 'crouchRifleStrafeRight');

    // Rifle firing and reload
    addAnim(rifleJumpGltf, 'rifleJump');
    addAnim(rifleFireStillGltf, 'rifleFireStill');
    addAnim(rifleFireWalkGltf, 'rifleFireWalk');
    addAnim(rifleFireCrouchGltf, 'rifleFireCrouch');
    addAnim(crouchFireRifleTapGltf, 'crouchFireRifleTap');
    addAnim(crouchRapidFireRifleGltf, 'crouchRapidFireRifle');
    addAnim(rifleReloadStandGltf, 'rifleReloadStand');
    addAnim(rifleReloadWalkGltf, 'rifleReloadWalk');
    addAnim(rifleReloadCrouchGltf, 'rifleReloadCrouch');

    // Death
    addAnim(deathGltf, 'death');

    return anims;
  }, [
    idleGltf.animations, idleVar1Gltf.animations, idleVar2Gltf.animations,
    walkingGltf.animations, runningGltf.animations, jumpGltf.animations,
    jumpJogGltf.animations, jumpRunGltf.animations,
    dance1Gltf.animations, dance2Gltf.animations, dance3Gltf.animations,
    crouchWalkGltf.animations, crouchIdleGltf.animations,
    crouchStrafeLeftGltf.animations, crouchStrafeRightGltf.animations,
    standToCrouchGltf.animations, crouchToStandGltf.animations, crouchToSprintGltf.animations,
    rifleIdleGltf.animations, rifleAimIdleGltf.animations, rifleWalkGltf.animations, rifleRunGltf.animations,
    pistolIdleGltf.animations, pistolWalkGltf.animations, pistolRunGltf.animations,
    crouchRifleIdleGltf.animations, crouchRifleWalkGltf.animations,
    crouchRifleStrafeLeftGltf.animations, crouchRifleStrafeRightGltf.animations,
    rifleJumpGltf.animations,
    rifleFireStillGltf.animations, rifleFireWalkGltf.animations, rifleFireCrouchGltf.animations,
    crouchFireRifleTapGltf.animations, crouchRapidFireRifleGltf.animations,
    rifleReloadStandGltf.animations, rifleReloadWalkGltf.animations, rifleReloadCrouchGltf.animations,
    deathGltf.animations,
  ]);

  // Setup animations
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (!actions) return;
    configureAllActions(actions);
  }, [actions]);

  // Build FSM input
  const fsmInput: AnimationInput = useMemo(() => ({
    isMoving,
    isRunning,
    isGrounded,
    isJumping,
    isFalling,
    isLanding,
    isCrouching,
    isDancing,
    dancePressed,
    isStrafeLeft: isStrafingLeft,
    isStrafeRight: isStrafingRight,
    isAiming,
    isFiring,
    isDying,
    weapon: (weaponType ?? 'none') as FSMWeaponType,
    velocityY,
  }), [isMoving, isRunning, isGrounded, isJumping, isFalling, isLanding, isCrouching, isDancing, dancePressed, isStrafingLeft, isStrafingRight, isAiming, isFiring, isDying, weaponType, velocityY]);

  // Use FSM for animation state management
  const { currentState } = useAnimationStateMachine(
    actions as Record<string, THREE.AnimationAction | null>,
    fsmInput
  );

  // Animation controls (simplified from MixamoAnimatedAvatar)
  const animControls = useControls('🎭 Custom Avatar', {
    'Crouch': folder({
      crouchIdleOffset: { value: -0.8, min: -1.0, max: 0.2, step: 0.01, label: 'Idle Offset Y' },
      crouchWalkOffset: { value: -0.25, min: -1.0, max: 0.2, step: 0.01, label: 'Walk Offset Y' },
      lerpSpeed: { value: 9, min: 1, max: 20, step: 0.5, label: 'Lerp Speed' },
    }, { collapsed: true }),
    'Upper Body Aim': folder({
      spineAimEnabled: { value: true, label: 'Enable Spine Aim' },
      spineAimMultiplier: { value: 1.0, min: 0, max: 1.5, step: 0.05, label: 'Spine Pitch Mult' },
      spineAimMaxAngle: { value: 45, min: 15, max: 75, step: 5, label: 'Max Angle°' },
      spineAimSmoothing: { value: 10, min: 2, max: 20, step: 1, label: 'Smoothing' },
    }, { collapsed: true }),
  }, { collapsed: true });

  const {
    crouchIdleOffset, crouchWalkOffset, lerpSpeed,
    spineAimEnabled, spineAimMultiplier, spineAimMaxAngle, spineAimSmoothing,
  } = animControls;

  // Crouch state lists
  const CROUCH_IDLE_STATES = ['crouchIdle'];
  const CROUCH_WALK_STATES = ['crouchWalk', 'crouchStrafeLeft', 'crouchStrafeRight'];
  const CROUCH_RIFLE_STATES = ['crouchRifleIdle', 'crouchRifleWalk', 'crouchRifleStrafeLeft', 'crouchRifleStrafeRight'];

  // Track current offsets
  const currentOffsetY = useRef(0);
  const currentSpinePitch = useRef(0);
  const baseSpineRotationX = useRef(0);

  // Calculate height scale
  const heightScale = useMemo(() => {
    const heightMeters = HEIGHT_CONFIG.toMeters(config.height);
    return heightMeters / 1.75;
  }, [config.height]);

  // Animation frame updates
  useFrame((_, delta) => {
    if (isPaused || !avatarRef.current) return;

    // Determine target offset based on animation state
    let targetOffsetY = 0;

    if (CROUCH_IDLE_STATES.includes(currentState)) {
      targetOffsetY = crouchIdleOffset;
    } else if (CROUCH_WALK_STATES.includes(currentState)) {
      targetOffsetY = crouchWalkOffset;
    } else if (CROUCH_RIFLE_STATES.includes(currentState)) {
      targetOffsetY = crouchWalkOffset;
    }

    // Smooth lerp
    const t = 1 - Math.exp(-lerpSpeed * delta);
    currentOffsetY.current += (targetOffsetY - currentOffsetY.current) * t;
    avatarRef.current.position.y = currentOffsetY.current;

    // Upper body aiming - use aimPitch prop if provided, otherwise fall back to store
    const pitch = aimPitch !== 0 ? aimPitch : useCombatStore.getState().cameraPitch;
    const shouldTrackSpine = spineAimEnabled && weaponType && isAiming;

    if (spineRef.current && shouldTrackSpine) {
      baseSpineRotationX.current = spineRef.current.rotation.x;
      const maxAngleRad = (spineAimMaxAngle * Math.PI) / 180;
      const targetSpinePitch = Math.max(-maxAngleRad, Math.min(maxAngleRad,
        pitch * spineAimMultiplier
      ));
      const spineT = 1 - Math.exp(-spineAimSmoothing * delta);
      currentSpinePitch.current += (targetSpinePitch - currentSpinePitch.current) * spineT;
      spineRef.current.rotation.x = baseSpineRotationX.current + currentSpinePitch.current;
    } else if (spineRef.current) {
      baseSpineRotationX.current = spineRef.current.rotation.x;
      const returnT = 1 - Math.exp(-spineAimSmoothing * delta);
      currentSpinePitch.current *= (1 - returnT);
      if (Math.abs(currentSpinePitch.current) > 0.001) {
        spineRef.current.rotation.x = baseSpineRotationX.current + currentSpinePitch.current;
      }
    }
  });

  return (
    <group ref={group} scale={heightScale}>
      <group ref={avatarRef}>
        <primitive object={clonedScene} position={[0, 0.2, 0]} />
        {/* Hair attachment */}
        <HairAttachment
          avatarRef={avatarRef}
          hairStyleId={config.hairStyleId}
          hairColor={config.hairColor}
          highlightColor={config.hairHighlightColor}
        />
      </group>
      {weaponType && (
        <WeaponAttachment
          weaponType={weaponType}
          avatarRef={avatarRef}
          currentAnimState={currentState}
        />
      )}
      {isPlayer && <EquipmentAttachment avatarRef={avatarRef} />}
    </group>
  );
}

export default CustomAvatar;
