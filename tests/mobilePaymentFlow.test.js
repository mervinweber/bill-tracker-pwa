import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

const test = (name, fn) => {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        failed++;
    }
};

const appPath = path.join(__dirname, '../src/app.js');
const appContent = fs.readFileSync(appPath, 'utf8');

console.log('Mobile Payment Flow Tests\n');

test('Payment modal includes bill summary context', () => {
    if (!appContent.includes('paymentBillName')) throw new Error('Missing bill name summary field');
    if (!appContent.includes('paymentRemainingAmount')) throw new Error('Missing remaining amount summary field');
});

test('Payment modal includes one-tap quick pay action', () => {
    if (!appContent.includes('quickPayFullBtn')) throw new Error('Missing quick pay button');
    if (!appContent.includes('Pay Full Today')) throw new Error('Missing quick pay button label');
});

test('Quick pay button is wired to payment submission', () => {
    if (!appContent.includes("document.getElementById('quickPayFullBtn').addEventListener('click'")) {
        throw new Error('Missing quick pay click handler');
    }
    if (!appContent.includes('submitPayment(billId')) throw new Error('Quick pay does not call submitPayment');
});

test('Optional payment metadata is collapsible', () => {
    if (!appContent.includes('paymentOptionalDetails')) throw new Error('Missing optional details container');
    if (!appContent.includes('<details id="paymentOptionalDetails"')) {
        throw new Error('Optional metadata is not using details disclosure');
    }
});

console.log('\n' + '='.repeat(50));
console.log(`Tests Passed: ${passed}`);
console.log(`Tests Failed: ${failed}`);
console.log(`Total Tests: ${passed + failed}`);
console.log('='.repeat(50));

if (failed > 0) {
    process.exit(1);
}
