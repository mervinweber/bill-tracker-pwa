/**
 * Monthly Catch-up Option Tests
 * Verifies overdue monthly cycle counting and catch-up due date behavior.
 */

import { getMissedMonthlyCycles, getNextNonOverdueMonthlyDate, formatLocalDate } from '../src/utils/dates.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}. ${message}`);
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

console.log('📋 Running Monthly Catch-up Option Tests...\n');

test('should return zero missed cycles when due date is not overdue', () => {
    const dueDate = new Date(2026, 2, 15); // Mar 15, 2026
    const referenceDate = new Date(2026, 2, 10); // Mar 10, 2026
    const missed = getMissedMonthlyCycles(dueDate, referenceDate);

    assertEqual(missed, 0, 'not-overdue due date should have zero missed cycles');
});

test('should count multiple missed monthly cycles', () => {
    const dueDate = new Date(2025, 10, 15); // Nov 15, 2025
    const referenceDate = new Date(2026, 2, 1); // Mar 1, 2026
    const missed = getMissedMonthlyCycles(dueDate, referenceDate);

    assert(missed >= 3, 'overdue monthly bill should report several missed cycles');
});

test('should advance to next non-overdue monthly due date', () => {
    const dueDate = new Date(2025, 10, 15); // Nov 15, 2025
    const referenceDate = new Date(2026, 2, 1); // Mar 1, 2026
    const nextDue = getNextNonOverdueMonthlyDate(dueDate, referenceDate);

    assert(nextDue instanceof Date, 'next due date should be a valid Date');
    assertEqual(formatLocalDate(nextDue), '2026-03-15', 'catch-up should move due date to current cycle');
});

console.log(`\n📊 Monthly Catch-up Option Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);
export { testsPassed, testsFailed };
