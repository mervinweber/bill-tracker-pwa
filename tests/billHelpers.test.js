import { it, expect, describe } from 'vitest';
import { calculateNextDueDate, getRemainingBalance, advanceBillToNextCycle, filterBillsByPeriod } from '../src/utils/billHelpers.js';
import { paycheckManager } from '../src/utils/paycheckManager.js';

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

it('getRemainingBalance - Applies credit balance before payments', () => {
    const bill = {
        amountDue: 100,
        creditBalance: 30,
        paymentHistory: []
    };
    const balance = getRemainingBalance(bill);
    expect(balance).toBe(70);
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

    it('catch-up strategy advances weekly bills to a non-overdue cycle', () => {
        const bill = { dueDate: '2025-01-01', recurrence: 'Weekly' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated, {
            strategy: 'catch-up-to-current',
            referenceDate: new Date('2025-01-20')
        });
        expect(updated.dueDate).toBe('2025-01-22');
    });

    it('catch-up strategy advances bi-weekly bills to a non-overdue cycle', () => {
        const bill = { dueDate: '2025-01-01', recurrence: 'Bi-weekly' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated, {
            strategy: 'catch-up-to-current',
            referenceDate: new Date('2025-01-20')
        });
        expect(updated.dueDate).toBe('2025-01-29');
    });

    it('single-cycle strategy ignores overdue status and advances by one month', () => {
        const bill = { dueDate: '2024-10-15', recurrence: 'Monthly' };
        const updated = { ...bill, isPaid: true };
        advanceBillToNextCycle(bill, updated, { strategy: 'single-cycle' });
        expect(updated.dueDate).toBe('2024-11-15');
    });
});

describe('filterBillsByPeriod', () => {
    it('supports credit filter in all-bills view', () => {
        const bills = [
            { id: '1', dueDate: '2025-01-10', isPaid: false, creditBalance: 0 },
            { id: '2', dueDate: '2025-01-12', isPaid: true, creditBalance: 25 },
            { id: '3', dueDate: '2025-01-15', isPaid: false, creditBalance: 5 }
        ];

        const result = filterBillsByPeriod(
            bills,
            'all',
            null,
            null,
            'credit',
            [new Date(2025, 0, 1), new Date(2025, 0, 15)],
            true,
            'everything'
        );

        expect(result.map((bill) => bill.id)).toEqual(['2', '3']);
    });

    it('supports credit filter in filtered paycheck/category view', () => {
        const originalPaySettings = { ...paycheckManager.paymentSettings };
        try {
            paycheckManager.paymentSettings = {
                ...originalPaySettings,
                frequency: 'bi-weekly'
            };

            const bills = [
                { id: '1', category: 'Utilities', dueDate: '2025-01-10', isPaid: false, creditBalance: 0 },
                { id: '2', category: 'Utilities', dueDate: '2025-01-11', isPaid: false, creditBalance: 20 },
                { id: '3', category: 'Rent', dueDate: '2025-01-12', isPaid: true, creditBalance: 40 }
            ];

            const result = filterBillsByPeriod(
                bills,
                'filtered',
                0,
                'Utilities',
                'credit',
                [new Date(2025, 0, 1), new Date(2025, 0, 15)],
                true,
                'everything'
            );

            expect(result.map((bill) => bill.id)).toEqual(['2']);
        } finally {
            paycheckManager.paymentSettings = originalPaySettings;
        }
    });

    it('supports open-only scope in all-bills view', () => {
        const bills = [
            { id: '1', dueDate: '2025-01-10', isPaid: false, creditBalance: 0 },
            { id: '2', dueDate: '2025-01-12', isPaid: true, creditBalance: 0 },
            { id: '3', dueDate: '2025-02-01', isPaid: false, creditBalance: 0 }
        ];

        const result = filterBillsByPeriod(
            bills,
            'all',
            null,
            null,
            'all',
            [new Date(2025, 0, 1), new Date(2025, 0, 15)],
            true,
            'open-only'
        );

        expect(result.map((bill) => bill.id)).toEqual(['1', '3']);
    });

    it('supports open-through-next-pay-date scope in all-bills view', () => {
        const originalPaySettings = { ...paycheckManager.paymentSettings };
        try {
            paycheckManager.paymentSettings = {
                ...originalPaySettings,
                frequency: 'bi-weekly'
            };

            const bills = [
                { id: '1', dueDate: '2025-01-10', isPaid: false, creditBalance: 0 },
                { id: '2', dueDate: '2025-01-14', isPaid: false, creditBalance: 0 },
                { id: '3', dueDate: '2025-01-16', isPaid: false, creditBalance: 0 },
                { id: '4', dueDate: '2025-01-12', isPaid: true, creditBalance: 0 }
            ];

            const result = filterBillsByPeriod(
                bills,
                'all',
                0,
                null,
                'unpaid',
                [new Date(2025, 0, 1), new Date(2025, 0, 15), new Date(2025, 0, 29)],
                true,
                'open-through-next-pay-date'
            );

            expect(result.map((bill) => bill.id)).toEqual(['1', '2']);
        } finally {
            paycheckManager.paymentSettings = originalPaySettings;
        }
    });

    it('carries overdue unpaid bills into a later pay period when enabled', () => {
        const originalPaySettings = { ...paycheckManager.paymentSettings };
        const originalAutoSelectedIndex = paycheckManager.getAutoSelectedPayPeriodIndex;
        try {
            paycheckManager.paymentSettings = {
                ...originalPaySettings,
                frequency: 'bi-weekly'
            };
            paycheckManager.getAutoSelectedPayPeriodIndex = () => 0;

            const bills = [
                { id: '1', category: 'Utilities', dueDate: '2025-01-10', isPaid: false, creditBalance: 0 },
                { id: '2', category: 'Utilities', dueDate: '2025-01-22', isPaid: false, creditBalance: 0 },
                { id: '3', category: 'Utilities', dueDate: '2025-01-30', isPaid: false, creditBalance: 0 }
            ];

            const result = filterBillsByPeriod(
                bills,
                'filtered',
                2,
                'Utilities',
                'all',
                [new Date(2025, 0, 1), new Date(2025, 0, 15), new Date(2025, 0, 29)],
                true,
                'everything'
            );

            expect(result.map((bill) => bill.id)).toEqual(['1', '2', '3']);
        } finally {
            paycheckManager.paymentSettings = originalPaySettings;
            paycheckManager.getAutoSelectedPayPeriodIndex = originalAutoSelectedIndex;
        }
    });

    it('hides paid bills from the pay period view', () => {
        const originalPaySettings = { ...paycheckManager.paymentSettings };
        try {
            paycheckManager.paymentSettings = {
                ...originalPaySettings,
                frequency: 'bi-weekly'
            };

            const bills = [
                { id: '1', category: 'Utilities', dueDate: '2025-01-10', isPaid: false, creditBalance: 0 },
                { id: '2', category: 'Utilities', dueDate: '2025-01-22', isPaid: true, creditBalance: 0 },
                { id: '3', category: 'Utilities', dueDate: '2025-01-30', isPaid: false, creditBalance: 0 }
            ];

            const result = filterBillsByPeriod(
                bills,
                'filtered',
                2,
                'Utilities',
                'all',
                [new Date(2025, 0, 1), new Date(2025, 0, 15), new Date(2025, 0, 29)],
                true,
                'everything'
            );

            expect(result.map((bill) => bill.id)).toEqual(['1', '3']);
        } finally {
            paycheckManager.paymentSettings = originalPaySettings;
        }
    });

    it('supports overdue filter in all-bills view', () => {
        const bills = [
            { id: '1', dueDate: '2020-01-10', isPaid: false, creditBalance: 0 },
            { id: '2', dueDate: '2030-01-12', isPaid: false, creditBalance: 0 },
            { id: '3', dueDate: '2020-01-15', isPaid: true, creditBalance: 0 }
        ];

        const result = filterBillsByPeriod(
            bills,
            'all',
            null,
            null,
            'overdue',
            [new Date(2025, 0, 1), new Date(2025, 0, 15)],
            true,
            'everything'
        );

        expect(result.map((bill) => bill.id)).toEqual(['1']);
    });

    it('supports before_next_payday filter in all-bills view', () => {
        const originalPaySettings = { ...paycheckManager.paymentSettings };
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const todayDate = now.getDate();
        const yesterday = new Date(currentYear, currentMonth, todayDate - 1);
        const tomorrow = new Date(currentYear, currentMonth, todayDate + 1);
        const fiveDays = new Date(currentYear, currentMonth, todayDate + 5);
        const tenDays = new Date(currentYear, currentMonth, todayDate + 10);

        const toLocalKey = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        try {
            paycheckManager.paymentSettings = {
                ...originalPaySettings,
                frequency: 'bi-weekly'
            };

            const bills = [
                { id: 'past_due', dueDate: toLocalKey(yesterday), isPaid: false, creditBalance: 0 },
                { id: 'due_tomorrow', dueDate: toLocalKey(tomorrow), isPaid: false, creditBalance: 0 },
                { id: 'due_five_days', dueDate: toLocalKey(fiveDays), isPaid: false, creditBalance: 0 },
                { id: 'due_ten_days', dueDate: toLocalKey(tenDays), isPaid: false, creditBalance: 0 },
                { id: 'paid_bill', dueDate: toLocalKey(tomorrow), isPaid: true, creditBalance: 0 }
            ];

            const result = filterBillsByPeriod(
                bills,
                'all',
                null,
                null,
                'before_next_payday',
                [tenDays],
                true,
                'everything'
            );

            expect(result.map((bill) => bill.id)).toEqual(['due_tomorrow', 'due_five_days']);
        } finally {
            paycheckManager.paymentSettings = originalPaySettings;
        }
    });

    it('supports before_next_payday filter in filtered paycheck/category view', () => {
        const originalPaySettings = { ...paycheckManager.paymentSettings };
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const todayDate = now.getDate();
        const yesterday = new Date(currentYear, currentMonth, todayDate - 1);
        const twoDays = new Date(currentYear, currentMonth, todayDate + 2);
        const sixDays = new Date(currentYear, currentMonth, todayDate + 6);

        const toLocalKey = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        try {
            paycheckManager.paymentSettings = {
                ...originalPaySettings,
                frequency: 'bi-weekly'
            };

            const bills = [
                { id: 'util_due_soon', category: 'Utilities', dueDate: toLocalKey(twoDays), isPaid: false, creditBalance: 0 },
                { id: 'util_future', category: 'Utilities', dueDate: toLocalKey(sixDays), isPaid: false, creditBalance: 0 },
                { id: 'util_past', category: 'Utilities', dueDate: toLocalKey(yesterday), isPaid: false, creditBalance: 0 },
                { id: 'util_paid', category: 'Utilities', dueDate: toLocalKey(twoDays), isPaid: true, creditBalance: 0 },
                { id: 'rent_due_soon', category: 'Rent', dueDate: toLocalKey(twoDays), isPaid: false, creditBalance: 0 }
            ];

            const result = filterBillsByPeriod(
                bills,
                'filtered',
                0,
                'Utilities',
                'before_next_payday',
                [yesterday, sixDays],
                true,
                'everything'
            );

            expect(result.map((bill) => bill.id)).toEqual(['util_due_soon']);
        } finally {
            paycheckManager.paymentSettings = originalPaySettings;
        }
    });

    it('hides archived bills from normal all-bills views', () => {
        const bills = [
            { id: 'active', category: 'Credit Cards', dueDate: '2026-06-05', isPaid: false, archived: false, creditBalance: 0 },
            { id: 'archived', category: 'Credit Cards', dueDate: '2026-06-06', isPaid: false, archived: true, creditBalance: 0 }
        ];

        const result = filterBillsByPeriod(
            bills,
            'all',
            null,
            null,
            'all',
            [new Date('2026-06-01'), new Date('2026-06-15')],
            true,
            'everything'
        );

        expect(result.map((bill) => bill.id)).toEqual(['active']);
    });

    it('shows archived bills only when archived filter is selected', () => {
        const bills = [
            { id: 'active', category: 'Credit Cards', dueDate: '2026-06-05', isPaid: false, archived: false, creditBalance: 0 },
            { id: 'archived', category: 'Credit Cards', dueDate: '2026-06-06', isPaid: false, archived: true, creditBalance: 0 }
        ];

        const result = filterBillsByPeriod(
            bills,
            'all',
            null,
            null,
            'archived',
            [new Date('2026-06-01'), new Date('2026-06-15')],
            true,
            'everything'
        );

        expect(result.map((bill) => bill.id)).toEqual(['archived']);
    });
});
