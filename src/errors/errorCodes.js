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
