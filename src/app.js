/**
 * App Orchestrator Module
 * Manages app initialization, state coordination, and component delegation
 * Replaces most of the monolithic index.js
 */

import { appState } from './store/appState.js';
import { billStore } from './store/BillStore.js';
import { paycheckManager } from './utils/paycheckManager.js';
import StorageManager from './utils/StorageManager.js';
import logger from './utils/logger.js';
import { STORAGE_KEYS } from './utils/constants.js';
import { DEFAULT_CATEGORIES, SYNC_DEBOUNCE_DELAY_MS } from './config/constants.js';

import { initializeHeader, updateHeaderUI } from './components/header.js';
import { initializeSidebar } from './components/sidebar.js';
import { initializeBillGrid, renderBillGrid, cleanupBillGrid } from './components/billGrid.js';
import { initializeDashboard, renderDashboard } from './components/dashboard.js';
import { initializeBillForm, openBillForm, closeBillForm } from './components/billForm.js';
import { initializeAuthModal, openAuthModal } from './components/authModal.js';

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

import { initializeResponsiveDetection } from './utils/mobileGestures.js';

import {
    initializeSupabase,
    getUser,
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
import { getLoginAttemptStatus } from './utils/loginAttemptGuard.js';

import { initializeTheme, handleToggleTheme } from './app/themeManager.js';
import {
    handlePaycheckSelect,
    handleFilterChange,
    handleToggleCarriedForward,
    handleAllBillsSelect,
    handleUpcomingBillsSelect,
    handleCategorySelect,
    handleDisplayModeSelect,
    handleOpenAddBill
} from './app/navigationHandlers.js';
import { handleLogin, handleSignUp, handleLogout, handleResetPassword } from './app/loginHandlers.js';
import { initializePaymentModals, openRecordPaymentModal, showConfirmationModal } from './app/initializeModals.js';

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
            initializeTheme();

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
                onPaycheckSelect: handlePaycheckSelect,
                onFilterChange: handleFilterChange,
                onAllBillsSelect: handleAllBillsSelect,
                onUpcomingBillsSelect: handleUpcomingBillsSelect,
                onDisplayModeSelect: handleDisplayModeSelect,
                onToggleCarriedForward: handleToggleCarriedForward
            });

            initializeSidebar(this.categories, {
                onCategorySelect: handleCategorySelect,
                onOpenAddBill: handleOpenAddBill,
                onRegenerateBills: () => this.handleRegenerateBills(),
                onExportData: () => this.handleExportData(),
                onImportData: (file) => this.handleImportData(file),
                onOpenAuth: () => openAuthModal(),
                onLogout: handleLogout,
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
                getLoginGuardStatus: getLoginAttemptStatus,
                onLogin: handleLogin,
                onSignUp: handleSignUp,
                onResetPassword: handleResetPassword
            });

            // Initialize payment modals
            initializePaymentModals(() => this.rerender());

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
        }, SYNC_DEBOUNCE_DELAY_MS);
    }

    /**
     * Load categories from localStorage
     */
    loadCategories() {
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
                        if (addBtn) addBtn.addEventListener('click', handleOpenAddBill);
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
    // Navigation handlers moved to src/app/navigationHandlers.js

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
            openRecordPaymentModal(billId);
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
            openRecordPaymentModal(billId);
            return;
        }

        billActionHandlers.togglePaymentStatus(billId, false);
        closeBillForm();
        this.rerender();
    }

    // handleRecordPayment moved to src/app/initializeModals.js (openRecordPaymentModal)

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

    // handleLogin, handleSignUp, handleLogout, handleResetPassword moved to src/app/loginHandlers.js

    async handleBulkDelete() {
        const bills = billStore.getAll();
        if (bills.length === 0) {
            billActionHandlers.showErrorNotification('There are no bills to clear.', 'Bulk Action');
            return;
        }

        const ids = bills.map(b => b.id);
        const confirmed = await showConfirmationModal({
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

        const confirmed = await showConfirmationModal({
            title: 'Mark bills as paid?',
            message: `This will mark ${ids.length} visible unpaid bill${ids.length === 1 ? '' : 's'} as paid.`,
            confirmText: 'Mark Paid',
            confirmVariant: 'primary'
        });

        if (confirmed && bulkMarkAsPaid(ids, true)) {
            this.rerender();
        }
    }

    // showConfirmationModal moved to src/app/initializeModals.js

    // handleToggleTheme moved to src/app/themeManager.js

    handleShowSettings() {
        settingsHandlers.showSettingsModal(this.categories);
    }

    // initializePaymentModals moved to src/app/initializeModals.js

    // initializeTheme moved to src/app/themeManager.js
}

// Export singleton instance
export const appOrchestrator = new AppOrchestrator();
