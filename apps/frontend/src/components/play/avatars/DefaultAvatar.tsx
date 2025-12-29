/**
 * DefaultAvatar
 * Simple animated avatar that loads the default SWAT operator model.
 * Uses Mixamo animation system without character customization.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

import { useGamePause } from '../context';
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

// Default avatar model path
const DEFAULT_AVATAR_PATH = '/assets/avatars/swat_operator.glb';

// Animation URLs derived from config
const ANIMATIONS = Object.fromEntries(
  Object.entries(ANIMATION_CONFIG).map(([name, config]) => [name, config.url])
) as Record<AnimationName, string>;

// Critical animations to preload
const CRITICAL_ANIMATIONS: AnimationName[] = [
  'idle', 'walking', 'running', 'jump', 'jumpJog', 'jumpRun',
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
}

/**
 * DefaultAvatar - Simple animated avatar for gameplay
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
  isPlayer = false,
}: DefaultAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const isPaused = useGamePause();
  const avatarRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Bone | null>(null);
  const detectedBonePrefixRef = useRef<'none' | 'mixamorig' | 'mixamorig:'>('none');
  const detectedBoneSuffixRef = useRef<string>('');

  // Load the avatar model
  const { scene: originalScene } = useGLTF(DEFAULT_AVATAR_PATH);

  // Clone the scene to avoid sharing issues
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(originalScene);

    // Enable shadows on all meshes
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clone;
  }, [originalScene]);

  // Find armature and skeleton
  const { armature, skeleton, meshes } = useMemo(() => {
    let armature: THREE.Object3D | null = null;
    let skeleton: THREE.Skeleton | null = null;
    const meshes: THREE.SkinnedMesh[] = [];

    clonedScene.traverse((child) => {
      if ((child as THREE.Bone).isBone && !armature) {
        armature = child.parent;
      }
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const skinnedMesh = child as THREE.SkinnedMesh;
        meshes.push(skinnedMesh);
        if (!skeleton && skinnedMesh.skeleton) {
          skeleton = skinnedMesh.skeleton;
        }
      }
    });

    // Detect bone naming convention
    if (skeleton) {
      const firstBone = skeleton.bones[0];
      if (firstBone) {
        if (firstBone.name.includes('mixamorig:')) {
          detectedBonePrefixRef.current = 'mixamorig:';
          // Check for suffix like _01
          const match = firstBone.name.match(/_(\d+)$/);
          if (match) {
            detectedBoneSuffixRef.current = match[0];
          }
        } else if (firstBone.name.includes('mixamorig')) {
          detectedBonePrefixRef.current = 'mixamorig';
        }
      }
    }

    return { armature, skeleton, meshes };
  }, [clonedScene]);

  // Load animations from pool
  const animationClips = AnimationClipPool.useAnimations(
    Object.keys(ANIMATION_CONFIG) as AnimationName[],
    skeleton,
    detectedBonePrefixRef.current,
    detectedBoneSuffixRef.current
  );

  // Set up animations
  const mixer = useMemo(() => {
    if (!clonedScene) return null;
    return new THREE.AnimationMixer(clonedScene);
  }, [clonedScene]);

  const actions = useMemo(() => {
    if (!mixer || !animationClips) return {};

    const actionsMap: Record<string, THREE.AnimationAction | null> = {};

    for (const [name, clip] of Object.entries(animationClips)) {
      if (clip) {
        const action = mixer.clipAction(clip);
        actionsMap[name] = action;
      } else {
        actionsMap[name] = null;
      }
    }

    configureAllActions(actionsMap);
    return actionsMap;
  }, [mixer, animationClips]);

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
    weapon: 'none' as FSMWeaponType,
    velocityY,
  }), [
    isMoving, isRunning, isGrounded, isJumping, isFalling,
    isCrouching, isDancing, dancePressed, isStrafingLeft,
    isStrafingRight, isAiming, isFiring, isDying, velocityY,
  ]);

  // Use animation state machine
  const { currentState } = useAnimationStateMachine(
    actions as Record<string, THREE.AnimationAction | null>,
    fsmInput
  );

  // Find spine bone for aim pitch (if needed later)
  useEffect(() => {
    if (!skeleton) return;

    const prefix = detectedBonePrefixRef.current;
    const suffix = detectedBoneSuffixRef.current;

    for (const bone of skeleton.bones) {
      const spineName = prefix === 'none'
        ? 'Spine1'
        : `${prefix}Spine1${suffix}`;

      if (bone.name === spineName || bone.name.includes('Spine1')) {
        spineRef.current = bone;
        break;
      }
    }
  }, [skeleton]);

  // Update animation mixer
  useFrame((_, delta) => {
    if (isPaused || !mixer) return;
    mixer.update(delta);
  });

  if (!clonedScene) {
    return null;
  }

  return (
    <group ref={group}>
      <group ref={avatarRef}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

export default DefaultAvatar;
