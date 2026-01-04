const CACHE_NAME = 'bill-tracker-v7';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/index.css',
    '/index.js',
    '/payment-history.js',
    '/manifest.json',
    '/data/categories.json',
    '/vendor/supabase.js',
    // Modules
    '/components/header.js',
    '/components/sidebar.js',
    '/components/billForm.js',
    '/components/billGrid.js',
    '/components/dashboard.js',
    '/components/authModal.js',
    '/utils/storage.js',
    '/utils/billHelpers.js',
    '/services/supabase.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
