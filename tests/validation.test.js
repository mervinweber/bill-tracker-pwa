/**
 * Validation Utilities Test Suite
 * Tests security-focused validation and sanitization functions
 */

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
    validateRecurrence
} from '../src/utils/validation.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}. ${message}`);
    }
}

function test(description, testFn) {
    try {
        testFn();
        console.log(`✅ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ ${description}: ${error.message}`);
        testsFailed++;
    }
}

console.log('🔒 Running Validation Security Tests...\n');

// ============================================================================
// sanitizeInput() Tests
// ============================================================================

test('sanitizeInput: should remove HTML tags', () => {
    const result = sanitizeInput('<script>alert("XSS")</script>');
    assert(!result.includes('<'), 'Should not contain opening bracket');
    assert(!result.includes('>'), 'Should not contain closing bracket');
});

test('sanitizeInput: should remove control characters', () => {
    const result = sanitizeInput('Test\x00\x01\x02String');
    assert(result === 'TestString', 'Should remove null bytes and control chars');
});

test('sanitizeInput: should normalize whitespace', () => {
    const result = sanitizeInput('Test    Multiple   Spaces');
    assertEqual(result, 'Test Multiple Spaces', 'Should normalize to single spaces');
});

test('sanitizeInput: should enforce max length', () => {
    const longString = 'a'.repeat(1000);
    const result = sanitizeInput(longString, 100);
    assert(result.length === 100, 'Should truncate to max length');
});

test('sanitizeInput: should handle non-string input', () => {
    assertEqual(sanitizeInput(null), '', 'Should return empty string for null');
    assertEqual(sanitizeInput(undefined), '', 'Should return empty string for undefined');
    assertEqual(sanitizeInput(123), '', 'Should return empty string for number');
});

test('sanitizeInput: should preserve valid text', () => {
    const result = sanitizeInput('Electric Bill - January 2026');
    assertEqual(result, 'Electric Bill - January 2026', 'Should preserve normal text');
});

// ============================================================================
// isValidURL() Tests
// ============================================================================

test('isValidURL: should accept valid HTTPS URLs', () => {
    assert(isValidURL('https://example.com'), 'Should accept HTTPS URL');
});

test('isValidURL: should accept valid HTTP URLs', () => {
    assert(isValidURL('http://example.com'), 'Should accept HTTP URL');
});

test('isValidURL: should reject javascript: protocol', () => {
    assert(!isValidURL('javascript:alert(1)'), 'Should reject javascript protocol');
});

test('isValidURL: should reject data: protocol', () => {
    assert(!isValidURL('data:text/html,<script>alert(1)</script>'), 'Should reject data protocol');
});

test('isValidURL: should accept empty string (optional field)', () => {
    assert(isValidURL(''), 'Should accept empty string');
    assert(isValidURL(null), 'Should accept null');
});

test('isValidURL: should reject malformed URLs', () => {
    assert(!isValidURL('not a url'), 'Should reject malformed URL');
});

// ============================================================================
// safeJSONParse() Tests
// ============================================================================

test('safeJSONParse: should parse valid JSON', () => {
    const result = safeJSONParse('{"name": "Test"}');
    assertEqual(result.name, 'Test', 'Should parse valid JSON');
});

test('safeJSONParse: should return default on invalid JSON', () => {
    const result = safeJSONParse('invalid json', []);
    assertEqual(result, [], 'Should return default value');
});

test('safeJSONParse: should handle null input', () => {
    const result = safeJSONParse(null, {});
    assertEqual(result, {}, 'Should return default for null');
});

test('safeJSONParse: should handle non-string input', () => {
    const result = safeJSONParse(123, 'default');
    assertEqual(result, 'default', 'Should return default for non-string');
});

test('safeJSONParse: should reject oversized JSON', () => {
    const largeString = '{"data": "' + 'x'.repeat(6 * 1024 * 1024) + '"}';
    const result = safeJSONParse(largeString, null);
    assertEqual(result, null, 'Should reject JSON over 5MB');
});

test('safeJSONParse: should parse arrays', () => {
    const result = safeJSONParse('[1, 2, 3]');
    assertEqual(result, [1, 2, 3], 'Should parse arrays');
});

// ============================================================================
// containsMaliciousContent() Tests
// ============================================================================

test('containsMaliciousContent: should detect <script> tags', () => {
    assert(containsMaliciousContent('<script>alert(1)</script>'), 'Should detect script tags');
});

test('containsMaliciousContent: should detect javascript: protocol', () => {
    assert(containsMaliciousContent('javascript:alert(1)'), 'Should detect javascript protocol');
});

test('containsMaliciousContent: should detect event handlers', () => {
    assert(containsMaliciousContent('onclick=alert(1)'), 'Should detect onclick');
    assert(containsMaliciousContent('onload=malicious()'), 'Should detect onload');
});

test('containsMaliciousContent: should detect eval()', () => {
    assert(containsMaliciousContent('eval(maliciousCode)'), 'Should detect eval');
});

test('containsMaliciousContent: should detect iframe tags', () => {
    assert(containsMaliciousContent('<iframe src="evil.com"></iframe>'), 'Should detect iframe');
});

test('containsMaliciousContent: should allow normal text', () => {
    assert(!containsMaliciousContent('Electric Bill'), 'Should allow normal text');
    assert(!containsMaliciousContent('Rent & Utilities'), 'Should allow ampersands');
});

// ============================================================================
// validateBillName() Tests
// ============================================================================

test('validateBillName: should accept valid names', () => {
    const result = validateBillName('Electric Bill');
    assert(result.isValid, 'Should accept valid name');
    assertEqual(result.error, null, 'Should have no error');
});

test('validateBillName: should reject empty names', () => {
    const result = validateBillName('   ');
    assert(!result.isValid, 'Should reject empty name');
});

test('validateBillName: should reject names over 100 chars', () => {
    const result = validateBillName('a'.repeat(101));
    assert(!result.isValid, 'Should reject long names');
});

test('validateBillName: should reject malicious content', () => {
    const result = validateBillName('<script>alert(1)</script>');
    assert(!result.isValid, 'Should reject script tags');
});

test('validateBillName: should accept names with special chars', () => {
    const result = validateBillName('Bill & Utilities (2026) - "Important"');
    assert(result.isValid, 'Should accept special characters');
});

// ============================================================================
// validateDate() Tests
// ============================================================================

test('validateDate: should accept valid dates', () => {
    const result = validateDate('2026-02-15');
    assert(result.isValid, 'Should accept valid date');
});

test('validateDate: should reject invalid format', () => {
    const result = validateDate('02/15/2026');
    assert(!result.isValid, 'Should reject MM/DD/YYYY format');
});

test('validateDate: should reject dates too far in future', () => {
    const result = validateDate('2050-01-01');
    assert(!result.isValid, 'Should reject dates >10 years in future');
});

test('validateDate: should accept past dates by default', () => {
    const result = validateDate('2020-01-01');
    assert(result.isValid, 'Should accept past dates by default');
});

test('validateDate: should reject past dates when allowPast=false', () => {
    const result = validateDate('2020-01-01', false);
    assert(!result.isValid, 'Should reject past dates when not allowed');
});

test('validateDate: should reject invalid dates', () => {
    const result = validateDate('2026-02-30'); // Feb 30 doesn't exist
    assert(!result.isValid, 'Should reject invalid dates');
});

// ============================================================================
// validateAmount() Tests
// ============================================================================

test('validateAmount: should accept valid amounts', () => {
    const result = validateAmount(150.50);
    assert(result.isValid, 'Should accept valid amount');
});

test('validateAmount: should reject negative amounts', () => {
    const result = validateAmount(-50);
    assert(!result.isValid, 'Should reject negative amounts');
});

test('validateAmount: should reject non-numeric values', () => {
    const result = validateAmount('not a number');
    assert(!result.isValid, 'Should reject non-numeric');
});

test('validateAmount: should reject amounts over max', () => {
    const result = validateAmount(2000000);
    assert(!result.isValid, 'Should reject amounts over $1M');
});

test('validateAmount: should reject more than 2 decimal places', () => {
    const result = validateAmount(150.555);
    assert(!result.isValid, 'Should reject >2 decimal places');
});

test('validateAmount: should accept zero', () => {
    const result = validateAmount(0);
    assert(result.isValid, 'Should accept zero');
});

// ============================================================================
// validateCategory() Tests
// ============================================================================

test('validateCategory: should accept valid categories', () => {
    const result = validateCategory('Utilities');
    assert(result.isValid, 'Should accept valid category');
});

test('validateCategory: should reject empty categories', () => {
    const result = validateCategory('');
    assert(!result.isValid, 'Should reject empty category');
});

test('validateCategory: should reject categories over 50 chars', () => {
    const result = validateCategory('a'.repeat(51));
    assert(!result.isValid, 'Should reject long categories');
});

test('validateCategory: should reject malicious content', () => {
    const result = validateCategory('<script>alert(1)</script>');
    assert(!result.isValid, 'Should reject malicious content');
});

// ============================================================================
// validateNotes() Tests
// ============================================================================

test('validateNotes: should accept valid notes', () => {
    const result = validateNotes('Payment due on the 15th');
    assert(result.isValid, 'Should accept valid notes');
});

test('validateNotes: should accept empty notes (optional)', () => {
    const result = validateNotes('');
    assert(result.isValid, 'Should accept empty notes');
    const result2 = validateNotes(null);
    assert(result2.isValid, 'Should accept null notes');
});

test('validateNotes: should reject notes over 500 chars', () => {
    const result = validateNotes('a'.repeat(501));
    assert(!result.isValid, 'Should reject long notes');
});

test('validateNotes: should reject malicious content', () => {
    const result = validateNotes('<script>alert(1)</script>');
    assert(!result.isValid, 'Should reject malicious content');
});

// ============================================================================
// validateRecurrence() Tests
// ============================================================================

test('validateRecurrence: should accept valid recurrence types', () => {
    const validTypes = ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly'];
    validTypes.forEach(type => {
        const result = validateRecurrence(type);
        assert(result.isValid, `Should accept ${type}`);
    });
});

test('validateRecurrence: should reject invalid types', () => {
    const result = validateRecurrence('Daily');
    assert(!result.isValid, 'Should reject invalid type');
});

test('validateRecurrence: should reject empty recurrence', () => {
    const result = validateRecurrence('');
    assert(!result.isValid, 'Should reject empty recurrence');
});

// ============================================================================
// Test Summary
// ============================================================================

console.log(`\n📊 Validation Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed === 0) {
    console.log('🎉 All validation tests passed!');
    process.exit(0);
} else {
    console.log(`⚠️ ${testsFailed} test(s) failed`);
    process.exit(1);
}
