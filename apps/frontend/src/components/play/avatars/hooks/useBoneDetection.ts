/**
 * useBoneDetection Hook
 * Detects bone naming convention (prefix/suffix) from a Three.js scene.
 *
 * Mixamo animations use different bone naming conventions:
 * - mixamorig:Hips (with colon)
 * - mixamorigHips (without colon)
 * - Hips (no prefix)
 *
 * This hook detects the convention used by the avatar model so animations
 * can be adapted to match.
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

export type BonePrefix = 'none' | 'mixamorig' | 'mixamorig:';

export interface BoneDetectionResult {
  /** Cloned scene ready for rendering */
  clonedScene: THREE.Group;
  /** Detected bone naming prefix */
  bonePrefix: BonePrefix;
  /** Detected bone naming suffix (e.g., "_01") */
  boneSuffix: string;
  /** Ref to detected prefix for use in callbacks */
  bonePrefixRef: React.MutableRefObject<BonePrefix>;
  /** Ref to detected suffix for use in callbacks */
  boneSuffixRef: React.MutableRefObject<string>;
  /** Reference to spine bone for upper body aiming (Spine1 or Spine2) */
  spineRef: React.MutableRefObject<THREE.Bone | null>;
  /** Total bone count in skeleton */
  boneCount: number;
  /** Total skinned mesh count */
  meshCount: number;
  /** The skeleton object if found */
  skeleton: THREE.Skeleton | null;
}

export interface UseBoneDetectionOptions {
  /** Enable shadow casting on meshes */
  castShadow?: boolean;
  /** Enable shadow receiving on meshes */
  receiveShadow?: boolean;
  /** Prefer Spine2 over Spine1 for aiming (more visible effect) */
  preferSpine2?: boolean;
  /** Called when bone structure is detected */
  onBoneDetected?: (info: { prefix: BonePrefix; suffix: string; boneCount: number; meshCount: number }) => void;
}

/**
 * Detects bone naming convention from a loaded GLTF scene.
 *
 * @param originalScene - The original scene from useGLTF
 * @param options - Configuration options
 * @returns BoneDetectionResult with cloned scene and detected bone info
 *
 * @example
 * ```tsx
 * const { scene } = useGLTF('/avatar.glb');
 * const {
 *   clonedScene,
 *   bonePrefix,
 *   boneSuffix,
 *   spineRef,
 * } = useBoneDetection(scene);
 * ```
 */
export function useBoneDetection(
  originalScene: THREE.Group,
  options: UseBoneDetectionOptions = {}
): BoneDetectionResult {
  const {
    castShadow = true,
    receiveShadow = true,
    preferSpine2 = true,
    onBoneDetected,
  } = options;

  // Refs that persist across renders (for use in callbacks)
  const bonePrefixRef = useRef<BonePrefix>('none');
  const boneSuffixRef = useRef<string>('');
  const spineRef = useRef<THREE.Bone | null>(null);

  const result = useMemo(() => {
    // Clone scene for this instance (allows multiple avatars from same source)
    const clone = SkeletonUtils.clone(originalScene) as THREE.Group;

    const bones: string[] = [];
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    let foundSkeleton: THREE.Skeleton | null = null;
    let spine1Bone: THREE.Bone | null = null;
    let spine2Bone: THREE.Bone | null = null;

    clone.traverse((child) => {
      // Configure mesh shadows
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
      }

      // Collect bones
      if ((child as THREE.Bone).isBone) {
        bones.push(child.name);

        // Find spine bones for upper body aiming
        const boneName = child.name.toLowerCase();
        if (boneName.includes('spine2')) {
          spine2Bone = child as THREE.Bone;
        } else if (boneName.includes('spine1')) {
          spine1Bone = child as THREE.Bone;
        }
      }

      // Collect skinned meshes and find skeleton
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        skinnedMeshes.push(mesh);
        if (!foundSkeleton && mesh.skeleton) {
          foundSkeleton = mesh.skeleton;
        }
      }
    });

    // Detect bone prefix from Hips bone name
    const hipsBone = bones.find(b => b.toLowerCase().includes('hips'));
    let prefix: BonePrefix = 'none';
    let suffix = '';

    if (hipsBone) {
      if (hipsBone.startsWith('mixamorig:')) {
        prefix = 'mixamorig:';
      } else if (hipsBone.startsWith('mixamorig')) {
        prefix = 'mixamorig';
      }

      // Check for suffix (e.g., "_01", "_02")
      const match = hipsBone.match(/Hips(_\d+)?$/i);
      if (match && match[1]) {
        suffix = match[1];
      }
    }

    // Update refs
    bonePrefixRef.current = prefix;
    boneSuffixRef.current = suffix;

    // Set spine ref (prefer Spine2 for more visible aiming effect)
    if (preferSpine2 && spine2Bone) {
      spineRef.current = spine2Bone;
    } else if (spine1Bone) {
      spineRef.current = spine1Bone;
    } else if (spine2Bone) {
      spineRef.current = spine2Bone;
    }

    // Notify callback of bone detection
    onBoneDetected?.({
      prefix,
      suffix,
      boneCount: bones.length,
      meshCount: skinnedMeshes.length,
    });

    return {
      clonedScene: clone,
      bonePrefix: prefix,
      boneSuffix: suffix,
      boneCount: bones.length,
      meshCount: skinnedMeshes.length,
      skeleton: foundSkeleton,
    };
  }, [originalScene, castShadow, receiveShadow, preferSpine2, onBoneDetected]);

  return {
    ...result,
    bonePrefixRef,
    boneSuffixRef,
    spineRef,
  };
}

export default useBoneDetection;
