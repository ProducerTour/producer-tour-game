/**
 * TerrainChunkMesh.tsx
 * Renders a single terrain chunk as a Three.js mesh
 * Geometry is generated from heightmap data
 */

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import type { ChunkData } from '../../../lib/terrain';

export interface TerrainChunkMeshProps {
  /** Chunk data including geometry arrays */
  chunk: ChunkData;

  /** Whether to show wireframe (debug) */
  wireframe?: boolean;

  /** Material to use (optional, defaults to basic green) */
  material?: THREE.Material;

  /** Called when chunk is clicked */
  onClick?: (point: THREE.Vector3) => void;
}

/**
 * Single terrain chunk mesh component
 */
export function TerrainChunkMesh({
  chunk,
  wireframe = false,
  material,
  onClick,
}: TerrainChunkMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Build geometry from chunk data
  const geometry = useMemo(() => {
    if (!chunk.vertices || !chunk.indices) {
      return null;
    }

    const geo = new THREE.BufferGeometry();

    // Set positions
    geo.setAttribute('position', new THREE.BufferAttribute(chunk.vertices, 3));

    // Set normals if available
    if (chunk.normals) {
      geo.setAttribute('normal', new THREE.BufferAttribute(chunk.normals, 3));
    }

    // Set UVs if available
    if (chunk.uvs) {
      geo.setAttribute('uv', new THREE.BufferAttribute(chunk.uvs, 2));
    }

    // Set indices
    geo.setIndex(new THREE.BufferAttribute(chunk.indices, 1));

    // Compute bounding box/sphere for frustum culling
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    return geo;
  }, [chunk.vertices, chunk.normals, chunk.uvs, chunk.indices]);

  // Default material if none provided
  const defaultMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2d5a27',
      roughness: 0.9,
      metalness: 0.0,
      wireframe,
      side: THREE.FrontSide,
      flatShading: false,
    });
  }, [wireframe]);

  // Update wireframe mode
  useEffect(() => {
    const mat = material || defaultMaterial;
    if (mat instanceof THREE.MeshStandardMaterial) {
      mat.wireframe = wireframe;
    }
  }, [wireframe, material, defaultMaterial]);

  // Handle click
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (onClick && event.point) {
      onClick(event.point);
    }
  };

  if (!geometry) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material || defaultMaterial}
      receiveShadow
      castShadow={false}
      onClick={handleClick}
    />
  );
}

/**
 * Simple terrain chunk for basic rendering (without full ChunkData)
 */
export interface SimpleChunkProps {
  /** Chunk X coordinate */
  chunkX: number;

  /** Chunk Z coordinate */
  chunkZ: number;

  /** Heightmap generator instance */
  heightmapGen: {
    generateChunkVertices: (x: number, z: number, lod?: number) => Float32Array;
    generateChunkNormals: (x: number, z: number, lod?: number) => Float32Array;
    generateChunkUVs: (lod?: number) => Float32Array;
    generateChunkIndices: (lod?: number) => Uint32Array;
  };

  /** LOD level */
  lod?: number;

  /** Wireframe mode */
  wireframe?: boolean;

  /** Material */
  material?: THREE.Material;
}

export function SimpleTerrainChunk({
  chunkX,
  chunkZ,
  heightmapGen,
  lod = 0,
  wireframe = false,
  material,
}: SimpleChunkProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const vertices = heightmapGen.generateChunkVertices(chunkX, chunkZ, lod);
    const normals = heightmapGen.generateChunkNormals(chunkX, chunkZ, lod);
    const uvs = heightmapGen.generateChunkUVs(lod);
    const indices = heightmapGen.generateChunkIndices(lod);

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    return geo;
  }, [chunkX, chunkZ, heightmapGen, lod]);

  const defaultMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2d5a27',
      roughness: 0.9,
      metalness: 0.0,
      wireframe,
      side: THREE.FrontSide,
    });
  }, [wireframe]);

  return (
    <mesh
      geometry={geometry}
      material={material || defaultMaterial}
      receiveShadow
    />
  );
}

export default TerrainChunkMesh;
