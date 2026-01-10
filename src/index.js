/**
 * Bill Tracker PWA - Main Entry Point
 * Simplified entry point that delegates to app orchestrator
 */

import { appOrchestrator } from './app.js';

// Initialize app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    appOrchestrator.initialize();
});

// Global helper for calendar view to edit bills
window.editBillGlobal = (billId) => {
    if (appOrchestrator && typeof appOrchestrator.handleEditBill === 'function') {
        appOrchestrator.handleEditBill(billId);
    }
};
