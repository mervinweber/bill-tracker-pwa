/**
 * Date Helper Utilities
 * 
 * Legacy date utility functions for formatting and recurrence calculations.
 * Note: Prefer using 'dates.js' module for better timezone handling and consistency.
 * 
 * @module dateHelpers
 * @deprecated Use dates.js module (createLocalDate, formatLocalDate, calculateNextDueDate) instead
 */

/**
 * Format a date to locale-specific string
 * 
 * @function formatDate
 * @param {Date|string} date - Date object or date string to format
 * 
 * @returns {string} Formatted date string using browser's locale.
 *   Example: "12/25/2024" (US) or "25/12/2024" (UK)
 * 
 * @description Converts date to locale-specific format using toLocaleDateString().
 *   Automatically adapts to user's system locale.
 * 
 * @deprecated Use formatLocalDate from dates.js for YYYY-MM-DD format
 * 
 * @example
 * const date = new Date(2024, 11, 25);
 * console.log(formatDate(date)); // "12/25/2024" (varies by locale)
 */
export function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

/**
 * Calculate due date based on recurrence pattern
 * 
 * @function calculateDueDate
 * @param {Date} startDate - Starting date for calculation
 * @param {string} recurrence - Recurrence frequency (lowercase)
 *   Options: 'weekly', 'bi-weekly', 'monthly', 'yearly'
 * 
 * @returns {Date} New date object with recurrence applied
 * 
 * @description Advances start date by specified recurrence interval.
 *   Note: Uses lowercase recurrence strings (different from calculateNextDueDate).
 *   - weekly: 7 days forward
 *   - bi-weekly: 14 days forward
 *   - monthly: 1 month forward
 *   - yearly: 1 year forward
 * 
 * @deprecated Use calculateNextDueDate from dates.js for consistency
 * 
 * @example
 * const startDate = new Date(2024, 11, 15);
 * const nextMonth = calculateDueDate(startDate, 'monthly');
 * // Returns date for 2025-01-15
 */
export function calculateDueDate(startDate, recurrence) {
    const date = new Date(startDate);
    switch (recurrence) {
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'bi-weekly':
            date.setDate(date.getDate() + 14);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            break;
    }
    return date;
}

/**
 * Check if a due date is today
 * 
 * @function isDueToday
 * @param {Date|string} dueDate - Date to check against today
 * 
 * @returns {boolean} True if the due date is today, false otherwise
 * 
 * @description Compares date strings without time component.
 *   Returns true only if due date matches today's calendar date.
 * 
 * @deprecated No recommended replacement - implement directly in components
 * 
 * @example
 * const today = new Date();
 * console.log(isDueToday(today)); // true
 * 
 * const tomorrow = new Date(today.getTime() + 24*60*60*1000);
 * console.log(isDueToday(tomorrow)); // false
 */
export function isDueToday(dueDate) {
    const today = new Date();
    return today.toDateString() === new Date(dueDate).toDateString();
}