import StorageManager from './StorageManager.js';
import logger from './logger.js';
import { STORAGE_KEYS } from './constants.js';

const MAX_AUDIT_EVENTS = 1000;

function createAuditEvent(eventType, details = {}) {
    const userEmail = StorageManager.get(STORAGE_KEYS.USER_EMAIL, null);

    return {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        timestamp: new Date().toISOString(),
        eventType,
        userEmail,
        entityType: details.entityType || null,
        entityId: details.entityId || null,
        summary: details.summary || '',
        metadata: details.metadata || {}
    };
}

export function recordAuditEvent(eventType, details = {}) {
    try {
        if (!eventType || typeof eventType !== 'string') {
            return false;
        }

        const existing = StorageManager.get(STORAGE_KEYS.AUDIT_LOG, []);
        const events = Array.isArray(existing) ? existing : [];
        const next = [createAuditEvent(eventType, details), ...events].slice(0, MAX_AUDIT_EVENTS);

        return StorageManager.set(STORAGE_KEYS.AUDIT_LOG, next);
    } catch (error) {
        logger.error('Failed to record audit event', error);
        return false;
    }
}

export function getAuditEvents(limit = 100) {
    const events = StorageManager.get(STORAGE_KEYS.AUDIT_LOG, []);
    if (!Array.isArray(events)) {
        return [];
    }

    if (!Number.isFinite(limit) || limit <= 0) {
        return events;
    }

    return events.slice(0, limit);
}

export function clearAuditEvents() {
    return StorageManager.set(STORAGE_KEYS.AUDIT_LOG, []);
}
