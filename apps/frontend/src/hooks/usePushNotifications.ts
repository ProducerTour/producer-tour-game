/**
 * Push Notifications Hook
 *
 * Manages Web Push notification subscriptions.
 * Handles service worker registration, permission requests,
 * and subscription management with the backend.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushNotificationStatus {
  isSupported: boolean;
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  iosInstallPrompt: boolean; // Show iOS install instructions
}

interface VapidKeyResponse {
  publicKey: string;
}

interface SubscribeResponse {
  success: boolean;
  subscriptionId: string;
  message: string;
}

interface StatusResponse {
  isConfigured: boolean;
  subscriptionCount: number;
  subscriptions: Array<{
    id: string;
    userAgent: string | null;
    createdAt: string;
    lastUsedAt: string;
  }>;
}

/**
 * Convert a base64 VAPID public key to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check if the device is iOS
 */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Check if the app is running as a PWA (added to home screen)
 */
function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushNotificationStatus>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null,
    iosInstallPrompt: false,
  });

  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  /**
   * Check if push notifications are supported
   */
  const checkSupport = useCallback(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;

    // iOS Safari requires PWA mode for push
    const iosNeedsPWA = isIOS() && !isPWA();

    setStatus((prev) => ({
      ...prev,
      isSupported: supported && !iosNeedsPWA,
      iosInstallPrompt: supported && iosNeedsPWA,
      permission: supported ? (Notification.permission as PushPermissionState) : 'unsupported',
    }));

    return supported && !iosNeedsPWA;
  }, []);

  /**
   * Register the service worker
   */
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[Push] Service worker registered:', registration.scope);
      setSwRegistration(registration);

      return registration;
    } catch (error) {
      console.error('[Push] Service worker registration failed:', error);
      setStatus((prev) => ({
        ...prev,
        error: 'Failed to register service worker',
      }));
      return null;
    }
  }, []);

  /**
   * Fetch the VAPID public key from the server
   */
  const fetchVapidKey = useCallback(async (): Promise<string | null> => {
    try {
      const response = await api.get<VapidKeyResponse>('/push/vapid-key');
      const { publicKey } = response.data;
      setVapidPublicKey(publicKey);
      return publicKey;
    } catch (error) {
      console.error('[Push] Failed to fetch VAPID key:', error);
      setStatus((prev) => ({
        ...prev,
        error: 'Push notifications not available',
      }));
      return null;
    }
  }, []);

  /**
   * Check current subscription status with the server
   */
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const response = await api.get<StatusResponse>('/push/status');
      const { isConfigured, subscriptionCount } = response.data;

      if (!isConfigured) {
        setStatus((prev) => ({
          ...prev,
          error: 'Push notifications not configured on server',
          isLoading: false,
        }));
        return;
      }

      // Also check local subscription
      if (swRegistration) {
        const subscription = await swRegistration.pushManager.getSubscription();
        setStatus((prev) => ({
          ...prev,
          isSubscribed: subscription !== null && subscriptionCount > 0,
          isLoading: false,
        }));
      } else {
        setStatus((prev) => ({
          ...prev,
          isSubscribed: subscriptionCount > 0,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('[Push] Failed to check subscription status:', error);
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [swRegistration]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Ensure service worker is registered
      let registration = swRegistration;
      if (!registration) {
        registration = await registerServiceWorker();
        if (!registration) {
          throw new Error('Failed to register service worker');
        }
      }

      // Get VAPID key if not already fetched
      let publicKey = vapidPublicKey;
      if (!publicKey) {
        publicKey = await fetchVapidKey();
        if (!publicKey) {
          throw new Error('Failed to get VAPID key');
        }
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      setStatus((prev) => ({ ...prev, permission: permission as PushPermissionState }));

      if (permission !== 'granted') {
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: permission === 'denied'
            ? 'Notification permission denied. Please enable in browser settings.'
            : 'Notification permission not granted',
        }));
        return false;
      }

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required - all push must show notification
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      console.log('[Push] Subscribed:', subscription.endpoint);

      // Send subscription to backend
      const subscriptionJSON = subscription.toJSON();
      await api.post<SubscribeResponse>('/push/subscribe', {
        endpoint: subscriptionJSON.endpoint,
        keys: {
          p256dh: subscriptionJSON.keys?.p256dh,
          auth: subscriptionJSON.keys?.auth,
        },
        userAgent: navigator.userAgent,
      });

      setStatus((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error: any) {
      console.error('[Push] Subscription failed:', error);

      let errorMessage = 'Failed to enable push notifications';
      if (error.message?.includes('permission')) {
        errorMessage = 'Notification permission denied';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Push notifications blocked by browser';
      }

      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return false;
    }
  }, [swRegistration, vapidPublicKey, registerServiceWorker, fetchVapidKey]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get local subscription
      if (swRegistration) {
        const subscription = await swRegistration.pushManager.getSubscription();
        if (subscription) {
          // Unsubscribe locally
          await subscription.unsubscribe();

          // Remove from backend
          await api.post('/push/unsubscribe', {
            endpoint: subscription.endpoint,
          });
        }
      }

      // Also delete all subscriptions for this user (in case local is out of sync)
      await api.delete('/push/subscriptions');

      setStatus((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to disable push notifications',
      }));
      return false;
    }
  }, [swRegistration]);

  /**
   * Send a test notification
   */
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      const response = await api.post('/push/test');
      return response.data.success;
    } catch (error) {
      console.error('[Push] Test notification failed:', error);
      return false;
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const init = async () => {
      if (!checkSupport()) {
        setStatus((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const registration = await registerServiceWorker();
      if (registration) {
        await fetchVapidKey();
        await checkSubscriptionStatus();
      } else {
        setStatus((prev) => ({ ...prev, isLoading: false }));
      }
    };

    init();
  }, [checkSupport, registerServiceWorker, fetchVapidKey, checkSubscriptionStatus]);

  /**
   * Re-check subscription status when service worker registration changes
   */
  useEffect(() => {
    if (swRegistration) {
      checkSubscriptionStatus();
    }
  }, [swRegistration, checkSubscriptionStatus]);

  return {
    ...status,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
