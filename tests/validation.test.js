import { it, expect } from 'vitest';
import {
    sanitizeInput,
    isValidURL,
    safeJSONParse,
    containsMaliciousContent,
    validateBillName,
    validateDate,
    validateAmount,
    validateCategory,
    validateNotes,
    validateRecurrence,
    validatePaymentSettings
} from '../src/utils/validation.js';

const getFutureDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
};

// ---- sanitizeInput ----
it('sanitizeInput removes HTML tags', () => {
    const result = sanitizeInput('<script>alert("XSS")</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
});

it('sanitizeInput removes control characters', () => {
    expect(sanitizeInput('Test\x00\x01String')).toBe('TestString');
});

it('sanitizeInput handles null input', () => {
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput(undefined)).toBe('');
});

it('sanitizeInput preserves valid text', () => {
    expect(sanitizeInput('Electric Bill - January 2026')).toBe('Electric Bill - January 2026');
});

// ---- isValidURL ----
it('isValidURL accepts valid HTTPS URL', () => {
    expect(isValidURL('https://example.com')).toBe(true);
});

it('isValidURL accepts empty string (optional field)', () => {
    expect(isValidURL('')).toBe(true);
    expect(isValidURL(null)).toBe(true);
});

it('isValidURL rejects javascript protocol', () => {
    expect(isValidURL('javascript:alert(1)')).toBe(false);
});

// ---- safeJSONParse ----
it('safeJSONParse parses valid JSON', () => {
    expect(safeJSONParse('{"name":"Test"}')).toEqual({ name: 'Test' });
});

it('safeJSONParse returns default on invalid JSON', () => {
    expect(safeJSONParse('invalid json', [])).toEqual([]);
});

it('safeJSONParse returns default for null', () => {
    expect(safeJSONParse(null, {})).toEqual({});
});

it('safeJSONParse parses arrays', () => {
    expect(safeJSONParse('[1,2,3]')).toEqual([1, 2, 3]);
});

// ---- containsMaliciousContent ----
it('containsMaliciousContent detects script tags', () => {
    expect(containsMaliciousContent('<script>alert(1)</script>')).toBe(true);
});

it('containsMaliciousContent detects javascript protocol', () => {
    expect(containsMaliciousContent('javascript:alert(1)')).toBe(true);
});

it('containsMaliciousContent allows normal text', () => {
    expect(containsMaliciousContent('Electric Bill')).toBe(false);
});

// ---- validateBillName ----
it('validateBillName accepts valid names', () => {
    expect(validateBillName('Electric Bill').isValid).toBe(true);
});

it('validateBillName rejects empty names', () => {
    expect(validateBillName('   ').isValid).toBe(false);
});

it('validateBillName rejects names over 100 chars', () => {
    expect(validateBillName('a'.repeat(101)).isValid).toBe(false);
});

it('validateBillName rejects malicious content', () => {
    expect(validateBillName('<script>alert(1)</script>').isValid).toBe(false);
});

// ---- validateDate ----
it('validateDate accepts valid dates', () => {
    expect(validateDate('2026-02-15').isValid).toBe(true);
});

it('validateDate rejects invalid format', () => {
    expect(validateDate('02/15/2026').isValid).toBe(false);
});

it('validateDate rejects Feb 30', () => {
    expect(validateDate('2026-02-30').isValid).toBe(false);
});

it('validateDate rejects past dates when allowPast=false', () => {
    expect(validateDate('2020-01-01', false).isValid).toBe(false);
});

// ---- validateAmount ----
it('validateAmount accepts valid amounts', () => {
    expect(validateAmount(150.50).isValid).toBe(true);
});

it('validateAmount rejects negative amounts', () => {
    expect(validateAmount(-50).isValid).toBe(false);
});

it('validateAmount rejects non-numeric values', () => {
    expect(validateAmount('not a number').isValid).toBe(false);
});

it('validateAmount accepts zero', () => {
    expect(validateAmount(0).isValid).toBe(true);
});

it('validateAmount rejects amounts over max', () => {
    expect(validateAmount(2000000).isValid).toBe(false);
});

// ---- validateCategory ----
it('validateCategory accepts valid categories', () => {
    expect(validateCategory('Utilities').isValid).toBe(true);
});

it('validateCategory rejects empty categories', () => {
    expect(validateCategory('').isValid).toBe(false);
});

it('validateCategory rejects categories over 50 chars', () => {
    expect(validateCategory('a'.repeat(51)).isValid).toBe(false);
});

// ---- validateNotes ----
it('validateNotes accepts valid notes', () => {
    expect(validateNotes('Payment due on the 15th').isValid).toBe(true);
});

it('validateNotes accepts empty notes', () => {
    expect(validateNotes('').isValid).toBe(true);
    expect(validateNotes(null).isValid).toBe(true);
});

it('validateNotes rejects notes over 500 chars', () => {
    expect(validateNotes('a'.repeat(501)).isValid).toBe(false);
});

// ---- validateRecurrence ----
it('validateRecurrence accepts valid types', () => {
    ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly'].forEach(t => {
        expect(validateRecurrence(t).isValid).toBe(true);
    });
});

it('validateRecurrence rejects invalid types', () => {
    expect(validateRecurrence('Daily').isValid).toBe(false);
});

// ---- validatePaymentSettings ----
it('validatePaymentSettings accepts valid settings', () => {
    expect(validatePaymentSettings({ startDate: getFutureDate(14), frequency: 'bi-weekly', payPeriodsToShow: 6 }).isValid).toBe(true);
});

it('validatePaymentSettings rejects null input', () => {
    expect(validatePaymentSettings(null).isValid).toBe(false);
});

it('validatePaymentSettings rejects invalid frequency', () => {
    expect(validatePaymentSettings({ startDate: getFutureDate(14), frequency: 'daily', payPeriodsToShow: 6 }).isValid).toBe(false);
});

it('validatePaymentSettings rejects missing startDate', () => {
    expect(validatePaymentSettings({ frequency: 'bi-weekly', payPeriodsToShow: 6 }).isValid).toBe(false);
});

it('validatePaymentSettings rejects zero payPeriods', () => {
    expect(validatePaymentSettings({ startDate: getFutureDate(14), frequency: 'bi-weekly', payPeriodsToShow: 0 }).isValid).toBe(false);
});

it('validatePaymentSettings rejects payPeriods over 52', () => {
    expect(validatePaymentSettings({ startDate: getFutureDate(14), frequency: 'bi-weekly', payPeriodsToShow: 53 }).isValid).toBe(false);
});

it('validatePaymentSettings reports multiple errors', () => {
    const result = validatePaymentSettings({ startDate: 'bad', frequency: 'bad', payPeriodsToShow: -1 });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
});
