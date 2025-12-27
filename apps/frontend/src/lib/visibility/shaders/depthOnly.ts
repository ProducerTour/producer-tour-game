/**
 * Depth-Only Shader
 * Fast depth-only rendering for HZB base level generation
 * Outputs linear depth to the red channel
 */

export const depthOnlyVertexShader = /* glsl */ `
  varying float vDepth;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;  // Negative because view space Z is negative
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const depthOnlyFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uNear;
  uniform float uFar;

  varying float vDepth;

  void main() {
    // Linearize depth to [0, 1] range
    // 0 = near plane, 1 = far plane
    float linearDepth = (vDepth - uNear) / (uFar - uNear);
    linearDepth = clamp(linearDepth, 0.0, 1.0);

    gl_FragColor = vec4(linearDepth, 0.0, 0.0, 1.0);
  }
`;

export const depthOnlyUniforms = {
  uNear: { value: 0.1 },
  uFar: { value: 1000.0 },
};
