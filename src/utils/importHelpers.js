import {
    sanitizeInput,
    validateBillName,
    validateCategory,
    validateDate,
    validateAmount,
    validateRecurrence,
    validateNotes,
    isValidURL,
    validatePaymentSettings
} from './validation.js';
import { createAppError } from '../errors/errorCodes.js';

export const MAX_IMPORT_BILLS = 2000;

function normalizeRecurrence(recurrence) {
    if (!recurrence) return 'One-time';

    const recurrenceLower = String(recurrence).toLowerCase();
    if (recurrenceLower === 'one-time') return 'One-time';
    if (recurrenceLower === 'weekly') return 'Weekly';
    if (recurrenceLower === 'bi-weekly') return 'Bi-weekly';
    if (recurrenceLower === 'monthly') return 'Monthly';
    if (recurrenceLower === 'quarterly' || recurrenceLower === 'every 3 months' || recurrenceLower === 'every-3-months') return 'Quarterly';
    if (recurrenceLower === 'yearly') return 'Yearly';

    return String(recurrence);
}

function validateImportedBillCandidate(bill) {
    const errors = [];

    const nameValidation = validateBillName(bill.name);
    if (!nameValidation.isValid) errors.push(nameValidation.error);

    const categoryValidation = validateCategory(bill.category);
    if (!categoryValidation.isValid) errors.push(categoryValidation.error);

    const dateValidation = validateDate(bill.dueDate, true);
    if (!dateValidation.isValid) errors.push(dateValidation.error);

    const amountValidation = validateAmount(bill.amountDue);
    if (!amountValidation.isValid) errors.push(amountValidation.error);

    const recurrenceValidation = validateRecurrence(bill.recurrence);
    if (!recurrenceValidation.isValid) errors.push(recurrenceValidation.error);

    if (bill.notes) {
        const notesValidation = validateNotes(bill.notes);
        if (!notesValidation.isValid) errors.push(notesValidation.error);
    }

    if (bill.website && !isValidURL(bill.website)) {
        errors.push('Website must be a valid HTTP or HTTPS URL');
    }

    const balanceValidation = validateAmount(bill.balance);
    if (!balanceValidation.isValid) {
        errors.push('Balance: ' + balanceValidation.error);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export function normalizeImportPayload(data, options = {}) {
    const defaultCategories = options.defaultCategories || [
        'Rent',
        'Utilities',
        'Groceries',
        'Transportation',
        'Insurance',
        'Entertainment'
    ];

    const existingCategories = Array.isArray(options.existingCategories)
        ? options.existingCategories
        : defaultCategories;

    if (!data || typeof data !== 'object') {
        throw createAppError('IMPORT_INVALID_JSON');
    }

    if (!Array.isArray(data.bills)) {
        throw createAppError('IMPORT_INVALID_BILLS_ARRAY');
    }

    if (data.bills.length === 0) {
        throw createAppError('IMPORT_EMPTY_BILLS');
    }

    if (data.bills.length > MAX_IMPORT_BILLS) {
        throw createAppError(
            'IMPORT_TOO_MANY_BILLS',
            `Import file exceeds ${MAX_IMPORT_BILLS} bills. Please split into smaller files.`
        );
    }

    const importErrors = [];
    const processedBills = data.bills.map((bill, index) => {
        if (!bill || typeof bill !== 'object') {
            importErrors.push(`Bill ${index + 1}: Entry must be an object`);
            return null;
        }

        const newBill = { ...bill };

        newBill.name = sanitizeInput(String(newBill.name || ''), 100);
        newBill.category = sanitizeInput(String(newBill.category || ''), 50);
        newBill.notes = sanitizeInput(String(newBill.notes || ''), 500);
        newBill.website = typeof newBill.website === 'string' ? newBill.website.trim() : '';
        newBill.recurrence = normalizeRecurrence(newBill.recurrence);

        if (!newBill.id) {
            newBill.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        }

        newBill.amountDue = Number.parseFloat(newBill.amountDue);
        if (!Number.isFinite(newBill.amountDue) || newBill.amountDue < 0) {
            importErrors.push(`Bill ${index + 1}: Amount due must be a valid non-negative number`);
            return null;
        }

        if (!Array.isArray(newBill.paymentHistory)) {
            newBill.paymentHistory = [];
        } else {
            newBill.paymentHistory = newBill.paymentHistory
                .map((payment) => {
                    const amount = Number.parseFloat(payment?.amount);
                    const date = typeof payment?.date === 'string' ? payment.date : '';

                    if (!Number.isFinite(amount) || amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        return null;
                    }

                    return {
                        id: payment?.id || `pmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        date,
                        amount,
                        method: sanitizeInput(String(payment?.method || 'Imported'), 50),
                        confirmationNumber: sanitizeInput(String(payment?.confirmationNumber || ''), 100),
                        notes: sanitizeInput(String(payment?.notes || ''), 500)
                    };
                })
                .filter(Boolean);
        }

        newBill.isPaid = Boolean(newBill.isPaid);
        if (newBill.balance === undefined) {
            newBill.balance = newBill.amountDue || 0;
        } else {
            const parsedBalance = Number.parseFloat(newBill.balance);
            if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
                importErrors.push(`Bill ${index + 1}: Balance must be a valid non-negative number`);
                return null;
            }
            newBill.balance = parsedBalance;
        }

        if (newBill.reminderEnabled === undefined) newBill.reminderEnabled = true;
        newBill.reminderEnabled = Boolean(newBill.reminderEnabled);

        const billValidation = validateImportedBillCandidate(newBill);
        if (!billValidation.isValid) {
            importErrors.push(`Bill ${index + 1}: ${billValidation.errors.join(', ')}`);
            return null;
        }

        return newBill;
    }).filter(Boolean);

    if (importErrors.length > 0) {
        const preview = importErrors.slice(0, 5).join('; ');
        throw createAppError(
            'IMPORT_INVALID_BILL_ENTRIES',
            `Import contains invalid bill entries. ${preview}${importErrors.length > 5 ? `; and ${importErrors.length - 5} more` : ''}`
        );
    }

    if (processedBills.length === 0) {
        throw createAppError('IMPORT_NO_VALID_BILLS');
    }

    const billCategories = [...new Set(processedBills.map(b => b.category))].filter(c => c && c.trim() !== '');
    const importedMetadataCategories = Array.isArray(data.customCategories)
        ? data.customCategories
            .map(c => sanitizeInput(String(c || ''), 50))
            .filter(c => c && c.trim() !== '')
        : [];

    const allCategories = [...new Set([
        ...existingCategories,
        ...billCategories,
        ...importedMetadataCategories
    ])];

    let paymentSettingsToStore = null;
    if (data.paymentSettings && typeof data.paymentSettings === 'object') {
        const normalizedPaymentSettings = {
            ...data.paymentSettings,
            payPeriodsToShow: Number.parseInt(data.paymentSettings.payPeriodsToShow, 10)
        };

        const paymentSettingsValidation = validatePaymentSettings(normalizedPaymentSettings);
        if (paymentSettingsValidation.isValid) {
            paymentSettingsToStore = normalizedPaymentSettings;
        }
    }

    return {
        processedBills,
        allCategories,
        paymentSettingsToStore
    };
}
