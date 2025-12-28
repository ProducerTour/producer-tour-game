/**
 * Character Utilities
 * Functions for applying materials/colors to character avatars
 *
 * NOTE: Morph target functions removed - using colors-only for MVP
 */

import * as THREE from 'three';

/**
 * Convert hex color string to THREE.Color
 */
export function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/**
 * Check if a material is PBR-compatible (MeshStandardMaterial or MeshPhysicalMaterial)
 * NOTE: Uses .type property instead of instanceof to handle multiple Three.js instances
 */
function isPBRMaterial(mat: THREE.Material | null): mat is THREE.MeshStandardMaterial {
  if (!mat) return false;
  return mat.type === 'MeshStandardMaterial' || mat.type === 'MeshPhysicalMaterial';
}

/**
 * Find all meshes (skinned or regular) in a scene/group
 */
export function findAllMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshes.push(child as THREE.Mesh);
    }
  });
  return meshes;
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
        if (isPBRMaterial(mat)) {
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
          if (isPBRMaterial(mat)) {
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
    if (isPBRMaterial(mat)) {
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
        if (isPBRMaterial(mat)) {
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
    if (isPBRMaterial(mat)) {
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
        if (isPBRMaterial(mat)) {
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
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    }
  });
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
