import { describe, expect, it } from 'vitest';
import { buildDebtSnowballPlan, isDebtSnowballCandidate } from '../src/utils/debtSnowball.js';

function buildBill(overrides = {}) {
    return {
        id: 'bill-1',
        name: 'Card A',
        category: 'Debt',
        dueDate: '2026-04-10',
        amountDue: 35,
        balance: 35,
        debtTotal: 900,
        interestRate: 19.99,
        includeInDebtSnowball: false,
        isPaid: false,
        recurrence: 'Monthly',
        paymentHistory: [],
        ...overrides
    };
}

describe('debt snowball planner', () => {
    it('includes debt candidate when interest rate exists', () => {
        expect(isDebtSnowballCandidate(buildBill())).toBe(true);
    });

    it('includes flagged bill even without interest rate', () => {
        expect(isDebtSnowballCandidate(buildBill({ debtTotal: 0, interestRate: 0, includeInDebtSnowball: true }))).toBe(true);
    });

    it('sorts by smallest debt and applies extra payment to first target', () => {
        const plan = buildDebtSnowballPlan([
            buildBill({ id: 'a', name: 'Card B', debtTotal: 1500, amountDue: 50 }),
            buildBill({ id: 'b', name: 'Card A', debtTotal: 400, amountDue: 25 })
        ], 200);

        expect(plan.itemCount).toBe(2);
        expect(plan.items[0].id).toBe('b');
        expect(plan.items[0].isPriorityTarget).toBe(true);
        expect(plan.items[0].recommendedPayment).toBe(225);
        expect(plan.totalDebt).toBe(1900);
    });
});
