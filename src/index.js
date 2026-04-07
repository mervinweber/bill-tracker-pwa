/**
 * Bill Tracker PWA - Main Entry Point
 * 
 * This is the single entry point for the Bill Tracker application.
 * It delegates all initialization and functionality to the app orchestrator.
 * 
 * Features:
 * - Modular component architecture with separated concerns
 * - Comprehensive error handling and recovery
 * - Full WCAG 2.1 Level AA accessibility
 * - Progressive Web App capabilities
 * - Responsive design for mobile and desktop
 * - Dark mode support with localStorage persistence
 * - Local data storage with JSON import/export
 * 
 * @file Main entry point for Bill Tracker PWA
 * @module index
 * @requires app
 */

import { appOrchestrator } from './app.js';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch((error) => {
            console.error('Service Worker registration failed', error);
        });
    });
}

const SW_RECOVERY_FLAG = 'swRecoveryAttempted';

async function tryRecoverFromStaleServiceWorker(reason = 'unknown') {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return;
    }

    if (!('serviceWorker' in navigator) || !('caches' in window)) {
        return;
    }

    if (sessionStorage.getItem(SW_RECOVERY_FLAG) === '1') {
        return;
    }

    try {
        sessionStorage.setItem(SW_RECOVERY_FLAG, '1');

        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));

        console.warn('Recovered from potential stale service worker/cache issue', { reason });
        window.location.reload();
    } catch (error) {
        console.error('Service worker recovery attempt failed', error);
    }
}

window.tryRecoverFromStaleServiceWorker = tryRecoverFromStaleServiceWorker;

function normalizeErrorText(value) {
    if (!value) {
        return '';
    }

    if (value instanceof Error) {
        return `${value.name || ''} ${value.message || ''}`.trim().toLowerCase();
    }

    return String(value).toLowerCase();
}

function isServiceWorkerOrChunkFailure(errorText = '') {
    return (
        errorText.includes('chunkloaderror')
        || errorText.includes('loading chunk')
        || errorText.includes('failed to fetch dynamically imported module')
        || errorText.includes('dynamically imported module')
        || errorText.includes('importing a module script failed')
        || errorText.includes('service worker')
        || errorText.includes('failed to register a serviceworker')
    );
}

window.addEventListener('error', (event) => {
    const errorText = [
        normalizeErrorText(event?.message),
        normalizeErrorText(event?.filename),
        normalizeErrorText(event?.error)
    ].join(' ');

    if (isServiceWorkerOrChunkFailure(errorText)) {
        tryRecoverFromStaleServiceWorker('window-error:sw-chunk');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const errorText = [
        normalizeErrorText(reason),
        normalizeErrorText(reason?.message),
        normalizeErrorText(reason?.stack)
    ].join(' ');

    if (isServiceWorkerOrChunkFailure(errorText)) {
        tryRecoverFromStaleServiceWorker('unhandled-rejection:sw-chunk');
    }
});

/**
 * Initialize application when DOM is ready
 * 
 * Waits for the DOM to fully load before initializing the app.
 * This ensures all HTML elements are available for manipulation.
 */
document.addEventListener('DOMContentLoaded', () => {
    appOrchestrator.initialize();
});

/**
 * Global helper function for editing bills from calendar view
 * 
 * @function editBillGlobal
 * @param {string} billId - ID of the bill to edit
 * @description This is exposed globally to allow calendar view
 *   (which may use different rendering contexts) to trigger bill editing.
 *   Delegates to appOrchestrator's handleEditBill method.
 * @example
 * // Called from calendar view when user clicks a bill
 * editBillGlobal('bill-123');
 */
window.editBillGlobal = (billId) => {
    if (appOrchestrator && typeof appOrchestrator.handleEditBill === 'function') {
        appOrchestrator.handleEditBill(billId);
    }
};
