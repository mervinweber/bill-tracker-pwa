/**
 * Theme Manager
 * Handles dark/light mode initialization and toggling.
 */

import StorageManager from '../utils/StorageManager.js';
import { STORAGE_KEYS } from '../utils/constants.js';

/**
 * Apply saved theme on startup
 */
export function initializeTheme() {
    const savedTheme = StorageManager.get(STORAGE_KEYS.THEME);
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
}

/**
 * Toggle between light and dark mode
 */
export function handleToggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    StorageManager.set(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');

    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.textContent = isDark ? '☀️' : '🌓';
}
