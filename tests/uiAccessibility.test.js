/**
 * UI & Accessibility Tests
 * Verifies that the new accessibility features are properly implemented
 */

// Simple HTML parser for testing
function extractAttributes(html, selector, attr) {
    const regex = new RegExp(`${selector}[^>]*?${attr}="([^"]*)"`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
}

function hasAttribute(html, selector, attr) {
    const regex = new RegExp(`${selector}[^>]*?${attr}(?:\\s|=|>)`, 'i');
    return regex.test(html);
}

let passed = 0;
let failed = 0;

const test = (name, fn) => {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`❌ ${name}: ${e.message}`);
        failed++;
    }
};

// Read component files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const headerPath = path.join(__dirname, '../src/components/header.js');
const sidebarPath = path.join(__dirname, '../src/components/sidebar.js');
const billGridPath = path.join(__dirname, '../src/components/billGrid.js');
const billFormPath = path.join(__dirname, '../src/components/billForm.js');

const headerContent = fs.readFileSync(headerPath, 'utf8');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
const billGridContent = fs.readFileSync(billGridPath, 'utf8');
const billFormContent = fs.readFileSync(billFormPath, 'utf8');

// ============ Tests ============

// 1. Header has aria-live status region
test('Header has aria-live status region', () => {
    if (!headerContent.includes('role="status"')) throw new Error('Missing status role');
    if (!headerContent.includes('aria-live="polite"')) throw new Error('Missing aria-live');
    if (!headerContent.includes('aria-atomic="true"')) throw new Error('Missing aria-atomic');
});

// 2. Pay period select has aria-label and aria-describedby
test('Pay period select has proper ARIA attributes', () => {
    if (!headerContent.includes('aria-label="Select pay period"')) throw new Error('Missing aria-label');
    if (!headerContent.includes('aria-describedby="payPeriodHelp"')) throw new Error('Missing aria-describedby');
    if (!headerContent.includes('id="payPeriodHelp"')) throw new Error('Missing help text ID');
});

// 3. Filter dropdown has aria-label
test('Filter dropdown has aria-label', () => {
    if (!headerContent.includes('aria-label="Filter bills by payment status"')) throw new Error('Missing aria-label');
});

// 4. All Bills button has aria-pressed attribute
test('All Bills button has aria-pressed attribute', () => {
    if (!headerContent.includes('aria-pressed=')) throw new Error('Missing aria-pressed attribute');
});

// 5. Sidebar navigation has proper role
test('Sidebar navigation has proper role', () => {
    if (!sidebarContent.includes("setAttribute('role', 'navigation')")) throw new Error('Missing navigation role');
    if (!sidebarContent.includes("setAttribute('aria-label', 'Main navigation')")) throw new Error('Missing aria-label');
});

// 6. Categories list has proper role
test('Categories list has proper role', () => {
    if (!sidebarContent.includes("setAttribute('role', 'group')")) throw new Error('Missing group role');
    if (!sidebarContent.includes("setAttribute('aria-label', 'Bill categories')")) throw new Error('Missing aria-label');
});

// 7. Category buttons have menuitemradio role and aria-checked
test('Category buttons have menuitemradio role', () => {
    if (!sidebarContent.includes("setAttribute('role', 'menuitemradio')")) throw new Error('Missing menuitemradio role');
    if (!sidebarContent.includes("setAttribute('aria-checked', 'false')")) throw new Error('Missing aria-checked');
});

// 8. Bill grid table has proper semantics
test('Bill grid table has proper semantic role', () => {
    if (!billGridContent.includes("setAttribute('role', 'table')")) throw new Error('Missing table role');
    if (!billGridContent.includes("setAttribute('role', 'rowgroup')")) throw new Error('Missing rowgroup role');
    if (!billGridContent.includes('role="columnheader"')) throw new Error('Missing columnheader role');
    if (!billGridContent.includes('scope="col"')) throw new Error('Missing scope on column headers');
});

// 9. Bill table cells have proper ARIA labels
test('Bill table cells have proper ARIA labels', () => {
    if (!billGridContent.includes("setAttribute('aria-label'")) throw new Error('Missing aria-label on table cells');
    if (!billGridContent.includes("setAttribute('role', 'cell')")) throw new Error('Missing cell role');
});

// 10. Form fields have aria-required
test('Form fields have aria-required attribute', () => {
    if (!billFormContent.includes('aria-required="true"')) throw new Error('Missing aria-required');
});

// 11. Form fields have aria-describedby
test('Form fields have aria-describedby for help text', () => {
    if (!billFormContent.includes('aria-describedby=')) throw new Error('Missing aria-describedby');
    if (!billFormContent.includes('class="sr-only"')) throw new Error('Missing sr-only class');
});

// 12. Modal has proper dialog semantics
test('Modal has proper dialog semantics', () => {
    if (!billFormContent.includes('role="dialog"')) throw new Error('Missing dialog role');
    if (!billFormContent.includes('aria-labelledby=')) throw new Error('Missing aria-labelledby');
    if (!billFormContent.includes('aria-modal="true"')) throw new Error('Missing aria-modal');
});

// 13. Backup controls have region role
test('Backup controls have region role', () => {
    if (!sidebarContent.includes("setAttribute('role', 'region')")) throw new Error('Missing region role');
    if (!sidebarContent.includes("ariaLabel = 'Data backup controls'")) throw new Error('Missing aria-label');
});

// 14. Theme toggle has aria-checked
test('Theme toggle has aria-checked attribute', () => {
    if (!sidebarContent.includes('ariaChecked')) throw new Error('Missing aria-checked on theme toggle');
});

// 15. Action buttons have aria-label
test('Action buttons have descriptive aria-label', () => {
    if (!billGridContent.includes('Record payment for')) throw new Error('Missing aria-label on payment button');
    if (!billGridContent.includes('View payment history for')) throw new Error('Missing aria-label on history button');
    if (!billGridContent.includes('Edit')) throw new Error('Missing aria-label on edit button');
    if (!billGridContent.includes('Delete')) throw new Error('Missing aria-label on delete button');
});

// 16. Icons are hidden from screen readers where appropriate
test('Icons are hidden from screen readers', () => {
    if (!billGridContent.includes("setAttribute('aria-hidden', 'true')")) throw new Error('Missing aria-hidden on slider');
});

// 17. Keyboard navigation attributes
test('Keyboard navigation attributes present', () => {
    if (!sidebarContent.includes('tabIndex')) throw new Error('Missing tabindex for keyboard navigation');
});

// 18. Payment checkbox has aria-label
test('Payment checkbox has aria-label', () => {
    if (!billGridContent.includes('Mark') || !billGridContent.includes('as')) throw new Error('Missing aria-label on payment checkbox');
});

// 19. CSS has sr-only class definition
const cssPath = path.join(__dirname, '../src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

test('CSS has sr-only class', () => {
    if (!cssContent.includes('.sr-only')) throw new Error('Missing .sr-only class in CSS');
    if (!cssContent.includes('position: absolute')) throw new Error('sr-only should be positioned absolutely');
});

// 20. CSS has focus-visible styles
test('CSS has focus-visible styles for keyboard navigation', () => {
    if (!cssContent.includes('focus-visible')) throw new Error('Missing focus-visible styles');
});

// ============ Report ============
console.log('\n' + '='.repeat(50));
console.log(`Tests Passed: ${passed}`);
console.log(`Tests Failed: ${failed}`);
console.log(`Total Tests: ${passed + failed}`);
console.log('='.repeat(50));

if (failed > 0) {
    process.exit(1);
}
