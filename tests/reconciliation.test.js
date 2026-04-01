import { describe, expect, it } from 'vitest';
import {
    getBillReconciliationIssues,
    getReconciliationReport,
    RECONCILIATION_ISSUES
} from '../src/utils/reconciliation.js';

/**
 * @param {Partial<import('../src/types/domainTypes.js').Bill & { creditBalance?: number }>} overrides
 * @returns {import('../src/types/domainTypes.js').Bill & { creditBalance?: number }}
 */
function buildBill(overrides = {}) {
    return {
        id: 'bill-1',
        name: 'Internet',
        category: 'Utilities',
        dueDate: '2026-04-01',
        amountDue: 100,
        balance: 100,
        isPaid: false,
        recurrence: 'Monthly',
        paymentHistory: [],
        ...overrides
    };
}

describe('reconciliation rule engine', () => {
    it('detects paid bill with remaining balance', () => {
        const issues = getBillReconciliationIssues(buildBill({
            isPaid: true,
            paymentHistory: [{ id: 'p1', date: '2026-04-01', amount: 10 }]
        }));
        expect(issues.some((issue) => issue.code === RECONCILIATION_ISSUES.PAID_WITH_BALANCE)).toBe(true);
    });

    it('detects unpaid bill with zero balance and no credit', () => {
        const issues = getBillReconciliationIssues(buildBill({ isPaid: false, balance: 0, amountDue: 100 }));
        expect(issues.some((issue) => issue.code === RECONCILIATION_ISSUES.UNPAID_WITH_ZERO_BALANCE)).toBe(true);
    });

    it('does not flag unpaid zero-balance bill if credit exists', () => {
        const issues = getBillReconciliationIssues(buildBill({ isPaid: false, balance: 0, creditBalance: 20 }));
        expect(issues.some((issue) => issue.code === RECONCILIATION_ISSUES.UNPAID_WITH_ZERO_BALANCE)).toBe(false);
    });

    it('detects negative values', () => {
        const issues = getBillReconciliationIssues(buildBill({ amountDue: -5 }));
        expect(issues.some((issue) => issue.code === RECONCILIATION_ISSUES.INVALID_NEGATIVE_VALUE)).toBe(true);
    });

    it('builds aggregate reconciliation report', () => {
        const report = getReconciliationReport([
            buildBill({ id: 'a', isPaid: true, paymentHistory: [{ id: 'p2', date: '2026-04-01', amount: 10 }] }),
            buildBill({ id: 'b', isPaid: false, balance: 100 }),
            buildBill({ id: 'c', amountDue: -2 })
        ]);

        expect(report.totalBills).toBe(3);
        expect(report.billsWithIssues).toBe(2);
        expect(report.issueCount).toBe(2);
        expect(report.items.map((item) => item.billId)).toEqual(['a', 'c']);
    });
});
