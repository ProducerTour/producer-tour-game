/**
 * Service Worker for Producer Tour PWA
 *
 * Handles Web Push notifications and caching strategies.
 */

const CACHE_NAME = 'producer-tour-v1';
const OFFLINE_URL = '/offline.html';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache essential assets for offline support
      return cache.addAll([
        '/',
        '/manifest.json',
        '/favicon-192x192.png',
        '/favicon-48x48.png',
      ]).catch((error) => {
        console.warn('[SW] Cache addAll failed:', error);
      });
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  // Take control of all pages immediately
  self.clients.claim();
});

// Push event - receive and display push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (!event.data) {
    console.warn('[SW] Push event has no data');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
    payload = {
      title: 'Producer Tour',
      body: event.data.text(),
    };
  }

  const {
    title = 'Producer Tour',
    body = 'You have a new notification',
    icon = '/favicon-192x192.png',
    badge = '/favicon-48x48.png',
    tag,
    data = {},
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag: tag || 'default',
    data,
    vibrate: [100, 50, 100], // Vibration pattern for mobile
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Handle dismiss action
  if (action === 'dismiss') {
    return;
  }

  // Determine the URL to open
  let urlToOpen = data.url || '/';

  // Make sure URL is absolute
  if (!urlToOpen.startsWith('http')) {
    urlToOpen = new URL(urlToOpen, self.location.origin).href;
  }

  event.waitUntil(
    // Check if there's already a window open
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen);

        // If we find a matching window, focus it and navigate
        if (clientUrl.origin === targetUrl.origin) {
          return client.focus().then((focusedClient) => {
            // Navigate to the specific page if different
            if (focusedClient.url !== urlToOpen) {
              return focusedClient.navigate(urlToOpen);
            }
            return focusedClient;
          });
        }
      }

      // No matching window, open a new one
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Notification close event (for analytics if needed)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Fetch event - network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API requests (don't cache)
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }

          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// Message event - handle commands from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
