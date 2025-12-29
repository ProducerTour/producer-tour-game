/**
 * Grass Wind System
 * Manages Perlin noise-based wind animation for procedural grass
 *
 * Features:
 * - Pre-computed Perlin noise texture for GPU sampling
 * - Animated wind direction and strength
 * - Gust patterns for natural variation
 * - Shared across all grass chunks (single texture, single update)
 */

import * as THREE from 'three';

// Simple seeded random for deterministic noise
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Simple 2D noise function (Perlin-like)
function noise2D(x: number, y: number, seed: number = 0): number {
  // Grid cell coordinates
  const xi = Math.floor(x);
  const yi = Math.floor(y);

  // Fractional position within cell
  const xf = x - xi;
  const yf = y - yi;

  // Smoothstep for interpolation
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  // Random values at corners
  const aa = seededRandom(xi * 1000 + yi + seed);
  const ab = seededRandom(xi * 1000 + yi + 1 + seed);
  const ba = seededRandom((xi + 1) * 1000 + yi + seed);
  const bb = seededRandom((xi + 1) * 1000 + yi + 1 + seed);

  // Bilinear interpolation
  const x1 = aa + u * (ba - aa);
  const x2 = ab + u * (bb - ab);
  return x1 + v * (x2 - x1);
}

// Fractal Brownian Motion (FBM) for more natural noise
function fbm2D(x: number, y: number, octaves: number = 4, seed: number = 0): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency, seed + i * 100);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

export interface GrassWindConfig {
  textureSize: number;
  baseWindStrength: number;
  gustStrength: number;
  gustFrequency: number;
  directionChangeSpeed: number;
}

const DEFAULT_CONFIG: GrassWindConfig = {
  textureSize: 256,
  baseWindStrength: 0.4,
  gustStrength: 0.3,
  gustFrequency: 0.3,
  directionChangeSpeed: 0.1,
};

export class GrassWindSystem {
  private noiseTexture: THREE.CanvasTexture;
  private windDirection: THREE.Vector2;
  private windStrength: number;
  private time: number;
  private config: GrassWindConfig;
  private disposed: boolean = false;

  constructor(config: Partial<GrassWindConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.windDirection = new THREE.Vector2(1, 0);
    this.windStrength = this.config.baseWindStrength;
    this.time = 0;
    this.noiseTexture = this.generateNoiseTexture();
  }

  /**
   * Generate a Perlin noise texture for wind sampling
   * Uses FBM for natural-looking patterns
   * Uses CanvasTexture for maximum browser/WebGL compatibility
   */
  private generateNoiseTexture(): THREE.CanvasTexture {
    const size = this.config.textureSize;

    // Create canvas and get 2D context
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      // Fallback: return a simple white texture if canvas context fails
      console.warn('GrassWindSystem: Could not get 2D context, using fallback texture');
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 1;
      fallbackCanvas.height = 1;
      const fallbackCtx = fallbackCanvas.getContext('2d')!;
      fallbackCtx.fillStyle = '#808080';
      fallbackCtx.fillRect(0, 0, 1, 1);
      const fallbackTexture = new THREE.CanvasTexture(fallbackCanvas);
      fallbackTexture.wrapS = THREE.RepeatWrapping;
      fallbackTexture.wrapT = THREE.RepeatWrapping;
      return fallbackTexture;
    }

    // Create ImageData to fill with noise
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const noiseScale = 0.08; // Controls noise frequency
    const seed = Math.random() * 10000;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Use FBM for multi-scale noise
        const value = fbm2D(x * noiseScale, y * noiseScale, 4, seed);

        // Convert 0-1 to 0-255 byte range
        const byteValue = Math.floor(value * 255);
        const idx = (y * size + x) * 4;

        // Store grayscale noise in RGB channels
        data[idx + 0] = byteValue;     // R - noise value
        data[idx + 1] = byteValue;     // G - same for consistency
        data[idx + 2] = byteValue;     // B - same for consistency
        data[idx + 3] = 255;           // A - fully opaque
      }
    }

    // Put the image data onto the canvas
    ctx.putImageData(imageData, 0, 0);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Update wind state each frame
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    if (this.disposed) return;

    this.time += deltaTime;

    // Gust variation - strength oscillates
    const gustWave = Math.sin(this.time * this.config.gustFrequency * Math.PI);
    const gustWave2 = Math.sin(this.time * this.config.gustFrequency * 0.7 * Math.PI + 1.5);
    const gustMultiplier = 0.5 + (gustWave * 0.3 + gustWave2 * 0.2);

    this.windStrength = this.config.baseWindStrength +
      this.config.gustStrength * gustMultiplier;

    // Direction shifts slowly over time
    const dirAngle = Math.sin(this.time * this.config.directionChangeSpeed) * 0.4 +
      Math.sin(this.time * this.config.directionChangeSpeed * 0.3 + 2) * 0.2;

    this.windDirection.set(
      Math.cos(dirAngle),
      Math.sin(dirAngle)
    ).normalize();
  }

  /**
   * Get the noise texture for shader uniform
   */
  getNoiseTexture(): THREE.CanvasTexture {
    return this.noiseTexture;
  }

  /**
   * Get current wind direction (normalized)
   */
  getWindDirection(): THREE.Vector2 {
    return this.windDirection;
  }

  /**
   * Get current wind strength (0-1 range)
   */
  getWindStrength(): number {
    return this.windStrength;
  }

  /**
   * Get current time for shader animation
   */
  getTime(): number {
    return this.time;
  }

  /**
   * Set wind configuration at runtime
   */
  setConfig(config: Partial<GrassWindConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Force regenerate noise texture (e.g., on seed change)
   */
  regenerateNoise(): void {
    if (this.noiseTexture) {
      this.noiseTexture.dispose();
    }
    this.noiseTexture = this.generateNoiseTexture();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.disposed = true;
    if (this.noiseTexture) {
      this.noiseTexture.dispose();
    }
  }
}

// Singleton instance for global wind (shared across all grass chunks)
let globalWindSystem: GrassWindSystem | null = null;

/**
 * Get or create the global wind system instance
 * All grass chunks share the same wind for coherent animation
 */
export function getGlobalWindSystem(config?: Partial<GrassWindConfig>): GrassWindSystem {
  if (!globalWindSystem) {
    globalWindSystem = new GrassWindSystem(config);
  }
  return globalWindSystem;
}

/**
 * Dispose of the global wind system
 */
export function disposeGlobalWindSystem(): void {
  if (globalWindSystem) {
    globalWindSystem.dispose();
    globalWindSystem = null;
  }
}

// Handle HMR (Hot Module Replacement) - dispose singleton on module reload
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeGlobalWindSystem();
  });
}

export default GrassWindSystem;
