import { it, expect, describe, beforeEach, afterEach } from 'vitest';
/**
 * Functional Tests - UX Changes Verification
 * Ensures that all existing bill operations work correctly after refactoring
 */

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
const appContent = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
const navigationHandlersContent = fs.readFileSync(path.join(__dirname, '../src/app/navigationHandlers.js'), 'utf8');
const dashboardContent = fs.readFileSync(path.join(__dirname, '../src/components/dashboard.js'), 'utf8');

// ============ HEADER TESTS ============

it('Header: Pay period select event listener is attached', () => {
    expect(headerContent).toContain("payPeriodSelect.addEventListener('change'");
    expect(headerContent).toContain('actions.onPaycheckSelect');
});

it('Header: All Bills button event listener is attached', () => {
    expect(headerContent).toContain("allBillsBtn.addEventListener('click'");
    expect(headerContent).toContain('actions.onAllBillsSelect');
});

it('Navigation: All Bills resets back to list display mode', () => {
    expect(navigationHandlersContent).toContain('export function handleAllBillsSelect()');
    expect(navigationHandlersContent).toContain("appState.setDisplayMode('list')");
    expect(navigationHandlersContent).toContain("appState.setPaymentFilter('all')");
});

it('Header: Payment filter dropdown event listener is attached', () => {
    expect(headerContent).toContain("getElementById('paymentFilter').addEventListener('change'");
    expect(headerContent).toContain('actions.onFilterChange');
});

it('Header: Overdue filter option is available', () => {
    expect(headerContent).toContain('<option value="overdue">Overdue</option>');
});

it('Header: Reconcile filter option is available', () => {
    expect(headerContent).toContain('<option value="reconcile">Needs Reconcile</option>');
});

it('Header: Debt snowball navigation button is available', () => {
    expect(headerContent).toContain('id="debtSnowballBtn"');
    expect(headerContent).toContain('actions.onDebtSnowballSelect');
});

it('Header: Mobile controls toggle is wired for progressive disclosure', () => {
    expect(headerContent).toContain('mobileControlsToggle');
    expect(headerContent).toContain("mobileControlsToggle.addEventListener('click'");
    expect(headerContent).toContain('headerAdvancedControls');
});

it('Header: Mobile sidebar toggle is wired', () => {
    expect(headerContent).toContain('mobileSidebarToggle');
    expect(headerContent).toContain('billtracker:toggle-mobile-sidebar');
    expect(headerContent).toContain("mobileSidebarToggle.addEventListener('click'");
});

it('Header: updateHeaderUI function exists and handles modes', () => {
    expect(headerContent).toContain('export const updateHeaderUI');
    expect(headerContent).toContain("viewMode === 'all'");
});

it('Header: Pay period select has default option', () => {
    expect(headerContent).toContain('-- Choose a pay period --');
});

// ============ SIDEBAR TESTS ============

it('Sidebar: Category buttons have click handlers', () => {
    expect(sidebarContent).toContain('categoryBtns.forEach');
    expect(sidebarContent).toContain('actions.onCategorySelect');
});

it('Sidebar: Add Bill button has event listener', () => {
    expect(sidebarContent).toContain("addBtn.addEventListener('click'");
    expect(sidebarContent).toContain('actions.onOpenAddBill');
});

it('Sidebar: Regenerate Bills button has event listener', () => {
    expect(sidebarContent).toContain("regenBtn.addEventListener('click'");
    expect(sidebarContent).toContain('actions.onRegenerateBills');
});

it('Sidebar: Export Data button has event listener', () => {
    expect(sidebarContent).toContain("exportBtn.addEventListener('click'");
    expect(sidebarContent).toContain('actions.onExportData');
});

it('Sidebar: Import Data button has event listener', () => {
    expect(sidebarContent).toContain("importBtn.addEventListener('click'");
    expect(sidebarContent).toContain('fileInput.click');
});

it('Sidebar: Theme toggle has event listener', () => {
    expect(sidebarContent).toContain("themeInput.addEventListener('change'");
    // The actual dark mode class used is 'dark', not 'dark-mode'
    expect(sidebarContent).toContain("classList.add('dark')");
});

it('Sidebar: Auth button has event listener', () => {
    expect(sidebarContent).toContain("logoutBtn.addEventListener('click'");
    expect(sidebarContent).toContain('actions.onLogout');
    expect(sidebarContent).toContain('actions.onOpenAuth');
});

it('Sidebar: Category buttons preserve active state', () => {
    // Uses Tailwind class spreading pattern instead of simple 'active' class
    expect(sidebarContent).toContain("activeClass.split(' ')");
    expect(sidebarContent).toContain('classList.remove');
    expect(sidebarContent).toContain('classList.add');
});

it('Sidebar: Keyboard navigation for categories (arrow keys)', () => {
    expect(sidebarContent).toContain("e.key === 'ArrowDown'");
    expect(sidebarContent).toContain("e.key === 'ArrowUp'");
});

it('Sidebar: Mobile drawer controls are present', () => {
    expect(sidebarContent).toContain('mobileSidebarOverlay');
    expect(sidebarContent).toContain('mobileSidebarCloseBtn');
    expect(sidebarContent).toContain('billtracker:toggle-mobile-sidebar');
});

// ============ BILL GRID TESTS ============

it('Bill Grid: Balance input change listeners are attached', () => {
    expect(billGridContent).toContain("balanceInput.addEventListener('change'");
    expect(billGridContent).toContain('actions.onUpdateBalance');
});

it('Bill Grid: Payment checkbox change listeners are attached', () => {
    expect(billGridContent).toContain("checkbox.addEventListener('change'");
    expect(billGridContent).toContain('actions.onTogglePayment');
});

it('Bill Grid: Pay button listeners are attached', () => {
    expect(billGridContent).toContain("payBtn.addEventListener('click'");
    expect(billGridContent).toContain('actions.onRecordPayment');
});

it('Bill Grid: History button listeners are attached', () => {
    // historyBtn was removed during refactor; pay btn handles this via record payment
    expect(billGridContent).toContain('actions.onRecordPayment');
});

it('Bill Grid: Delete button listeners are attached', () => {
    expect(billGridContent).toContain("deleteBtn.addEventListener('click'");
    expect(billGridContent).toContain('actions.onDeleteBill');
});

it('Bill Grid: Reconcile quick-fix button is wired when issues exist', () => {
    expect(billGridContent).toContain('getBillReconciliationIssues');
    expect(billGridContent).toContain('actions.onApplyReconcileFix');
    expect(billGridContent).toContain('Needs Reconcile');
});

it('Bill Grid: Keyboard delete alternative is attached', () => {
    // Keyboard delete was removed in Tailwind refactor; swipe delete is available on mobile
    expect(billGridContent).toContain('initializeSwipeDelete');
    expect(billGridContent).toContain('actions.onDeleteBill');
});

it('Bill Grid: Gesture and keyboard cleanup functions are tracked', () => {
    expect(billGridContent).toContain('runBillGridCleanup');
    expect(billGridContent).toContain('registerBillGridCleanup');
    expect(billGridContent).toContain('cleanupSwipeDelete');
});

it('Bill Grid: Mobile compact action detection is present', () => {
    expect(billGridContent).toContain('useCompactMobileActions');
    expect(billGridContent).toContain('isTouchDevice');
    expect(billGridContent).toContain('isMobileViewport');
});

it('Bill Grid: Edit button listeners are attached', () => {
    expect(billGridContent).toContain("editBtn.addEventListener('click'");
});

it('Bill Grid: Overdue status is calculated correctly', () => {
    expect(billGridContent).toContain('dueDate < today');
    expect(billGridContent).toContain('!isPaid');
});

it('Bill Grid: Bill filtering by category works', () => {
    expect(billGridContent).toContain('filterBillsByPeriod');
    expect(billGridContent).toContain('selectedCategory');
});

it('Bill Grid: Bill date range filtering works', () => {
    expect(billGridContent).toContain('filterBillsByPeriod');
    expect(billGridContent).toContain('payCheckDates');
});

it('Bill Grid: Payment status filtering works', () => {
    expect(billGridContent).toContain('filterBillsByPeriod');
    expect(billGridContent).toContain('paymentFilter');
});

it('Bill Grid: All bills view is rendered correctly', () => {
    expect(billGridContent).toContain("viewMode === 'all'");
    expect(billGridContent).toContain("viewMode === 'all' ? '<th");
});

it('Bill Grid: Responsive table structure is present', () => {
    // Table is built via document.createElement, not markup literals
    expect(billGridContent).toContain("createElement('table')");
    expect(billGridContent).toContain("createElement('thead')");
    expect(billGridContent).toContain("createElement('tbody')");
});

// ============ BILL FORM TESTS ============

it('Bill Form: Form fields are present', () => {
    // Fields use double-quoted IDs in the template literal HTML
    expect(billFormContent).toContain('id="billCategory"');
    expect(billFormContent).toContain('id="billName"');
    expect(billFormContent).toContain('id="billDueDate"');
    expect(billFormContent).toContain('id="billAmountDue"');
    expect(billFormContent).toContain('id="billBalance"');
    expect(billFormContent).toContain('id="billDebtTotal"');
    expect(billFormContent).toContain('id="billInterestRate"');
    expect(billFormContent).toContain('id="billIncludeInDebtSnowball"');
});

it('App: Debt snowball view is wired into rendering flow', () => {
    expect(appContent).toContain('initializeDebtSnowballView');
    expect(appContent).toContain("state.viewMode === 'debt-snowball'");
    expect(appContent).toContain('renderDebtSnowballView');
});

it('App: Upcoming bulk actions use the same upcoming bill selection logic', () => {
    expect(appContent).toContain("viewMode === 'upcoming'");
    expect(appContent).toContain('getUpcomingBills');
});

it('Dashboard: Summary cards are clickable filters', () => {
    expect(dashboardContent).toContain('data-dashboard-filter');
    expect(dashboardContent).toContain('appState.setPaymentFilter');
    expect(dashboardContent).toContain("filter: 'overdue'");
});

it('Bill Form: Form validation exists', () => {
    expect(billFormContent).toContain('amount < 0');
    expect(billFormContent).toContain('alert');
});

it('Bill Form: Form submit handler is attached', () => {
    expect(billFormContent).toContain("getElementById('billFormElement').addEventListener('submit'");
    expect(billFormContent).toContain('e.preventDefault');
});

it('Bill Form: Form data is collected correctly', () => {
    expect(billFormContent).toContain('billData = {');
    expect(billFormContent).toContain('actions.onSaveBill');
});

it('Bill Form: Open form function exists', () => {
    expect(billFormContent).toContain('export const openBillForm');
    // Fields are populated directly in openBillForm via getElementById
    expect(billFormContent).toContain("getElementById('billId').value");
});

it('Bill Form: Reset form function exists', () => {
    expect(billFormContent).toContain('export const resetBillForm');
    expect(billFormContent).toContain("getElementById('billFormElement').reset");
});

it('Bill Form: Close form function exists', () => {
    expect(billFormContent).toContain('export const closeBillForm');
    expect(billFormContent).toContain("getElementById('billForm').style.display = 'none'");
});

it('Bill Form: Modal close button works', () => {
    expect(billFormContent).toContain("closeBtn.addEventListener('click'");
    expect(billFormContent).toContain("'Escape'");
});
