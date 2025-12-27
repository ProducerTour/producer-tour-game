/**
 * Fog System
 *
 * Advanced fog rendering based on ShaderX2 techniques.
 * Supports linear, exponential, and exponential squared fog types.
 *
 * Usage:
 * ```typescript
 * import {
 *   FogType,
 *   createFogUniforms,
 *   fogShaderChunk,
 * } from '@/lib/fog';
 *
 * // In your shader material:
 * const uniforms = {
 *   ...createFogUniforms({ type: FogType.ExponentialSquared }),
 *   // ... other uniforms
 * };
 *
 * // In your fragment shader (include fogShaderChunk):
 * // float fogFactor = calcFogFactor(vFogDepth, vWorldHeight);
 * // finalColor = applyFog(finalColor, fogFactor);
 * ```
 */

// Configuration and types
export {
  FogType,
  type FogConfig,
  type FogUniforms,
  DEFAULT_FOG_CONFIG,
  FOG_PRESETS,
  createFogUniforms,
  updateFogUniforms,
  getFogTypeName,
} from './FogConfig';

// Shader utilities
export {
  fogUniformsGLSL,
  fogFunctionsGLSL,
  fogShaderChunk,
  fogVertexOutputsGLSL,
  fogVertexCalcGLSL,
  fogFragmentInputsGLSL,
  legacyFogGLSL,
  defaultFogUniformValues,
} from './fogShader';
