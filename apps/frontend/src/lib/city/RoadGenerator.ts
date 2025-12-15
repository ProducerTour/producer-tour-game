/**
 * Road Generator
 * Creates 3D geometry for roads, sidewalks, and intersections
 */

import * as THREE from 'three';
import { type RoadSegment, type IntersectionNode, type RoadType } from './CityLayout';
import { ROAD_CONFIG } from './CityConfig';
import { noiseGenerator } from './NoiseGenerator';

// Road material colors
const ROAD_COLORS = {
  boulevard: '#2d2d2d', // Dark asphalt
  street: '#3a3a3a', // Slightly lighter
  alley: '#454545', // Light asphalt
  sidewalk: '#9ca3af', // Gray concrete
  marking: '#f3f4f6', // White road markings
  yellow: '#fbbf24', // Yellow center line
};

// Road segment mesh data
export interface RoadMeshData {
  roadGeometry: THREE.BufferGeometry;
  sidewalkGeometry: THREE.BufferGeometry;
  markingsGeometry: THREE.BufferGeometry;
}

/**
 * Generate road mesh for a single segment
 */
export function generateRoadSegmentMesh(road: RoadSegment): RoadMeshData {
  const { start, end, width } = road;

  // Road vertices (rectangle along the road)
  const halfWidth = width / 2;
  const sidewalkWidth = ROAD_CONFIG.SIDEWALK_WIDTH;

  // Get terrain heights at road endpoints and middle
  const startHeight = noiseGenerator.getTerrainHeight(start.x, start.z, 0) + 0.1;
  const endHeight = noiseGenerator.getTerrainHeight(end.x, end.z, 0) + 0.1;

  // Road surface geometry
  const roadGeo = createRoadPlane(start, end, halfWidth, startHeight, endHeight);

  // Sidewalk geometries (one on each side)
  const sidewalkGeo = createSidewalkGeometry(
    start,
    end,
    halfWidth,
    sidewalkWidth,
    startHeight,
    endHeight
  );

  // Road markings
  const markingsGeo = createMarkingsGeometry(road, start, end, halfWidth, startHeight, endHeight);

  return {
    roadGeometry: roadGeo,
    sidewalkGeometry: sidewalkGeo,
    markingsGeometry: markingsGeo,
  };
}

/**
 * Create road surface plane
 */
function createRoadPlane(
  start: { x: number; z: number },
  end: { x: number; z: number },
  halfWidth: number,
  startHeight: number,
  endHeight: number
): THREE.BufferGeometry {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dz * dz);

  // Perpendicular direction for width
  const perpX = -dz / length;
  const perpZ = dx / length;

  // Create vertices
  const vertices = new Float32Array([
    // Start left
    start.x + perpX * halfWidth,
    startHeight,
    start.z + perpZ * halfWidth,
    // Start right
    start.x - perpX * halfWidth,
    startHeight,
    start.z - perpZ * halfWidth,
    // End right
    end.x - perpX * halfWidth,
    endHeight,
    end.z - perpZ * halfWidth,
    // End left
    end.x + perpX * halfWidth,
    endHeight,
    end.z + perpZ * halfWidth,
  ]);

  // UVs for texturing
  const uvs = new Float32Array([0, 0, 1, 0, 1, length / halfWidth, 0, length / halfWidth]);

  // Indices for two triangles
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  // Normals (pointing up)
  const normals = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return geometry;
}

/**
 * Create sidewalk geometry on both sides of road
 */
function createSidewalkGeometry(
  start: { x: number; z: number },
  end: { x: number; z: number },
  halfWidth: number,
  sidewalkWidth: number,
  startHeight: number,
  endHeight: number
): THREE.BufferGeometry {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dz * dz);

  const perpX = -dz / length;
  const perpZ = dx / length;

  const sidewalkHeight = 0.15; // Curb height

  // Left sidewalk vertices
  const leftVertices = [
    // Outer edge
    start.x + perpX * (halfWidth + sidewalkWidth),
    startHeight + sidewalkHeight,
    start.z + perpZ * (halfWidth + sidewalkWidth),
    // Inner edge (curb)
    start.x + perpX * halfWidth,
    startHeight + sidewalkHeight,
    start.z + perpZ * halfWidth,
    // End inner
    end.x + perpX * halfWidth,
    endHeight + sidewalkHeight,
    end.z + perpZ * halfWidth,
    // End outer
    end.x + perpX * (halfWidth + sidewalkWidth),
    endHeight + sidewalkHeight,
    end.z + perpZ * (halfWidth + sidewalkWidth),
  ];

  // Right sidewalk vertices
  const rightVertices = [
    // Inner edge (curb)
    start.x - perpX * halfWidth,
    startHeight + sidewalkHeight,
    start.z - perpZ * halfWidth,
    // Outer edge
    start.x - perpX * (halfWidth + sidewalkWidth),
    startHeight + sidewalkHeight,
    start.z - perpZ * (halfWidth + sidewalkWidth),
    // End outer
    end.x - perpX * (halfWidth + sidewalkWidth),
    endHeight + sidewalkHeight,
    end.z - perpZ * (halfWidth + sidewalkWidth),
    // End inner
    end.x - perpX * halfWidth,
    endHeight + sidewalkHeight,
    end.z - perpZ * halfWidth,
  ];

  const vertices = new Float32Array([...leftVertices, ...rightVertices]);
  const indices = new Uint16Array([
    // Left sidewalk
    0, 1, 2, 0, 2, 3,
    // Right sidewalk
    4, 5, 6, 4, 6, 7,
  ]);

  const normals = new Float32Array(24);
  for (let i = 0; i < 8; i++) {
    normals[i * 3] = 0;
    normals[i * 3 + 1] = 1;
    normals[i * 3 + 2] = 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return geometry;
}

/**
 * Create road markings (center lines, lane markers)
 */
function createMarkingsGeometry(
  road: RoadSegment,
  start: { x: number; z: number },
  end: { x: number; z: number },
  halfWidth: number,
  startHeight: number,
  endHeight: number
): THREE.BufferGeometry {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dz * dz);

  const perpX = -dz / length;
  const perpZ = dx / length;

  const dirX = dx / length;
  const dirZ = dz / length;

  const markingWidth = 0.2;
  const markingHeight = 0.02; // Slightly above road

  const vertices: number[] = [];
  const indices: number[] = [];
  let vertexIndex = 0;

  // Center line (dashed for boulevards, solid for others)
  if (road.type === 'boulevard' || road.type === 'street') {
    const dashLength = 3;
    const gapLength = 2;
    const totalLength = dashLength + gapLength;
    const numDashes = Math.floor(length / totalLength);

    for (let i = 0; i < numDashes; i++) {
      const dashStart = i * totalLength;
      const dashEnd = dashStart + dashLength;

      const t1 = dashStart / length;
      const t2 = dashEnd / length;

      const x1 = start.x + dirX * dashStart;
      const z1 = start.z + dirZ * dashStart;
      const y1 = startHeight + (endHeight - startHeight) * t1 + markingHeight;

      const x2 = start.x + dirX * dashEnd;
      const z2 = start.z + dirZ * dashEnd;
      const y2 = startHeight + (endHeight - startHeight) * t2 + markingHeight;

      // Add dash vertices
      vertices.push(
        x1 + perpX * markingWidth / 2, y1, z1 + perpZ * markingWidth / 2,
        x1 - perpX * markingWidth / 2, y1, z1 - perpZ * markingWidth / 2,
        x2 - perpX * markingWidth / 2, y2, z2 - perpZ * markingWidth / 2,
        x2 + perpX * markingWidth / 2, y2, z2 + perpZ * markingWidth / 2
      );

      indices.push(
        vertexIndex, vertexIndex + 1, vertexIndex + 2,
        vertexIndex, vertexIndex + 2, vertexIndex + 3
      );
      vertexIndex += 4;
    }
  }

  // Edge lines for boulevards
  if (road.type === 'boulevard') {
    const edgeOffset = halfWidth - 0.5;

    // Left edge
    for (let side = -1; side <= 1; side += 2) {
      vertices.push(
        start.x + perpX * (edgeOffset * side + markingWidth / 2),
        startHeight + markingHeight,
        start.z + perpZ * (edgeOffset * side + markingWidth / 2),

        start.x + perpX * (edgeOffset * side - markingWidth / 2),
        startHeight + markingHeight,
        start.z + perpZ * (edgeOffset * side - markingWidth / 2),

        end.x + perpX * (edgeOffset * side - markingWidth / 2),
        endHeight + markingHeight,
        end.z + perpZ * (edgeOffset * side - markingWidth / 2),

        end.x + perpX * (edgeOffset * side + markingWidth / 2),
        endHeight + markingHeight,
        end.z + perpZ * (edgeOffset * side + markingWidth / 2)
      );

      indices.push(
        vertexIndex, vertexIndex + 1, vertexIndex + 2,
        vertexIndex, vertexIndex + 2, vertexIndex + 3
      );
      vertexIndex += 4;
    }
  }

  if (vertices.length === 0) {
    // Return empty geometry if no markings
    return new THREE.BufferGeometry();
  }

  const normals = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length / 3; i++) {
    normals[i * 3] = 0;
    normals[i * 3 + 1] = 1;
    normals[i * 3 + 2] = 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));

  return geometry;
}

/**
 * Generate intersection mesh
 */
export function generateIntersectionMesh(
  intersection: IntersectionNode,
  roads: RoadSegment[]
): THREE.BufferGeometry {
  // Find connected roads
  const connectedRoads = roads.filter((r) =>
    intersection.connectedRoads.includes(r.id)
  );

  if (connectedRoads.length < 2) {
    return new THREE.BufferGeometry();
  }

  // Find the maximum road width for intersection size
  const maxWidth = Math.max(...connectedRoads.map((r) => r.width));
  const intersectionSize = maxWidth + ROAD_CONFIG.SIDEWALK_WIDTH * 2;

  // Create a simple square intersection
  const { x, z } = intersection.position;
  const half = intersectionSize / 2;
  const height = noiseGenerator.getTerrainHeight(x, z, 0) + 0.1;

  const vertices = new Float32Array([
    x - half, height, z - half,
    x + half, height, z - half,
    x + half, height, z + half,
    x - half, height, z + half,
  ]);

  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const normals = new Float32Array([
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return geometry;
}

/**
 * Merge multiple road geometries for instanced rendering
 */
export function mergeRoadGeometries(
  roads: RoadSegment[]
): {
  road: THREE.BufferGeometry;
  sidewalk: THREE.BufferGeometry;
  markings: THREE.BufferGeometry;
} {
  const roadGeometries: THREE.BufferGeometry[] = [];
  const sidewalkGeometries: THREE.BufferGeometry[] = [];
  const markingsGeometries: THREE.BufferGeometry[] = [];

  for (const road of roads) {
    const meshData = generateRoadSegmentMesh(road);
    roadGeometries.push(meshData.roadGeometry);
    sidewalkGeometries.push(meshData.sidewalkGeometry);
    if (meshData.markingsGeometry.attributes.position) {
      markingsGeometries.push(meshData.markingsGeometry);
    }
  }

  return {
    road: mergeBufferGeometries(roadGeometries),
    sidewalk: mergeBufferGeometries(sidewalkGeometries),
    markings: mergeBufferGeometries(markingsGeometries),
  };
}

/**
 * Helper to merge multiple buffer geometries
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) {
    return new THREE.BufferGeometry();
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  // Calculate total vertex and index counts
  let totalVertices = 0;
  let totalIndices = 0;

  for (const geo of geometries) {
    if (geo.attributes.position) {
      totalVertices += geo.attributes.position.count;
    }
    if (geo.index) {
      totalIndices += geo.index.count;
    }
  }

  const mergedPositions = new Float32Array(totalVertices * 3);
  const mergedNormals = new Float32Array(totalVertices * 3);
  const mergedIndices = new Uint32Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;
  let baseVertex = 0;

  for (const geo of geometries) {
    if (!geo.attributes.position) continue;

    const positions = geo.attributes.position.array as Float32Array;
    mergedPositions.set(positions, vertexOffset * 3);

    if (geo.attributes.normal) {
      const normals = geo.attributes.normal.array as Float32Array;
      mergedNormals.set(normals, vertexOffset * 3);
    }

    if (geo.index) {
      const indices = geo.index.array;
      for (let i = 0; i < indices.length; i++) {
        mergedIndices[indexOffset + i] = indices[i] + baseVertex;
      }
      indexOffset += indices.length;
    }

    baseVertex += geo.attributes.position.count;
    vertexOffset += geo.attributes.position.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3));
  merged.setIndex(new THREE.BufferAttribute(mergedIndices, 1));

  return merged;
}

/**
 * Get road material based on type
 */
export function getRoadMaterial(type: RoadType): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: ROAD_COLORS[type],
    roughness: 0.9,
    metalness: 0.0,
  });
}

/**
 * Get sidewalk material
 */
export function getSidewalkMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: ROAD_COLORS.sidewalk,
    roughness: 0.8,
    metalness: 0.0,
  });
}

/**
 * Get road markings material
 */
export function getMarkingsMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: ROAD_COLORS.marking,
    roughness: 0.5,
    metalness: 0.0,
    emissive: ROAD_COLORS.marking,
    emissiveIntensity: 0.1,
  });
}
