/**
 * Error Handling & Recovery Utilities
 * Provides retry logic, error messages, and graceful degradation
 */

/**
 * Retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 3000,
    backoffMultiplier: 2,
    shouldRetry: (error) => true
};

/**
 * Execute a function with automatic retry on failure
 * @param {Function} fn - The function to execute
 * @param {Object} config - Retry configuration
 * @returns {Promise} Result of successful execution
 */
export async function withRetry(fn, config = {}) {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError;
    let delay = finalConfig.initialDelay;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
        try {
            const result = await Promise.resolve(fn());
            if (attempt > 1) {
                console.log(`✅ Retry successful on attempt ${attempt}`);
            }
            return result;
        } catch (error) {
            lastError = error;

            if (!finalConfig.shouldRetry(error)) {
                throw error;
            }

            if (attempt < finalConfig.maxAttempts) {
                console.warn(
                    `⚠️ Attempt ${attempt} failed. Retrying in ${delay}ms...`,
                    error.message
                );
                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
            }
        }
    }

    throw new Error(
        `Failed after ${finalConfig.maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`
    );
}

/**
 * Safe JSON parse with fallback
 * @param {string} json - JSON string to parse
 * @param {*} fallback - Value to return if parse fails
 * @returns {*} Parsed object or fallback
 */
export function safeParse(json, fallback = null) {
    try {
        return JSON.parse(json);
    } catch (error) {
        console.warn('Failed to parse JSON, using fallback:', error.message);
        return fallback;
    }
}

/**
 * Safe JSON stringify with fallback
 * @param {*} obj - Object to stringify
 * @param {string} fallback - Value to return if stringify fails
 * @returns {string} Stringified object or fallback
 */
export function safeStringify(obj, fallback = '{}') {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        console.warn('Failed to stringify object, using fallback:', error.message);
        return fallback;
    }
}

/**
 * Safe localStorage access
 * @param {string} key - localStorage key
 * @param {*} fallback - Value to return on error
 * @returns {*} Stored value or fallback
 */
export function safeGetFromStorage(key, fallback = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? safeParse(item, fallback) : fallback;
    } catch (error) {
        console.warn(`Failed to read from localStorage (${key}):`, error.message);
        return fallback;
    }
}

/**
 * Safe localStorage write
 * @param {string} key - localStorage key
 * @param {*} value - Value to store
 * @returns {boolean} Success status
 */
export function safeSetToStorage(key, value) {
    try {
        localStorage.setItem(key, safeStringify(value));
        return true;
    } catch (error) {
        console.error(`Failed to write to localStorage (${key}):`, error.message);

        // Handle quota exceeded
        if (error.name === 'QuotaExceededError') {
            console.error('❌ localStorage quota exceeded. Please clear some data.');
        }

        return false;
    }
}

/**
 * Validation error with detailed messages
 */
export class ValidationError extends Error {
    constructor(message, field = null, value = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
    }

    toUserMessage() {
        return `⚠️ ${this.field ? `${this.field}: ` : ''}${this.message}`;
    }
}

/**
 * Format error for user display
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export function formatErrorMessage(error) {
    if (error instanceof ValidationError) {
        return error.toUserMessage();
    }

    if (error.message.includes('localStorage')) {
        return '💾 Unable to save data. Please check your browser storage.';
    }

    if (error.message.includes('Network')) {
        return '🌐 Network error. Please check your connection.';
    }

    if (error.message.includes('Invalid')) {
        return `⚠️ Invalid input: ${error.message}`;
    }

    return `❌ Error: ${error.message || 'An unexpected error occurred'}`;
}

/**
 * Attempt operation with graceful fallback
 * @param {Function} operation - Primary operation to attempt
 * @param {Function} fallback - Fallback operation if primary fails
 * @returns {*} Result of successful operation
 */
export async function withFallback(operation, fallback) {
    try {
        return await Promise.resolve(operation());
    } catch (error) {
        console.warn('Primary operation failed, attempting fallback:', error.message);
        try {
            return await Promise.resolve(fallback());
        } catch (fallbackError) {
            throw new Error(
                `Both primary and fallback operations failed: ${error.message}`
            );
        }
    }
}

/**
 * Validate required fields in an object
 * @param {Object} obj - Object to validate
 * @param {Array<string>} requiredFields - Required field names
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateRequired(obj, requiredFields) {
    const errors = [];

    for (const field of requiredFields) {
        const value = obj[field];
        if (value === undefined || value === null || value === '') {
            errors.push(`${field} is required`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Debounce a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
    let timeoutId;

    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Throttle a function
 * @param {Function} fn - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, delay) {
    let lastCall = 0;

    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            fn(...args);
            lastCall = now;
        }
    };
}
