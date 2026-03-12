import { assert, describe, it, expect } from 'vitest';
/**
 * Settings Helpers Tests
 * Verifies payment schedule change detection logic.
 */

import { hasPaymentScheduleChanged } from '../src/utils/settingsHelpers.js';





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



