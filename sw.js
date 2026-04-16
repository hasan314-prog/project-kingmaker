/* ─────────────────────────────────────────────
   Project IronLogic — Service Worker

   Strategy:
   • project_ironlogic.html  →  Network-first
     Always fetches the latest code from the server.
     Falls back to cache only when offline.
     ➜ No SW version bump needed for code changes.

   • icons / manifest        →  Cache-first
     Stable assets served instantly from cache.
     ➜ Only bump CACHE_NAME when these files change.
───────────────────────────────────────────── */

const CACHE_NAME    = 'ironlogic-v3';           // bump only when icons/manifest change
const STATIC_ASSETS = [
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
];
const APP_SHELL = './project_ironlogic.html';

/* ── INSTALL — pre-cache static assets only ───────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())            // activate immediately
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
    ).then(() => self.clients.claim())           // take control immediately
  );
});

/* ── FETCH ─────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url        = new URL(event.request.url);
  const isAppShell = url.pathname.endsWith('project_ironlogic.html')
                  || url.pathname === '/';

  if (isAppShell) {
    /* ── Network-first for the app HTML ──────────────────────
       Always tries the network so code updates are instant.
       If offline, serves the cached copy.                    */
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match(APP_SHELL))
        )
    );

  } else {
    /* ── Cache-first for icons, manifest, etc. ───────────────
       Stable assets are served instantly from cache.
       Falls back to network if somehow missing.              */
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          }
          return response;
        });
      })
    );
  }
});
