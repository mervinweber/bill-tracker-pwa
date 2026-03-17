/**
 * App Orchestrator Module
 * Manages app initialization, state coordination, and component delegation
 * Replaces most of the monolithic index.js
 */

import { appState } from './store/appState.js';
import { billStore } from './store/BillStore.js';
import { paycheckManager } from './utils/paycheckManager.js';
import { createLocalDate, getMissedMonthlyCycles } from './utils/dates.js';
import StorageManager from './utils/StorageManager.js';
import logger from './utils/logger.js';
import { STORAGE_KEYS } from './utils/constants.js';

import { initializeHeader, updateHeaderUI } from './components/header.js';
import { initializeSidebar } from './components/sidebar.js';
import { initializeBillGrid, renderBillGrid, cleanupBillGrid } from './components/billGrid.js';
import { initializeDashboard, renderDashboard } from './components/dashboard.js';
import { initializeBillForm, openBillForm, resetBillForm, closeBillForm } from './components/billForm.js';
import { initializeAuthModal, openAuthModal, closeAuthModal, setAuthMessage } from './components/authModal.js';

import { initializeCalendarView, renderCalendar } from './views/calendarView.js';
import { initializeAnalyticsView, renderAnalytics, cleanupCharts } from './views/analyticsView.js';
import { initializeUpcomingBillsView, renderUpcomingBills } from './views/upcomingBillsView.js';

import {
    billActionHandlers,
    validateBill,
    bulkDelete,
    bulkMarkAsPaid,
    migrateBillsToPaymentHistory
} from './handlers/billActionHandlers.js';
import { filterBillsByPeriod } from './utils/billHelpers.js';

import { settingsHandlers } from './handlers/settingsHandler.js';

import { initializeResponsiveDetection, isMobileViewport } from './utils/mobileGestures.js';

import {
    initializeSupabase,
    getUser,
    signIn,
    signUp,
    signOut,
    resetPassword,
    syncBills,
    syncUserData,
    syncPaymentSettings,
    fetchCloudBills,
    fetchCloudPaymentSettings
} from './services/supabase.js';

import { safeJSONParse } from './utils/validation.js';
import { checkAndSendDueBillReminders } from './utils/notifications.js';
import { recordAuditEvent } from './utils/auditTracker.js';
import {
    syncBillsFromCloud,
    syncLocalDataToCloudIfNeeded,
    syncPaymentSettingsFromCloud
} from './utils/cloudSyncManager.js';
import {
    LOGIN_LOCKOUT_RULES,
    clearLoginAttemptState,
    formatRetryAfter,
    getLoginAttemptStatus,
    recordFailedLoginAttempt
} from './utils/loginAttemptGuard.js';

const isCredentialFailure = (error) => {
    const message = (error?.message || '').toLowerCase();
    const code = (error?.code || '').toLowerCase();
    const status = error?.status;

    if (code.includes('invalid_credentials')) return true;
    if (message.includes('invalid login credentials')) return true;
    if (message.includes('invalid credentials')) return true;
    return status === 400 || status === 401;
};

class AppOrchestrator {
    constructor() {
        this.categories = [];
        this.initialized = false;
        this.isSyncing = false;
        this.cleanupResponsiveDetection = null;
    }

    /**
     * Initialize app - called on DOMContentLoaded
     */
    async initialize() {
        try {
            // Initialize mobile/responsive detection
            this.cleanupResponsiveDetection = initializeResponsiveDetection();

            window.addEventListener('beforeunload', () => {
                this.cleanup();
            });

            // Check if user has payment settings
            const hasSettings = StorageManager.get(STORAGE_KEYS.PAYMENT_SETTINGS);
            if (!hasSettings) {
                window.location.href = 'setup.html';
                return;
            }

            // Load categories
            this.loadCategories();

            // Initialize theme
            this.initializeTheme();

            // Initialize Supabase
            await initializeSupabase();

            // Check for logged-in user FIRST to set localStorage for Sidebar
            const user = await getUser();
            if (user) {
                logger.info('User authenticated and session initialized');
                StorageManager.set(STORAGE_KEYS.USER_EMAIL, user.email);
            } else {
                StorageManager.remove(STORAGE_KEYS.USER_EMAIL);
            }

            // Get paycheck labels
            const paycheckLabels = paycheckManager.getPaycheckLabels();

            // Initialize all views
            initializeCalendarView();
            initializeAnalyticsView();
            initializeUpcomingBillsView();

            // Initialize components with callbacks
            initializeHeader(paycheckLabels, {
                onPaycheckSelect: (index) => this.handlePaycheckSelect(index),
                onFilterChange: (filter) => this.handleFilterChange(filter),
                onAllBillsSelect: () => this.handleAllBillsSelect(),
                onUpcomingBillsSelect: () => this.handleUpcomingBillsSelect(),
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
                onBulkMarkPaid: () => this.handleBulkMarkPaid(),
                onShowSettings: () => this.handleShowSettings()
            });

            // Fetch cloud data if logged in
            if (user) {
                logger.info('Syncing cloud data for authenticated user');
                StorageManager.set(STORAGE_KEYS.USER_EMAIL, user.email);
                try {
                    const { cloudPaymentSettings } = await syncPaymentSettingsFromCloud({
                        fetchCloudPaymentSettings,
                        storageManager: StorageManager,
                        storageKeys: STORAGE_KEYS,
                        paycheckManager,
                        logger
                    });

                    const { cloudBills } = await syncBillsFromCloud({
                        fetchCloudBills,
                        billStore,
                        storageManager: StorageManager,
                        storageKeys: STORAGE_KEYS,
                        logger,
                        onFetchError: () => {
                            billActionHandlers.showErrorNotification('Could not fetch bills from cloud', 'Sync Warning');
                        }
                    });

                    await syncLocalDataToCloudIfNeeded({
                        cloudBills,
                        cloudPaymentSettings,
                        billStore,
                        storageManager: StorageManager,
                        storageKeys: STORAGE_KEYS,
                        syncUserData,
                        syncPaymentSettings,
                        logger
                    });
                } catch (error) {
                    logger.error('Unexpected error during cloud sync on app init', error);
                }
            }

            const categoriesFound = [...new Set(billStore.getAll().map(b => b.category))];
            logger.debug('App state summary', {
                totalBills: billStore.getAll().length,
                categories: categoriesFound,
                selectedCategory: appState.getState('selectedCategory')
            });

            initializeBillForm(this.categories, {
                onSaveBill: (billData) => this.handleSaveBill(billData),
                onMarkPaid: (billId, isPaid) => this.handleMarkPaidFromModal(billId, isPaid)
            });

            initializeAuthModal({
                getLoginGuardStatus: (email) => getLoginAttemptStatus(email),
                onLogin: (email, password, options) => this.handleLogin(email, password, options),
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
                this.handleDueBillReminders();
            });

            // Auto-select current pay period if none selected
            if (appState.getState('selectedPaycheck') === null) {
                const autoIndex = paycheckManager.getAutoSelectedPayPeriodIndex();
                appState.setSelectedPaycheck(autoIndex);
            }

            // Initial render
            this.rerender();
            this.handleDueBillReminders();

            this.initialized = true;
            logger.info('App initialized successfully');
        } catch (error) {
            logger.error('Error initializing app', error);
            billActionHandlers.showErrorNotification(error.message, 'Initialization Error');
        }
    }

    cleanup() {
        if (typeof this.cleanupResponsiveDetection === 'function') {
            this.cleanupResponsiveDetection();
            this.cleanupResponsiveDetection = null;
        }

        cleanupBillGrid();
        cleanupCharts();
    }

    handleDueBillReminders() {
        try {
            const result = checkAndSendDueBillReminders(billStore.getAll());
            if (result.sentCount > 0) {
                logger.info('Bill due reminders processed', result);
            }
        } catch (error) {
            logger.error('Failed running due bill reminders', error);
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
                    logger.error('Cloud sync failed', error);
                    // Silent fail or small indicator?
                } else {
                    logger.info('Cloud sync successful');
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
        let categories = StorageManager.get(STORAGE_KEYS.CUSTOM_CATEGORIES, [...DEFAULT_CATEGORIES]);

        // Safety check: ensure categories from existing bills are included
        const bills = billStore.getAll();
        if (bills.length > 0) {
            const billCats = [...new Set(bills.map(b => b.category))].filter(c => c && c.trim() !== '');
            categories = [...new Set([...categories, ...billCats])];
        }

        this.categories = categories;
        StorageManager.set(STORAGE_KEYS.CUSTOM_CATEGORIES, categories);
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
            const upcomingBillsView = document.getElementById('upcomingBillsView');

            // Hide all views first
            const dashboard = document.getElementById('dashboard');
            if (billGrid) billGrid.style.display = 'none';
            if (calendarView) calendarView.style.display = 'none';
            if (analyticsView) analyticsView.style.display = 'none';
            if (upcomingBillsView) upcomingBillsView.style.display = 'none';
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
                if (state.viewMode === 'upcoming') {
                    if (upcomingBillsView) upcomingBillsView.style.display = 'block';
                    renderUpcomingBills(
                        { bills },
                        {
                            onTogglePayment: (billId, isPaid) => this.handleTogglePayment(billId, isPaid),
                            onEditBill: (billId) => this.handleEditBill(billId),
                            onUpdateDueDate: (billId, dueDate) => this.handleUpdateDueDate(billId, dueDate),
                            paycheckAmount: paycheckManager.paymentSettings?.amount
                        }
                    );
                } else {
                    if (billGrid) billGrid.style.display = 'block';

                    // Zero-bill empty state — skip dashboard, show getting-started panel
                    if (bills.length === 0) {
                        if (dashboard) dashboard.style.display = 'none';
                        billGrid.className = 'flex flex-col gap-4 p-4 sm:p-6';
                        billGrid.innerHTML = `
                            <div class="flex flex-col items-center justify-center gap-6 py-14 px-6 max-w-lg mx-auto w-full">
                                <div class="rounded-full bg-muted p-5 text-4xl" aria-hidden="true">📋</div>
                                <div class="text-center space-y-1">
                                    <h2 class="text-xl font-semibold text-foreground">Welcome to Bill Tracker</h2>
                                    <p class="text-sm text-muted-foreground">You haven't added any bills yet. Follow these steps to get started.</p>
                                </div>
                                <div class="w-full space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                                    <div class="flex items-start gap-3">
                                        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                                        <div>
                                            <p class="text-sm font-medium text-foreground">Add your first bill</p>
                                            <p class="text-xs text-muted-foreground mt-0.5">Enter a bill name, amount, and due date to start tracking.</p>
                                        </div>
                                    </div>
                                    <div class="border-t border-border"></div>
                                    <div class="flex items-start gap-3">
                                        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold border border-border">2</span>
                                        <div>
                                            <p class="text-sm font-medium text-foreground">Enable reminders</p>
                                            <p class="text-xs text-muted-foreground mt-0.5">Turn on notifications so you're alerted before payments are due.</p>
                                        </div>
                                    </div>
                                    <div class="border-t border-border"></div>
                                    <div class="flex items-start gap-3">
                                        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold border border-border">3</span>
                                        <div>
                                            <p class="text-sm font-medium text-foreground">Review upcoming bills</p>
                                            <p class="text-xs text-muted-foreground mt-0.5">Use the Upcoming view to see what's due each pay period.</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
                                    <button id="emptyStateAddBill" type="button"
                                        class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-10 px-6 bg-primary text-primary-foreground shadow hover:bg-primary/90">
                                        + Add Your First Bill
                                    </button>
                                    <label for="emptyStateImport"
                                        class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-10 px-6 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">
                                        📥 Import from Backup
                                    </label>
                                    <input id="emptyStateImport" type="file" accept=".json" class="sr-only" />
                                </div>
                            </div>
                        `;
                        const addBtn = document.getElementById('emptyStateAddBill');
                        const importInput = /** @type {HTMLInputElement|null} */ (document.getElementById('emptyStateImport'));
                        if (addBtn) addBtn.addEventListener('click', () => this.handleOpenAddBill());
                        if (importInput) importInput.addEventListener('change', (e) => {
                            const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
                            if (file) this.handleImportData(file);
                        });
                        return;
                    }

                    if (dashboard) dashboard.style.display = 'block';
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
                            onEditBill: (billId) => this.handleEditBill(billId),
                            onToggleReminder: (billId, enabled) => this.handleToggleReminder(billId, enabled)
                        }
                    );
                }
            }
        } catch (error) {
            logger.error('Error re-rendering', error);
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

    handleUpcomingBillsSelect() {
        appState.setViewMode('upcoming');
        appState.setDisplayMode('list');
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
            reminderEnabled: true,
            notes: '',
            website: ''
        });
    }

    handleSaveBill(billData = null) {
        try {
            const g = (id) => /** @type {any} */ (document.getElementById(id));
            const id = billData?.id || g('billId').value;
            const bills = billStore.getAll();
            const existingBill = id ? bills.find(b => b.id === id) : null;

            let dueDateString = billData?.dueDate || g('billDueDate').value;

            // Only snap bill date to closest paycheck when CREATING new bills
            if (!existingBill) {
                const billDueDate = new Date(dueDateString);
                const snappedDate = paycheckManager.snapBillDateToPaycheck(billDueDate);
                dueDateString = snappedDate.toISOString().split('T')[0];
            }

            // Read split data if not provided in billData
            let split = billData?.split;
            if (!split) {
                const splitEnabled = g('billSplitEnabled')?.checked;
                if (splitEnabled) {
                    const payersList = g('payersList');
                    const payerRows = Array.from(payersList.querySelectorAll('div.flex'));
                    const payers = payerRows.map(row => ({
                        id: Math.random().toString(36).substr(2, 9),
                        name: row.querySelector('.payer-name').value,
                        amount: parseFloat(row.querySelector('.payer-amount').value) || 0,
                        isPaid: false
                    }));
                    split = { enabled: true, payers };
                } else {
                    split = { enabled: false, payers: [] };
                }
            }

            const bill = {
                id: id || Date.now().toString(),
                category: billData?.category || g('billCategory').value,
                name: billData?.name || g('billName').value,
                dueDate: dueDateString,
                amountDue: billData?.amountDue || parseFloat(g('billAmountDue').value),
                balance: billData?.balance || (g('billBalance').value
                    ? parseFloat(g('billBalance').value)
                    : parseFloat(g('billAmountDue').value)),
                recurrence: billData?.recurrence || g('billRecurrence').value,
                reminderEnabled: billData?.reminderEnabled ?? g('billReminderEnabled').checked,
                notes: billData?.notes || g('billNotes').value,
                website: billData?.website || g('billWebsite').value,
                split: split,
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
            g('billFormElement').reset();
            g('billId').value = '';

            billActionHandlers.showSuccessNotification(
                `Bill "${bill.name}" ${id ? 'updated' : 'created'} successfully`
            );
        } catch (error) {
            logger.error('Error saving bill', error);
            billActionHandlers.showErrorNotification(error.message, 'Save Failed');
        }
    }

    handleUpdateBalance(billId, newBalance) {
        billActionHandlers.updateBillBalance(billId, newBalance);
    }

    handleUpdateDueDate(billId, newDueDate) {
        try {
            const bills = billStore.getAll();
            const bill = bills.find((existingBill) => existingBill.id === billId);
            if (!bill) return;

            if (!newDueDate || Number.isNaN(new Date(newDueDate).getTime())) {
                billActionHandlers.showErrorNotification('Please provide a valid due date.', 'Invalid Date');
                return;
            }

            billStore.update({
                ...bill,
                dueDate: newDueDate
            });

            recordAuditEvent('bill.due_date.updated', {
                entityType: 'bill',
                entityId: billId,
                summary: `Due date updated for ${bill.name}`,
                metadata: {
                    previousDueDate: bill.dueDate,
                    newDueDate
                }
            });

            billActionHandlers.showSuccessNotification(`Updated due date for "${bill.name}"`);
        } catch (error) {
            logger.error('Error updating due date', error);
            billActionHandlers.showErrorNotification(error.message, 'Due Date Update Failed');
        }
    }

    handleTogglePayment(billId, isPaid) {
        const bills = billStore.getAll();
        const bill = bills.find(b => b.id === billId);
        if (!bill) return;

        if (isPaid) {
            this.handleRecordPayment(billId);
            this.rerender();
            return;
        }

        if (!confirm(`Mark "${bill.name}" as unpaid?`)) {
            this.rerender();
            return;
        }

        billActionHandlers.togglePaymentStatus(billId, false);
    }

    handleToggleReminder(billId, enabled) {
        try {
            const bills = billStore.getAll();
            const bill = bills.find(b => b.id === billId);
            if (!bill) return;

            billStore.update({
                ...bill,
                reminderEnabled: enabled
            });
        } catch (error) {
            logger.error('Error toggling reminder setting', error);
            billActionHandlers.showErrorNotification(error.message, 'Reminder Update Failed');
        }
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

    handleMarkPaidFromModal(billId, isPaid) {
        if (isPaid) {
            closeBillForm();
            this.handleRecordPayment(billId);
            return;
        }

        billActionHandlers.togglePaymentStatus(billId, false);
        closeBillForm();
        this.rerender();
    }

    handleRecordPayment(billId) {
        const bills = billStore.getAll();
        const bill = bills.find(b => b.id === billId);
        if (!bill) return;

        const strategySection = document.getElementById('monthlyStrategySection');
        const strategyHint = document.getElementById('monthlyStrategyHint');
        const singleCycleOption = document.getElementById('paymentStrategySingleCycle');

        const missedCycles = bill.recurrence === 'Monthly'
            ? getMissedMonthlyCycles(createLocalDate(bill.dueDate), new Date())
            : 0;

        if (bill.recurrence === 'Monthly' && missedCycles >= 2) {
            strategySection.style.display = 'block';
            strategyHint.textContent = `${missedCycles} months past due. Choose how to advance this recurring bill.`;
        } else {
            strategySection.style.display = 'none';
            strategyHint.textContent = '';
        }

        /** @type {HTMLInputElement} */ (singleCycleOption).checked = true;
        const f = (id) => /** @type {any} */ (document.getElementById(id));
        f('paymentBillName').textContent = bill.name;
        f('paymentRemainingAmount').textContent =
            `$${billActionHandlers.getRemainingBalance(bill).toFixed(2)}`;
        f('paymentBillId').value = billId;
        f('paymentAmount').value = billActionHandlers
            .getRemainingBalance(bill)
            .toFixed(2);
        f('paymentDate').value = new Date()
            .toISOString()
            .split('T')[0];
        f('paymentOptionalDetails').open = false;
        f('recordPaymentModal').style.display = 'block';
    }

    handleViewHistory(billId) {
        const bills = billStore.getAll();
        const bill = bills.find(b => b.id === billId);
        if (!bill) return;

        const totalDue = bill.amountDue || 0;
        const totalPaid = billActionHandlers.getTotalPaid(bill);
        const remaining = billActionHandlers.getRemainingBalance(bill);
        const payments = (bill.paymentHistory || []).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
            logger.error('Error regenerating bills', error);
            billActionHandlers.showErrorNotification(error.message, 'Regeneration Failed');
        }
    }

    handleExportData() {
        billActionHandlers.exportData();
    }

    handleImportData(file) {
        billActionHandlers.importData(file);
    }

    async handleLogin(email, password, options = {}) {
        const preCheck = getLoginAttemptStatus(email);
        if (preCheck.isLocked) {
            const retryText = formatRetryAfter(preCheck.retryAfterMs);
            setAuthMessage(
                `Too many failed attempts. Please wait ${retryText} before trying again.`,
                true
            );
            recordAuditEvent('auth.login.blocked', {
                entityType: 'auth',
                summary: 'Login blocked by local lockout guard',
                metadata: {
                    email,
                    retryAfterMs: preCheck.retryAfterMs,
                    maxAttempts: LOGIN_LOCKOUT_RULES.maxAttempts
                }
            });
            return;
        }

        setAuthMessage('Signing in...', false);
    const { data, error } = await signIn(email, password, options);
        if (error) {
            if (isCredentialFailure(error)) {
                const postFailure = recordFailedLoginAttempt(email);
                if (postFailure.isLocked) {
                    const retryText = formatRetryAfter(postFailure.retryAfterMs);
                    setAuthMessage(
                        `Account temporarily locked after ${LOGIN_LOCKOUT_RULES.maxAttempts} failed attempts. Try again in ${retryText}.`,
                        true
                    );
                } else {
                    setAuthMessage(
                        `${error.message} (${postFailure.remainingAttempts} attempt(s) remaining before temporary lockout)`,
                        true
                    );
                }
            } else {
                setAuthMessage(error.message, true);
            }

            recordAuditEvent('auth.login.failed', {
                entityType: 'auth',
                summary: 'Login attempt failed',
                metadata: {
                    email,
                    message: error.message,
                    trackedByLockoutGuard: isCredentialFailure(error)
                }
            });
        } else {
            clearLoginAttemptState(email);

            // Save user email to localStorage so Sidebar can read it on reload
            if (data.user && data.user.email) {
                StorageManager.set(STORAGE_KEYS.USER_EMAIL, data.user.email);
            }

            recordAuditEvent('auth.login.succeeded', {
                entityType: 'auth',
                summary: 'User logged in',
                metadata: {
                    email: data.user?.email || null
                }
            });

            closeAuthModal();
            billActionHandlers.showSuccessNotification('Logged in successfully');

            // Sync/Fetch on login
            try {
                const { cloudPaymentSettings } = await syncPaymentSettingsFromCloud({
                    fetchCloudPaymentSettings,
                    storageManager: StorageManager,
                    storageKeys: STORAGE_KEYS,
                    paycheckManager,
                    logger
                });

                const { cloudBills } = await syncBillsFromCloud({
                    fetchCloudBills,
                    billStore,
                    storageManager: StorageManager,
                    storageKeys: STORAGE_KEYS,
                    logger,
                    onFetchError: () => {
                        billActionHandlers.showErrorNotification('Could not fetch bills from cloud', 'Sync Error');
                    }
                });

                await syncLocalDataToCloudIfNeeded({
                    cloudBills,
                    cloudPaymentSettings,
                    billStore,
                    storageManager: StorageManager,
                    storageKeys: STORAGE_KEYS,
                    syncUserData,
                    syncPaymentSettings,
                    logger,
                    onSyncError: () => {
                        billActionHandlers.showErrorNotification('Could not sync data to cloud', 'Sync Error');
                    }
                });
            } catch (err) {
                logger.error('Error syncing data on login', err);
                billActionHandlers.showErrorNotification('Error syncing data from cloud', 'Sync Error');
            }

            // Add small delay to ensure storage is written before reload
            // This is especially important on mobile devices
            setTimeout(() => {
                window.location.reload(); // To refresh sidebar user state/icon and apply synced settings
            }, 500);
        }
    }

    async handleSignUp(email, password) {
        setAuthMessage('Signing up...', false);
        const { data, error } = await signUp(email, password);
        if (error) {
            setAuthMessage(error.message, true);
            recordAuditEvent('auth.signup.failed', {
                entityType: 'auth',
                summary: 'Signup attempt failed',
                metadata: { message: error.message }
            });
        } else {
            setAuthMessage('Account created! Please check your email.', false);
            recordAuditEvent('auth.signup.succeeded', {
                entityType: 'auth',
                summary: 'Signup completed',
                metadata: { email: data?.user?.email || email }
            });
        }
    }

    async handleLogout() {
        const userEmail = StorageManager.get(STORAGE_KEYS.USER_EMAIL, null);
        await signOut();
        recordAuditEvent('auth.logout', {
            entityType: 'auth',
            summary: 'User logged out',
            metadata: { email: userEmail }
        });
        StorageManager.remove(STORAGE_KEYS.USER_EMAIL);
        window.location.reload();
    }

    async handleResetPassword(email) {
        logger.info('Password reset requested');
        setAuthMessage('Sending reset email...', false);
        try {
            const { error } = await resetPassword(email);
            if (error) {
                logger.error('Reset password error', error);
                setAuthMessage(error.message || 'Failed to send reset email', true);
            } else {
                logger.info('Reset email sent successfully');
                setAuthMessage('Success! Check your inbox (and Spam folder).', false);
            }
        } catch (err) {
            logger.error('Unexpected error during password reset', err);
            setAuthMessage('An unexpected error occurred. Check the console.', true);
        }
    }

    async handleBulkDelete() {
        const bills = billStore.getAll();
        if (bills.length === 0) {
            billActionHandlers.showErrorNotification('There are no bills to clear.', 'Bulk Action');
            return;
        }

        const ids = bills.map(b => b.id);
        const confirmed = await this.showConfirmationModal({
            title: 'Clear all bills?',
            message: `This will permanently delete ${ids.length} bill${ids.length === 1 ? '' : 's'}. This action cannot be undone.`,
            confirmText: 'Clear All',
            confirmVariant: 'danger'
        });

        if (confirmed && bulkDelete(ids, true)) {
            this.rerender();
        }
    }

    async handleBulkMarkPaid() {
        const bills = billStore.getAll();
        if (bills.length === 0) {
            billActionHandlers.showErrorNotification('There are no bills to update.', 'Bulk Action');
            return;
        }

        const state = appState.getState();
        const { viewMode, selectedPaycheck, selectedCategory, paymentFilter } = state;
        const payCheckDates = paycheckManager.payCheckDates;

        let visibleBills = [];

        if (viewMode === 'all') {
            visibleBills = filterBillsByPeriod(bills, 'all', null, null, paymentFilter, payCheckDates);
        } else {
            if (selectedPaycheck === null || selectedCategory === null) {
                visibleBills = bills;
            } else {
                visibleBills = filterBillsByPeriod(
                    bills,
                    viewMode,
                    selectedPaycheck,
                    selectedCategory,
                    paymentFilter,
                    payCheckDates
                );
            }
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

        const confirmed = await this.showConfirmationModal({
            title: 'Mark bills as paid?',
            message: `This will mark ${ids.length} visible unpaid bill${ids.length === 1 ? '' : 's'} as paid.`,
            confirmText: 'Mark Paid',
            confirmVariant: 'primary'
        });

        if (confirmed && bulkMarkAsPaid(ids, true)) {
            this.rerender();
        }
    }

    showConfirmationModal({
        title,
        message,
        confirmText = 'Confirm',
        confirmVariant = 'primary'
    }) {
        return new Promise((resolve) => {
            const existingModal = document.getElementById('actionConfirmModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.id = 'actionConfirmModal';
            modal.className = 'modal';

            const confirmButtonClass = confirmVariant === 'danger'
                ? 'confirm-btn confirm-btn-danger'
                : 'confirm-btn confirm-btn-primary';

            modal.innerHTML = `
                <div class="modal-content modal-content-compact confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmDialogTitle">
                    <div class="confirm-dialog-header">
                        <h2 id="confirmDialogTitle" class="confirm-dialog-title">${title}</h2>
                    </div>
                    <p class="confirm-dialog-message">${message}</p>
                    <div class="confirm-dialog-actions">
                        <button type="button" class="confirm-btn confirm-btn-secondary" id="confirmDialogCancel">Cancel</button>
                        <button type="button" class="${confirmButtonClass}" id="confirmDialogConfirm">${confirmText}</button>
                    </div>
                </div>
            `;

            const cleanup = (result) => {
                modal.remove();
                resolve(result);
            };

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    cleanup(false);
                }
            });

            document.body.appendChild(modal);

            document.getElementById('confirmDialogCancel')?.addEventListener('click', () => cleanup(false));
            document.getElementById('confirmDialogConfirm')?.addEventListener('click', () => cleanup(true));
            document.getElementById('confirmDialogConfirm')?.focus();
        });
    }

    handleToggleTheme() {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        StorageManager.set(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');

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
        const g = (id) => /** @type {any} */ (document.getElementById(id));

        container.innerHTML = `
            <div id="recordPaymentModal" class="modal">
                <div class="modal-content">
                    <span class="close" id="closeRecordPayment">&times;</span>
                    <h2>Record Payment</h2>
                    <form id="recordPaymentForm">
                        <input type="hidden" id="paymentBillId">
                        <div class="payment-summary-card" aria-live="polite">
                            <p class="payment-summary-bill">Bill: <strong id="paymentBillName">-</strong></p>
                            <p class="payment-summary-remaining">Remaining: <strong id="paymentRemainingAmount">$0.00</strong></p>
                        </div>
                        <div id="monthlyStrategySection" class="payment-strategy-section" style="display:none;">
                            <p id="monthlyStrategyHint" class="payment-strategy-hint"></p>
                            <div class="payment-strategy-options" role="radiogroup" aria-label="Overdue monthly payment strategy">
                                <label>
                                    <input type="radio" id="paymentStrategySingleCycle" name="paymentRecurrenceStrategy" value="single-cycle" checked>
                                    Clear one month only
                                </label>
                                <label>
                                    <input type="radio" id="paymentStrategyCatchUp" name="paymentRecurrenceStrategy" value="catch-up-to-current">
                                    Catch up to current month
                                </label>
                            </div>
                        </div>
                        <div class="form-group"><label>Amount Paid:</label><input type="number" id="paymentAmount" step="0.01" required></div>
                        <div class="form-group"><label>Payment Date:</label><input type="date" id="paymentDate" required></div>
                        <div class="payment-modal-actions">
                            <button type="button" id="quickPayFullBtn" class="submit-btn">⚡ Pay Full Today</button>
                            <button type="submit" class="action-btn">💾 Save Payment</button>
                        </div>
                        <details id="paymentOptionalDetails" class="payment-optional-details">
                            <summary>Optional details</summary>
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
                        </details>
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

        const submitPayment = (billId, paymentData) => {
            if (billActionHandlers.recordPayment(billId, paymentData)) {
                g('recordPaymentModal').style.display = 'none';
                g('recordPaymentForm').reset();
                this.rerender();
            }
        };

        document.getElementById('quickPayFullBtn').addEventListener('click', () => {
            const billId = g('paymentBillId').value;
            const amount = g('paymentAmount').value;
            const date = g('paymentDate').value;
            const method = g('paymentMethod').value;
            const confirmationNumber = g('paymentConfirmation').value;
            const recurrenceStrategy =
                /** @type {HTMLInputElement|null} */ (document.querySelector('input[name="paymentRecurrenceStrategy"]:checked'))?.value ||
                'single-cycle';

            submitPayment(billId, {
                amount,
                date,
                method,
                confirmationNumber,
                recurrenceStrategy
            });
        });

        g('recordPaymentForm').addEventListener('submit', e => {
            e.preventDefault();
            const billId = g('paymentBillId').value;
            const paymentData = {
                amount: g('paymentAmount').value,
                date: g('paymentDate').value,
                method: g('paymentMethod').value,
                confirmationNumber: g('paymentConfirmation').value,
                recurrenceStrategy:
                    /** @type {HTMLInputElement|null} */ (document.querySelector('input[name="paymentRecurrenceStrategy"]:checked'))?.value ||
                    'single-cycle'
            };

            submitPayment(billId, paymentData);
        });
    }

    /**
     * Initialize theme from localStorage
     */
    initializeTheme() {
        const savedTheme = StorageManager.get(STORAGE_KEYS.THEME);
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
        }
    }
}

// Export singleton instance
export const appOrchestrator = new AppOrchestrator();
