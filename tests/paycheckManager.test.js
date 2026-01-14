/**
 * PaycheckManager Unit Tests
 * Tests business logic for paycheck generation and bill calculations
 */

import { paycheckManager } from '../src/utils/paycheckManager.js';

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
    const startDate = new Date('2025-01-08');
    const paychecks = paycheckManager.generatePaycheckDates(startDate, 'bi-weekly', 3);
    
    assert(paychecks.length === 3, 'should generate 3 paychecks');
    assert(paychecks[0].toDateString() === startDate.toDateString(), 'first paycheck should match start date');
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
    const startDate = new Date('2025-01-08');
    const paychecks = paycheckManager.generatePaycheckDates(startDate, 'weekly', 2);
    const labels = paycheckManager.getPaycheckLabels(paychecks);
    
    assert(labels.length === 2, 'should return labels for all paychecks');
    assert(typeof labels[0] === 'string', 'labels should be strings');
});

test('should handle weekly frequency', () => {
    const startDate = new Date('2025-01-08');
    const paychecks = paycheckManager.generatePaycheckDates(startDate, 'weekly', 2);
    const daysDiff = Math.round((paychecks[1] - paychecks[0]) / (1000 * 60 * 60 * 24));
    
    assert(daysDiff === 7, 'weekly frequency should generate 7 days apart');
});

test('should handle bi-weekly frequency', () => {
    const startDate = new Date('2025-01-08');
    const paychecks = paycheckManager.generatePaycheckDates(startDate, 'bi-weekly', 2);
    const daysDiff = Math.round((paychecks[1] - paychecks[0]) / (1000 * 60 * 60 * 24));
    
    assert(daysDiff === 14, 'bi-weekly frequency should generate 14 days apart');
});

test('should handle monthly frequency', () => {
    const startDate = new Date('2025-01-08');
    const paychecks = paycheckManager.generatePaycheckDates(startDate, 'monthly', 2);
    
    assert(paychecks.length === 2, 'should generate 2 paychecks');
    assert(paychecks[0].getDate() === paychecks[1].getDate(), 'monthly paychecks should have same day');
});

console.log(`\n📊 PaycheckManager Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);
export { testsPassed, testsFailed };
