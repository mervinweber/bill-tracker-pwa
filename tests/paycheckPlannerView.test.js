import { describe, expect, it } from 'vitest';
import { buildPlannerRows } from '../src/views/paycheckPlannerView.js';

const localDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

describe('paycheckPlannerView buildPlannerRows', () => {
    it('calculates due totals and remaining per paycheck period', () => {
        const bills = [
            { id: '1', dueDate: '2026-03-31', amountDue: 300, isPaid: false },
            { id: '2', dueDate: '2026-04-10', amountDue: 200, isPaid: false },
            { id: '3', dueDate: '2026-04-20', amountDue: 150, isPaid: false },
            { id: '4', dueDate: '2026-03-29', amountDue: 999, isPaid: true }
        ];

        const payCheckDates = [localDate('2026-03-30'), localDate('2026-04-13')];
        const adjustmentsByDate = {
            '2026-03-30': [{ id: 'a1', amount: 50, note: 'Bonus' }],
            '2026-04-13': [{ id: 'a2', amount: -25, note: 'Cash withdrawal' }]
        };

        const rows = buildPlannerRows({
            bills,
            payCheckDates,
            frequency: 'bi-weekly',
            paycheckAmount: 1000,
            adjustmentsByDate
        });

        expect(rows).toHaveLength(2);
        expect(rows[0].totalDue).toBe(500);
        expect(rows[0].adjustmentTotal).toBe(50);
        expect(rows[0].carryIn).toBe(0);
        expect(rows[0].remaining).toBe(550);

        expect(rows[1].totalDue).toBe(150);
        expect(rows[1].adjustmentTotal).toBe(-25);
        expect(rows[1].carryIn).toBe(550);
        expect(rows[1].remaining).toBe(1375);
    });

    it('handles missing paycheck amount and ignores invalid adjustments', () => {
        const bills = [{ id: '1', dueDate: '2026-05-01', amountDue: 200, isPaid: false }];
        const payCheckDates = [localDate('2026-04-27')];
        const adjustmentsByDate = {
            '2026-04-27': [
                { id: 'valid', amount: 25 },
                { id: 'bad-amount', amount: Number.NaN },
                { amount: 10 }
            ]
        };

        const rows = buildPlannerRows({
            bills,
            payCheckDates,
            frequency: 'weekly',
            paycheckAmount: null,
            adjustmentsByDate
        });

        expect(rows[0].adjustments).toHaveLength(1);
        expect(rows[0].adjustmentTotal).toBe(25);
        expect(rows[0].remaining).toBeNull();
    });

    it('surfaces largest bills when paycheck has a shortfall', () => {
        const bills = [
            { id: 'a', name: 'Rent', category: 'Housing', dueDate: '2026-06-01', amountDue: 1200, isPaid: false },
            { id: 'b', name: 'Car', category: 'Auto', dueDate: '2026-06-03', amountDue: 450, isPaid: false },
            { id: 'c', name: 'Phone', category: 'Utilities', dueDate: '2026-06-05', amountDue: 90, isPaid: false }
        ];

        const rows = buildPlannerRows({
            bills,
            payCheckDates: [localDate('2026-06-01')],
            frequency: 'weekly',
            paycheckAmount: 1000,
            adjustmentsByDate: {}
        });

        expect(rows[0].remaining).toBeLessThan(0);
        expect(rows[0].shortfallBills).toHaveLength(3);
        expect(rows[0].shortfallBills[0].name).toBe('Rent');
        expect(rows[0].shortfallBills[1].name).toBe('Car');
    });
});
