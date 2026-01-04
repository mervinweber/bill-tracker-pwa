// This file contains utility functions for handling date-related operations, such as formatting and calculating due dates.

export function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

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

export function isDueToday(dueDate) {
    const today = new Date();
    return today.toDateString() === new Date(dueDate).toDateString();
}