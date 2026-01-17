/**
 * Paycheck Manager
 * 
 * Handles all paycheck-related operations including:
 * - Paycheck date generation based on payment frequency
 * - Recurring bill generation for upcoming paychecks
 * - Bill date updates and recalculation
 * - Payment settings management with validation
 * - Safe storage access with fallback defaults
 * 
 * Payment frequencies supported:
 * - Weekly: Every 7 days
 * - Bi-weekly: Every 14 days
 * - Semi-monthly: 15th and last day of month
 * - Monthly: Every 30 days
 * - Custom: User-specified number of days (1-365)
 * - Annual: Same day each year
 * 
 * @module paycheckManager
 * @requires dates
 * @requires BillStore
 * @requires errorHandling
 */

import { createLocalDate, formatLocalDate, calculateNextDueDate } from './dates.js';
import { billStore } from '../store/BillStore.js';
import { 
    safeGetFromStorage, 
    safeSetToStorage, 
    ValidationError,
    validateRequired 
} from './errorHandling.js';

/**
 * Paycheck Manager Class
 * 
 * Singleton class that manages paycheck dates and recurring bill generation.
 * Uses localStorage to persist payment settings.
 * 
 * @class PaycheckManager
 */
class PaycheckManager {
    /**
     * Initialize PaycheckManager and generate initial paycheck dates
     * 
     * @constructor
     * @description Loads payment settings from localStorage, validates them,
     *   and generates upcoming paycheck dates. Sets up default settings if none exist.
     */
    constructor() {
        this.payCheckDates = [];
        this.paymentSettings = this.loadSettings();
        this.generatePaycheckDates();
    }

    /**
     * Load payment settings from localStorage with validation
     * 
     * @private
     * @returns {Object} Payment settings object with properties: frequency, startDate, amount
     * @description Retrieves settings from localStorage and validates them.
     *   Returns default settings if:
     *   - Settings don't exist
     *   - Settings are invalid or corrupted
     *   - Storage is unavailable
     *   Logs warnings for debugging when fallback is used.
     */
    loadSettings() {
        try {
            const stored = safeGetFromStorage('paymentSettings');
            if (!stored) {
                console.warn('⚠️ No payment settings found. Using defaults.');
                return this.getDefaultSettings();
            }
            
            const validation = this.validateSettings(stored);
            if (!validation.isValid) {
                console.warn('⚠️ Invalid payment settings:', validation.errors);
                return this.getDefaultSettings();
            }
            
            return stored;
        } catch (error) {
            console.error('❌ Error loading payment settings:', error.message);
            return this.getDefaultSettings();
        }
    }

    /**
     * Validate settings object with detailed error reporting
     */
    validateSettings(settings) {
        const validation = validateRequired(settings, ['startDate', 'frequency', 'payPeriodsToShow']);
        
        if (!validation.isValid) {
            return validation;
        }

        // Allow custom frequency or predefined frequencies
        const validFrequencies = ['weekly', 'bi-weekly', 'monthly', 'custom'];
        if (!validFrequencies.includes(settings.frequency)) {
            validation.errors.push('Frequency must be weekly, bi-weekly, monthly, or custom');
            validation.isValid = false;
        }

        // If custom frequency, validate customDays
        if (settings.frequency === 'custom') {
            if (typeof settings.customDays !== 'number' || settings.customDays < 1 || settings.customDays > 365) {
                validation.errors.push('Custom days must be a number between 1 and 365');
                validation.isValid = false;
            }
        }

        if (typeof settings.payPeriodsToShow !== 'number' || settings.payPeriodsToShow <= 0) {
            validation.errors.push('Pay periods to show must be a positive number');
            validation.isValid = false;
        }

        return validation;
    }

    /**
     * Get default payment settings
     */
    getDefaultSettings() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startDate = new Date(today);
        const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
        startDate.setDate(startDate.getDate() + (daysUntilThursday === 0 ? 0 : daysUntilThursday));

        return {
            startDate: startDate.toISOString().split('T')[0],
            frequency: 'bi-weekly',
            payPeriodsToShow: 6
        };
    }

    /**
     * Generate paycheck dates based on settings with comprehensive error handling
     */
    generatePaycheckDates() {
        try {
            this.payCheckDates = [];
            const { startDate, frequency, payPeriodsToShow, customDays } = this.paymentSettings;

            // Validate inputs
            if (!startDate || !frequency || !payPeriodsToShow) {
                throw new ValidationError('Missing required paycheck settings', 'paymentSettings');
            }

            const parsedStartDate = createLocalDate(startDate);
            if (!parsedStartDate || isNaN(parsedStartDate.getTime())) {
                throw new ValidationError(`Invalid start date format`, 'startDate', startDate);
            }

            // Determine days between paychecks
            let daysBetweenPaychecks;
            if (frequency === 'custom') {
                daysBetweenPaychecks = customDays;
                if (!daysBetweenPaychecks || daysBetweenPaychecks < 1) {
                    throw new ValidationError('Custom frequency requires valid customDays value', 'customDays', customDays);
                }
            } else {
                daysBetweenPaychecks =
                    frequency === 'weekly' ? 7 : frequency === 'bi-weekly' ? 14 : 30;
            }

            for (let i = 0; i < payPeriodsToShow; i++) {
                const payDate = new Date(parsedStartDate);
                payDate.setDate(payDate.getDate() + i * daysBetweenPaychecks);
                this.payCheckDates.push(payDate);
            }

            return this.payCheckDates;
        } catch (error) {
            console.error('❌ Error generating paycheck dates:', error.message);
            throw new Error('Failed to generate paycheck dates: ' + error.message);
        }
    }

    /**
     * Get formatted paycheck labels
     */
    getPaycheckLabels() {
        return this.payCheckDates.map(d =>
            d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
    }

    /**
     * Update settings and regenerate dates
     */
    updateSettings(newSettings) {
        try {
            if (!this.validateSettings(newSettings)) {
                throw new Error('Invalid payment settings provided');
            }
            this.paymentSettings = newSettings;
            localStorage.setItem('paymentSettings', JSON.stringify(newSettings));
            this.generatePaycheckDates();
            return true;
        } catch (error) {
            console.error('Error updating payment settings:', error);
            throw error;
        }
    }

    /**
     * Find closest paycheck date on or after target date
     */
    findClosestPaycheckDate(targetDate) {
        let closest = null;
        let minDifference = Infinity;

        for (const payDate of this.payCheckDates) {
            const payDateClone = new Date(payDate);
            payDateClone.setHours(0, 0, 0, 0);

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
     * Snap bill date to closest paycheck if it falls outside paycheck range
     * If a bill's due date is beyond the last paycheck, move it to the last available paycheck
     * 
     * @param {Date} billDueDate - The bill's due date
     * @returns {Date} The snapped date (either original if within range, or closest paycheck)
     */
    snapBillDateToPaycheck(billDueDate) {
        if (!billDueDate || !this.payCheckDates || this.payCheckDates.length === 0) {
            return billDueDate;
        }

        const dateCopy = new Date(billDueDate);
        dateCopy.setHours(0, 0, 0, 0);

        const firstPaycheck = new Date(this.payCheckDates[0]);
        firstPaycheck.setHours(0, 0, 0, 0);

        const lastPaycheck = new Date(this.payCheckDates[this.payCheckDates.length - 1]);
        lastPaycheck.setHours(0, 0, 0, 0);

        // If bill date is within paycheck range, return as is
        if (dateCopy >= firstPaycheck && dateCopy <= lastPaycheck) {
            return dateCopy;
        }

        // If bill date is before first paycheck, snap to first paycheck
        if (dateCopy < firstPaycheck) {
            return firstPaycheck;
        }

        // If bill date is after last paycheck, snap to last paycheck
        if (dateCopy > lastPaycheck) {
            return lastPaycheck;
        }

        return dateCopy;
    }

    /**
     * Update bill dates based on recurrence
     */
    updateBillDatesBasedOnRecurrence() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const currentBills = billStore.getAll();
            const updatedBills = currentBills.map(bill => {
                if (bill.isPaid) return bill;

                const billDueDate = createLocalDate(bill.dueDate);
                billDueDate.setHours(0, 0, 0, 0);

                let modifiedBill = { ...bill };

                // If bill is past due and unpaid, move to next applicable pay date
                if (billDueDate < today && bill.recurrence !== 'One-time') {
                    let nextDueDate = new Date(billDueDate);

                    while (nextDueDate < today) {
                        const calculated = calculateNextDueDate(nextDueDate, bill.recurrence);
                        if (!calculated) break;
                        nextDueDate = calculated;
                    }

                    const closestPaycheck = this.findClosestPaycheckDate(nextDueDate);
                    if (closestPaycheck) {
                        modifiedBill.dueDate = formatLocalDate(closestPaycheck);
                    }
                }
                // If bill is beyond last paycheck, move to next cycle
                else if (billDueDate > today && bill.recurrence !== 'One-time') {
                    const lastPaycheck = this.payCheckDates[this.payCheckDates.length - 1];
                    if (billDueDate > lastPaycheck) {
                        const nextDueDate = calculateNextDueDate(billDueDate, bill.recurrence);
                        if (nextDueDate) {
                            const closestPaycheck = this.findClosestPaycheckDate(nextDueDate);
                            if (closestPaycheck) {
                                modifiedBill.dueDate = formatLocalDate(closestPaycheck);
                            }
                        }
                    }
                }

                return modifiedBill;
            });

            billStore.setBills(updatedBills);
            return true;
        } catch (error) {
            console.error('Error updating bill dates:', error);
            throw error;
        }
    }

    /**
     * Generate recurring bill instances for a base bill
     */
    generateRecurringBillInstances(baseBill) {
        try {
            if (baseBill.recurrence === 'One-time') return [];

            const generatedBills = [];
            let currentDueDate = createLocalDate(baseBill.dueDate);

            if (!currentDueDate || isNaN(currentDueDate.getTime())) {
                throw new Error(`Invalid bill due date: ${baseBill.dueDate}`);
            }

            for (let i = 0; i < this.payCheckDates.length; i++) {
                const payPeriodStart = this.payCheckDates[i];
                const payPeriodEnd =
                    i < this.payCheckDates.length - 1
                        ? this.payCheckDates[i + 1]
                        : new Date(this.payCheckDates[i].getTime() + 14 * 24 * 60 * 60 * 1000);

                while (currentDueDate < payPeriodEnd) {
                    if (currentDueDate >= payPeriodStart && currentDueDate < payPeriodEnd) {
                        const dueDateStr = formatLocalDate(currentDueDate);
                        const currentBills = billStore.getAll();
                        const existingBill = currentBills.find(
                            b =>
                                b.name === baseBill.name &&
                                b.category === baseBill.category &&
                                b.dueDate === dueDateStr &&
                                b.recurrence === baseBill.recurrence
                        );

                        if (!existingBill) {
                            const previousBill = currentBills.find(
                                b =>
                                    b.name === baseBill.name &&
                                    b.category === baseBill.category &&
                                    !b.isPaid &&
                                    new Date(b.dueDate) < currentDueDate
                            );

                            const accumulatedBalance = previousBill
                                ? previousBill.balance || previousBill.amountDue || 0
                                : baseBill.balance || baseBill.amountDue || 0;

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
        } catch (error) {
            console.error('Error generating recurring bill instances:', error);
            throw error;
        }
    }

    /**
     * Regenerate all recurring bills
     */
    regenerateAllRecurringBills() {
        try {
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
            let newBills = currentBills.filter(
                b =>
                    b.recurrence === 'One-time' ||
                    b.isPaid ||
                    new Date(b.dueDate) <= today
            );

            for (const template of uniqueBills) {
                const generatedBills = this.generateRecurringBillInstances(template);
                if (generatedBills && generatedBills.length > 0) {
                    newBills.push(...generatedBills);
                }
            }

            billStore.setBills(newBills);
            return true;
        } catch (error) {
            console.error('Error regenerating recurring bills:', error);
            throw error;
        }
    }

    /**
     * Auto-select appropriate pay period based on current date
     */
    getAutoSelectedPayPeriodIndex() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < this.payCheckDates.length; i++) {
            const payDate = new Date(this.payCheckDates[i]);
            payDate.setHours(0, 0, 0, 0);

            if (today <= payDate) {
                return i;
            }

            if (i < this.payCheckDates.length - 1) {
                const nextPayDate = new Date(this.payCheckDates[i + 1]);
                nextPayDate.setHours(0, 0, 0, 0);
                if (today > payDate && today < nextPayDate) {
                    return i;
                }
            }
        }

        return this.payCheckDates.length - 1;
    }
}

export const paycheckManager = new PaycheckManager();
