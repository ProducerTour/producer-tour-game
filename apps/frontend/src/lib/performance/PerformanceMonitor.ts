// Performance Monitor - tracks frame rate, memory, and draw calls
import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  jsHeapSize: number;
  jsHeapLimit: number;
  timestamp: number;
}

export interface PerformanceBudget {
  targetFPS: number;
  maxFrameTime: number;
  maxDrawCalls: number;
  maxTriangles: number;
  maxTextureMemory: number;
  maxJSHeap: number;
}

export const DEFAULT_BUDGET: PerformanceBudget = {
  targetFPS: 60,
  maxFrameTime: 16.67, // ms
  maxDrawCalls: 200,
  maxTriangles: 500000,
  maxTextureMemory: 512 * 1024 * 1024, // 512MB
  maxJSHeap: 256 * 1024 * 1024, // 256MB
};

export type QualityLevel = 'high' | 'medium' | 'low';

export class PerformanceMonitor {
  private frameTimeHistory: number[] = [];
  private readonly HISTORY_SIZE = 60;
  private lastMetrics: PerformanceMetrics | null = null;
  private budget: PerformanceBudget;
  private currentQuality: QualityLevel = 'high';
  private qualityChangeCallbacks: Set<(quality: QualityLevel) => void> = new Set();

  // Thresholds for quality adjustment
  private readonly LOW_FPS_THRESHOLD = 30;
  private readonly MEDIUM_FPS_THRESHOLD = 50;
  private readonly RECOVERY_FPS_THRESHOLD = 55;

  // Debounce quality changes
  private lowFPSFrames = 0;
  private highFPSFrames = 0;
  private readonly FRAMES_BEFORE_CHANGE = 30;

  constructor(budget: Partial<PerformanceBudget> = {}) {
    this.budget = { ...DEFAULT_BUDGET, ...budget };
  }

  // Call every frame with delta time
  update(deltaTime: number, renderer?: THREE.WebGLRenderer): PerformanceMetrics {
    const frameTimeMs = deltaTime * 1000;
    this.frameTimeHistory.push(frameTimeMs);

    if (this.frameTimeHistory.length > this.HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }

    const avgFrameTime =
      this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const fps = 1000 / avgFrameTime;

    // Get memory info if available
    const memory = (performance as any).memory;
    const jsHeapSize = memory?.usedJSHeapSize ?? 0;
    const jsHeapLimit = memory?.jsHeapSizeLimit ?? 0;

    // Get renderer info
    let drawCalls = 0;
    let triangles = 0;
    let geometries = 0;
    let textures = 0;

    if (renderer) {
      const info = renderer.info;
      drawCalls = info.render.calls;
      triangles = info.render.triangles;
      geometries = info.memory.geometries;
      textures = info.memory.textures;
    }

    this.lastMetrics = {
      fps,
      frameTime: avgFrameTime,
      drawCalls,
      triangles,
      geometries,
      textures,
      jsHeapSize,
      jsHeapLimit,
      timestamp: Date.now(),
    };

    // Check for quality adjustment
    this.checkQualityAdjustment(fps);

    return this.lastMetrics;
  }

  private checkQualityAdjustment(fps: number): void {
    // Check if we need to lower quality
    if (fps < this.LOW_FPS_THRESHOLD) {
      this.lowFPSFrames++;
      this.highFPSFrames = 0;

      if (this.lowFPSFrames >= this.FRAMES_BEFORE_CHANGE) {
        if (this.currentQuality === 'high') {
          this.setQuality('medium');
        } else if (this.currentQuality === 'medium') {
          this.setQuality('low');
        }
        this.lowFPSFrames = 0;
      }
    } else if (fps < this.MEDIUM_FPS_THRESHOLD && this.currentQuality === 'high') {
      this.lowFPSFrames++;
      this.highFPSFrames = 0;

      if (this.lowFPSFrames >= this.FRAMES_BEFORE_CHANGE) {
        this.setQuality('medium');
        this.lowFPSFrames = 0;
      }
    }
    // Check if we can raise quality
    else if (fps > this.RECOVERY_FPS_THRESHOLD) {
      this.highFPSFrames++;
      this.lowFPSFrames = 0;

      if (this.highFPSFrames >= this.FRAMES_BEFORE_CHANGE * 2) {
        if (this.currentQuality === 'low') {
          this.setQuality('medium');
        } else if (this.currentQuality === 'medium') {
          this.setQuality('high');
        }
        this.highFPSFrames = 0;
      }
    } else {
      // FPS is acceptable, reset counters
      this.lowFPSFrames = Math.max(0, this.lowFPSFrames - 1);
      this.highFPSFrames = Math.max(0, this.highFPSFrames - 1);
    }
  }

  private setQuality(quality: QualityLevel): void {
    if (quality === this.currentQuality) return;

    const previousQuality = this.currentQuality;
    this.currentQuality = quality;

    console.log(`🎮 Quality changed: ${previousQuality} → ${quality}`);

    // Notify subscribers
    this.qualityChangeCallbacks.forEach((callback) => {
      try {
        callback(quality);
      } catch (e) {
        console.error('Quality change callback error:', e);
      }
    });
  }

  // Subscribe to quality changes
  onQualityChange(callback: (quality: QualityLevel) => void): () => void {
    this.qualityChangeCallbacks.add(callback);
    return () => this.qualityChangeCallbacks.delete(callback);
  }

  // Getters
  getMetrics(): PerformanceMetrics | null {
    return this.lastMetrics;
  }

  getAverageFPS(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const avgFrameTime =
      this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    return 1000 / avgFrameTime;
  }

  getCurrentQuality(): QualityLevel {
    return this.currentQuality;
  }

  getBudget(): PerformanceBudget {
    return this.budget;
  }

  // Check if metrics are within budget
  isWithinBudget(): boolean {
    if (!this.lastMetrics) return true;

    const m = this.lastMetrics;
    const b = this.budget;

    return (
      m.fps >= b.targetFPS * 0.9 &&
      m.drawCalls <= b.maxDrawCalls &&
      m.triangles <= b.maxTriangles &&
      m.jsHeapSize <= b.maxJSHeap
    );
  }

  // Get budget violations
  getBudgetViolations(): string[] {
    if (!this.lastMetrics) return [];

    const violations: string[] = [];
    const m = this.lastMetrics;
    const b = this.budget;

    if (m.fps < b.targetFPS * 0.9) {
      violations.push(`FPS: ${m.fps.toFixed(1)} < ${b.targetFPS}`);
    }
    if (m.drawCalls > b.maxDrawCalls) {
      violations.push(`Draw calls: ${m.drawCalls} > ${b.maxDrawCalls}`);
    }
    if (m.triangles > b.maxTriangles) {
      violations.push(`Triangles: ${m.triangles} > ${b.maxTriangles}`);
    }
    if (m.jsHeapSize > b.maxJSHeap) {
      violations.push(
        `JS Heap: ${(m.jsHeapSize / 1024 / 1024).toFixed(1)}MB > ${b.maxJSHeap / 1024 / 1024}MB`
      );
    }

    return violations;
  }

  // Force quality level (overrides auto adjustment)
  forceQuality(quality: QualityLevel): void {
    this.setQuality(quality);
    // Reset counters to prevent immediate override
    this.lowFPSFrames = 0;
    this.highFPSFrames = 0;
  }

  // Reset history
  reset(): void {
    this.frameTimeHistory = [];
    this.lastMetrics = null;
    this.lowFPSFrames = 0;
    this.highFPSFrames = 0;
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

export function resetPerformanceMonitor(): void {
  if (monitorInstance) {
    monitorInstance.reset();
  }
  monitorInstance = null;
}
