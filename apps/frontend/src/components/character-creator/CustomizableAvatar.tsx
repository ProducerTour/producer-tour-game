/**
 * CustomizableAvatar
 * 3D avatar component that loads base mesh GLB and applies customizations from CharacterConfig.
 * Used in the character creator for real-time preview.
 */

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

import type { CharacterConfig } from '../../lib/character/types';
import { HEIGHT_CONFIG } from '../../lib/character/defaults';
import {
  findAllMeshes,
  applyFaceMorphs,
  applyBuildMorphs,
  applySkinMaterial,
  applyEyeMaterial,
  cloneMaterials,
  logMorphTargets,
  logMaterials,
} from '../../lib/character/morphUtils';
import { HairAttachment } from './HairAttachment';

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
 * Creates default materials if none exist, and converts non-PBR materials to MeshStandardMaterial
 */
function ensureMaterials(meshes: THREE.Mesh[], skinColor: string): void {
  for (const mesh of meshes) {
    // Handle array materials
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((mat) => {
        if (!mat || !(mat instanceof THREE.MeshStandardMaterial)) {
          return createDefaultSkinMaterial(skinColor);
        }
        return mat;
      });
    } else {
      // Handle single material
      const mat = mesh.material;
      const needsNewMaterial =
        !mat ||
        mat instanceof THREE.MeshBasicMaterial ||
        (mat.type === 'MeshBasicMaterial');

      if (needsNewMaterial) {
        console.log(`  Creating default material for mesh: ${mesh.name}`);
        mesh.material = createDefaultSkinMaterial(skinColor);
      } else if (!(mat instanceof THREE.MeshStandardMaterial)) {
        // Convert non-standard materials to standard
        console.log(`  Converting material for mesh: ${mesh.name}`);
        mesh.material = createDefaultSkinMaterial(skinColor);
      }
    }
  }
}

// Debug logging
const DEBUG_AVATAR = false;

// Base mesh paths by body type
const BASE_MESH_PATHS: Record<string, string> = {
  male: '/assets/avatars/base_male.glb',
  female: '/assets/avatars/base_female.glb',
  neutral: '/assets/avatars/base_male.glb', // Fallback to male for neutral
};

// Preload both base meshes
useGLTF.preload(BASE_MESH_PATHS.male);
useGLTF.preload(BASE_MESH_PATHS.female);

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

  // Clone scene for this instance
  const clonedScene = useMemo(() => {
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

    if (DEBUG_AVATAR) {
      console.log(`🧍 Loaded ${config.bodyType} base mesh with ${meshes.length} meshes`);
      meshes.forEach((mesh) => {
        console.log(`  Mesh: ${mesh.name}, Material: ${mesh.material ? (Array.isArray(mesh.material) ? mesh.material.map(m => m?.type).join(', ') : mesh.material.type) : 'none'}`);
        logMorphTargets(mesh);
      });
    }

    // Ensure all meshes have proper materials (create defaults if missing)
    ensureMaterials(meshes, config.skinTone);

    // Clone materials to avoid shared material issues
    cloneMaterials(meshes);

    if (DEBUG_AVATAR) {
      logMaterials(meshes);
    }

    return clone;
  }, [scene, config.bodyType, config.skinTone]);

  // Apply customizations when config changes
  const applyCustomizations = useCallback(() => {
    const meshes = meshesRef.current;
    if (meshes.length === 0) return;

    // Create a config hash to avoid unnecessary updates
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

    // Skip if config hasn't changed
    if (configHash === lastConfigRef.current) return;
    lastConfigRef.current = configHash;

    if (DEBUG_AVATAR) {
      console.log('🎨 Applying customizations:', config);
    }

    // Apply morph targets (will silently fail if morphs don't exist yet)
    applyFaceMorphs(meshes, config);
    applyBuildMorphs(meshes, config.build);

    // Apply material colors
    applySkinMaterial(meshes, config.skinTone);
    applyEyeMaterial(meshes, config.eyeColor);
  }, [config]);

  // Apply customizations on mount and config change
  useEffect(() => {
    applyCustomizations();
  }, [applyCustomizations]);

  // Calculate scale based on height
  const heightScale = useMemo(() => {
    const heightMeters = HEIGHT_CONFIG.toMeters(config.height);
    return heightMeters / 1.75; // 1.75m is baseline
  }, [config.height]);

  // Simple idle animation
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    switch (animation) {
      case 'idle':
        // Subtle breathing motion
        groupRef.current.position.y = Math.sin(time * 2) * 0.005;
        break;

      case 'walk':
        // Walking bob
        groupRef.current.position.y = Math.abs(Math.sin(time * 6)) * 0.02;
        groupRef.current.rotation.y = Math.sin(time * 3) * 0.05;
        break;

      case 'dance':
        // Dancing motion
        groupRef.current.position.y = Math.abs(Math.sin(time * 4)) * 0.03;
        groupRef.current.rotation.y = Math.sin(time * 2) * 0.2;
        break;

      case 'wave':
        // Subtle wave motion
        groupRef.current.rotation.y = Math.sin(time * 3) * 0.1;
        break;
    }
  });

  return (
    <group ref={groupRef} scale={heightScale}>
      <group ref={avatarRef}>
        <primitive object={clonedScene} />
        {/* Hair attachment */}
        <HairAttachment
          avatarRef={avatarRef}
          hairStyleId={config.hairStyleId}
          hairColor={config.hairColor}
          highlightColor={config.hairHighlightColor}
        />
      </group>
    </group>
  );
}

export default CustomizableAvatar;
