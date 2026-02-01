/**
 * App Orchestrator Module
 * Manages app initialization, state coordination, and component delegation
 * Replaces most of the monolithic index.js
 */

import { appState } from './store/appState.js';
import { billStore } from './store/BillStore.js';
import { paycheckManager } from './utils/paycheckManager.js';
import { createLocalDate } from './utils/dates.js';

import { initializeHeader, updateHeaderUI } from './components/header.js';
import { initializeSidebar } from './components/sidebar.js';
import { initializeBillGrid, renderBillGrid } from './components/billGrid.js';
import { initializeDashboard, renderDashboard } from './components/dashboard.js';
import { initializeBillForm, openBillForm, resetBillForm, closeBillForm } from './components/billForm.js';
import { initializeAuthModal, openAuthModal, closeAuthModal, setAuthMessage } from './components/authModal.js';

import { initializeCalendarView, renderCalendar } from './views/calendarView.js';
import { initializeAnalyticsView, renderAnalytics, cleanupCharts } from './views/analyticsView.js';

import {
    billActionHandlers,
    validateBill,
    bulkDelete,
    bulkMarkAsPaid,
    migrateBillsToPaymentHistory
} from './handlers/billActionHandlers.js';
import { filterBillsByPeriod } from './utils/billHelpers.js';

import { settingsHandlers } from './handlers/settingsHandler.js';

import {
    initializeSupabase,
    getUser,
    signIn,
    signUp,
    signOut,
    resetPassword,
    syncBills,
    fetchCloudBills
} from './services/supabase.js';

import { safeJSONParse } from './utils/validation.js';

class AppOrchestrator {
    constructor() {
        this.categories = [];
        this.initialized = false;
        this.isSyncing = false;
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

            // Check for logged-in user FIRST to set localStorage for Sidebar
            const user = await getUser();
            if (user) {
                console.log('User logged in:', user.email);
                localStorage.setItem('userEmail', user.email);
            } else {
                localStorage.removeItem('userEmail');
            }

            // Get paycheck labels
            const paycheckLabels = paycheckManager.getPaycheckLabels();

            // Initialize all views
            initializeCalendarView();
            initializeAnalyticsView();

            // Initialize components with callbacks
            initializeHeader(paycheckLabels, {
                onPaycheckSelect: (index) => this.handlePaycheckSelect(index),
                onFilterChange: (filter) => this.handleFilterChange(filter),
                onAllBillsSelect: () => this.handleAllBillsSelect(),
                onToggleTheme: () => this.handleToggleTheme(),
                onShowSettings: () => this.handleShowSettings(),
                onDisplayModeSelect: (mode) => this.handleDisplayModeSelect(mode),
                onToggleCarriedForward: (show) => this.handleToggleCarriedForward(show)
            });

            initializeSidebar(this.categories, {
                onCategorySelect: (category) => this.handleCategorySelect(category),
                onOpenAddBill: () => this.handleOpenAddBill(),
                onRegenerateBills: () => this.handleRegenerateBills(),
                onExportData: () => this.handleExportData(),
                onImportData: (file) => this.handleImportData(file),
                onOpenAuth: () => openAuthModal(),
                onLogout: () => this.handleLogout(),
                onBulkDelete: () => this.handleBulkDelete(),
                onBulkMarkPaid: () => this.handleBulkMarkPaid()
            });

            // Fetch cloud data if logged in
            if (user) {
                console.log('Diagnostic: User logged in:', user.email);
                const { data, error } = await fetchCloudBills();
                if (data && data.length > 0) {
                    console.log(`Diagnostic: Found ${data.length} bills in cloud. Updating local store.`);
                    billStore.setBills(data);
                } else {
                    console.log('Diagnostic: No bills found in cloud (or empty).');
                    if (error) console.error('Cloud fetch error:', error);
                }
            } else {
                console.log('Diagnostic: No user logged in.');
            }

            console.log(`Diagnostic: Total bills in store: ${billStore.getAll().length}`);
            const categoriesFound = [...new Set(billStore.getAll().map(b => b.category))];
            console.log(`Diagnostic: Categories detected: ${categoriesFound.join(', ')}`);
            console.log('Diagnostic: Current app state category:', appState.getState('selectedCategory'));

            initializeBillForm(this.categories, {
                onSaveBill: () => this.handleSaveBill()
            });

            initializeAuthModal({
                onLogin: (email, password) => this.handleLogin(email, password),
                onSignUp: (email, password) => this.handleSignUp(email, password),
                onResetPassword: (email) => this.handleResetPassword(email)
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

            // Subscribe to store changes for re-rendering AND Cloud Sync
            billStore.subscribe((bills) => {
                this.rerender();
                this.handleCloudSync(bills);
            });

            // Auto-select current pay period if none selected
            if (appState.getState('selectedPaycheck') === null) {
                const autoIndex = paycheckManager.getAutoSelectedPayPeriodIndex();
                appState.setSelectedPaycheck(autoIndex);
            }

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
     * Handle Cloud Synchronization
     * Debounced to prevent excessive API calls
     */
    async handleCloudSync(bills) {
        if (this.isSyncing) return;

        // Simple debounce
        if (this.syncTimeout) clearTimeout(this.syncTimeout);

        this.syncTimeout = setTimeout(async () => {
            const user = await getUser();
            if (user) {
                this.isSyncing = true;
                const { error } = await syncBills(bills);
                this.isSyncing = false;

                if (error) {
                    console.error('Cloud sync failed:', error);
                    // Silent fail or small indicator?
                } else {
                    console.log('Cloud sync successful');
                }
            }
        }, 2000); // 2 second debounce
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

        // Get from storage
        let categories = safeJSONParse(localStorage.getItem('customCategories'), [...DEFAULT_CATEGORIES]);

        // Safety check: ensure categories from existing bills are included
        const bills = billStore.getAll();
        if (bills.length > 0) {
            const billCats = [...new Set(bills.map(b => b.category))].filter(c => c && c.trim() !== '');
            categories = [...new Set([...categories, ...billCats])];
        }

        this.categories = categories;
        localStorage.setItem('customCategories', JSON.stringify(categories));
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

            // Update header UI
            updateHeaderUI(state.viewMode, state.selectedPaycheck, state.displayMode, state.showCarriedForward);

            // Render appropriate view based on displayMode
            const billGrid = document.getElementById('billGrid');
            const calendarView = document.getElementById('calendarView');
            const analyticsView = document.getElementById('analyticsView');

            // Hide all views first
            const dashboard = document.getElementById('dashboard');
            if (billGrid) billGrid.style.display = 'none';
            if (calendarView) calendarView.style.display = 'none';
            if (analyticsView) analyticsView.style.display = 'none';
            if (dashboard) dashboard.style.display = 'none';

            if (state.displayMode === 'calendar') {
                if (calendarView) calendarView.style.display = 'block';
                renderCalendar();
            } else if (state.displayMode === 'analytics') {
                if (analyticsView) analyticsView.style.display = 'block';
                renderAnalytics({
                    bills,
                    viewMode: state.viewMode,
                    selectedPaycheck: state.selectedPaycheck,
                    payCheckDates: paycheckManager.payCheckDates
                });
            } else {
                // List view (default)
                if (billGrid) billGrid.style.display = 'block';
                if (dashboard) dashboard.style.display = 'block';

                // Render dashboard
                renderDashboard(bills, state.viewMode, state.selectedPaycheck, state.selectedCategory, state.paymentFilter, paycheckManager.payCheckDates, state.showCarriedForward);

                renderBillGrid(
                    {
                        bills,
                        viewMode: state.viewMode,
                        selectedPaycheck: state.selectedPaycheck,
                        selectedCategory: state.selectedCategory,
                        paymentFilter: state.paymentFilter,
                        showCarriedForward: state.showCarriedForward,
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

        // Synchronize calendar view to the month of the selected paycheck
        const selectedPaycheckDate = paycheckManager.payCheckDates[index];
        if (selectedPaycheckDate) {
            appState.setCurrentCalendarDate(new Date(selectedPaycheckDate));
        }
    }

    handleFilterChange(filter) {
        appState.setPaymentFilter(filter);
    }

    handleToggleCarriedForward(show) {
        appState.setShowCarriedForward(show);
    }

    handleAllBillsSelect() {
        appState.setViewMode('all');
        // Reset calendar to today's month when viewing all bills
        appState.setCurrentCalendarDate(new Date());
    }

    handleCategorySelect(category) {
        appState.setSelectedCategory(category);
        appState.setViewMode('filtered');
        // Ensure we switch back to list view when category is selected
        appState.setDisplayMode('list');
    }

    handleDisplayModeSelect(mode) {
        appState.setDisplayMode(mode);
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
            notes: '',
            website: ''
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
                website: document.getElementById('billWebsite').value,
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
            openBillForm(bill);
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

        const historyContent = document.getElementById('historyContent');
        historyContent.innerHTML = ''; // safe to clear

        const summaryCard = document.createElement('div');
        summaryCard.style.padding = '15px';
        summaryCard.style.background = '#f8f9fa';
        summaryCard.style.borderRadius = '4px';
        summaryCard.style.marginBottom = '15px';

        const title = document.createElement('h3');
        title.style.margin = '0 0 10px 0';
        title.textContent = bill.name;
        summaryCard.appendChild(title);

        const statsDiv = document.createElement('div');
        statsDiv.style.display = 'flex';
        statsDiv.style.gap = '20px';
        statsDiv.style.fontSize = '14px';

        const createStat = (label, value, color = null) => {
            const span = document.createElement('span');
            if (color) span.style.color = color;
            const strong = document.createElement('strong');
            strong.textContent = `${label}: `;
            span.appendChild(strong);
            span.appendChild(document.createTextNode(`$${value.toFixed(2)}`));
            return span;
        };

        statsDiv.appendChild(createStat('Total Due', totalDue));
        statsDiv.appendChild(createStat('Total Paid', totalPaid));
        statsDiv.appendChild(createStat('Remaining', remaining, remaining > 0 ? '#e74c3c' : '#27ae60'));

        summaryCard.appendChild(statsDiv);
        historyContent.appendChild(summaryCard);

        const listContainer = document.createElement('div');
        listContainer.style.maxHeight = '400px';
        listContainer.style.overflowY = 'auto';

        if (payments.length > 0) {
            payments.forEach(payment => {
                const item = document.createElement('div');
                item.style.padding = '12px';
                item.style.borderLeft = '3px solid #5eb3d6';
                item.style.background = 'white';
                item.style.marginBottom = '10px';
                item.style.borderRadius = '4px';

                const header = document.createElement('div');
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.marginBottom = '5px';

                const dateStr = new Date(payment.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                const dateStrong = document.createElement('strong');
                dateStrong.textContent = dateStr;
                header.appendChild(dateStrong);

                const amountStrong = document.createElement('strong');
                amountStrong.style.color = '#27ae60';
                amountStrong.textContent = `$${payment.amount.toFixed(2)}`;
                header.appendChild(amountStrong);

                item.appendChild(header);

                const details = document.createElement('div');
                details.style.fontSize = '13px';
                details.style.color = '#666';

                let detailText = payment.method;
                if (payment.confirmationNumber) {
                    detailText += ` | Conf: ${payment.confirmationNumber}`;
                }
                details.textContent = detailText;

                item.appendChild(details);
                listContainer.appendChild(item);
            });
        } else {
            const emptyState = document.createElement('p');
            emptyState.style.textAlign = 'center';
            emptyState.style.color = '#999';
            emptyState.style.padding = '20px';
            emptyState.textContent = 'No payments recorded yet';
            listContainer.appendChild(emptyState);
        }

        historyContent.appendChild(listContainer);
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

    async handleLogin(email, password) {
        setAuthMessage('Signing in...', false);
        const { data, error } = await signIn(email, password);
        if (error) {
            setAuthMessage(error.message, true);
        } else {
            // Save user email to localStorage so Sidebar can read it on reload
            if (data.user && data.user.email) {
                localStorage.setItem('userEmail', data.user.email);
            }

            closeAuthModal();
            billActionHandlers.showSuccessNotification('Logged in successfully');

            // Sync/Fetch on login
            const { data: bills, error: fetchError } = await fetchCloudBills();
            if (bills && bills.length > 0) {
                billStore.setBills(bills);
            } else if (billStore.getAll().length > 0) {
                // If cloud empty but local has data, upload local
                await syncBills(billStore.getAll());
            }
            window.location.reload(); // To refresh sidebar user state/icon
        }
    }

    async handleSignUp(email, password) {
        setAuthMessage('Signing up...', false);
        const { data, error } = await signUp(email, password);
        if (error) {
            setAuthMessage(error.message, true);
        } else {
            setAuthMessage('Account created! Please check your email.', false);
        }
    }

    async handleLogout() {
        await signOut();
        localStorage.removeItem('userEmail');
        window.location.reload();
    }

    async handleResetPassword(email) {
        console.log('AppOrchestrator: handleResetPassword called for', email);
        setAuthMessage('Sending reset email...', false);
        try {
            const { error } = await resetPassword(email);
            if (error) {
                console.error('Reset password error:', error);
                setAuthMessage(error.message || 'Failed to send reset email', true);
            } else {
                console.log('Reset email sent successfully');
                setAuthMessage('Success! Check your inbox (and Spam folder).', false);
            }
        } catch (err) {
            console.error('Unexpected error during password reset:', err);
            setAuthMessage('An unexpected error occurred. Check the console.', true);
        }
    }

    handleBulkDelete() {
        const bills = billStore.getAll();
        const ids = bills.map(b => b.id);
        if (bulkDelete(ids)) {
            this.rerender();
        }
    }

    handleBulkMarkPaid() {
        const bills = billStore.getAll();
        const state = appState.getState();
        const { viewMode, selectedPaycheck, selectedCategory, paymentFilter } = state;
        const payCheckDates = paycheckManager.payCheckDates;

        let visibleBills = [];

        if (viewMode === 'all') {
            visibleBills = filterBillsByPeriod(bills, 'all', null, null, paymentFilter, payCheckDates);
        } else {
            if (selectedPaycheck === null || selectedCategory === null) return;
            visibleBills = filterBillsByPeriod(bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates);
        }


        // Apply same payment filter as grid (though mark paid only makes sense for unpaid)
        if (paymentFilter === 'unpaid') {
            visibleBills = visibleBills.filter(bill => !bill.isPaid);
        } else if (paymentFilter === 'paid') {
            visibleBills = visibleBills.filter(bill => bill.isPaid);
        }

        const ids = visibleBills.filter(b => !b.isPaid).map(b => b.id);

        if (ids.length === 0) {
            billActionHandlers.showErrorNotification('No unpaid bills visible to mark as paid.', 'Bulk Action');
            return;
        }

        if (bulkMarkAsPaid(ids)) {
            this.rerender();
        }
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
