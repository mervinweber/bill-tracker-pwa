const CACHE_NAME = 'bill-tracker-v8';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json', '/setup.html'];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        for (const asset of ASSETS_TO_CACHE) {
            try {
                await cache.add(asset);
            } catch (error) {
                console.warn(`Failed to cache asset during install: ${asset}`, error);
            }
        }

        self.skipWaiting();
    })());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith((async () => {
        const cached = await caches.match(event.request);

        try {
            const network = await fetch(event.request);

            if (event.request.url.startsWith(self.location.origin)) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, network.clone());
            }

            return network;
        } catch (error) {
            if (cached) {
                return cached;
            }

            if (event.request.mode === 'navigate') {
                const fallback = await caches.match('/index.html');
                if (fallback) {
                    return fallback;
                }
            }

            throw error;
        }
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter((cacheName) => cacheName !== CACHE_NAME)
                .map((cacheName) => caches.delete(cacheName))
        );

        await self.clients.claim();
    })());
});
