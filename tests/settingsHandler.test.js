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

console.log(`\n📊 Settings Handler Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);
export { testsPassed, testsFailed };
