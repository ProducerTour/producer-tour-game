/**
 * CharacterRenderer - Generic animated character component
 *
 * Works with ANY Mixamo-rigged model using shared animations.
 * Just provide a model URL and animation state - it handles the rest.
 */

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { SkeletonUtils } from 'three-stdlib';
import {
  ANIMATIONS,
  CRITICAL_ANIMATIONS,
  getLoopMode,
  getAnimationForState,
  type AnimationName,
  type AnimationState,
  type WeaponType,
} from './AnimationRegistry';
import { WeaponAttachment, type WeaponType as WeaponAttachmentType } from '../WeaponAttachment';

// Get all animation URLs for batch loading
const ANIMATION_NAMES = Object.keys(ANIMATIONS) as AnimationName[];
const ANIMATION_URLS = ANIMATION_NAMES.map((name) => ANIMATIONS[name].url);

// Preload critical animations
CRITICAL_ANIMATIONS.forEach((name) => {
  useGLTF.preload(ANIMATIONS[name].url);
});

export interface CharacterRendererProps {
  /** URL to the character model (must be Mixamo-rigged) */
  modelUrl: string;
  /** Animation state */
  isMoving?: boolean;
  isRunning?: boolean;
  isSprinting?: boolean;
  isGrounded?: boolean;
  isJumping?: boolean;
  isStrafingLeft?: boolean;
  isStrafingRight?: boolean;
  isMovingBackward?: boolean;
  isCrouching?: boolean;
  isAiming?: boolean;
  isDying?: boolean;
  weaponType?: WeaponType;
  /** Visual options */
  scale?: number;
  /** Debug options */
  showAxes?: boolean;
}

/**
 * Strip root motion and scale tracks from animation clip
 * Removes Hips position/scale tracks to prevent character drifting and stretching
 */
function stripRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  const filteredTracks = clip.tracks.filter((track) => {
    const trackName = track.name.toLowerCase();
    const isHipsTrack = trackName.includes('hips');

    // Remove Hips position tracks (prevents drifting)
    if (isHipsTrack && track.name.endsWith('.position')) {
      return false;
    }

    // Remove ALL scale tracks (prevents stretching from Mixamo exports)
    if (track.name.endsWith('.scale')) {
      return false;
    }

    return true;
  });
  return new THREE.AnimationClip(clip.name, clip.duration, filteredTracks);
}

/**
 * Inner component (requires Suspense wrapper)
 */
function CharacterRendererInner({
  modelUrl,
  isMoving = false,
  isRunning = false,
  isSprinting = false,
  isGrounded = true,
  isJumping = false,
  isStrafingLeft = false,
  isStrafingRight = false,
  isMovingBackward = false,
  isCrouching = false,
  isAiming = false,
  isDying = false,
  weaponType = 'none',
  scale = 1,
  showAxes = false,
}: CharacterRendererProps) {
  const group = useRef<THREE.Group>(null);
  const currentAnimRef = useRef<AnimationName>('idle');

  // Load model
  const { scene: originalScene } = useGLTF(modelUrl);

  // Load all animations using batch loader
  const animGltfs = useLoader(GLTFLoader, ANIMATION_URLS);

  // Process animations into clips
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    ANIMATION_NAMES.forEach((name, index) => {
      const gltf = animGltfs[index];
      if (gltf?.animations?.[0]) {
        const clip = gltf.animations[0].clone();
        clip.name = name;
        anims.push(stripRootMotion(clip));
      }
    });

    return anims;
  }, [animGltfs]);

  // Clone scene for unique instance
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(originalScene);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
              mat.side = THREE.DoubleSide;
              mat.needsUpdate = true;
            }
          });
        }
      }

    });

    return clone;
  }, [originalScene]);

  // Setup animations
  const { actions } = useAnimations(animations, group);

  // Configure actions on load
  useEffect(() => {
    if (!actions) return;

    Object.entries(actions).forEach(([name, action]) => {
      if (!action) return;

      const config = ANIMATIONS[name as AnimationName];
      if (!config) return;

      action.setLoop(getLoopMode(name as AnimationName), Infinity);

      if (config.clamp) {
        action.clampWhenFinished = true;
      }
    });
  }, [actions]);

  // Handle animation transitions
  useEffect(() => {
    if (!actions) return;

    const state: AnimationState = {
      isMoving,
      isRunning,
      isSprinting,
      isJumping,
      isGrounded,
      isCrouching,
      isAiming,
      isStrafingLeft,
      isStrafingRight,
      isMovingBackward,
      isDying,
      weaponType,
    };

    const targetAnim = getAnimationForState(state);

    if (targetAnim === currentAnimRef.current) return;

    const currentAction = actions[currentAnimRef.current];
    const nextAction = actions[targetAnim];

    if (!nextAction) {
      console.warn(`Missing animation: ${targetAnim}`);
      return;
    }

    const config = ANIMATIONS[targetAnim];
    const fadeTime = config?.fadeTime ?? 0.2;

    if (currentAction) {
      currentAction.fadeOut(fadeTime);
    }

    nextAction.reset().fadeIn(fadeTime).play();

    currentAnimRef.current = targetAnim;
  }, [
    isMoving,
    isRunning,
    isSprinting,
    isGrounded,
    isJumping,
    isStrafingLeft,
    isStrafingRight,
    isMovingBackward,
    weaponType,
    isAiming,
    isCrouching,
    isDying,
    actions,
  ]);

  // Start idle animation on mount
  useEffect(() => {
    if (actions?.idle) {
      actions.idle.play();
    }
  }, [actions]);

  // Lock all bone scales to 1.0 every frame to prevent stretching from animation scale tracks
  useFrame(() => {
    if (!group.current) return;
    group.current.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        // Force scale to 1,1,1 - animations may try to scale bones but we prevent it
        child.scale.set(1, 1, 1);
      }
    });
  });

  // Convert weaponType for WeaponAttachment (it expects null for 'none')
  const weaponAttachmentType: WeaponAttachmentType = weaponType === 'none' ? null : weaponType;

  return (
    <group ref={group} scale={scale}>
      <primitive object={clonedScene} />
      <WeaponAttachment
        weaponType={weaponAttachmentType}
        avatarRef={group}
        currentAnimState={currentAnimRef.current}
      />
      {showAxes && <axesHelper args={[2]} />}
    </group>
  );
}

/**
 * CharacterRenderer with Suspense wrapper
 */
export function CharacterRenderer(props: CharacterRendererProps) {
  return (
    <Suspense fallback={null}>
      <CharacterRendererInner {...props} />
    </Suspense>
  );
}

export default CharacterRenderer;
