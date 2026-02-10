/**
 * IndexedDB Utilities
 * 
 * Provides basic IndexedDB support for offline data persistence
 * and transaction queuing.
 */

import logger from './logger.js';

const DB_NAME = 'BillTrackerOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineQueue';

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            logger.error('IndexedDB error', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
};

/**
 * Add a transaction to the offline queue
 * @param {Object} data - Transaction data to queue
 * @returns {Promise<number>} - ID of the queued item
 */
export const queueOfflineTransaction = async (data) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.add({
            ...data,
            timestamp: Date.now()
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Get all queued transactions
 * @returns {Promise<Array>}
 */
export const getQueuedTransactions = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Remove a transaction from the queue
 * @param {number} id - ID of the transaction to remove
 * @returns {Promise<void>}
 */
export const removeQueuedTransaction = async (id) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
