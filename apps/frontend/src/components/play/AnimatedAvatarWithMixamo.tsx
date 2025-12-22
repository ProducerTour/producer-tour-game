/**
 * Mixamo-based Animated Avatar
 * Uses pre-made animations from Mixamo for natural movement
 *
 * Setup:
 * 1. Download animations from mixamo.com (FBX without skin)
 * 2. Convert to GLB using Blender or gltf-pipeline
 * 3. Place in public/animations/
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { getAnimationPath } from '../../config/assetPaths';

// Animation file paths - uses CDN in production, local in development
const ANIMATIONS = {
  idle: getAnimationPath('idle.glb'),
  walking: getAnimationPath('walking.glb'),
  running: getAnimationPath('running.glb'),
  jump: getAnimationPath('jump.glb'),
};

// Animation state type
type AnimState = 'idle' | 'walk' | 'run' | 'jump';

interface AnimatedAvatarWithMixamoProps {
  url: string;
  isMoving?: boolean;
  isRunning?: boolean;
  isJumping?: boolean;
  isGrounded?: boolean;
  velocity?: number;
}

// Preload animations
try {
  useGLTF.preload(ANIMATIONS.idle);
  useGLTF.preload(ANIMATIONS.walking);
  useGLTF.preload(ANIMATIONS.running);
} catch {
  // Animations not yet added - will fail gracefully
}

export function AnimatedAvatarWithMixamo({
  url,
  isMoving = false,
  isRunning = false,
  isJumping = false,
  isGrounded = true,
}: AnimatedAvatarWithMixamoProps) {
  const group = useRef<THREE.Group>(null);
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const currentState = useRef<AnimState>('idle');

  // Load the RPM avatar
  const { scene } = useGLTF(url);

  // Try to load animation files - handle missing files gracefully
  const idleGltf = useAnimationFile(ANIMATIONS.idle);
  const walkGltf = useAnimationFile(ANIMATIONS.walking);
  const runGltf = useAnimationFile(ANIMATIONS.running);

  // Clone scene for this instance
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

  // Collect and rename animation clips
  const animations = useMemo(() => {
    const clips: THREE.AnimationClip[] = [];

    if (idleGltf?.animations?.[0]) {
      const idle = idleGltf.animations[0].clone();
      idle.name = 'idle';
      clips.push(idle);
    }
    if (walkGltf?.animations?.[0]) {
      const walk = walkGltf.animations[0].clone();
      walk.name = 'walk';
      clips.push(walk);
    }
    if (runGltf?.animations?.[0]) {
      const run = runGltf.animations[0].clone();
      run.name = 'run';
      clips.push(run);
    }

    return clips;
  }, [idleGltf, walkGltf, runGltf]);

  // Connect animations to skeleton
  const { actions, mixer } = useAnimations(animations, group);

  // Animation state machine
  useEffect(() => {
    // Determine target animation
    let targetState: AnimState;
    if (isJumping || !isGrounded) {
      targetState = 'jump';
    } else if (isRunning && isMoving) {
      targetState = 'run';
    } else if (isMoving) {
      targetState = 'walk';
    } else {
      targetState = 'idle';
    }

    // Only transition if state changed
    if (targetState === currentState.current) return;

    const fadeTime = getFadeTime(currentState.current, targetState);
    const targetAction = actions[targetState === 'jump' ? 'idle' : targetState];

    if (targetAction) {
      // Crossfade from current to target
      if (currentAction.current && currentAction.current !== targetAction) {
        currentAction.current.fadeOut(fadeTime);
      }

      targetAction.reset().fadeIn(fadeTime).play();
      currentAction.current = targetAction;
      currentState.current = targetState;
    }
  }, [isMoving, isRunning, isJumping, isGrounded, actions]);

  // Start idle animation on mount
  useEffect(() => {
    const idle = actions['idle'];
    if (idle) {
      idle.play();
      currentAction.current = idle;
    }
  }, [actions]);

  // Update animation mixer
  useFrame((_, delta) => {
    // Clamp delta to prevent animation issues on focus loss
    const clampedDelta = Math.min(delta, 0.1);
    mixer.update(clampedDelta);
  });

  return (
    <group ref={group}>
      <primitive object={clonedScene} position={[0, 0, 0]} scale={1} />
    </group>
  );
}

// Helper hook to load animation files safely
function useAnimationFile(path: string) {
  try {
    return useGLTF(path);
  } catch {
    console.warn(`Animation file not found: ${path}`);
    return null;
  }
}

// Get appropriate fade time for transitions
function getFadeTime(from: AnimState, to: AnimState): number {
  // Quick transitions for responsive feel
  const transitions: Record<string, number> = {
    'idle-walk': 0.2,
    'walk-idle': 0.25,
    'idle-run': 0.15,
    'run-idle': 0.3,
    'walk-run': 0.15,
    'run-walk': 0.2,
    'default': 0.2,
  };

  const key = `${from}-${to}`;
  return transitions[key] ?? transitions['default'];
}

export default AnimatedAvatarWithMixamo;
