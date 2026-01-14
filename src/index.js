import { createLocalDate, formatLocalDate, calculateNextDueDate, generatePaycheckDates } from './utils/dates.js';
import { billStore } from './store/BillStore.js';
import { initializeHeader as initHeader, updateHeaderUI } from './components/header.js';
import { initializeSidebar as initSidebar, initializeSidebar as updateSidebarUI } from './components/sidebar.js';
import { initializeBillGrid as initGrid, renderBillGrid as renderGrid } from './components/billGrid.js';
import { initializeDashboard as initDash, renderDashboard as renderDash } from './components/dashboard.js';
import { initializeBillForm as initForm, openBillForm, resetBillForm as resetForm, closeBillForm } from './components/billForm.js';
import { initializeAuthModal as initAuth, openAuthModal, closeAuthModal, setAuthMessage } from './components/authModal.js';
import { renderCalendar as renderCal } from './components/calendar.js';
import { renderAnalytics as renderAn } from './components/analytics.js';
import { initializePaymentModals as initPayment, openRecordPayment, openViewHistory } from './components/paymentModals.js';
import { showSettingsModal } from './components/settings.js';
import { initializeTheme, toggleTheme } from './utils/theme.js';
import * as BillService from './services/BillService.js';
import { initializeSupabase } from './services/supabase.js';

// ========== STATE ==========
let selectedPaycheck = null;
let selectedCategory = null;
let viewMode = 'filtered'; // 'filtered' or 'all'
let displayMode = 'list'; // 'list', 'calendar', 'analytics'
let currentCalendarDate = new Date();
let paymentFilter = 'all'; // 'all', 'unpaid', 'paid'
let paymentStartDate, paymentFrequency, payPeriodsToShow;

const DEFAULT_CATEGORIES = ['Rent', 'Utilities', 'Groceries', 'Transportation', 'Insurance', 'Entertainment'];
let categories = JSON.parse(localStorage.getItem('customCategories')) || [...DEFAULT_CATEGORIES];

function getPaycheckDates() {
    const stored = localStorage.getItem('paymentSettings');
    const settings = stored ? JSON.parse(stored) : {
        startDate: new Date().toISOString().split('T')[0],
        frequency: 'bi-weekly',
        payPeriodsToShow: 6
    };
    paymentStartDate = settings.startDate;
    paymentFrequency = settings.frequency;
    payPeriodsToShow = settings.payPeriodsToShow;
    return generatePaycheckDates(settings);
}

const payCheckDates = getPaycheckDates();
const paychecks = payCheckDates.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

// ========== INITIALIZATION ==========

if (!localStorage.getItem('paymentSettings')) {
    if (window.location.pathname.indexOf('setup.html') === -1) {
        window.location.href = 'setup.html';
    }
} else {
    billStore.subscribe(() => {
        renderDashboard();
        renderBillGrid();
    });
    initializeTheme();
    completeInitialization();
}

function completeInitialization() {
    initializeSupabase();
    BillService.migrateBillsToPaymentHistory();
    BillService.updateBillDatesBasedOnRecurrence(payCheckDates);

    initHeader(paychecks, {
        onPaycheckSelect: (index) => { viewMode = 'filtered'; selectedPaycheck = index; renderDashboard(); renderBillGrid(); },
        onFilterChange: (filter) => { paymentFilter = filter; renderDashboard(); renderBillGrid(); },
        onAllBillsSelect: () => { viewMode = 'all'; renderDashboard(); renderBillGrid(); }
    });

    initSidebar(categories, {
        onCategorySelect: (cat) => { selectedCategory = cat; viewMode = 'filtered'; renderDashboard(); renderBillGrid(); },
        onOpenAddBill: () => { resetForm(); document.getElementById('billForm').style.display = 'block'; },
        onRegenerateBills: () => BillService.regenerateAllRecurringBills(payCheckDates),
        onExportData: handleExport,
        onImportData: handleImport,
        onOpenAuth: () => openAuthModal(),
        onLogout: () => { localStorage.removeItem('userEmail'); window.location.reload(); }
    });

    initForm(categories, { onSaveBill: handleSaveBill });
    initAuth({ onLogin: () => { }, onSignUp: () => { } });
    initPayment({ onRecordPayment: handleRecordPayment });

    initDash();
    initGrid();
    autoSelectPayPeriod();
}

function autoSelectPayPeriod() {
    const today = new Date().setHours(0, 0, 0, 0);
    selectedPaycheck = payCheckDates.findIndex((d, i) => {
        const next = payCheckDates[i + 1];
        return today <= d.getTime() || (next && today < next.getTime());
    });
    if (selectedPaycheck === -1) selectedPaycheck = 0;
}

// ========== ACTION HANDLERS ==========
function handleSaveBill(billData) {
    const saved = BillService.saveBill(billData, payCheckDates);
    if (selectedCategory !== 'All' && saved.category !== selectedCategory) {
        selectedCategory = 'All';
    }
    updateSidebarUI(categories, { selectedCategory });
    closeBillForm();
}

function handleRecordPayment(billId, paymentData) {
    BillService.recordPayment(billId, paymentData);
}

function handleExport() {
    const data = { bills: billStore.getAll(), categories, settings: JSON.parse(localStorage.getItem('paymentSettings')) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function handleImport(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.bills) billStore.setBills(data.bills);
            if (data.categories) localStorage.setItem('customCategories', JSON.stringify(data.categories));
            if (data.settings) localStorage.setItem('paymentSettings', JSON.stringify(data.settings));
            window.location.reload();
        } catch (err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
}

// ========== VIEW RENDERING WRAPPERS ==========
window.toggleView = (mode) => {
    displayMode = mode;
    updateHeaderUI(viewMode, selectedPaycheck, displayMode);
    renderDashboard();
    renderBillGrid();
};

window.toggleTheme = toggleTheme;
window.editBill = (id) => { const b = billStore.getAll().find(x => x.id === id); if (b) openBillForm(b); };
window.deleteBill = (id) => BillService.deleteBill(id);
window.togglePaymentStatus = (id, paid) => BillService.togglePaymentStatus(id, paid);
window.openRecordPayment = (id) => {
    const b = billStore.getAll().find(x => x.id === id);
    if (b) openRecordPayment(b, BillService.getRemainingBalance(b));
};
window.viewHistory = (id) => {
    const b = billStore.getAll().find(x => x.id === id);
    if (b) openViewHistory(b, {
        totalPaid: BillService.getTotalPaid(b),
        remaining: BillService.getRemainingBalance(b),
        payments: (b.paymentHistory || []).sort((a, b) => new Date(b.date) - new Date(a.date))
    });
};
window.showSettingsModal = () => showSettingsModal(
    { settings: JSON.parse(localStorage.getItem('paymentSettings')), categories, bills: billStore.getAll() },
    {
        onSaveSettings: (s) => { localStorage.setItem('paymentSettings', JSON.stringify(s)); window.location.reload(); },
        onAddCategory: (name) => { if (!categories.includes(name)) { categories.push(name); localStorage.setItem('customCategories', JSON.stringify(categories)); return true; } },
        onDeleteCategory: (name) => { categories = categories.filter(c => c !== name); localStorage.setItem('customCategories', JSON.stringify(categories)); },
        onEditCategory: (old, name) => {
            const i = categories.indexOf(old);
            if (i !== -1) {
                categories[i] = name; localStorage.setItem('customCategories', JSON.stringify(categories));
                billStore.getAll().forEach(b => { if (b.category === old) { b.category = name; billStore.update(b); } }); return true;
            }
        },
        onDeleteCategoryConflict: (name, action, target) => {
            if (action === 'move') billStore.getAll().forEach(b => { if (b.category === name) { b.category = target; billStore.update(b); } });
            else billStore.getAll().forEach(b => { if (b.category === name) billStore.delete(b.id); });
            categories = categories.filter(c => c !== name);
            localStorage.setItem('customCategories', JSON.stringify(categories));
        },
        getData: () => ({ settings: JSON.parse(localStorage.getItem('paymentSettings')), categories, bills: billStore.getAll() })
    }
);

function renderDashboard() {
    const dash = document.getElementById('dashboard');
    if (!dash) return;
    if (displayMode !== 'list') { dash.style.display = 'none'; return; }
    dash.style.display = 'block';
    updateHeaderUI(viewMode, selectedPaycheck, displayMode);
    renderDash({ bills: billStore.getAll(), payCheckDates, selectedPaycheck, selectedCategory, viewMode, paymentFilter });
}

function renderBillGrid() {
    const billGrid = document.getElementById('billGrid');
    const calendarView = document.getElementById('calendarView');
    const analyticsView = document.getElementById('analyticsView');

    [billGrid, calendarView, analyticsView].forEach(v => v.style.display = 'none');

    if (displayMode === 'calendar') renderCal({ bills: billStore.getAll(), currentCalendarDate }, { onPrevMonth: () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); renderCalendar(); }, onNextMonth: () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); renderCalendar(); }, onEditBill: window.editBill });
    else if (displayMode === 'analytics') renderAn({ bills: billStore.getAll(), isDark: document.body.classList.contains('dark-mode') });
    else {
        billGrid.style.display = 'grid';
        renderGrid({ bills: billStore.getAll(), payCheckDates, selectedPaycheck, selectedCategory, viewMode, paymentFilter });
    }
}

function renderCalendar() { renderBillGrid(); }
/**
 * Bill Tracker PWA - Main Entry Point
 * 
 * This is the single entry point for the Bill Tracker application.
 * It delegates all initialization and functionality to the app orchestrator.
 * 
 * Features:
 * - Modular component architecture with separated concerns
 * - Comprehensive error handling and recovery
 * - Full WCAG 2.1 Level AA accessibility
 * - Progressive Web App capabilities
 * - Responsive design for mobile and desktop
 * - Dark mode support with localStorage persistence
 * - Local data storage with JSON import/export
 * 
 * @file Main entry point for Bill Tracker PWA
 * @module index
 * @requires app
 */

import { appOrchestrator } from './app.js';

/**
 * Initialize application when DOM is ready
 * 
 * Waits for the DOM to fully load before initializing the app.
 * This ensures all HTML elements are available for manipulation.
 */
document.addEventListener('DOMContentLoaded', () => {
    appOrchestrator.initialize();
});

/**
 * Global helper function for editing bills from calendar view
 * 
 * @function editBillGlobal
 * @param {string} billId - ID of the bill to edit
 * @description This is exposed globally to allow calendar view
 *   (which may use different rendering contexts) to trigger bill editing.
 *   Delegates to appOrchestrator's handleEditBill method.
 * @example
 * // Called from calendar view when user clicks a bill
 * editBillGlobal('bill-123');
 */
window.editBillGlobal = (billId) => {
    if (appOrchestrator && typeof appOrchestrator.handleEditBill === 'function') {
        appOrchestrator.handleEditBill(billId);
    }
};
