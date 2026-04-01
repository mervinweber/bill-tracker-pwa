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
import { TOAST_DISMISS_DELAY_MS, PAGE_RELOAD_DELAY_MS, APP_VERSION } from '../config/constants.js';
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
    getMissedCycles
} from '../utils/dates.js';
import { advanceBillToNextCycle } from '../utils/billHelpers.js';
import logger from '../utils/logger.js';
import StorageManager from '../utils/StorageManager.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { recordAuditEvent } from '../utils/auditTracker.js';
import { createAppError, ERROR_CODES } from '../errors/errorCodes.js';

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
            background: hsl(var(--destructive));
            color: hsl(var(--destructive-foreground));
            padding: 15px 20px;
            border-radius: 6px;
            border: 1px solid hsl(var(--destructive));
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            z-index: 1100;
            max-width: 400px;
        `;

        const closeButton = /** @type {HTMLButtonElement} */ (notification.querySelector('.notification-close'));
        closeButton.style.cssText = `
            margin-left: 10px;
            border: none;
            background: transparent;
            color: inherit;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
            opacity: 0.9;
        `;

        closeButton.addEventListener('click', () => {
            notification.remove();
        });

        document.body.appendChild(notification);

        // Auto-remove after timeout
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, TOAST_DISMISS_DELAY_MS);
    } catch (error) {
        logger.error('Failed to show error notification', error);
    }
}

/**
 * Show success notification
 */
export function showSuccessNotification(message, options = {}) {
    const {
        actionLabel,
        onAction,
        durationMs = 3000
    } = options;

    const notification = document.createElement('div');
    notification.className = 'success-notification';
    const content = document.createElement('div');
    content.className = 'notification-content';

    const messageNode = document.createElement('p');
    messageNode.textContent = message;
    content.appendChild(messageNode);

    if (actionLabel && typeof onAction === 'function') {
        const actionButton = document.createElement('button');
        actionButton.type = 'button';
        actionButton.textContent = actionLabel;
        actionButton.style.cssText = `
            margin-left: 12px;
            border: 1px solid rgba(255,255,255,0.6);
            border-radius: 4px;
            background: transparent;
            color: #ffffff;
            font-weight: 600;
            cursor: pointer;
            padding: 2px 8px;
        `;
        actionButton.addEventListener('click', () => {
            try {
                onAction();
            } finally {
                notification.remove();
            }
        });
        content.appendChild(actionButton);
    }

    notification.appendChild(content);
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #059669;
        color: #ffffff;
        padding: 15px 20px;
        border-radius: 6px;
        border: 1px solid #047857;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 1100;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, durationMs);
}

function getRecurringPaymentStrategy(bill, updated, paymentDate, preferredStrategy = 'single-cycle') {
    if (!updated.isPaid || !bill.recurrence || bill.recurrence === 'One-time') {
        return 'single-cycle';
    }

    const currentDueDate = createLocalDate(bill.dueDate);
    const referenceDate = createLocalDate(paymentDate);
    const missedCycles = getMissedCycles(currentDueDate, bill.recurrence, referenceDate);
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
 * When marking as unpaid, resets balance to amountDue if balance is 0
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

        // When marking unpaid, reset balance to amountDue if it's zero or missing
        if (!isPaid && (updated.balance === 0 || !updated.balance)) {
            updated.balance = updated.amountDue;
        }

        // Handle splitting if enabled
        if (updated.split?.enabled) {
            updated.split.payers = updated.split.payers.map(p => ({
                ...p,
                isPaid: isPaid
            }));
        }

        // If marking as paid and bill is recurring, move to next payment cycle
        advanceBillToNextCycle(bill, updated);

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
export function bulkDelete(billIds, skipConfirm = false) {
    try {
        logger.debug('bulkDelete called', { billIds });
        if (!billIds || billIds.length === 0) {
            showErrorNotification('No bills selected to delete.', 'Bulk Action');
            return false;
        }

        if (!skipConfirm && !confirm(`Delete ${billIds.length} bills? This action cannot be undone.`)) {
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
export function bulkMarkAsPaid(billIds, skipConfirm = false, options = {}) {
    try {
        const { suppressSuccessNotification = false } = options;
        logger.debug('bulkMarkAsPaid called', { billIds });
        if (!billIds || billIds.length === 0) {
            showErrorNotification('No bills currently showing to mark as paid.', 'Bulk Action');
            return false;
        }

        if (!skipConfirm && !confirm(`Mark ${billIds.length} bills as paid?`)) {
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
            if (!suppressSuccessNotification) {
                showSuccessNotification(`Marked ${updateCount} bills as paid`);
            }
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
 * Bulk mark bills as unpaid
 */
export function bulkMarkAsUnpaid(billIds, skipConfirm = false, options = {}) {
    try {
        const { suppressSuccessNotification = false } = options;
        logger.debug('bulkMarkAsUnpaid called', { billIds });
        if (!billIds || billIds.length === 0) {
            showErrorNotification('No bills currently showing to mark as unpaid.', 'Bulk Action');
            return false;
        }

        if (!skipConfirm && !confirm(`Mark ${billIds.length} bills as unpaid?`)) {
            return false;
        }

        const currentBills = [...billStore.getAll()];
        let updateCount = 0;

        billIds.forEach(id => {
            const index = currentBills.findIndex(b => b.id === id);
            if (index !== -1 && currentBills[index].isPaid) {
                const bill = { ...currentBills[index] };
                bill.isPaid = false;
                bill.lastPaymentDate = null;

                currentBills[index] = bill;
                updateCount++;
            }
        });

        logger.debug('Bulk mark as unpaid summary', {
            updateCount,
            totalBills: currentBills.length
        });

        if (updateCount > 0) {
            billStore.setBills(currentBills);
            recordAuditEvent('bill.bulk_marked_unpaid', {
                entityType: 'bill',
                summary: `Bulk marked ${updateCount} bills as unpaid`,
                metadata: { count: updateCount }
            });
            if (!suppressSuccessNotification) {
                showSuccessNotification(`Marked ${updateCount} bills as unpaid`);
            }
            return true;
        } else {
            showErrorNotification('All selected bills are already marked as unpaid.', 'Bulk Action');
            return false;
        }
    } catch (error) {
        logger.error('Error in bulk mark as unpaid', error);
        showErrorNotification(error.message, 'Bulk Update Failed');
        return false;
    }
}

/**
 * Bulk fill zero balances back to amountDue for unpaid bills
 * Used to recover balance information after upgrades
 * @returns {boolean} True if successful, false otherwise
 */
export function bulkFillZeroBalances(options = {}) {
    try {
        const { suppressSuccessNotification = false } = options;
        logger.debug('bulkFillZeroBalances called');
        const currentBills = [...billStore.getAll()];
        let updateCount = 0;

        currentBills.forEach((bill, index) => {
            // Only update unpaid bills with zero or missing balance
            if (!bill.isPaid && (bill.balance === 0 || !bill.balance)) {
                currentBills[index] = {
                    ...bill,
                    balance: bill.amountDue
                };
                updateCount++;
            }
        });

        logger.debug('Bulk fill zero balances summary', {
            updateCount,
            totalBills: currentBills.length
        });

        if (updateCount > 0) {
            billStore.setBills(currentBills);
            recordAuditEvent('bill.bulk_balance_filled', {
                entityType: 'bill',
                summary: `Bulk filled ${updateCount} zero balances`,
                metadata: { count: updateCount }
            });
            if (!suppressSuccessNotification) {
                showSuccessNotification(`Filled balance for ${updateCount} bill${updateCount === 1 ? '' : 's'}`);
            }
            return true;
        } else {
            showErrorNotification('No unpaid bills with zero balance found.', 'Bulk Action');
            return false;
        }
    } catch (error) {
        logger.error('Error in bulk fill zero balances', error);
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
        const creditBalance = Math.max(0, Number.parseFloat(bill.creditBalance) || 0);
        if (totalDue < 0) return 0;
        const effectiveDue = Math.max(0, totalDue - creditBalance);

        // If split is enabled, remaining balance is based on unpaid payers
        if (bill.split?.enabled) {
            return bill.split.payers
                .filter(p => !p.isPaid)
                .reduce((sum, p) => sum + p.amount, 0);
        }

        const totalPaid = getTotalPaid(bill);
        return Math.max(0, effectiveDue - totalPaid);
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

        const prePaymentRemaining = getRemainingBalance({
            ...updated,
            paymentHistory: updated.paymentHistory.slice(0, -1)
        });
        const existingCredit = Math.max(0, Number.parseFloat(updated.creditBalance) || 0);
        const overpaymentCredit = Math.max(0, amount - prePaymentRemaining);
        const totalCredit = existingCredit + overpaymentCredit;

        let remaining = Math.max(0, prePaymentRemaining - amount);
        updated.balance = remaining;
        updated.creditBalance = totalCredit;
        updated.isPaid = remaining <= 0;

        // If fully paid and bill is recurring, move to next payment cycle
        const recurrenceStrategy = getRecurringPaymentStrategy(
            bill,
            updated,
            payment.date,
            paymentData.recurrenceStrategy
        );
        advanceBillToNextCycle(bill, updated, {
            strategy: recurrenceStrategy,
            referenceDate: createLocalDate(payment.date)
        });

        const advancedToNewCycle = updated.dueDate !== bill.dueDate;
        if (advancedToNewCycle) {
            const nextCycleDue = Math.max(0, Number.parseFloat(updated.amountDue) || 0);
            const appliedCredit = Math.min(totalCredit, nextCycleDue);
            remaining = Math.max(0, nextCycleDue - appliedCredit);
            updated.balance = remaining;
            updated.creditBalance = totalCredit - appliedCredit;
            updated.isPaid = remaining <= 0;
        }

        billStore.update(updated);
        recordAuditEvent('bill.payment.recorded', {
            entityType: 'bill',
            entityId: billId,
            summary: `Payment recorded for ${bill.name}`,
            metadata: {
                amount,
                paymentDate: payment.date,
                recurrenceStrategy,
                overpaymentCredit,
                creditBalance: updated.creditBalance || 0
            }
        });
        
        // Show appropriate message based on payment amount
        if (amount === 0) {
            showSuccessNotification(`"${bill.name}" marked as paid (zero balance recorded)`);
        } else if (overpaymentCredit > 0) {
            showSuccessNotification(`Payment of $${amount.toFixed(2)} recorded for "${bill.name}". Credit: $${(updated.creditBalance || 0).toFixed(2)}`);
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
            version: APP_VERSION,
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
                throw createAppError('IMPORT_NO_FILE_SELECTED');
            }

            if (!file.name.endsWith('.json')) {
                throw createAppError('IMPORT_INVALID_FILE_TYPE');
            }

            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
            if (file.size > MAX_FILE_SIZE) {
                throw createAppError(
                    'IMPORT_FILE_TOO_LARGE',
                    `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`
                );
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = safeJSONParse(/** @type {string} */ (e.target.result), null);

                    if (!data) {
                        throw createAppError('IMPORT_INVALID_JSON');
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
                    setTimeout(() => window.location.reload(), PAGE_RELOAD_DELAY_MS);
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
                const errorMsg = ERROR_CODES.IMPORT_FILE_READ_FAILED.message;
                logger.error(errorMsg);
                showErrorNotification(errorMsg, 'Import Failed');
                reject(createAppError('IMPORT_FILE_READ_FAILED'));
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

    // Validate credit balance if provided
    if (billData.creditBalance !== undefined) {
        const creditValidation = validateAmount(billData.creditBalance);
        if (!creditValidation.isValid) {
            errors.push('Credit Balance: ' + creditValidation.error);
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
    bulkMarkAsUnpaid,
    bulkFillZeroBalances,
    showErrorNotification,
    showSuccessNotification
};
