/**
 * CustomizableAvatar
 * 3D avatar component that loads base mesh GLB and applies color customizations.
 * Used in the character creator for real-time preview.
 *
 * NOTE: Simplified to colors-only - no morph targets
 */

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

import type { CharacterConfig } from '../../lib/character/types';
import {
  findAllMeshes,
  applySkinMaterial,
  applyEyeMaterial,
  cloneMaterials,
} from '../../lib/character/morphUtils';
import { HairAttachment } from './HairAttachment';

// Debug logging (set to false for production)
const DEBUG_AVATAR = false;

// Base mesh paths by body type
const BASE_MESH_PATHS: Record<string, string> = {
  male: '/assets/avatars/base_male.glb',
  female: '/assets/avatars/base_female.glb',
};

// Preload both base meshes
useGLTF.preload(BASE_MESH_PATHS.male);
useGLTF.preload(BASE_MESH_PATHS.female);

// Preview animation paths
const PREVIEW_ANIMATIONS = {
  idle: '/animations/idle.glb',
  walk: '/animations/walking.glb',
  dance: '/animations/dance1.glb',
};

// Preload animations
Object.values(PREVIEW_ANIMATIONS).forEach(url => useGLTF.preload(url));

/**
 * Detect the bone naming prefix used in the skeleton
 */
function detectBonePrefix(root: THREE.Object3D): string {
  let prefix = '';
  root.traverse((child) => {
    if ((child as THREE.Bone).isBone && child.name.toLowerCase().includes('hips')) {
      if (child.name.startsWith('mixamorig:')) {
        prefix = 'mixamorig:';
      } else if (child.name.startsWith('mixamorig')) {
        prefix = 'mixamorig';
      }
    }
  });
  return prefix;
}

/**
 * Process animation clip: strip root motion and remap bone names for target skeleton
 */
function processAnimationClip(clip: THREE.AnimationClip, targetPrefix: string): THREE.AnimationClip {
  const newClip = clip.clone();

  newClip.tracks = newClip.tracks
    .filter(track => {
      // Strip position/scale from Hips to prevent character drift
      if (track.name.toLowerCase().includes('hips')) {
        return track.name.endsWith('.quaternion');
      }
      return true;
    })
    .map(track => {
      // Parse the track name (e.g., "Hips.quaternion" or "mixamorig:Hips.quaternion")
      const dotIndex = track.name.indexOf('.');
      if (dotIndex === -1) return track;

      let boneName = track.name.substring(0, dotIndex);
      const property = track.name.substring(dotIndex + 1);

      // Strip any existing prefix from the bone name
      if (boneName.startsWith('mixamorig:')) {
        boneName = boneName.substring('mixamorig:'.length);
      } else if (boneName.startsWith('mixamorig')) {
        boneName = boneName.substring('mixamorig'.length);
      }

      // Apply the target prefix
      track.name = `${targetPrefix}${boneName}.${property}`;
      return track;
    });

  return newClip;
}

export interface CustomizableAvatarProps {
  config: CharacterConfig;
  animation?: 'idle' | 'walk' | 'dance' | 'wave';
}

/**
 * CustomizableAvatar - Renders a customizable 3D avatar based on CharacterConfig
 */
export function CustomizableAvatar({
  config,
  animation = 'idle',
}: CustomizableAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const lastConfigRef = useRef<string>('');

  // Get the base mesh path for current body type
  const meshPath = BASE_MESH_PATHS[config.bodyType] || BASE_MESH_PATHS.male;

  // Load the base mesh
  const { scene } = useGLTF(meshPath);

  // Load animation files
  const idleGltf = useGLTF(PREVIEW_ANIMATIONS.idle);
  const walkGltf = useGLTF(PREVIEW_ANIMATIONS.walk);
  const danceGltf = useGLTF(PREVIEW_ANIMATIONS.dance);

  // Clone scene for this instance and detect bone prefix
  const { clonedScene, bonePrefix } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);

    // Enable shadows on all meshes
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Find and store meshes
    const meshes = findAllMeshes(clone);
    meshesRef.current = meshes;

    // Detect bone prefix from skeleton
    const prefix = detectBonePrefix(clone);

    if (DEBUG_AVATAR) {
      console.log(`Loaded ${config.bodyType} base mesh with ${meshes.length} meshes, bone prefix: "${prefix}"`);

      // Log bone names
      const bones: string[] = [];
      clone.traverse((child) => {
        if ((child as THREE.Bone).isBone) {
          bones.push(child.name);
        }
      });
      console.log(`Skeleton bones (first 10):`, bones.slice(0, 10));
    }

    // Clone materials to avoid shared material issues
    cloneMaterials(meshes);

    return { clonedScene: clone, bonePrefix: prefix };
  }, [scene, config.bodyType]);

  // Process and collect animations with correct bone prefix
  const animations = useMemo(() => {
    const clips: THREE.AnimationClip[] = [];

    const addClip = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations[0]) {
        const clip = processAnimationClip(gltf.animations[0], bonePrefix);
        clip.name = name;
        clips.push(clip);

        if (DEBUG_AVATAR) {
          console.log(`Animation "${name}" tracks:`, clip.tracks.slice(0, 3).map(t => t.name));
        }
      }
    };

    addClip(idleGltf, 'idle');
    addClip(walkGltf, 'walk');
    addClip(danceGltf, 'dance');

    return clips;
  }, [idleGltf, walkGltf, danceGltf, bonePrefix]);

  // Setup animations with useAnimations hook - pass clonedScene directly
  const { actions } = useAnimations(animations, clonedScene);

  // Apply customizations when config changes
  const applyCustomizations = useCallback(() => {
    const meshes = meshesRef.current;
    if (meshes.length === 0) return;

    // Create a config hash to avoid unnecessary updates
    const configHash = JSON.stringify({
      skinTone: config.skinTone,
      eyeColor: config.eyeColor,
    });

    // Skip if config hasn't changed
    if (configHash === lastConfigRef.current) return;
    lastConfigRef.current = configHash;

    if (DEBUG_AVATAR) {
      console.log('Applying customizations:', config);
    }

    // Apply material colors
    applySkinMaterial(meshes, config.skinTone);
    applyEyeMaterial(meshes, config.eyeColor);
  }, [config]);

  // Apply customizations on mount and config change
  useEffect(() => {
    applyCustomizations();
  }, [applyCustomizations]);

  // Play animation based on prop
  useEffect(() => {
    if (!actions) return;

    // Map animation prop to clip name (wave falls back to idle)
    const clipName = animation === 'wave' ? 'idle' : animation;
    const action = actions[clipName];

    if (action) {
      // Fade out all other actions
      Object.values(actions).forEach(a => {
        if (a && a !== action && a.isRunning()) {
          a.fadeOut(0.3);
        }
      });
      // Play this action
      action.reset().fadeIn(0.3).play();
    }
  }, [animation, actions]);

  // Cleanup animations on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (actions) {
        Object.values(actions).forEach(action => action?.stop());
      }
    };
  }, [actions]);

  return (
    <group ref={groupRef}>
      <group ref={avatarRef}>
        {/* Rotate -90deg on X axis to fix Mixamo animation orientation, position to ground feet */}
        <primitive object={clonedScene} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]} />
      </group>
      {/* Hair attachment - outside avatar group to use world coordinates */}
      <HairAttachment
        avatarRef={avatarRef}
        hairStyleId={config.hairStyleId}
        hairColor={config.hairColor}
        highlightColor={config.hairHighlightColor}
      />
    </group>
  );
}

export default CustomizableAvatar;
