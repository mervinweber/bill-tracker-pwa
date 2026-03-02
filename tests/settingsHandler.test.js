/**
 * Settings Handler regression tests
 * Verifies non-schedule settings can be saved without forcing a new paycheck start date.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
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

console.log('📋 Running Settings Handler Tests...\n');

const settingsHandlerPath = path.join(__dirname, '../src/handlers/settingsHandler.js');
const settingsHandlerContent = fs.readFileSync(settingsHandlerPath, 'utf8');
const settingsHelpersPath = path.join(__dirname, '../src/utils/settingsHelpers.js');
const settingsHelpersContent = fs.readFileSync(settingsHelpersPath, 'utf8');

test('should detect when payment schedule fields are unchanged', () => {
    assert(
        settingsHandlerContent.includes('const paymentSettingsChanged ='),
        'missing paymentSettingsChanged comparison logic'
    );
});

test('should skip payment schedule validation when schedule fields are unchanged', () => {
    assert(
        settingsHandlerContent.includes('if (paymentSettingsChanged) {'),
        'missing conditional validation branch'
    );
    assert(
        settingsHandlerContent.includes('Payment settings unchanged; skipping schedule validation'),
        'missing explicit unchanged-settings branch'
    );
});

test('should compare all payment schedule fields when deciding if validation is required', () => {
    assert(
        settingsHandlerContent.includes('hasPaymentScheduleChanged(existingSettings, newSettings)'),
        'missing helper call for payment schedule comparison'
    );
    assert(
        settingsHelpersContent.includes('existingStartDate !== newStartDate'),
        'missing startDate comparison in helper logic'
    );
    assert(
        settingsHelpersContent.includes('existingFrequency !== newFrequency'),
        'missing frequency comparison in helper logic'
    );
    assert(
        settingsHelpersContent.includes('existingPayPeriods !== newPayPeriods'),
        'missing payPeriodsToShow comparison in helper logic'
    );
});

test('should only validate payment settings inside the changed-settings branch', () => {
    const handleSettingsSaveMatch = settingsHandlerContent.match(
        /async function handleSettingsSave\(e, modal\) \{[\s\S]*?\n\}/
    );
    assert(handleSettingsSaveMatch, 'could not locate handleSettingsSave function');

    const handleSettingsSaveContent = handleSettingsSaveMatch[0];
    const changedBranchMatch = handleSettingsSaveContent.match(
        /if \(paymentSettingsChanged\) \{([\s\S]*?)\}\s*else \{/
    );
    assert(changedBranchMatch, 'could not locate paymentSettingsChanged branch');

    const changedBranchContent = changedBranchMatch[1];
    assert(
        changedBranchContent.includes('validatePaymentSettings(newSettings)'),
        'validatePaymentSettings call must be inside paymentSettingsChanged branch'
    );

    const validateCallCount = (handleSettingsSaveContent.match(/validatePaymentSettings\(newSettings\)/g) || []).length;
    assert(validateCallCount === 1, 'validatePaymentSettings should be called exactly once in handleSettingsSave');
});

console.log(`\n📊 Settings Handler Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);
export { testsPassed, testsFailed };
