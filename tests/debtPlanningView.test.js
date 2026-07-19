import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeDebtSnowballView, renderDebtSnowballView } from '../src/views/debtSnowballView.js';

const settings = { strategy: 'snowball', extraPayment: 100 };
const financialPlan = {
    debts: [], accounts: [], incomeSources: [], cashFlowScenarios: [],
    settings: { ...settings, forecastMonths: 6, activeScenarioId: null, activeView: 'debt' }
};
const element = (selector) => /** @type {HTMLElement} */ (document.querySelector(selector));
const input = (selector) => /** @type {HTMLInputElement} */ (document.querySelector(selector));

describe('debt planning view', () => {
    beforeEach(() => {
        document.body.innerHTML = '<main id="mainContent"></main>';
        initializeDebtSnowballView();
    });

    it('renders the compact empty state and opens the inline debt form', () => {
        renderDebtSnowballView({ debts: [], financialPlan }, {});
        expect(document.querySelector('#debtSnowballView h2')?.textContent).toBe('Financial plan');
        expect(document.querySelector('#planningDebtForm')?.classList.contains('hidden')).toBe(true);
        element('#addPlanningDebtBtn').click();
        expect(document.querySelector('#planningDebtForm')?.classList.contains('hidden')).toBe(false);
    });

    it('submits a manual planning debt without opening a modal', () => {
        const onSaveDebt = vi.fn();
        renderDebtSnowballView({ debts: [], financialPlan }, { onSaveDebt });
        element('#addPlanningDebtBtn').click();
        input('#planningDebtName').value = 'Visa';
        input('#planningDebtBalance').value = '2400';
        input('#planningDebtApr').value = '19.99';
        input('#planningDebtMinimum').value = '75';
        input('#planningDebtDueDay').value = '12';
        document.querySelector('#planningDebtForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(onSaveDebt).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Visa', balance: 2400, apr: 19.99, minimumPayment: 75, dueDay: 12
        }));
    });

    it('routes linked debt edits back to the original bill', () => {
        const onEditBill = vi.fn();
        renderDebtSnowballView({
            debts: [{
                id: 'bill-debt-1', name: 'Auto loan', balance: 12000, apr: 6,
                minimumPayment: 350, dueDay: 8, linkedBillId: 'bill-1', source: 'bill', isActive: true
            }],
            financialPlan
        }, { onEditBill });
        element('.debt-edit-btn').click();
        expect(onEditBill).toHaveBeenCalledWith('bill-1');
    });

    it('switches to the compact cash flow tab through planning settings', () => {
        const onSaveSettings = vi.fn();
        renderDebtSnowballView({ debts: [], financialPlan }, { onSaveSettings });
        element('#cashFlowTab').click();
        expect(onSaveSettings).toHaveBeenCalledWith({ activeView: 'cashflow' });
    });
});
