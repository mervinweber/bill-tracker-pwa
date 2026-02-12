/**
 * Validation and Sanitization Utilities
 * 
 * Provides security-focused validation and sanitization functions to prevent:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL injection patterns
 * - Data corruption from malformed inputs
 * - JSON parsing errors
 * 
 * @module validation
 */

import logger from './logger.js';

/**
 * Sanitize user input to prevent XSS and injection attacks
 * 
 * @param {string} input - Raw user input
 * @param {number} maxLength - Maximum allowed length (default: 500)
 * @returns {string} Sanitized input safe for storage and display
 * 
 * @example
 * sanitizeInput('<script>alert("XSS")</script>', 100)
 * // Returns: 'scriptalert("XSS")/script' (HTML tags removed)
 */
export function sanitizeInput(input, maxLength = 500) {
    if (typeof input !== 'string') return '';

    return input
        .trim()
        .slice(0, maxLength)
        .replace(/[<>]/g, '') // Remove HTML brackets
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validate URL format
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid HTTP/HTTPS URL or empty (optional field)
 * 
 * @example
 * isValidURL('https://example.com') // true
 * isValidURL('javascript:alert(1)') // false
 * isValidURL('') // true (optional field)
 */
export function isValidURL(url) {
    if (!url || url.trim() === '') return true; // Optional field

    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Safe JSON parse with error handling and size limits
 * 
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Value to return on parse failure (default: null)
 * @returns {*} Parsed object or defaultValue on error
 * 
 * @example
 * safeJSONParse('{"name": "Test"}', [])
 * // Returns: { name: "Test" }
 * 
 * safeJSONParse('invalid json', [])
 * // Returns: []
 */
export function safeJSONParse(jsonString, defaultValue = null) {
    try {
        if (!jsonString || typeof jsonString !== 'string') {
            return defaultValue;
        }

        // Check size limit (5MB)
        if (jsonString.length > 5 * 1024 * 1024) {
            logger.warn('JSON data exceeds 5MB limit');
            return defaultValue;
        }

        return JSON.parse(jsonString);
    } catch (error) {
        logger.error('JSON parse error', error);
        return defaultValue;
    }
}

/**
 * Detect malicious patterns in text that could indicate XSS or injection attempts
 * 
 * @param {string} text - Text to check for malicious content
 * @returns {boolean} True if malicious patterns detected
 * 
 * @example
 * containsMaliciousContent('<script>alert(1)</script>') // true
 * containsMaliciousContent('Normal bill name') // false
 */
export function containsMaliciousContent(text) {
    if (typeof text !== 'string') return false;

    const patterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i, // Event handlers like onclick=
        /eval\(/i,
        /expression\(/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
    ];

    return patterns.some(pattern => pattern.test(text));
}

/**
 * Validate bill name with comprehensive checks
 * 
 * @param {string} name - Bill name to validate
 * @returns {Object} Validation result with isValid and error message
 * 
 * @example
 * validateBillName('Electric Bill')
 * // Returns: { isValid: true, error: null }
 * 
 * validateBillName('<script>alert(1)</script>')
 * // Returns: { isValid: false, error: 'Bill name contains invalid characters' }
 */
export function validateBillName(name) {
    if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Bill name is required' };
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
        return { isValid: false, error: 'Bill name cannot be empty' };
    }

    if (trimmed.length > 100) {
        return { isValid: false, error: 'Bill name must be 100 characters or less' };
    }

    if (containsMaliciousContent(trimmed)) {
        return { isValid: false, error: 'Bill name contains invalid characters' };
    }

    return { isValid: true, error: null };
}

/**
 * Validate date string format and range
 * 
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {boolean} allowPast - Whether to allow past dates (default: true)
 * @returns {Object} Validation result with isValid and error message
 * 
 * @example
 * validateDate('2026-02-15')
 * // Returns: { isValid: true, error: null }
 * 
 * validateDate('2050-01-01')
 * // Returns: { isValid: false, error: 'Date cannot be more than 10 years in the future' }
 */
export function validateDate(dateString, allowPast = true) {
    if (!dateString || typeof dateString !== 'string') {
        return { isValid: false, error: 'Date is required' };
    }

    // Check format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return { isValid: false, error: 'Date must be in YYYY-MM-DD format' };
    }

    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    // Check if valid date
    if (isNaN(date.getTime())) {
        return { isValid: false, error: 'Invalid date' };
    }

    // Additional check: ensure the date components match (catches Feb 30, etc.)
    if (date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day) {
        return { isValid: false, error: 'Invalid date' };
    }

    const now = new Date();
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(now.getFullYear() + 10);

    // Check if date is too far in the future
    if (date > tenYearsFromNow) {
        return { isValid: false, error: 'Date cannot be more than 10 years in the future' };
    }

    // Check if past date is allowed
    if (!allowPast) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
            return { isValid: false, error: 'Date cannot be in the past' };
        }
    }

    return { isValid: true, error: null };
}

/**
 * Validate amount (currency value)
 * 
 * @param {*} amount - Amount to validate
 * @param {number} maxAmount - Maximum allowed amount (default: 1000000)
 * @returns {Object} Validation result with isValid and error message
 * 
 * @example
 * validateAmount(150.50)
 * // Returns: { isValid: true, error: null }
 * 
 * validateAmount(-50)
 * // Returns: { isValid: false, error: 'Amount must be a positive number' }
 */
export function validateAmount(amount, maxAmount = 1000000) {
    const num = parseFloat(amount);

    if (isNaN(num)) {
        return { isValid: false, error: 'Amount must be a valid number' };
    }

    if (num < 0) {
        return { isValid: false, error: 'Amount must be a positive number' };
    }

    if (num > maxAmount) {
        return { isValid: false, error: `Amount cannot exceed $${maxAmount.toLocaleString()}` };
    }

    // Check for reasonable decimal places (max 2)
    const decimalPlaces = (num.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
        return { isValid: false, error: 'Amount can have at most 2 decimal places' };
    }

    return { isValid: true, error: null };
}

/**
 * Validate category name
 * 
 * @param {string} category - Category name to validate
 * @returns {Object} Validation result with isValid and error message
 */
export function validateCategory(category) {
    if (!category || typeof category !== 'string') {
        return { isValid: false, error: 'Category is required' };
    }

    const trimmed = category.trim();

    if (trimmed.length === 0) {
        return { isValid: false, error: 'Category cannot be empty' };
    }

    if (trimmed.length > 50) {
        return { isValid: false, error: 'Category must be 50 characters or less' };
    }

    if (containsMaliciousContent(trimmed)) {
        return { isValid: false, error: 'Category contains invalid characters' };
    }

    return { isValid: true, error: null };
}

/**
 * Validate notes field
 * 
 * @param {string} notes - Notes to validate
 * @returns {Object} Validation result with isValid and error message
 */
export function validateNotes(notes) {
    if (!notes) {
        return { isValid: true, error: null }; // Optional field
    }

    if (typeof notes !== 'string') {
        return { isValid: false, error: 'Notes must be text' };
    }

    if (notes.length > 500) {
        return { isValid: false, error: 'Notes must be 500 characters or less' };
    }

    if (containsMaliciousContent(notes)) {
        return { isValid: false, error: 'Notes contain invalid characters' };
    }

    return { isValid: true, error: null };
}

/**
 * Validate recurrence type
 * 
 * @param {string} recurrence - Recurrence type to validate (case-insensitive)
 * @returns {Object} Validation result with isValid and error message
 */
export function validateRecurrence(recurrence) {
    const validTypes = ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly'];

    if (!recurrence) {
        return { isValid: false, error: 'Recurrence type is required' };
    }

    // Case-insensitive comparison
    const normalizedRecurrence = recurrence.toLowerCase();
    const isValid = validTypes.some(type => type.toLowerCase() === normalizedRecurrence);

    if (!isValid) {
        return { isValid: false, error: `Recurrence must be one of: ${validTypes.join(', ')}` };
    }

    return { isValid: true, error: null };
}

/**
 * Validate payment settings object
 * 
 * Payment settings control:
 * - startDate: When paycheck cycle begins (YYYY-MM-DD format)
 * - frequency: Paycheck frequency (weekly, bi-weekly, monthly)
 * - payPeriodsToShow: Number of upcoming paychecks to display and filter
 * 
 * @param {Object} settings - Payment settings object to validate
 * @param {string} settings.startDate - Start date in YYYY-MM-DD format
 * @param {string} settings.frequency - Frequency type (weekly, bi-weekly, monthly)
 * @param {number} settings.payPeriodsToShow - Number of periods to show (positive integer)
 * @returns {Object} Validation result with isValid and errors array
 * 
 * @example
 * validatePaymentSettings({
 *   startDate: '2026-02-10',
 *   frequency: 'bi-weekly',
 *   payPeriodsToShow: 6
 * })
 * // Returns: { isValid: true, errors: [] }
 * 
 * @example
 * validatePaymentSettings({
 *   startDate: '2026-02-10',
 *   frequency: 'invalid',
 *   payPeriodsToShow: -1
 * })
 * // Returns: { isValid: false, errors: ['Frequency must be weekly, bi-weekly, or monthly', 'Pay periods to show must be a positive integer'] }
 */
export function validatePaymentSettings(settings) {
    const errors = [];

    // Validate settings object exists
    if (!settings || typeof settings !== 'object') {
        return {
            isValid: false,
            errors: ['Payment settings must be an object']
        };
    }

    // Validate startDate
    if (!settings.startDate || typeof settings.startDate !== 'string') {
        errors.push('Start date is required');
    } else {
        // Check format YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.startDate)) {
            errors.push('Start date must be in YYYY-MM-DD format');
        } else {
            const [year, month, day] = settings.startDate.split('-').map(Number);
            const startDate = new Date(year, month - 1, day);

            // Check if valid date
            if (isNaN(startDate.getTime())) {
                errors.push('Start date is invalid');
            } else {
                // Additional check: ensure date components match (catches Feb 30, etc.)
                if (startDate.getFullYear() !== year ||
                    startDate.getMonth() !== month - 1 ||
                    startDate.getDate() !== day) {
                    errors.push('Start date is invalid');
                } else {
                    // Check if date is in the past
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (startDate < today) {
                        errors.push('Start date cannot be in the past');
                    }

                    // Check if date is too far in the future (more than 2 years)
                    const twoYearsFromNow = new Date();
                    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
                    
                    if (startDate > twoYearsFromNow) {
                        errors.push('Start date cannot be more than 2 years in the future');
                    }
                }
            }
        }
    }

    // Validate frequency
    if (!settings.frequency || typeof settings.frequency !== 'string') {
        errors.push('Frequency is required');
    } else {
        const validFrequencies = ['weekly', 'bi-weekly', 'monthly'];
        const normalizedFrequency = settings.frequency.toLowerCase().trim();
        
        if (!validFrequencies.includes(normalizedFrequency)) {
            errors.push('Frequency must be weekly, bi-weekly, or monthly');
        }
    }

    // Validate payPeriodsToShow
    if (settings.payPeriodsToShow === undefined || settings.payPeriodsToShow === null) {
        errors.push('Pay periods to show is required');
    } else if (typeof settings.payPeriodsToShow !== 'number') {
        errors.push('Pay periods to show must be a number');
    } else if (!Number.isInteger(settings.payPeriodsToShow)) {
        errors.push('Pay periods to show must be an integer');
    } else if (settings.payPeriodsToShow <= 0) {
        errors.push('Pay periods to show must be a positive integer');
    } else if (settings.payPeriodsToShow > 52) {
        errors.push('Pay periods to show cannot exceed 52');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}
