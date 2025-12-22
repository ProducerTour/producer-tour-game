/**
 * GrassInstances.tsx
 * 3D instanced grass scattered across terrain
 * Uses InstancedMesh for performance
 * Wind via vertex shader (base stays planted, tips sway)
 */

import { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { GLTF } from 'three-stdlib';
import { HeightmapGenerator, NOISE_CONFIG } from '../../../lib/terrain';
import { getTexturePath } from '../../../config/assetPaths';

// Grass model path - uses CDN in production, local in development
const GRASS_MODEL = getTexturePath('ground/grass_patches.glb');

// Debug logging - set to false to reduce console spam
const DEBUG_GRASS = false;

export interface GrassInstancesProps {
  /** World seed for terrain height sampling */
  seed?: number;

  /** Number of grass instances to attempt (actual count based on biome) */
  count?: number;

  /** Radius to scatter grass (meters from origin) */
  radius?: number;

  /** Enable wind animation */
  windEnabled?: boolean;

  /** Wind strength */
  windStrength?: number;

  /** Grass density multiplier (0-1, affects count) */
  density?: number;
}

// Vertex shader wind - base stays planted, tips move
// Animation fades with distance, fog support for render distance
const windVertexShader = `
  #include <fog_pars_vertex>

  uniform float uTime;
  uniform float uWindStrength;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalMatrix * normal;

    vec3 pos = position;

    // World position for wave coherence and distance calc
    vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);

    // Distance-based animation fade (full at 0m, gone at 25m)
    float distFromCamera = distance(worldPos.xyz, cameraPosition);
    float animationFade = 1.0 - smoothstep(15.0, 25.0, distFromCamera);

    // Wind effect based on vertex height (Y position)
    // Higher vertices move more, base stays planted
    float windFactor = smoothstep(0.0, 0.4, pos.y); // 0 at base, 1 at 0.4m

    // Wind wave traveling across field
    float wave = sin(uTime * 2.0 + worldPos.x * 0.1 + worldPos.z * 0.1);
    float wave2 = sin(uTime * 1.5 + worldPos.x * 0.15 - worldPos.z * 0.08) * 0.5;

    // Apply wind displacement with distance fade (X and Z only, Y stays)
    float finalWind = windFactor * uWindStrength * animationFade;
    pos.x += (wave + wave2) * finalWind;
    pos.z += (wave * 0.5 + wave2 * 0.3) * finalWind;

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

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);

    if (texColor.a < uAlphaTest) discard;

    // Simple lighting
    vec3 light = normalize(vec3(0.5, 1.0, 0.3));
    float diffuse = max(dot(vNormal, light), 0.3);

    gl_FragColor = vec4(texColor.rgb * diffuse, texColor.a);

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

export function GrassInstances({
  seed = NOISE_CONFIG.seed,
  count = 8000,
  radius = 150,
  windEnabled = true,
  windStrength = 0.15,
  density = 1,
}: GrassInstancesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Load grass model
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
        fog: true,
      });

      if (DEBUG_GRASS) console.log('🌿 Loaded grass with shader wind:', { vertices: maxVertices, hasTexture: !!texture });
      return { geometry: geo, material: shaderMat };
    }

    // Fallback
    console.warn('🌿 No mesh found in GLB, using fallback');
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

  // Generate instance matrices based on biome (only where grass texture exists)
  const matrices = useMemo(() => {
    const heightmapGen = new HeightmapGenerator(seed);
    const actualCount = Math.floor(count * density);
    const mats: THREE.Matrix4[] = [];
    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();

    for (let i = 0; i < actualCount; i++) {
      const randX = seededRandom(seed + i * 3);
      const randZ = seededRandom(seed + i * 3 + 1);
      const randRot = seededRandom(seed + i * 3 + 2);
      const randScaleVar = seededRandom(seed + i * 3 + 3);
      const randBiome = seededRandom(seed + i * 3 + 4);

      const x = (randX - 0.5) * 2 * radius;
      const z = (randZ - 0.5) * 2 * radius;

      // Sample terrain with full biome data
      const terrain = heightmapGen.sampleTerrain(x, z);

      // Skip if not a grass biome (probabilistic based on grass weight)
      // This creates natural biome transitions - more grass weight = more likely to place
      if (randBiome > terrain.biome.grass) continue;

      // Skip on steep slopes (already handled by biome, but extra safety)
      if (terrain.normal.y < 0.7) continue;

      // Offset Y by half grass height (0.4m / 2 = 0.2m) since origin is at center
      const y = terrain.height + 0.2;

      tempPosition.set(x, y, z);

      // Align grass to terrain normal (slope following)
      const up = new THREE.Vector3(0, 1, 0);
      const terrainNormal = new THREE.Vector3(terrain.normal.x, terrain.normal.y, terrain.normal.z);
      tempQuaternion.setFromUnitVectors(up, terrainNormal);

      // Apply random Y rotation on top for variety
      const yRotation = new THREE.Quaternion().setFromAxisAngle(
        terrainNormal,
        randRot * Math.PI * 2
      );
      tempQuaternion.multiply(yRotation);

      // Scale with variation (0.7x to 1.3x), slightly smaller in transition zones
      const biomeScale = 0.8 + terrain.biome.grass * 0.4; // 0.8-1.2 based on grass weight
      const s = (0.7 + randScaleVar * 0.6) * biomeScale;
      tempScale.set(s, s, s);

      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      mats.push(tempMatrix.clone());
    }

    if (DEBUG_GRASS) console.log(`🌿 Generated ${mats.length} grass instances based on biome`);
    return mats;
  }, [seed, count, radius, density]);

  // Set instance matrices BEFORE browser paints
  useLayoutEffect(() => {
    if (!meshRef.current) return;

    matrices.forEach((matrix, i) => {
      meshRef.current!.setMatrixAt(i, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.count = matrices.length;

    // Compute bounding sphere for frustum culling to work
    meshRef.current.computeBoundingSphere();

    // Store material ref for time updates
    materialRef.current = material as THREE.ShaderMaterial;
  }, [matrices, material]);

  // Update shader time uniform (GPU wind animation)
  useFrame((_, delta) => {
    if (!windEnabled || !materialRef.current) return;
    materialRef.current.uniforms.uTime.value += delta;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, matrices.length]}
      castShadow={false}  // Grass doesn't cast visible shadows - saves ~50% shadow pass cost
      receiveShadow
      frustumCulled={true}  // Skip rendering when off-screen (bounding sphere computed above)
    />
  );
}

export default GrassInstances;
