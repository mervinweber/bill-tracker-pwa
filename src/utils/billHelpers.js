import { createLocalDate } from './dates.js';
import { paycheckManager } from './paycheckManager.js';

/**
 * Bill Helper Utilities
 * 
 * Utility functions for bill calculations and recurring bill instance generation.
 * Handles recurring bill expansion, payment calculations, and balance tracking.
 * 
 * @module billHelpers
 */

/**
 * Calculate the next due date based on recurrence pattern
 * 
 * @function calculateNextDueDate
 * @param {Date} currentDate - Starting date for calculation
 * @param {string} recurrence - Recurrence frequency
 *   Options: 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly', 'One-time'
 * 
 * @returns {Date|null} Next due date as Date object.
 *   Returns null for 'One-time' or invalid patterns.
 * 
 * @description Calculates next occurrence by advancing date:
 *   - Weekly: 7 days forward
 *   - Bi-weekly: 14 days forward
 *   - Monthly: 1 month forward
 *   - Yearly: 1 year forward
 *   - One-time: null (no recurrence)
 * 
 * @example
 * const nextDue = calculateNextDueDate(new Date(2024, 11, 15), 'Monthly');
 * // Returns: 2025-01-15
 */
export const calculateNextDueDate = (currentDate, recurrence) => {
    const nextDate = new Date(currentDate);

    switch (recurrence) {
        case 'Weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'Bi-weekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'Monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'Yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default: // 'One-time'
            return null;
    }

    return nextDate;
};

/**
 * Generate bill instances for recurring bills across pay periods
 * 
 * @function generateRecurringBillInstances
 * @param {Object} baseBill - Base recurring bill template
 *   Must have: name, category, recurrence, dueDate, balance/amountDue
 * @param {Array<Object>} bills - Array of existing bills (to check for duplicates)
 * @param {Array<Date>} payCheckDates - Array of paycheck date boundaries
 *   Used to determine pay periods for instance generation
 * 
 * @returns {Array<Object>} Array of generated bill instances for each applicable pay period.
 *   Returns empty array for one-time bills.
 * 
 * @description Expands recurring bill templates into individual bill instances.
 *   For each pay period:
 *   1. Calculates due dates based on recurrence pattern
 *   2. Checks for duplicate instances (skips if already exists)
 *   3. Accumulates balance from previous unpaid instances
 *   4. Generates new bill with unique ID, current due date, empty payment history
 *   
 *   Limits generation to years <= 2027 to prevent infinite loops.
 * 
 * @example
 * const baseBill = {
 *   name: "Electric Bill",
 *   category: "Utilities",
 *   recurrence: "Monthly",
 *   dueDate: "2024-12-15",
 *   amountDue: 125.00
 * };
 * const generated = generateRecurringBillInstances(
 *   baseBill,
 *   existingBills,
 *   [new Date(2024, 0, 1), new Date(2024, 0, 15), ...]
 * );
 * // Returns array of 12 monthly instances across pay periods
 */
export const generateRecurringBillInstances = (baseBill, bills, payCheckDates) => {
    // Only generate for recurring bills
    if (baseBill.recurrence === 'One-time') {
        return [];
    }

    const generatedBills = [];
    let currentDueDate = new Date(baseBill.dueDate);

    // Generate bills for each pay period
    for (let i = 0; i < payCheckDates.length; i++) {
        const payPeriodStart = payCheckDates[i];
        const payPeriodEnd = i < payCheckDates.length - 1 ?
            payCheckDates[i + 1] :
            new Date(payCheckDates[i].getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days after last

        // Check if we need to generate bills for this period
        while (currentDueDate < payPeriodEnd) {
            // Only add if it hasn't been added yet and falls within pay period
            if (currentDueDate >= payPeriodStart && currentDueDate < payPeriodEnd) {
                const dueDateStr = currentDueDate.toISOString().split('T')[0];
                const existingBill = bills.find(b =>
                    b.name === baseBill.name &&
                    b.category === baseBill.category &&
                    b.dueDate === dueDateStr &&
                    b.recurrence === baseBill.recurrence
                );

                if (!existingBill) {
                    // Check for unpaid previous instance to accumulate balance
                    const previousBill = bills.find(b =>
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
                        paymentHistory: [] // Initialize empty history
                    };
                    generatedBills.push(newBill);
                }
            }

            // Calculate next occurrence
            const nextDate = calculateNextDueDate(currentDueDate, baseBill.recurrence);
            if (!nextDate || nextDate.getFullYear() > 2027) break; // Safety limit
            currentDueDate = nextDate;
        }
    }

    return generatedBills;
};

/**
 * Calculate total amount paid on a bill
 * 
 * @function getTotalPaid
 * @param {Object} bill - Bill object with optional paymentHistory
 * @param {Array<Object>} [bill.paymentHistory] - Array of payment records
 *   Each payment record should have 'amount' property
 * 
 * @returns {number} Total amount paid across all payment history entries.
 *   Returns 0 if no payment history exists.
 * 
 * @description Sums all amounts in paymentHistory array.
 *   Handles missing or undefined paymentHistory gracefully.
 * 
 * @example
 * const bill = {
 *   name: "Electric Bill",
 *   paymentHistory: [
 *     { amount: 50, date: "2024-12-01" },
 *     { amount: 75, date: "2024-12-15" }
 *   ]
 * };
 * const paid = getTotalPaid(bill);
 * console.log(paid); // 125
 */
export const getTotalPaid = (bill) => {
    if (!bill.paymentHistory) return 0;
    return bill.paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
};

/**
 * Calculate remaining balance on a bill after payments
 * 
 * @function getRemainingBalance
 * @param {Object} bill - Bill object with balance/amountDue and paymentHistory
 * @param {number} bill.balance - Current balance (primary, checked first)
 * @param {number} bill.amountDue - Amount originally due (fallback if balance missing)
 * @param {Array<Object>} [bill.paymentHistory] - Payment history for deduction
 * 
 * @returns {number} Remaining balance after deducting payments.
 *   Always >= 0 (never returns negative balance).
 *   Returns 0 if bill is fully paid.
 * 
 * @description Calculates remaining balance by:
 *   1. Using bill.balance or bill.amountDue as total due
 *   2. Subtracting total paid from paymentHistory
 *   3. Ensuring result never goes below 0
 * 
 * @example
 * const bill = {
 *   amountDue: 125.00,
 *   balance: 125.00,
 *   paymentHistory: [
 *     { amount: 50 },
 *     { amount: 25 }
 *   ]
 * };
 * const remaining = getRemainingBalance(bill);
 * console.log(remaining); // 50
 */
export const getRemainingBalance = (bill) => {
    const totalDue = bill.balance || bill.amountDue || 0;
    const totalPaid = getTotalPaid(bill);
    return Math.max(0, totalDue - totalPaid);
};

/**
 * Filters bills based on a specific pay period, category, and carry-forward rules.
 * 
 * @param {Array<Object>} bills - All bills
 * @param {string} viewMode - 'all' or 'filtered'
 * @param {number|null} selectedPaycheck - Index of selected paycheck
 * @param {string|null} selectedCategory - Selected category
 * @param {string} paymentFilter - 'all'|'paid'|'unpaid'
 * @param {Array<Date>} payCheckDates - Array of paycheck dates
 * @returns {Array<Object>} Filtered and sorted bills
 */
export const filterBillsByPeriod = (bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates, showCarriedForward = true) => {
    if (viewMode === 'all') {
        let filtered = [...bills];
        if (paymentFilter === 'unpaid') filtered = filtered.filter(b => !b.isPaid);
        if (paymentFilter === 'paid') filtered = filtered.filter(b => b.isPaid);
        return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    if (selectedPaycheck === null || selectedCategory === null || !payCheckDates || payCheckDates.length === 0) {
        return [];
    }

    const currentPaycheckDate = payCheckDates[selectedPaycheck];
    const frequency = paycheckManager.paymentSettings.frequency;
    const days = frequency === 'weekly' ? 7 : frequency === 'bi-weekly' ? 14 : 30;

    const nextPaycheckDate = selectedPaycheck < payCheckDates.length - 1
        ? payCheckDates[selectedPaycheck + 1]
        : new Date(currentPaycheckDate.getTime() + (days * 24 * 60 * 60 * 1000));

    // Carry Forward Logic Bounds
    const activeIndex = paycheckManager.getAutoSelectedPayPeriodIndex();
    const planningBoundaryIndex = activeIndex + 1;
    const planningBoundaryDate = payCheckDates[planningBoundaryIndex] || new Date(9999, 0, 1);

    let filtered = bills.filter(bill => {
        const billDate = createLocalDate(bill.dueDate);
        const isMatch = bill.category === selectedCategory;
        if (!isMatch) return false;

        const isInPeriod = billDate >= currentPaycheckDate && billDate < nextPaycheckDate;

        const isOverdueAndUnpaid = showCarriedForward &&
            !bill.isPaid &&
            billDate < currentPaycheckDate &&
            currentPaycheckDate <= planningBoundaryDate;

        return isInPeriod || isOverdueAndUnpaid;
    });

    if (paymentFilter === 'unpaid') {
        filtered = filtered.filter(bill => !bill.isPaid);
    } else if (paymentFilter === 'paid') {
        filtered = filtered.filter(bill => bill.isPaid);
    }

    return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
};