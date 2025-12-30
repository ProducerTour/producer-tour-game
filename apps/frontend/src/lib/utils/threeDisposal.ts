/**
 * Three.js Resource Disposal Utilities
 *
 * Solves:
 * - GPU memory leaks from undisposed geometry/materials
 * - Texture memory not being freed
 * - Helper objects (SkeletonHelper, BoxHelper) not cleaned up
 *
 * Usage:
 *   // In useEffect cleanup:
 *   return () => {
 *     disposeObject(myMesh);
 *     disposeHelper(skeletonHelper);
 *   };
 */

import * as THREE from 'three';

/**
 * Dispose a material and all its textures
 */
export function disposeMaterial(material: THREE.Material): void {
  // Dispose textures on the material
  const mat = material as THREE.MeshStandardMaterial;

  if (mat.map) mat.map.dispose();
  if (mat.lightMap) mat.lightMap.dispose();
  if (mat.bumpMap) mat.bumpMap.dispose();
  if (mat.normalMap) mat.normalMap.dispose();
  if (mat.specularMap) (mat as THREE.MeshPhongMaterial).specularMap?.dispose();
  if (mat.envMap) mat.envMap.dispose();
  if (mat.alphaMap) mat.alphaMap.dispose();
  if (mat.aoMap) mat.aoMap.dispose();
  if (mat.displacementMap) mat.displacementMap.dispose();
  if (mat.emissiveMap) mat.emissiveMap.dispose();
  if (mat.metalnessMap) mat.metalnessMap.dispose();
  if (mat.roughnessMap) mat.roughnessMap.dispose();

  // Dispose the material itself
  material.dispose();
}

/**
 * Dispose all materials from an array or single material
 */
export function disposeMaterials(
  materials: THREE.Material | THREE.Material[] | undefined
): void {
  if (!materials) return;

  if (Array.isArray(materials)) {
    materials.forEach(disposeMaterial);
  } else {
    disposeMaterial(materials);
  }
}

/**
 * Recursively dispose all geometry and materials in an object tree
 * Use this for disposing entire models/scenes
 */
export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    // Dispose mesh geometry and materials
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      disposeMaterials(mesh.material);
    }

    // Dispose line geometry and materials
    if ((child as THREE.Line).isLine) {
      const line = child as THREE.Line;

      if (line.geometry) {
        line.geometry.dispose();
      }

      disposeMaterials(line.material);
    }

    // Dispose points geometry and materials
    if ((child as THREE.Points).isPoints) {
      const points = child as THREE.Points;

      if (points.geometry) {
        points.geometry.dispose();
      }

      disposeMaterials(points.material);
    }

    // Dispose sprite materials
    if ((child as THREE.Sprite).isSprite) {
      const sprite = child as THREE.Sprite;
      if (sprite.material) {
        disposeMaterial(sprite.material);
      }
    }
  });
}

/**
 * Dispose helper objects (SkeletonHelper, BoxHelper, etc.)
 * These have geometry and material that need explicit cleanup
 */
export function disposeHelper(
  helper: THREE.SkeletonHelper | THREE.BoxHelper | THREE.GridHelper | THREE.AxesHelper | THREE.Line | null
): void {
  if (!helper) return;

  // Remove from parent first
  helper.removeFromParent();

  // Dispose geometry
  if ((helper as THREE.LineSegments).geometry) {
    (helper as THREE.LineSegments).geometry.dispose();
  }

  // Dispose material
  if ((helper as THREE.LineSegments).material) {
    const material = (helper as THREE.LineSegments).material;
    if (Array.isArray(material)) {
      material.forEach((m) => m.dispose());
    } else {
      material.dispose();
    }
  }
}

/**
 * Dispose a debug line (used in hit detection, etc.)
 * Convenience wrapper for the common pattern
 */
export function disposeDebugLine(line: THREE.Line, scene: THREE.Scene): void {
  scene.remove(line);

  if (line.geometry) {
    line.geometry.dispose();
  }

  if (line.material) {
    if (Array.isArray(line.material)) {
      line.material.forEach((m) => m.dispose());
    } else {
      line.material.dispose();
    }
  }
}

/**
 * Dispose a render target and its textures
 */
export function disposeRenderTarget(
  renderTarget: THREE.WebGLRenderTarget | null
): void {
  if (!renderTarget) return;

  renderTarget.dispose();
}

/**
 * Dispose a texture
 */
export function disposeTexture(texture: THREE.Texture | null): void {
  if (!texture) return;
  texture.dispose();
}

/**
 * Create a disposal tracker for components
 * Tracks objects that need disposal and provides cleanup function
 *
 * Usage:
 *   const disposal = createDisposalTracker();
 *   disposal.track(myGeometry);
 *   disposal.track(myMaterial);
 *
 *   // In cleanup:
 *   disposal.disposeAll();
 */
export function createDisposalTracker() {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const objects: THREE.Object3D[] = [];

  return {
    trackGeometry(geometry: THREE.BufferGeometry): void {
      geometries.push(geometry);
    },

    trackMaterial(material: THREE.Material): void {
      materials.push(material);
    },

    trackTexture(texture: THREE.Texture): void {
      textures.push(texture);
    },

    trackObject(object: THREE.Object3D): void {
      objects.push(object);
    },

    disposeAll(): void {
      // Dispose in reverse order (objects may reference materials/geometries)
      objects.forEach(disposeObject);
      materials.forEach(disposeMaterial);
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());

      // Clear arrays
      geometries.length = 0;
      materials.length = 0;
      textures.length = 0;
      objects.length = 0;
    },

    getStats(): { geometries: number; materials: number; textures: number; objects: number } {
      return {
        geometries: geometries.length,
        materials: materials.length,
        textures: textures.length,
        objects: objects.length,
      };
    },
  };
}
