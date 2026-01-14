import { createLocalDate, formatLocalDate, calculateNextDueDate } from '../utils/dates.js';
import { billStore } from '../store/BillStore.js';

/**
 * Finds the closest paycheck date on or after the target date.
 */
export function findClosestPaycheckDate(targetDate, payCheckDates) {
    let closest = null;
    let minDifference = Infinity;

    for (const payDate of payCheckDates) {
        const payDateClone = new Date(payDate);
        payDateClone.setHours(0, 0, 0, 0);

        // Find paychecks on or after targetDate
        if (payDateClone >= targetDate) {
            const difference = payDateClone - targetDate;
            if (difference < minDifference) {
                minDifference = difference;
                closest = payDateClone;
            }
        }
    }

    return closest;
}

/**
 * Updates bill dates based on their recurrence if they are past due.
 */
export function updateBillDatesBasedOnRecurrence(payCheckDates) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentBills = billStore.getAll();
    const updatedBills = currentBills.map(bill => {
        // Skip if already paid
        if (bill.isPaid) return bill;

        const billDueDate = createLocalDate(bill.dueDate);
        billDueDate.setHours(0, 0, 0, 0);

        let modifiedBill = { ...bill }; // Clone

        // If bill is past due and unpaid, move it to next applicable pay date
        if (billDueDate < today && bill.recurrence !== 'One-time') {
            let nextDueDate = new Date(billDueDate);

            // Keep moving forward until we find a date that's today or in the future
            while (nextDueDate < today) {
                nextDueDate = calculateNextDueDate(nextDueDate, bill.recurrence);
            }

            // Find closest paycheck date on or after nextDueDate
            const closestPaycheck = findClosestPaycheckDate(nextDueDate, payCheckDates);
            if (closestPaycheck) {
                modifiedBill.dueDate = formatLocalDate(closestPaycheck);
            }
        }
        // If bill is today or in the future but past the last paycheck, move it to next cycle
        else if (billDueDate > today && bill.recurrence !== 'One-time') {
            const lastPaycheck = payCheckDates[payCheckDates.length - 1];
            if (billDueDate > lastPaycheck) {
                let nextDueDate = calculateNextDueDate(billDueDate, bill.recurrence);
                const closestPaycheck = findClosestPaycheckDate(nextDueDate, payCheckDates);
                if (closestPaycheck) {
                    modifiedBill.dueDate = formatLocalDate(closestPaycheck);
                }
            }
        }

        return modifiedBill;
    });

    billStore.setBills(updatedBills);
}

/**
 * Generates instances of a recurring bill for all current pay periods.
 */
export function generateRecurringBillInstances(baseBill, payCheckDates) {
    if (baseBill.recurrence === 'One-time') return [];
    const generatedBills = [];
    let currentDueDate = createLocalDate(baseBill.dueDate);

    for (let i = 0; i < payCheckDates.length; i++) {
        const payPeriodStart = payCheckDates[i];
        const payPeriodEnd = i < payCheckDates.length - 1 ?
            payCheckDates[i + 1] :
            new Date(payCheckDates[i].getTime() + (14 * 24 * 60 * 60 * 1000));

        while (currentDueDate < payPeriodEnd) {
            if (currentDueDate >= payPeriodStart && currentDueDate < payPeriodEnd) {
                const dueDateStr = formatLocalDate(currentDueDate);
                const currentBills = billStore.getAll();
                const existingBill = currentBills.find(b =>
                    b.name === baseBill.name &&
                    b.category === baseBill.category &&
                    b.dueDate === dueDateStr &&
                    b.recurrence === baseBill.recurrence
                );

                if (!existingBill) {
                    const previousBill = currentBills.find(b =>
                        b.name === baseBill.name &&
                        b.category === baseBill.category &&
                        !b.isPaid &&
                        new Date(b.dueDate) < currentDueDate
                    );

                    const accumulatedBalance = previousBill ?
                        (previousBill.balance || previousBill.amountDue || 0) :
                        (baseBill.balance || baseBill.amountDue || 0);

                    const newBill = {
                        ...baseBill,
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        dueDate: dueDateStr,
                        isPaid: false,
                        lastPaymentDate: null,
                        balance: accumulatedBalance,
                        paymentHistory: []
                    };
                    generatedBills.push(newBill);
                }
            }
            const nextDate = calculateNextDueDate(currentDueDate, baseBill.recurrence);
            if (!nextDate || nextDate.getFullYear() > 2027) break;
            currentDueDate = nextDate;
        }
    }
    return generatedBills;
}

/**
 * Regenerates all instances of recurring bills.
 */
export function regenerateAllRecurringBills(payCheckDates) {
    if (!confirm('This will regenerate all recurring bill instances. Continue?')) return;
    const currentBills = billStore.getAll();
    const recurringBills = currentBills.filter(b => b.recurrence !== 'One-time');
    const uniqueBills = [];
    const seen = new Set();

    for (const bill of recurringBills) {
        const key = `${bill.name}-${bill.category}-${bill.recurrence}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueBills.push(bill);
        }
    }

    const today = new Date();
    // Filter logic: keep One-time, paid, OR past due
    let newBills = currentBills.filter(b => b.recurrence === 'One-time' || b.isPaid || new Date(b.dueDate) <= today);

    for (const template of uniqueBills) {
        const generatedInstances = generateRecurringBillInstances(template, payCheckDates);
        if (generatedInstances && generatedInstances.length > 0) newBills.push(...generatedInstances);
    }

    billStore.setBills(newBills);
    alert('Recurring bills regenerated successfully!');
}

/**
 * Saves a bill (add or update) and handles recurring logic.
 */
export function saveBill(billData, payCheckDates) {
    const currentBills = billStore.getAll();
    const existingBill = billData.id ? currentBills.find(b => b.id === billData.id) : null;

    const bill = {
        ...billData,
        id: billData.id || Date.now().toString(),
        isPaid: existingBill ? existingBill.isPaid || false : false,
        lastPaymentDate: existingBill ? existingBill.lastPaymentDate || null : null,
        paymentHistory: existingBill ? existingBill.paymentHistory || [] : []
    };

    if (existingBill) {
        billStore.update(bill);
    } else {
        billStore.add(bill);
        // Generate future instances for new recurring bills
        if (bill.recurrence !== 'One-time') {
            const instances = generateRecurringBillInstances(bill, payCheckDates);
            if (instances && instances.length > 0) {
                instances.forEach(instance => billStore.add(instance));
            }
        }
    }
    return bill;
}

/**
 * Deletes a bill by its ID.
 */
export function deleteBill(billId) {
    if (confirm('Are you sure you want to delete this bill?')) {
        billStore.delete(billId);
        return true;
    }
    return false;
}

/**
 * Updates the balance of a bill.
 */
export function updateBillBalance(billId, newBalance) {
    const bill = billStore.getAll().find(b => b.id === billId);
    if (bill) {
        billStore.update({ ...bill, balance: newBalance });
    }
}

/**
 * Toggles the payment status and creates a payment history entry.
 */
export function togglePaymentStatus(billId, isPaid) {
    const bill = billStore.getAll().find(b => b.id === billId);
    if (bill) {
        const updated = { ...bill };
        updated.isPaid = isPaid;
        updated.lastPaymentDate = isPaid ? new Date().toISOString() : null;

        if (isPaid) {
            // Add to payment history if not already there for this pay cycle
            // (Simplification for Quick Pay)
            const paymentHistory = updated.paymentHistory || [];
            paymentHistory.push({
                id: 'qp_' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                amount: updated.amountDue || 0,
                method: 'Quick Pay',
                notes: 'Marked as paid'
            });
            updated.paymentHistory = paymentHistory;
            updated.balance = 0; // Fully paid
        }

        billStore.update(updated);
    }
}

/**
 * Calculates the total amount paid for a bill.
 */
export function getTotalPaid(bill) {
    if (!bill.paymentHistory) return 0;
    return bill.paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
}

/**
 * Calculates the remaining balance for a bill.
 */
export function getRemainingBalance(bill) {
    const totalDue = bill.balance || bill.amountDue || 0;
    const totalPaid = getTotalPaid(bill);
    return Math.max(0, totalDue - totalPaid);
}

/**
 * Records a payment for a bill.
 */
export function recordPayment(billId, paymentData) {
    const bill = billStore.getAll().find(b => b.id === billId);
    if (!bill) return;

    const updated = { ...bill };
    if (!updated.paymentHistory) updated.paymentHistory = [];

    const payment = {
        id: 'pmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        date: paymentData.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(paymentData.amount) || 0,
        method: paymentData.method || 'Cash',
        confirmationNumber: paymentData.confirmationNumber || '',
        notes: paymentData.notes || ''
    };

    updated.paymentHistory.push(payment);
    updated.lastPaymentDate = payment.date;

    const remaining = getRemainingBalance(updated);
    updated.balance = remaining;
    updated.isPaid = remaining <= 0;

    billStore.update(updated);
    return updated;
}

/**
 * Migrates legacy bills to the new payment history format.
 */
export function migrateBillsToPaymentHistory() {
    const currentBills = billStore.getAll();
    let changed = false;
    currentBills.forEach(bill => {
        if (!bill.paymentHistory) {
            bill.paymentHistory = [];
            if (bill.lastPaymentDate && bill.isPaid) {
                bill.paymentHistory.push({
                    id: 'legacy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    date: bill.lastPaymentDate,
                    amount: bill.amountDue || 0,
                    method: 'Quick Pay',
                    notes: 'Migrated from toggle'
                });
                changed = true;
            }
        }
    });
    if (changed) billStore.save();
}




