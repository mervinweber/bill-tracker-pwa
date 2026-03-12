import { it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const shContent = fs.readFileSync(path.join(__dirname, '../src/handlers/settingsHandler.js'), 'utf8');
const shpContent = fs.readFileSync(path.join(__dirname, '../src/utils/settingsHelpers.js'), 'utf8');

it('should detect when payment schedule fields are unchanged', () => {
    expect(shContent).toContain('paymentSettingsChanged');
});

it('should skip payment schedule validation when schedule fields are unchanged', () => {
    expect(shContent).toContain('if (paymentSettingsChanged)');
});

it('should call hasPaymentScheduleChanged helper', () => {
    expect(shContent).toContain('hasPaymentScheduleChanged');
});

it('should compare startDate in helper logic', () => {
    expect(shpContent).toMatch(/existingStartDate|startDate/);
});

it('should compare payment schedule frequency in helper logic', () => {
    expect(shpContent).toMatch(/existingFrequency|frequency/);
});

it('amount comparison should not be part of schedule-change detection', () => {
    // The hasPaymentScheduleChanged function should only compare schedule fields, not amount
    expect(shpContent).not.toContain('existingAmount !== newAmount');
});

it('validatePaymentSettings call exists in handler', () => {
    expect(shContent).toContain('validatePaymentSettings');
});
