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
