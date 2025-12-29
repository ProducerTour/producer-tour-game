/**
 * treeBillboardShader.ts
 * Camera-facing billboard shader for distant tree rendering
 *
 * Features:
 * - Camera-facing rotation (cylindrical billboarding)
 * - Crossfade alpha support for LOD transitions
 * - Wind animation
 * - Color/tint variation
 */

export const treeBillboardVertexShader = /* glsl */ `
  precision highp float;

  // Instance attributes
  attribute vec3 instancePosition;
  attribute float instanceScale;
  attribute float instanceRotation;
  attribute float instanceCrossfade;

  // Uniforms
  uniform float uTime;
  uniform float uWindStrength;
  uniform float uWindSpeed;
  uniform vec3 uCameraPosition;

  // Varyings
  varying vec2 vUv;
  varying float vCrossfade;
  varying float vFogDepth;

  void main() {
    vUv = uv;
    vCrossfade = instanceCrossfade;

    // Billboard quad vertices (assuming PlaneGeometry centered at origin)
    vec3 localPos = position;

    // Apply instance scale
    localPos *= instanceScale;

    // Calculate direction to camera (cylindrical billboarding - Y axis locked)
    vec3 toCamera = uCameraPosition - instancePosition;
    toCamera.y = 0.0; // Lock Y axis
    toCamera = normalize(toCamera);

    // Calculate right vector (perpendicular to camera direction and up)
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(cross(up, toCamera));

    // Rotate billboard to face camera
    vec3 billboardPos = right * localPos.x + up * localPos.y;

    // Add slight wind sway at the top
    float windOffset = sin(uTime * uWindSpeed + instancePosition.x * 0.1 + instancePosition.z * 0.1);
    float heightFactor = max(0.0, localPos.y) / instanceScale; // Higher parts sway more
    billboardPos.x += windOffset * uWindStrength * heightFactor * heightFactor;

    // Apply instance position
    vec3 worldPos = instancePosition + billboardPos;

    // Calculate fog depth
    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    vFogDepth = -mvPosition.z;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const treeBillboardFragmentShader = /* glsl */ `
  precision highp float;

  // Uniforms
  uniform sampler2D uBillboardTexture;
  uniform float uAlphaTest;
  uniform vec3 uTintColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uFogColor;

  // Varyings
  varying vec2 vUv;
  varying float vCrossfade;
  varying float vFogDepth;

  void main() {
    // Sample billboard texture
    vec4 texColor = texture2D(uBillboardTexture, vUv);

    // Alpha test (discard transparent pixels)
    if (texColor.a < uAlphaTest) {
      discard;
    }

    // Apply tint
    vec3 color = texColor.rgb * uTintColor;

    // Apply crossfade alpha (for LOD transitions)
    // vCrossfade: 0 = fully 3D (invisible billboard), 1 = fully billboard (visible)
    float alpha = texColor.a * vCrossfade;

    // Apply fog
    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    color = mix(color, uFogColor, fogFactor);

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Default uniforms for billboard shader
 */
export const treeBillboardUniforms = {
  uBillboardTexture: { value: null as THREE.Texture | null },
  uTime: { value: 0 },
  uWindStrength: { value: 0.5 },
  uWindSpeed: { value: 1.5 },
  uCameraPosition: { value: [0, 0, 0] },
  uAlphaTest: { value: 0.5 },
  uTintColor: { value: [1, 1, 1] },
  uFogNear: { value: 200 },
  uFogFar: { value: 500 },
  uFogColor: { value: [0.7, 0.8, 0.9] },
};

import type * as THREE from 'three';
