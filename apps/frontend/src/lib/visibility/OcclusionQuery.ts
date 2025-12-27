/**
 * OcclusionQuery.ts
 * WebGL2 occlusion query wrapper for GPU-based visibility testing
 *
 * Uses ANY_SAMPLES_PASSED_CONSERVATIVE for fast conservative occlusion testing.
 * Manages a pool of queries to avoid GPU stalls from query result reads.
 */

import * as THREE from 'three';

/**
 * Query state
 */
export interface QueryState {
  /** The WebGL query object */
  query: WebGLQuery;
  /** Object ID being tested */
  objectId: string | null;
  /** Frame number when query was issued */
  frameIssued: number;
  /** Is this query currently in use */
  inUse: boolean;
  /** Has the result been retrieved */
  resultReady: boolean;
  /** The query result (true = visible, false = occluded) */
  result: boolean;
}

/**
 * Configuration for occlusion query system
 */
export interface OcclusionQueryConfig {
  /** Size of the query pool */
  poolSize: number;
  /** Maximum queries to issue per frame */
  maxQueriesPerFrame: number;
  /** Frames to wait before reading query result */
  resultDelay: number;
}

const DEFAULT_CONFIG: OcclusionQueryConfig = {
  poolSize: 256,
  maxQueriesPerFrame: 64,
  resultDelay: 1, // Read results 1 frame after issuing
};

/**
 * OcclusionQueryPool manages WebGL2 occlusion queries
 *
 * Usage pattern:
 * 1. beginFrame() - Reset frame state
 * 2. beginQuery(objectId) - Start a query for an object
 * 3. ... render the object's bounding box ...
 * 4. endQuery() - End the current query
 * 5. collectResults() - Get ready results from previous frames
 */
export class OcclusionQueryPool {
  private config: OcclusionQueryConfig;
  private gl: WebGL2RenderingContext | null = null;

  /** Pool of query objects */
  private queries: QueryState[] = [];

  /** Queue of pending queries (issued but not yet read) */
  private pendingQueue: number[] = [];

  /** Index of currently active query (-1 if none) */
  private activeQueryIndex = -1;

  /** Current frame number */
  private frameNumber = 0;

  /** Queries issued this frame */
  private queriesThisFrame = 0;

  /** Is the system initialized */
  private initialized = false;

  /** Bounding box mesh for rendering query geometry */
  private boxMesh: THREE.Mesh | null = null;
  private boxMaterial: THREE.MeshBasicMaterial | null = null;

  constructor(config?: Partial<OcclusionQueryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the query pool with a WebGL2 context
   */
  initialize(renderer: THREE.WebGLRenderer): boolean {
    if (this.initialized) return true;

    const gl = renderer.getContext();

    // Check for WebGL2
    if (!(gl instanceof WebGL2RenderingContext)) {
      console.warn('[OcclusionQueryPool] WebGL2 required for occlusion queries');
      return false;
    }

    this.gl = gl;

    // Create query pool
    for (let i = 0; i < this.config.poolSize; i++) {
      const query = gl.createQuery();
      if (!query) {
        console.warn('[OcclusionQueryPool] Failed to create query object');
        continue;
      }

      this.queries.push({
        query,
        objectId: null,
        frameIssued: -1,
        inUse: false,
        resultReady: false,
        result: true,
      });
    }

    // Create box mesh for query rendering
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.boxMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
    });
    this.boxMesh = new THREE.Mesh(geometry, this.boxMaterial);

    this.initialized = true;
    console.log(
      `[OcclusionQueryPool] Initialized with ${this.queries.length} queries`
    );

    return true;
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Begin a new frame
   */
  beginFrame(): void {
    this.frameNumber++;
    this.queriesThisFrame = 0;
  }

  /**
   * Get the current frame number
   */
  getFrameNumber(): number {
    return this.frameNumber;
  }

  /**
   * Can we issue more queries this frame?
   */
  canIssueQuery(): boolean {
    return (
      this.initialized &&
      this.queriesThisFrame < this.config.maxQueriesPerFrame &&
      this.getAvailableQueryIndex() !== -1
    );
  }

  /**
   * Find an available query slot
   */
  private getAvailableQueryIndex(): number {
    for (let i = 0; i < this.queries.length; i++) {
      if (!this.queries[i].inUse) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Begin an occlusion query for an object
   * Returns the query index, or -1 if no query available
   */
  beginQuery(objectId: string): number {
    if (!this.initialized || !this.gl) return -1;
    if (!this.canIssueQuery()) return -1;

    const queryIndex = this.getAvailableQueryIndex();
    if (queryIndex === -1) return -1;

    const queryState = this.queries[queryIndex];
    queryState.objectId = objectId;
    queryState.frameIssued = this.frameNumber;
    queryState.inUse = true;
    queryState.resultReady = false;
    queryState.result = true; // Default to visible

    // Begin the actual GL query
    this.gl.beginQuery(this.gl.ANY_SAMPLES_PASSED_CONSERVATIVE, queryState.query);

    this.activeQueryIndex = queryIndex;
    this.queriesThisFrame++;

    return queryIndex;
  }

  /**
   * End the current query
   */
  endQuery(): void {
    if (!this.initialized || !this.gl || this.activeQueryIndex === -1) return;

    this.gl.endQuery(this.gl.ANY_SAMPLES_PASSED_CONSERVATIVE);

    // Add to pending queue
    this.pendingQueue.push(this.activeQueryIndex);
    this.activeQueryIndex = -1;
  }

  /**
   * Render a bounding box for occlusion testing
   * Call this between beginQuery() and endQuery()
   */
  renderQueryBox(
    bounds: THREE.Box3,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ): void {
    if (!this.boxMesh) return;

    // Position and scale the box mesh to match bounds
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    this.boxMesh.position.copy(center);
    this.boxMesh.scale.copy(size);
    this.boxMesh.updateMatrixWorld();

    // Render the box (will be tested against depth buffer)
    const scene = new THREE.Scene();
    scene.add(this.boxMesh);
    renderer.render(scene, camera);
    scene.remove(this.boxMesh);
  }

  /**
   * Issue a complete query for a bounding box
   * Combines beginQuery, renderQueryBox, and endQuery
   */
  issueQuery(
    objectId: string,
    bounds: THREE.Box3,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ): number {
    const queryIndex = this.beginQuery(objectId);
    if (queryIndex === -1) return -1;

    this.renderQueryBox(bounds, camera, renderer);
    this.endQuery();

    return queryIndex;
  }

  /**
   * Collect results from queries that are ready
   * Returns a map of objectId -> visible
   */
  collectResults(): Map<string, boolean> {
    const results = new Map<string, boolean>();

    if (!this.initialized || !this.gl) return results;

    // Process pending queue
    const stillPending: number[] = [];

    for (const queryIndex of this.pendingQueue) {
      const queryState = this.queries[queryIndex];

      // Check if enough frames have passed
      if (this.frameNumber - queryState.frameIssued < this.config.resultDelay) {
        stillPending.push(queryIndex);
        continue;
      }

      // Check if result is available (non-blocking)
      const available = this.gl.getQueryParameter(
        queryState.query,
        this.gl.QUERY_RESULT_AVAILABLE
      );

      if (!available) {
        stillPending.push(queryIndex);
        continue;
      }

      // Get the result
      const visible = this.gl.getQueryParameter(
        queryState.query,
        this.gl.QUERY_RESULT
      ) as boolean;

      queryState.result = visible;
      queryState.resultReady = true;
      queryState.inUse = false;

      if (queryState.objectId) {
        results.set(queryState.objectId, visible);
      }
    }

    this.pendingQueue = stillPending;

    return results;
  }

  /**
   * Get the number of queries currently in use
   */
  getActiveQueryCount(): number {
    return this.queries.filter((q) => q.inUse).length;
  }

  /**
   * Get the number of queries issued this frame
   */
  getQueriesThisFrame(): number {
    return this.queriesThisFrame;
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalQueries: number;
    activeQueries: number;
    pendingQueries: number;
    queriesThisFrame: number;
  } {
    return {
      totalQueries: this.queries.length,
      activeQueries: this.getActiveQueryCount(),
      pendingQueries: this.pendingQueue.length,
      queriesThisFrame: this.queriesThisFrame,
    };
  }

  /**
   * Reset all queries (e.g., on scene change)
   */
  reset(): void {
    for (const query of this.queries) {
      query.objectId = null;
      query.frameIssued = -1;
      query.inUse = false;
      query.resultReady = false;
      query.result = true;
    }
    this.pendingQueue = [];
    this.activeQueryIndex = -1;
    this.queriesThisFrame = 0;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (!this.gl) return;

    // Delete all query objects
    for (const queryState of this.queries) {
      this.gl.deleteQuery(queryState.query);
    }
    this.queries = [];
    this.pendingQueue = [];

    // Dispose mesh resources
    if (this.boxMesh) {
      this.boxMesh.geometry.dispose();
      this.boxMesh = null;
    }
    if (this.boxMaterial) {
      this.boxMaterial.dispose();
      this.boxMaterial = null;
    }

    this.gl = null;
    this.initialized = false;

    console.log('[OcclusionQueryPool] Disposed');
  }
}
