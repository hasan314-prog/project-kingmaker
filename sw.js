/* ─────────────────────────────────────────────
   Project IronLogic — Service Worker
   Cache-first strategy for full offline support
───────────────────────────────────────────── */

const CACHE_NAME   = 'ironlogic-v1';
const CORE_ASSETS  = [
  './project_reforge.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

/* ── INSTALL — pre-cache all core assets ──────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

/* ── ACTIVATE — purge old caches ──────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k  => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // take control immediately
  );
});

/* ── FETCH — cache-first, network fallback ────────────────── */
self.addEventListener('fetch', event => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — try network, then cache fresh copy
      return fetch(event.request)
        .then(response => {
          // Only cache valid, same-origin responses
          if (
            !response ||
            response.status !== 200 ||
            response.type === 'opaque'
          ) {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          // Completely offline & not cached — return the app shell
          return caches.match('./project_reforge.html');
        });
    })
  );
});
