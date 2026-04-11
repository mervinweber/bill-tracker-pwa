import { it, expect } from 'vitest';
import { recordAuditEvent, getAuditEvents, clearAuditEvents } from '../src/utils/auditTracker.js';
import { STORAGE_KEYS } from '../src/utils/constants.js';
import { StorageManager } from '../src/utils/StorageManager.js';

const mockStorage = {};
global.localStorage = {
    getItem: (key) => mockStorage[key] ?? null,
    setItem: (key, value) => { mockStorage[key] = String(value); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
    get length() { return Object.keys(mockStorage).length; },
    key: (i) => Object.keys(mockStorage)[i] ?? null,
};

it('should record and retrieve audit events', () => {
    StorageManager.clear();
    StorageManager.set(STORAGE_KEYS.USER_EMAIL, 'user@example.com');
    const recorded = recordAuditEvent('bill.payment.recorded', {
        entityType: 'bill',
        entityId: 'bill_123',
        summary: 'Payment recorded',
        metadata: { amount: 25 }
    });
    expect(recorded).toBeTruthy();
    const events = getAuditEvents(5);
    expect(events.length).toBeGreaterThan(0);
});

it('should clear audit events', () => {
    recordAuditEvent('settings.saved', { summary: 'Settings updated' });
    const cleared = clearAuditEvents();
    expect(cleared).toBe(true);
    expect(getAuditEvents().length).toBe(0);
});

it('should return most recent events first', () => {
    StorageManager.clear();
    recordAuditEvent('event.one', { summary: 'first' });
    recordAuditEvent('event.two', { summary: 'second' });
    const events = getAuditEvents(2);
    expect(events.length).toBe(2);
    expect(events[0].eventType).toBe('event.two');
    expect(events[1].eventType).toBe('event.one');
});
