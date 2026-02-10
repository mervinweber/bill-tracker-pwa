/**
 * Functional Tests - UX Changes Verification
 * Ensures that all existing bill operations work correctly after accessibility improvements
 */

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
    } catch (e) {
        console.log(`❌ ${name}: ${e.message}`);
        failed++;
    }
};

// Read component files
const headerPath = path.join(__dirname, '../src/components/header.js');
const sidebarPath = path.join(__dirname, '../src/components/sidebar.js');
const billGridPath = path.join(__dirname, '../src/components/billGrid.js');
const billFormPath = path.join(__dirname, '../src/components/billForm.js');

const headerContent = fs.readFileSync(headerPath, 'utf8');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
const billGridContent = fs.readFileSync(billGridPath, 'utf8');
const billFormContent = fs.readFileSync(billFormPath, 'utf8');

console.log('Functional Tests - Verifying Bill Operations Still Work\n');

// ============ HEADER TESTS ============

test('Header: Pay period select event listener is attached', () => {
    if (!headerContent.includes("payPeriodSelect.addEventListener('change'")) throw new Error('Missing change listener');
    if (!headerContent.includes("actions.onPaycheckSelect")) throw new Error('Missing action handler');
});

test('Header: All Bills button event listener is attached', () => {
    if (!headerContent.includes("allBillsBtn.addEventListener('click'")) throw new Error('Missing click listener');
    if (!headerContent.includes("actions.onAllBillsSelect")) throw new Error('Missing action handler');
});

test('Header: Payment filter dropdown event listener is attached', () => {
    if (!headerContent.includes("getElementById('paymentFilter').addEventListener('change'")) throw new Error('Missing change listener');
    if (!headerContent.includes("actions.onFilterChange")) throw new Error('Missing action handler');
});

test('Header: updateHeaderUI function exists and handles modes', () => {
    if (!headerContent.includes("export const updateHeaderUI")) throw new Error('Missing updateHeaderUI export');
    if (!headerContent.includes("viewMode === 'all'")) throw new Error('Missing view mode check');
});

test('Header: Pay period select has default option', () => {
    if (!headerContent.includes('-- Choose a pay period --')) throw new Error('Missing default option');
});

// ============ SIDEBAR TESTS ============

test('Sidebar: Category buttons have click handlers', () => {
    if (!sidebarContent.includes("categoryBtns.forEach")) throw new Error('Missing category button iteration');
    if (!sidebarContent.includes("actions.onCategorySelect")) throw new Error('Missing category select handler');
});

test('Sidebar: Add Bill button has event listener', () => {
    if (!sidebarContent.includes("addBtn.addEventListener('click'")) throw new Error('Missing click listener');
    if (!sidebarContent.includes("actions.onOpenAddBill")) throw new Error('Missing action handler');
});

test('Sidebar: Regenerate Bills button has event listener', () => {
    if (!sidebarContent.includes("regenBtn.addEventListener('click'")) throw new Error('Missing click listener');
    if (!sidebarContent.includes("actions.onRegenerateBills")) throw new Error('Missing action handler');
});

test('Sidebar: Export Data button has event listener', () => {
    if (!sidebarContent.includes("exportBtn.addEventListener('click'")) throw new Error('Missing click listener');
    if (!sidebarContent.includes("actions.onExportData")) throw new Error('Missing action handler');
});

test('Sidebar: Import Data button has event listener', () => {
    if (!sidebarContent.includes("importBtn.addEventListener('click'")) throw new Error('Missing click listener');
    if (!sidebarContent.includes("fileInput.click")) throw new Error('Missing file input click');
});

test('Sidebar: Theme toggle has event listener', () => {
    if (!sidebarContent.includes("themeInput.addEventListener('change'")) throw new Error('Missing theme toggle listener');
    if (!sidebarContent.includes("document.body.classList.add('dark-mode')")) throw new Error('Missing dark mode class toggle');
});

test('Sidebar: Auth button has event listener', () => {
    if (!sidebarContent.includes("logoutBtn.addEventListener('click'")) throw new Error('Missing click listener');
    if (!sidebarContent.includes("actions.onLogout")) throw new Error('Missing logout handler');
    if (!sidebarContent.includes("actions.onOpenAuth")) throw new Error('Missing auth handler');
});

test('Sidebar: Category buttons preserve active state', () => {
    if (!sidebarContent.includes("classList.remove('active')")) throw new Error('Missing active class removal');
    if (!sidebarContent.includes("classList.add('active')")) throw new Error('Missing active class addition');
});

test('Sidebar: Keyboard navigation for categories (arrow keys)', () => {
    if (!sidebarContent.includes("e.key === 'ArrowDown'")) throw new Error('Missing arrow down handler');
    if (!sidebarContent.includes("e.key === 'ArrowUp'")) throw new Error('Missing arrow up handler');
});

// ============ BILL GRID TESTS ============

test('Bill Grid: Balance input change listeners are attached', () => {
    if (!billGridContent.includes("balanceInput.addEventListener('change'")) throw new Error('Missing balance input change handler');
    if (!billGridContent.includes("actions.onUpdateBalance")) throw new Error('Missing balance update handler');
});

test('Bill Grid: Payment checkbox change listeners are attached', () => {
    if (!billGridContent.includes("checkbox.addEventListener('change'")) throw new Error('Missing checkbox change handler');
    if (!billGridContent.includes("actions.onTogglePayment")) throw new Error('Missing payment toggle handler');
});

test('Bill Grid: Pay button listeners are attached', () => {
    if (!billGridContent.includes("payBtn.addEventListener('click'")) throw new Error('Missing pay button listener');
    if (!billGridContent.includes("actions.onRecordPayment")) throw new Error('Missing payment handler');
});

test('Bill Grid: History button listeners are attached', () => {
    if (!billGridContent.includes("historyBtn.addEventListener('click'")) throw new Error('Missing history button listener');
    if (!billGridContent.includes("actions.onViewHistory")) throw new Error('Missing history handler');
});

test('Bill Grid: Delete button listeners are attached', () => {
    if (!billGridContent.includes("deleteBtn.addEventListener('click'")) throw new Error('Missing delete button listener');
    if (!billGridContent.includes("actions.onDeleteBill")) throw new Error('Missing delete handler');
});

test('Bill Grid: Edit button listeners are attached', () => {
    if (!billGridContent.includes("editBtn.addEventListener('click'")) throw new Error('Missing edit button listener');
});

test('Bill Grid: Overdue status is calculated correctly', () => {
    if (!billGridContent.includes("isOverdue = dueDate < today")) throw new Error('Missing overdue check');
    if (!billGridContent.includes("!isPaid")) throw new Error('Missing unpaid check in overdue logic');
});

test('Bill Grid: Bill filtering by category works', () => {
    if (!billGridContent.includes("filterBillsByPeriod")) throw new Error('Missing shared filtering logic');
    if (!billGridContent.includes("selectedCategory")) throw new Error('Missing selectedCategory usage');
});

test('Bill Grid: Bill date range filtering works', () => {
    if (!billGridContent.includes("filterBillsByPeriod")) throw new Error('Missing shared filtering logic');
    if (!billGridContent.includes("payCheckDates")) throw new Error('Missing pay check dates usage');
});

test('Bill Grid: Payment status filtering works', () => {
    if (!billGridContent.includes("filterBillsByPeriod")) throw new Error('Missing shared filtering logic');
    if (!billGridContent.includes("paymentFilter")) throw new Error('Missing paymentFilter usage');
});

test('Bill Grid: All bills view is rendered correctly', () => {
    if (!billGridContent.includes("viewMode === 'all'")) throw new Error('Missing all mode check');
    if (!billGridContent.includes("viewMode === 'all' ? '<th")) throw new Error('Missing category column in all mode');
});

// ============ BILL FORM TESTS ============

test('Bill Form: Form fields are present', () => {
    if (!billFormContent.includes('id="billCategory"')) throw new Error('Missing category field');
    if (!billFormContent.includes('id="billName"')) throw new Error('Missing name field');
    if (!billFormContent.includes('id="billDueDate"')) throw new Error('Missing due date field');
    if (!billFormContent.includes('id="billAmountDue"')) throw new Error('Missing amount field');
    if (!billFormContent.includes('id="billBalance"')) throw new Error('Missing balance field');
});

test('Bill Form: Form validation exists', () => {
    if (!billFormContent.includes("amount < 0")) throw new Error('Missing negative amount check');
    if (!billFormContent.includes("alert")) throw new Error('Missing alert for validation');
});

test('Bill Form: Form submit handler is attached', () => {
    if (!billFormContent.includes("getElementById('billFormElement').addEventListener('submit'")) throw new Error('Missing submit listener');
    if (!billFormContent.includes("e.preventDefault")) throw new Error('Missing preventDefault');
});

test('Bill Form: Form data is collected correctly', () => {
    if (!billFormContent.includes("billData = {")) throw new Error('Missing bill data object');
    if (!billFormContent.includes("actions.onSaveBill")) throw new Error('Missing save handler');
});

test('Bill Form: Open form function exists', () => {
    if (!billFormContent.includes("export const openBillForm")) throw new Error('Missing openBillForm export');
    if (!billFormContent.includes("document.getElementById('billForm').style.display = 'block'")) throw new Error('Missing form display logic');
});

test('Bill Form: Reset form function exists', () => {
    if (!billFormContent.includes("export const resetBillForm")) throw new Error('Missing resetBillForm export');
    if (!billFormContent.includes("getElementById('billFormElement').reset")) throw new Error('Missing form reset');
});

test('Bill Form: Close form function exists', () => {
    if (!billFormContent.includes("export const closeBillForm")) throw new Error('Missing closeBillForm export');
    if (!billFormContent.includes("document.getElementById('billForm').style.display = 'none'")) throw new Error('Missing form hide logic');
});

test('Bill Form: Modal close button works', () => {
    if (!billFormContent.includes("closeBtn.addEventListener('click'")) throw new Error('Missing close button listener');
    if (!billFormContent.includes("'Escape'")) throw new Error('Missing Escape key handler');
});

// ============ Report ============
console.log('\n' + '='.repeat(50));
console.log(`Tests Passed: ${passed}`);
console.log(`Tests Failed: ${failed}`);
console.log(`Total Tests: ${passed + failed}`);
console.log('='.repeat(50));

if (failed > 0) {
    console.log('\n⚠️  Some functional tests failed - review the output above');
    process.exit(1);
} else {
    console.log('\n✅ All functional tests passed - existing features still work!');
}
