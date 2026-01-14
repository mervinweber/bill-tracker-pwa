/**
 * Date Utilities Module
 * 
 * Handles date operations with proper timezone handling for local date strings.
 * All dates are treated as local timezone to avoid cross-timezone issues
 * when converting between Date objects and YYYY-MM-DD string format.
 * 
 * @module dates
 */

/**
 * Create a local date object from a date string without timezone conversion
 * 
 * @function createLocalDate
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * 
 * @returns {Date} Local date object constructed from the provided string.
 *   Time component set to midnight (00:00:00).
 *   Timezone is always treated as local system timezone.
 * 
 * @description Safely constructs Date objects from YYYY-MM-DD strings
 *   without automatic UTC timezone conversion. This prevents date
 *   shifting when working with dates across different timezones.
 * 
 * @example
 * const date = createLocalDate("2024-12-25");
 * console.log(date.getFullYear()); // 2024
 * console.log(date.getMonth() + 1); // 12
 * console.log(date.getDate()); // 25
 */
export function createLocalDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Format a date object as a YYYY-MM-DD string in local timezone
 * 
 * @function formatLocalDate
 * @param {Date} date - Date object to format
 * 
 * @returns {string} Formatted date string in YYYY-MM-DD format using local timezone.
 *   Month and day are zero-padded to 2 digits.
 * 
 * @description Converts Date objects to YYYY-MM-DD strings without
 *   timezone conversion, using the local system timezone.
 *   Inverse of createLocalDate().
 * 
 * @example
 * const date = new Date(2024, 11, 25); // December 25, 2024
 * console.log(formatLocalDate(date)); // "2024-12-25"
 */
export function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculate the next due date based on recurrence pattern
 * 
 * @function calculateNextDueDate
 * @param {Date} currentDate - Starting date for calculation
 * @param {string} recurrence - Recurrence frequency pattern
 *   Options: 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly', 'One-time'
 * 
 * @returns {Date|null} Next due date as local Date object.
 *   Returns null for 'One-time' recurrence or unknown patterns.
 *   Other patterns return a new Date object with adjusted date.
 * 
 * @description Computes the next due date by advancing the current date
 *   by the specified recurrence interval:
 *   - Weekly: 7 days
 *   - Bi-weekly: 14 days
 *   - Monthly: 1 month (handles month-end dates)
 *   - Yearly: 1 year
 *   - One-time: null (no next occurrence)
 * 
 * @example
 * const currentDue = createLocalDate("2024-12-15");
 * 
 * // Monthly bill due Jan 15
 * const nextMonthly = calculateNextDueDate(currentDue, "Monthly");
 * console.log(formatLocalDate(nextMonthly)); // "2025-01-15"
 * 
 * // Bi-weekly bill due Dec 29
 * const nextBiWeekly = calculateNextDueDate(currentDue, "Bi-weekly");
 * console.log(formatLocalDate(nextBiWeekly)); // "2024-12-29"
 * 
 * // One-time bill has no recurrence
 * const nextOneTime = calculateNextDueDate(currentDue, "One-time");
 * console.log(nextOneTime); // null
 */
export function calculateNextDueDate(currentDate, recurrence) {
    const nextDate = new Date(currentDate);
    switch (recurrence) {
        case 'Weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'Bi-weekly': nextDate.setDate(nextDate.getDate() + 14); break;
        case 'Monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'Yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        default: return null;
    }
    return nextDate;
}
/**
 * Generates paycheck dates based on settings
 * @param {Object} settings - payment settings (startDate, frequency, payPeriodsToShow)
 * @returns {Date[]} Array of paycheck Date objects
 */
export function generatePaycheckDates(settings) {
    const { startDate, frequency, payPeriodsToShow } = settings;
    const dates = [];
    const daysBetweenPaychecks = frequency === 'weekly' ? 7 : frequency === 'bi-weekly' ? 14 : 30;

    const start = createLocalDate(startDate);

    for (let i = 0; i < payPeriodsToShow; i++) {
        const payDate = new Date(start);
        payDate.setDate(payDate.getDate() + (i * daysBetweenPaychecks));
        dates.push(payDate);
    }
    return dates;
}
