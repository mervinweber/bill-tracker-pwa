/**
 * Bill Action Handlers
 * 
 * Handles all bill-related user actions with comprehensive error handling and validation.
 * Includes:
 * - Payment recording and status tracking
 * - Balance updates and calculations
 * - Bill CRUD operations (Create, Read, Update, Delete)
 * - User notifications for all actions
 * - Undo/retry functionality for failed operations
 * 
 * @module billActionHandlers
 * @requires billStore
 * @requires appState
 * @requires errorHandling
 * @requires validation
 */

import { billStore } from '../store/BillStore.js';
import { appState } from '../store/appState.js';
import { formatErrorMessage, ValidationError } from '../utils/errorHandling.js';
import {
    sanitizeInput,
    validateBillName,
    validateDate,
    validateAmount,
    validateCategory,
    validateNotes,
    validateRecurrence,
    isValidURL,
    safeJSONParse
} from '../utils/validation.js';
import { normalizeImportPayload } from '../utils/importHelpers.js';
import {
    createLocalDate,
    formatLocalDate,
    calculateNextDueDate,
    getMissedMonthlyCycles,
    getNextNonOverdueMonthlyDate
} from '../utils/dates.js';
import logger from '../utils/logger.js';
import StorageManager from '../utils/StorageManager.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { recordAuditEvent } from '../utils/auditTracker.js';

/**
 * Display error notification to user with formatted message
 * 
 * @param {string|Error} message - Error message or Error object
 * @param {string} [title='Error'] - Notification title
 * @returns {void}
 * @description Creates a floating notification with error icon, displays it for 5 seconds,
 *   then auto-removes. Allows user to dismiss by clicking close button.
 *   Formats Error objects to user-friendly messages.
 */
export function showErrorNotification(message, title = 'Error') {
    try {
        // Format message for user display
        const displayMessage = message instanceof Error
            ? formatErrorMessage(message)
            : message;

        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <strong>${title}</strong>
                <p>${displayMessage}</p>
            </div>
            <button class="notification-close">&times;</button>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--danger-color);
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
        `;

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    } catch (error) {
        logger.error('Failed to show error notification', error);
    }
}

/**
 * Show success notification
 */
export function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <p>${message}</p>
        </div>
    `;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

function advanceRecurringBillIfNeeded(bill, updated, options = {}) {
    if (updated.isPaid && bill.recurrence && bill.recurrence !== 'One-time') {
        const currentDueDate = createLocalDate(bill.dueDate);
        const catchUpToCurrent =
            bill.recurrence === 'Monthly' && options.strategy === 'catch-up-to-current';

        const nextDueDate = catchUpToCurrent
            ? getNextNonOverdueMonthlyDate(currentDueDate, options.referenceDate || new Date())
            : calculateNextDueDate(currentDueDate, bill.recurrence);

        if (nextDueDate) {
            updated.dueDate = formatLocalDate(nextDueDate);
            logger.info('Recurring bill moved to next cycle', {
                from: bill.dueDate,
                to: updated.dueDate,
                billId: bill.id,
                strategy: catchUpToCurrent ? 'catch-up-to-current' : 'single-cycle'
            });
        }
    }
}

function getRecurringPaymentStrategy(bill, updated, paymentDate, preferredStrategy = 'single-cycle') {
    if (!updated.isPaid || bill.recurrence !== 'Monthly') {
        return 'single-cycle';
    }

    const currentDueDate = createLocalDate(bill.dueDate);
    const referenceDate = createLocalDate(paymentDate);
    const missedCycles = getMissedMonthlyCycles(currentDueDate, referenceDate);
    if (missedCycles < 2) {
        return 'single-cycle';
    }

    if (preferredStrategy === 'catch-up-to-current') {
        return 'catch-up-to-current';
    }

    return 'single-cycle';
}

function getMostRecentPaymentDate(bill) {
    const historyDates = Array.isArray(bill.paymentHistory)
        ? bill.paymentHistory
            .map(payment => payment?.date)
            .filter(date => typeof date === 'string' && date.trim() !== '')
        : [];

    if (historyDates.length === 0) {
        return bill.lastPaymentDate || null;
    }

    const sortedDates = [...historyDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return sortedDates[0] || bill.lastPaymentDate || null;
}

/**
 * Update bill balance with validation
 */
export function updateBillBalance(billId, newBalance) {
    try {
        if (typeof newBalance !== 'number' || newBalance < 0) {
            throw new Error('Invalid balance amount. Please enter a positive number.');
        }

        const currentBills = billStore.getAll();
        const bill = currentBills.find(b => b.id === billId);

        if (!bill) {
            throw new Error('Bill not found.');
        }

        const updated = { ...bill, balance: newBalance };
        billStore.update(updated);
        recordAuditEvent('bill.balance.updated', {
            entityType: 'bill',
            entityId: billId,
            summary: `Balance updated for ${bill.name}`,
            metadata: { balance: newBalance }
        });
        return true;
    } catch (error) {
        logger.error('Error updating bill balance', error);
        showErrorNotification(error.message, 'Balance Update Failed');
        return false;
    }
}

/**
 * Toggle payment status with validation
 */
export function togglePaymentStatus(billId, isPaid) {
    try {
        const currentBills = billStore.getAll();
        const bill = currentBills.find(b => b.id === billId);

        if (!bill) {
            throw new Error('Bill not found.');
        }

        const updated = { ...bill };
    const mostRecentPaymentDate = getMostRecentPaymentDate(bill);
        updated.isPaid = isPaid;
        updated.lastPaymentDate = isPaid ? new Date().toISOString() : null;

        // Handle splitting if enabled
        if (updated.split?.enabled) {
            updated.split.payers = updated.split.payers.map(p => ({
                ...p,
                isPaid: isPaid
            }));
        }

        // If marking as paid and bill is recurring, move to next payment cycle
        advanceRecurringBillIfNeeded(bill, updated);

        billStore.update(updated);
        recordAuditEvent('bill.payment_status.toggled', {
            entityType: 'bill',
            entityId: billId,
            summary: isPaid
                ? `Payment status set to paid for ${bill.name}`
                : `Payment status set to unpaid for ${bill.name}. Most recent payment date: ${mostRecentPaymentDate || 'none recorded'}`,
            metadata: {
                isPaid,
                lastMarkedPaymentDate: isPaid ? null : mostRecentPaymentDate
            }
        });

        // If marking as paid, record payment automatically
        if (isPaid) {
            const remaining = getRemainingBalance(updated);
            recordPayment(billId, {
                amount: remaining,
                method: 'Quick Toggle',
                notes: 'Marked as paid'
            });
        }

        showSuccessNotification(`Bill ${isPaid ? 'marked as paid' : 'marked as unpaid'}`);
        return true;
    } catch (error) {
        logger.error('Error toggling payment status', error);
        showErrorNotification(error.message, 'Payment Status Update Failed');
        return false;
    }
}

/**
 * Delete bill with confirmation
 */
export function deleteBill(billId) {
    try {
        const currentBills = billStore.getAll();
        const bill = currentBills.find(b => b.id === billId);

        if (!bill) {
            throw new Error('Bill not found.');
        }

        if (!confirm(`Delete "${bill.name}"? This action cannot be undone.`)) {
            return false;
        }

        billStore.delete(billId);
        recordAuditEvent('bill.deleted', {
            entityType: 'bill',
            entityId: billId,
            summary: `Bill deleted: ${bill.name}`
        });
        showSuccessNotification(`"${bill.name}" deleted successfully`);
        return true;
    } catch (error) {
        logger.error('Error deleting bill', error);
        showErrorNotification(error.message, 'Delete Failed');
        return false;
    }
}

/**
 * Bulk delete bills
 */
export function bulkDelete(billIds) {
    try {
        logger.debug('bulkDelete called', { billIds });
        if (!billIds || billIds.length === 0) {
            showErrorNotification('No bills selected to delete.', 'Bulk Action');
            return false;
        }

        if (!confirm(`Delete ${billIds.length} bills? This action cannot be undone.`)) {
            return false;
        }

        const currentBills = billStore.getAll();
        const updatedBills = currentBills.filter(b => !billIds.includes(b.id));

        billStore.setBills(updatedBills);
        recordAuditEvent('bill.bulk_deleted', {
            entityType: 'bill',
            summary: `Bulk deleted ${billIds.length} bills`,
            metadata: { count: billIds.length }
        });
        showSuccessNotification(`Successfully deleted ${billIds.length} bills`);
        return true;
    } catch (error) {
        logger.error('Error in bulk delete', error);
        showErrorNotification(error.message, 'Bulk Delete Failed');
        return false;
    }
}

/**
 * Bulk mark bills as paid
 */
export function bulkMarkAsPaid(billIds) {
    try {
        logger.debug('bulkMarkAsPaid called', { billIds });
        if (!billIds || billIds.length === 0) {
            showErrorNotification('No bills currently showing to mark as paid.', 'Bulk Action');
            return false;
        }

        if (!confirm(`Mark ${billIds.length} bills as paid?`)) {
            return false;
        }

        const currentBills = [...billStore.getAll()];
        let updateCount = 0;
        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];

        billIds.forEach(id => {
            const index = currentBills.findIndex(b => b.id === id);
            if (index !== -1 && !currentBills[index].isPaid) {
                const bill = { ...currentBills[index] };
                bill.isPaid = true;
                bill.lastPaymentDate = now;

                // Record payment if there is balance
                const remaining = getRemainingBalance(bill);
                if (remaining > 0) {
                    if (!bill.paymentHistory) bill.paymentHistory = [];
                    bill.paymentHistory.push({
                        id: 'bulk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        date: todayStr,
                        amount: remaining,
                        method: 'Bulk Action',
                        notes: 'Marked as paid via bulk action'
                    });
                    bill.balance = 0;
                }

                currentBills[index] = bill;
                updateCount++;
            }
        });

        logger.debug('Bulk mark as paid summary', {
            updateCount,
            totalBills: currentBills.length
        });

        if (updateCount > 0) {
            billStore.setBills(currentBills);
            recordAuditEvent('bill.bulk_marked_paid', {
                entityType: 'bill',
                summary: `Bulk marked ${updateCount} bills as paid`,
                metadata: { count: updateCount }
            });
            showSuccessNotification(`Marked ${updateCount} bills as paid`);
            return true;
        } else {
            showErrorNotification('All selected bills are already marked as paid.', 'Bulk Action');
            return false;
        }
    } catch (error) {
        logger.error('Error in bulk mark as paid', error);
        showErrorNotification(error.message, 'Bulk Update Failed');
        return false;
    }
}

/**
 * Get total paid from payment history
 */
export function getTotalPaid(bill) {
    try {
        if (!bill || !bill.paymentHistory || !Array.isArray(bill.paymentHistory)) {
            return 0;
        }
        return bill.paymentHistory.reduce((sum, p) => {
            const amount = parseFloat(p.amount) || 0;
            return sum + amount;
        }, 0);
    } catch (error) {
        logger.error('Error calculating total paid', error);
        return 0;
    }
}

/**
 * Calculate remaining balance
 */
export function getRemainingBalance(bill) {
    try {
        if (!bill) return 0;

        const totalDue = parseFloat(bill.balance || bill.amountDue || 0);
        if (totalDue < 0) return 0;

        // If split is enabled, remaining balance is based on unpaid payers
        if (bill.split?.enabled) {
            return bill.split.payers
                .filter(p => !p.isPaid)
                .reduce((sum, p) => sum + p.amount, 0);
        }

        const totalPaid = getTotalPaid(bill);
        return Math.max(0, totalDue - totalPaid);
    } catch (error) {
        logger.error('Error calculating remaining balance', error);
        return bill.amountDue || 0;
    }
}

/**
 * Record payment with validation
 * Allows zero payments for bills that are already paid or have credit balances
 * Moves recurring bills to next payment cycle when fully paid
 */
export function recordPayment(billId, paymentData) {
    try {
        const currentBills = billStore.getAll();
        const bill = currentBills.find(b => b.id === billId);

        if (!bill) {
            throw new Error('Bill not found.');
        }

        const amount = parseFloat(paymentData.amount);
        if (isNaN(amount) || amount < 0) {
            throw new Error('Payment amount must be zero or a positive number.');
        }

        const updated = { ...bill };
        if (!updated.paymentHistory) {
            updated.paymentHistory = [];
        }

        const paymentDate = paymentData.date || new Date().toISOString().split('T')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
            throw new Error('Invalid payment date format.');
        }

        const payment = {
            id: 'pmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            date: paymentDate,
            amount: amount,
            method: paymentData.method || 'Cash',
            confirmationNumber: paymentData.confirmationNumber || '',
            notes: paymentData.notes || ''
        };

        updated.paymentHistory.push(payment);
        updated.lastPaymentDate = payment.date;

        // Handle Split Payment Attribution
        if (updated.split?.enabled && paymentData.payerId) {
            const payer = updated.split.payers.find(p => p.id === paymentData.payerId);
            if (payer) {
                payer.isPaid = true;
                logger.info('Split payment attributed to payer', { payerName: payer.name, amount: payment.amount });
            }
        }

        const remaining = getRemainingBalance(updated);
        updated.balance = remaining;
        updated.isPaid = remaining <= 0;

        // If fully paid and bill is recurring, move to next payment cycle
        const recurrenceStrategy = getRecurringPaymentStrategy(
            bill,
            updated,
            payment.date,
            paymentData.recurrenceStrategy
        );
        advanceRecurringBillIfNeeded(bill, updated, {
            strategy: recurrenceStrategy,
            referenceDate: createLocalDate(payment.date)
        });

        billStore.update(updated);
        recordAuditEvent('bill.payment.recorded', {
            entityType: 'bill',
            entityId: billId,
            summary: `Payment recorded for ${bill.name}`,
            metadata: {
                amount,
                paymentDate: payment.date,
                recurrenceStrategy
            }
        });
        
        // Show appropriate message based on payment amount
        if (amount === 0) {
            showSuccessNotification(`"${bill.name}" marked as paid (zero balance recorded)`);
        } else {
            showSuccessNotification(`Payment of $${amount.toFixed(2)} recorded for "${bill.name}"`);
        }
        return true;
    } catch (error) {
        logger.error('Error recording payment', error);
        showErrorNotification(error.message, 'Payment Recording Failed');
        return false;
    }
}

/**
 * Migrate legacy bills to payment history format
 */
export function migrateBillsToPaymentHistory() {
    try {
        const currentBills = billStore.getAll();
        let migrationCount = 0;

        currentBills.forEach(bill => {
            if (!bill.paymentHistory) {
                bill.paymentHistory = [];
                if (bill.lastPaymentDate && bill.isPaid) {
                    bill.paymentHistory.push({
                        id: 'legacy_' + Date.now(),
                        date: bill.lastPaymentDate,
                        amount: bill.amountDue || 0,
                        method: 'Legacy Toggle',
                        notes: 'Migrated from toggle'
                    });
                    migrationCount++;
                }
            }
        });

        if (migrationCount > 0) {
            billStore.setBills(currentBills);
            logger.info('Migrated bills to payment history format', { count: migrationCount });
        }

        return migrationCount;
    } catch (error) {
        logger.error('Error migrating bills', error);
        showErrorNotification('Error migrating bill data', 'Migration Failed');
        return 0;
    }
}

/**
 * Export all data as JSON
 */
export function exportData() {
    try {
        const bills = billStore.getAll();
        const customCategories = StorageManager.get(STORAGE_KEYS.CUSTOM_CATEGORIES, []);
        const paymentSettings = StorageManager.get(STORAGE_KEYS.PAYMENT_SETTINGS, {});

        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            bills,
            customCategories,
            paymentSettings
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bill-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        recordAuditEvent('data.exported', {
            entityType: 'data',
            summary: `Exported ${bills.length} bills`,
            metadata: { billCount: bills.length }
        });

        showSuccessNotification('Data exported successfully');
        return true;
    } catch (error) {
        logger.error('Error exporting data', error);
        showErrorNotification(error.message, 'Export Failed');
        return false;
    }
}

/**
 * Import data from JSON file with validation
 */
export function importData(file) {
    return new Promise((resolve, reject) => {
        try {
            if (!file) {
                throw new Error('No file selected.');
            }

            if (!file.name.endsWith('.json')) {
                throw new Error('Please select a valid JSON file.');
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = safeJSONParse(/** @type {string} */ (e.target.result), null);

                    if (!data) {
                        throw new Error('Invalid JSON format in file');
                    }
                    const defaultCategories = ['Rent', 'Utilities', 'Groceries', 'Transportation', 'Insurance', 'Entertainment'];
                    const existingCategories = StorageManager.get(STORAGE_KEYS.CUSTOM_CATEGORIES, defaultCategories);
                    const {
                        processedBills,
                        allCategories,
                        paymentSettingsToStore
                    } = normalizeImportPayload(data, {
                        defaultCategories,
                        existingCategories
                    });

                    // Import data
                    billStore.setBills(processedBills);

                    StorageManager.set(STORAGE_KEYS.CUSTOM_CATEGORIES, allCategories);

                    if (paymentSettingsToStore) {
                        StorageManager.set(STORAGE_KEYS.PAYMENT_SETTINGS, paymentSettingsToStore);
                    }

                    recordAuditEvent('data.imported', {
                        entityType: 'data',
                        summary: `Imported ${processedBills.length} bills`,
                        metadata: {
                            billCount: processedBills.length,
                            categoryCount: allCategories.length,
                            hasPaymentSettings: !!paymentSettingsToStore
                        }
                    });

                    showSuccessNotification(
                        `Successfully imported ${processedBills.length} bill(s). Refreshing...`
                    );
                    setTimeout(() => window.location.reload(), 1500);
                    resolve(true);
                } catch (error) {
                    logger.error('Error parsing file', error);
                    showErrorNotification(
                        error.message || 'Failed to parse import file',
                        'Import Failed'
                    );
                    reject(error);
                }
            };

            reader.onerror = () => {
                const errorMsg = 'Error reading file. Please try again.';
                logger.error(errorMsg);
                showErrorNotification(errorMsg, 'Import Failed');
                reject(new Error(errorMsg));
            };

            reader.readAsText(file);
        } catch (error) {
            logger.error('Error importing data', error);
            showErrorNotification(error.message, 'Import Failed');
            reject(error);
        }
    });
}

/**
 * Validate bill data before saving with comprehensive security checks
 * 
 * @param {Object} billData - Bill data to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateBill(billData) {
    const errors = [];

    // Validate bill name
    const nameValidation = validateBillName(billData.name);
    if (!nameValidation.isValid) {
        errors.push(nameValidation.error);
    }

    // Validate category
    const categoryValidation = validateCategory(billData.category);
    if (!categoryValidation.isValid) {
        errors.push(categoryValidation.error);
    }

    // Validate due date
    const dateValidation = validateDate(billData.dueDate, true); // Allow past dates
    if (!dateValidation.isValid) {
        errors.push(dateValidation.error);
    }

    // Validate amount
    const amountValidation = validateAmount(billData.amountDue);
    if (!amountValidation.isValid) {
        errors.push(amountValidation.error);
    }

    // Validate recurrence
    const recurrenceValidation = validateRecurrence(billData.recurrence);
    if (!recurrenceValidation.isValid) {
        errors.push(recurrenceValidation.error);
    }

    // Validate optional fields
    if (billData.notes) {
        const notesValidation = validateNotes(billData.notes);
        if (!notesValidation.isValid) {
            errors.push(notesValidation.error);
        }
    }

    if (billData.website) {
        if (!isValidURL(billData.website)) {
            errors.push('Website must be a valid HTTP or HTTPS URL');
        }
    }

    // Validate balance if provided
    if (billData.balance !== undefined) {
        const balanceValidation = validateAmount(billData.balance);
        if (!balanceValidation.isValid) {
            errors.push('Balance: ' + balanceValidation.error);
        }
    }

    // Validate split data if provided
    if (billData.split && billData.split.enabled) {
        if (!Array.isArray(billData.split.payers) || billData.split.payers.length === 0) {
            errors.push('Split bill must have at least one payer');
        } else {
            const splitTotal = billData.split.payers.reduce((sum, p) => sum + (p.amount || 0), 0);
            if (Math.abs(splitTotal - billData.amountDue) > 0.01) {
                errors.push('Total split amount must equal Amount Due');
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export const billActionHandlers = {
    updateBillBalance,
    togglePaymentStatus,
    deleteBill,
    recordPayment,
    getTotalPaid,
    getRemainingBalance,
    migrateBillsToPaymentHistory,
    exportData,
    importData,
    validateBill,
    bulkDelete,
    bulkMarkAsPaid,
    showErrorNotification,
    showSuccessNotification
};
