import { describe, expect, it } from 'vitest';
import { buildCashFlowForecast, toMonthlyIncome } from '../src/utils/cashFlowEngine.js';

describe('cash flow engine', () => {
    it('normalizes weekly and biweekly income to monthly amounts', () => {
        expect(toMonthlyIncome({ amount: 1000, frequency: 'weekly' })).toBeCloseTo(4333.33, 2);
        expect(toMonthlyIncome({ amount: 2000, frequency: 'biweekly' })).toBeCloseTo(4333.33, 2);
    });

    it('uses paycheck settings when no planning income sources exist', () => {
        const forecast = buildCashFlowForecast({
            paymentSettings: { amount: 2000, frequency: 'bi-weekly' },
            months: 1,
            startDate: new Date('2026-08-01T00:00:00Z')
        });
        expect(forecast.baseMonthlyIncome).toBeCloseTo(4333.33, 2);
    });

    it('combines dated bills, debt payments, and scenario changes', () => {
        const forecast = buildCashFlowForecast({
            bills: [{ id: 'rent', name: 'Rent', dueDate: '2026-08-01', amountDue: 1500, recurrence: 'Monthly' }],
            debts: [{ id: 'card', balance: 3000, minimumPayment: 100, isActive: true }],
            incomeSources: [{ id: 'pay', amount: 4000, frequency: 'monthly', isActive: true }],
            scenario: { monthlyIncomeChange: 250, monthlyExpenseChange: 100, extraDebtPayment: 50 },
            extraDebtPayment: 200,
            months: 1,
            startDate: new Date('2026-08-01T00:00:00Z')
        });
        expect(forecast.months[0]).toMatchObject({
            income: 4250,
            bills: 1500,
            debtPayments: 350,
            expenses: 1950,
            net: 2300
        });
    });

    it('does not count debt-tagged bills and debt minimums twice', () => {
        const forecast = buildCashFlowForecast({
            bills: [{
                id: 'card-bill', name: 'Card', dueDate: '2026-08-10', amountDue: 100,
                debtTotal: 3000, interestRate: 20, recurrence: 'Monthly'
            }],
            debts: [{ id: 'card', balance: 3000, minimumPayment: 100, isActive: true }],
            incomeSources: [{ id: 'pay', amount: 1000, frequency: 'monthly', isActive: true }],
            months: 1,
            startDate: new Date('2026-08-01T00:00:00Z')
        });
        expect(forecast.months[0].bills).toBe(0);
        expect(forecast.months[0].debtPayments).toBe(100);
    });

    it('flags a projected cash shortfall', () => {
        const forecast = buildCashFlowForecast({
            bills: [{ id: 'rent', name: 'Rent', dueDate: '2026-08-01', amountDue: 1500, recurrence: 'Monthly' }],
            incomeSources: [{ id: 'pay', amount: 1000, frequency: 'monthly', isActive: true }],
            months: 2,
            startDate: new Date('2026-08-01T00:00:00Z')
        });
        expect(forecast.hasShortfall).toBe(true);
        expect(forecast.lowestEndingCash).toBe(-1000);
    });
});
