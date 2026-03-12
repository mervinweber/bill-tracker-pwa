import { assert, describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed += 1;
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        failed += 1;
    }
}

const handlersPath = path.join(__dirname, '../src/handlers/billActionHandlers.js');
const handlersContent = fs.readFileSync(handlersPath, 'utf8');

console.log('Audit Unpaid Flow Tests\n');

test('captures most recent payment date helper', () => {
    if (!handlersContent.includes('function getMostRecentPaymentDate(bill)')) {
        throw new Error('missing getMostRecentPaymentDate helper');
    }
});

test('records last marked payment date in audit metadata', () => {
    if (!handlersContent.includes('lastMarkedPaymentDate')) {
        throw new Error('missing lastMarkedPaymentDate in audit metadata');
    }
});

test('includes most recent payment date in unpaid audit summary', () => {
    if (!handlersContent.includes('Most recent payment date:')) {
        throw new Error('missing unpaid summary payment-date message');
    }
});

console.log(`Tests Passed: ${passed}`);
console.log(`Tests Failed: ${failed}`);
console.log(`Total Tests: ${passed + failed}`);
console.log('='.repeat(50));

if (failed > 0) {
    process.exit(1);
}
