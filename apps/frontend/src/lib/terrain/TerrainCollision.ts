/**
 * TerrainCollision.ts
 * Implicit heightmap-based collision detection
 * No mesh colliders - directly sample heightmap for ground detection
 */

import { HeightmapGenerator } from './HeightmapGenerator';
import {
  GROUND_THRESHOLD,
  MAX_WALKABLE_SLOPE,
  NORMAL_SAMPLE_DISTANCE,
  isInWorldBounds,
  clampToWorldBounds,
} from './TerrainConfig';

// =============================================================================
// COLLISION RESULT TYPES
// =============================================================================

/**
 * Result of a terrain collision query
 */
export interface TerrainCollisionResult {
  /** Whether the position is grounded on terrain */
  grounded: boolean;

  /** Height of terrain at this position */
  height: number;

  /** Distance from position to ground (positive = above, negative = below) */
  distanceToGround: number;

  /** Surface normal at this position */
  normal: { x: number; y: number; z: number };

  /** Slope angle in radians */
  slope: number;

  /** Whether the slope is walkable */
  walkable: boolean;

  /** Whether position is within world bounds */
  inBounds: boolean;
}

/**
 * Result of a raycast against terrain
 */
export interface TerrainRaycastResult {
  /** Whether the ray hit the terrain */
  hit: boolean;

  /** World position of hit point */
  point: { x: number; y: number; z: number } | null;

  /** Distance from ray origin to hit */
  distance: number;

  /** Surface normal at hit point */
  normal: { x: number; y: number; z: number } | null;
}

/**
 * Result of a sweep test (moving object against terrain)
 */
export interface TerrainSweepResult {
  /** Whether collision occurred */
  collided: boolean;

  /** Safe position after collision response */
  position: { x: number; y: number; z: number };

  /** How much of the movement was completed (0-1) */
  fraction: number;

  /** Surface normal at collision point */
  normal: { x: number; y: number; z: number } | null;
}

// =============================================================================
// TERRAIN COLLISION CLASS
// =============================================================================

export class TerrainCollision {
  private heightmapGen: HeightmapGenerator;

  constructor(heightmapGen?: HeightmapGenerator) {
    this.heightmapGen = heightmapGen || new HeightmapGenerator();
  }

  // ===========================================================================
  // PRIMARY COLLISION QUERIES
  // ===========================================================================

  /**
   * Query terrain at a world position
   * Primary method for player ground detection
   */
  queryTerrain(worldX: number, worldY: number, worldZ: number): TerrainCollisionResult {
    // Check bounds
    const inBounds = isInWorldBounds(worldX, worldZ);

    // Clamp to bounds for sampling
    const clamped = clampToWorldBounds(worldX, worldZ);

    // Sample terrain
    const height = this.heightmapGen.sampleHeight(clamped.x, clamped.z);
    const normal = this.heightmapGen.calculateNormal(clamped.x, clamped.z, NORMAL_SAMPLE_DISTANCE);
    const slope = Math.acos(Math.max(-1, Math.min(1, normal.y)));

    // Calculate ground distance
    const distanceToGround = worldY - height;
    const grounded = distanceToGround >= 0 && distanceToGround <= GROUND_THRESHOLD;
    const walkable = slope <= MAX_WALKABLE_SLOPE;

    return {
      grounded,
      height,
      distanceToGround,
      normal,
      slope,
      walkable,
      inBounds,
    };
  }

  /**
   * Get height at a position (simple query)
   */
  getHeightAt(worldX: number, worldZ: number): number {
    const clamped = clampToWorldBounds(worldX, worldZ);
    return this.heightmapGen.sampleHeight(clamped.x, clamped.z);
  }

  /**
   * Get normal at a position
   */
  getNormalAt(worldX: number, worldZ: number): { x: number; y: number; z: number } {
    const clamped = clampToWorldBounds(worldX, worldZ);
    return this.heightmapGen.calculateNormal(clamped.x, clamped.z);
  }

  /**
   * Check if a position is on walkable terrain
   */
  isWalkable(worldX: number, worldZ: number): boolean {
    const normal = this.getNormalAt(worldX, worldZ);
    const slope = Math.acos(Math.max(-1, Math.min(1, normal.y)));
    return slope <= MAX_WALKABLE_SLOPE;
  }

  // ===========================================================================
  // RAYCAST
  // ===========================================================================

  /**
   * Raycast against terrain
   * Uses iterative stepping along the ray
   */
  raycast(
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    maxDistance: number = 1000
  ): TerrainRaycastResult {
    // Normalize direction
    const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    if (len === 0) {
      return { hit: false, point: null, distance: 0, normal: null };
    }
    dirX /= len;
    dirY /= len;
    dirZ /= len;

    // Step along ray
    const stepSize = 0.5; // meters
    const steps = Math.ceil(maxDistance / stepSize);

    let prevAbove = true;

    for (let i = 0; i <= steps; i++) {
      const t = i * stepSize;
      const x = originX + dirX * t;
      const y = originY + dirY * t;
      const z = originZ + dirZ * t;

      // Check bounds
      if (!isInWorldBounds(x, z)) {
        continue;
      }

      const height = this.getHeightAt(x, z);
      const isAbove = y > height;

      // Check for crossing
      if (!isAbove && prevAbove) {
        // We crossed the terrain - binary search for exact hit
        const hitPoint = this.refineHit(
          originX + dirX * ((i - 1) * stepSize),
          originY + dirY * ((i - 1) * stepSize),
          originZ + dirZ * ((i - 1) * stepSize),
          dirX,
          dirY,
          dirZ,
          stepSize
        );

        const normal = this.getNormalAt(hitPoint.x, hitPoint.z);

        return {
          hit: true,
          point: hitPoint,
          distance: Math.sqrt(
            (hitPoint.x - originX) ** 2 +
            (hitPoint.y - originY) ** 2 +
            (hitPoint.z - originZ) ** 2
          ),
          normal,
        };
      }

      prevAbove = isAbove;
    }

    return { hit: false, point: null, distance: maxDistance, normal: null };
  }

  /**
   * Refine raycast hit point using binary search
   */
  private refineHit(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    range: number
  ): { x: number; y: number; z: number } {
    const iterations = 8;
    let low = 0;
    let high = range;

    for (let i = 0; i < iterations; i++) {
      const mid = (low + high) / 2;
      const testX = x + dirX * mid;
      const testY = y + dirY * mid;
      const testZ = z + dirZ * mid;
      const height = this.getHeightAt(testX, testZ);

      if (testY > height) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const t = (low + high) / 2;
    const hitX = x + dirX * t;
    const hitZ = z + dirZ * t;
    const hitY = this.getHeightAt(hitX, hitZ);

    return { x: hitX, y: hitY, z: hitZ };
  }

  // ===========================================================================
  // SWEEP TEST (FOR MOVING OBJECTS)
  // ===========================================================================

  /**
   * Sweep a capsule/sphere against terrain
   * Returns collision-resolved position
   */
  sweepCapsule(
    startX: number,
    startY: number,
    startZ: number,
    endX: number,
    endY: number,
    endZ: number,
    _radius: number,
    height: number
  ): TerrainSweepResult {
    // Sample at multiple points along the movement
    const dx = endX - startX;
    const dy = endY - startY;
    const dz = endZ - startZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < 0.001) {
      // No movement
      const result = this.queryTerrain(startX, startY, startZ);
      return {
        collided: result.distanceToGround < 0,
        position: { x: startX, y: Math.max(startY, result.height + height / 2), z: startZ },
        fraction: 1,
        normal: result.distanceToGround < 0 ? result.normal : null,
      };
    }

    // Step along movement path
    const steps = Math.max(4, Math.ceil(distance));
    let collided = false;
    let collisionFraction = 1;
    let collisionNormal: { x: number; y: number; z: number } | null = null;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = startX + dx * t;
      const y = startY + dy * t;
      const z = startZ + dz * t;

      const terrainHeight = this.getHeightAt(x, z);
      const minY = terrainHeight + height / 2;

      if (y < minY) {
        collided = true;
        collisionFraction = Math.max(0, (i - 1) / steps);
        collisionNormal = this.getNormalAt(x, z);
        break;
      }
    }

    // Calculate final position
    let finalX = endX;
    let finalY = endY;
    let finalZ = endZ;

    if (collided) {
      // Slide along surface
      finalX = startX + dx * collisionFraction;
      finalZ = startZ + dz * collisionFraction;
      const terrainHeight = this.getHeightAt(finalX, finalZ);
      finalY = Math.max(endY, terrainHeight + height / 2);
    } else {
      // Check final position
      const terrainHeight = this.getHeightAt(endX, endZ);
      finalY = Math.max(endY, terrainHeight + height / 2);
    }

    return {
      collided,
      position: { x: finalX, y: finalY, z: finalZ },
      fraction: collisionFraction,
      normal: collisionNormal,
    };
  }

  // ===========================================================================
  // GROUNDING ADJUSTMENT
  // ===========================================================================

  /**
   * Snap position to ground level
   * Useful for spawning or teleporting
   */
  snapToGround(worldX: number, worldZ: number, offset: number = 0): { x: number; y: number; z: number } {
    const clamped = clampToWorldBounds(worldX, worldZ);
    const height = this.getHeightAt(clamped.x, clamped.z);
    return {
      x: clamped.x,
      y: height + offset,
      z: clamped.z,
    };
  }

  /**
   * Apply gravity with terrain collision
   * Returns new Y position after gravity is applied
   */
  applyGravity(
    worldX: number,
    worldY: number,
    worldZ: number,
    velocityY: number,
    deltaTime: number,
    capsuleHeight: number = 1.8
  ): { y: number; velocityY: number; grounded: boolean } {
    const newY = worldY + velocityY * deltaTime;
    const terrainHeight = this.getHeightAt(worldX, worldZ);
    const minY = terrainHeight + capsuleHeight / 2;

    if (newY <= minY) {
      // Hit ground
      return {
        y: minY,
        velocityY: 0,
        grounded: true,
      };
    }

    return {
      y: newY,
      velocityY,
      grounded: false,
    };
  }

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  /**
   * Set heightmap generator
   */
  setHeightmapGenerator(heightmapGen: HeightmapGenerator): void {
    this.heightmapGen = heightmapGen;
  }

  /**
   * Get heightmap generator
   */
  getHeightmapGenerator(): HeightmapGenerator {
    return this.heightmapGen;
  }
}

// Export singleton instance
export const terrainCollision = new TerrainCollision();
