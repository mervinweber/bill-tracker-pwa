import { assert, describe, it, expect } from 'vitest';
/**
 * Test Suite: Forecasting Helpers
 * Tests spending predictions, trends, and alerts
 */

import {
    calculateAverageMonthlySpending,
    forecastNextMonth,
    getSpendingAlerts,
    calculateTrend,
    calculateBudgetMetrics
} from '../src/utils/forecastingHelpers.js';

;

const assertEquals = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`❌ ${message}\n   Expected: ${expected}\n   Got: ${actual}`);
    }
    console.log(`✅ ${message}`);
};

const assertClose = (actual, expected, tolerance, message) => {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`❌ ${message}\n   Expected: ~${expected} (±${tolerance})\n   Got: ${actual}`);
    }
    console.log(`✅ ${message}`);
};

// Test Data
const testBills = [
    { id: '1', name: 'Electric', dueDate: '2026-03-05', amountDue: 120, category: 'Utilities', recurrence: 'Monthly', isPaid: false },
    { id: '2', name: 'Water', dueDate: '2026-03-10', amountDue: 50, category: 'Utilities', recurrence: 'Monthly', isPaid: false },
    { id: '3', name: 'Internet', dueDate: '2026-03-15', amountDue: 79.99, category: 'Services', recurrence: 'Monthly', isPaid: false },
    { id: '4', name: 'Phone', dueDate: '2026-03-20', amountDue: 85, category: 'Services', recurrence: 'Monthly', isPaid: false },
    { id: '5', name: 'Streaming', dueDate: '2026-03-25', amountDue: 14.99, category: 'Entertainment', recurrence: 'Monthly', isPaid: false }
];

const recurringBills = [
    { id: '1', name: 'Netflix', dueDate: '2026-04-01', amountDue: 15, category: 'Entertainment', recurrence: 'Monthly', isPaid: false },
    { id: '2', name: 'Gym', dueDate: '2026-04-05', amountDue: 50, category: 'Health', recurrence: 'Monthly', isPaid: false },
    { id: '3', name: 'Insurance', dueDate: '2026-04-10', amountDue: 200, category: 'Insurance', recurrence: 'Yearly', isPaid: false },
    { id: '4', name: 'One-time Bill', dueDate: '2026-04-15', amountDue: 100, category: 'Other', recurrence: 'One-time', isPaid: false }
];

const invalidBills = [
    { id: '1', name: 'Bill', dueDate: 'invalid-date', amountDue: 100, category: 'Test', recurrence: 'Monthly' },
    { id: '2', name: 'Bill', dueDate: null, amountDue: 100, category: 'Test', recurrence: 'Monthly' },
    { id: '3', name: 'Bill', dueDate: '2026-03-05', amountDue: 100, category: 'Test' }  // Missing recurrence
];

// Test Suite
console.log('\n=== Forecasting Helpers Tests ===\n');

// calculateAverageMonthlySpending tests
console.log('Testing calculateAverageMonthlySpending:');
try {
    const avg = calculateAverageMonthlySpending(testBills, 3);
    assert(avg > 0, 'should return positive average for valid bills');
    
    assertEquals(calculateAverageMonthlySpending([]), 0, 'should return 0 for empty array');
    assertEquals(calculateAverageMonthlySpending(null), 0, 'should return 0 for null');
    
    const singleBill = [{ id: '1', dueDate: '2026-03-05', amountDue: 100 }];
    assertClose(calculateAverageMonthlySpending(singleBill, 3), 100, 0.01, 'should calculate average correctly for single bill');
    
    const mixedBills = [...testBills, ...invalidBills];
    const mixedAvg = calculateAverageMonthlySpending(mixedBills, 3);
    assert(mixedAvg > 0, 'should skip invalid bills and calculate average');
    
} catch (error) {
    console.error(`\n❌ calculateAverageMonthlySpending: ${error.message}\n`);
    process.exit(1);
}

// forecastNextMonth tests
console.log('\nTesting forecastNextMonth:');
try {
    const forecast = forecastNextMonth(recurringBills);
    assert(forecast.total > 0, 'should return positive total for recurring bills');
    assert(forecast.recurringCount >= 3, 'should count recurring bills (exclude one-time)');
    assert(Object.keys(forecast.byCategory).length > 0, 'should include category breakdown');
    
    assertEquals(forecastNextMonth([]).total, 0, 'should return 0 total for empty array');
    assertEquals(forecastNextMonth(null).total, 0, 'should return 0 total for null');
    
    const oneTimyOnly = [{ id: '1', dueDate: '2026-04-01', amountDue: 100, category: 'Test', recurrence: 'One-time' }];
    assertEquals(forecastNextMonth(oneTimyOnly).recurringCount, 0, 'should not count one-time bills');
    
    const weeklyBill = [{ id: '1', dueDate: '2026-04-01', amountDue: 50, category: 'Test', recurrence: 'Weekly' }];
    const weeklyForecast = forecastNextMonth(weeklyBill);
    assert(weeklyForecast.recurringCount === 1, 'should count weekly bills as recurring');
    
} catch (error) {
    console.error(`\n❌ forecastNextMonth: ${error.message}\n`);
    process.exit(1);
}

// getSpendingAlerts tests
console.log('\nTesting getSpendingAlerts:');
try {
    const alerts = getSpendingAlerts(testBills, 25);
    assert(Array.isArray(alerts), 'should return array of alerts');
    
    assertEquals(getSpendingAlerts([]).length, 0, 'should return empty array for empty bills');
    assertEquals(getSpendingAlerts(null).length, 0, 'should return empty array for null');
    
    const highBills = [
        { id: '1', name: 'Normal', dueDate: '2026-03-05', amountDue: 100, isPaid: false },
        { id: '2', name: 'High', dueDate: '2026-03-10', amountDue: 500, isPaid: false }  // 400% above average
    ];
    const highAlerts = getSpendingAlerts(highBills, 25);
    const highAlert = highAlerts.find(a => a.type === 'high_amount');
    assert(highAlert, 'should detect high-spend bills');
    assert(highAlert.severity === 'critical', 'should mark high spender as critical');
    
    const overdueBill = [{ id: '1', name: 'Overdue', dueDate: '2026-01-01', amountDue: 100, isPaid: false }];
    const overdueAlerts = getSpendingAlerts(overdueBill);
    const overdueAlert = overdueAlerts.find(a => a.type === 'overdue');
    assert(overdueAlert, 'should detect overdue bills');
    
    const dueSoonBill = [{ id: '1', name: 'Soon', dueDate: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0], amountDue: 100, isPaid: false }];
    const soonAlerts = getSpendingAlerts(dueSoonBill);
    const soonAlert = soonAlerts.find(a => a.type === 'due_soon');
    assert(soonAlert, 'should detect bills due soon');
    
    const paidBill = [{ id: '1', name: 'Paid', dueDate: '2026-01-01', amountDue: 100, isPaid: true }];
    const paidAlerts = getSpendingAlerts(paidBill);
    assert(paidAlerts.length === 0, 'should not alert for paid bills');
    
} catch (error) {
    console.error(`\n❌ getSpendingAlerts: ${error.message}\n`);
    process.exit(1);
}

// calculateTrend tests
console.log('\nTesting calculateTrend:');
try {
    const trend = calculateTrend(testBills, 3);
    assert(trend.direction === 'up' || trend.direction === 'down' || trend.direction === 'flat', 'should return valid direction');
    assert(typeof trend.percentChange === 'number', 'should return numeric percentChange');
    assert(Array.isArray(trend.dataPoints), 'should include data points array');
    
    assertEquals(calculateTrend([]).direction, 'flat', 'should return flat trend for empty array');
    assertEquals(calculateTrend(null).direction, 'flat', 'should return flat trend for null');
    
    // Test upward trend
    const upwardBills = [
        { id: '1', dueDate: '2026-01-05', amountDue: 100 },
        { id: '2', dueDate: '2026-02-05', amountDue: 100 },
        { id: '3', dueDate: '2026-02-10', amountDue: 100 },
        { id: '4', dueDate: '2026-03-05', amountDue: 200 },
        { id: '5', dueDate: '2026-03-10', amountDue: 200 }
    ];
    const upTrend = calculateTrend(upwardBills, 3);
    assert(upTrend.direction === 'up', 'should detect upward trend');
    
} catch (error) {
    console.error(`\n❌ calculateTrend: ${error.message}\n`);
    process.exit(1);
}

// calculateBudgetMetrics tests
console.log('\nTesting calculateBudgetMetrics:');
try {
    const metrics = calculateBudgetMetrics(testBills, 1000);
    assert(typeof metrics.currentMonthSpending === 'number', 'should return currentMonthSpending');
    assert(typeof metrics.averageMonthlySpending === 'number', 'should return averageMonthlySpending');
    assert(typeof metrics.percentOfBudget === 'number', 'should return percentOfBudget');
    assert(typeof metrics.recommendation === 'string', 'should return recommendation');
    
    assertEquals(calculateBudgetMetrics([]).currentMonthSpending, 0, 'should return 0 spending for empty bills');
    
    const overBudgetBills = [
        { id: '1', dueDate: '2026-03-05', amountDue: 700 },
        { id: '2', dueDate: '2026-03-10', amountDue: 400 }
    ];
    const overMetrics = calculateBudgetMetrics(overBudgetBills, 1000);
    assert(overMetrics.recommendation.includes('budget') || overMetrics.recommendation.includes('Budget'), 'should recommend budget review when spending high');
    
} catch (error) {
    console.error(`\n❌ calculateBudgetMetrics: ${error.message}\n`);
    process.exit(1);
}

// Edge case tests
console.log('\nTesting Edge Cases:');
try {
    // Invalid dates mixed with valid
    const mixedDates = [
        { id: '1', dueDate: '2026-03-05', amountDue: 100 },
        { id: '2', dueDate: 'invalid', amountDue: 100 },
        { id: '3', dueDate: '2026-03-10', amountDue: 100 }
    ];
    const mixedAvg = calculateAverageMonthlySpending(mixedDates, 3);
    assert(mixedAvg > 0, 'should handle mixed valid/invalid dates gracefully');
    
    // Negative amounts (should not break)
    const negativeBills = [
        { id: '1', dueDate: '2026-03-05', amountDue: -100, category: 'Test', recurrence: 'Monthly' }
    ];
    const negAlerts = getSpendingAlerts(negativeBills);
    assert(Array.isArray(negAlerts), 'should handle negative amounts without crashing');
    
    // Very large amounts
    const largeBills = [
        { id: '1', dueDate: '2026-03-05', amountDue: 1000000, category: 'Test', isPaid: false }
    ];
    const largeAlerts = getSpendingAlerts(largeBills);
    assert(largeAlerts.length > 0, 'should handle very large amounts');
    
} catch (error) {
    console.error(`\n❌ Edge Cases: ${error.message}\n`);
    process.exit(1);
}

console.log('\n🎉 All Forecasting Helpers tests passed!\n');
