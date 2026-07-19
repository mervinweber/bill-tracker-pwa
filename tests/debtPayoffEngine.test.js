import { describe, expect, it } from 'vitest';
import { buildDebtPayoffPlan, compareDebtStrategies } from '../src/utils/debtPayoffEngine.js';

const debt = (overrides = {}) => ({
    id: 'debt-1',
    name: 'Card',
    balance: 1000,
    apr: 18,
    minimumPayment: 50,
    isActive: true,
    ...overrides
});

describe('debt payoff engine', () => {
    it('does not invent a payoff date when no debts are tracked', () => {
        const plan = buildDebtPayoffPlan([], 0, 'snowball', { startDate: '2026-08-01' });
        expect(plan.payoffMonths).toBeNull();
        expect(plan.debtFreeDate).toBeNull();
    });

    it('pays zero-interest debts with minimum rollover', () => {
        const plan = buildDebtPayoffPlan([
            debt({ id: 'small', balance: 100, apr: 0 }),
            debt({ id: 'large', balance: 200, apr: 0 })
        ], 50, 'snowball', { startDate: '2026-08-01' });

        expect(plan.monthlyBudget).toBe(150);
        expect(plan.payoffMonths).toBe(2);
        expect(plan.totalInterest).toBe(0);
        expect(plan.items[0].id).toBe('small');
        expect(plan.items[0].recommendedPayment).toBe(100);
    });

    it('accrues monthly APR and returns payoff dates and total interest', () => {
        const plan = buildDebtPayoffPlan([debt()], 100, 'snowball', { startDate: '2026-08-15' });
        expect(plan.totalInterest).toBeGreaterThan(0);
        expect(plan.totalPaid).toBeCloseTo(plan.totalDebt + plan.totalInterest, 1);
        expect(plan.payoffMonths).toBeGreaterThan(0);
        expect(plan.debtFreeDate).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it('returns an incomplete projection when payments do not cover interest', () => {
        const plan = buildDebtPayoffPlan([
            debt({ balance: 10000, apr: 120, minimumPayment: 1 })
        ], 0, 'snowball', { maxMonths: 24 });
        expect(plan.payoffMonths).toBeNull();
        expect(plan.items[0].payoffDate).toBeNull();
    });

    it('prioritizes highest APR for avalanche and compares strategy cost', () => {
        const debts = [
            debt({ id: 'small-low', name: 'Small', balance: 500, apr: 5, minimumPayment: 30 }),
            debt({ id: 'large-high', name: 'High APR', balance: 4000, apr: 27, minimumPayment: 120 })
        ];
        const comparison = compareDebtStrategies(debts, 150, { startDate: '2026-08-01' });
        expect(comparison.avalanche.items[0].id).toBe('large-high');
        expect(comparison.snowball.items[0].id).toBe('small-low');
        expect(comparison.avalanche.totalInterest).toBeLessThanOrEqual(comparison.snowball.totalInterest);
        expect(comparison.interestSavingsWithAvalanche).toBeGreaterThanOrEqual(0);
    });
});
