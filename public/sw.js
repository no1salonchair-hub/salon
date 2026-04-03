// Robust Service Worker for Salon Chair PWA
const CACHE_NAME = 'salon-chair-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/hero.webp'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch event - Optimized for mobile speed
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Strategy: Network First with Timeout for Navigation
  // This ensures we get the latest index.html but don't wait forever on slow mobile data
  if (request.mode === 'navigate') {
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve(null), 2500) // 2.5s timeout
    );

    event.respondWith(
      Promise.race([
        fetch(request).then(response => {
          if (!response || response.status !== 200) return caches.match(request);
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        }),
        timeoutPromise
      ]).then(response => response || caches.match(request))
    );
    return;
  }

  // Strategy: Stale-While-Revalidate for Scripts and Styles
  // This makes the app load instantly from cache while updating in the background
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategy: Cache First for images and other static assets
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((fetchRes) => {
        if (!fetchRes || fetchRes.status !== 200) return fetchRes;
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});
