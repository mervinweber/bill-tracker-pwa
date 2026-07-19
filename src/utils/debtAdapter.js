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

export function debtFromBill(bill, existingDebt = null) {
    const now = new Date().toISOString();
    return {
        id: existingDebt?.id || `bill-debt-${bill.id}`,
        name: String(bill.name || existingDebt?.name || 'Untitled debt'),
        balance: Math.max(0, toNumber(bill.debtTotal ?? existingDebt?.balance)),
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

export function mergeDebtsWithBills(debts = [], bills = []) {
    const billById = new Map((bills || []).map((bill) => [String(bill.id), bill]));
    const now = Date.now();
    const preferredBills = new Map();
    for (const bill of bills || []) {
        if (!bill?.id || !isDebtSnowballCandidate(bill)) continue;
        const key = getBillSeriesKey(bill);
        const current = preferredBills.get(key);
        const rank = (candidate) => {
            const due = Date.parse(`${candidate.dueDate || ''}T00:00:00Z`);
            return [candidate.archived ? 1 : 0, due >= now ? 0 : 1, Math.abs(due - now) || Number.MAX_SAFE_INTEGER];
        };
        const nextRank = rank(bill);
        const currentRank = current ? rank(current) : null;
        if (!current || nextRank.some((value, index) => value < currentRank[index] && nextRank.slice(0, index).every((prior, priorIndex) => prior === currentRank[priorIndex]))) {
            preferredBills.set(key, bill);
        }
    }

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

    for (const bill of preferredBills.values()) {
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
