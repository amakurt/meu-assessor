/**
 * MEU ASSESSOR OS · SERVICE WORKER (PWA)
 * Provides offline shell support, caching of static assets and fast native-like launching.
 */

const CACHE_NAME = 'kit-os-cache-v1.2';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/favicon.svg',
    '/manifest.json',
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/images/apple-touch-icon.png',
    '/js/store.js',
    '/js/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Caching non-critical asset failed:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API calls: Always Network First
    if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: 'Você está offline. Reconecte para sincronizar com os assessores.' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // HTML, JS & CSS: Network-First with Cache-Fallback (guarantees instant updates without reinstalling PWA on iPhone)
    if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // Media & Static icons: Cache-First with Network Revalidation
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});
