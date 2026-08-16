const CACHE = 'marketlist-shell-v3';

/** Immutable statics only — never HTML routes like / or /app */
const ASSETS = ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        ASSETS.map((url) =>
          cache.add(url).catch(() => {
            /* skip missing statics quietly */
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isNavigate = (request) =>
  request.mode === 'navigate' ||
  (request.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/socket.io')) return;
  if (url.pathname.startsWith('/_next/')) return;

  if (isNavigate(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match('/manifest.webmanifest').then(() => Response.error())),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && ASSETS.some((a) => url.pathname === a)) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
