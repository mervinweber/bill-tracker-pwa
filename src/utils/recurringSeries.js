import { calculateNextDueDate, createLocalDate, formatLocalDate } from './dates.js';

const CASCADE_FIELDS = [
    'name',
    'category',
    'payee',
    'accountName',
    'amountDue',
    'recurrence',
    'debtTotal',
    'interestRate',
    'includeInDebtSnowball',
    'reminderEnabled',
    'autopayEnabled',
    'notes',
    'website',
    'split'
];

function hasPaymentActivity(bill) {
    return Boolean(
        bill.isPaid ||
        bill.lastPaymentDate ||
        (Array.isArray(bill.paymentHistory) && bill.paymentHistory.length > 0)
    );
}

function isLegacySeriesMatch(candidate, original) {
    return candidate.name === original.name &&
        candidate.category === original.category &&
        candidate.recurrence === original.recurrence;
}

function isSeriesMatch(candidate, original) {
    if (original.seriesId) {
        return candidate.seriesId === original.seriesId;
    }

    return isLegacySeriesMatch(candidate, original);
}

/**
 * Apply an edit to the selected recurring occurrence and its unpaid future occurrences.
 * Paid history and earlier occurrences remain unchanged.
 *
 * @param {Object[]} bills
 * @param {Object} originalBill
 * @param {Object} updatedBill
 * @returns {Object[]}
 */
export function cascadeRecurringBillEdit(bills, originalBill, updatedBill) {
    if (!originalBill || originalBill.recurrence === 'One-time' || updatedBill.recurrence === 'One-time') {
        return bills.map((bill) => bill.id === updatedBill.id ? updatedBill : bill);
    }

    const originalDueDate = createLocalDate(originalBill.dueDate);
    const updatedDueDate = createLocalDate(updatedBill.dueDate);
    const originalDueTime = originalDueDate.getTime();
    const shouldRebuildDates =
        originalBill.dueDate !== updatedBill.dueDate ||
        originalBill.recurrence !== updatedBill.recurrence;
    const seriesId = originalBill.seriesId || updatedBill.seriesId || originalBill.id;

    const futureOccurrences = bills
        .filter((bill) => {
            if (bill.id === originalBill.id || !isSeriesMatch(bill, originalBill)) {
                return false;
            }

            const dueTime = createLocalDate(bill.dueDate).getTime();
            return Number.isFinite(dueTime) && dueTime > originalDueTime;
        })
        .sort((a, b) => createLocalDate(a.dueDate).getTime() - createLocalDate(b.dueDate).getTime());

    const replacements = new Map();
    replacements.set(originalBill.id, { ...updatedBill, seriesId });

    let scheduleCursor = updatedDueDate;
    futureOccurrences.forEach((occurrence) => {
        let nextDueDate = null;
        if (shouldRebuildDates) {
            nextDueDate = calculateNextDueDate(scheduleCursor, updatedBill.recurrence);
            if (nextDueDate) {
                scheduleCursor = nextDueDate;
            }
        }

        if (hasPaymentActivity(occurrence)) {
            return;
        }

        const replacement = { ...occurrence, seriesId };
        CASCADE_FIELDS.forEach((field) => {
            replacement[field] = updatedBill[field];
        });

        if (nextDueDate) {
            replacement.dueDate = formatLocalDate(nextDueDate);
        }

        const previousAmount = Number.parseFloat(occurrence.amountDue) || 0;
        const previousBalance = Number.parseFloat(occurrence.balance);
        if (!Number.isFinite(previousBalance) || Math.abs(previousBalance - previousAmount) < 0.01) {
            replacement.balance = Number.parseFloat(updatedBill.amountDue) || 0;
        }

        replacements.set(occurrence.id, replacement);
    });

    return bills.map((bill) => replacements.get(bill.id) || bill);
}
