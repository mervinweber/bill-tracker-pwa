/**
 * Offline Operations Queue
 * Manages bulk operations that can be queued and synced when online
 */

import { StorageManager } from './StorageManager.js';
import logger from './logger.js';

const QUEUE_STORAGE_KEY = 'offline_operations_queue';
const QUEUE_STATUS_KEY = 'offline_queue_status';
const MAX_QUEUE_SIZE = 250;
const MAX_OPERATION_SIZE = 10 * 1024; // 10KB per operation

/**
 * Operation types
 */
export const OPERATION_TYPES = {
    UPDATE_BILL: 'update_bill',
    DELETE_BILL: 'delete_bill',
    CREATE_BILL: 'create_bill',
    RECORD_PAYMENT: 'record_payment',
    BATCH_UPDATE: 'batch_update'
};

/**
 * Queue an offline operation
 * @param {string} operationType - Type of operation (see OPERATION_TYPES)
 * @param {Object} data - Operation data
 * @param {string} id - Operation ID (billId, etc.)
 * @returns {Object|null} Queued operation with timestamp, or null if rejected
 */
export function queueOperation(operationType, data, id) {
    try {
        // Validate inputs
        if (!operationType || typeof operationType !== 'string') {
            logger.error('Invalid operationType', { operationType });
            return null;
        }

        if (!Object.values(OPERATION_TYPES).includes(operationType)) {
            logger.warn('Unknown operation type', { operationType });
        }

        if (!id || typeof id !== 'string') {
            logger.error('Invalid operation id', { id });
            return null;
        }

        if (!data || typeof data !== 'object') {
            logger.error('Invalid operation data', { data });
            return null;
        }

        // Check operation size
        const operationJson = JSON.stringify(data);
        if (operationJson.length > MAX_OPERATION_SIZE) {
            logger.error('Operation data exceeds max size', {
                operationType,
                size: operationJson.length,
                maxSize: MAX_OPERATION_SIZE
            });
            return null;
        }

        const queue = StorageManager.get(QUEUE_STORAGE_KEY) || [];

        // Enforce max queue size - reject if at capacity
        if (queue.length >= MAX_QUEUE_SIZE) {
            logger.warn('Queue at max capacity', {
                maxSize: MAX_QUEUE_SIZE,
                currentSize: queue.length,
                operation: operationType
            });
            return null;
        }

        const operation = {
            id: `${operationType}-${id}-${Date.now()}`,
            type: operationType,
            billId: id,
            data,
            timestamp: Date.now(),
            retries: 0,
            maxRetries: 3,
            status: 'pending'
        };

        queue.push(operation);
        StorageManager.set(QUEUE_STORAGE_KEY, queue);

        // Update status
        updateQueueStatus();

        logger.info('Operation queued', { operationType, billId: id, queueSize: queue.length });
        return operation;
    } catch (error) {
        logger.error('Error queuing operation', error);
        return null;
    }
}

/**
 * Get all pending operations
 * @returns {Array} Array of pending operations
 */
export function getPendingOperations() {
    try {
        return StorageManager.get(QUEUE_STORAGE_KEY) || [];
    } catch (error) {
        logger.error('Error retrieving pending operations', error);
        return [];
    }
}

/**
 * Get operation count by status
 * @param {string} status - Operation status ('pending', 'completed', 'failed')
 * @returns {number} Count of operations with given status
 */
export function getOperationCount(status = null) {
    const operations = getPendingOperations();
    if (!status) return operations.length;
    return operations.filter(op => op.status === status).length;
}

/**
 * Clear completed operations
 * @param {number} olderThanMs - Clear operations older than this duration (default 24 hours)
 * @returns {number} Number of operations cleared
 */
export function clearCompletedOperations(olderThanMs = 24 * 60 * 60 * 1000) {
    try {
        const queue = getPendingOperations();
        const now = Date.now();
        const filtered = queue.filter(op => {
            const isCompleted = op.status === 'completed' || op.status === 'failed';
            const isOld = (now - op.timestamp) > olderThanMs;
            return !(isCompleted && isOld);
        });

        const removed = queue.length - filtered.length;
        StorageManager.set(QUEUE_STORAGE_KEY, filtered);
        updateQueueStatus();

        if (removed > 0) {
            logger.info('Cleared completed operations', { count: removed });
        }

        return removed;
    } catch (error) {
        logger.error('Error clearing completed operations', error);
        return 0;
    }
}

/**
 * Enforce queue size limit by removing oldest completed operations if necessary
 * @returns {number} Number of operations trimmed
 */
export function enforceQueueSizeLimit() {
    try {
        const queue = getPendingOperations();

        if (queue.length <= MAX_QUEUE_SIZE) {
            return 0;
        }

        // Remove excess, prioritizing completed/failed operations
        const pending = queue.filter(op => op.status === 'pending');
        const completed = queue.filter(op => op.status === 'completed' || op.status === 'failed');

        // Sort completed by timestamp (oldest first) and remove
        completed.sort((a, b) => a.timestamp - b.timestamp);

        const toRemove = queue.length - MAX_QUEUE_SIZE;
        const trimmed = completed.slice(0, toRemove);
        const remaining = [...pending, ...completed.slice(toRemove)];

        StorageManager.set(QUEUE_STORAGE_KEY, remaining);
        updateQueueStatus();

        if (trimmed.length > 0) {
            logger.warn('Trimmed queue to enforce size limit', {
                removed: trimmed.length,
                queueSize: remaining.length,
                maxSize: MAX_QUEUE_SIZE
            });
        }

        return trimmed.length;
    } catch (error) {
        logger.error('Error enforcing queue size limit', error);
        return 0;
    }
}

/**
 * Remove specific operation from queue
 * @param {string} operationId - Operation ID to remove
 * @returns {boolean} True if operation was removed
 */
export function removeOperation(operationId) {
    try {
        const queue = getPendingOperations();
        const filtered = queue.filter(op => op.id !== operationId);
        
        if (filtered.length < queue.length) {
            StorageManager.set(QUEUE_STORAGE_KEY, filtered);
            updateQueueStatus();
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Error removing operation', error);
        return false;
    }
}

/**
 * Mark operation as completed
 * @param {string} operationId - Operation ID
 * @returns {boolean} Success status
 */
export function markOperationCompleted(operationId) {
    try {
        const queue = getPendingOperations();
        const operation = queue.find(op => op.id === operationId);
        
        if (operation) {
            operation.status = 'completed';
            operation.completedAt = Date.now();
            StorageManager.set(QUEUE_STORAGE_KEY, queue);
            updateQueueStatus();
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Error marking operation completed', error);
        return false;
    }
}

/**
 * Mark operation as failed
 * @param {string} operationId - Operation ID
 * @param {string} errorMessage - Error message
 * @returns {boolean} Success status
 */
export function markOperationFailed(operationId, errorMessage = null) {
    try {
        const queue = getPendingOperations();
        const operation = queue.find(op => op.id === operationId);
        
        if (operation) {
            operation.retries++;
            if (operation.retries >= operation.maxRetries) {
                operation.status = 'failed';
                operation.failedAt = Date.now();
                operation.lastError = errorMessage;
            }
            StorageManager.set(QUEUE_STORAGE_KEY, queue);
            updateQueueStatus();
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Error marking operation failed', error);
        return false;
    }
}

/**
 * Get queue status summary
 * @returns {Object} Status object with queue metrics
 */
export function getQueueStatus() {
    try {
        return StorageManager.get(QUEUE_STATUS_KEY) || {
            pending: 0,
            completed: 0,
            failed: 0,
            lastSyncAttempt: null,
            lastSyncSuccess: null
        };
    } catch (error) {
        logger.error('Error getting queue status', error);
        return null;
    }
}

/**
 * Update queue status metrics
 * @private
 */
function updateQueueStatus() {
    const queue = getPendingOperations();
    const status = {
        pending: queue.filter(op => op.status === 'pending').length,
        completed: queue.filter(op => op.status === 'completed').length,
        failed: queue.filter(op => op.status === 'failed').length,
        lastUpdated: Date.now()
    };

    // Preserve sync metadata if it exists
    const existing = StorageManager.get(QUEUE_STATUS_KEY) || {};
    status.lastSyncAttempt = existing.lastSyncAttempt || null;
    status.lastSyncSuccess = existing.lastSyncSuccess || null;

    StorageManager.set(QUEUE_STATUS_KEY, status);
}

/**
 * Clear entire operation queue (use with caution)
 * @returns {void}
 */
export function clearQueue() {
    try {
        StorageManager.set(QUEUE_STORAGE_KEY, []);
        StorageManager.set(QUEUE_STATUS_KEY, {
            pending: 0,
            completed: 0,
            failed: 0,
            lastSyncAttempt: null,
            lastSyncSuccess: null
        });
        logger.warn('Operation queue cleared');
    } catch (error) {
        logger.error('Error clearing queue', error);
    }
}

/**
 * Retry failed operations
 * @param {number} maxRetries - Max number of retries per operation
 * @returns {Array} Operations ready for retry
 */
export function getOperationsReadyForRetry(maxRetries = 3) {
    const queue = getPendingOperations();
    return queue.filter(op => {
        const isRetryable = op.status === 'pending' && op.retries > 0;
        const withinRetryLimit = op.retries < maxRetries;
        return isRetryable && withinRetryLimit;
    });
}

/**
 * Get operation statistics
 * @returns {Object} Statistics about queued operations
 */
export function getQueueStatistics() {
    const queue = getPendingOperations();
    
    const stats = {
        totalOperations: queue.length,
        byType: {},
        byStatus: {
            pending: 0,
            completed: 0,
            failed: 0
        },
        oldestOperation: null,
        averageRetries: 0
    };

    let totalRetries = 0;

    queue.forEach(op => {
        // Count by type
        stats.byType[op.type] = (stats.byType[op.type] || 0) + 1;

        // Count by status
        stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1;

        // Track oldest
        if (!stats.oldestOperation || op.timestamp < stats.oldestOperation.timestamp) {
            stats.oldestOperation = {
                timestamp: op.timestamp,
                age: Date.now() - op.timestamp,
                type: op.type
            };
        }

        totalRetries += op.retries || 0;
    });

    stats.averageRetries = queue.length > 0 ? Number((totalRetries / queue.length).toFixed(2)) : 0;

    return stats;
}
