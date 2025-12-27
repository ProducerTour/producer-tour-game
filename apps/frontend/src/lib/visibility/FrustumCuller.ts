/**
 * FrustumCuller.ts
 * CPU-based frustum culling for bounding boxes and spheres
 * Used as primary culling method and fallback when GPU culling unavailable
 */

import * as THREE from 'three';
import type { FrustumPlanes, VisibilityConfig } from './types';

// Pre-allocated objects to avoid GC pressure
const _frustum = new THREE.Frustum();
const _sphere = new THREE.Sphere();
const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _size = new THREE.Vector3();

/**
 * CPU-based frustum culler
 * Extracts frustum planes from camera and tests objects against them
 */
export class FrustumCuller {
  /** Extracted frustum planes */
  private planes: FrustumPlanes;
  /** Three.js Frustum for intersection tests */
  private frustum: THREE.Frustum;
  /** Configuration */
  private config: VisibilityConfig;
  /** Cached projection-view matrix */
  private projViewMatrix: THREE.Matrix4;

  constructor(config: VisibilityConfig) {
    this.config = config;
    this.frustum = new THREE.Frustum();
    this.projViewMatrix = new THREE.Matrix4();
    this.planes = {
      left: new THREE.Plane(),
      right: new THREE.Plane(),
      top: new THREE.Plane(),
      bottom: new THREE.Plane(),
      near: new THREE.Plane(),
      far: new THREE.Plane(),
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: VisibilityConfig): void {
    this.config = config;
  }

  /**
   * Extract frustum planes from camera
   * Call this once per frame before culling tests
   */
  updateFromCamera(camera: THREE.Camera): void {
    // Compute projection-view matrix
    this.projViewMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );

    // Update Three.js frustum
    this.frustum.setFromProjectionMatrix(this.projViewMatrix);

    // Copy planes for direct access if needed
    this.planes.left.copy(this.frustum.planes[0]);
    this.planes.right.copy(this.frustum.planes[1]);
    this.planes.top.copy(this.frustum.planes[2]);
    this.planes.bottom.copy(this.frustum.planes[3]);
    this.planes.near.copy(this.frustum.planes[4]);
    this.planes.far.copy(this.frustum.planes[5]);
  }

  /**
   * Test if a bounding box is inside or intersecting the frustum
   * @param box - Axis-aligned bounding box in world space
   * @param applyMargin - Apply conservative margin (default: true)
   * @returns true if visible (inside or intersecting frustum)
   */
  testBox(box: THREE.Box3, applyMargin = true): boolean {
    if (applyMargin && this.config.conservativeMargin !== 1.0) {
      // Expand box by margin
      _box.copy(box);
      _box.getCenter(_center);
      _box.getSize(_size);
      _size.multiplyScalar(this.config.conservativeMargin);
      _box.setFromCenterAndSize(_center, _size);
      return this.frustum.intersectsBox(_box);
    }
    return this.frustum.intersectsBox(box);
  }

  /**
   * Test if a bounding sphere is inside or intersecting the frustum
   * @param sphere - Bounding sphere in world space
   * @param applyMargin - Apply conservative margin (default: true)
   * @returns true if visible (inside or intersecting frustum)
   */
  testSphere(sphere: THREE.Sphere, applyMargin = true): boolean {
    if (applyMargin && this.config.conservativeMargin !== 1.0) {
      _sphere.copy(sphere);
      _sphere.radius *= this.config.conservativeMargin;
      return this.frustum.intersectsSphere(_sphere);
    }
    return this.frustum.intersectsSphere(sphere);
  }

  /**
   * Test a point against the frustum
   * @param point - Point in world space
   * @returns true if point is inside frustum
   */
  testPoint(point: THREE.Vector3): boolean {
    return this.frustum.containsPoint(point);
  }

  /**
   * Get minimum distance from point to nearest frustum plane
   * Used for temporal coherence - objects far from edges are stable
   * @param point - Point in world space
   * @returns Distance to nearest plane (negative if outside)
   */
  getDistanceToNearestPlane(point: THREE.Vector3): number {
    let minDistance = Infinity;

    for (const plane of this.frustum.planes) {
      const distance = plane.distanceToPoint(point);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * Test multiple boxes in batch (optimized)
   * @param boxes - Array of bounding boxes
   * @returns Array of visibility results (same order as input)
   */
  testBoxBatch(boxes: THREE.Box3[]): boolean[] {
    const results: boolean[] = new Array(boxes.length);
    const margin = this.config.conservativeMargin;
    const applyMargin = margin !== 1.0;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (applyMargin) {
        _box.copy(box);
        _box.getCenter(_center);
        _box.getSize(_size);
        _size.multiplyScalar(margin);
        _box.setFromCenterAndSize(_center, _size);
        results[i] = this.frustum.intersectsBox(_box);
      } else {
        results[i] = this.frustum.intersectsBox(box);
      }
    }

    return results;
  }

  /**
   * Test sphere-frustum intersection with distance to planes
   * Returns visibility and margin info for temporal coherence
   */
  testSphereWithMargin(sphere: THREE.Sphere): {
    visible: boolean;
    margin: number;
  } {
    const margin = this.config.conservativeMargin;
    const testRadius = sphere.radius * margin;

    let minMargin = Infinity;
    let visible = true;

    for (const plane of this.frustum.planes) {
      const distance = plane.distanceToPoint(sphere.center);
      const planeMargin = distance + testRadius;

      if (planeMargin < 0) {
        // Completely outside this plane
        visible = false;
        minMargin = planeMargin;
        break;
      }

      if (planeMargin < minMargin) {
        minMargin = planeMargin;
      }
    }

    return { visible, margin: minMargin };
  }

  /**
   * Get the frustum planes (for external use)
   */
  getPlanes(): FrustumPlanes {
    return this.planes;
  }

  /**
   * Get the projection-view matrix
   */
  getProjectionViewMatrix(): THREE.Matrix4 {
    return this.projViewMatrix;
  }

  /**
   * Create chunk bounding box from chunk coordinates
   * @param chunkX - Chunk X coordinate
   * @param chunkZ - Chunk Z coordinate
   * @param chunkSize - Size of chunk in world units
   * @param worldSize - Total world size
   * @param minHeight - Minimum terrain height
   * @param maxHeight - Maximum terrain height
   */
  static createChunkBounds(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    worldSize: number,
    minHeight: number,
    maxHeight: number
  ): THREE.Box3 {
    const worldX = chunkX * chunkSize - worldSize / 2;
    const worldZ = chunkZ * chunkSize - worldSize / 2;

    return new THREE.Box3(
      new THREE.Vector3(worldX, minHeight, worldZ),
      new THREE.Vector3(worldX + chunkSize, maxHeight, worldZ + chunkSize)
    );
  }

  /**
   * Create bounding sphere from chunk coordinates
   */
  static createChunkSphere(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    worldSize: number,
    minHeight: number,
    maxHeight: number
  ): THREE.Sphere {
    const worldX = chunkX * chunkSize - worldSize / 2 + chunkSize / 2;
    const worldZ = chunkZ * chunkSize - worldSize / 2 + chunkSize / 2;
    const heightMid = (minHeight + maxHeight) / 2;
    const heightRange = maxHeight - minHeight;

    // Sphere radius: diagonal of chunk box
    const radius = Math.sqrt(
      chunkSize * chunkSize * 0.5 + // XZ diagonal
      heightRange * heightRange * 0.25 // Y extent
    );

    return new THREE.Sphere(
      new THREE.Vector3(worldX, heightMid, worldZ),
      radius
    );
  }
}

/**
 * Extract frustum planes from a projection-view matrix
 * Standalone function for use without FrustumCuller instance
 */
export function extractFrustumPlanes(
  projViewMatrix: THREE.Matrix4
): THREE.Plane[] {
  _frustum.setFromProjectionMatrix(projViewMatrix);
  return _frustum.planes.map((p) => p.clone());
}

/**
 * Test sphere against frustum planes (standalone)
 */
export function sphereInFrustum(
  sphere: THREE.Sphere,
  planes: THREE.Plane[]
): boolean {
  for (const plane of planes) {
    if (plane.distanceToPoint(sphere.center) < -sphere.radius) {
      return false;
    }
  }
  return true;
}

/**
 * Test box against frustum planes (standalone)
 */
export function boxInFrustum(box: THREE.Box3, planes: THREE.Plane[]): boolean {
  _frustum.planes = planes as [
    THREE.Plane,
    THREE.Plane,
    THREE.Plane,
    THREE.Plane,
    THREE.Plane,
    THREE.Plane
  ];
  return _frustum.intersectsBox(box);
}
