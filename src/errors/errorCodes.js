/**
 * Centralized application error codes.
 * Each entry defines a stable code, default message, and recoverable flag.
 */
export const ERROR_CODES = {
    STORAGE_QUOTA_EXCEEDED: {
        code: 'STORAGE_QUOTA_EXCEEDED',
        message: 'Not enough storage space is available to save your data.',
        recoverable: true
    },
    INVALID_PAYMENT_SETTINGS: {
        code: 'INVALID_PAYMENT_SETTINGS',
        message: 'Payment settings are invalid. Please review and try again.',
        recoverable: true
    },

    IMPORT_NO_FILE_SELECTED: {
        code: 'IMPORT_NO_FILE_SELECTED',
        message: 'No file selected.',
        recoverable: true
    },
    IMPORT_INVALID_FILE_TYPE: {
        code: 'IMPORT_INVALID_FILE_TYPE',
        message: 'Please select a valid JSON file.',
        recoverable: true
    },
    IMPORT_FILE_TOO_LARGE: {
        code: 'IMPORT_FILE_TOO_LARGE',
        message: 'Import file is too large. Maximum allowed size is 5 MB.',
        recoverable: true
    },
    IMPORT_INVALID_JSON: {
        code: 'IMPORT_INVALID_JSON',
        message: 'Invalid JSON format in file.',
        recoverable: true
    },
    IMPORT_INVALID_BILLS_ARRAY: {
        code: 'IMPORT_INVALID_BILLS_ARRAY',
        message: 'Invalid file format: bills must be an array.',
        recoverable: true
    },
    IMPORT_EMPTY_BILLS: {
        code: 'IMPORT_EMPTY_BILLS',
        message: 'File contains no bills to import.',
        recoverable: true
    },
    IMPORT_TOO_MANY_BILLS: {
        code: 'IMPORT_TOO_MANY_BILLS',
        message: 'Import file exceeds the maximum supported bill count.',
        recoverable: true
    },
    IMPORT_INVALID_BILL_ENTRIES: {
        code: 'IMPORT_INVALID_BILL_ENTRIES',
        message: 'Import contains invalid bill entries.',
        recoverable: true
    },
    IMPORT_NO_VALID_BILLS: {
        code: 'IMPORT_NO_VALID_BILLS',
        message: 'No valid bills found to import.',
        recoverable: true
    },
    IMPORT_FILE_READ_FAILED: {
        code: 'IMPORT_FILE_READ_FAILED',
        message: 'Error reading file. Please try again.',
        recoverable: true
    },

    SUPABASE_NOT_INITIALIZED: {
        code: 'SUPABASE_NOT_INITIALIZED',
        message: 'Supabase not initialized.',
        recoverable: true
    },
    SUPABASE_AUTH_REQUIRED: {
        code: 'SUPABASE_AUTH_REQUIRED',
        message: 'User not logged in.',
        recoverable: true
    },
    SUPABASE_INVALID_HOUSEHOLD_ID: {
        code: 'SUPABASE_INVALID_HOUSEHOLD_ID',
        message: 'Invalid Household ID.',
        recoverable: true
    },
    SUPABASE_SYNC_FAILED: {
        code: 'SUPABASE_SYNC_FAILED',
        message: 'Cloud sync failed. Please try again.',
        recoverable: true
    },

    APP_INITIALIZATION_FAILED: {
        code: 'APP_INITIALIZATION_FAILED',
        message: 'App initialization failed. Please refresh and try again.',
        recoverable: true
    },
    VIEW_CALENDAR_LOAD_FAILED: {
        code: 'VIEW_CALENDAR_LOAD_FAILED',
        message: 'Could not load calendar view.',
        recoverable: true
    },
    VIEW_ANALYTICS_LOAD_FAILED: {
        code: 'VIEW_ANALYTICS_LOAD_FAILED',
        message: 'Could not load analytics view.',
        recoverable: true
    },

    BULK_NO_BILLS_TO_CLEAR: {
        code: 'BULK_NO_BILLS_TO_CLEAR',
        message: 'There are no bills to clear.',
        recoverable: true
    },
    BULK_NO_BILLS_TO_UPDATE: {
        code: 'BULK_NO_BILLS_TO_UPDATE',
        message: 'There are no bills to update.',
        recoverable: true
    },
    BULK_NO_UNPAID_VISIBLE: {
        code: 'BULK_NO_UNPAID_VISIBLE',
        message: 'No unpaid bills visible to mark as paid.',
        recoverable: true
    },
    BILL_INVALID_DUE_DATE: {
        code: 'BILL_INVALID_DUE_DATE',
        message: 'Please provide a valid due date.',
        recoverable: true
    },
    BILL_REGENERATION_FAILED: {
        code: 'BILL_REGENERATION_FAILED',
        message: 'Recurring bill regeneration failed. Please try again.',
        recoverable: true
    },

    SETTINGS_NOT_CONFIGURED: {
        code: 'SETTINGS_NOT_CONFIGURED',
        message: 'Payment settings not configured. Please run setup again.',
        recoverable: true
    },
    SETTINGS_HOUSEHOLD_ID_REQUIRED: {
        code: 'SETTINGS_HOUSEHOLD_ID_REQUIRED',
        message: 'Please enter a Household ID.',
        recoverable: true
    },
    SETTINGS_CATEGORY_NAME_REQUIRED: {
        code: 'SETTINGS_CATEGORY_NAME_REQUIRED',
        message: 'Please enter a category name.',
        recoverable: true
    },
    SETTINGS_CATEGORY_NAME_TOO_LONG: {
        code: 'SETTINGS_CATEGORY_NAME_TOO_LONG',
        message: 'Category name must be 50 characters or less.',
        recoverable: true
    },
    SETTINGS_DUPLICATE_CATEGORY: {
        code: 'SETTINGS_DUPLICATE_CATEGORY',
        message: 'A category with that name already exists.',
        recoverable: true
    },
    SETTINGS_START_DATE_REQUIRED: {
        code: 'SETTINGS_START_DATE_REQUIRED',
        message: 'Start date is required.',
        recoverable: true
    },
    SETTINGS_PAYCHECK_AMOUNT_INVALID: {
        code: 'SETTINGS_PAYCHECK_AMOUNT_INVALID',
        message: 'Paycheck amount must be 0 or greater.',
        recoverable: true
    },
    CLEANUP_NO_UNUSED_CATEGORIES: {
        code: 'CLEANUP_NO_UNUSED_CATEGORIES',
        message: 'All categories are in use. Nothing to clean up!',
        recoverable: true
    },

    NOTIFICATIONS_UNSUPPORTED: {
        code: 'NOTIFICATIONS_UNSUPPORTED',
        message: 'This browser does not support notifications.',
        recoverable: true
    },
    NOTIFICATIONS_PERMISSION_REQUIRED: {
        code: 'NOTIFICATIONS_PERMISSION_REQUIRED',
        message: 'Notification permission is required for test reminders.',
        recoverable: true
    },
    NOTIFICATIONS_TEST_SEND_FAILED: {
        code: 'NOTIFICATIONS_TEST_SEND_FAILED',
        message: 'Could not send test reminder.',
        recoverable: true
    },
    NOTIFICATIONS_PERMISSION_NOT_GRANTED: {
        code: 'NOTIFICATIONS_PERMISSION_NOT_GRANTED',
        message: 'Notification permission was not granted. Reminders were saved as disabled.',
        recoverable: true
    },

    UNKNOWN: {
        code: 'UNKNOWN',
        message: 'Something went wrong. Please try again.',
        recoverable: true
    }
};

/**
 * Create an Error instance with standardized app error metadata.
 *
 * @param {keyof typeof ERROR_CODES} codeKey
 * @param {string} [overrideMessage]
 * @returns {Error & {code: string, recoverable: boolean}}
 */
export function createAppError(codeKey, overrideMessage) {
    const template = ERROR_CODES[codeKey] || ERROR_CODES.UNKNOWN;
    const err = new Error(overrideMessage || template.message);
    err.code = template.code;
    err.recoverable = template.recoverable;
    return err;
}

/**
 * Create a plain error object for service-layer `{ data, error }` responses.
 *
 * @param {keyof typeof ERROR_CODES} codeKey
 * @param {string} [overrideMessage]
 * @returns {{code: string, message: string, recoverable: boolean}}
 */
export function createAppErrorObject(codeKey, overrideMessage) {
    const template = ERROR_CODES[codeKey] || ERROR_CODES.UNKNOWN;
    return {
        code: template.code,
        message: overrideMessage || template.message,
        recoverable: template.recoverable
    };
}
