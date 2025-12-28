/**
 * Hair Attachment Component
 * Attaches hair models to character head bone with color tinting support
 */

import { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { HAIR_STYLES } from '../../lib/character/defaults';

// Head bone names for different skeleton types
const HEAD_BONE_NAMES = [
  'Head',
  'mixamorigHead',
  'mixamorig:Head',
  'head',
  'DEF-head',
  'Bip01_Head',
  'spine.006', // Some rigs use spine names
];

interface HairAttachmentProps {
  /** Reference to the avatar group */
  avatarRef: React.RefObject<THREE.Group>;
  /** Hair style ID (null or 'bald' = no hair) */
  hairStyleId: string | null;
  /** Primary hair color as hex string */
  hairColor: string;
  /** Optional highlight color */
  highlightColor?: string;
  /** Position offset for hair placement */
  offset?: [number, number, number];
  /** Scale multiplier */
  scale?: number;
}

/**
 * Find a bone by trying multiple naming conventions
 */
function findHeadBone(root: THREE.Object3D): THREE.Bone | null {
  let foundBone: THREE.Bone | null = null;

  root.traverse((child) => {
    if (foundBone) return;

    // Check if this is a SkinnedMesh with a skeleton
    const skinnedMesh = child as THREE.SkinnedMesh;
    if (skinnedMesh.isSkinnedMesh && skinnedMesh.skeleton) {
      for (const bone of skinnedMesh.skeleton.bones) {
        if (foundBone) continue;
        for (const name of HEAD_BONE_NAMES) {
          if (bone.name === name || bone.name.includes(name)) {
            foundBone = bone;
          }
        }
      }
    }

    // Also check direct Bone children
    if (child instanceof THREE.Bone) {
      if (foundBone) return;
      for (const name of HEAD_BONE_NAMES) {
        if (child.name === name || child.name.includes(name)) {
          foundBone = child;
          return;
        }
      }
    }
  });

  return foundBone;
}

/**
 * Convert hex color to THREE.Color
 */
function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/**
 * Create a tintable hair material
 */
function createHairMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
}

export function HairAttachment({
  avatarRef,
  hairStyleId,
  hairColor,
  highlightColor,
  offset = [0, 0, 0],
  scale = 1,
}: HairAttachmentProps) {
  // Track attached state
  const attachedHair = useRef<THREE.Object3D | null>(null);
  const attachedToBone = useRef<THREE.Bone | null>(null);
  const currentStyleId = useRef<string | null>(null);
  const attemptCount = useRef(0);

  // Get hair style configuration
  const hairStyle = useMemo(() => {
    if (!hairStyleId || hairStyleId === 'bald') return null;
    return HAIR_STYLES.find((s) => s.id === hairStyleId) ?? null;
  }, [hairStyleId]);

  // Load hair model (if we have a valid style)
  const hairGltf = useGLTF(
    hairStyle?.modelPath || '/models/Characters/Hair/short_fade.glb',
    true // Use suspense
  );

  // Track color changes
  const prevColorRef = useRef<string | null>(null);
  const prevHighlightRef = useRef<string | undefined>(undefined);

  // Memoize colors
  const primaryColor = useMemo(() => hexToColor(hairColor), [hairColor]);
  const secondaryColor = useMemo(
    () => (highlightColor ? hexToColor(highlightColor) : null),
    [highlightColor]
  );

  useFrame(() => {
    // Handle style changes - detach old hair
    if (currentStyleId.current !== hairStyleId) {
      if (attachedHair.current && attachedToBone.current) {
        attachedToBone.current.remove(attachedHair.current);

        // Dispose cloned meshes
        attachedHair.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (mesh.material) {
              const materials = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];
              materials.forEach((mat) => mat.dispose());
            }
          }
        });

        attachedHair.current = null;
        attachedToBone.current = null;
      }
      currentStyleId.current = hairStyleId;
      attemptCount.current = 0;
      prevColorRef.current = null;
    }

    // No hair to attach (bald or null)
    if (!hairStyleId || hairStyleId === 'bald' || !hairStyle) {
      return;
    }

    // Update hair color if changed (on existing hair)
    if (
      attachedHair.current &&
      (prevColorRef.current !== hairColor ||
        prevHighlightRef.current !== highlightColor)
    ) {
      attachedHair.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (material.color) {
            // Check if this is a highlight material
            const isHighlight =
              highlightColor &&
              (mesh.name.toLowerCase().includes('highlight') ||
                material.name.toLowerCase().includes('highlight') ||
                material.name.toLowerCase().includes('secondary'));

            if (isHighlight && secondaryColor) {
              material.color.copy(secondaryColor);
            } else {
              material.color.copy(primaryColor);
            }
            material.needsUpdate = true;
          }
        }
      });
      prevColorRef.current = hairColor;
      prevHighlightRef.current = highlightColor;
    }

    // Already attached, nothing more to do
    if (attachedHair.current) return;

    // Limit attempts
    if (attemptCount.current > 60) return;
    attemptCount.current++;

    // Wait for avatar
    if (!avatarRef.current) return;

    // Find head bone
    const headBone = findHeadBone(avatarRef.current);
    if (!headBone) {
      return;
    }

    // Clone the hair model
    const hairClone = hairGltf.scene.clone(true);
    hairClone.name = `Hair_${hairStyleId}`;

    // Apply transforms
    hairClone.position.set(offset[0], offset[1], offset[2]);
    hairClone.scale.setScalar(scale);

    // Apply hair color to all meshes
    hairClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Clone and replace material with our tintable one
        const newMaterial = createHairMaterial(primaryColor);
        mesh.material = newMaterial;

        // Enable shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    // Attach to head bone
    headBone.add(hairClone);

    // Store references
    attachedHair.current = hairClone;
    attachedToBone.current = headBone;
    prevColorRef.current = hairColor;
    prevHighlightRef.current = highlightColor;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (attachedHair.current && attachedToBone.current) {
        attachedToBone.current.remove(attachedHair.current);

        attachedHair.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (mesh.material) {
              const materials = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];
              materials.forEach((mat) => mat.dispose());
            }
          }
        });

        attachedHair.current = null;
        attachedToBone.current = null;
      }
    };
  }, []);

  return null;
}

// Preload all hair models for faster switching
HAIR_STYLES.forEach((style) => {
  if (style.modelPath) {
    useGLTF.preload(style.modelPath);
  }
});

export default HairAttachment;
