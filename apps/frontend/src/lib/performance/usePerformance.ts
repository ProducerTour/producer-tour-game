// React hooks for performance monitoring
import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  PerformanceMetrics,
  QualityLevel,
  getPerformanceMonitor,
} from './PerformanceMonitor';

// Hook to get performance metrics (updates every frame)
export function usePerformanceMetrics(): PerformanceMetrics | null {
  const metricsRef = useRef<PerformanceMetrics | null>(null);
  const monitor = getPerformanceMonitor();
  const { gl } = useThree();

  useFrame((_, delta) => {
    metricsRef.current = monitor.update(delta, gl);
  });

  return metricsRef.current;
}

// Hook to subscribe to quality changes
export function useAdaptiveQuality(): QualityLevel {
  const [quality, setQuality] = useState<QualityLevel>('high');
  const monitor = getPerformanceMonitor();

  useEffect(() => {
    const unsubscribe = monitor.onQualityChange(setQuality);
    setQuality(monitor.getCurrentQuality());
    return unsubscribe;
  }, [monitor]);

  return quality;
}

// Hook to apply quality settings to renderer
export function useQualitySettings() {
  const quality = useAdaptiveQuality();
  const { gl } = useThree();

  useEffect(() => {
    switch (quality) {
      case 'high':
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        gl.shadowMap.enabled = true;
        break;
      case 'medium':
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        gl.shadowMap.enabled = true;
        break;
      case 'low':
        gl.setPixelRatio(1);
        gl.shadowMap.enabled = false;
        break;
    }
  }, [quality, gl]);

  return quality;
}

// Hook to get quality-based settings
export function useQualityValue<T>(high: T, medium: T, low: T): T {
  const quality = useAdaptiveQuality();

  switch (quality) {
    case 'high':
      return high;
    case 'medium':
      return medium;
    case 'low':
      return low;
  }
}

// Component to display performance stats overlay
export interface PerformanceStatsProps {
  show?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}
