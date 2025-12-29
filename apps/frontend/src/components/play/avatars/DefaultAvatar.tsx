/**
 * DefaultAvatar
 * Simple animated avatar that loads the default SWAT operator model.
 * Uses Mixamo animation system without character customization.
 * Includes comprehensive Leva debug controls for development.
 */

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useControls, folder, button } from 'leva';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
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
import { WeaponAttachment, type WeaponType } from '../WeaponAttachment';

// Default avatar model path
const DEFAULT_AVATAR_PATH = '/assets/avatars/swat_operator.glb';

// Animation URLs derived from config
const ANIMATIONS = Object.fromEntries(
  Object.entries(ANIMATION_CONFIG).map(([name, config]) => [name, config.url])
) as Record<AnimationName, string>;

// Critical animations to preload
const CRITICAL_ANIMATIONS: AnimationName[] = [
  'idle', 'walking', 'running', 'jump', 'jumpJog', 'jumpRun',
  'rifleIdle', 'rifleWalk', 'rifleRun',
  'pistolIdle', 'pistolWalk', 'pistolRun',
];

// Preload critical animations and avatar
CRITICAL_ANIMATIONS.forEach(name => {
  if (ANIMATIONS[name]) {
    useGLTF.preload(ANIMATIONS[name]);
  }
});
useGLTF.preload(DEFAULT_AVATAR_PATH);

export interface DefaultAvatarProps {
  isMoving?: boolean;
  isRunning?: boolean;
  isGrounded?: boolean;
  isJumping?: boolean;
  isFalling?: boolean;
  isDancing?: boolean;
  dancePressed?: boolean;
  isCrouching?: boolean;
  isStrafingLeft?: boolean;
  isStrafingRight?: boolean;
  isAiming?: boolean;
  isFiring?: boolean;
  isDying?: boolean;
  velocityY?: number;
  isPlayer?: boolean;
  /** Current weapon type for animation and weapon model rendering */
  weapon?: WeaponType;
}

/**
 * DefaultAvatar - Animated avatar with comprehensive debug controls
 */
export function DefaultAvatar({
  isMoving = false,
  isRunning = false,
  isGrounded = true,
  isJumping = false,
  isFalling = false,
  isDancing = false,
  dancePressed = false,
  isCrouching = false,
  isStrafingLeft = false,
  isStrafingRight = false,
  isAiming = false,
  isFiring = false,
  isDying = false,
  velocityY = 0,
  weapon = null,
  // isPlayer reserved for future use
}: DefaultAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);

  // Detected bone structure
  const [boneInfo, setBoneInfo] = useState({
    prefix: 'detecting...',
    suffix: '',
    boneCount: 0,
    meshCount: 0,
  });
  const [currentAnimState, setCurrentAnimState] = useState('idle');

  const detectedBonePrefixRef = useRef<'none' | 'mixamorig' | 'mixamorig:'>('none');
  const detectedBoneSuffixRef = useRef<string>('');

  // Comprehensive Leva controls
  const controls = useControls('🎮 Avatar', {
    // Transform
    'Transform': folder({
      scale: { value: 0.01, min: 0.001, max: 0.1, step: 0.001, label: 'Scale' },
      posX: { value: 0, min: -5, max: 5, step: 0.1, label: 'Pos X' },
      posY: { value: 100, min: -100, max: 100, step: 1, label: 'Pos Y' },
      posZ: { value: 0, min: -5, max: 5, step: 0.1, label: 'Pos Z' },
      rotX: { value: 88, min: -180, max: 180, step: 1, label: 'Rot X°' },
      rotY: { value: 0, min: -180, max: 180, step: 1, label: 'Rot Y°' },
      rotZ: { value: 0, min: -180, max: 180, step: 1, label: 'Rot Z°' },
    }, { collapsed: false }),

    // Debug visualization
    'Debug': folder({
      showSkeleton: { value: false, label: 'Show Skeleton' },
      showBoundingBox: { value: false, label: 'Show Bounds' },
      showAxes: { value: false, label: 'Show Axes' },
      axesSize: { value: 1, min: 0.1, max: 5, step: 0.1, label: 'Axes Size' },
    }, { collapsed: true }),

    // Bone info (read-only monitors)
    'Bone Info': folder({
      bonePrefix: { value: boneInfo.prefix, editable: false, label: 'Prefix' },
      boneSuffix: { value: boneInfo.suffix || 'none', editable: false, label: 'Suffix' },
      boneCount: { value: boneInfo.boneCount, editable: false, label: 'Bones' },
      meshCount: { value: boneInfo.meshCount, editable: false, label: 'Meshes' },
    }, { collapsed: true }),

    // Animation state
    'Animation': folder({
      currentAnim: { value: currentAnimState, editable: false, label: 'Current' },
      logBones: button(() => {
        console.log('🦴 Bone structure:', {
          prefix: detectedBonePrefixRef.current,
          suffix: detectedBoneSuffixRef.current,
        });
        if (group.current) {
          const bones: string[] = [];
          group.current.traverse((child) => {
            if ((child as THREE.Bone).isBone) {
              bones.push(child.name);
            }
          });
          console.log('🦴 All bones:', bones);
        }
      }, { disabled: false }),
      logAnimations: button(() => {
        console.log('🎬 Available animations:', Object.keys(ANIMATION_CONFIG));
      }, { disabled: false }),
    }, { collapsed: true }),

    // Weapon state rotation corrections (from MixamoAnimatedAvatar)
    'Weapon Offsets': folder({
      lerpSpeed: { value: 8, min: 1, max: 20, step: 1, label: 'Lerp Speed' },
      rifleIdleRotY: { value: -45, min: -90, max: 90, step: 1, label: 'Rifle Idle Y°' },
      rifleWalkRotY: { value: -45, min: -90, max: 90, step: 1, label: 'Rifle Walk Y°' },
      rifleRunRotY: { value: 0, min: -90, max: 90, step: 1, label: 'Rifle Run Y°' },
      pistolIdleRotY: { value: -45, min: -90, max: 90, step: 1, label: 'Pistol Idle Y°' },
      pistolWalkRotY: { value: 0, min: -90, max: 90, step: 1, label: 'Pistol Walk Y°' },
    }, { collapsed: true }),
  }, [boneInfo, currentAnimState]);

  // Load the avatar model
  const { scene: originalScene } = useGLTF(DEFAULT_AVATAR_PATH);

  // Load animation files - Core locomotion
  const idleGltf = useGLTF(ANIMATIONS.idle);
  const walkingGltf = useGLTF(ANIMATIONS.walking);
  const runningGltf = useGLTF(ANIMATIONS.running);
  const jumpGltf = useGLTF(ANIMATIONS.jump);
  const jumpJogGltf = useGLTF(ANIMATIONS.jumpJog);
  const jumpRunGltf = useGLTF(ANIMATIONS.jumpRun);
  const dance1Gltf = useGLTF(ANIMATIONS.dance1);
  const dance2Gltf = useGLTF(ANIMATIONS.dance2);
  const dance3Gltf = useGLTF(ANIMATIONS.dance3);

  // Rifle animations
  const rifleIdleGltf = useGLTF(ANIMATIONS.rifleIdle);
  const rifleWalkGltf = useGLTF(ANIMATIONS.rifleWalk);
  const rifleRunGltf = useGLTF(ANIMATIONS.rifleRun);
  const rifleAimIdleGltf = useGLTF(ANIMATIONS.rifleAimIdle);
  const rifleJumpGltf = useGLTF(ANIMATIONS.rifleJump);
  const rifleFireStillGltf = useGLTF(ANIMATIONS.rifleFireStill);
  const rifleFireWalkGltf = useGLTF(ANIMATIONS.rifleFireWalk);

  // Pistol animations
  const pistolIdleGltf = useGLTF(ANIMATIONS.pistolIdle);
  const pistolWalkGltf = useGLTF(ANIMATIONS.pistolWalk);
  const pistolRunGltf = useGLTF(ANIMATIONS.pistolRun);

  // Crouch + weapon animations
  const crouchRifleIdleGltf = useGLTF(ANIMATIONS.crouchRifleIdle);
  const crouchRifleWalkGltf = useGLTF(ANIMATIONS.crouchRifleWalk);
  const crouchPistolIdleGltf = useGLTF(ANIMATIONS.crouchPistolIdle);
  const crouchPistolWalkGltf = useGLTF(ANIMATIONS.crouchPistolWalk);

  // Clone scene and detect bone structure
  const { clonedScene } = useMemo(() => {
    const clone = SkeletonUtils.clone(originalScene);

    const bones: string[] = [];
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    let foundSkeleton: THREE.Skeleton | null = null;

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if ((child as THREE.Bone).isBone) {
        bones.push(child.name);
      }
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        skinnedMeshes.push(mesh);
        if (!foundSkeleton && mesh.skeleton) {
          foundSkeleton = mesh.skeleton;
        }
      }
    });

    // Detect bone prefix
    const hipsBone = bones.find(b => b.toLowerCase().includes('hips'));
    let prefix: 'none' | 'mixamorig' | 'mixamorig:' = 'none';
    let suffix = '';

    if (hipsBone) {
      if (hipsBone.startsWith('mixamorig:')) {
        prefix = 'mixamorig:';
      } else if (hipsBone.startsWith('mixamorig')) {
        prefix = 'mixamorig';
      }

      // Check for suffix
      const match = hipsBone.match(/Hips(_\d+)?$/i);
      if (match && match[1]) {
        suffix = match[1];
      }
    }

    detectedBonePrefixRef.current = prefix;
    detectedBoneSuffixRef.current = suffix;

    // Update bone info state
    setTimeout(() => {
      setBoneInfo({
        prefix: prefix === 'none' ? 'Standard' : prefix,
        suffix: suffix,
        boneCount: bones.length,
        meshCount: skinnedMeshes.length,
      });
    }, 0);

    console.log(`🦴 Avatar loaded: ${bones.length} bones, ${skinnedMeshes.length} meshes, prefix: "${prefix}"`);

    return { clonedScene: clone, skeleton: foundSkeleton };
  }, [originalScene]);

  // Create skeleton helper
  useEffect(() => {
    if (clonedScene && controls.showSkeleton) {
      // Find first skinned mesh for skeleton helper
      let rootBone: THREE.Object3D | null = null;
      clonedScene.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh && !rootBone) {
          rootBone = child;
        }
      });

      if (rootBone) {
        const helper = new THREE.SkeletonHelper(rootBone);
        helper.visible = true;
        skeletonHelperRef.current = helper;
        clonedScene.add(helper);
      }
    }

    return () => {
      if (skeletonHelperRef.current) {
        skeletonHelperRef.current.removeFromParent();
        skeletonHelperRef.current = null;
      }
    };
  }, [clonedScene, controls.showSkeleton]);

  // Create bounding box helper
  useEffect(() => {
    if (clonedScene && controls.showBoundingBox) {
      const helper = new THREE.BoxHelper(clonedScene, 0x00ff00);
      boxHelperRef.current = helper;
      clonedScene.add(helper);
    }

    return () => {
      if (boxHelperRef.current) {
        boxHelperRef.current.removeFromParent();
        boxHelperRef.current = null;
      }
    };
  }, [clonedScene, controls.showBoundingBox]);

  // Update helpers each frame
  useFrame(() => {
    if (boxHelperRef.current && clonedScene) {
      boxHelperRef.current.update();
    }
  });

  // Refs for smooth weapon rotation interpolation
  const currentWeaponRotY = useRef(0);

  // Apply weapon rotation corrections per animation state (from MixamoAnimatedAvatar)
  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    // Determine target Y rotation based on current animation state
    let targetRotY = 0;

    // Rifle states
    if (currentAnimState === 'rifleIdle' || currentAnimState === 'rifleAimIdle') {
      targetRotY = controls.rifleIdleRotY;
    } else if (currentAnimState === 'rifleWalk' || currentAnimState === 'rifleAimWalk') {
      targetRotY = controls.rifleWalkRotY;
    } else if (currentAnimState === 'rifleRun') {
      targetRotY = controls.rifleRunRotY;
    } else if (currentAnimState.startsWith('rifleFire')) {
      targetRotY = controls.rifleIdleRotY; // Use idle rotation for firing
    }
    // Pistol states
    else if (currentAnimState === 'pistolIdle') {
      targetRotY = controls.pistolIdleRotY;
    } else if (currentAnimState === 'pistolWalk' || currentAnimState === 'pistolRun') {
      targetRotY = controls.pistolWalkRotY;
    }
    // Crouch + weapon states
    else if (currentAnimState.startsWith('crouchRifle')) {
      targetRotY = controls.rifleIdleRotY;
    } else if (currentAnimState.startsWith('crouchPistol')) {
      targetRotY = controls.pistolIdleRotY;
    }

    // Smooth lerp towards target rotation
    const t = 1 - Math.exp(-controls.lerpSpeed * delta);
    currentWeaponRotY.current += (targetRotY - currentWeaponRotY.current) * t;

    // Apply additional Y rotation to avatar (combines with base rotation from controls)
    const weaponRotYRad = (currentWeaponRotY.current * Math.PI) / 180;
    avatarRef.current.rotation.y = weaponRotYRad;
  });

  // Hips correction quaternion
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

  // Collect animations
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    const addAnim = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations[0]) {
        const clip = getPooledClip(gltf.animations[0], name);
        anims.push(clip);
      }
    };

    // Core locomotion
    addAnim(idleGltf, 'idle');
    addAnim(walkingGltf, 'walking');
    addAnim(runningGltf, 'running');
    addAnim(jumpGltf, 'jump');
    addAnim(jumpJogGltf, 'jumpJog');
    addAnim(jumpRunGltf, 'jumpRun');
    addAnim(dance1Gltf, 'dance1');
    addAnim(dance2Gltf, 'dance2');
    addAnim(dance3Gltf, 'dance3');

    // Rifle animations
    addAnim(rifleIdleGltf, 'rifleIdle');
    addAnim(rifleWalkGltf, 'rifleWalk');
    addAnim(rifleRunGltf, 'rifleRun');
    addAnim(rifleAimIdleGltf, 'rifleAimIdle');
    addAnim(rifleJumpGltf, 'rifleJump');
    addAnim(rifleFireStillGltf, 'rifleFireStill');
    addAnim(rifleFireWalkGltf, 'rifleFireWalk');

    // Pistol animations
    addAnim(pistolIdleGltf, 'pistolIdle');
    addAnim(pistolWalkGltf, 'pistolWalk');
    addAnim(pistolRunGltf, 'pistolRun');

    // Crouch + weapon animations
    addAnim(crouchRifleIdleGltf, 'crouchRifleIdle');
    addAnim(crouchRifleWalkGltf, 'crouchRifleWalk');
    addAnim(crouchPistolIdleGltf, 'crouchPistolIdle');
    addAnim(crouchPistolWalkGltf, 'crouchPistolWalk');

    console.log('🎬 Building animations with bone prefix:', detectedBonePrefixRef.current);
    return anims;
  }, [
    // Core locomotion
    idleGltf.animations, walkingGltf.animations, runningGltf.animations,
    jumpGltf.animations, jumpJogGltf.animations, jumpRunGltf.animations,
    dance1Gltf.animations, dance2Gltf.animations, dance3Gltf.animations,
    // Rifle
    rifleIdleGltf.animations, rifleWalkGltf.animations, rifleRunGltf.animations,
    rifleAimIdleGltf.animations, rifleJumpGltf.animations,
    rifleFireStillGltf.animations, rifleFireWalkGltf.animations,
    // Pistol
    pistolIdleGltf.animations, pistolWalkGltf.animations, pistolRunGltf.animations,
    // Crouch + weapon
    crouchRifleIdleGltf.animations, crouchRifleWalkGltf.animations,
    crouchPistolIdleGltf.animations, crouchPistolWalkGltf.animations,
    hipsCorrection,
    // IMPORTANT: Re-run when bone prefix is detected to ensure correct track naming
    boneInfo.prefix,
  ]);

  // Setup animations
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (!actions) return;
    configureAllActions(actions);
    console.log('🎬 Actions configured:', Object.keys(actions));
  }, [actions]);

  // Animation state machine input
  const fsmInput: AnimationInput = useMemo(() => ({
    isMoving,
    isRunning,
    isGrounded,
    isJumping,
    isFalling,
    isCrouching,
    isDancing,
    dancePressed,
    isStrafeLeft: isStrafingLeft,
    isStrafeRight: isStrafingRight,
    isAiming,
    isFiring,
    isDying,
    weapon: (weapon ?? 'none') as FSMWeaponType,
    velocityY,
  }), [
    isMoving, isRunning, isGrounded, isJumping, isFalling,
    isCrouching, isDancing, dancePressed, isStrafingLeft,
    isStrafingRight, isAiming, isFiring, isDying, weapon, velocityY,
  ]);

  // Use animation state machine
  const { currentState } = useAnimationStateMachine(
    actions as Record<string, THREE.AnimationAction | null>,
    fsmInput
  );

  // Update current animation state for Leva display
  useEffect(() => {
    setCurrentAnimState(currentState);
  }, [currentState]);

  // Debug: Log animation state when weapon changes
  useEffect(() => {
    console.log('🔫 Weapon changed:', {
      weapon,
      fsmWeapon: weapon ?? 'none',
      currentState,
      hasActions: !!actions,
      actionKeys: actions ? Object.keys(actions) : [],
      rifleIdleAction: actions?.['rifleIdle'] ? 'exists' : 'missing',
    });
  }, [weapon, currentState, actions]);

  if (!clonedScene) {
    return null;
  }

  // Convert degrees to radians
  const rotXRad = (controls.rotX * Math.PI) / 180;
  const rotYRad = (controls.rotY * Math.PI) / 180;
  const rotZRad = (controls.rotZ * Math.PI) / 180;

  return (
    <group ref={group} scale={controls.scale}>
      <group ref={avatarRef}>
        <primitive
          object={clonedScene}
          position={[controls.posX, controls.posY, controls.posZ]}
          rotation={[rotXRad, rotYRad, rotZRad]}
        />
        {/* Axes helper for orientation debugging */}
        {controls.showAxes && (
          <axesHelper args={[controls.axesSize]} />
        )}
      </group>
      {/* Weapon model attachment */}
      {weapon && (
        <WeaponAttachment
          weaponType={weapon}
          avatarRef={avatarRef}
          currentAnimState={currentState}
        />
      )}
    </group>
  );
}

export default DefaultAvatar;
