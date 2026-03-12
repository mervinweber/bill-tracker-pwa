import { it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handlersPath = path.join(__dirname, '../src/handlers/billActionHandlers.js');
const handlersContent = fs.readFileSync(handlersPath, 'utf8');

it('captures most recent payment date helper', () => {
    expect(handlersContent).toContain('getMostRecentPaymentDate');
});

it('records last marked payment date in audit metadata', () => {
    expect(handlersContent).toContain('lastMarkedPaymentDate');
});

it('includes most recent payment date in unpaid audit summary', () => {
    expect(handlersContent).toContain('Most recent payment date:');
});
