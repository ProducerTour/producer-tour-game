/**
 * TerrainChunk Component
 * Renders a single terrain chunk with procedural height and custom shaders
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  terrainVertexShader,
  terrainFragmentShader,
  createTerrainUniforms,
} from '../../shaders/terrain';
import { noiseGenerator } from '../../lib/city/NoiseGenerator';
import {
  CHUNK_SIZE,
  TERRAIN_RESOLUTION,
  TERRAIN_HEIGHT_SCALE,
  TERRAIN_NOISE_SCALE,
  SHADER_DEFAULTS,
  type DistrictType,
  DISTRICTS,
} from '../../lib/city/CityConfig';

interface TerrainChunkProps {
  chunkX: number;
  chunkZ: number;
  district?: DistrictType;
  lod?: 0 | 1 | 2;
  visible?: boolean;
}

// District type to shader int mapping
const DISTRICT_TYPE_MAP: Record<DistrictType, number> = {
  downtown: 0,
  hollywood_hills: 1,
  arts_district: 2,
  beach: 3,
  industrial: 4,
};

// LOD resolution mapping
const LOD_RESOLUTION: Record<0 | 1 | 2, number> = {
  0: TERRAIN_RESOLUTION, // 32 vertices
  1: 16, // Half resolution
  2: 8, // Quarter resolution
};

export function TerrainChunk({
  chunkX,
  chunkZ,
  district = 'arts_district',
  lod = 0,
  visible = true,
}: TerrainChunkProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const resolution = LOD_RESOLUTION[lod];
  const districtConfig = DISTRICTS[district];

  // Generate geometry with heightmap
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      CHUNK_SIZE,
      CHUNK_SIZE,
      resolution - 1,
      resolution - 1
    );

    // Rotate to be horizontal (XZ plane)
    geo.rotateX(-Math.PI / 2);

    // Apply heightmap to vertices
    const positions = geo.attributes.position.array as Float32Array;
    const heightmap = noiseGenerator.generateChunkHeightmap(
      chunkX,
      chunkZ,
      CHUNK_SIZE,
      resolution,
      districtConfig.terrainBias
    );

    for (let i = 0; i < positions.length / 3; i++) {
      // Set Y (height) from heightmap
      positions[i * 3 + 1] = heightmap[i];
    }

    // Recompute normals
    geo.computeVertexNormals();

    return geo;
  }, [chunkX, chunkZ, resolution, districtConfig.terrainBias]);

  // Create shader uniforms
  const uniforms = useMemo(() => {
    const u = createTerrainUniforms();
    u.uChunkOffset.value = [chunkX * CHUNK_SIZE, chunkZ * CHUNK_SIZE];
    u.uHeightScale.value = TERRAIN_HEIGHT_SCALE;
    u.uNoiseScale.value = TERRAIN_NOISE_SCALE;
    u.uDistrictType.value = DISTRICT_TYPE_MAP[district];
    u.uFogNear.value = SHADER_DEFAULTS.fogNear;
    u.uFogFar.value = SHADER_DEFAULTS.fogFar;
    u.uFogColor.value = new THREE.Color(SHADER_DEFAULTS.fogColor);
    u.uSunDirection.value = new THREE.Vector3(
      SHADER_DEFAULTS.sunDirection.x,
      SHADER_DEFAULTS.sunDirection.y,
      SHADER_DEFAULTS.sunDirection.z
    ).normalize();
    u.uSunIntensity.value = SHADER_DEFAULTS.sunIntensity;
    u.uAmbientIntensity.value = SHADER_DEFAULTS.ambientIntensity;
    return u;
  }, [chunkX, chunkZ, district]);

  // Animate shader time
  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  // Clean up geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  if (!visible) return null;

  return (
    <mesh
      ref={meshRef}
      position={[
        chunkX * CHUNK_SIZE + CHUNK_SIZE / 2,
        0,
        chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2,
      ]}
      receiveShadow
    >
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        ref={materialRef}
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Pre-generated heightmap version for better performance
interface TerrainChunkWithHeightmapProps extends TerrainChunkProps {
  heightmapTexture: THREE.DataTexture;
}

export function TerrainChunkWithHeightmap({
  chunkX,
  chunkZ,
  district = 'arts_district',
  lod = 0,
  visible = true,
  heightmapTexture,
}: TerrainChunkWithHeightmapProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const resolution = LOD_RESOLUTION[lod];

  // Simple plane geometry - height will be applied in shader
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      CHUNK_SIZE,
      CHUNK_SIZE,
      resolution - 1,
      resolution - 1
    );
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [resolution]);

  // Create shader uniforms with heightmap
  const uniforms = useMemo(() => {
    const u = createTerrainUniforms();
    u.uChunkOffset.value = [chunkX * CHUNK_SIZE, chunkZ * CHUNK_SIZE];
    u.uHeightScale.value = TERRAIN_HEIGHT_SCALE;
    u.uHeightmap.value = heightmapTexture;
    u.uUseHeightmap.value = true;
    u.uDistrictType.value = DISTRICT_TYPE_MAP[district];
    u.uFogNear.value = SHADER_DEFAULTS.fogNear;
    u.uFogFar.value = SHADER_DEFAULTS.fogFar;
    u.uFogColor.value = new THREE.Color(SHADER_DEFAULTS.fogColor);
    return u;
  }, [chunkX, chunkZ, district, heightmapTexture]);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  if (!visible) return null;

  return (
    <mesh
      ref={meshRef}
      position={[
        chunkX * CHUNK_SIZE + CHUNK_SIZE / 2,
        0,
        chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2,
      ]}
      receiveShadow
    >
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        ref={materialRef}
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Helper to create heightmap texture from data
export function createHeightmapTexture(
  chunkX: number,
  chunkZ: number,
  resolution: number = TERRAIN_RESOLUTION,
  districtBias: number = 0
): THREE.DataTexture {
  const data = noiseGenerator.generateChunkHeightmap(
    chunkX,
    chunkZ,
    CHUNK_SIZE,
    resolution,
    districtBias
  );

  // Normalize to 0-255 for texture
  const normalizedData = new Uint8Array(resolution * resolution);
  for (let i = 0; i < data.length; i++) {
    normalizedData[i] = Math.floor((data[i] / TERRAIN_HEIGHT_SCALE) * 255);
  }

  const texture = new THREE.DataTexture(
    normalizedData,
    resolution,
    resolution,
    THREE.RedFormat,
    THREE.UnsignedByteType
  );

  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

export default TerrainChunk;
