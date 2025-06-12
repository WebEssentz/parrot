// Advanced PWA Service Worker for Avurna
const STATIC_CACHE = 'avurna-static-v2';
const CHAT_CACHE = 'avurna-chat-v1';
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/globals.css',
  '/vercel.svg',
  '/next.svg',
  '/file.svg',
  '/globe.svg',
  '/window.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, CHAT_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});


// --- Media Caching ---
const MEDIA_CACHE = 'avurna-media-v1';
const MEDIA_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mov', '.m4v', '.ogg', '.mp3', '.wav', '.aac', '.flac', '.mkv', '.avi', '.heic', '.heif', '.avif'
];

function isMediaRequest(url) {
  return MEDIA_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache static assets
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((response) => response || fetch(request))
    );
    return;
  }

  // Cache GET /api/chat for offline chat history
  if (url.pathname.startsWith('/api/chat') && request.method === 'GET') {
    event.respondWith(
      caches.open(CHAT_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cache.match(request))
      )
    );
    return;
  }

  // Media files: try cache first, then network, then cache
  if (isMediaRequest(url)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          // fallback: try any cache
          return caches.match(request);
        }
      })
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// --- Media Cache Cleanup (optional, enterprise-grade) ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_MEDIA_CACHE') {
    caches.open(MEDIA_CACHE).then(async (cache) => {
      const requests = await cache.keys();
      const maxEntries = 200; // configurable
      if (requests.length > maxEntries) {
        const toDelete = requests.slice(0, requests.length - maxEntries);
        await Promise.all(toDelete.map(req => cache.delete(req)));
      }
    });
  }
});

// Optionally: Cache chat history API responses for offline access
// self.addEventListener('fetch', (event) => { ... });
