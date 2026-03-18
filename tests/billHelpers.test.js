import { it, expect, describe } from 'vitest';
import { calculateNextDueDate, getRemainingBalance, advanceBillToNextCycle } from '../src/utils/billHelpers.js';

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

it('calculateNextDueDate - Quarterly', () => {
    const date = new Date(2025, 0, 1);
    const next = calculateNextDueDate(date, 'Quarterly');
    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(3); // April
    expect(next.getDate()).toBe(1);
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

describe('advanceBillToNextCycle', () => {
    it('does nothing when bill is unpaid', () => {
        const bill = { dueDate: '2025-01-15', recurrence: 'Monthly' };
        const updated = { ...bill, isPaid: false };
        advanceBillToNextCycle(bill, updated);
        expect(updated.dueDate).toBe('2025-01-15');
    });

    it('does nothing for one-time bill', () => {
        const bill = { dueDate: '2025-01-15', recurrence: 'One-time' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated);
        expect(updated.dueDate).toBe('2025-01-15');
    });

    it('advances monthly bill by one month (single-cycle)', () => {
        const bill = { dueDate: '2025-01-15', recurrence: 'Monthly' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated);
        expect(updated.dueDate).toBe('2025-02-15');
    });

    it('advances weekly bill by 7 days', () => {
        const bill = { dueDate: '2025-01-15', recurrence: 'Weekly' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated);
        expect(updated.dueDate).toBe('2025-01-22');
    });

    it('advances bi-weekly bill by 14 days', () => {
        const bill = { dueDate: '2025-01-15', recurrence: 'Bi-weekly' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated);
        expect(updated.dueDate).toBe('2025-01-29');
    });

    it('advances yearly bill by one year', () => {
        const bill = { dueDate: '2025-01-15', recurrence: 'Yearly' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated);
        expect(updated.dueDate).toBe('2026-01-15');
    });

    it('advances quarterly bill by 3 months', () => {
        const bill = { dueDate: '2025-01-15', recurrence: 'Quarterly' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated);
        expect(updated.dueDate).toBe('2025-04-15');
    });

    it('catch-up strategy advances past overdue monthly cycles', () => {
        const bill = { dueDate: '2024-10-15', recurrence: 'Monthly' };
        const updated = { ...bill, isPaid: true };
        // Reference date of 2025-01-20 means Oct/Nov/Dec are overdue; next non-overdue is Feb
        advanceBillToNextCycle(bill, updated, {
            strategy: 'catch-up-to-current',
            referenceDate: new Date('2025-01-20')
        });
        expect(updated.dueDate > '2025-01-15').toBe(true);
    });

    it('single-cycle strategy ignores overdue status and advances by one month', () => {
        const bill = { dueDate: '2024-10-15', recurrence: 'Monthly' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated, { strategy: 'single-cycle' });
        expect(updated.dueDate).toBe('2024-11-15');
    });
});
