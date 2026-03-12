import { it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appPath = path.join(__dirname, '../src/app.js');
const appContent = fs.readFileSync(appPath, 'utf8');
const handlersPath = path.join(__dirname, '../src/handlers/billActionHandlers.js');
const handlersContent = fs.readFileSync(handlersPath, 'utf8');

it('Payment modal includes bill summary context', () => {
    if (!appContent.includes('paymentBillName')) throw new Error('Missing bill name summary field');
    if (!appContent.includes('paymentRemainingAmount')) throw new Error('Missing remaining amount summary field');
});
it('Payment modal includes one-tap quick pay action', () => {
    if (!appContent.includes('quickPayFullBtn')) throw new Error('Missing quick pay button');
    if (!appContent.includes('Pay Full Today')) throw new Error('Missing quick pay button label');
});
it('Quick pay button is wired to payment submission', () => {
    if (!appContent.includes("document.getElementById('quickPayFullBtn').addEventListener('click'")) {
        throw new Error('Missing quick pay click handler');
    }
    if (!appContent.includes('submitPayment(billId')) throw new Error('Quick pay does not call submitPayment');
});
it('Optional payment metadata is collapsible', () => {
    if (!appContent.includes('paymentOptionalDetails')) throw new Error('Missing optional details container');
    if (!appContent.includes('<details id="paymentOptionalDetails"')) {
        throw new Error('Optional metadata is not using details disclosure');
    }
});
it('Overdue monthly strategy choices are available in modal', () => {
    if (!appContent.includes('monthlyStrategySection')) throw new Error('Missing monthly strategy section');
    if (!appContent.includes('paymentRecurrenceStrategy')) throw new Error('Missing recurrence strategy input group');
    if (!appContent.includes('catch-up-to-current')) throw new Error('Missing catch-up strategy option');
});
it('Selected recurrence strategy is sent with payment submissions', () => {
    if (!appContent.includes('recurrenceStrategy')) throw new Error('Missing recurrence strategy payload field');
    if (!handlersContent.includes('paymentData.recurrenceStrategy')) {
        throw new Error('Recurring strategy is not read in payment logic');
    }
});
it('Grid paid toggle routes through payment modal flow', () => {
    if (!appContent.includes('if (isPaid) {')) throw new Error('Missing paid toggle branch');
    if (!appContent.includes('this.handleRecordPayment(billId);')) {
        throw new Error('Paid toggle does not route to record payment modal');
    }
});
it('Edit form payment action routes through payment modal flow', () => {
    if (!appContent.includes('handleMarkPaidFromModal')) throw new Error('Missing edit form payment handler');
    if (!appContent.includes('closeBillForm();\n            this.handleRecordPayment(billId);')) {
        throw new Error('Edit form payment action does not open payment modal');
    }
});
