/// <reference lib="webworker" />
// Source of truth for service worker logic.
// This file is synced to public/service-worker.js by Vite config.

const CACHE_NAME = 'bill-tracker-v9';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json', '/setup.html', '/src/index.css'];

/** @type {ServiceWorkerGlobalScope} */
const swSelf = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

swSelf.addEventListener('install', /** @param {ExtendableEvent} event */ (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        for (const asset of ASSETS_TO_CACHE) {
            try {
                await cache.add(asset);
            } catch (error) {
                console.warn(`Failed to cache asset during install: ${asset}`, error);
            }
        }

        swSelf.skipWaiting();
    })());
});

swSelf.addEventListener('fetch', /** @param {FetchEvent} event */ (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith((async () => {
        const cached = await caches.match(event.request);

        try {
            const network = await fetch(event.request);

            if (event.request.url.startsWith(swSelf.location.origin)) {
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

swSelf.addEventListener('activate', /** @param {ExtendableEvent} event */ (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter((cacheName) => cacheName !== CACHE_NAME)
                .map((cacheName) => caches.delete(cacheName))
        );

        await swSelf.clients.claim();
    })());
});

swSelf.addEventListener('notificationclick', /** @param {NotificationEvent} event */ (event) => {
    const notification = event.notification;
    const action = event.action;

    notification.close();

    if (action === 'pay' && notification.data?.website) {
        event.waitUntil(swSelf.clients.openWindow(notification.data.website));
    } else {
        event.waitUntil(
            swSelf.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (swSelf.clients.openWindow) {
                    return swSelf.clients.openWindow('/');
                }
            })
        );
    }
});
