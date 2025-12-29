/**
 * VisibilityQualityAdapter.ts
 * Integrates visibility system with PerformanceMonitor quality levels
 *
 * Quality level settings:
 * - High: Full HZB + queries + temporal + billboards + instance culling
 * - Medium: 512 HZB, no queries, frustum only, reduced instance culling
 * - Low: CPU frustum only, no instance culling, increased cull distances
 */

import { type QualityLevel } from '../performance/PerformanceMonitor';
import { getVisibilityManager } from './VisibilityManager';
import type { VisibilityQualityLevel } from './types';

/**
 * Quality presets for visibility system
 */
export interface VisibilityQualityPreset {
  /** Enable HZB occlusion */
  hzbEnabled: boolean;
  /** HZB resolution */
  hzbResolution: 256 | 512 | 1024;
  /** Enable GPU occlusion queries */
  occlusionQueriesEnabled: boolean;
  /** Enable temporal coherence */
  temporalCoherenceEnabled: boolean;
  /** Enable per-instance culling */
  perInstanceCullingEnabled: boolean;
  /** Use CPU frustum only (no GPU features) */
  cpuFrustumOnly: boolean;
  /** Conservative margin for bounding boxes */
  conservativeMargin: number;
  /** Near chunk distance (never cull closer than this) */
  nearChunkDistance: number;
}

/**
 * Quality presets
 */
export const VISIBILITY_QUALITY_PRESETS: Record<QualityLevel, VisibilityQualityPreset> = {
  high: {
    hzbEnabled: true,
    hzbResolution: 1024,
    occlusionQueriesEnabled: true,
    temporalCoherenceEnabled: true,
    perInstanceCullingEnabled: true,
    cpuFrustumOnly: false,
    conservativeMargin: 1.1,
    nearChunkDistance: 64,
  },
  medium: {
    hzbEnabled: true,
    hzbResolution: 512,
    occlusionQueriesEnabled: false,
    temporalCoherenceEnabled: true,
    perInstanceCullingEnabled: true,
    cpuFrustumOnly: false,
    conservativeMargin: 1.15,
    nearChunkDistance: 96,
  },
  low: {
    hzbEnabled: false,
    hzbResolution: 256,
    occlusionQueriesEnabled: false,
    temporalCoherenceEnabled: false,
    perInstanceCullingEnabled: false,
    cpuFrustumOnly: true,
    conservativeMargin: 1.2,
    nearChunkDistance: 128,
  },
};

/**
 * Map PerformanceMonitor quality to visibility quality
 */
function mapQualityLevel(quality: QualityLevel): VisibilityQualityLevel {
  switch (quality) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * VisibilityQualityAdapter manages visibility system quality
 */
export class VisibilityQualityAdapter {
  private currentQuality: QualityLevel = 'high';
  private unsubscribe: (() => void) | null = null;

  /**
   * Apply a quality preset to the visibility system
   */
  applyQualityPreset(quality: QualityLevel): void {
    const preset = VISIBILITY_QUALITY_PRESETS[quality];
    const visibility = getVisibilityManager();

    // Apply preset to visibility manager
    visibility.setConfig({
      hzbEnabled: preset.hzbEnabled,
      hzbResolution: preset.hzbResolution,
      occlusionQueriesEnabled: preset.occlusionQueriesEnabled,
      temporalCoherenceEnabled: preset.temporalCoherenceEnabled,
      perInstanceCullingEnabled: preset.perInstanceCullingEnabled,
      cpuFrustumOnly: preset.cpuFrustumOnly,
      conservativeMargin: preset.conservativeMargin,
      nearChunkDistance: preset.nearChunkDistance,
    });

    // Set visibility quality level
    visibility.setQualityLevel(mapQualityLevel(quality));

    this.currentQuality = quality;

    console.log(`[VisibilityQualityAdapter] Applied ${quality} quality preset`);
  }

  /**
   * Subscribe to PerformanceMonitor quality changes
   */
  subscribeToPerformanceMonitor(
    monitor: { onQualityChange: (callback: (quality: QualityLevel) => void) => () => void }
  ): void {
    // Unsubscribe from any previous subscription
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // Subscribe to quality changes
    this.unsubscribe = monitor.onQualityChange((quality) => {
      this.applyQualityPreset(quality);
    });
  }

  /**
   * Unsubscribe from PerformanceMonitor
   */
  unsubscribeFromPerformanceMonitor(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Get current quality level
   */
  getCurrentQuality(): QualityLevel {
    return this.currentQuality;
  }

  /**
   * Get preset for a quality level
   */
  getPreset(quality: QualityLevel): VisibilityQualityPreset {
    return VISIBILITY_QUALITY_PRESETS[quality];
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.unsubscribeFromPerformanceMonitor();
  }
}

/**
 * Singleton instance
 */
let qualityAdapterInstance: VisibilityQualityAdapter | null = null;

/**
 * Get or create the quality adapter instance
 */
export function getVisibilityQualityAdapter(): VisibilityQualityAdapter {
  if (!qualityAdapterInstance) {
    qualityAdapterInstance = new VisibilityQualityAdapter();
  }
  return qualityAdapterInstance;
}

/**
 * Reset the quality adapter (for testing)
 */
export function resetVisibilityQualityAdapter(): void {
  if (qualityAdapterInstance) {
    qualityAdapterInstance.dispose();
    qualityAdapterInstance = null;
  }
}

/**
 * Check WebGL2 capabilities and return appropriate fallback quality
 */
export function detectCapabilities(gl: WebGLRenderingContext | WebGL2RenderingContext): {
  webgl2: boolean;
  maxTextureSize: number;
  maxUniformVectors: number;
  floatTextures: boolean;
  recommendedQuality: QualityLevel;
} {
  const isWebGL2 = gl instanceof WebGL2RenderingContext;

  // Check for float texture support
  let floatTextures = false;
  if (isWebGL2) {
    floatTextures = true;
  } else {
    floatTextures = !!gl.getExtension('OES_texture_float');
  }

  // Get hardware limits
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const maxUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number;

  // Determine recommended quality based on capabilities
  let recommendedQuality: QualityLevel = 'high';

  if (!isWebGL2) {
    // WebGL1 - fall back to low quality
    recommendedQuality = 'low';
  } else if (maxTextureSize < 4096 || maxUniformVectors < 256) {
    // Limited hardware - use medium
    recommendedQuality = 'medium';
  } else if (!floatTextures) {
    // No float textures - medium (HZB won't work well)
    recommendedQuality = 'medium';
  }

  return {
    webgl2: isWebGL2,
    maxTextureSize,
    maxUniformVectors,
    floatTextures,
    recommendedQuality,
  };
}

/**
 * Initialize visibility system with capability detection
 */
export function initializeWithCapabilityDetection(
  gl: WebGLRenderingContext | WebGL2RenderingContext
): QualityLevel {
  const capabilities = detectCapabilities(gl);

  console.log('[VisibilityQualityAdapter] Detected capabilities:', capabilities);

  const adapter = getVisibilityQualityAdapter();
  adapter.applyQualityPreset(capabilities.recommendedQuality);

  return capabilities.recommendedQuality;
}
