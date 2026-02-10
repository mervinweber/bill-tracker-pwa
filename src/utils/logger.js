/**
 * Centralized Logger Utility
 * 
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Environment-aware output (dev vs production)
 * - No sensitive data logging
 * - Formatted log messages
 * 
 * @module logger
 */

const isDevelopment = process.env.NODE_ENV !== 'production' && 
                     (typeof window === 'undefined' || !window.location.hostname?.includes('vercel'));

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Set minimum log level - in production, skip debug logs
const MIN_LOG_LEVEL = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

/**
 * Format log message with timestamp and level
 * @private
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} Formatted message
 */
function formatMessage(level, message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Logger object - All logging should go through this
 * @type {Object}
 */
export const logger = {
    /**
     * Debug level - Only shown in development
     * @param {string} message - Log message
     * @param {*} data - Optional data to log
     */
    debug(message, data) {
        if (LOG_LEVELS.DEBUG >= MIN_LOG_LEVEL) {
            const formatted = formatMessage('DEBUG', message);
            if (data !== undefined) {
                console.log(formatted, data);
            } else {
                console.log(formatted);
            }
        }
    },

    /**
     * Info level - General information
     * @param {string} message - Log message
     * @param {*} data - Optional data to log
     */
    info(message, data) {
        if (LOG_LEVELS.INFO >= MIN_LOG_LEVEL) {
            const formatted = formatMessage('INFO', message);
            if (data !== undefined) {
                console.log(formatted, data);
            } else {
                console.log(formatted);
            }
        }
    },

    /**
     * Warn level - Warning messages
     * @param {string} message - Log message
     * @param {*} data - Optional data to log
     */
    warn(message, data) {
        if (LOG_LEVELS.WARN >= MIN_LOG_LEVEL) {
            const formatted = formatMessage('WARN', message);
            if (data !== undefined) {
                console.warn(formatted, data);
            } else {
                console.warn(formatted);
            }
        }
    },

    /**
     * Error level - Error messages
     * @param {string} message - Log message
     * @param {Error|*} error - Error object or additional data
     */
    error(message, error) {
        if (LOG_LEVELS.ERROR >= MIN_LOG_LEVEL) {
            const formatted = formatMessage('ERROR', message);
            if (error !== undefined) {
                if (error instanceof Error) {
                    console.error(formatted, `${error.name}: ${error.message}`);
                    // Include stack in development only
                    if (isDevelopment && error.stack) {
                        console.error(error.stack);
                    }
                } else {
                    console.error(formatted, error);
                }
            } else {
                console.error(formatted);
            }
        }
    },

    /**
     * Get current log level configuration
     * @returns {Object} Log level info
     */
    getConfig() {
        return {
            isDevelopment,
            minLogLevel: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === MIN_LOG_LEVEL),
            allLevels: LOG_LEVELS
        };
    }
};

export default logger;
