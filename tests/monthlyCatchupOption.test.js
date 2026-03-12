import { it, expect } from 'vitest';
import { getMissedMonthlyCycles, getNextNonOverdueMonthlyDate, formatLocalDate } from '../src/utils/dates.js';

it('should return zero missed cycles when due date is not overdue', () => {
    const dueDate = new Date(2026, 2, 15); // Mar 15, 2026
    const referenceDate = new Date(2026, 2, 10); // Mar 10, 2026
    expect(getMissedMonthlyCycles(dueDate, referenceDate)).toBe(0);
});

it('should count multiple missed monthly cycles', () => {
    const dueDate = new Date(2025, 10, 15); // Nov 15, 2025
    const referenceDate = new Date(2026, 2, 1); // Mar 1, 2026
    expect(getMissedMonthlyCycles(dueDate, referenceDate)).toBeGreaterThanOrEqual(3);
});

it('should advance to next non-overdue monthly due date', () => {
    const dueDate = new Date(2025, 10, 15); // Nov 15, 2025
    const referenceDate = new Date(2026, 2, 1); // Mar 1, 2026
    const nextDue = getNextNonOverdueMonthlyDate(dueDate, referenceDate);
    expect(nextDue).toBeInstanceOf(Date);
    expect(formatLocalDate(nextDue)).toBe('2026-03-15');
});
