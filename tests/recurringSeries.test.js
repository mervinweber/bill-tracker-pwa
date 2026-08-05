import { describe, expect, it } from 'vitest';
import { cascadeRecurringBillEdit } from '../src/utils/recurringSeries.js';

const monthlyBill = {
    id: 'citi-aug',
    name: 'Citi Credit',
    category: 'Credit Card',
    dueDate: '2026-08-22',
    amountDue: 100,
    balance: 100,
    recurrence: 'Monthly',
    isPaid: false,
    paymentHistory: []
};

describe('cascadeRecurringBillEdit', () => {
    it('renames and reschedules future unpaid occurrences without changing another card', () => {
        const bills = [
            { ...monthlyBill, id: 'citi-jul', dueDate: '2026-07-22' },
            monthlyBill,
            { ...monthlyBill, id: 'citi-sep', dueDate: '2026-09-22' },
            { ...monthlyBill, id: 'citi-oct', dueDate: '2026-10-22' },
            { ...monthlyBill, id: 'other-card', name: 'Citi Credit - Blue', dueDate: '2026-09-22' }
        ];
        const updated = {
            ...monthlyBill,
            name: 'Citi Credit - Black',
            dueDate: '2026-08-25',
            amountDue: 125,
            balance: 125
        };

        const result = cascadeRecurringBillEdit(bills, monthlyBill, updated);

        expect(result.find((bill) => bill.id === 'citi-jul')).toEqual(bills[0]);
        expect(result.find((bill) => bill.id === 'citi-aug')).toMatchObject({
            name: 'Citi Credit - Black',
            dueDate: '2026-08-25',
            seriesId: 'citi-aug'
        });
        expect(result.find((bill) => bill.id === 'citi-sep')).toMatchObject({
            name: 'Citi Credit - Black',
            dueDate: '2026-09-25',
            amountDue: 125,
            balance: 125,
            seriesId: 'citi-aug'
        });
        expect(result.find((bill) => bill.id === 'citi-oct')).toMatchObject({
            name: 'Citi Credit - Black',
            dueDate: '2026-10-25'
        });
        expect(result.find((bill) => bill.id === 'other-card')).toEqual(bills[4]);
    });

    it('keeps paid future occurrences and custom balances unchanged', () => {
        const paidFuture = {
            ...monthlyBill,
            id: 'citi-sep-paid',
            dueDate: '2026-09-22',
            isPaid: true,
            balance: 0,
            paymentHistory: [{ id: 'payment-1', date: '2026-09-01', amount: 100 }]
        };
        const customBalance = {
            ...monthlyBill,
            id: 'citi-oct-custom',
            dueDate: '2026-10-22',
            balance: 60
        };
        const updated = { ...monthlyBill, name: 'Citi Credit - Black', amountDue: 125, balance: 125 };

        const result = cascadeRecurringBillEdit([monthlyBill, paidFuture, customBalance], monthlyBill, updated);

        expect(result.find((bill) => bill.id === paidFuture.id)).toEqual(paidFuture);
        expect(result.find((bill) => bill.id === customBalance.id)).toMatchObject({
            name: 'Citi Credit - Black',
            amountDue: 125,
            balance: 60
        });
    });

    it('uses a stored series id after a series has been renamed', () => {
        const original = { ...monthlyBill, seriesId: 'series-citi' };
        const renamedFuture = {
            ...monthlyBill,
            id: 'citi-sep',
            seriesId: 'series-citi',
            name: 'Previously Renamed Card',
            dueDate: '2026-09-22'
        };

        const result = cascadeRecurringBillEdit(
            [original, renamedFuture],
            original,
            { ...original, name: 'Final Card Name' }
        );

        expect(result.find((bill) => bill.id === renamedFuture.id).name).toBe('Final Card Name');
    });
});
