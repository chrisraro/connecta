// Service Worker for Offline Support
// This enables the profile page to work offline and download vCards

const CACHE_NAME = 'tapfolio-v1';
const OFFLINE_URL = '/offline';

// Files to cache for offline access
const PRECACHE_URLS = [
  '/',
  '/offline',
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => cacheName !== CACHE_NAME);
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cache) => caches.delete(cache)));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For profile pages, try network first, then cache
  if (event.request.url.includes('/p/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the successful response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Return cached version if offline
          return caches.match(event.request);
        })
    );
  }

  // For other requests, cache first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle vCard caching requests
  if (event.data && event.data.type === 'CACHE_VCARD') {
    const { profileId, vCardData } = event.data;
    const vCardCacheKey = `vcard-${profileId}`;
    
    caches.open(CACHE_NAME).then((cache) => {
      const response = new Response(vCardData, {
        headers: { 'Content-Type': 'text/vcard' }
      });
      cache.put(vCardCacheKey, response);
    });
  }
});
