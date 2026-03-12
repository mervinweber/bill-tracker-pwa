import { assert, describe, it, expect } from 'vitest';
/**
 * Monthly Catch-up Option Tests
 * Verifies overdue monthly cycle counting and catch-up due date behavior.
 */

import { getMissedMonthlyCycles, getNextNonOverdueMonthlyDate, formatLocalDate } from '../src/utils/dates.js';





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



