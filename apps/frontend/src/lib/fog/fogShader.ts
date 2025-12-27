/**
 * fogShader.ts
 * GLSL fog calculation functions based on ShaderX2 techniques
 *
 * Three fog types implemented:
 * 1. Linear Fog: fogFactor = (far - distance) / (far - near)
 * 2. Exponential Fog: fogFactor = exp(-distance * density)
 * 3. Exponential Squared: fogFactor = exp(-(distance * density)^2)
 *
 * Usage in shaders:
 * 1. Include fog uniforms declarations
 * 2. Include fog function definitions
 * 3. Call calcFogFactor() with distance from camera
 * 4. Use mix(fogColor, pixelColor, fogFactor) for final color
 *
 * Reference: ShaderX2 - Fog Rendering by Markus Nuebel (2004)
 */

/**
 * Fog uniform declarations for GLSL shaders
 * Include this at the top of your fragment shader
 */
export const fogUniformsGLSL = /* glsl */ `
// Fog configuration uniforms
uniform bool fogEnabled;
uniform int fogType;        // 0=None, 1=Linear, 2=Exponential, 3=ExpSquared
uniform vec3 fogColor;
uniform float fogNear;      // Start distance (linear fog)
uniform float fogFar;       // End distance (linear fog / reference for exp)
uniform float fogDensity;   // Density factor (exponential types)

// Height-based fog uniforms
uniform bool fogHeightEnabled;
uniform float fogBaseHeight;
uniform float fogHeightFalloff;
uniform float fogMinDensity;
`;

/**
 * Fog calculation functions for GLSL shaders
 * Include this after uniform declarations
 *
 * Returns fog factor: 1.0 = no fog (full object color), 0.0 = full fog
 */
export const fogFunctionsGLSL = /* glsl */ `
/**
 * Calculate linear fog factor
 * fogFactor = clamp((far - distance) / (far - near), 0, 1)
 *
 * @param dist Distance from camera to fragment
 * @return Fog factor (1 = no fog, 0 = full fog)
 */
float calcLinearFogFactor(float dist) {
  // Range between min and max fog distances
  float fogRange = fogFar - fogNear;
  // Delta from fragment to max distance
  float fogDelta = fogFar - dist;
  // Ratio gives us the fog factor
  float factor = fogDelta / fogRange;
  // Clamp to valid range
  return clamp(factor, 0.0, 1.0);
}

/**
 * Calculate exponential fog factor
 * fogFactor = 1.0 / exp(distance * density) = exp(-distance * density)
 *
 * Fog starts from camera position, increases exponentially with distance.
 * Density controls how quickly fog thickens.
 *
 * @param dist Distance from camera to fragment
 * @return Fog factor (1 = no fog, 0 = full fog)
 */
float calcExpFogFactor(float dist) {
  // Normalize distance relative to fog far distance
  // This allows density to work predictably regardless of world scale
  float normalizedDist = dist / fogFar;

  // Multiply by 4 so that at fogFar distance we get ~0.02 fog factor
  // (e^-4 ≈ 0.018)
  float exponent = normalizedDist * 4.0 * (fogDensity * 100.0);

  // exp(-x) gives us decreasing factor as distance increases
  return exp(-exponent);
}

/**
 * Calculate exponential squared fog factor
 * fogFactor = exp(-(distance * density)^2)
 *
 * Similar to exponential but squared - drops more sharply near camera
 * and levels off as distance increases. Often produces more pleasing results.
 *
 * @param dist Distance from camera to fragment
 * @return Fog factor (1 = no fog, 0 = full fog)
 */
float calcExpSquaredFogFactor(float dist) {
  // Normalize distance relative to fog far distance
  float normalizedDist = dist / fogFar;

  // Calculate the exponent term
  float exponent = normalizedDist * 3.5 * (fogDensity * 100.0);

  // Square the exponent for the "squared" variant
  // This creates sharper falloff near camera, gentler at distance
  return exp(-(exponent * exponent));
}

/**
 * Apply height-based fog density modification
 * Fog is thickest at base height and thins with altitude
 *
 * @param baseFactor Base fog factor from distance calculation
 * @param worldHeight World-space Y coordinate of fragment
 * @return Modified fog factor
 */
float applyHeightFog(float baseFactor, float worldHeight) {
  if (!fogHeightEnabled) {
    return baseFactor;
  }

  // Calculate height above fog base
  float heightAboveBase = max(0.0, worldHeight - fogBaseHeight);

  // Exponential falloff with height
  float heightMultiplier = exp(-heightAboveBase * fogHeightFalloff);

  // Clamp to minimum density
  heightMultiplier = max(heightMultiplier, fogMinDensity);

  // Apply height modifier to fog factor
  // When heightMultiplier is low (high altitude), fog effect is reduced
  // fogFactor closer to 1.0 means less fog
  return mix(1.0, baseFactor, heightMultiplier);
}

/**
 * Main fog factor calculation
 * Selects appropriate fog type and applies height modification
 *
 * @param dist Distance from camera to fragment
 * @param worldHeight World-space Y coordinate (for height fog)
 * @return Final fog factor (1 = no fog, 0 = full fog)
 */
float calcFogFactor(float dist, float worldHeight) {
  if (!fogEnabled || fogType == 0) {
    return 1.0; // No fog
  }

  float factor;

  // Select fog calculation based on type
  if (fogType == 1) {
    // Linear fog
    factor = calcLinearFogFactor(dist);
  } else if (fogType == 2) {
    // Exponential fog
    factor = calcExpFogFactor(dist);
  } else {
    // Exponential squared fog (default, type 3)
    factor = calcExpSquaredFogFactor(dist);
  }

  // Apply height-based modification
  factor = applyHeightFog(factor, worldHeight);

  return factor;
}

/**
 * Simplified fog factor calculation (no height fog)
 * Use when worldHeight is not available
 *
 * @param dist Distance from camera to fragment
 * @return Fog factor (1 = no fog, 0 = full fog)
 */
float calcFogFactorSimple(float dist) {
  return calcFogFactor(dist, 0.0);
}

/**
 * Apply fog to a color
 * Blends between fog color and object color based on fog factor
 *
 * @param objectColor Original fragment color
 * @param fogFactor Fog factor (1 = no fog, 0 = full fog)
 * @return Final color with fog applied
 */
vec3 applyFog(vec3 objectColor, float fogFactor) {
  return mix(fogColor, objectColor, fogFactor);
}

/**
 * Convenience function: calculate and apply fog in one step
 *
 * @param objectColor Original fragment color
 * @param dist Distance from camera to fragment
 * @param worldHeight World-space Y coordinate
 * @return Final color with fog applied
 */
vec3 applyFogComplete(vec3 objectColor, float dist, float worldHeight) {
  if (!fogEnabled) {
    return objectColor;
  }
  float factor = calcFogFactor(dist, worldHeight);
  return applyFog(objectColor, factor);
}
`;

/**
 * Complete fog shader chunk (uniforms + functions)
 * Include this in shaders that need fog support
 */
export const fogShaderChunk = fogUniformsGLSL + '\n' + fogFunctionsGLSL;

/**
 * Vertex shader output for fog (add to vertex shader varyings)
 */
export const fogVertexOutputsGLSL = /* glsl */ `
varying float vFogDepth;
varying float vWorldHeight;
`;

/**
 * Vertex shader fog depth calculation
 * Add this to your vertex shader main() function
 */
export const fogVertexCalcGLSL = /* glsl */ `
// Calculate fog depth (distance from camera in view space)
vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
vFogDepth = -mvPosition.z;

// World height for height-based fog
vec4 worldPos = modelMatrix * vec4(position, 1.0);
vWorldHeight = worldPos.y;
`;

/**
 * Fragment shader fog inputs (matching vertex outputs)
 */
export const fogFragmentInputsGLSL = /* glsl */ `
varying float vFogDepth;
varying float vWorldHeight;
`;

/**
 * Example usage in a fragment shader:
 *
 * // At the end of main(), before gl_FragColor:
 * float fogFactor = calcFogFactor(vFogDepth, vWorldHeight);
 * finalColor = applyFog(finalColor, fogFactor);
 * gl_FragColor = vec4(finalColor, 1.0);
 */

/**
 * Legacy fog support (for backward compatibility with existing shaders)
 * Converts old fogNear/fogFar linear fog to the new system
 */
export const legacyFogGLSL = /* glsl */ `
// Legacy linear fog calculation (for backward compatibility)
float calcLegacyFog(float depth, float near, float far) {
  return 1.0 - smoothstep(near, far, depth);
}
`;

/**
 * Default fog uniform values for material creation
 */
export const defaultFogUniformValues = {
  fogEnabled: true,
  fogType: 3, // ExponentialSquared
  fogColor: [0.7, 0.77, 0.85], // Light blue-gray
  fogNear: 100,
  fogFar: 400,
  fogDensity: 0.008,
  fogHeightEnabled: false,
  fogBaseHeight: 0,
  fogHeightFalloff: 0.02,
  fogMinDensity: 0.3,
};
