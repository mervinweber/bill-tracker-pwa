/**
 * Import Helpers Integration Tests
 * Verifies normalization and validation behavior for imported bill payloads.
 */

import { normalizeImportPayload, MAX_IMPORT_BILLS } from '../src/utils/importHelpers.js';

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

console.log('📋 Running Import Helpers Tests...\n');

const validPayload = {
    bills: [
        {
            name: 'Electric Bill',
            category: 'Utilities',
            dueDate: '2026-03-20',
            amountDue: '120.50',
            recurrence: 'monthly',
            balance: '120.50',
            paymentHistory: [
                { amount: '50', date: '2026-03-01', method: 'Card' },
                { amount: -5, date: 'oops' }
            ]
        }
    ],
    customCategories: ['Utilities', '<script>Bad</script>'],
    paymentSettings: {
        startDate: '2026-03-14',
        frequency: 'bi-weekly',
        payPeriodsToShow: '6'
    }
};

test('should normalize valid payload and sanitize categories', () => {
    const result = normalizeImportPayload(validPayload, {
        existingCategories: ['Rent'],
        defaultCategories: ['Rent', 'Utilities']
    });

    assertEqual(result.processedBills.length, 1, 'should process one bill');
    assertEqual(result.processedBills[0].recurrence, 'Monthly', 'should normalize recurrence casing');
    assertEqual(result.processedBills[0].paymentHistory.length, 1, 'should drop invalid payment history entries');
    assert(result.allCategories.includes('scriptBad/script'), 'should sanitize imported metadata categories');
    assert(result.paymentSettingsToStore !== null, 'should include valid payment settings');
});

test('should reject invalid bill amount', () => {
    const badPayload = {
        bills: [{ ...validPayload.bills[0], amountDue: '-1' }]
    };

    let rejected = false;
    try {
        normalizeImportPayload(badPayload);
    } catch (error) {
        rejected = /invalid bill entries|non-negative number/i.test(error.message);
    }

    assert(rejected, 'payload with invalid amount should be rejected');
});

test('should skip invalid payment settings safely', () => {
    const payload = {
        ...validPayload,
        paymentSettings: {
            startDate: '2020-01-01',
            frequency: 'bi-weekly',
            payPeriodsToShow: 6
        }
    };

    const result = normalizeImportPayload(payload);
    assertEqual(result.paymentSettingsToStore, null, 'invalid payment settings should not be returned for storage');
});

test('should reject oversized bill payloads', () => {
    const oversizedBills = Array.from({ length: MAX_IMPORT_BILLS + 1 }, () => ({
        ...validPayload.bills[0]
    }));

    let rejected = false;
    try {
        normalizeImportPayload({ bills: oversizedBills });
    } catch (error) {
        rejected = /exceeds/i.test(error.message);
    }

    assert(rejected, 'oversized import should be rejected');
});

console.log(`\n📊 Import Helpers Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);
export { testsPassed, testsFailed };
