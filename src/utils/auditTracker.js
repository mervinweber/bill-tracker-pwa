import StorageManager from './StorageManager.js';
import logger from './logger.js';
import { STORAGE_KEYS } from './constants.js';
import {
    AUDIT_LOG_RETENTION_DAYS,
    MAX_AUDIT_EVENTS,
    MS_PER_DAY
} from '../config/constants.js';

const MAX_METADATA_DEPTH = 2;
const MAX_METADATA_KEYS = 20;
const MAX_METADATA_ARRAY_ITEMS = 20;
const MAX_METADATA_STRING_LENGTH = 200;
const SENSITIVE_KEY_PATTERN = /(password|token|secret|session|cookie|jwt|bearer|authorization)/i;

function maskEmail(email) {
    if (typeof email !== 'string' || !email.includes('@')) {
        return null;
    }

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
        return null;
    }

    const visiblePrefix = localPart.slice(0, 1);
    return `${visiblePrefix}***@${domain}`;
}

function sanitizeString(value) {
    return value.length > MAX_METADATA_STRING_LENGTH
        ? `${value.slice(0, MAX_METADATA_STRING_LENGTH)}...`
        : value;
}

function sanitizeValue(value, key = '', depth = 0) {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'string') {
        if (/email/i.test(key)) {
            return maskEmail(value);
        }
        return sanitizeString(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (Array.isArray(value)) {
        if (depth >= MAX_METADATA_DEPTH) {
            return [];
        }

        const sanitizedArray = [];
        for (const item of value.slice(0, MAX_METADATA_ARRAY_ITEMS)) {
            const sanitizedItem = sanitizeValue(item, key, depth + 1);
            if (sanitizedItem !== undefined) {
                sanitizedArray.push(sanitizedItem);
            }
        }
        return sanitizedArray;
    }

    if (typeof value === 'object') {
        if (depth >= MAX_METADATA_DEPTH) {
            return {};
        }

        const sanitizedObject = {};
        const entries = Object.entries(value).slice(0, MAX_METADATA_KEYS);

        for (const [nestedKey, nestedValue] of entries) {
            if (SENSITIVE_KEY_PATTERN.test(nestedKey)) {
                continue;
            }

            const sanitizedNestedValue = sanitizeValue(nestedValue, nestedKey, depth + 1);
            if (sanitizedNestedValue !== undefined && sanitizedNestedValue !== null) {
                sanitizedObject[nestedKey] = sanitizedNestedValue;
            }
        }

        return sanitizedObject;
    }

    return undefined;
}

function sanitizeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return {};
    }

    const sanitized = sanitizeValue(metadata, 'metadata', 0);
    return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
        ? sanitized
        : {};
}

function isRecentEvent(event, cutoffMs) {
    const timestamp = event?.timestamp;
    if (typeof timestamp !== 'string') {
        return false;
    }

    const eventTime = Date.parse(timestamp);
    return Number.isFinite(eventTime) && eventTime >= cutoffMs;
}

function createAuditEvent(eventType, details = {}) {
    const userEmail = StorageManager.get(STORAGE_KEYS.USER_EMAIL, null);

    return {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        timestamp: new Date().toISOString(),
        eventType,
        userEmail: maskEmail(userEmail),
        entityType: details.entityType || null,
        entityId: details.entityId || null,
        summary: details.summary || '',
        metadata: sanitizeMetadata(details.metadata)
    };
}

export function recordAuditEvent(eventType, details = {}) {
    try {
        if (!eventType || typeof eventType !== 'string') {
            return false;
        }

        const existing = StorageManager.get(STORAGE_KEYS.AUDIT_LOG, []);
        const events = Array.isArray(existing) ? existing : [];
        const cutoffMs = Date.now() - (AUDIT_LOG_RETENTION_DAYS * MS_PER_DAY);
        const recentEvents = events.filter(event => isRecentEvent(event, cutoffMs));
        const next = [createAuditEvent(eventType, details), ...recentEvents].slice(0, MAX_AUDIT_EVENTS);

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
