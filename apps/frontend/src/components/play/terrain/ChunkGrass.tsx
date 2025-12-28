/**
 * ChunkGrass.tsx
 * Grass instances owned by a single terrain chunk
 * When chunk unloads, its grass unloads with it
 */

import React, { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { GLTF } from 'three-stdlib';
import {
  TerrainGenerator,
  CHUNK_SIZE,
  getChunkOrigin,
  WATER_LEVEL,
} from '../../../lib/terrain';
import { LAYERS } from '../constants/layers';
import { getTexturePath } from '../../../config/assetPaths';

// Grass model path - uses CDN in production, local in development
const GRASS_MODEL = getTexturePath('ground/grass_patches.glb');

export interface ChunkGrassProps {
  /** Chunk X coordinate (grid index, not world position) */
  chunkX: number;

  /** Chunk Z coordinate (grid index, not world position) */
  chunkZ: number;

  /** World seed for terrain/biome sampling */
  seed: number;

  /** Chunk radius for terrain bounds calculation */
  chunkRadius?: number;

  /**
   * Pre-initialized TerrainGenerator with hydrology attached.
   * Pass this from StaticTerrain to ensure river/lake detection works.
   * If not provided, creates a new instance (without hydrology - rivers/lakes won't be detected)
   */
  terrainGen?: TerrainGenerator;

  /** Grass instances per chunk (before biome filtering) */
  instancesPerChunk?: number;

  /** Enable wind animation */
  windEnabled?: boolean;

  /** Wind strength */
  windStrength?: number;
}

// Vertex shader wind - base stays planted, tips move
// Uses Three.js fog for distance fading (respects user fog settings)
const windVertexShader = `
  #include <fog_pars_vertex>

  uniform float uTime;
  uniform float uWindStrength;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDistanceFade;

  void main() {
    vUv = uv;
    vNormal = normalMatrix * normal;

    vec3 pos = position;

    // World position for wave coherence and distance calc
    vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);

    // Distance-based fading for grass culling (separate from fog)
    // Grass fades at 60-100m, fog handles the color blending
    float distFromCamera = distance(worldPos.xyz, cameraPosition);
    vDistanceFade = 1.0 - smoothstep(60.0, 100.0, distFromCamera);

    // Skip all calculations for distant grass (major perf win)
    if (vDistanceFade < 0.01) {
      gl_Position = vec4(0.0); // Degenerate triangle - GPU skips
      return;
    }

    // Wind only for close grass (save ALU on distant grass)
    if (distFromCamera < 50.0) {
      float windFactor = smoothstep(0.0, 0.4, pos.y);
      float wave = sin(uTime * 2.0 + worldPos.x * 0.1 + worldPos.z * 0.1);
      float finalWind = windFactor * uWindStrength;
      pos.x += wave * finalWind;
      pos.z += wave * 0.5 * finalWind;
    }

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

const windFragmentShader = `
  #include <fog_pars_fragment>

  uniform sampler2D uTexture;
  uniform float uAlphaTest;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDistanceFade;

  void main() {
    // Early discard for distant grass (saves fragment processing)
    if (vDistanceFade < 0.01) discard;

    vec4 texColor = texture2D(uTexture, vUv);

    // Apply distance fade to alpha
    float finalAlpha = texColor.a * vDistanceFade;

    if (finalAlpha < uAlphaTest) discard;

    // Simple lighting
    vec3 light = normalize(vec3(0.5, 1.0, 0.3));
    float diffuse = max(dot(vNormal, light), 0.3);

    vec3 finalColor = texColor.rgb * diffuse;

    gl_FragColor = vec4(finalColor, finalAlpha);

    #include <fog_fragment>
  }
`;

// Seeded random for deterministic grass placement
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.Material>;
};

export const ChunkGrass = React.memo(function ChunkGrass({
  chunkX,
  chunkZ,
  seed,
  chunkRadius,
  terrainGen: passedTerrainGen,
  instancesPerChunk = 150,
  windEnabled = true,
  windStrength = 0.15,
}: ChunkGrassProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Load grass model (cached by drei)
  const gltf = useGLTF(GRASS_MODEL) as GLTFResult;

  // Get geometry and create shader material from the GLB
  const { geometry, material } = useMemo(() => {
    // Find the mesh with the most vertices
    let bestMesh: THREE.Mesh | null = null;
    let maxVertices = 0;

    for (const name of Object.keys(gltf.nodes)) {
      const node = gltf.nodes[name];
      if (node.geometry) {
        const vertCount = node.geometry.attributes.position?.count || 0;
        if (vertCount > maxVertices) {
          maxVertices = vertCount;
          bestMesh = node;
        }
      }
    }

    if (bestMesh) {
      const geo = bestMesh.geometry.clone();

      // CRITICAL: Ensure geometry origin is at the bottom (ground level)
      // Compute bounding box and translate so minY = 0
      geo.computeBoundingBox();
      if (geo.boundingBox) {
        const minY = geo.boundingBox.min.y;
        if (Math.abs(minY) > 0.001) {
          geo.translate(0, -minY, 0);
        }
      }

      // Get texture from original material
      let texture: THREE.Texture | null = null;
      const origMat = bestMesh.material as THREE.MeshStandardMaterial;
      if (origMat && 'map' in origMat && origMat.map) {
        texture = origMat.map;
      }

      // Create shader material with wind + fog support
      const shaderMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: { value: 0 },
            uWindStrength: { value: windStrength },
            uTexture: { value: texture },
            uAlphaTest: { value: 0.5 },
          },
        ]),
        vertexShader: windVertexShader,
        fragmentShader: windFragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        fog: true, // Enable fog support
      });

      return { geometry: geo, material: shaderMat };
    }

    // Fallback plane geometry
    const geo = new THREE.PlaneGeometry(0.1, 0.5);
    geo.translate(0, 0.25, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uWindStrength: { value: windStrength },
          uTexture: { value: null },
          uAlphaTest: { value: 0.5 },
        },
      ]),
      vertexShader: windVertexShader,
      fragmentShader: windFragmentShader,
      side: THREE.DoubleSide,
      fog: true,
    });
    return { geometry: geo, material: mat };
  }, [gltf, windStrength]);

  // Generate instance matrices for this chunk only
  // NOTE: Uses HEIGHT-BASED filtering for reliability
  const matrices = useMemo(() => {
    // Use passed terrainGen (has hydrology) or create fallback (no hydrology)
    const terrainGen = passedTerrainGen ?? new TerrainGenerator(seed, chunkRadius);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const mats: THREE.Matrix4[] = [];
    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();
    const worldRadius = (chunkRadius ?? 5) * CHUNK_SIZE;

    const chunkSeed = seed + chunkX * 1000 + chunkZ;

    // HEIGHT-BASED FILTERING: Grass in forest zone (above beach, below mountain peaks)
    const minGrassHeight = 6;   // Above beach/dune zone
    const maxGrassHeight = 40;  // Below mountain peaks

    for (let i = 0; i < instancesPerChunk; i++) {
      const randX = seededRandom(chunkSeed + i * 5);
      const randZ = seededRandom(chunkSeed + i * 5 + 1);
      const randRot = seededRandom(chunkSeed + i * 5 + 2);
      const randScaleVar = seededRandom(chunkSeed + i * 5 + 3);
      const randDensity = seededRandom(chunkSeed + i * 5 + 4);

      const x = origin.x + randX * CHUNK_SIZE;
      const z = origin.z + randZ * CHUNK_SIZE;

      const terrain = terrainGen.sampleTerrain(x, z);
      const height = terrain.height;

      // Skip invalid heights
      if (!Number.isFinite(height)) continue;

      // =================================================================
      // RUST-STYLE TOPOLOGY: Skip ALL submerged areas (rivers, lakes, underwater)
      // Uses single flag from TerrainSample for reliable water detection
      // =================================================================
      if (terrain.isSubmerged) continue;

      // Additional safety margin above water level
      if (height <= WATER_LEVEL + 1.0) continue;

      // =================================================================
      // DISTANCE-BASED FILTERING: Grass NOT on coast
      // =================================================================
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter > worldRadius * 0.85) continue;  // Not in ocean zone

      // =================================================================
      // HEIGHT-BASED FILTERING: Forest zone only
      // =================================================================
      if (height < minGrassHeight) continue;
      if (height > maxGrassHeight) continue;

      // =================================================================
      // SLOPE FILTERING: Grass on gentle terrain
      // =================================================================
      if (terrain.normal.y < 0.65) continue;  // ~50 degree max

      // =================================================================
      // MOUNTAIN FILTERING: Reduce density in rocky zones
      // =================================================================
      const mountainMask = terrainGen.getMountainZoneMask(x, z);
      if (mountainMask > 0.5) continue;

      // =================================================================
      // DENSITY VARIATION
      // =================================================================
      const densityNoise = terrainGen.noise.fbm2(x * 0.03, z * 0.03, 2, 0.5, 2.0, 1.0);
      const grassDensity = 0.7 + densityNoise * 0.3;
      if (randDensity > grassDensity) continue;

      // Offset Y
      const y = terrain.height + 0.2;
      tempPosition.set(x, y, z);

      // Align to terrain
      const up = new THREE.Vector3(0, 1, 0);
      const terrainNormal = new THREE.Vector3(terrain.normal.x, terrain.normal.y, terrain.normal.z);
      tempQuaternion.setFromUnitVectors(up, terrainNormal);

      const yRotation = new THREE.Quaternion().setFromAxisAngle(terrainNormal, randRot * Math.PI * 2);
      tempQuaternion.multiply(yRotation);

      const s = 0.7 + randScaleVar * 0.6;
      tempScale.set(s, s, s);

      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      mats.push(tempMatrix.clone());
    }

    return mats;
  }, [chunkX, chunkZ, seed, chunkRadius, passedTerrainGen, instancesPerChunk]);

  // Set instance matrices
  useLayoutEffect(() => {
    if (!meshRef.current || matrices.length === 0) return;

    matrices.forEach((matrix, i) => {
      meshRef.current!.setMatrixAt(i, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.count = matrices.length;

    // PERF: Disable auto matrix updates for static geometry
    meshRef.current.matrixAutoUpdate = false;
    meshRef.current.updateMatrix();

    // PERF: Enable vegetation layer to exclude from camera collision raycasts
    // Use enable() not set() - set() removes from default layer (0) making it invisible!
    meshRef.current.layers.enable(LAYERS.VEGETATION);

    materialRef.current = material as THREE.ShaderMaterial;
  }, [matrices, material]);

  // Update shader time uniform
  useFrame((_, delta) => {
    if (!windEnabled || !materialRef.current) return;
    materialRef.current.uniforms.uTime.value += delta;
  });

  // Don't render if no grass in this chunk
  if (matrices.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, matrices.length]}
      castShadow={false}
      receiveShadow={false}
      frustumCulled={true}
    />
  );
});

export default ChunkGrass;
