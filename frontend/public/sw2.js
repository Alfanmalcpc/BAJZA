/* ═══════════════════════════════════════
   BAJA Service Worker — v1.0
   Provides offline caching & fast loads
   ═══════════════════════════════════════ */

const CACHE_NAME = 'baja-v3';
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
        // Ignore failed fetches
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

/* Fetch: Network-first strategy to prevent old version bugs */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (e.request.method !== 'GET') return;

  // External APIs should never be cached
  if (url.hostname.includes('api.coingecko') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com/firebase') ||
      url.hostname.includes('pagead2')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Network-First (Jaringan duluan, kalau gagal baru ambil dari Cache)
  // Ini memastikan pengguna SELALU melihat update terbaru setelah dipublish.
  e.respondWith(
    fetch(e.request).then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
      }
      return response;
    }).catch(() => {
      // Jika offline, ambil dari cache
      return caches.match(e.request).then((cached) => {
        if (cached) return cached;
        // Fallback halaman utama jika HTML gagal
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
