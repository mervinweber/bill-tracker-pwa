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

    it('sorts by smallest debt and applies extra payment to first target (snowball)', () => {
        const plan = buildDebtSnowballPlan([
            buildBill({ id: 'a', name: 'Card B', debtTotal: 1500, amountDue: 50 }),
            buildBill({ id: 'b', name: 'Card A', debtTotal: 400, amountDue: 25 })
        ], 200);

        expect(plan.itemCount).toBe(2);
        expect(plan.items[0].id).toBe('b');
        expect(plan.items[0].isPriorityTarget).toBe(true);
        expect(plan.items[0].recommendedPayment).toBe(225);
        expect(plan.totalDebt).toBe(1900);
        expect(plan.strategy).toBe('snowball');
    });

    it('sorts by highest interest rate first when strategy is avalanche', () => {
        const plan = buildDebtSnowballPlan([
            buildBill({ id: 'low', name: 'Low Rate', debtTotal: 200, interestRate: 5, amountDue: 20 }),
            buildBill({ id: 'high', name: 'High Rate', debtTotal: 5000, interestRate: 24.99, amountDue: 100 })
        ], 0, 'avalanche');

        expect(plan.strategy).toBe('avalanche');
        expect(plan.items[0].id).toBe('high');
        expect(plan.items[0].isPriorityTarget).toBe(true);
    });

    it('calculates payoff months for priority target with extra payment', () => {
        // debtTotal = 400, minimumPayment = 25, extraPayment = 200 → recommendedPayment = 225
        // interestRate = 19.99 → monthlyInterest = 400 * 0.1999 / 12 ≈ 6.663
        // netPayment = 225 - 6.663 ≈ 218.34 → payoffMonths = ceil(400 / 218.34) = 2
        const plan = buildDebtSnowballPlan([
            buildBill({ id: 'b', debtTotal: 400, interestRate: 19.99, amountDue: 25 })
        ], 200);

        expect(plan.items[0].payoffMonths).toBeGreaterThan(0);
        expect(typeof plan.items[0].payoffMonths).toBe('number');
    });

    it('returns null payoffMonths when payment cannot cover monthly interest', () => {
        // interest-only scenario: amountDue = 1, massive debt → payment always < interest
        const plan = buildDebtSnowballPlan([
            buildBill({ debtTotal: 1_000_000, interestRate: 99, amountDue: 1 })
        ], 0);

        expect(plan.items[0].payoffMonths).toBeNull();
    });
});
