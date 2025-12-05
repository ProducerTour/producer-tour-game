import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

export interface PlatformInfo {
  /** Whether running in a native app (iOS/Android) */
  isNative: boolean;
  /** Whether running on iOS */
  isIOS: boolean;
  /** Whether running on Android */
  isAndroid: boolean;
  /** Whether running in a web browser */
  isWeb: boolean;
  /** The platform name: 'ios', 'android', or 'web' */
  platform: 'ios' | 'android' | 'web';
  /** Whether the device is in standalone/PWA mode */
  isPWA: boolean;
  /** Whether to show mobile-optimized UI (native or narrow viewport) */
  isMobileUI: boolean;
}

/**
 * Hook to detect the current platform and provide platform-specific information.
 * Useful for conditional rendering and platform-specific behavior.
 *
 * @example
 * const { isNative, isIOS, isMobileUI } = usePlatform();
 *
 * if (isNative) {
 *   // Use native camera
 * } else {
 *   // Use file input
 * }
 */
export function usePlatform(): PlatformInfo {
  const [isMobileUI, setIsMobileUI] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || Capacitor.isNativePlatform();
  });

  useEffect(() => {
    const checkMobileUI = () => {
      setIsMobileUI(window.innerWidth < 768 || Capacitor.isNativePlatform());
    };

    window.addEventListener('resize', checkMobileUI);
    return () => window.removeEventListener('resize', checkMobileUI);
  }, []);

  const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  const isNative = Capacitor.isNativePlatform();

  // Check if running as PWA (installed web app)
  const isPWA = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     (window.navigator as any).standalone === true);

  return {
    isNative,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    platform,
    isPWA,
    isMobileUI,
  };
}

/**
 * Get platform info synchronously (without React state).
 * Useful in non-component contexts.
 */
export function getPlatformInfo(): Omit<PlatformInfo, 'isMobileUI'> {
  const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  const isNative = Capacitor.isNativePlatform();

  const isPWA = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     (window.navigator as any).standalone === true);

  return {
    isNative,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    platform,
    isPWA,
  };
}

export default usePlatform;
