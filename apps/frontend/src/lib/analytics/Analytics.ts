// Analytics - game telemetry and event tracking

export type EventCategory =
  | 'session'
  | 'gameplay'
  | 'progression'
  | 'economy'
  | 'social'
  | 'ui'
  | 'performance'
  | 'error';

export interface AnalyticsEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
}

export interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  events: number;
  userId?: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  platform: string;
  browser: string;
  browserVersion: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  language: string;
  timezone: string;
  isMobile: boolean;
  isTouch: boolean;
  gpu?: string;
}

export interface PerformanceMetrics {
  fps: number[];
  frameTime: number[];
  memoryUsage: number[];
  loadTime: number;
  timeToInteractive: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  flushInterval: number;
  sampleRate: number;
  debug: boolean;
  respectDoNotTrack: boolean;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  batchSize: 20,
  flushInterval: 30000, // 30 seconds
  sampleRate: 1.0, // 100%
  debug: false,
  respectDoNotTrack: true,
};

export class Analytics {
  private config: AnalyticsConfig;
  private sessionId: string;
  private sessionStart: number;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: number | null = null;
  private userId?: string;
  private deviceInfo: DeviceInfo;
  private performanceMetrics: PerformanceMetrics;
  private eventCount = 0;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.deviceInfo = this.collectDeviceInfo();
    this.performanceMetrics = {
      fps: [],
      frameTime: [],
      memoryUsage: [],
      loadTime: 0,
      timeToInteractive: 0,
    };

    // Check Do Not Track
    if (this.config.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      this.config.enabled = false;
      console.log('📊 Analytics disabled (Do Not Track)');
    }

    // Start session
    if (this.config.enabled) {
      this.startSession();
      this.startFlushTimer();
    }
  }

  // Track an event
  track(
    category: EventCategory,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enabled) return;

    // Sample rate check
    if (Math.random() > this.config.sampleRate) return;

    const event: AnalyticsEvent = {
      category,
      action,
      label,
      value,
      metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.eventQueue.push(event);
    this.eventCount++;

    if (this.config.debug) {
      console.log('📊 Event:', event);
    }

    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  // Convenience methods for common events
  trackScreenView(screenName: string): void {
    this.track('ui', 'screen_view', screenName);
  }

  trackButtonClick(buttonName: string, screenName?: string): void {
    this.track('ui', 'button_click', buttonName, undefined, { screen: screenName });
  }

  trackGameStart(): void {
    this.track('gameplay', 'game_start');
  }

  trackGameEnd(duration: number, reason: string): void {
    this.track('gameplay', 'game_end', reason, duration);
  }

  trackLevelComplete(level: number, duration: number, score?: number): void {
    this.track('progression', 'level_complete', `level_${level}`, duration, { score });
  }

  trackAchievement(achievementId: string): void {
    this.track('progression', 'achievement_unlock', achievementId);
  }

  trackPurchase(itemId: string, currency: string, amount: number): void {
    this.track('economy', 'purchase', itemId, amount, { currency });
  }

  trackError(errorType: string, message: string, stack?: string): void {
    this.track('error', errorType, message, undefined, { stack });
  }

  trackPerformance(fps: number, frameTime: number): void {
    this.performanceMetrics.fps.push(fps);
    this.performanceMetrics.frameTime.push(frameTime);

    // Keep last 60 samples
    if (this.performanceMetrics.fps.length > 60) {
      this.performanceMetrics.fps.shift();
      this.performanceMetrics.frameTime.shift();
    }
  }

  // Set user ID for logged-in users
  setUserId(userId: string): void {
    this.userId = userId;
    this.track('session', 'user_identified', userId);
  }

  // Set custom user properties
  setUserProperties(properties: Record<string, unknown>): void {
    this.track('session', 'user_properties', undefined, undefined, properties);
  }

  // Flush events to backend
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    if (this.config.debug) {
      console.log(`📊 Flushing ${events.length} events`);
    }

    // Would send to analytics endpoint
    if (this.config.endpoint) {
      try {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events,
            session: this.getSessionData(),
          }),
        });
      } catch (error) {
        // Re-queue failed events
        this.eventQueue.unshift(...events);
        console.error('Failed to flush analytics:', error);
      }
    }
  }

  // Get current session data
  getSessionData(): SessionData {
    return {
      id: this.sessionId,
      startTime: this.sessionStart,
      duration: Date.now() - this.sessionStart,
      events: this.eventCount,
      userId: this.userId,
      deviceInfo: this.deviceInfo,
    };
  }

  // Get performance summary
  getPerformanceSummary(): {
    avgFps: number;
    minFps: number;
    maxFps: number;
    avgFrameTime: number;
  } {
    const fps = this.performanceMetrics.fps;
    if (fps.length === 0) {
      return { avgFps: 0, minFps: 0, maxFps: 0, avgFrameTime: 0 };
    }

    return {
      avgFps: fps.reduce((a, b) => a + b, 0) / fps.length,
      minFps: Math.min(...fps),
      maxFps: Math.max(...fps),
      avgFrameTime:
        this.performanceMetrics.frameTime.reduce((a, b) => a + b, 0) /
        this.performanceMetrics.frameTime.length,
    };
  }

  // End session
  endSession(): void {
    this.track('session', 'session_end', undefined, Date.now() - this.sessionStart);
    this.flush();
    this.stopFlushTimer();
  }

  // Private methods
  private startSession(): void {
    this.track('session', 'session_start', undefined, undefined, {
      device: this.deviceInfo,
    });
  }

  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private isDoNotTrackEnabled(): boolean {
    return (
      navigator.doNotTrack === '1' ||
      (window as { doNotTrack?: string }).doNotTrack === '1'
    );
  }

  private collectDeviceInfo(): DeviceInfo {
    const ua = navigator.userAgent;
    const platform = navigator.platform;

    // Detect browser
    let browser = 'Unknown';
    let browserVersion = '';
    if (ua.includes('Firefox')) {
      browser = 'Firefox';
      browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || '';
    } else if (ua.includes('Chrome')) {
      browser = 'Chrome';
      browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '';
    } else if (ua.includes('Safari')) {
      browser = 'Safari';
      browserVersion = ua.match(/Version\/(\d+)/)?.[1] || '';
    } else if (ua.includes('Edge')) {
      browser = 'Edge';
      browserVersion = ua.match(/Edge\/(\d+)/)?.[1] || '';
    }

    // Detect GPU
    let gpu: string | undefined;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpu = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch {
      // Ignore
    }

    return {
      platform,
      browser,
      browserVersion,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isMobile: /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua),
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      gpu,
    };
  }

  // Enable/disable analytics
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled) {
      this.startFlushTimer();
    } else {
      this.stopFlushTimer();
    }
  }

  // Dispose
  dispose(): void {
    this.endSession();
  }
}

// Singleton instance
let analyticsInstance: Analytics | null = null;

export function getAnalytics(config?: Partial<AnalyticsConfig>): Analytics {
  if (!analyticsInstance) {
    analyticsInstance = new Analytics(config);
  }
  return analyticsInstance;
}

export function resetAnalytics(): void {
  if (analyticsInstance) {
    analyticsInstance.dispose();
    analyticsInstance = null;
  }
}

// React hook for analytics
export function useAnalytics() {
  return getAnalytics();
}
