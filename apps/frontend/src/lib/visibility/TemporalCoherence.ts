/**
 * TemporalCoherence.ts
 * Tracks visibility history to optimize query frequency
 *
 * Key insight: Objects rarely change visibility state frame-to-frame.
 * By tracking history, we can skip queries for stable objects.
 *
 * Strategy:
 * - Objects visible last frame → render immediately (Pass 1)
 * - Objects invisible 1-2 frames → test with HZB only
 * - Objects invisible 3+ frames → test every 2-3 frames
 * - New objects → assume visible, test next frame
 * - Objects with 6/8 frames same → skip query entirely
 */

export interface TemporalConfig {
  /** Number of frames to track in history */
  historyFrames: number;
  /** Confidence threshold (0-1) for skipping queries */
  confidenceThreshold: number;
  /** Frames invisible before reducing query frequency */
  invisibleFramesBeforeReduction: number;
  /** Query interval for long-invisible objects */
  reducedQueryInterval: number;
}

const DEFAULT_CONFIG: TemporalConfig = {
  historyFrames: 8,
  confidenceThreshold: 0.75, // 6/8 frames same = skip
  invisibleFramesBeforeReduction: 3,
  reducedQueryInterval: 3,
};

/**
 * Visibility history for a single object
 */
export interface VisibilityHistory {
  /** Object identifier */
  objectId: string;
  /** Ring buffer of visibility states (true = visible) */
  history: boolean[];
  /** Current write index in ring buffer */
  historyIndex: number;
  /** Last frame this object was queried */
  lastQueryFrame: number;
  /** Last frame this object was visible */
  lastVisibleFrame: number;
  /** Number of consecutive frames with same visibility */
  stableFrames: number;
  /** Predicted visibility for current frame */
  predictedVisible: boolean;
  /** Confidence in prediction (0-1) */
  confidence: number;
}

/**
 * Query decision for an object
 */
export interface QueryDecision {
  /** Should we issue a query this frame? */
  shouldQuery: boolean;
  /** Predicted visibility if not querying */
  predictedVisible: boolean;
  /** Confidence in prediction */
  confidence: number;
  /** Reason for decision */
  reason: 'new' | 'stable' | 'unstable' | 'interval' | 'force';
}

/**
 * TemporalCoherence tracks visibility history to optimize queries
 */
export class TemporalCoherence {
  private config: TemporalConfig;

  /** Visibility history per object */
  private histories: Map<string, VisibilityHistory> = new Map();

  /** Current frame number */
  private frameNumber = 0;

  /** Objects that need query this frame */
  private querySet: Set<string> = new Set();

  /** Objects marked for forced query next frame */
  private forceQuerySet: Set<string> = new Set();

  constructor(config?: Partial<TemporalConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Begin a new frame
   */
  beginFrame(): void {
    this.frameNumber++;
    this.querySet.clear();
  }

  /**
   * Get the current frame number
   */
  getFrameNumber(): number {
    return this.frameNumber;
  }

  /**
   * Register a new object for tracking
   */
  registerObject(objectId: string): void {
    if (this.histories.has(objectId)) return;

    const history: VisibilityHistory = {
      objectId,
      history: new Array(this.config.historyFrames).fill(true), // Assume visible initially
      historyIndex: 0,
      lastQueryFrame: 0,
      lastVisibleFrame: this.frameNumber,
      stableFrames: 0,
      predictedVisible: true,
      confidence: 0, // Low confidence for new objects
    };

    this.histories.set(objectId, history);

    // Force query for new objects next frame
    this.forceQuerySet.add(objectId);
  }

  /**
   * Unregister an object
   */
  unregisterObject(objectId: string): void {
    this.histories.delete(objectId);
    this.forceQuerySet.delete(objectId);
  }

  /**
   * Record a visibility result for an object
   */
  recordResult(objectId: string, visible: boolean): void {
    let history = this.histories.get(objectId);

    if (!history) {
      this.registerObject(objectId);
      history = this.histories.get(objectId)!;
    }

    // Record in ring buffer
    history.history[history.historyIndex] = visible;
    history.historyIndex = (history.historyIndex + 1) % this.config.historyFrames;

    // Update state
    history.lastQueryFrame = this.frameNumber;
    if (visible) {
      history.lastVisibleFrame = this.frameNumber;
    }

    // Update stability counter
    const prevVisible = history.predictedVisible;
    if (visible === prevVisible) {
      history.stableFrames++;
    } else {
      history.stableFrames = 1;
    }

    // Update prediction and confidence
    this.updatePrediction(history);

    // Remove from force query set
    this.forceQuerySet.delete(objectId);
  }

  /**
   * Update prediction and confidence for an object
   */
  private updatePrediction(history: VisibilityHistory): void {
    // Count visible frames in history
    let visibleCount = 0;
    for (const visible of history.history) {
      if (visible) visibleCount++;
    }

    const visibleRatio = visibleCount / this.config.historyFrames;

    // Predict based on majority
    history.predictedVisible = visibleRatio >= 0.5;

    // Confidence is how far from 50% we are
    history.confidence = Math.abs(visibleRatio - 0.5) * 2;
  }

  /**
   * Decide whether to query an object this frame
   */
  getQueryDecision(objectId: string): QueryDecision {
    const history = this.histories.get(objectId);

    // New object - must query
    if (!history) {
      this.registerObject(objectId);
      return {
        shouldQuery: true,
        predictedVisible: true,
        confidence: 0,
        reason: 'new',
      };
    }

    // Forced query (e.g., after teleport or new object)
    if (this.forceQuerySet.has(objectId)) {
      return {
        shouldQuery: true,
        predictedVisible: history.predictedVisible,
        confidence: history.confidence,
        reason: 'force',
      };
    }

    // High confidence and stable - skip query
    if (
      history.confidence >= this.config.confidenceThreshold &&
      history.stableFrames >= this.config.historyFrames / 2
    ) {
      return {
        shouldQuery: false,
        predictedVisible: history.predictedVisible,
        confidence: history.confidence,
        reason: 'stable',
      };
    }

    // Long invisible - use reduced query interval
    const framesInvisible = this.frameNumber - history.lastVisibleFrame;
    if (framesInvisible >= this.config.invisibleFramesBeforeReduction) {
      const framesSinceQuery = this.frameNumber - history.lastQueryFrame;
      if (framesSinceQuery < this.config.reducedQueryInterval) {
        return {
          shouldQuery: false,
          predictedVisible: false,
          confidence: history.confidence,
          reason: 'interval',
        };
      }
    }

    // Unstable or needs refresh - query
    return {
      shouldQuery: true,
      predictedVisible: history.predictedVisible,
      confidence: history.confidence,
      reason: 'unstable',
    };
  }

  /**
   * Get predicted visibility for an object (without deciding to query)
   */
  getPredictedVisibility(objectId: string): { visible: boolean; confidence: number } {
    const history = this.histories.get(objectId);
    if (!history) {
      return { visible: true, confidence: 0 };
    }
    return {
      visible: history.predictedVisible,
      confidence: history.confidence,
    };
  }

  /**
   * Mark object for forced query next frame (e.g., after teleport)
   */
  forceQuery(objectId: string): void {
    this.forceQuerySet.add(objectId);
  }

  /**
   * Force query all objects next frame (e.g., after scene change)
   */
  forceQueryAll(): void {
    for (const objectId of this.histories.keys()) {
      this.forceQuerySet.add(objectId);
    }
  }

  /**
   * Get objects that should be queried this frame
   * Filters out stable objects and applies interval-based reduction
   */
  getObjectsToQuery(allObjectIds: string[]): string[] {
    const toQuery: string[] = [];

    for (const objectId of allObjectIds) {
      const decision = this.getQueryDecision(objectId);
      if (decision.shouldQuery) {
        toQuery.push(objectId);
      }
    }

    return toQuery;
  }

  /**
   * Get objects that were visible last frame (for two-pass rendering)
   * These objects should be rendered first as occluders
   */
  getLastFrameVisible(): string[] {
    const visible: string[] = [];

    for (const [objectId, history] of this.histories) {
      // Check most recent history entry
      const lastIndex = (history.historyIndex - 1 + this.config.historyFrames) % this.config.historyFrames;
      if (history.history[lastIndex]) {
        visible.push(objectId);
      }
    }

    return visible;
  }

  /**
   * Get objects that were invisible last frame (for testing)
   */
  getLastFrameInvisible(): string[] {
    const invisible: string[] = [];

    for (const [objectId, history] of this.histories) {
      // Check most recent history entry
      const lastIndex = (history.historyIndex - 1 + this.config.historyFrames) % this.config.historyFrames;
      if (!history.history[lastIndex]) {
        invisible.push(objectId);
      }
    }

    return invisible;
  }

  /**
   * Get history for an object (for debugging)
   */
  getHistory(objectId: string): VisibilityHistory | null {
    return this.histories.get(objectId) || null;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalObjects: number;
    stableObjects: number;
    visibleLastFrame: number;
    invisibleLastFrame: number;
    avgConfidence: number;
  } {
    let stableCount = 0;
    let visibleCount = 0;
    let invisibleCount = 0;
    let totalConfidence = 0;

    for (const history of this.histories.values()) {
      // Check stability
      if (
        history.confidence >= this.config.confidenceThreshold &&
        history.stableFrames >= this.config.historyFrames / 2
      ) {
        stableCount++;
      }

      // Check last frame visibility
      const lastIndex = (history.historyIndex - 1 + this.config.historyFrames) % this.config.historyFrames;
      if (history.history[lastIndex]) {
        visibleCount++;
      } else {
        invisibleCount++;
      }

      totalConfidence += history.confidence;
    }

    const totalObjects = this.histories.size;

    return {
      totalObjects,
      stableObjects: stableCount,
      visibleLastFrame: visibleCount,
      invisibleLastFrame: invisibleCount,
      avgConfidence: totalObjects > 0 ? totalConfidence / totalObjects : 0,
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<TemporalConfig>): void {
    this.config = { ...this.config, ...config };

    // Resize history buffers if needed
    if (
      config.historyFrames !== undefined &&
      config.historyFrames !== this.config.historyFrames
    ) {
      for (const history of this.histories.values()) {
        const newHistory = new Array(this.config.historyFrames).fill(
          history.predictedVisible
        );
        history.history = newHistory;
        history.historyIndex = 0;
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TemporalConfig {
    return { ...this.config };
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.histories.clear();
    this.querySet.clear();
    this.forceQuerySet.clear();
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
  }
}
