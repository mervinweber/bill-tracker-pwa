import { it, expect } from 'vitest';
import { calculateNextDueDate, getRemainingBalance } from '../src/utils/billHelpers.js';

it('calculateNextDueDate - Monthly', () => {
    const date = new Date('2025-01-01');
    const next = calculateNextDueDate(date, 'Monthly');
    const expected = new Date('2025-02-01');
    expect(next.getTime()).toBe(expected.getTime());
});

it('calculateNextDueDate - Weekly', () => {
    const date = new Date('2025-01-01'); // Wednesday
    const next = calculateNextDueDate(date, 'Weekly');
    const expected = new Date('2025-01-08');
    expect(next.getTime()).toBe(expected.getTime());
});

it('getRemainingBalance - Fully Unpaid', () => {
    const bill = { amountDue: 100, paymentHistory: [] };
    const balance = getRemainingBalance(bill);
    expect(balance).toBe(100);
});

it('getRemainingBalance - Partially Paid', () => {
    const bill = {
        amountDue: 100,
        paymentHistory: [
            { amount: 30 },
            { amount: 20 }
        ]
    };
    const balance = getRemainingBalance(bill);
    expect(balance).toBe(50);
});

it('getRemainingBalance - Fully Paid', () => {
    const bill = {
        amountDue: 100,
        paymentHistory: [
            { amount: 100 }
        ]
    };
    const balance = getRemainingBalance(bill);
    expect(balance).toBe(0);
});
