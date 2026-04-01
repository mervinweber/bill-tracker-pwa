import { getRemainingBalance } from './billHelpers.js';

export const RECONCILIATION_ISSUES = {
    PAID_WITH_BALANCE: 'PAID_WITH_BALANCE',
    UNPAID_WITH_ZERO_BALANCE: 'UNPAID_WITH_ZERO_BALANCE',
    INVALID_NEGATIVE_VALUE: 'INVALID_NEGATIVE_VALUE'
};

function parseMoney(value) {
    return Number.parseFloat(value) || 0;
}

/**
 * Returns reconciliation issues for a single bill.
 * @param {import('../types/domainTypes.js').Bill & { creditBalance?: number }} bill
 * @returns {Array<{code: string, message: string}>}
 */
export function getBillReconciliationIssues(bill) {
    const issues = [];

    if (!bill) {
        return issues;
    }

    const amountDue = parseMoney(bill.amountDue);
    const balance = parseMoney(bill.balance);
    const hasExplicitBalance = bill.balance !== undefined && bill.balance !== null;
    const creditBalance = Math.max(0, parseMoney(bill.creditBalance));
    const remaining = getRemainingBalance(bill);

    if (bill.isPaid && remaining > 0) {
        issues.push({
            code: RECONCILIATION_ISSUES.PAID_WITH_BALANCE,
            message: 'Bill is marked paid but still has remaining balance.'
        });
    }

    if (!bill.isPaid && amountDue > 0 && hasExplicitBalance && balance === 0 && creditBalance === 0) {
        issues.push({
            code: RECONCILIATION_ISSUES.UNPAID_WITH_ZERO_BALANCE,
            message: 'Bill is marked unpaid but has zero remaining balance and no credit.'
        });
    }

    if (amountDue < 0 || balance < 0 || parseMoney(bill.creditBalance) < 0) {
        issues.push({
            code: RECONCILIATION_ISSUES.INVALID_NEGATIVE_VALUE,
            message: 'Bill contains invalid negative monetary values.'
        });
    }

    return issues;
}

/**
 * Builds a reconciliation report for all bills.
 * @param {Array<import('../types/domainTypes.js').Bill & { creditBalance?: number }>} bills
 * @returns {{
 *   totalBills: number,
 *   billsWithIssues: number,
 *   issueCount: number,
 *   items: Array<{billId: string, billName: string, issues: Array<{code: string, message: string}>}>
 * }}
 */
export function getReconciliationReport(bills) {
    const items = (bills || [])
        .map((bill) => {
            const issues = getBillReconciliationIssues(bill);
            return {
                billId: bill.id,
                billName: bill.name,
                issues
            };
        })
        .filter((entry) => entry.issues.length > 0);

    const issueCount = items.reduce((count, entry) => count + entry.issues.length, 0);

    return {
        totalBills: (bills || []).length,
        billsWithIssues: items.length,
        issueCount,
        items
    };
}
