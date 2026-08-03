/* ═══════════════════════════════════════
   BAJA Service Worker — v1.0
   Provides offline caching & fast loads
   ═══════════════════════════════════════ */

const CACHE_NAME = 'baja-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/firebase.js',
  '/manifest.json',
  '/tools/index.html',
  '/finance/index.html',
  '/tutorial/index.html',
  'https://fonts.googleapis.com/css2?family=Bangers&family=Space+Grotesk:wght@400;500;700;900&display=swap'
];

/* Install: cache static assets */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore failed fetches (e.g., Google Fonts might be blocked)
      });
    }).then(() => self.skipWaiting())
  );
});

/* Activate: remove old caches */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch: cache-first for static, network-first for API */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // Network-first for API calls (CoinGecko, Firebase, etc.)
  if (url.hostname.includes('api.coingecko') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com/firebase') ||
      url.hostname.includes('pagead2')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
        }
        return response;
      }).catch(() => {
        // Return offline fallback for HTML pages
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
