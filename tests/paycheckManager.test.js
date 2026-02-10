/**
 * PaycheckManager Unit Tests
 * Tests business logic for paycheck generation and bill calculations
 */

import { paycheckManager } from '../src/utils/paycheckManager.js';

function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}. ${message}`);
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

console.log('📋 Running PaycheckManager Tests...\n');

test('should generate paycheck dates correctly', () => {
    const startDate = new Date();
    const settings = {
        startDate: formatDateString(startDate),
        frequency: 'bi-weekly',
        payPeriodsToShow: 3
    };

    paycheckManager.updateSettings(settings);
    const paychecks = paycheckManager.generatePaycheckDates();

    assert(paychecks.length === 3, 'should generate 3 paychecks');
    const firstPaycheck = paychecks[0];
    assert(formatDateString(firstPaycheck) === settings.startDate, 'first paycheck should match start date');
});

test('should validate settings with valid data', () => {
    const settings = {
        startDate: '2025-01-08',
        frequency: 'bi-weekly',
        payPeriodsToShow: 4
    };
    
    const result = paycheckManager.validateSettings(settings);
    assert(result.isValid, 'valid settings should pass validation');
    assert(result.errors.length === 0, 'valid settings should have no errors');
});

test('should validate settings and catch missing startDate', () => {
    const settings = {
        frequency: 'bi-weekly',
        payPeriodsToShow: 4
    };
    
    const result = paycheckManager.validateSettings(settings);
    assert(!result.isValid, 'settings without startDate should fail');
    assert(result.errors.length > 0, 'should have at least one error');
});

test('should validate settings and catch invalid frequency', () => {
    const settings = {
        startDate: '2025-01-08',
        frequency: 'invalid',
        payPeriodsToShow: 4
    };
    
    const result = paycheckManager.validateSettings(settings);
    assert(!result.isValid, 'settings with invalid frequency should fail');
});

test('should get paycheck labels for dates', () => {
    const startDate = new Date();
    const settings = {
        startDate: formatDateString(startDate),
        frequency: 'weekly',
        payPeriodsToShow: 2
    };

    paycheckManager.updateSettings(settings);
    paycheckManager.generatePaycheckDates();
    const labels = paycheckManager.getPaycheckLabels();
    
    assert(labels.length === 2, 'should return labels for all paychecks');
    assert(typeof labels[0] === 'string', 'labels should be strings');
});

test('should handle weekly frequency', () => {
    const startDate = new Date();
    paycheckManager.updateSettings({
        startDate: formatDateString(startDate),
        frequency: 'weekly',
        payPeriodsToShow: 2
    });
    const paychecks = paycheckManager.generatePaycheckDates();
    const daysDiff = Math.round((paychecks[1] - paychecks[0]) / (1000 * 60 * 60 * 24));
    
    assert(daysDiff === 7, 'weekly frequency should generate 7 days apart');
});

test('should handle bi-weekly frequency', () => {
    const startDate = new Date();
    paycheckManager.updateSettings({
        startDate: formatDateString(startDate),
        frequency: 'bi-weekly',
        payPeriodsToShow: 2
    });
    const paychecks = paycheckManager.generatePaycheckDates();
    const daysDiff = Math.round((paychecks[1] - paychecks[0]) / (1000 * 60 * 60 * 24));
    
    assert(daysDiff === 14, 'bi-weekly frequency should generate 14 days apart');
});

test('should handle monthly frequency', () => {
    const startDate = new Date();
    paycheckManager.updateSettings({
        startDate: formatDateString(startDate),
        frequency: 'monthly',
        payPeriodsToShow: 2
    });
    const paychecks = paycheckManager.generatePaycheckDates();

    assert(paychecks.length === 2, 'should generate 2 paychecks');
    const daysDiff = Math.round((paychecks[1] - paychecks[0]) / (1000 * 60 * 60 * 24));
    assert(daysDiff === 30, 'monthly frequency should generate 30 days apart');
});

console.log(`\n📊 PaycheckManager Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);
export { testsPassed, testsFailed };
