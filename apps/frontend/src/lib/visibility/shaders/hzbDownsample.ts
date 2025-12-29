/**
 * HZB Downsample Shader
 * Takes the MAX of 2x2 depth samples for conservative occlusion culling
 * This creates a depth pyramid where each mip level stores the maximum depth
 * of its 4 child texels (farthest from camera = most conservative)
 */

export const hzbDownsampleVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const hzbDownsampleFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uPreviousLevel;
  uniform vec2 uTexelSize;  // 1.0 / previousLevelSize

  varying vec2 vUv;

  void main() {
    // Sample 4 texels from previous level
    // Offset by half texel to sample at texel centers
    vec2 offset = uTexelSize * 0.5;

    float d0 = texture2D(uPreviousLevel, vUv + vec2(-offset.x, -offset.y)).r;
    float d1 = texture2D(uPreviousLevel, vUv + vec2( offset.x, -offset.y)).r;
    float d2 = texture2D(uPreviousLevel, vUv + vec2(-offset.x,  offset.y)).r;
    float d3 = texture2D(uPreviousLevel, vUv + vec2( offset.x,  offset.y)).r;

    // Take MAX depth (farthest from camera)
    // Using max ensures conservative culling - object is only culled
    // if it's behind ALL 4 samples
    float maxDepth = max(max(d0, d1), max(d2, d3));

    gl_FragColor = vec4(maxDepth, 0.0, 0.0, 1.0);
  }
`;

export const hzbDownsampleUniforms = {
  uPreviousLevel: { value: null as THREE.Texture | null },
  uTexelSize: { value: [1.0 / 1024, 1.0 / 512] },
};

import type * as THREE from 'three';
