/**
 * MeshSimplifier.ts
 * Runtime mesh decimation for LOD generation
 *
 * Uses a quadric error metric simplification algorithm.
 * This is a simplified implementation suitable for tree/vegetation meshes.
 */

import * as THREE from 'three';
import type { SimplifyOptions, SimplifiedGeometry } from './types';
import { DEFAULT_SIMPLIFY_OPTIONS } from './types';

/**
 * Vertex with quadric error data
 */
interface SimplifyVertex {
  position: THREE.Vector3;
  quadric: number[];
  neighbors: Set<number>;
  faces: Set<number>;
  collapsed: boolean;
}

/**
 * Edge for collapse candidate
 */
interface CollapseCandidate {
  v1: number;
  v2: number;
  error: number;
  targetPosition: THREE.Vector3;
}

/**
 * MeshSimplifier performs runtime mesh decimation
 */
export class MeshSimplifier {
  private debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  /**
   * Simplify a BufferGeometry to a target triangle ratio
   */
  simplify(
    geometry: THREE.BufferGeometry,
    options: Partial<SimplifyOptions> = {}
  ): SimplifiedGeometry {
    const startTime = performance.now();
    const opts = { ...DEFAULT_SIMPLIFY_OPTIONS, ...options };

    // Clone geometry to avoid modifying original
    const clonedGeo = geometry.clone();

    // Get geometry data
    const positionAttr = clonedGeo.getAttribute('position');
    if (!positionAttr) {
      throw new Error('Geometry has no position attribute');
    }

    const positions = positionAttr.array as Float32Array;
    const indices = clonedGeo.index?.array as Uint32Array | Uint16Array | undefined;

    // Calculate original triangle count
    const originalTriangles = indices
      ? indices.length / 3
      : positions.length / 9;

    // Target triangle count
    const targetTriangles = Math.max(
      4,
      Math.floor(originalTriangles * opts.targetRatio)
    );

    if (this.debug) {
      console.log(
        `[MeshSimplifier] Simplifying ${originalTriangles} → ${targetTriangles} triangles`
      );
    }

    // For very small meshes or high target ratios, skip simplification
    if (originalTriangles <= targetTriangles || originalTriangles < 12) {
      return {
        geometry: clonedGeo,
        originalTriangles,
        simplifiedTriangles: originalTriangles,
        reductionRatio: 1.0,
      };
    }

    // Perform edge collapse simplification
    const simplified = this.edgeCollapseSimplify(
      clonedGeo,
      targetTriangles,
      opts.lockBoundary
    );

    const simplifiedTriangles = simplified.index
      ? simplified.index.count / 3
      : (simplified.getAttribute('position')?.count ?? 0) / 3;

    const endTime = performance.now();

    if (this.debug) {
      console.log(
        `[MeshSimplifier] Completed in ${(endTime - startTime).toFixed(1)}ms: ` +
          `${originalTriangles} → ${simplifiedTriangles} triangles`
      );
    }

    return {
      geometry: simplified,
      originalTriangles,
      simplifiedTriangles,
      reductionRatio: simplifiedTriangles / originalTriangles,
    };
  }

  /**
   * Edge collapse simplification algorithm
   */
  private edgeCollapseSimplify(
    geometry: THREE.BufferGeometry,
    targetTriangles: number,
    lockBoundary: boolean
  ): THREE.BufferGeometry {
    const positionAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const uvAttr = geometry.getAttribute('uv');

    const positions = Array.from(positionAttr.array) as number[];
    const normals = normalAttr
      ? (Array.from(normalAttr.array) as number[])
      : null;
    const uvs = uvAttr ? (Array.from(uvAttr.array) as number[]) : null;

    let indices: number[];
    if (geometry.index) {
      indices = Array.from(geometry.index.array);
    } else {
      // Create indices for non-indexed geometry
      indices = [];
      for (let i = 0; i < positions.length / 3; i++) {
        indices.push(i);
      }
    }

    // Build vertex and face data structures
    const vertexCount = positions.length / 3;
    const vertices: SimplifyVertex[] = [];

    for (let i = 0; i < vertexCount; i++) {
      vertices.push({
        position: new THREE.Vector3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        ),
        quadric: new Array(10).fill(0),
        neighbors: new Set(),
        faces: new Set(),
        collapsed: false,
      });
    }

    // Build face connectivity
    const faces: number[][] = [];
    for (let i = 0; i < indices.length; i += 3) {
      const faceIdx = faces.length;
      const v0 = indices[i];
      const v1 = indices[i + 1];
      const v2 = indices[i + 2];

      faces.push([v0, v1, v2]);

      vertices[v0].faces.add(faceIdx);
      vertices[v1].faces.add(faceIdx);
      vertices[v2].faces.add(faceIdx);

      vertices[v0].neighbors.add(v1).add(v2);
      vertices[v1].neighbors.add(v0).add(v2);
      vertices[v2].neighbors.add(v0).add(v1);
    }

    // Compute quadric error matrices for each vertex
    this.computeQuadrics(vertices, faces);

    // Find boundary edges if lockBoundary is enabled
    const boundaryVertices = new Set<number>();
    if (lockBoundary) {
      this.findBoundaryVertices(vertices, faces, boundaryVertices);
    }

    // Iteratively collapse edges until target reached
    let currentTriangles = faces.length;
    const removedFaces = new Set<number>();

    while (currentTriangles > targetTriangles) {
      // Find best edge to collapse
      const candidate = this.findBestCollapse(
        vertices,
        faces,
        removedFaces,
        boundaryVertices
      );

      if (!candidate) {
        break; // No more valid collapses
      }

      // Perform collapse
      const removedCount = this.collapseEdge(
        vertices,
        faces,
        removedFaces,
        candidate
      );

      currentTriangles -= removedCount;
    }

    // Build new geometry from remaining faces
    return this.buildSimplifiedGeometry(
      vertices,
      faces,
      removedFaces,
      normals,
      uvs,
      positions
    );
  }

  /**
   * Compute quadric error matrices for vertices
   */
  private computeQuadrics(
    vertices: SimplifyVertex[],
    faces: number[][]
  ): void {
    const tempVec1 = new THREE.Vector3();
    const tempVec2 = new THREE.Vector3();

    for (let i = 0; i < faces.length; i++) {
      const [v0, v1, v2] = faces[i];
      const p0 = vertices[v0].position;
      const p1 = vertices[v1].position;
      const p2 = vertices[v2].position;

      // Compute face plane: ax + by + cz + d = 0
      tempVec1.subVectors(p1, p0);
      tempVec2.subVectors(p2, p0);
      const normal = new THREE.Vector3().crossVectors(tempVec1, tempVec2);

      if (normal.lengthSq() < 1e-10) continue;
      normal.normalize();

      const a = normal.x;
      const b = normal.y;
      const c = normal.z;
      const d = -normal.dot(p0);

      // Quadric matrix components (symmetric 4x4 stored as 10 elements)
      const q = [
        a * a,
        a * b,
        a * c,
        a * d,
        b * b,
        b * c,
        b * d,
        c * c,
        c * d,
        d * d,
      ];

      // Add to vertex quadrics
      for (let j = 0; j < 10; j++) {
        vertices[v0].quadric[j] += q[j];
        vertices[v1].quadric[j] += q[j];
        vertices[v2].quadric[j] += q[j];
      }
    }
  }

  /**
   * Find boundary vertices (edges with only one adjacent face)
   */
  private findBoundaryVertices(
    _vertices: SimplifyVertex[],
    faces: number[][],
    boundaryVertices: Set<number>
  ): void {
    const edgeFaceCount = new Map<string, number>();

    for (let i = 0; i < faces.length; i++) {
      const [v0, v1, v2] = faces[i];
      const edges = [
        [Math.min(v0, v1), Math.max(v0, v1)],
        [Math.min(v1, v2), Math.max(v1, v2)],
        [Math.min(v2, v0), Math.max(v2, v0)],
      ];

      for (const [a, b] of edges) {
        const key = `${a}-${b}`;
        edgeFaceCount.set(key, (edgeFaceCount.get(key) ?? 0) + 1);
      }
    }

    for (const [key, count] of edgeFaceCount) {
      if (count === 1) {
        const [a, b] = key.split('-').map(Number);
        boundaryVertices.add(a);
        boundaryVertices.add(b);
      }
    }
  }

  /**
   * Find the best edge to collapse based on quadric error
   */
  private findBestCollapse(
    vertices: SimplifyVertex[],
    _faces: number[][],
    _removedFaces: Set<number>,
    boundaryVertices: Set<number>
  ): CollapseCandidate | null {
    let best: CollapseCandidate | null = null;
    let bestError = Infinity;

    for (let i = 0; i < vertices.length; i++) {
      if (vertices[i].collapsed) continue;
      if (boundaryVertices.has(i)) continue;

      for (const j of vertices[i].neighbors) {
        if (j <= i) continue; // Avoid checking same edge twice
        if (vertices[j].collapsed) continue;
        if (boundaryVertices.has(j)) continue;

        // Calculate collapse error
        const { error, position } = this.calculateCollapseError(
          vertices[i],
          vertices[j]
        );

        if (error < bestError) {
          bestError = error;
          best = {
            v1: i,
            v2: j,
            error,
            targetPosition: position,
          };
        }
      }
    }

    return best;
  }

  /**
   * Calculate error for collapsing two vertices
   */
  private calculateCollapseError(
    v1: SimplifyVertex,
    v2: SimplifyVertex
  ): { error: number; position: THREE.Vector3 } {
    // Combined quadric
    const q = new Array(10);
    for (let i = 0; i < 10; i++) {
      q[i] = v1.quadric[i] + v2.quadric[i];
    }

    // Try midpoint as target position
    const position = new THREE.Vector3()
      .addVectors(v1.position, v2.position)
      .multiplyScalar(0.5);

    // Calculate quadric error at this position
    const x = position.x;
    const y = position.y;
    const z = position.z;

    const error =
      q[0] * x * x +
      2 * q[1] * x * y +
      2 * q[2] * x * z +
      2 * q[3] * x +
      q[4] * y * y +
      2 * q[5] * y * z +
      2 * q[6] * y +
      q[7] * z * z +
      2 * q[8] * z +
      q[9];

    return { error: Math.abs(error), position };
  }

  /**
   * Collapse an edge by merging v2 into v1
   */
  private collapseEdge(
    vertices: SimplifyVertex[],
    faces: number[][],
    removedFaces: Set<number>,
    candidate: CollapseCandidate
  ): number {
    const { v1, v2, targetPosition } = candidate;

    // Move v1 to target position
    vertices[v1].position.copy(targetPosition);

    // Combine quadrics
    for (let i = 0; i < 10; i++) {
      vertices[v1].quadric[i] += vertices[v2].quadric[i];
    }

    // Mark v2 as collapsed
    vertices[v2].collapsed = true;

    // Update faces: replace v2 with v1
    let removedCount = 0;

    for (const faceIdx of vertices[v2].faces) {
      if (removedFaces.has(faceIdx)) continue;

      const face = faces[faceIdx];
      const v2Index = face.indexOf(v2);
      if (v2Index === -1) continue;

      // Check if this makes a degenerate face
      if (face.includes(v1)) {
        // Face becomes degenerate, remove it
        removedFaces.add(faceIdx);
        removedCount++;

        // Update neighbors
        for (const v of face) {
          if (v !== v2 && !vertices[v].collapsed) {
            vertices[v].faces.delete(faceIdx);
          }
        }
      } else {
        // Replace v2 with v1
        face[v2Index] = v1;
        vertices[v1].faces.add(faceIdx);
      }
    }

    // Transfer neighbors from v2 to v1
    for (const n of vertices[v2].neighbors) {
      if (n !== v1 && !vertices[n].collapsed) {
        vertices[v1].neighbors.add(n);
        vertices[n].neighbors.delete(v2);
        vertices[n].neighbors.add(v1);
      }
    }

    vertices[v1].neighbors.delete(v2);

    return removedCount;
  }

  /**
   * Build final simplified geometry
   */
  private buildSimplifiedGeometry(
    vertices: SimplifyVertex[],
    faces: number[][],
    removedFaces: Set<number>,
    originalNormals: number[] | null,
    originalUvs: number[] | null,
    _originalPositions: number[]
  ): THREE.BufferGeometry {
    // Build vertex remapping (old index → new index)
    const vertexRemap = new Map<number, number>();
    const newPositions: number[] = [];
    const newNormals: number[] = [];
    const newUvs: number[] = [];

    let newIndex = 0;
    for (let i = 0; i < vertices.length; i++) {
      if (!vertices[i].collapsed && vertices[i].faces.size > 0) {
        vertexRemap.set(i, newIndex);
        const pos = vertices[i].position;
        newPositions.push(pos.x, pos.y, pos.z);

        if (originalNormals) {
          newNormals.push(
            originalNormals[i * 3],
            originalNormals[i * 3 + 1],
            originalNormals[i * 3 + 2]
          );
        }

        if (originalUvs) {
          newUvs.push(originalUvs[i * 2], originalUvs[i * 2 + 1]);
        }

        newIndex++;
      }
    }

    // Build new indices
    const newIndices: number[] = [];
    for (let i = 0; i < faces.length; i++) {
      if (removedFaces.has(i)) continue;

      const face = faces[i];
      const i0 = vertexRemap.get(face[0]);
      const i1 = vertexRemap.get(face[1]);
      const i2 = vertexRemap.get(face[2]);

      if (i0 !== undefined && i1 !== undefined && i2 !== undefined) {
        newIndices.push(i0, i1, i2);
      }
    }

    // Create new geometry
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(newPositions, 3)
    );

    if (newNormals.length > 0) {
      newGeometry.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(newNormals, 3)
      );
    } else {
      newGeometry.computeVertexNormals();
    }

    if (newUvs.length > 0) {
      newGeometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(newUvs, 2)
      );
    }

    newGeometry.setIndex(newIndices);
    newGeometry.computeBoundingSphere();
    newGeometry.computeBoundingBox();

    return newGeometry;
  }
}

/**
 * Singleton simplifier instance
 */
let simplifierInstance: MeshSimplifier | null = null;

/**
 * Get or create the mesh simplifier instance
 */
export function getMeshSimplifier(debug = false): MeshSimplifier {
  if (!simplifierInstance) {
    simplifierInstance = new MeshSimplifier(debug);
  }
  return simplifierInstance;
}

/**
 * Reset the simplifier instance (for testing)
 */
export function resetMeshSimplifier(): void {
  simplifierInstance = null;
}
