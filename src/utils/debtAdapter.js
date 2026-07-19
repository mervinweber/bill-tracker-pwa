import { isDebtSnowballCandidate } from './debtSnowball.js';

const toNumber = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getDueDay = (dueDate) => {
    if (typeof dueDate !== 'string') return 1;
    const match = dueDate.match(/^\d{4}-\d{2}-(\d{2})$/);
    return match ? Math.min(31, Math.max(1, Number.parseInt(match[1], 10))) : 1;
};

export const getBillSeriesKey = (bill) => {
    if (bill?.recurrence && bill.recurrence !== 'One-time') {
        return `${bill.name || ''}|${bill.category || ''}|${bill.recurrence}`;
    }
    return String(bill?.id || '');
};

/**
 * @param {Array<Record<string, any>>} bills
 * @param {(bill: Record<string, any>) => boolean} predicate
 */
const getPreferredBillsBySeries = (bills = [], predicate = (_bill) => true) => {
    const now = Date.now();
    const preferredBills = new Map();
    const rank = (candidate) => {
        const due = Date.parse(`${candidate.dueDate || ''}T00:00:00Z`);
        const distance = Number.isFinite(due) ? Math.abs(due - now) : Number.MAX_SAFE_INTEGER;
        return [candidate.archived ? 1 : 0, due >= now ? 0 : 1, distance];
    };
    const ranksBefore = (left, right) => left.some((value, index) => (
        value < right[index] && left.slice(0, index).every((prior, priorIndex) => prior === right[priorIndex])
    ));

    for (const bill of bills || []) {
        if (!bill?.id || !predicate(bill)) continue;
        const key = getBillSeriesKey(bill);
        const current = preferredBills.get(key);
        if (!current || ranksBefore(rank(bill), rank(current))) preferredBills.set(key, bill);
    }
    return preferredBills;
};

export function debtFromBill(bill, existingDebt = null) {
    const now = new Date().toISOString();
    const billDebtBalance = toNumber(bill.debtTotal);
    const billBalance = toNumber(bill.balance);
    const balance = billDebtBalance > 0
        ? billDebtBalance
        : billBalance > 0
            ? billBalance
            : isDebtSnowballCandidate(bill)
                ? 0
                : toNumber(existingDebt?.balance);
    return {
        id: existingDebt?.id || `bill-debt-${bill.id}`,
        name: String(bill.name || existingDebt?.name || 'Untitled debt'),
        balance: Math.max(0, balance),
        apr: Math.max(0, toNumber(bill.interestRate ?? existingDebt?.apr)),
        minimumPayment: Math.max(0, toNumber(bill.amountDue ?? existingDebt?.minimumPayment)),
        dueDay: getDueDay(bill.dueDate) || existingDebt?.dueDay || 1,
        linkedBillId: String(bill.id),
        source: 'bill',
        isActive: !bill.archived,
        createdAt: existingDebt?.createdAt || now,
        updatedAt: now
    };
}

export function debtFromImportedBill(bill) {
    const balance = toNumber(bill.debtTotal) || toNumber(bill.balance) || toNumber(bill.amountDue);
    return debtFromBill({ ...bill, debtTotal: balance });
}

export function getDebtImportCandidates(bills = [], debts = []) {
    const billById = new Map((bills || []).map((bill) => [String(bill.id), bill]));
    const representedSeries = new Set((debts || []).flatMap((debt) => {
        if (debt.source !== 'bill' || !debt.linkedBillId) return [];
        const linkedBill = billById.get(String(debt.linkedBillId));
        return linkedBill ? [getBillSeriesKey(linkedBill)] : [];
    }));

    return [...getPreferredBillsBySeries(bills, (bill) => !bill.archived).entries()]
        .filter(([seriesKey]) => !representedSeries.has(seriesKey))
        .map(([, bill]) => bill)
        .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
}

export function mergeDebtsWithBills(debts = [], bills = []) {
    const billById = new Map((bills || []).map((bill) => [String(bill.id), bill]));
    const preferredBills = getPreferredBillsBySeries(bills, (bill) => !bill.archived);
    const automaticDebtBills = getPreferredBillsBySeries(bills, isDebtSnowballCandidate);

    const representedSeries = new Set();
    const merged = (debts || []).filter((debt) => {
        if (debt.source !== 'bill' || !debt.linkedBillId) return true;
        const linkedBill = billById.get(String(debt.linkedBillId));
        if (!linkedBill) return true;
        const key = getBillSeriesKey(linkedBill);
        if (representedSeries.has(key)) return false;
        representedSeries.add(key);
        return true;
    }).map((debt) => {
        if (debt.source !== 'bill' || !debt.linkedBillId) return debt;
        const linkedBill = billById.get(String(debt.linkedBillId));
        const preferredBill = linkedBill ? preferredBills.get(getBillSeriesKey(linkedBill)) : null;
        return preferredBill ? debtFromBill(preferredBill, debt) : debt;
    });

    for (const bill of automaticDebtBills.values()) {
        const seriesKey = getBillSeriesKey(bill);
        if (representedSeries.has(seriesKey)) continue;
        merged.push(debtFromBill(bill));
        representedSeries.add(seriesKey);
    }
    return merged;
}

export function migrateLegacyBillDebts(plan, bills) {
    const currentDebts = Array.isArray(plan?.debts) ? plan.debts : [];
    const debts = mergeDebtsWithBills(currentDebts, bills);
    const addedCount = Math.max(0, debts.length - currentDebts.length);
    const fingerprint = (items) => JSON.stringify(items.map((debt) => ({
        id: debt.id,
        name: debt.name,
        balance: debt.balance,
        apr: debt.apr,
        minimumPayment: debt.minimumPayment,
        dueDay: debt.dueDay,
        linkedBillId: debt.linkedBillId,
        source: debt.source,
        isActive: debt.isActive
    })));
    return {
        plan: { ...plan, debts },
        addedCount,
        changed: fingerprint(debts) !== fingerprint(currentDebts)
    };
}
