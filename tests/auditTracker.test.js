import { STORAGE_KEYS } from '../src/utils/constants.js';
import { recordAuditEvent, getAuditEvents, clearAuditEvents } from '../src/utils/auditTracker.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function test(description, testFn) {
    try {
        testFn();
        console.log(`✅ ${description}`);
        testsPassed += 1;
    } catch (error) {
        console.error(`❌ ${description}: ${error.message}`);
        testsFailed += 1;
    }
}

console.log('📋 Running Audit Tracker Tests...\n');

const storageMap = new Map();

globalThis.localStorage = {
    getItem(key) {
        return storageMap.has(key) ? storageMap.get(key) : null;
    },
    setItem(key, value) {
        storageMap.set(key, String(value));
    },
    removeItem(key) {
        storageMap.delete(key);
    },
    clear() {
        storageMap.clear();
    },
    key(index) {
        return Array.from(storageMap.keys())[index] || null;
    },
    get length() {
        return storageMap.size;
    }
};

test('should record and retrieve audit events', () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, 'user@example.com');

    const recorded = recordAuditEvent('bill.payment.recorded', {
        entityType: 'bill',
        entityId: 'bill_123',
        summary: 'Payment recorded',
        metadata: { amount: 25 }
    });

    assert(recorded, 'audit event should be recorded successfully');

    const events = getAuditEvents();
    assert(events.length === 1, 'should return one audit event');
    assert(events[0].eventType === 'bill.payment.recorded', 'event type should match');
    assert(events[0].userEmail === 'user@example.com', 'user email should be captured');
});

test('should clear audit events', () => {
    recordAuditEvent('settings.saved', { summary: 'Settings updated' });
    const cleared = clearAuditEvents();

    assert(cleared, 'clearAuditEvents should succeed');
    assert(getAuditEvents().length === 0, 'audit event list should be empty after clear');
});

test('should return most recent events first', () => {
    localStorage.clear();

    recordAuditEvent('event.one', { summary: 'first' });
    recordAuditEvent('event.two', { summary: 'second' });

    const events = getAuditEvents(2);
    assert(events.length === 2, 'should return two events');
    assert(events[0].eventType === 'event.two', 'newest event should be first');
    assert(events[1].eventType === 'event.one', 'older event should be second');
});

console.log(`\n📊 Audit Tracker Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed > 0) {
    process.exit(1);
}
