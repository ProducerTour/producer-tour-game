/**
 * Morph Target Utilities
 * Functions for applying morph targets and materials to character avatars
 */

import * as THREE from 'three';
import type { CharacterConfig, BuildType } from './types';
import { MORPH_TARGET_NAMES, FACE_PRESETS } from './defaults';

/**
 * Convert hex color string to THREE.Color
 */
export function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/**
 * Find all skinned meshes in a scene/group
 */
export function findSkinnedMeshes(root: THREE.Object3D): THREE.SkinnedMesh[] {
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) {
      meshes.push(child);
    }
  });
  return meshes;
}

/**
 * Find all meshes (skinned or regular) in a scene/group
 */
export function findAllMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child);
    }
  });
  return meshes;
}

/**
 * Find a bone by name in a skeleton
 */
export function findBone(skeleton: THREE.Skeleton, boneName: string): THREE.Bone | null {
  for (const bone of skeleton.bones) {
    if (bone.name === boneName || bone.name.endsWith(boneName)) {
      return bone;
    }
  }
  return null;
}

/**
 * Find the head bone for hair attachment
 * Tries common bone naming conventions
 */
export function findHeadBone(root: THREE.Object3D): THREE.Bone | null {
  const headBoneNames = [
    'Head',
    'mixamorig:Head',
    'head',
    'DEF-head',
    'Bip01_Head',
  ];

  let headBone: THREE.Bone | null = null;

  root.traverse((child) => {
    if (child instanceof THREE.Bone) {
      for (const name of headBoneNames) {
        if (child.name === name || child.name.endsWith(name)) {
          headBone = child;
          return;
        }
      }
    }
  });

  return headBone;
}

/**
 * Get morph target index by name
 */
export function getMorphTargetIndex(
  mesh: THREE.Mesh,
  targetName: string
): number | null {
  if (!mesh.morphTargetDictionary) return null;
  const index = mesh.morphTargetDictionary[targetName];
  return typeof index === 'number' ? index : null;
}

/**
 * Set a morph target influence by name
 * Returns true if the morph target was found and set
 */
export function setMorphTarget(
  mesh: THREE.Mesh,
  targetName: string,
  influence: number
): boolean {
  const index = getMorphTargetIndex(mesh, targetName);
  if (index === null || !mesh.morphTargetInfluences) return false;

  mesh.morphTargetInfluences[index] = THREE.MathUtils.clamp(influence, 0, 1);
  return true;
}

/**
 * Convert a -1 to 1 range value to 0 to 1 morph influence
 *
 * Current morphs are "positive-only" (they only add to the base shape).
 * - value = 0: no morph applied (influence = 0)
 * - value > 0: apply morph proportionally (influence = value)
 * - value < 0: no effect (would need inverse morph targets)
 *
 * For full -1 to 1 support, we'd need pairs like "EyeSize_Larger" and "EyeSize_Smaller"
 */
export function normalizeToMorphInfluence(value: number): number {
  // Only apply positive values - negative would need inverse morphs
  return Math.max(0, value);
}

/**
 * Apply face morph targets from CharacterConfig
 */
export function applyFaceMorphs(
  meshes: THREE.Mesh[],
  config: CharacterConfig
): void {
  // Get the face preset defaults
  const preset = FACE_PRESETS.find((p) => p.id === config.facePreset);
  const presetDefaults = preset?.morphDefaults ?? {};

  // Face morph targets
  const faceMorphs: [string, number][] = [
    [MORPH_TARGET_NAMES.eyeSize, config.eyeSize],
    [MORPH_TARGET_NAMES.eyeSpacing, config.eyeSpacing],
    [MORPH_TARGET_NAMES.noseWidth, config.noseWidth],
    [MORPH_TARGET_NAMES.noseLength, config.noseLength],
    [MORPH_TARGET_NAMES.jawWidth, config.jawWidth],
    [MORPH_TARGET_NAMES.chinLength, config.chinLength],
    [MORPH_TARGET_NAMES.lipFullness, config.lipFullness],
    [MORPH_TARGET_NAMES.cheekboneHeight, config.cheekboneHeight],
  ];

  // Apply face preset first (if morphs exist)
  for (let i = 1; i <= 6; i++) {
    const presetName = MORPH_TARGET_NAMES[`facePreset_${i}` as keyof typeof MORPH_TARGET_NAMES];
    const influence = config.facePreset === i ? 1 : 0;

    for (const mesh of meshes) {
      setMorphTarget(mesh, presetName, influence);
    }
  }

  // Apply individual face morphs
  for (const [targetName, value] of faceMorphs) {
    // Combine with preset defaults (additive)
    const presetValue = presetDefaults[targetName as keyof typeof presetDefaults] ?? 0;
    const finalValue = THREE.MathUtils.clamp(value + presetValue, -1, 1);
    const influence = normalizeToMorphInfluence(finalValue);

    for (const mesh of meshes) {
      setMorphTarget(mesh, targetName, influence);
    }
  }
}

/**
 * Apply body build morph targets
 */
export function applyBuildMorphs(
  meshes: THREE.Mesh[],
  build: BuildType
): void {
  // Build morph targets - one is active at a time
  const buildMorphs: Record<BuildType, [string, number][]> = {
    slim: [
      [MORPH_TARGET_NAMES.build_slim, 1],
      [MORPH_TARGET_NAMES.build_athletic, 0],
      [MORPH_TARGET_NAMES.build_heavy, 0],
    ],
    average: [
      [MORPH_TARGET_NAMES.build_slim, 0],
      [MORPH_TARGET_NAMES.build_athletic, 0],
      [MORPH_TARGET_NAMES.build_heavy, 0],
    ],
    athletic: [
      [MORPH_TARGET_NAMES.build_slim, 0],
      [MORPH_TARGET_NAMES.build_athletic, 1],
      [MORPH_TARGET_NAMES.build_heavy, 0],
    ],
    heavy: [
      [MORPH_TARGET_NAMES.build_slim, 0],
      [MORPH_TARGET_NAMES.build_athletic, 0],
      [MORPH_TARGET_NAMES.build_heavy, 1],
    ],
  };

  const morphs = buildMorphs[build] ?? buildMorphs.average;

  for (const [targetName, influence] of morphs) {
    for (const mesh of meshes) {
      setMorphTarget(mesh, targetName, influence);
    }
  }
}

/**
 * Find materials by name pattern in meshes
 */
export function findMaterialsByName(
  meshes: THREE.Mesh[],
  namePattern: string | RegExp
): THREE.Material[] {
  const materials: THREE.Material[] = [];
  const pattern = typeof namePattern === 'string'
    ? new RegExp(namePattern, 'i')
    : namePattern;

  for (const mesh of meshes) {
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    for (const mat of meshMaterials) {
      if (mat && pattern.test(mat.name)) {
        materials.push(mat);
      }
    }
  }

  return materials;
}

/**
 * Apply skin tone to avatar materials
 */
export function applySkinMaterial(
  meshes: THREE.Mesh[],
  skinToneHex: string
): void {
  const skinColor = hexToThreeColor(skinToneHex);

  // Common skin material naming patterns
  const skinPatterns = [
    /skin/i, /body/i, /head/i, /face/i, /arm/i, /hand/i, /leg/i,
    /mb_male/i, /mb_female/i, // MB-Lab base meshes
  ];

  // Track if we found any matching mesh
  let foundSkinMesh = false;

  for (const mesh of meshes) {
    // Check mesh name for skin-related names
    const isSkinMesh = skinPatterns.some((p) => p.test(mesh.name));

    if (isSkinMesh) {
      foundSkinMesh = true;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color = skinColor;
          mat.needsUpdate = true;
        }
      }
    }
  }

  // Fallback: if no specific skin mesh found, apply to ALL meshes (excluding eyes/hair)
  if (!foundSkinMesh) {
    const excludePatterns = [/eye/i, /hair/i, /teeth/i, /tongue/i];
    for (const mesh of meshes) {
      const isExcluded = excludePatterns.some((p) => p.test(mesh.name));
      if (!isExcluded) {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.color = skinColor;
            mat.needsUpdate = true;
          }
        }
      }
    }
  }

  // Also try to find materials by name
  const skinMaterials = findMaterialsByName(meshes, /skin/i);
  for (const mat of skinMaterials) {
    if (mat instanceof THREE.MeshStandardMaterial) {
      mat.color = skinColor;
      mat.needsUpdate = true;
    }
  }
}

/**
 * Apply eye color to avatar materials
 */
export function applyEyeMaterial(
  meshes: THREE.Mesh[],
  eyeColorHex: string
): void {
  const eyeColor = hexToThreeColor(eyeColorHex);

  // Look for eye meshes
  for (const mesh of meshes) {
    if (/eye/i.test(mesh.name) && !/eyelash|eyebrow|eyelid/i.test(mesh.name)) {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const mat of materials) {
        // Only colorize iris material, not sclera (white of eye)
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (/iris/i.test(mat.name) || /pupil/i.test(mat.name) || /eye(?!.*white)/i.test(mat.name)) {
            mat.color = eyeColor;
            mat.needsUpdate = true;
          }
        }
      }
    }
  }

  // Also find iris materials directly
  const irisMaterials = findMaterialsByName(meshes, /iris|pupil/i);
  for (const mat of irisMaterials) {
    if (mat instanceof THREE.MeshStandardMaterial) {
      mat.color = eyeColor;
      mat.needsUpdate = true;
    }
  }
}

/**
 * Apply hair color to hair materials
 */
export function applyHairMaterial(
  meshes: THREE.Mesh[],
  hairColorHex: string,
  highlightColorHex?: string
): void {
  const hairColor = hexToThreeColor(hairColorHex);
  const highlightColor = highlightColorHex ? hexToThreeColor(highlightColorHex) : null;

  for (const mesh of meshes) {
    if (/hair/i.test(mesh.name)) {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (/highlight|secondary/i.test(mat.name) && highlightColor) {
            mat.color = highlightColor;
          } else {
            mat.color = hairColor;
          }
          mat.needsUpdate = true;
        }
      }
    }
  }
}

/**
 * Apply all character customizations to a loaded avatar
 */
export function applyCharacterConfig(
  avatarRoot: THREE.Object3D,
  config: CharacterConfig
): void {
  const meshes = findAllMeshes(avatarRoot);

  // Apply morph targets
  applyFaceMorphs(meshes, config);
  applyBuildMorphs(meshes, config.build);

  // Apply materials
  applySkinMaterial(meshes, config.skinTone);
  applyEyeMaterial(meshes, config.eyeColor);

  // Hair is applied separately when attached
}

/**
 * Apply height scaling to avatar
 */
export function applyHeightScale(
  avatarRoot: THREE.Object3D,
  heightValue: number // 0-1 range
): void {
  // Calculate scale factor (0.5 = 1.0x, 0 = 0.886x, 1 = 1.114x)
  const minHeight = 1.55;
  const maxHeight = 1.95;
  const defaultHeight = 1.75;

  const targetHeight = minHeight + heightValue * (maxHeight - minHeight);
  const scale = targetHeight / defaultHeight;

  avatarRoot.scale.setScalar(scale);
}

/**
 * Clone materials on meshes to avoid shared material issues
 */
export function cloneMaterials(meshes: THREE.Mesh[]): void {
  for (const mesh of meshes) {
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((mat) => mat.clone());
    } else {
      mesh.material = mesh.material.clone();
    }
  }
}

/**
 * Dispose of avatar resources
 */
export function disposeAvatar(avatarRoot: THREE.Object3D): void {
  avatarRoot.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }
  });
}

/**
 * Debug: Log all morph targets in a mesh
 */
export function logMorphTargets(mesh: THREE.Mesh): void {
  if (!mesh.morphTargetDictionary) {
    console.log(`Mesh "${mesh.name}" has no morph targets`);
    return;
  }

  console.log(`Mesh "${mesh.name}" morph targets:`);
  for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
    const influence = mesh.morphTargetInfluences?.[index] ?? 0;
    console.log(`  [${index}] ${name}: ${influence.toFixed(3)}`);
  }
}

/**
 * Debug: Log all materials in meshes
 */
export function logMaterials(meshes: THREE.Mesh[]): void {
  for (const mesh of meshes) {
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    console.log(`Mesh "${mesh.name}" materials:`);
    for (const mat of materials) {
      console.log(`  - ${mat.name} (${mat.type})`);
    }
  }
}
