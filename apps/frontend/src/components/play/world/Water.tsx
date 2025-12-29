/**
 * Water.tsx
 * Global water plane with animated normal map + Fresnel
 *
 * Uses shader-based approach:
 * - Two scrolling normal map samples (same texture, different scales/speeds)
 * - Fresnel for edge reflectivity
 * - Fog-compatible
 */

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { getTexturePath } from '../../../config/assetPaths';
import { useGamePause } from '../context';

// Water normal map path - uses CDN in production, local in development
const WATER_NORMAL_MAP = getTexturePath('Water/Water_002_SD/Water_002_NORM.jpg');

export interface WaterProps {
  /** Y position of water surface */
  seaLevel?: number;

  /** Size of water plane (extends in all directions) */
  size?: number;

  /** Deep water color */
  deepColor?: string;

  /** Shallow/surface water color */
  shallowColor?: string;

  /** Wave speed multiplier */
  waveSpeed?: number;

  /** Wave scale (smaller = larger waves) */
  waveScale?: number;

  /** Fresnel power (higher = more edge reflection) */
  fresnelPower?: number;

  /** Enable fog blending */
  fogEnabled?: boolean;
}

// Vertex shader - passes world position and view direction
const waterVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vViewDirection = normalize(cameraPosition - worldPos.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Fragment shader - texture-based animated normals + proper lighting
const waterFragmentShader = `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform float uWaveSpeed;
  uniform float uWaveScale;
  uniform float uFresnelPower;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform bool uFogEnabled;
  uniform sampler2D uNormalMap;

  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;
  varying vec2 vUv;

  void main() {
    // Scale UVs - higher multiplier for more visible ripples
    // uWaveScale = 0.5 gives medium-sized waves, 2.0 gives small choppy waves
    vec2 worldUv = vWorldPosition.xz * 0.05 * uWaveScale;

    float speed = uWaveSpeed;

    // Two scrolling UV coordinates (same texture, different scales/speeds)
    vec2 uv1 = worldUv + vec2(uTime * speed * 0.03, uTime * speed * 0.02);
    vec2 uv2 = worldUv * 1.5 - vec2(uTime * speed * 0.025, uTime * speed * 0.04);

    // Sample normal map twice and blend
    vec3 normal1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
    vec3 normal2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;

    // Blend normals with detail blend (RNM-style for better detail)
    vec3 blendedNormal = normalize(vec3(
      normal1.xy + normal2.xy,
      normal1.z * normal2.z
    ));

    // Convert from tangent space to world space for horizontal plane
    // Tangent space: X=right, Y=forward, Z=up
    // World space for water: X=right, Y=up, Z=forward
    // Use full normal strength for visible waves
    vec3 normal = normalize(vec3(
      blendedNormal.x * 2.0,
      1.0,
      blendedNormal.y * 2.0
    ));

    // Primary sun light - low angle for dramatic reflections
    vec3 sunDir = normalize(vec3(0.4, 0.3, 0.5));
    vec3 sunColor = vec3(1.0, 0.95, 0.85);

    // Diffuse lighting - makes normal map affect surface brightness
    float diffuse = max(dot(normal, sunDir), 0.0);
    diffuse = 0.4 + diffuse * 0.6; // Ambient floor + diffuse

    // Fresnel effect - more reflective at glancing angles
    float fresnel = pow(1.0 - max(dot(vViewDirection, normal), 0.0), uFresnelPower);
    fresnel = clamp(fresnel, 0.0, 1.0);

    // Base water color with Fresnel-based mixing
    vec3 waterColor = mix(uDeepColor, uShallowColor, fresnel * 0.6 + 0.2);

    // Apply diffuse lighting to water color
    waterColor *= diffuse;

    // Specular highlight (sun reflection on waves)
    vec3 halfDir = normalize(sunDir + vViewDirection);
    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);
    // Scatter specular across more normals for visible sparkle
    float scatter = pow(max(dot(normal, halfDir), 0.0), 16.0) * 0.3;
    waterColor += sunColor * (spec * 1.5 + scatter);

    // Secondary fill light from opposite direction
    vec3 fillDir = normalize(vec3(-0.3, 0.5, -0.4));
    float fillDiffuse = max(dot(normal, fillDir), 0.0) * 0.15;
    waterColor += uShallowColor * fillDiffuse;

    // Rim/horizon glow based on Fresnel
    waterColor += uShallowColor * fresnel * 0.25;

    // Apply fog
    if (uFogEnabled) {
      float depth = length(vWorldPosition - cameraPosition);
      float fogFactor = 1.0 - exp(-uFogDensity * depth);
      waterColor = mix(waterColor, uFogColor, fogFactor);
    }

    gl_FragColor = vec4(waterColor, 0.9);
  }
`;

export function Water({
  seaLevel = 0,
  size = 4000,
  deepColor = '#0a3d62',
  shallowColor = '#48c9b0',
  waveSpeed = 0.8,
  waveScale = 1.0,
  fresnelPower = 2.5,
  fogEnabled = true,
}: WaterProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const isPaused = useGamePause();

  // Load normal map texture
  const normalMap = useTexture(WATER_NORMAL_MAP);

  // Configure texture for seamless tiling
  useMemo(() => {
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(1, 1);
  }, [normalMap]);

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(deepColor) },
        uShallowColor: { value: new THREE.Color(shallowColor) },
        uWaveSpeed: { value: waveSpeed },
        uWaveScale: { value: waveScale },
        uFresnelPower: { value: fresnelPower },
        uFogColor: { value: new THREE.Color('#9cb4cc') },
        uFogDensity: { value: 0.012 },
        uFogEnabled: { value: fogEnabled },
        uNormalMap: { value: normalMap },
      },
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, [deepColor, shallowColor, waveSpeed, waveScale, fresnelPower, fogEnabled, normalMap]);

  // Animate water (skip when paused for performance)
  useFrame((_, delta) => {
    if (isPaused) return;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, seaLevel - 0.1, 0]}
      receiveShadow={false}
      frustumCulled={true}
    >
      <planeGeometry args={[size, size, 1, 1]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default Water;
