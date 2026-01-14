/**
 * App Orchestrator Module
 * Manages app initialization, state coordination, and component delegation
 * Replaces most of the monolithic index.js
 */

import { appState } from './store/appState.js';
import { billStore } from './store/BillStore.js';
import { paycheckManager } from './utils/paycheckManager.js';

import { initializeHeader, updateHeaderUI } from './components/header.js';
import { initializeSidebar } from './components/sidebar.js';
import { initializeBillGrid, renderBillGrid } from './components/billGrid.js';
import { initializeDashboard, renderDashboard } from './components/dashboard.js';
import { initializeBillForm, openBillForm, resetBillForm, closeBillForm } from './components/billForm.js';
import { initializeAuthModal, openAuthModal, closeAuthModal } from './components/authModal.js';

import { initializeCalendarView, renderCalendar } from './views/calendarView.js';
import { initializeAnalyticsView, renderAnalytics, cleanupCharts } from './views/analyticsView.js';

import {
    billActionHandlers,
    validateBill,
    migrateBillsToPaymentHistory
} from './handlers/billActionHandlers.js';
import { settingsHandlers } from './handlers/settingsHandler.js';

import { initializeSupabase, getUser } from './services/supabase.js';

class AppOrchestrator {
    constructor() {
        this.categories = [];
        this.initialized = false;
    }

    /**
     * Initialize app - called on DOMContentLoaded
     */
    async initialize() {
        try {
            // Check if user has payment settings
            const hasSettings = localStorage.getItem('paymentSettings');
            if (!hasSettings) {
                window.location.href = 'setup.html';
                return;
            }

            // Load categories
            this.loadCategories();

            // Initialize theme
            this.initializeTheme();

            // Initialize Supabase
            initializeSupabase();

            // Migrate legacy data
            migrateBillsToPaymentHistory();

            // Update bill dates based on recurrence
            paycheckManager.updateBillDatesBasedOnRecurrence();

            // Initialize all views
            initializeCalendarView();
            initializeAnalyticsView();

            // Auto-select pay period
            const autoSelectedIndex = paycheckManager.getAutoSelectedPayPeriodIndex();
            appState.setSelectedPaycheck(autoSelectedIndex);

            const savedCategory = localStorage.getItem('selectedCategory');
            if (savedCategory && (this.categories.includes(savedCategory) || savedCategory === 'All')) {
                appState.setSelectedCategory(savedCategory);
            } else {
                appState.setSelectedCategory(this.categories[0] || 'All');
            }

            appState.setViewMode('filtered');

            // Get paycheck labels
            const paycheckLabels = paycheckManager.getPaycheckLabels();

            // Initialize components with callbacks
            initializeHeader(paycheckLabels, {
                onPaycheckSelect: (index) => this.handlePaycheckSelect(index),
                onFilterChange: (filter) => this.handleFilterChange(filter),
                onAllBillsSelect: () => this.handleAllBillsSelect(),
                onToggleTheme: () => this.handleToggleTheme(),
                onShowSettings: () => this.handleShowSettings()
            });

            initializeSidebar(this.categories, {
                onCategorySelect: (category) => this.handleCategorySelect(category),
                onOpenAddBill: () => this.handleOpenAddBill(),
                onRegenerateBills: () => this.handleRegenerateBills(),
                onExportData: () => this.handleExportData(),
                onImportData: (file) => this.handleImportData(file),
                onOpenAuth: () => openAuthModal(),
                onLogout: () => this.handleLogout()
            });

            initializeBillForm(this.categories, {
                onSaveBill: () => this.handleSaveBill()
            });

            initializeAuthModal({
                onLogin: (email, password) => this.handleLogin(email, password),
                onSignUp: (email, password) => this.handleSignUp(email, password)
            });

            // Initialize payment modals
            this.initializePaymentModals();

            initializeDashboard();
            initializeBillGrid();

            // Hide all modals on startup
            const billForm = document.getElementById('billForm');
            if (billForm) billForm.style.display = 'none';
            const recordPaymentModal = document.getElementById('recordPaymentModal');
            if (recordPaymentModal) recordPaymentModal.style.display = 'none';
            const viewHistoryModal = document.getElementById('viewHistoryModal');
            if (viewHistoryModal) viewHistoryModal.style.display = 'none';

            // Subscribe to state changes for re-rendering
            appState.subscribe(() => this.handleStateChange());

            // Subscribe to store changes for re-rendering
            billStore.subscribe(() => this.rerender());

            // Initial render
            this.rerender();

            this.initialized = true;
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            billActionHandlers.showErrorNotification(error.message, 'Initialization Error');
        }
    }

    /**
     * Load categories from localStorage
     */
    loadCategories() {
        const DEFAULT_CATEGORIES = [
            'Rent',
            'Utilities',
            'Groceries',
            'Transportation',
            'Insurance',
            'Entertainment'
        ];
        this.categories =
            JSON.parse(localStorage.getItem('customCategories')) || [...DEFAULT_CATEGORIES];
    }

    /**
     * Handle state changes - re-render affected components
     */
    handleStateChange() {
        if (!this.initialized) return;
        this.rerender();
    }

    /**
     * Re-render all components based on current state
     */
    rerender() {
        try {
            const state = appState.getState();
            const bills = billStore.getAll();

            // Render dashboard
            renderDashboard(bills, state.viewMode, state.selectedPaycheck, state.selectedCategory, state.paymentFilter, paycheckManager.payCheckDates);

            // Render appropriate view based on displayMode
            if (state.displayMode === 'calendar') {
                renderCalendar();
            } else if (state.displayMode === 'analytics') {
                renderAnalytics();
            } else {
                // List view (default)
                renderBillGrid(
                    {
                        bills,
                        viewMode: state.viewMode,
                        selectedPaycheck: state.selectedPaycheck,
                        selectedCategory: state.selectedCategory,
                        paymentFilter: state.paymentFilter,
                        payCheckDates: paycheckManager.payCheckDates
                    },
                    {
                        onUpdateBalance: (billId, balance) =>
                            this.handleUpdateBalance(billId, balance),
                        onTogglePayment: (billId, isPaid) =>
                            this.handleTogglePayment(billId, isPaid),
                        onRecordPayment: (billId) => this.handleRecordPayment(billId),
                        onViewHistory: (billId) => this.handleViewHistory(billId),
                        onDeleteBill: (billId) => this.handleDeleteBill(billId),
                        onEditBill: (billId) => this.handleEditBill(billId)
                    }
                );
            }
        } catch (error) {
            console.error('Error re-rendering:', error);
        }
    }

    // ========== EVENT HANDLERS ==========

    handlePaycheckSelect(index) {
        appState.setViewMode('filtered');
        appState.setSelectedPaycheck(index);
    }

    handleFilterChange(filter) {
        appState.setPaymentFilter(filter);
    }

    handleAllBillsSelect() {
        appState.setViewMode('all');
    }

    handleCategorySelect(category) {
        appState.setSelectedCategory(category);
        appState.setViewMode('filtered');
    }

    handleOpenAddBill() {
        resetBillForm();
        openBillForm({
            id: '',
            category: '',
            name: '',
            dueDate: '',
            amountDue: '',
            balance: '',
            recurrence: '',
            notes: ''
        });
    }

    handleSaveBill() {
        try {
            const id = document.getElementById('billId').value;
            const bills = billStore.getAll();
            const existingBill = id ? bills.find(b => b.id === id) : null;

            let dueDateString = document.getElementById('billDueDate').value;
            
            // Snap bill date to closest paycheck if it falls outside the paycheck range
            const billDueDate = new Date(dueDateString);
            const snappedDate = paycheckManager.snapBillDateToPaycheck(billDueDate);
            dueDateString = snappedDate.toISOString().split('T')[0];

            const bill = {
                id: id || Date.now().toString(),
                category: document.getElementById('billCategory').value,
                name: document.getElementById('billName').value,
                dueDate: dueDateString,
                amountDue: parseFloat(document.getElementById('billAmountDue').value),
                balance: document.getElementById('billBalance').value
                    ? parseFloat(document.getElementById('billBalance').value)
                    : parseFloat(document.getElementById('billAmountDue').value),
                recurrence: document.getElementById('billRecurrence').value,
                notes: document.getElementById('billNotes').value,
                isPaid: existingBill ? existingBill.isPaid || false : false,
                lastPaymentDate: existingBill ? existingBill.lastPaymentDate || null : null,
                paymentHistory: existingBill ? existingBill.paymentHistory || [] : []
            };

            // Validate bill
            const validation = validateBill(bill);
            if (!validation.isValid) {
                const errorMessage = validation.errors.join(', ');
                billActionHandlers.showErrorNotification(errorMessage, 'Validation Error');
                return;
            }

            if (id) {
                billStore.update(bill);
            } else {
                billStore.add(bill);

                // Generate recurring instances
                if (bill.recurrence !== 'One-time') {
                    const generatedBills = paycheckManager.generateRecurringBillInstances(bill);
                    if (generatedBills && generatedBills.length > 0) {
                        generatedBills.forEach(b => billStore.add(b));
                    }
                }
            }

            // Auto-switch to bill's category
            if (appState.getState('selectedCategory') !== bill.category) {
                appState.setSelectedCategory(bill.category);

                // Sync sidebar UI
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                const newActiveBtn = document.querySelector(
                    `.category-btn[data-category="${bill.category}"]`
                );
                if (newActiveBtn) newActiveBtn.classList.add('active');
            }

            closeBillForm();
            document.getElementById('billFormElement').reset();
            document.getElementById('billId').value = '';

            billActionHandlers.showSuccessNotification(
                `Bill "${bill.name}" ${id ? 'updated' : 'created'} successfully`
            );
        } catch (error) {
            console.error('Error saving bill:', error);
            billActionHandlers.showErrorNotification(error.message, 'Save Failed');
        }
    }

    handleUpdateBalance(billId, newBalance) {
        billActionHandlers.updateBillBalance(billId, newBalance);
    }

    handleTogglePayment(billId, isPaid) {
        billActionHandlers.togglePaymentStatus(billId, isPaid);
    }

    handleDeleteBill(billId) {
        if (billActionHandlers.deleteBill(billId)) {
            this.rerender();
        }
    }

    handleEditBill(billId) {
        const bills = billStore.getAll();
        const bill = bills.find(b => b.id === billId);
        if (bill) {
            document.getElementById('billId').value = bill.id;
            document.getElementById('billCategory').value = bill.category;
            document.getElementById('billName').value = bill.name;
            document.getElementById('billDueDate').value = bill.dueDate;
            document.getElementById('billAmountDue').value = bill.amountDue || 0;
            document.getElementById('billBalance').value = bill.balance || 0;
            document.getElementById('billRecurrence').value = bill.recurrence;
            document.getElementById('billNotes').value = bill.notes || '';
            openBillForm();
        }
    }

    handleRecordPayment(billId) {
        const bills = billStore.getAll();
        const bill = bills.find(b => b.id === billId);
        if (!bill) return;

        document.getElementById('paymentBillId').value = billId;
        document.getElementById('paymentAmount').value = billActionHandlers
            .getRemainingBalance(bill)
            .toFixed(2);
        document.getElementById('paymentDate').value = new Date()
            .toISOString()
            .split('T')[0];
        document.getElementById('recordPaymentModal').style.display = 'block';
    }

    handleViewHistory(billId) {
        const bills = billStore.getAll();
        const bill = bills.find(b => b.id === billId);
        if (!bill) return;

        const totalDue = bill.amountDue || 0;
        const totalPaid = billActionHandlers.getTotalPaid(bill);
        const remaining = billActionHandlers.getRemainingBalance(bill);
        const payments = (bill.paymentHistory || []).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        let html = `
            <div style="padding: 15px; background: #f8f9fa; border-radius: 4px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0;">${bill.name}</h3>
                <div style="display: flex; gap: 20px; font-size: 14px;">
                    <span><strong>Total Due:</strong> $${totalDue.toFixed(2)}</span>
                    <span><strong>Total Paid:</strong> $${totalPaid.toFixed(2)}</span>
                    <span style="color: ${remaining > 0 ? '#e74c3c' : '#27ae60'};"><strong>Remaining:</strong> $${remaining.toFixed(2)}</span>
                </div>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
        `;

        if (payments.length > 0) {
            payments.forEach(payment => {
                html += `
                    <div style="padding: 12px; border-left: 3px solid #5eb3d6; background: white; margin-bottom: 10px; border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong>${new Date(payment.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}</strong>
                            <strong style="color: #27ae60;">$${payment.amount.toFixed(2)}</strong>
                        </div>
                        <div style="font-size: 13px; color: #666;">
                            ${payment.method} ${payment.confirmationNumber ? `| Conf: ${payment.confirmationNumber}` : ''}
                        </div>
                    </div>
                `;
            });
        } else {
            html +=
                '<p style="text-align: center; color: #999; padding: 20px;">No payments recorded yet</p>';
        }

        html += '</div>';
        document.getElementById('historyContent').innerHTML = html;
        document.getElementById('viewHistoryModal').style.display = 'block';
    }

    handleRegenerateBills() {
        try {
            if (
                !confirm(
                    'This will regenerate all recurring bill instances. Continue?'
                )
            ) {
                return;
            }

            paycheckManager.regenerateAllRecurringBills();
            billActionHandlers.showSuccessNotification(
                'Recurring bills regenerated successfully'
            );
            this.rerender();
        } catch (error) {
            console.error('Error regenerating bills:', error);
            billActionHandlers.showErrorNotification(error.message, 'Regeneration Failed');
        }
    }

    handleExportData() {
        billActionHandlers.exportData();
    }

    handleImportData(file) {
        billActionHandlers.importData(file);
    }

    handleLogin(email, password) {
        // Placeholder for future Supabase integration
        console.log('Login:', email);
    }

    handleSignUp(email, password) {
        // Placeholder for future Supabase integration
        console.log('Sign up:', email);
    }

    handleLogout() {
        localStorage.removeItem('userEmail');
        window.location.reload();
    }

    handleToggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');

        // Update button icon
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) themeBtn.textContent = isDark ? '☀️' : '🌓';
    }

    handleShowSettings() {
        settingsHandlers.showSettingsModal(this.categories);
    }

    /**
     * Initialize payment modals
     */
    initializePaymentModals() {
        const container = document.getElementById('paymentModals');
        if (!container) return;

        container.innerHTML = `
            <div id="recordPaymentModal" class="modal">
                <div class="modal-content">
                    <span class="close" id="closeRecordPayment">&times;</span>
                    <h2>Record Payment</h2>
                    <form id="recordPaymentForm">
                        <input type="hidden" id="paymentBillId">
                        <div class="form-group"><label>Amount Paid:</label><input type="number" id="paymentAmount" step="0.01" required></div>
                        <div class="form-group"><label>Payment Date:</label><input type="date" id="paymentDate" required></div>
                        <div class="form-group"><label>Payment Method:</label><select id="paymentMethod">
                            <option value="Credit Card">💳 Credit Card</option>
                            <option value="Debit Card">💳 Debit Card</option>
                            <option value="Bank Transfer">🏦 Bank Transfer</option>
                            <option value="Cash">💵 Cash</option>
                            <option value="Check">📝 Check</option>
                            <option value="PayPal">💰 PayPal</option>
                            <option value="Venmo">💸 Venmo</option>
                        </select></div>
                        <div class="form-group"><label>Confirmation # (Optional):</label><input type="text" id="paymentConfirmation"></div>
                        <button type="submit" class="submit-btn">💾 Record Payment</button>
                    </form>
                </div>
            </div>
            <div id="viewHistoryModal" class="modal">
                <div class="modal-content"><span class="close" id="closeViewHistory">&times;</span><h2>📜 Payment History</h2><div id="historyContent"></div></div>
            </div>
        `;

        document.getElementById('closeRecordPayment').addEventListener('click', () => {
            document.getElementById('recordPaymentModal').style.display = 'none';
        });
        document.getElementById('closeViewHistory').addEventListener('click', () => {
            document.getElementById('viewHistoryModal').style.display = 'none';
        });

        document.getElementById('recordPaymentForm').addEventListener('submit', e => {
            e.preventDefault();
            const billId = document.getElementById('paymentBillId').value;
            const paymentData = {
                amount: document.getElementById('paymentAmount').value,
                date: document.getElementById('paymentDate').value,
                method: document.getElementById('paymentMethod').value,
                confirmationNumber: document.getElementById('paymentConfirmation').value
            };

            if (billActionHandlers.recordPayment(billId, paymentData)) {
                document.getElementById('recordPaymentModal').style.display = 'none';
                document.getElementById('recordPaymentForm').reset();
                this.rerender();
            }
        });
    }

    /**
     * Initialize theme from localStorage
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }
}

// Export singleton instance
export const appOrchestrator = new AppOrchestrator();
