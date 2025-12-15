/**
 * Terrain Shaders
 * GLSL shaders for procedural terrain rendering
 */

// Shared noise functions (Simplex noise for GPU)
const noiseCommon = /* glsl */ `
// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Fractal Brownian Motion
float fbm(vec2 p, int octaves, float persistence, float lacunarity) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  float maxValue = 0.0;

  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}
`;

// Terrain vertex shader
export const terrainVertexShader = /* glsl */ `
${noiseCommon}

uniform float uTime;
uniform float uHeightScale;
uniform float uNoiseScale;
uniform vec2 uChunkOffset;
uniform sampler2D uHeightmap;
uniform bool uUseHeightmap;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vHeight;
varying float vSlope;

void main() {
  vUv = uv;

  // Calculate world position
  vec3 worldPos = position;
  worldPos.x += uChunkOffset.x;
  worldPos.z += uChunkOffset.y;

  float height;

  if (uUseHeightmap) {
    // Sample heightmap for this vertex
    height = texture2D(uHeightmap, uv).r * uHeightScale;
  } else {
    // Generate height procedurally
    vec2 noiseCoord = worldPos.xz * uNoiseScale;

    // Base terrain
    float baseNoise = fbm(noiseCoord, 4, 0.5, 2.0) * 0.5 + 0.5;

    // Ridge noise for variation
    float ridgeNoise = 1.0 - abs(snoise(noiseCoord * 0.5));
    ridgeNoise *= ridgeNoise;

    height = (baseNoise + ridgeNoise * 0.3) * uHeightScale;
  }

  worldPos.y = height;
  vHeight = height / uHeightScale; // Normalized height
  vWorldPosition = worldPos;

  // Calculate normal from neighboring heights (for lighting)
  float delta = 1.0 / 32.0; // Based on terrain resolution
  vec2 uvL = uv - vec2(delta, 0.0);
  vec2 uvR = uv + vec2(delta, 0.0);
  vec2 uvD = uv - vec2(0.0, delta);
  vec2 uvU = uv + vec2(0.0, delta);

  float heightL, heightR, heightD, heightU;

  if (uUseHeightmap) {
    heightL = texture2D(uHeightmap, uvL).r * uHeightScale;
    heightR = texture2D(uHeightmap, uvR).r * uHeightScale;
    heightD = texture2D(uHeightmap, uvD).r * uHeightScale;
    heightU = texture2D(uHeightmap, uvU).r * uHeightScale;
  } else {
    vec2 coordL = (worldPos.xz + vec2(-delta * 64.0, 0.0)) * uNoiseScale;
    vec2 coordR = (worldPos.xz + vec2(delta * 64.0, 0.0)) * uNoiseScale;
    vec2 coordD = (worldPos.xz + vec2(0.0, -delta * 64.0)) * uNoiseScale;
    vec2 coordU = (worldPos.xz + vec2(0.0, delta * 64.0)) * uNoiseScale;

    heightL = (fbm(coordL, 4, 0.5, 2.0) * 0.5 + 0.5) * uHeightScale;
    heightR = (fbm(coordR, 4, 0.5, 2.0) * 0.5 + 0.5) * uHeightScale;
    heightD = (fbm(coordD, 4, 0.5, 2.0) * 0.5 + 0.5) * uHeightScale;
    heightU = (fbm(coordU, 4, 0.5, 2.0) * 0.5 + 0.5) * uHeightScale;
  }

  vec3 tangent = normalize(vec3(delta * 2.0 * 64.0, heightR - heightL, 0.0));
  vec3 bitangent = normalize(vec3(0.0, heightU - heightD, delta * 2.0 * 64.0));
  vNormal = normalize(cross(bitangent, tangent));

  // Calculate slope for texture blending
  vSlope = 1.0 - vNormal.y;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
}
`;

// Terrain fragment shader
export const terrainFragmentShader = /* glsl */ `
${noiseCommon}

uniform vec3 uGrassColor;
uniform vec3 uDirtColor;
uniform vec3 uConcreteColor;
uniform vec3 uSandColor;
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uSunDirection;
uniform float uSunIntensity;
uniform float uAmbientIntensity;
uniform int uDistrictType; // 0: downtown, 1: hills, 2: arts, 3: beach, 4: industrial

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vHeight;
varying float vSlope;

// Triplanar mapping helper
vec3 triplanarSample(vec3 worldPos, vec3 normal, vec3 color1, vec3 color2, float scale) {
  vec3 blending = abs(normal);
  blending = normalize(max(blending, 0.00001));
  float b = blending.x + blending.y + blending.z;
  blending /= vec3(b, b, b);

  // Sample noise for each axis
  float noiseXY = snoise(worldPos.xy * scale);
  float noiseXZ = snoise(worldPos.xz * scale);
  float noiseYZ = snoise(worldPos.yz * scale);

  float noise = noiseXY * blending.z + noiseXZ * blending.y + noiseYZ * blending.x;
  noise = noise * 0.5 + 0.5;

  return mix(color1, color2, noise);
}

void main() {
  // Base colors based on district
  vec3 baseColor;
  vec3 accentColor;

  if (uDistrictType == 0) {
    // Downtown - more concrete
    baseColor = uConcreteColor;
    accentColor = uDirtColor;
  } else if (uDistrictType == 1) {
    // Hollywood Hills - grass
    baseColor = uGrassColor;
    accentColor = uDirtColor;
  } else if (uDistrictType == 2) {
    // Arts District - mixed
    baseColor = mix(uConcreteColor, uDirtColor, 0.5);
    accentColor = uGrassColor;
  } else if (uDistrictType == 3) {
    // Beach - sand
    baseColor = uSandColor;
    accentColor = uGrassColor;
  } else {
    // Industrial - concrete
    baseColor = mix(uConcreteColor, uDirtColor, 0.3);
    accentColor = uConcreteColor * 0.8;
  }

  // Triplanar texture blending
  vec3 color = triplanarSample(vWorldPosition, vNormal, baseColor, accentColor, 0.05);

  // Height-based color variation
  float heightFactor = smoothstep(0.0, 0.5, vHeight);
  color = mix(color, uGrassColor, heightFactor * 0.3 * float(uDistrictType == 1));

  // Slope-based variation (rocky on steep slopes)
  float slopeFactor = smoothstep(0.3, 0.6, vSlope);
  vec3 rockColor = mix(uDirtColor, uConcreteColor, 0.5);
  color = mix(color, rockColor, slopeFactor * 0.5);

  // Add detail noise for variation
  float detailNoise = snoise(vWorldPosition.xz * 0.2) * 0.1 + 0.9;
  color *= detailNoise;

  // Lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float diffuse = NdotL * uSunIntensity;

  // Ambient occlusion approximation from height
  float ao = smoothstep(-0.2, 0.3, vHeight);

  vec3 ambient = color * uAmbientIntensity * ao;
  vec3 lit = color * diffuse;

  vec3 finalColor = ambient + lit;

  // Fog
  float fogDistance = length(vWorldPosition - cameraPosition);
  float fogFactor = smoothstep(uFogNear, uFogFar, fogDistance);
  finalColor = mix(finalColor, uFogColor, fogFactor);

  // Gamma correction
  finalColor = pow(finalColor, vec3(1.0 / 2.2));

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Building fragment shader (for procedural buildings)
export const buildingFragmentShader = /* glsl */ `
${noiseCommon}

uniform vec3 uBaseColor;
uniform vec3 uWindowColor;
uniform vec3 uGlowColor;
uniform float uTime;
uniform float uBuildingHeight;
uniform int uBuildingType; // 0: skyscraper, 1: midrise, 2: residential, 3: warehouse, 4: landmark

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec3 color = uBaseColor;

  // Window pattern
  float windowSize = 0.05;
  float windowSpacing = 0.08;

  // Adjust window pattern based on building type
  if (uBuildingType == 0) {
    // Skyscraper - glass facade
    windowSize = 0.03;
    windowSpacing = 0.035;
  } else if (uBuildingType == 2) {
    // Residential - larger, fewer windows
    windowSize = 0.08;
    windowSpacing = 0.15;
  } else if (uBuildingType == 3) {
    // Warehouse - few windows, large panels
    windowSize = 0.12;
    windowSpacing = 0.4;
  }

  // Create window grid
  vec2 windowUV = fract(vUv / windowSpacing);
  float windowMask = step(windowSize, windowUV.x) * step(windowSize, windowUV.y);
  windowMask *= step(windowUV.x, 1.0 - windowSize) * step(windowUV.y, 1.0 - windowSize);
  windowMask = 1.0 - windowMask;

  // Skip windows on roof
  windowMask *= step(vUv.y, 0.95);

  // Random lit windows
  vec2 windowIndex = floor(vUv / windowSpacing);
  float windowRand = fract(sin(dot(windowIndex, vec2(12.9898, 78.233))) * 43758.5453);
  float isLit = step(0.3, windowRand);

  // Window glow (animated for nightlife areas)
  vec3 windowLitColor = mix(uWindowColor, uGlowColor, sin(uTime * 2.0 + windowRand * 6.28) * 0.5 + 0.5);

  color = mix(color, windowLitColor * isLit, windowMask * 0.8);

  // Edge highlights
  float edgeX = smoothstep(0.0, 0.02, vUv.x) * smoothstep(1.0, 0.98, vUv.x);
  float edgeY = smoothstep(0.0, 0.02, vUv.y);
  color *= 0.9 + edgeX * edgeY * 0.1;

  // Simple lighting
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float diffuse = NdotL * 0.6 + 0.4;

  color *= diffuse;

  gl_FragColor = vec4(color, 1.0);
}
`;

// Atmosphere/skybox fragment shader
export const atmosphereFragmentShader = /* glsl */ `
uniform vec3 uSkyColorTop;
uniform vec3 uSkyColorBottom;
uniform vec3 uSunColor;
uniform vec3 uSunDirection;
uniform float uSunSize;
uniform float uTime;

varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(vWorldPosition - cameraPosition);

  // Gradient sky
  float horizonFactor = viewDir.y * 0.5 + 0.5;
  vec3 skyColor = mix(uSkyColorBottom, uSkyColorTop, horizonFactor);

  // Sun disc
  float sunDot = dot(viewDir, normalize(uSunDirection));
  float sun = smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.5, sunDot);

  // Sun glow
  float sunGlow = pow(max(0.0, sunDot), 8.0) * 0.5;

  vec3 finalColor = skyColor + uSunColor * sun + uSunColor * sunGlow * 0.3;

  // Atmosphere scattering (orange near horizon)
  float scatter = pow(1.0 - abs(viewDir.y), 4.0);
  vec3 scatterColor = vec3(1.0, 0.6, 0.3);
  finalColor = mix(finalColor, scatterColor, scatter * 0.3);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Shared uniforms type - must have index signature for Three.js compatibility
export interface TerrainUniforms {
  [key: string]: { value: unknown };
  uTime: { value: number };
  uHeightScale: { value: number };
  uNoiseScale: { value: number };
  uChunkOffset: { value: [number, number] };
  uHeightmap: { value: THREE.Texture | null };
  uUseHeightmap: { value: boolean };
  uGrassColor: { value: THREE.Color };
  uDirtColor: { value: THREE.Color };
  uConcreteColor: { value: THREE.Color };
  uSandColor: { value: THREE.Color };
  uFogColor: { value: THREE.Color };
  uFogNear: { value: number };
  uFogFar: { value: number };
  uSunDirection: { value: THREE.Vector3 };
  uSunIntensity: { value: number };
  uAmbientIntensity: { value: number };
  uDistrictType: { value: number };
}

// Import THREE types for the interface
import * as THREE from 'three';

// Default uniform values
export function createTerrainUniforms(): TerrainUniforms {
  return {
    uTime: { value: 0 },
    uHeightScale: { value: 50 },
    uNoiseScale: { value: 0.002 },
    uChunkOffset: { value: [0, 0] },
    uHeightmap: { value: null },
    uUseHeightmap: { value: false },
    uGrassColor: { value: new THREE.Color('#4ade80') },
    uDirtColor: { value: new THREE.Color('#a3a095') },
    uConcreteColor: { value: new THREE.Color('#6b7280') },
    uSandColor: { value: new THREE.Color('#fcd34d') },
    uFogColor: { value: new THREE.Color('#1a1a2e') },
    uFogNear: { value: 400 },
    uFogFar: { value: 800 },
    uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uSunIntensity: { value: 1.0 },
    uAmbientIntensity: { value: 0.3 },
    uDistrictType: { value: 0 },
  };
}
