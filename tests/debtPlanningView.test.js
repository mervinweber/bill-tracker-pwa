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

    it('selects and imports existing bills from the inline picker', () => {
        const onImportBills = vi.fn();
        const bills = [
            { id: 'bill-1', name: 'Visa', amountDue: 75, debtTotal: 2400, interestRate: 19.99, dueDate: '2026-08-12' },
            { id: 'bill-2', name: 'Medical', amountDue: 100, dueDate: '2026-08-20' }
        ];
        renderDebtSnowballView({ bills, debts: [], financialPlan }, { onImportBills });
        element('#openBillDebtImportBtn').click();
        expect(document.querySelector('#billDebtImportForm')?.classList.contains('hidden')).toBe(false);
        const checkboxes = document.querySelectorAll('input[name="billImport"]');
        /** @type {HTMLInputElement} */ (checkboxes[0]).checked = true;
        /** @type {HTMLInputElement} */ (checkboxes[1]).checked = true;
        document.querySelector('#billDebtImportForm')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(onImportBills).toHaveBeenCalledWith(['bill-2', 'bill-1']);
    });

    it('filters import choices and excludes bills already linked to debts', () => {
        const bills = [
            { id: 'bill-1', name: 'Visa', amountDue: 75, dueDate: '2026-08-12' },
            { id: 'bill-2', name: 'Medical', amountDue: 100, dueDate: '2026-08-20' }
        ];
        const debts = [{
            id: 'debt-1', name: 'Visa', balance: 75, apr: 0, minimumPayment: 75,
            dueDay: 12, linkedBillId: 'bill-1', source: 'bill', isActive: true
        }];
        renderDebtSnowballView({ bills, debts, financialPlan }, {});
        expect(document.querySelectorAll('.bill-import-row')).toHaveLength(1);
        input('#billDebtImportSearch').value = 'nothing';
        input('#billDebtImportSearch').dispatchEvent(new Event('input', { bubbles: true }));
        expect(document.querySelector('#billDebtImportEmpty')?.classList.contains('hidden')).toBe(false);
    });

    it('routes an empty import submission to validation', () => {
        const onImportBills = vi.fn();
        const bills = [{ id: 'bill-1', name: 'Visa', amountDue: 75, dueDate: '2026-08-12' }];
        renderDebtSnowballView({ bills, debts: [], financialPlan }, { onImportBills });
        document.querySelector('#billDebtImportForm')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(onImportBills).toHaveBeenCalledWith([]);
    });
});
