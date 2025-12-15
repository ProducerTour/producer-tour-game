/**
 * RoadChunk Component
 * Renders road segments within a chunk using merged geometry for performance
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { type CityWorldManager } from '../../lib/city/CityWorldManager';
import { type RoadSegment } from '../../lib/city/CityLayout';
import { noiseGenerator } from '../../lib/city/NoiseGenerator';

interface RoadChunkProps {
  chunkX: number;
  chunkZ: number;
  worldManager: CityWorldManager;
}

// Road colors by type
const ROAD_COLORS = {
  boulevard: '#2d2d2d',
  street: '#3a3a3a',
  alley: '#454545',
};

const SIDEWALK_COLOR = '#9ca3af';

export function RoadChunk({ chunkX, chunkZ, worldManager }: RoadChunkProps) {
  const roads = useMemo(
    () => worldManager.getRoadsInChunk(chunkX, chunkZ),
    [worldManager, chunkX, chunkZ]
  );

  // Merge all road geometries for this chunk
  const { roadGeometry, sidewalkGeometry, roadMaterial, sidewalkMaterial } = useMemo(() => {
    if (roads.length === 0) {
      return {
        roadGeometry: null,
        sidewalkGeometry: null,
        roadMaterial: null,
        sidewalkMaterial: null,
      };
    }

    const roadVertices: number[] = [];
    const roadIndices: number[] = [];
    const sidewalkVertices: number[] = [];
    const sidewalkIndices: number[] = [];

    let roadVertexOffset = 0;
    let sidewalkVertexOffset = 0;

    for (const road of roads) {
      const { start, end, width } = road;

      // Calculate direction and perpendicular
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const perpX = -dz / length;
      const perpZ = dx / length;

      const halfWidth = width / 2;
      const sidewalkWidth = 3;
      const roadHeight = 0.05;
      const sidewalkHeight = 0.2;

      // Get terrain heights
      const startY = noiseGenerator.getTerrainHeight(start.x, start.z, 0) + roadHeight;
      const endY = noiseGenerator.getTerrainHeight(end.x, end.z, 0) + roadHeight;

      // Road surface vertices (4 corners)
      roadVertices.push(
        start.x + perpX * halfWidth, startY, start.z + perpZ * halfWidth,
        start.x - perpX * halfWidth, startY, start.z - perpZ * halfWidth,
        end.x - perpX * halfWidth, endY, end.z - perpZ * halfWidth,
        end.x + perpX * halfWidth, endY, end.z + perpZ * halfWidth
      );

      // Road indices (2 triangles)
      roadIndices.push(
        roadVertexOffset, roadVertexOffset + 1, roadVertexOffset + 2,
        roadVertexOffset, roadVertexOffset + 2, roadVertexOffset + 3
      );
      roadVertexOffset += 4;

      // Sidewalk vertices (both sides)
      const swStartY = startY + sidewalkHeight - roadHeight;
      const swEndY = endY + sidewalkHeight - roadHeight;

      // Left sidewalk
      sidewalkVertices.push(
        start.x + perpX * (halfWidth + sidewalkWidth), swStartY, start.z + perpZ * (halfWidth + sidewalkWidth),
        start.x + perpX * halfWidth, swStartY, start.z + perpZ * halfWidth,
        end.x + perpX * halfWidth, swEndY, end.z + perpZ * halfWidth,
        end.x + perpX * (halfWidth + sidewalkWidth), swEndY, end.z + perpZ * (halfWidth + sidewalkWidth)
      );

      // Right sidewalk
      sidewalkVertices.push(
        start.x - perpX * halfWidth, swStartY, start.z - perpZ * halfWidth,
        start.x - perpX * (halfWidth + sidewalkWidth), swStartY, start.z - perpZ * (halfWidth + sidewalkWidth),
        end.x - perpX * (halfWidth + sidewalkWidth), swEndY, end.z - perpZ * (halfWidth + sidewalkWidth),
        end.x - perpX * halfWidth, swEndY, end.z - perpZ * halfWidth
      );

      // Sidewalk indices
      sidewalkIndices.push(
        sidewalkVertexOffset, sidewalkVertexOffset + 1, sidewalkVertexOffset + 2,
        sidewalkVertexOffset, sidewalkVertexOffset + 2, sidewalkVertexOffset + 3,
        sidewalkVertexOffset + 4, sidewalkVertexOffset + 5, sidewalkVertexOffset + 6,
        sidewalkVertexOffset + 4, sidewalkVertexOffset + 6, sidewalkVertexOffset + 7
      );
      sidewalkVertexOffset += 8;
    }

    // Create geometries
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(roadVertices), 3)
    );
    roadGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(roadIndices), 1));
    roadGeo.computeVertexNormals();

    const sidewalkGeo = new THREE.BufferGeometry();
    sidewalkGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(sidewalkVertices), 3)
    );
    sidewalkGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(sidewalkIndices), 1));
    sidewalkGeo.computeVertexNormals();

    // Average road color based on types
    const boulevardCount = roads.filter((r) => r.type === 'boulevard').length;
    const primaryColor = boulevardCount > roads.length / 2 ? ROAD_COLORS.boulevard : ROAD_COLORS.street;

    return {
      roadGeometry: roadGeo,
      sidewalkGeometry: sidewalkGeo,
      roadMaterial: new THREE.MeshStandardMaterial({
        color: primaryColor,
        roughness: 0.9,
        metalness: 0,
      }),
      sidewalkMaterial: new THREE.MeshStandardMaterial({
        color: SIDEWALK_COLOR,
        roughness: 0.8,
        metalness: 0,
      }),
    };
  }, [roads]);

  if (!roadGeometry || !sidewalkGeometry) return null;

  return (
    <group>
      {/* Road surface */}
      <mesh geometry={roadGeometry} material={roadMaterial} receiveShadow />
      {/* Sidewalks */}
      <mesh geometry={sidewalkGeometry} material={sidewalkMaterial} receiveShadow />
    </group>
  );
}

/**
 * Individual road segment for non-chunked rendering
 */
export function RoadSegmentMesh({ road }: { road: RoadSegment }) {
  const { geometry, position, material } = useMemo(() => {
    const { start, end, width, type } = road;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    const midY = noiseGenerator.getTerrainHeight(midX, midZ, 0) + 0.05;

    const geo = new THREE.PlaneGeometry(length, width);
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(-angle);

    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS[type] || ROAD_COLORS.street,
      roughness: 0.9,
      metalness: 0,
    });

    return {
      geometry: geo,
      position: new THREE.Vector3(midX, midY, midZ),
      material: mat,
    };
  }, [road]);

  return <mesh geometry={geometry} position={position} material={material} receiveShadow />;
}

export default RoadChunk;
