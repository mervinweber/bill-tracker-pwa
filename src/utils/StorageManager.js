/**
 * Storage Manager Utility
 * 
 * Centralized, safe management of localStorage with error handling,
 * quota exceeded detection, and graceful fallbacks.
 * 
 * Features:
 * - Safe get/set/remove operations
 * - Quota exceeded detection
 * - Private browsing mode detection
 * - Automatic JSON serialization/deserialization
 * - Consistent error handling
 * - Logging for debugging
 * 
 * @module StorageManager
 */

import { logger } from './logger.js';

/**
 * Storage Manager - Centralized localStorage access
 * @type {Object}
 */
export const StorageManager = {
    /**
     * Get item from localStorage
     * @param {string} key - Storage key
     * @param {*} fallback - Default value if key not found or error occurs
     * @returns {*} Stored value or fallback
     */
    get(key, fallback = null) {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                logger.warn(`localStorage not available, returning fallback for key: ${key}`);
                return fallback;
            }

            const item = localStorage.getItem(key);
            if (item === null) {
                return fallback;
            }

            // Try to parse as JSON, fallback to raw string
            try {
                return JSON.parse(item);
            } catch {
                // Not JSON, return as string
                return item;
            }
        } catch (error) {
            if (error.name === 'SecurityError') {
                logger.warn(`Security error accessing localStorage (private browsing?): ${error.message}`);
            } else {
                logger.error(`Failed to read from localStorage key "${key}"`, error);
            }
            return fallback;
        }
    },

    /**
     * Set item in localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to store (will be JSON stringified)
     * @returns {boolean} Success status
     */
    set(key, value) {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                logger.warn('localStorage not available');
                return false;
            }

            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serialized);
            logger.debug(`Stored data at key: ${key}`);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                logger.error(`localStorage quota exceeded for key "${key}"`, error);
                return false;
            } else if (error.name === 'SecurityError') {
                logger.warn(`Security error writing to localStorage (private browsing?): ${error.message}`);
                return false;
            } else {
                logger.error(`Failed to write to localStorage key "${key}"`, error);
                return false;
            }
        }
    },

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    remove(key) {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                logger.warn('localStorage not available');
                return false;
            }

            localStorage.removeItem(key);
            logger.debug(`Removed data at key: ${key}`);
            return true;
        } catch (error) {
            if (error.name === 'SecurityError') {
                logger.warn(`Security error removing from localStorage (private browsing?): ${error.message}`);
            } else {
                logger.error(`Failed to remove from localStorage key "${key}"`, error);
            }
            return false;
        }
    },

    /**
     * Check if localStorage is available and writable
     * @returns {boolean} True if localStorage is usable
     */
    isAvailable() {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                return false;
            }
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Get estimated storage usage percentage
     * (Note: Only works in browsers that support StorageManager API)
     * @returns {Promise<number>} Percentage of quota used (0-100), or null if unavailable
     */
    async getUsagePercentage() {
        try {
            if (!navigator.storage || !navigator.storage.estimate) {
                return null;
            }

            const estimate = await navigator.storage.estimate();
            const percentUsed = (estimate.usage / estimate.quota) * 100;
            return Math.round(percentUsed);
        } catch (error) {
            logger.warn('Could not determine storage usage', error);
            return null;
        }
    },

    /**
     * Clear all data from localStorage
     * WARNING: This clears everything
     * @returns {boolean} Success status
     */
    clear() {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                logger.warn('localStorage not available');
                return false;
            }

            localStorage.clear();
            logger.info('All localStorage data cleared');
            return true;
        } catch (error) {
            logger.error('Failed to clear localStorage', error);
            return false;
        }
    },

    /**
     * Get all keys in localStorage
     * @returns {string[]} Array of keys
     */
    getAllKeys() {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                return [];
            }
            if (typeof localStorage.key === 'function') {
                const keys = [];
                for (let i = 0; i < localStorage.length; i += 1) {
                    const key = localStorage.key(i);
                    if (key) {
                        keys.push(key);
                    }
                }
                return keys;
            }
            return Object.keys(localStorage);
        } catch (error) {
            logger.error('Failed to get localStorage keys', error);
            return [];
        }
    }
};

/**
 * Get item wrapper for shorthand usage
 * @param {string} key - Storage key
 * @param {*} fallback - Default value
 * @returns {*} Stored value or fallback
 * @deprecated Use StorageManager.get() directly
 */
export function safeGetFromStorage(key, fallback = null) {
    return StorageManager.get(key, fallback);
}

/**
 * Set item wrapper for shorthand usage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} Success status
 * @deprecated Use StorageManager.set() directly
 */
export function safeSetToStorage(key, value) {
    return StorageManager.set(key, value);
}

export default StorageManager;
