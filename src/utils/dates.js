/**
 * Helper function to create a date from string without timezone issues
 * @param {string} dateString - YYYY-MM-DD format
 * @returns {Date} Local date object
 */
export function createLocalDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Helper function to format a date as YYYY-MM-DD in local timezone
 * @param {Date} date - Date object
 * @returns {string} YYYY-MM-DD
 */
export function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculate the next due date based on recurrence pattern
 * @param {Date} currentDate 
 * @param {string} recurrence - 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly'
 * @returns {Date|null} Next due date
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
