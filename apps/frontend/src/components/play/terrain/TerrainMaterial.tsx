/**
 * TerrainMaterial.tsx
 * PBR terrain material with height/slope-based texture splatting
 * Uses custom shader for blending grass, rock, and sand textures
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { TEXTURE_SCALE, MAX_HEIGHT, MIN_HEIGHT, WATER_LEVEL } from '../../../lib/terrain';

// Texture paths
const TEXTURE_PATHS = {
  grass: {
    color: '/textures/ground/Grass004_1K-PNG_Color.png',
    normal: '/textures/ground/Grass004_1K-PNG_NormalGL.png',
    roughness: '/textures/ground/Grass004_1K-PNG_Roughness.png',
    ao: '/textures/ground/Grass004_1K-PNG_AmbientOcclusion.png',
  },
  rock: {
    color: '/textures/terrain/Concrete011_1K-PNG/Concrete011_1K-PNG_Color.png',
    normal: '/textures/terrain/Concrete011_1K-PNG/Concrete011_1K-PNG_NormalGL.png',
    roughness: '/textures/terrain/Concrete011_1K-PNG/Concrete011_1K-PNG_Roughness.png',
    ao: '/textures/terrain/Concrete011_1K-PNG/Concrete011_1K-PNG_AmbientOcclusion.png',
  },
  // Sand texture for beach zones
  sand: {
    color: '/textures/terrain/sand/Ground101_1K-PNG_Color.png',
    normal: '/textures/terrain/sand/Ground101_1K-PNG_NormalGL.png',
    roughness: '/textures/terrain/sand/Ground101_1K-PNG_Roughness.png',
    ao: '/textures/terrain/sand/Ground101_1K-PNG_AmbientOcclusion.png',
  },
  road: {
    color: '/textures/terrain/Road003_1K-PNG/Road003_1K-PNG_Color.png',
    normal: '/textures/terrain/Road003_1K-PNG/Road003_1K-PNG_NormalGL.png',
    roughness: '/textures/terrain/Road003_1K-PNG/Road003_1K-PNG_Roughness.png',
  },
  // Snow texture for mountain peaks (uses grass normal for now - can add dedicated snow textures later)
  snow: {
    color: '/textures/ground/Grass004_1K-PNG_Color.png', // Placeholder - will use fallback color
    normal: '/textures/ground/Grass004_1K-PNG_NormalGL.png',
    roughness: '/textures/ground/Grass004_1K-PNG_Roughness.png',
  },
  // Forest floor texture (uses grass for now - can add dedicated forest textures later)
  forest: {
    color: '/textures/ground/Grass004_1K-PNG_Color.png', // Placeholder - will use tinted color
    normal: '/textures/ground/Grass004_1K-PNG_NormalGL.png',
    roughness: '/textures/ground/Grass004_1K-PNG_Roughness.png',
  },
};

// Biome altitude configuration (scaled for 5-chunk Rust-style world)
// MAX_HEIGHT = 40m, mountains = 20-35m
const BIOME_CONFIG = {
  /** Snow appears at very high altitudes (rare in 40m world) */
  snowMin: 35.0,
  /** Snow transition band */
  snowTransition: 5.0,
  /** Forest starts above beach/dune zone */
  forestMin: 8.0,
  /** Forest ends before mountain peaks */
  forestMax: 30.0,
};

// Custom shader for terrain splatting
// Manual fog calculation (more efficient than Three.js fog system)
const terrainVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying float vHeight;
  varying float vFogDepth;

  void main() {
    vUv = uv;

    // Use world-space normals for slope calculation (camera-independent)
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vHeight = worldPos.y;

    // Calculate fog depth (distance from camera)
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mvPosition.z;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const terrainFragmentShader = /* glsl */ `
  uniform sampler2D grassColor;
  uniform sampler2D grassNormal;
  uniform sampler2D grassRoughness;

  uniform sampler2D rockColor;
  uniform sampler2D rockNormal;
  uniform sampler2D rockRoughness;

  uniform sampler2D sandColor;
  uniform sampler2D sandNormal;
  uniform sampler2D sandRoughness;
  uniform bool useSandTexture;
  uniform vec3 sandFallbackColor;

  uniform float grassScale;
  uniform float rockScale;
  uniform float sandScale;
  uniform float maxHeight;
  uniform float minHeight;
  uniform float waterLevel;
  uniform float beachTop;
  uniform float beachTransitionEnd;
  uniform bool debugWeights;
  uniform bool debugSlope;
  uniform float forceMinRock;

  // Snow and Forest biome uniforms
  uniform vec3 snowColor;
  uniform vec3 forestColor;
  uniform float snowMin;
  uniform float snowTransition;
  uniform float forestMin;
  uniform float forestMax;

  // Manual fog uniforms (more efficient than Three.js fog)
  uniform bool fogEnabled;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying float vHeight;
  varying float vFogDepth;

  // Simple hash for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Simple 2D value noise for moisture variation
  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Calculate UV tiling based on world position
    // Using fract() to force UV wrapping in shader (bypass sampler state)
    vec2 grassUV = fract(vWorldPosition.xz * grassScale);
    vec2 rockUV = fract(vWorldPosition.xz * rockScale);
    vec2 sandUV = fract(vWorldPosition.xz * sandScale);

    // Sample textures
    vec4 grassColorSample = texture2D(grassColor, grassUV);
    vec4 rockColorSample = texture2D(rockColor, rockUV);

    // Boost rock brightness slightly for visibility
    rockColorSample.rgb = pow(rockColorSample.rgb, vec3(0.85));

    // Sand color - use texture if available, otherwise fallback
    vec3 sandColorValue;
    if (useSandTexture) {
      sandColorValue = texture2D(sandColor, sandUV).rgb;
    } else {
      sandColorValue = sandFallbackColor;
    }

    // Calculate slope from world-space normal (0 = flat, 1 = vertical)
    // Using world-space ensures rock appears consistently regardless of camera angle
    float slope = 1.0 - vWorldNormal.y;

    // Normalize height to 0-1 range
    float normalizedHeight = (vHeight - minHeight) / (maxHeight - minHeight);

    // === SNOW WEIGHT (high peaks, gentle slopes) ===
    float snowWeight = 0.0;
    if (vHeight > snowMin - snowTransition) {
      float snowAltitude = smoothstep(snowMin - snowTransition, snowMin, vHeight);
      // Snow sticks better on gentle slopes, slides off steep
      float snowSlope = 1.0 - smoothstep(0.1, 0.35, slope);
      snowWeight = snowAltitude * snowSlope;
    }

    // === ROCK WEIGHT (steep slopes only) ===
    // Rock appears on slopes (lowered threshold to verify it works)
    // slope: 0 = flat, 1 = vertical
    // 0.15 = ~25deg, 0.3 = ~45deg, 0.5 = ~60deg
    float rockSteep = smoothstep(0.15, 0.35, slope);

    // Height-based rock, but damped on non-steep slopes and where snow dominates
    float heightRock = smoothstep(0.55, 0.8, normalizedHeight);
    heightRock *= (1.0 - snowWeight); // Snow takes priority at high altitude

    float rockWeight = max(rockSteep, heightRock);

    // Force minimum rock for diagnostic (set forceMinRock > 0 to test rock texture)
    rockWeight = max(rockWeight, forceMinRock);

    // === FOREST WEIGHT (mid elevation, gentle slopes, moisture) ===
    float forestWeight = 0.0;
    if (vHeight > forestMin && vHeight < forestMax && slope < 0.25) {
      // Altitude band for forest
      float forestAltLow = smoothstep(forestMin - 5.0, forestMin + 10.0, vHeight);
      float forestAltHigh = 1.0 - smoothstep(forestMax - 15.0, forestMax, vHeight);
      float forestAltitude = forestAltLow * forestAltHigh;

      // Slope factor - forest prefers gentle terrain
      float forestSlope = 1.0 - smoothstep(0.1, 0.25, slope);

      // Moisture noise for patchy forest distribution
      float moisture = noise2D(vWorldPosition.xz * 0.01);
      moisture = smoothstep(0.3, 0.7, moisture);

      // Combine factors
      forestWeight = forestAltitude * forestSlope * moisture;

      // Forest doesn't appear where rock dominates
      forestWeight *= (1.0 - rockWeight);
    }

    // === BIOME WEIGHTS ===
    float sandWeight = 0.0;
    float grassWeight = 0.0;

    // --- BEACH/SAND BIOME (near water on gentle slopes) ---
    if (slope < 0.4 && vHeight < beachTransitionEnd) {
      if (vHeight < beachTop) {
        // Pure sand zone (at or below beachTop)
        sandWeight = 1.0;
        grassWeight = 0.0;
      } else {
        // Transition zone: smooth blend from sand to grass
        float t = (vHeight - beachTop) / (beachTransitionEnd - beachTop);
        float blendFactor = smoothstep(0.0, 1.0, t);
        sandWeight = 1.0 - blendFactor;
        grassWeight = blendFactor;
      }
    } else {
      // --- GRASS BIOME (fills remaining space) ---
      sandWeight = 0.0;
      grassWeight = 1.0;
    }

    // Rock reduces grass and sand
    grassWeight *= (1.0 - rockWeight);
    sandWeight *= (1.0 - rockWeight * 0.5); // rock partially overrides sand

    // Snow and forest reduce grass
    grassWeight *= (1.0 - snowWeight);
    grassWeight *= (1.0 - forestWeight);

    // Normalize weights (ensure they sum to 1)
    float totalWeight = grassWeight + rockWeight + sandWeight + snowWeight + forestWeight;
    if (totalWeight > 0.0) {
      grassWeight /= totalWeight;
      rockWeight /= totalWeight;
      sandWeight /= totalWeight;
      snowWeight /= totalWeight;
      forestWeight /= totalWeight;
    }

    // DEBUG: Output slope as grayscale (white = steep, black = flat)
    if (debugSlope) {
      gl_FragColor = vec4(vec3(slope), 1.0);
      return;
    }

    // DEBUG: Output weights as RGB (red=rock, green=grass, blue=sand/snow/forest)
    if (debugWeights) {
      // Show snow as white, forest as dark green overlay on blue channel
      float blueChannel = sandWeight + snowWeight * 0.8;
      float greenChannel = grassWeight + forestWeight * 0.5;
      gl_FragColor = vec4(rockWeight, greenChannel, blueChannel, 1.0);
      return;
    }

    // Forest floor color - darker, earthier grass with slight brown tint
    vec3 forestFloorColor = grassColorSample.rgb * forestColor;

    // Final color from biome weights
    vec3 finalColor = grassColorSample.rgb * grassWeight
                    + rockColorSample.rgb * rockWeight
                    + sandColorValue * sandWeight
                    + snowColor * snowWeight
                    + forestFloorColor * forestWeight;

    // === LIGHTING ===
    // Directional light from above-front (sun-like)
    vec3 lightDir = normalize(vec3(0.3, 0.8, 0.4));
    float NdotL = dot(vWorldNormal, lightDir);

    // Wrap lighting so steep faces aren't completely dark
    float wrapLight = NdotL * 0.5 + 0.5; // Remap -1..1 to 0..1

    // Hemispheric ambient (sky blue top, ground brown bottom)
    vec3 skyColor = vec3(0.6, 0.7, 0.9);
    vec3 groundColor = vec3(0.4, 0.35, 0.3);
    float skyBlend = vWorldNormal.y * 0.5 + 0.5;
    vec3 ambient = mix(groundColor, skyColor, skyBlend) * 0.4;

    // Snow gets brighter ambient (reflective)
    if (snowWeight > 0.1) {
      ambient += vec3(0.1, 0.1, 0.15) * snowWeight;
    }

    // Combine lighting
    vec3 diffuse = finalColor * wrapLight * 0.7;
    finalColor = ambient * finalColor + diffuse;

    // Subtle variation based on world position (breaks up uniformity)
    // Use very low frequency noise to avoid grainy appearance
    float noiseVar = fract(sin(dot(vWorldPosition.xz * 0.02, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor *= (0.98 + noiseVar * 0.04); // Reduced from 5-10% to 2-4% variation

    // Manual fog calculation (linear fog - more efficient than exponential)
    if (fogEnabled) {
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      finalColor = mix(finalColor, fogColor, fogFactor);
    }

    // Output
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export interface TerrainMaterialProps {
  /** Override grass texture scale */
  grassScale?: number;

  /** Override rock texture scale */
  rockScale?: number;

  /** Override sand texture scale */
  sandScale?: number;

  /** Whether to use simple fallback material */
  simple?: boolean;

  /** Debug mode: output weights as RGB (red=rock, green=grass, blue=sand) */
  debugWeights?: boolean;

  /** Enable fog effect */
  fogEnabled?: boolean;

  /** Fog color (default: light gray-blue sky) */
  fogColor?: THREE.Color;

  /** Fog start distance (default: 150) */
  fogNear?: number;

  /** Fog end distance (default: 400) */
  fogFar?: number;
}

// Beach zone configuration (Rust-style wider beaches)
const BEACH_CONFIG = {
  /** Top of pure sand zone (0-3m elevation) */
  beachTop: 3.0,
  /** End of sand/grass transition (matches TerrainConfig.BEACH_CONFIG.duneMax + buffer) */
  beachTransitionEnd: 8.0,
  /** Fallback sand color if texture fails (lighter sand for Rust aesthetic) */
  sandFallbackColor: new THREE.Color('#d4c5a0'),
};


// Default fog color (matches typical sky horizon)
const DEFAULT_FOG_COLOR = new THREE.Color(0.7, 0.75, 0.85);

/**
 * Creates a terrain splatting material with PBR textures
 * Blends grass, rock, and sand based on height and slope
 */
export function useTerrainMaterial({
  grassScale = TEXTURE_SCALE.grass / 64, // Per-meter scale
  rockScale = TEXTURE_SCALE.rock / 64,
  sandScale = 0.15, // Sand tiles a bit larger than grass
  simple = false,
  debugWeights = false,
  fogEnabled = true,
  fogColor = DEFAULT_FOG_COLOR,
  fogNear = 150,
  fogFar = 400,
}: TerrainMaterialProps = {}) {
  // Load textures (with error handling)
  const grassTextures = useTexture({
    map: TEXTURE_PATHS.grass.color,
    normalMap: TEXTURE_PATHS.grass.normal,
    roughnessMap: TEXTURE_PATHS.grass.roughness,
    aoMap: TEXTURE_PATHS.grass.ao,
  }, (textures) => {
    // Configure textures for seamless tiling
    // Note: Don't use tex.repeat - shader handles tiling via worldPosition * scale
    Object.values(textures).forEach((tex) => {
      if (tex instanceof THREE.Texture) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        // PERF: Anisotropic filtering improves quality at oblique angles (terrain viewed from above)
        tex.anisotropy = 16; // Max on most GPUs
        tex.needsUpdate = true; // ensure wrap mode is applied to GPU
      }
    });
  });

  const rockTextures = useTexture({
    map: TEXTURE_PATHS.rock.color,
    normalMap: TEXTURE_PATHS.rock.normal,
    roughnessMap: TEXTURE_PATHS.rock.roughness,
    aoMap: TEXTURE_PATHS.rock.ao,
  }, (textures) => {
    Object.values(textures).forEach((tex) => {
      if (tex instanceof THREE.Texture) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        // PERF: Anisotropic filtering improves quality at oblique angles
        tex.anisotropy = 16;
        tex.needsUpdate = true;
      }
    });
  });

  const sandTextures = useTexture({
    map: TEXTURE_PATHS.sand.color,
    normalMap: TEXTURE_PATHS.sand.normal,
    roughnessMap: TEXTURE_PATHS.sand.roughness,
    aoMap: TEXTURE_PATHS.sand.ao,
  }, (textures) => {
    Object.values(textures).forEach((tex) => {
      if (tex instanceof THREE.Texture) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        // PERF: Anisotropic filtering improves quality at oblique angles
        tex.anisotropy = 16;
        tex.needsUpdate = true; // ensure wrap mode is applied to GPU
      }
    });
  });

  // Create shader material
  const material = useMemo(() => {
    if (simple) {
      // Simple fallback without custom shader
      return new THREE.MeshStandardMaterial({
        map: grassTextures.map,
        normalMap: grassTextures.normalMap,
        roughnessMap: grassTextures.roughnessMap,
        aoMap: grassTextures.aoMap,
        roughness: 0.9,
        metalness: 0.0,
      });
    }

    // Custom splatting shader with grass, rock, sand, snow, and forest
    // Manual fog for efficient distance fading without Three.js overhead
    const shaderMat = new THREE.ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: {
        // Grass textures
        grassColor: { value: grassTextures.map },
        grassNormal: { value: grassTextures.normalMap },
        grassRoughness: { value: grassTextures.roughnessMap },
        // Rock textures
        rockColor: { value: rockTextures.map },
        rockNormal: { value: rockTextures.normalMap },
        rockRoughness: { value: rockTextures.roughnessMap },
        // Sand textures
        sandColor: { value: sandTextures.map },
        sandNormal: { value: sandTextures.normalMap },
        sandRoughness: { value: sandTextures.roughnessMap },
        useSandTexture: { value: true },
        sandFallbackColor: { value: BEACH_CONFIG.sandFallbackColor },
        // Texture scales
        grassScale: { value: grassScale },
        rockScale: { value: rockScale },
        sandScale: { value: sandScale },
        // Height/slope configuration
        maxHeight: { value: MAX_HEIGHT },
        minHeight: { value: MIN_HEIGHT },
        waterLevel: { value: WATER_LEVEL },
        beachTop: { value: BEACH_CONFIG.beachTop },
        beachTransitionEnd: { value: BEACH_CONFIG.beachTransitionEnd },
        // Snow and Forest biome parameters
        snowColor: { value: new THREE.Color(0.95, 0.97, 1.0) }, // Slightly blue-white snow
        forestColor: { value: new THREE.Color(0.6, 0.7, 0.5) }, // Dark green-brown tint
        snowMin: { value: BIOME_CONFIG.snowMin },
        snowTransition: { value: BIOME_CONFIG.snowTransition },
        forestMin: { value: BIOME_CONFIG.forestMin },
        forestMax: { value: BIOME_CONFIG.forestMax },
        // Debug
        debugWeights: { value: debugWeights },
        debugSlope: { value: false },
        forceMinRock: { value: 0.0 },
        // Manual fog (efficient - no Three.js fog system overhead)
        fogEnabled: { value: fogEnabled },
        fogColor: { value: fogColor },
        fogNear: { value: fogNear },
        fogFar: { value: fogFar },
      },
      side: THREE.FrontSide,
    });

    return shaderMat;
  }, [grassTextures, rockTextures, sandTextures, grassScale, rockScale, sandScale, simple, debugWeights, fogEnabled, fogColor, fogNear, fogFar]);

  return material;
}

/**
 * Simple grass material for basic terrain
 */
export function useSimpleGrassMaterial() {
  const texture = useTexture(TEXTURE_PATHS.grass.color);

  const material = useMemo(() => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100);

    return new THREE.MeshStandardMaterial({
      map: texture,
      color: '#2d5a27',
      roughness: 0.9,
      metalness: 0.0,
    });
  }, [texture]);

  return material;
}

/**
 * Fallback solid color material (no textures)
 */
export function useFallbackMaterial(color: string = '#2d5a27') {
  return useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      metalness: 0.0,
    });
  }, [color]);
}

export default useTerrainMaterial;
