import { it, expect } from 'vitest';
import { hasPaymentScheduleChanged } from '../src/utils/settingsHelpers.js';

it('should return false when schedule values are unchanged', () => {
    const s = { startDate: '2026-03-01', frequency: 'bi-weekly', payPeriodsToShow: 6 };
    expect(hasPaymentScheduleChanged(s, { ...s })).toBe(false);
});

it('should return true when startDate changes', () => {
    const s = { startDate: '2026-03-01', frequency: 'bi-weekly', payPeriodsToShow: 6 };
    expect(hasPaymentScheduleChanged(s, { ...s, startDate: '2026-03-02' })).toBe(true);
});

it('should return true when frequency changes', () => {
    const s = { startDate: '2026-03-01', frequency: 'bi-weekly', payPeriodsToShow: 6 };
    expect(hasPaymentScheduleChanged(s, { ...s, frequency: 'weekly' })).toBe(true);
});

it('should return true when payPeriodsToShow changes', () => {
    const s = { startDate: '2026-03-01', frequency: 'bi-weekly', payPeriodsToShow: 6 };
    expect(hasPaymentScheduleChanged(s, { ...s, payPeriodsToShow: 8 })).toBe(true);
});

it('should ignore paycheck amount-only changes for schedule detection', () => {
    const s = { startDate: '2026-03-01', frequency: 'bi-weekly', payPeriodsToShow: 6, amount: 2500 };
    expect(hasPaymentScheduleChanged(s, { ...s, amount: 2600 })).toBe(false);
});

it('should return true when customDays changes for custom frequency', () => {
    const s = { startDate: '2026-03-01', frequency: 'custom', payPeriodsToShow: 6, customDays: 90 };
    expect(hasPaymentScheduleChanged(s, { ...s, customDays: 45 })).toBe(true);
});
