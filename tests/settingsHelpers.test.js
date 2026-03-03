/**
 * Settings Helpers Tests
 * Verifies payment schedule change detection logic.
 */

import { hasPaymentScheduleChanged } from '../src/utils/settingsHelpers.js';

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
        testsPassed++;
    } catch (error) {
        console.error(`❌ ${description}: ${error.message}`);
        testsFailed++;
    }
}

console.log('📋 Running Settings Helpers Tests...\n');

test('should return false when schedule values are unchanged', () => {
    const existing = { startDate: '2026-03-01', frequency: 'bi-weekly', payPeriodsToShow: 6 };
    const incoming = { startDate: '2026-03-01', frequency: 'bi-weekly', payPeriodsToShow: 6 };

    assert(!hasPaymentScheduleChanged(existing, incoming), 'unchanged settings should return false');
});

test('should return true when any schedule field changes', () => {
    const existing = { startDate: '2026-03-01', frequency: 'bi-weekly', payPeriodsToShow: 6 };

    assert(hasPaymentScheduleChanged(existing, { ...existing, startDate: '2026-03-02' }), 'startDate change should return true');
    assert(hasPaymentScheduleChanged(existing, { ...existing, frequency: 'weekly' }), 'frequency change should return true');
    assert(hasPaymentScheduleChanged(existing, { ...existing, payPeriodsToShow: 8 }), 'payPeriods change should return true');
});

test('should ignore paycheck amount-only changes for schedule detection', () => {
    const existing = {
        startDate: '2026-03-01',
        frequency: 'bi-weekly',
        payPeriodsToShow: 6,
        amount: 2500
    };

    assert(!hasPaymentScheduleChanged(existing, { ...existing, amount: 2500 }), 'same amount should return false');
    assert(!hasPaymentScheduleChanged(existing, { ...existing, amount: 2600 }), 'amount-only change should return false');
    assert(!hasPaymentScheduleChanged(existing, { ...existing, amount: null }), 'removing amount-only should return false');
});

console.log(`\n📊 Settings Helpers Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);
export { testsPassed, testsFailed };
