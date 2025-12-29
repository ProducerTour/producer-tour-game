/**
 * VisibilityManager.ts
 * Central coordinator for the visibility/occlusion culling system
 * Manages frustum culling, HZB generation, occlusion queries, and temporal coherence
 */

import * as THREE from 'three';
import { FrustumCuller } from './FrustumCuller';
import { VisibilityBuffer } from './VisibilityBuffer';
import { HZBGenerator } from './HZBGenerator';
import { OcclusionQueryPool } from './OcclusionQuery';
import { TemporalCoherence } from './TemporalCoherence';
import {
  type VisibilityConfig,
  type VisibilityStats,
  type VisibilityObject,
  type VisibilityChangeCallback,
  type QualityChangeCallback,
  type VisibilityQualityLevel,
  DEFAULT_VISIBILITY_CONFIG,
  DEFAULT_VISIBILITY_STATS,
} from './types';
import {
  CHUNK_SIZE,
  WORLD_SIZE,
  MIN_HEIGHT,
  MAX_HEIGHT,
} from '../terrain/TerrainConfig';

// Pre-allocated objects for future phases (HZB, occlusion queries)
// Will be used for bounding box projections and occlusion testing

/**
 * VisibilityManager orchestrates all visibility culling
 *
 * Phase 1 (Current): CPU frustum culling
 * Phase 2: HZB generation (to be added)
 * Phase 3: Occlusion queries (to be added)
 * Phase 4: Per-instance culling (to be added)
 */
export class VisibilityManager {
  /** WebGL renderer reference */
  private renderer: THREE.WebGLRenderer | null = null;

  /** Configuration */
  private config: VisibilityConfig;

  /** Frustum culler (CPU-based) */
  private frustumCuller: FrustumCuller;

  /** Visibility state buffer */
  private visibilityBuffer: VisibilityBuffer;

  /** HZB Generator for GPU-based occlusion */
  private hzbGenerator: HZBGenerator;

  /** Occlusion query pool for GPU queries */
  private queryPool: OcclusionQueryPool;

  /** Temporal coherence for query optimization */
  private temporalCoherence: TemporalCoherence;

  /** List of objects to use as occluders for HZB */
  private occluders: THREE.Object3D[] = [];

  /** Current quality level */
  private qualityLevel: VisibilityQualityLevel = 'high';

  /** Statistics for current frame */
  private stats: VisibilityStats = { ...DEFAULT_VISIBILITY_STATS };

  /** Frame timing (used for perf measurement) */
  private lastUpdateTime = 0;

  /** Visibility change callbacks */
  private changeCallbacks: VisibilityChangeCallback[] = [];

  /** Quality change callbacks */
  private qualityCallbacks: QualityChangeCallback[] = [];

  /** Is the system initialized */
  private initialized = false;

  /** Camera position for distance calculations */
  private cameraPosition = new THREE.Vector3();

  constructor(config?: Partial<VisibilityConfig>) {
    this.config = { ...DEFAULT_VISIBILITY_CONFIG, ...config };
    this.frustumCuller = new FrustumCuller(this.config);
    this.visibilityBuffer = new VisibilityBuffer(this.config);
    this.hzbGenerator = new HZBGenerator({
      resolution: this.config.hzbResolution,
      debug: this.config.debugMode,
    });
    this.queryPool = new OcclusionQueryPool({
      poolSize: this.config.queryPoolSize,
      maxQueriesPerFrame: this.config.maxQueriesPerFrame,
    });
    this.temporalCoherence = new TemporalCoherence({
      historyFrames: this.config.historyFrames,
      confidenceThreshold: this.config.confidenceThreshold,
    });
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize the visibility system with a renderer
   */
  initialize(renderer: THREE.WebGLRenderer): void {
    if (this.initialized) return;

    this.renderer = renderer;

    // Initialize HZB generator if enabled
    if (this.config.hzbEnabled && !this.config.cpuFrustumOnly) {
      this.hzbGenerator.initialize(renderer);
    }

    // Initialize occlusion query pool if enabled
    if (this.config.occlusionQueriesEnabled && !this.config.cpuFrustumOnly) {
      this.queryPool.initialize(renderer);
    }

    this.initialized = true;

    console.log('[VisibilityManager] Initialized with config:', {
      hzbEnabled: this.config.hzbEnabled,
      hzbInitialized: this.hzbGenerator.isInitialized(),
      occlusionQueriesEnabled: this.config.occlusionQueriesEnabled,
      queryPoolInitialized: this.queryPool.isInitialized(),
      temporalCoherenceEnabled: this.config.temporalCoherenceEnabled,
      qualityLevel: this.qualityLevel,
    });
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the WebGL renderer (for future HZB generation)
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Update configuration
   */
  setConfig(config: Partial<VisibilityConfig>): void {
    this.config = { ...this.config, ...config };
    this.frustumCuller.setConfig(this.config);
    this.visibilityBuffer.setConfig(this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): VisibilityConfig {
    return { ...this.config };
  }

  /**
   * Set quality level (integrates with PerformanceMonitor)
   */
  setQualityLevel(level: VisibilityQualityLevel): void {
    if (level === this.qualityLevel) return;

    const previous = this.qualityLevel;
    this.qualityLevel = level;

    // Adjust config based on quality
    switch (level) {
      case 'high':
        this.setConfig({
          hzbEnabled: true,
          occlusionQueriesEnabled: true,
          temporalCoherenceEnabled: true,
          perInstanceCullingEnabled: true,
          hzbResolution: 1024,
        });
        break;

      case 'medium':
        this.setConfig({
          hzbEnabled: true,
          occlusionQueriesEnabled: false,
          temporalCoherenceEnabled: true,
          perInstanceCullingEnabled: true,
          hzbResolution: 512,
        });
        break;

      case 'low':
        this.setConfig({
          hzbEnabled: false,
          occlusionQueriesEnabled: false,
          temporalCoherenceEnabled: false,
          perInstanceCullingEnabled: false,
          cpuFrustumOnly: true,
        });
        break;
    }

    // Notify callbacks
    for (const callback of this.qualityCallbacks) {
      callback(level, previous);
    }

    console.log(`[VisibilityManager] Quality changed: ${previous} -> ${level}`);
  }

  /**
   * Get current quality level
   */
  getQualityLevel(): VisibilityQualityLevel {
    return this.qualityLevel;
  }

  // ===========================================================================
  // MAIN UPDATE LOOP
  // ===========================================================================

  /**
   * Main update - call once per frame before rendering
   * @param camera - The active camera
   * @param scene - The scene (for HZB generation)
   * @param delta - Delta time since last frame
   */
  update(camera: THREE.Camera, _scene: THREE.Scene, _delta: number): void {
    if (!this.config.enabled) return;

    const startTime = performance.now();

    // Begin new frame for all subsystems
    this.visibilityBuffer.beginFrame();
    this.temporalCoherence.beginFrame();
    if (this.queryPool.isInitialized()) {
      this.queryPool.beginFrame();
    }

    // Cache camera position for distance calculations
    camera.getWorldPosition(this.cameraPosition);

    // Reset stats
    this.stats = { ...DEFAULT_VISIBILITY_STATS };
    this.stats.frameNumber = this.visibilityBuffer.getFrameNumber();

    // Phase 1: Update frustum from camera
    this.frustumCuller.updateFromCamera(camera);

    // Phase 2: CPU Frustum culling for chunks
    this.cullChunks();

    // Phase 3: CPU Frustum culling for registered objects with temporal coherence
    this.cullObjectsWithTemporal();

    // Phase 4: HZB Generation (GPU depth pyramid)
    const hzbStartTime = performance.now();
    if (
      this.config.hzbEnabled &&
      !this.config.cpuFrustumOnly &&
      this.hzbGenerator.isInitialized() &&
      this.occluders.length > 0
    ) {
      this.hzbGenerator.generate(camera, this.occluders);
      this.stats.hzbTimeMs = performance.now() - hzbStartTime;
    }

    // Phase 5: Process occlusion query results from previous frames
    const queryStartTime = performance.now();
    if (
      this.config.occlusionQueriesEnabled &&
      this.queryPool.isInitialized()
    ) {
      this.processOcclusionQueryResults();
      this.stats.queryTimeMs = performance.now() - queryStartTime;
    }

    // Future Phase: Per-instance culling
    // if (this.config.perInstanceCullingEnabled) {
    //   this.cullInstances();
    // }

    // Record timing
    this.stats.cpuCullTimeMs =
      performance.now() - startTime - (this.stats.hzbTimeMs || 0) - (this.stats.queryTimeMs || 0);
    this.lastUpdateTime = startTime;

    // Notify callbacks of visibility changes
    this.notifyChanges();
  }

  /**
   * Cull objects using temporal coherence to skip stable objects
   */
  private cullObjectsWithTemporal(): void {
    if (!this.config.temporalCoherenceEnabled) {
      // Fall back to basic culling
      this.cullObjects();
      return;
    }

    // Get objects that need testing (respects temporal coherence)
    const objectsToTest = this.visibilityBuffer.getObjectsToTest();

    let queriesIssued = 0;
    let queriesSkipped = 0;

    for (const obj of objectsToTest) {
      // Check temporal coherence decision
      const decision = this.temporalCoherence.getQueryDecision(obj.id);

      if (!decision.shouldQuery) {
        // Use predicted visibility
        this.visibilityBuffer.setObjectVisibility(
          obj.id,
          decision.predictedVisible,
          0 // No margin when using prediction
        );
        queriesSkipped++;
        continue;
      }

      // Test against frustum
      const result = this.frustumCuller.testSphereWithMargin(obj.sphere);

      this.visibilityBuffer.setObjectVisibility(
        obj.id,
        result.visible,
        result.margin
      );

      // Record result in temporal coherence
      this.temporalCoherence.recordResult(obj.id, result.visible);
      queriesIssued++;
    }

    // Count skipped due to temporal coherence
    const bufferStats = this.visibilityBuffer.getStats();
    queriesSkipped += bufferStats.objectCount - objectsToTest.length;

    this.stats.queriesIssued = queriesIssued;
    this.stats.queriesSkipped = queriesSkipped;
  }

  /**
   * Process results from GPU occlusion queries
   */
  private processOcclusionQueryResults(): void {
    const results = this.queryPool.collectResults();

    for (const [objectId, visible] of results) {
      // Update visibility buffer with query result
      const obj = this.visibilityBuffer.getObject(objectId);
      if (obj) {
        this.visibilityBuffer.setObjectVisibility(objectId, visible, 0);
      }

      // Record in temporal coherence
      this.temporalCoherence.recordResult(objectId, visible);
    }
  }

  // ===========================================================================
  // CHUNK CULLING
  // ===========================================================================

  /**
   * Perform frustum culling on all registered chunks
   */
  private cullChunks(): void {
    const bufferStats = this.visibilityBuffer.getStats();
    this.stats.chunksTotal = bufferStats.chunkCount;

    let visible = 0;
    let culled = 0;

    // Get all chunk visibility entries
    const visibleChunks = this.visibilityBuffer.getVisibleChunks();
    const culledChunks = this.visibilityBuffer.getCulledChunks();
    const allChunks = [...visibleChunks, ...culledChunks];

    for (const chunk of allChunks) {
      const distance = this.getDistanceToChunk(chunk.chunkX, chunk.chunkZ);

      // Never cull very close chunks (prevents pop-in)
      if (distance < this.config.nearChunkDistance) {
        this.visibilityBuffer.setChunkVisibility(
          chunk.chunkX,
          chunk.chunkZ,
          true,
          distance
        );
        visible++;
        continue;
      }

      // Create chunk bounds
      const bounds = FrustumCuller.createChunkBounds(
        chunk.chunkX,
        chunk.chunkZ,
        CHUNK_SIZE,
        WORLD_SIZE,
        MIN_HEIGHT,
        MAX_HEIGHT
      );

      // Test against frustum
      const isVisible = this.frustumCuller.testBox(bounds);

      this.visibilityBuffer.setChunkVisibility(
        chunk.chunkX,
        chunk.chunkZ,
        isVisible,
        distance
      );

      if (isVisible) {
        visible++;
      } else {
        culled++;
      }
    }

    this.stats.chunksVisible = visible;
    this.stats.chunksCulled = culled;
  }

  /**
   * Calculate distance from camera to chunk center
   */
  private getDistanceToChunk(chunkX: number, chunkZ: number): number {
    const worldX = chunkX * CHUNK_SIZE - WORLD_SIZE / 2 + CHUNK_SIZE / 2;
    const worldZ = chunkZ * CHUNK_SIZE - WORLD_SIZE / 2 + CHUNK_SIZE / 2;

    const dx = this.cameraPosition.x - worldX;
    const dz = this.cameraPosition.z - worldZ;

    return Math.sqrt(dx * dx + dz * dz);
  }

  // ===========================================================================
  // OBJECT CULLING
  // ===========================================================================

  /**
   * Perform frustum culling on registered objects
   */
  private cullObjects(): void {
    // Get objects that need testing (respects temporal coherence)
    const objectsToTest = this.visibilityBuffer.getObjectsToTest();

    let queriesIssued = 0;
    let queriesSkipped = 0;

    for (const obj of objectsToTest) {
      // Test against frustum
      const result = this.frustumCuller.testSphereWithMargin(obj.sphere);

      this.visibilityBuffer.setObjectVisibility(
        obj.id,
        result.visible,
        result.margin
      );

      queriesIssued++;
    }

    // Count skipped due to temporal coherence
    const bufferStats = this.visibilityBuffer.getStats();
    queriesSkipped = bufferStats.objectCount - objectsToTest.length;

    this.stats.queriesIssued = queriesIssued;
    this.stats.queriesSkipped = queriesSkipped;
  }

  // ===========================================================================
  // VISIBILITY QUERIES
  // ===========================================================================

  /**
   * Check if a chunk is visible
   */
  isChunkVisible(chunkX: number, chunkZ: number): boolean {
    return this.visibilityBuffer.isChunkVisible(chunkX, chunkZ);
  }

  /**
   * Check if an object is visible
   */
  isObjectVisible(objectId: string): boolean {
    return this.visibilityBuffer.isObjectVisible(objectId);
  }

  /**
   * Get all visible chunks
   */
  getVisibleChunks(): Array<{ chunkX: number; chunkZ: number }> {
    return this.visibilityBuffer.getVisibleChunks().map((c) => ({
      chunkX: c.chunkX,
      chunkZ: c.chunkZ,
    }));
  }

  /**
   * Get all culled chunks (for debug visualization)
   */
  getCulledChunks(): Array<{ chunkX: number; chunkZ: number }> {
    return this.visibilityBuffer.getCulledChunks().map((c) => ({
      chunkX: c.chunkX,
      chunkZ: c.chunkZ,
    }));
  }

  // ===========================================================================
  // OBJECT REGISTRATION
  // ===========================================================================

  /**
   * Register a chunk for visibility tracking
   */
  registerChunk(chunkX: number, chunkZ: number): void {
    this.visibilityBuffer.registerChunk(chunkX, chunkZ);
  }

  /**
   * Unregister a chunk
   */
  unregisterChunk(chunkX: number, chunkZ: number): void {
    this.visibilityBuffer.unregisterChunk(chunkX, chunkZ);
  }

  /**
   * Register an object for visibility tracking
   */
  registerObject(
    id: string,
    bounds: THREE.Box3,
    options?: {
      type?: VisibilityObject['type'];
      priority?: number;
      alwaysVisible?: boolean;
    }
  ): void {
    // Create bounding sphere from box
    const sphere = new THREE.Sphere();
    bounds.getBoundingSphere(sphere);

    this.visibilityBuffer.registerObject({
      id,
      type: options?.type ?? 'prop',
      bounds: bounds.clone(),
      sphere,
      priority: options?.priority ?? 1,
      alwaysVisible: options?.alwaysVisible ?? false,
    });
  }

  /**
   * Unregister an object
   */
  unregisterObject(id: string): void {
    this.visibilityBuffer.unregisterObject(id);
  }

  /**
   * Update object bounds (e.g., if object moved)
   */
  updateObjectBounds(id: string, bounds: THREE.Box3): void {
    const obj = this.visibilityBuffer.getObject(id);
    if (obj) {
      obj.bounds.copy(bounds);
      bounds.getBoundingSphere(obj.sphere);
    }
  }

  // ===========================================================================
  // CLUSTER VISIBILITY (16m sub-chunk clusters)
  // ===========================================================================

  /**
   * Check if a cluster within a chunk is visible
   * Uses HZB testing if available, otherwise frustum culling
   */
  isClusterVisible(
    chunkX: number,
    chunkZ: number,
    _clusterX: number,
    _clusterZ: number,
    clusterBounds?: THREE.Box3
  ): boolean {
    // If no HZB, fall back to chunk visibility
    if (!this.config.hzbEnabled || !this.hzbGenerator.isInitialized()) {
      return this.isChunkVisible(chunkX, chunkZ);
    }

    // If bounds provided, test directly
    if (clusterBounds) {
      const result = this.hzbGenerator.testBoundingBox(clusterBounds);
      return !result.occluded;
    }

    // Fall back to chunk visibility
    return this.isChunkVisible(chunkX, chunkZ);
  }

  /**
   * Test multiple cluster bounds at once (batched HZB testing)
   * Returns array of visibility flags
   */
  testClusterBounds(bounds: THREE.Box3[]): boolean[] {
    if (!this.config.hzbEnabled || !this.hzbGenerator.isInitialized()) {
      // All visible if HZB not available
      return bounds.map(() => true);
    }

    return bounds.map((b) => {
      const result = this.hzbGenerator.testBoundingBox(b);
      return !result.occluded;
    });
  }

  // ===========================================================================
  // INSTANCE VISIBILITY
  // ===========================================================================

  /**
   * Get or create instance visibility buffer for a chunk
   */
  getInstanceBuffer(chunkKey: string, instanceCount: number) {
    return this.visibilityBuffer.getOrCreateInstanceBuffer(chunkKey, instanceCount);
  }

  /**
   * Update instance visibility for a chunk
   */
  setInstanceVisibility(chunkKey: string, visibleIndices: number[]): void {
    this.visibilityBuffer.setInstanceVisibility(chunkKey, visibleIndices);
  }

  /**
   * Set all instances visible (used when culling disabled)
   */
  setAllInstancesVisible(chunkKey: string): void {
    this.visibilityBuffer.setAllInstancesVisible(chunkKey);
  }

  /**
   * Get visible instance indices
   */
  getVisibleInstanceIndices(chunkKey: string): number[] {
    return this.visibilityBuffer.getVisibleInstanceIndices(chunkKey);
  }

  // ===========================================================================
  // OCCLUDER MANAGEMENT
  // ===========================================================================

  /**
   * Add an object as an occluder for HZB generation
   * Occluders are large objects (terrain, buildings) that block visibility
   */
  addOccluder(object: THREE.Object3D): void {
    if (!this.occluders.includes(object)) {
      this.occluders.push(object);
    }
  }

  /**
   * Remove an object from occluders
   */
  removeOccluder(object: THREE.Object3D): void {
    const idx = this.occluders.indexOf(object);
    if (idx >= 0) {
      this.occluders.splice(idx, 1);
    }
  }

  /**
   * Clear all occluders
   */
  clearOccluders(): void {
    this.occluders = [];
  }

  /**
   * Get current occluders
   */
  getOccluders(): THREE.Object3D[] {
    return [...this.occluders];
  }

  // ===========================================================================
  // HZB ACCESS
  // ===========================================================================

  /**
   * Get the HZB generator instance (for debug visualization)
   */
  getHZBGenerator(): HZBGenerator {
    return this.hzbGenerator;
  }

  /**
   * Test if a bounding box is occluded by the HZB
   */
  testOcclusion(bounds: THREE.Box3): boolean {
    if (!this.config.hzbEnabled || !this.hzbGenerator.isInitialized()) {
      return false; // Can't determine, assume visible
    }
    const result = this.hzbGenerator.testBoundingBox(bounds);
    return result.occluded;
  }

  /**
   * Get HZB texture for debug visualization
   */
  getHZBTexture(mipLevel: number = 0): THREE.Texture | null {
    return this.hzbGenerator.getHZBTexture(mipLevel);
  }

  // ===========================================================================
  // CALLBACKS
  // ===========================================================================

  /**
   * Add callback for visibility changes
   */
  onVisibilityChange(callback: VisibilityChangeCallback): () => void {
    this.changeCallbacks.push(callback);
    return () => {
      const idx = this.changeCallbacks.indexOf(callback);
      if (idx >= 0) this.changeCallbacks.splice(idx, 1);
    };
  }

  /**
   * Add callback for quality changes
   */
  onQualityChange(callback: QualityChangeCallback): () => void {
    this.qualityCallbacks.push(callback);
    return () => {
      const idx = this.qualityCallbacks.indexOf(callback);
      if (idx >= 0) this.qualityCallbacks.splice(idx, 1);
    };
  }

  /**
   * Notify callbacks of visibility changes
   */
  private notifyChanges(): void {
    const changed = this.visibilityBuffer.getChangedObjects();
    for (const id of changed) {
      const obj = this.visibilityBuffer.getObject(id);
      if (obj) {
        for (const callback of this.changeCallbacks) {
          callback(
            id,
            obj.state.visibleThisFrame,
            obj.state.visibleLastFrame
          );
        }
      }
    }
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get visibility statistics
   */
  getStats(): VisibilityStats {
    return { ...this.stats };
  }

  /**
   * Get the timestamp of the last update (for perf debugging)
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  // ===========================================================================
  // SPECIAL ACTIONS
  // ===========================================================================

  /**
   * Reset visibility (e.g., after teleport)
   * Marks everything visible to prevent pop-in
   */
  resetToVisible(): void {
    this.visibilityBuffer.resetToVisible();
    // Force all objects to be re-queried next frame
    this.temporalCoherence.forceQueryAll();
  }

  /**
   * Force update visibility for all objects
   * Ignores temporal coherence for one frame
   */
  forceUpdate(): void {
    // Force all objects to be re-queried
    this.temporalCoherence.forceQueryAll();
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clear all visibility data
   */
  clear(): void {
    this.visibilityBuffer.clear();
    this.temporalCoherence.clear();
    this.queryPool.reset();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.visibilityBuffer.dispose();
    this.hzbGenerator.dispose();
    this.queryPool.dispose();
    this.temporalCoherence.dispose();
    this.changeCallbacks = [];
    this.qualityCallbacks = [];
    this.occluders = [];
    this.renderer = null;
    this.initialized = false;

    console.log('[VisibilityManager] Disposed');
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global visibility manager instance */
let visibilityManagerInstance: VisibilityManager | null = null;

/**
 * Get or create the global VisibilityManager instance
 */
export function getVisibilityManager(): VisibilityManager {
  if (!visibilityManagerInstance) {
    visibilityManagerInstance = new VisibilityManager();
  }
  return visibilityManagerInstance;
}

/**
 * Reset the global VisibilityManager (for testing or scene changes)
 */
export function resetVisibilityManager(): void {
  if (visibilityManagerInstance) {
    visibilityManagerInstance.dispose();
    visibilityManagerInstance = null;
  }
}
