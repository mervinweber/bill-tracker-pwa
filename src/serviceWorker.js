// This file registers a service worker for the PWA, enabling offline capabilities and caching.

import logger from './utils/logger.js';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                logger.info('Service Worker registered', { scope: registration.scope });
            })
            .catch(error => {
                logger.error('Service Worker registration failed', error);
            });
    });
}