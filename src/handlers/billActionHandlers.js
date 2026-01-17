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
 */

import { billStore } from '../store/BillStore.js';
import { appState } from '../store/appState.js';
import { formatErrorMessage, ValidationError } from '../utils/errorHandling.js';

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
        console.error('❌ Failed to show error notification:', error);
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
        return true;
    } catch (error) {
        console.error('Error updating bill balance:', error);
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
        updated.isPaid = isPaid;
        updated.lastPaymentDate = isPaid ? new Date().toISOString() : null;

        billStore.update(updated);

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
        console.error('Error toggling payment status:', error);
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
        showSuccessNotification(`"${bill.name}" deleted successfully`);
        return true;
    } catch (error) {
        console.error('Error deleting bill:', error);
        showErrorNotification(error.message, 'Delete Failed');
        return false;
    }
}

/**
 * Bulk delete bills
 */
export function bulkDelete(billIds) {
    try {
        console.log('bulkDelete called with IDs:', billIds);
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
        showSuccessNotification(`Successfully deleted ${billIds.length} bills`);
        return true;
    } catch (error) {
        console.error('Error in bulk delete:', error);
        showErrorNotification(error.message, 'Bulk Delete Failed');
        return false;
    }
}

/**
 * Bulk mark bills as paid
 */
export function bulkMarkAsPaid(billIds) {
    try {
        console.log('bulkMarkAsPaid called with IDs:', billIds);
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

        console.log(`Diagnostic: Preparing to update ${updateCount} bills. Total bills: ${currentBills.length}`);

        if (updateCount > 0) {
            billStore.setBills(currentBills);
            showSuccessNotification(`Marked ${updateCount} bills as paid`);
            return true;
        } else {
            showErrorNotification('All selected bills are already marked as paid.', 'Bulk Action');
            return false;
        }
    } catch (error) {
        console.error('Error in bulk mark as paid:', error);
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
        console.error('Error calculating total paid:', error);
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

        const totalPaid = getTotalPaid(bill);
        return Math.max(0, totalDue - totalPaid);
    } catch (error) {
        console.error('Error calculating remaining balance:', error);
        return bill.amountDue || 0;
    }
}

/**
 * Record payment with validation
 */
export function recordPayment(billId, paymentData) {
    try {
        const currentBills = billStore.getAll();
        const bill = currentBills.find(b => b.id === billId);

        if (!bill) {
            throw new Error('Bill not found.');
        }

        const amount = parseFloat(paymentData.amount);
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Payment amount must be a positive number.');
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

        const remaining = getRemainingBalance(updated);
        updated.balance = remaining;
        updated.isPaid = remaining <= 0;

        billStore.update(updated);
        showSuccessNotification(`Payment of $${amount.toFixed(2)} recorded for "${bill.name}"`);
        return true;
    } catch (error) {
        console.error('Error recording payment:', error);
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
            console.log(`Migrated ${migrationCount} bills to payment history format`);
        }

        return migrationCount;
    } catch (error) {
        console.error('Error migrating bills:', error);
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
        const customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
        const paymentSettings = JSON.parse(localStorage.getItem('paymentSettings') || '{}');

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

        showSuccessNotification('Data exported successfully');
        return true;
    } catch (error) {
        console.error('Error exporting data:', error);
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
                    const data = JSON.parse(e.target.result);

                    // Validate structure
                    if (!Array.isArray(data.bills)) {
                        throw new Error('Invalid file format: bills must be an array.');
                    }

                    if (data.bills.length === 0) {
                        throw new Error('File contains no bills to import.');
                    }

                    // Process bills: Generate IDs and ensure structure
                    const processedBills = data.bills.map(bill => {
                        // Generate a unique ID if missing or seems like a placeholder
                        // We use Date.now() + a random string for uniqueness
                        const newBill = { ...bill };

                        if (!newBill.id) {
                            newBill.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                        }

                        // Ensure required fields have at least empty values/defaults
                        if (!newBill.paymentHistory) newBill.paymentHistory = [];
                        if (newBill.isPaid === undefined) newBill.isPaid = false;
                        if (newBill.balance === undefined) newBill.balance = newBill.amountDue || 0;

                        return newBill;
                    });

                    // Import data
                    billStore.setBills(processedBills);

                    // Sync custom categories from imported bills if not explicitly provided
                    // Sync custom categories from imported bills
                    const defaultCategories = ['Rent', 'Utilities', 'Groceries', 'Transportation', 'Insurance', 'Entertainment'];
                    const existingCategories = JSON.parse(localStorage.getItem('customCategories')) || defaultCategories;

                    const billCategories = [...new Set(processedBills.map(b => b.category))].filter(c => c && c.trim() !== '');
                    const importedMetadataCategories = data.customCategories || [];

                    const allCategories = [...new Set([
                        ...existingCategories,
                        ...billCategories,
                        ...importedMetadataCategories
                    ])];

                    localStorage.setItem('customCategories', JSON.stringify(allCategories));

                    if (data.paymentSettings && typeof data.paymentSettings === 'object') {
                        localStorage.setItem('paymentSettings', JSON.stringify(data.paymentSettings));
                    }

                    showSuccessNotification(
                        `Successfully imported ${processedBills.length} bill(s). Refreshing...`
                    );
                    setTimeout(() => window.location.reload(), 1500);
                    resolve(true);
                } catch (error) {
                    throw new Error('Error parsing file: ' + error.message);
                }
            };

            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };

            reader.readAsText(file);
        } catch (error) {
            console.error('Error importing data:', error);
            showErrorNotification(error.message, 'Import Failed');
            reject(error);
        }
    });
}

/**
 * Validate bill data before saving
 */
export function validateBill(billData) {
    const errors = [];

    if (!billData.name || billData.name.trim() === '') {
        errors.push('Bill name is required');
    }

    if (!billData.category || billData.category.trim() === '') {
        errors.push('Category is required');
    }

    if (!billData.dueDate || billData.dueDate.trim() === '') {
        errors.push('Due date is required');
    }

    const amount = parseFloat(billData.amountDue);
    if (isNaN(amount) || amount < 0) {
        errors.push('Amount due must be a positive number');
    }

    if (!billData.recurrence) {
        errors.push('Recurrence type is required');
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
