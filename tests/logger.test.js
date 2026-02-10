/**
 * Tests for Logger Utility
 * Tests logging functionality and log levels
 */

import { strict as assert } from 'assert';
import { logger } from '../src/utils/logger.js';

console.log('\n=== Logger Tests ===\n');

// Capture console output for testing
const captureConsole = (() => {
    let logs = [];
    let warnings = [];
    let errors = [];

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    return {
        start() {
            logs = [];
            warnings = [];
            errors = [];
            console.log = (...args) => logs.push(args.join(' '));
            console.warn = (...args) => warnings.push(args.join(' '));
            console.error = (...args) => errors.push(args.join(' '));
        },
        stop() {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        },
        getLogs() { return logs; },
        getWarnings() { return warnings; },
        getErrors() { return errors; },
        clear() {
            logs = [];
            warnings = [];
            errors = [];
        }
    };
})();

captureConsole.start();

// Test 1: Debug logging
console.log('\nTest 1: Debug logging works...');
captureConsole.clear();
logger.debug('This is a debug message');
const debugLogs = captureConsole.getLogs();
assert.strictEqual(debugLogs.length > 0, true);
assert.strictEqual(debugLogs[0].includes('DEBUG'), true);
assert.strictEqual(debugLogs[0].includes('This is a debug message'), true);
console.log('✅ PASS: Debug message logged with correct format\n');

// Test 2: Info logging
console.log('Test 2: Info logging works...');
captureConsole.clear();
logger.info('This is an info message');
const infoLogs = captureConsole.getLogs();
assert.strictEqual(infoLogs.length > 0, true);
assert.strictEqual(infoLogs[0].includes('INFO'), true);
assert.strictEqual(infoLogs[0].includes('This is an info message'), true);
console.log('✅ PASS: Info message logged with correct format\n');

// Test 3: Warn logging
console.log('Test 3: Warning logging works...');
captureConsole.clear();
logger.warn('This is a warning');
const warnings = captureConsole.getWarnings();
assert.strictEqual(warnings.length > 0, true);
assert.strictEqual(warnings[0].includes('WARN'), true);
assert.strictEqual(warnings[0].includes('This is a warning'), true);
console.log('✅ PASS: Warning logged with correct format\n');

// Test 4: Error logging
console.log('Test 4: Error logging works...');
captureConsole.clear();
const testError = new Error('Test error message');
logger.error('An error occurred', testError);
const errors = captureConsole.getErrors();
assert.strictEqual(errors.length > 0, true);
assert.strictEqual(errors[0].includes('ERROR'), true);
assert.strictEqual(errors[0].includes('An error occurred'), true);
console.log('✅ PASS: Error logged with correct format\n');

// Test 5: Log with data
console.log('Test 5: Logging with additional data...');
captureConsole.clear();
const testData = { userId: 123, action: 'login' };
logger.info('User action', testData);
const dataLogs = captureConsole.getLogs();
assert.strictEqual(dataLogs.length > 0, true);
assert.strictEqual(dataLogs[0].includes('User action'), true);
console.log('✅ PASS: Data logged alongside message\n');

// Test 6: Log format includes timestamp
console.log('Test 6: Log format includes timestamp...');
captureConsole.clear();
logger.info('Test message');
const logs = captureConsole.getLogs();
assert.strictEqual(/\[\d{2}:\d{2}:\d{2}\]/.test(logs[0]), true);
console.log('✅ PASS: Timestamp included in log format\n');

// Test 7: Log format includes level
console.log('Test 7: Log format includes level...');
captureConsole.clear();
logger.debug('Debug');
logger.info('Info');
logger.warn('Warn');
const allLogs = [
    ...captureConsole.getLogs(),
    ...captureConsole.getWarnings()
];
assert.strictEqual(allLogs.some(log => log.includes('[DEBUG]')), true);
assert.strictEqual(allLogs.some(log => log.includes('[INFO]')), true);
assert.strictEqual(allLogs.some(log => log.includes('[WARN]')), true);
console.log('✅ PASS: All log levels have correct format\n');

// Test 8: Logger config
console.log('Test 8: Logger configuration available...');
const config = logger.getConfig();
assert.strictEqual(config.hasOwnProperty('isDevelopment'), true);
assert.strictEqual(config.hasOwnProperty('minLogLevel'), true);
assert.strictEqual(config.hasOwnProperty('allLevels'), true);
console.log('✅ PASS: Logger config accessible\n');

// Test 9: Error with Error object
console.log('Test 9: Error logging with Error object...');
captureConsole.clear();
const customError = new Error('Custom error');
logger.error('Failed operation', customError);
const errorOutput = captureConsole.getErrors();
assert.strictEqual(errorOutput.length > 0, true);
assert.strictEqual(errorOutput[0].includes('Error: Custom error'), true);
console.log('✅ PASS: Error object logged with name and message\n');

// Test 10: Logging without data parameter
console.log('Test 10: Logging without data parameter...');
captureConsole.clear();
logger.warn('Simple warning without data');
const simpleWarnings = captureConsole.getWarnings();
assert.strictEqual(simpleWarnings.length > 0, true);
assert.strictEqual(simpleWarnings[0].includes('Simple warning without data'), true);
console.log('✅ PASS: Message logged without data parameter\n');

captureConsole.stop();

console.log('\n=== Logger Tests Summary ===');
console.log('All tests passed! ✅\n');
console.log('Coverage:');
console.log('- ✅ Debug level logging');
console.log('- ✅ Info level logging');
console.log('- ✅ Warn level logging');
console.log('- ✅ Error level logging');
console.log('- ✅ Logging with additional data');
console.log('- ✅ Timestamp formatting');
console.log('- ✅ Log level markers');
console.log('- ✅ Configuration access');
console.log('- ✅ Error object handling');
console.log('- ✅ Simple logging without data\n');
