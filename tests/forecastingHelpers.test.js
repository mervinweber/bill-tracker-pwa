import { it, expect } from 'vitest';
import {
    calculateAverageMonthlySpending,
    forecastNextMonth,
    getSpendingAlerts,
    calculateTrend,
    calculateBudgetMetrics
} from '../src/utils/forecastingHelpers.js';

const bills = [
    { id: '1', name: 'Electric', dueDate: '2026-03-05', amountDue: 120, category: 'Utilities', recurrence: 'Monthly', isPaid: false },
    { id: '2', name: 'Water', dueDate: '2026-03-10', amountDue: 50, category: 'Utilities', recurrence: 'Monthly', isPaid: false },
    { id: '3', name: 'Internet', dueDate: '2026-03-15', amountDue: 79.99, category: 'Services', recurrence: 'Monthly', isPaid: false },
];

it('calculateAverageMonthlySpending returns 0 for empty array', () => {
    expect(calculateAverageMonthlySpending([])).toBe(0);
});

it('calculateAverageMonthlySpending returns 0 for null', () => {
    expect(calculateAverageMonthlySpending(null)).toBe(0);
});

it('calculateAverageMonthlySpending returns positive for valid bills', () => {
    expect(calculateAverageMonthlySpending(bills, 3)).toBeGreaterThan(0);
});

it('forecastNextMonth returns 0 total for empty array', () => {
    expect(forecastNextMonth([]).total).toBe(0);
});

it('forecastNextMonth returns 0 total for null', () => {
    expect(forecastNextMonth(null).total).toBe(0);
});

it('forecastNextMonth does not count one-time bills', () => {
    const oneTime = [{ id: '1', dueDate: '2026-04-01', amountDue: 100, category: 'Test', recurrence: 'One-time' }];
    expect(forecastNextMonth(oneTime).recurringCount).toBe(0);
});

it('forecastNextMonth counts quarterly bills as recurring', () => {
    const quarterly = [{ id: '1', dueDate: '2026-04-01', amountDue: 180, category: 'Insurance', recurrence: 'Quarterly' }];
    const forecast = forecastNextMonth(quarterly);
    expect(forecast.recurringCount).toBe(1);
    expect(forecast.total).toBe(180);
});

it('getSpendingAlerts returns empty array for empty bills', () => {
    expect(getSpendingAlerts([]).length).toBe(0);
});

it('getSpendingAlerts returns empty array for null', () => {
    expect(getSpendingAlerts(null).length).toBe(0);
});

it('getSpendingAlerts detects overdue bills', () => {
    const overdue = [{ id: '1', name: 'Overdue', dueDate: '2020-01-01', amountDue: 100, isPaid: false }];
    const alerts = getSpendingAlerts(overdue);
    expect(alerts.some(a => a.type === 'overdue')).toBe(true);
});

it('getSpendingAlerts does not alert for paid bills', () => {
    const paid = [{ id: '1', name: 'Paid', dueDate: '2020-01-01', amountDue: 100, isPaid: true }];
    expect(getSpendingAlerts(paid).length).toBe(0);
});

it('calculateTrend returns flat for empty array', () => {
    expect(calculateTrend([]).direction).toBe('flat');
});

it('calculateTrend returns flat for null', () => {
    expect(calculateTrend(null).direction).toBe('flat');
});

it('calculateTrend returns valid direction', () => {
    const t = calculateTrend(bills, 3);
    expect(['up', 'down', 'flat']).toContain(t.direction);
});

it('calculateBudgetMetrics returns 0 spending for empty bills', () => {
    expect(calculateBudgetMetrics([]).currentMonthSpending).toBe(0);
});

it('calculateBudgetMetrics returns numeric percentOfBudget', () => {
    const m = calculateBudgetMetrics(bills, 1000);
    expect(typeof m.percentOfBudget).toBe('number');
});
