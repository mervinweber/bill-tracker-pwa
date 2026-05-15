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
import { ERROR_CODES } from './errors/errorCodes.js';

import { initializeHeader, updateHeaderUI } from './components/header.js';
import { initializeSidebar } from './components/sidebar.js';
import { initializeBillGrid, renderBillGrid, cleanupBillGrid } from './components/billGrid.js';
import { initializeDashboard, renderDashboard } from './components/dashboard.js';
import { initializeBillForm, openBillForm, closeBillForm } from './components/billForm.js';
import { initializeAuthModal, openAuthModal } from './components/authModal.js';

import { getUpcomingBills, initializeUpcomingBillsView, renderUpcomingBills } from './views/upcomingBillsView.js';
import { initializePaycheckPlannerView, renderPaycheckPlanner } from './views/paycheckPlannerView.js';
import { initializeDebtSnowballView, renderDebtSnowballView } from './views/debtSnowballView.js';

import {
    billActionHandlers,
    validateBill,
    bulkDelete,
    bulkMarkAsPaid,
    bulkMarkAsUnpaid,
    bulkFillZeroBalances,
    migrateBillsToPaymentHistory
} from './handlers/billActionHandlers.js';
import { filterBillsByPeriod } from './utils/billHelpers.js';

import { settingsHandlers } from './handlers/settingsHandler.js';

import { initializeResponsiveDetection } from './utils/mobileGestures.js';

import {
    initializeSupabase,
    getUser,
    signOut,
    syncUserData,
    syncPaymentSettings,
    updatePassword,
    fetchCloudBills,
    fetchCloudPaymentSettings,
    setupTokenRefreshMonitor
} from './services/supabase.js';

import { safeJSONParse } from './utils/validation.js';
import { checkAndSendDueBillReminders } from './utils/notifications.js';
import { recordAuditEvent } from './utils/auditTracker.js';
import { enqueueUndoAction } from './utils/undoQueue.js';
import {
    syncBillsFromCloud,
    syncLocalDataToCloudIfNeeded,
    syncPaymentSettingsFromCloud
} from './utils/cloudSyncManager.js';
import { getLoginAttemptStatus } from './utils/loginAttemptGuard.js';
import {
    getBillReconciliationIssues,
    applyReconciliationFix,
    RECONCILIATION_ISSUES
} from './utils/reconciliation.js';
import { buildBillTimeline } from './utils/historyTimeline.js';

import { initializeTheme, handleToggleTheme } from './app/themeManager.js';
import {
    handlePaycheckSelect,
    handleFilterChange,
    handleSearchQueryChange,
    handleAllBillsScopeChange,
    handleToggleCarriedForward,
    handleAllBillsSelect,
    handleUpcomingBillsSelect,
    handlePaycheckPlannerSelect,
    handleDebtSnowballSelect,
    handleCategorySelect,
    handleDisplayModeSelect,
    handleOpenAddBill
} from './app/navigationHandlers.js';
import { handleLogin, handleSignUp, handleLogout, handleResetPassword } from './app/loginHandlers.js';
import { initializePaymentModals, openRecordPaymentModal, showConfirmationModal, showSummaryReportModal } from './app/initializeModals.js';

class AppOrchestrator {
    constructor() {
        this.categories = [];
        this.initialized = false;
        this.isSyncing = false;
        this.hasSyncErroredThisSession = false;
        this.cleanupResponsiveDetection = null;
        this.calendarViewModule = null;
        this.analyticsViewModule = null;
        this.calendarViewInitialized = false;
        this.analyticsViewInitialized = false;
        this.viewRenderToken = 0;
    }

    _isDynamicImportFailure(error) {
        const text = [
            error?.name,
            error?.message,
            error?.stack
        ].filter(Boolean).join(' ').toLowerCase();

        return (
            text.includes('chunkloaderror')
            || text.includes('loading chunk')
            || text.includes('failed to fetch dynamically imported module')
            || text.includes('dynamically imported module')
            || text.includes('importing a module script failed')
        );
    }

    _recoverFromDynamicImportFailure(reason, error) {
        if (!this._isDynamicImportFailure(error)) {
            return false;
        }

        const recover = window.tryRecoverFromStaleServiceWorker;
        if (typeof recover === 'function') {
            recover(reason);
            return true;
        }

        return false;
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
                setupTokenRefreshMonitor({
                    onWarning: () => {
                        billActionHandlers.showErrorNotification(
                            'Your session expires in 5 minutes. Save any work to avoid losing changes.',
                            'Session Expiring Soon'
                        );
                    },
                    onExpired: () => {
                        if (StorageManager.get(STORAGE_KEYS.USER_EMAIL)) {
                            this._showSessionExpiredPrompt();
                        }
                    }
                });
            } else {
                StorageManager.remove(STORAGE_KEYS.USER_EMAIL);
            }

            // Get paycheck labels
            const paycheckLabels = paycheckManager.getPaycheckLabels();

            // Initialize baseline views
            initializeUpcomingBillsView();
            initializePaycheckPlannerView();
            initializeDebtSnowballView();

            // Initialize components with callbacks
            initializeHeader(paycheckLabels, {
                onPaycheckSelect: handlePaycheckSelect,
                onFilterChange: handleFilterChange,
                onSearchQueryChange: handleSearchQueryChange,
                onAllBillsScopeChange: handleAllBillsScopeChange,
                onAllBillsSelect: handleAllBillsSelect,
                onUpcomingBillsSelect: handleUpcomingBillsSelect,
                onPaycheckPlannerSelect: handlePaycheckPlannerSelect,
                onDebtSnowballSelect: handleDebtSnowballSelect,
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
                onBulkFillBalances: () => this.handleBulkFillBalances(),
                onShowSettings: () => this.handleShowSettings(),
                onExportCsv: () => this.handleExportData('csv')
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
                        onFetchError: (error) => {
                            let detail = ERROR_CODES.SUPABASE_SYNC_FAILED.message;
                            if (error && typeof error === 'object') {
                                const syncError = /** @type {{message?: string, code?: string}} */ (error);
                                detail = syncError.message || syncError.code || detail;
                            }
                            billActionHandlers.showErrorNotification(`Cloud sync failed: ${detail}`, 'Sync Warning');
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

            try {
                const addedRecurringBills = paycheckManager.addMissingRecurringBillInstances();
                if (addedRecurringBills > 0) {
                    logger.info('Backfilled missing recurring bill instances', { addedRecurringBills });

                    if (user) {
                        const paymentSettings = StorageManager.get(STORAGE_KEYS.PAYMENT_SETTINGS, null);
                        const { error } = await syncUserData(billStore.getAll(), paymentSettings);
                        if (error) {
                            logger.error('Cloud sync failed after recurring bill backfill', error);
                        }
                    }
                }
            } catch (error) {
                logger.error('Error backfilling recurring bill instances on init', error);
            }

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

            this._handleAuthRedirectError();
            await this._handlePasswordRecoveryRedirect();

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
            billActionHandlers.showErrorNotification(error?.message || ERROR_CODES.APP_INITIALIZATION_FAILED.message, 'Initialization Error');
        }
    }

    cleanup() {
        if (typeof this.cleanupResponsiveDetection === 'function') {
            this.cleanupResponsiveDetection();
            this.cleanupResponsiveDetection = null;
        }

        cleanupBillGrid();
        if (this.analyticsViewModule?.cleanupCharts) {
            this.analyticsViewModule.cleanupCharts();
        }
    }

    async loadCalendarViewModule() {
        if (!this.calendarViewModule) {
            this.calendarViewModule = await import('./views/calendarView.js');
        }

        if (!this.calendarViewInitialized) {
            this.calendarViewModule.initializeCalendarView();
            this.calendarViewInitialized = true;
        }

        return this.calendarViewModule;
    }

    async loadAnalyticsViewModule() {
        if (!this.analyticsViewModule) {
            this.analyticsViewModule = await import('./views/analyticsView.js');
        }

        if (!this.analyticsViewInitialized) {
            this.analyticsViewModule.initializeAnalyticsView();
            this.analyticsViewInitialized = true;
        }

        return this.analyticsViewModule;
    }

    async renderCalendarView(renderToken) {
        try {
            const { renderCalendar } = await this.loadCalendarViewModule();
            if (renderToken !== this.viewRenderToken) return;

            const calendarView = document.getElementById('calendarView');
            if (calendarView) {
                calendarView.style.display = 'block';
            }
            renderCalendar();
        } catch (error) {
            logger.error('Error loading calendar view', error);
            if (this._recoverFromDynamicImportFailure('calendar-view-load-failure', error)) {
                return;
            }
            billActionHandlers.showErrorNotification(ERROR_CODES.VIEW_CALENDAR_LOAD_FAILED.message, 'View Error');
        }
    }

    async renderAnalyticsView({ bills, viewMode, selectedPaycheck, payCheckDates }, renderToken) {
        try {
            const { renderAnalytics } = await this.loadAnalyticsViewModule();
            if (renderToken !== this.viewRenderToken) return;

            const analyticsView = document.getElementById('analyticsView');
            if (analyticsView) {
                analyticsView.style.display = 'block';
            }

            renderAnalytics({
                bills,
                viewMode,
                selectedPaycheck,
                payCheckDates
            });
        } catch (error) {
            logger.error('Error loading analytics view', error);
            if (this._recoverFromDynamicImportFailure('analytics-view-load-failure', error)) {
                return;
            }
            billActionHandlers.showErrorNotification(ERROR_CODES.VIEW_ANALYTICS_LOAD_FAILED.message, 'View Error');
        }
    }

    getPaycheckAdjustments() {
        const raw = StorageManager.get(STORAGE_KEYS.PAYCHECK_ADJUSTMENTS, {});
        if (!raw || typeof raw !== 'object') {
            return {};
        }

        const sanitized = {};
        Object.entries(raw).forEach(([payDateKey, entries]) => {
            if (!Array.isArray(entries)) {
                return;
            }

            const validEntries = entries.filter((entry) => {
                return entry && typeof entry.id === 'string' && Number.isFinite(entry.amount);
            });

            if (validEntries.length > 0) {
                sanitized[payDateKey] = validEntries;
            }
        });

        return sanitized;
    }

    savePaycheckAdjustments(adjustmentsByDate) {
        StorageManager.set(STORAGE_KEYS.PAYCHECK_ADJUSTMENTS, adjustmentsByDate);
    }

    getDebtSnowballSettings() {
        const raw = StorageManager.get(STORAGE_KEYS.DEBT_SNOWBALL_SETTINGS, { extraPayment: 0, strategy: 'snowball' });
        return {
            extraPayment: Number.parseFloat(raw?.extraPayment) || 0,
            strategy: raw?.strategy === 'avalanche' ? 'avalanche' : 'snowball'
        };
    }

    saveDebtSnowballSettings(settings) {
        StorageManager.set(STORAGE_KEYS.DEBT_SNOWBALL_SETTINGS, {
            extraPayment: Math.max(0, Number.parseFloat(settings?.extraPayment) || 0),
            strategy: settings?.strategy === 'avalanche' ? 'avalanche' : 'snowball'
        });
    }

    handleSaveDebtSnowballSettings(settings) {
        try {
            this.saveDebtSnowballSettings(settings);
            billActionHandlers.showSuccessNotification('Debt snowball settings updated.');
            this.rerender();
        } catch (error) {
            logger.error('Failed saving debt snowball settings', error);
            billActionHandlers.showErrorNotification(error.message, 'Debt Snowball');
        }
    }

    handleSavePaycheckAmount(amount) {
        try {
            const currentSettings = StorageManager.get(STORAGE_KEYS.PAYMENT_SETTINGS, paycheckManager.paymentSettings);
            const updatedSettings = {
                ...currentSettings,
                amount
            };

            paycheckManager.updateSettings(updatedSettings);
            StorageManager.set(STORAGE_KEYS.PAYMENT_SETTINGS, updatedSettings);
            billActionHandlers.showSuccessNotification('Paycheck amount updated.');
            this.rerender();
        } catch (error) {
            logger.error('Failed saving paycheck amount from planner', error);
            billActionHandlers.showErrorNotification(error.message, 'Planner Update Failed');
        }
    }

    handleAddPaycheckAdjustment(payDate, amount, note) {
        try {
            if (!Number.isFinite(amount) || amount === 0) {
                billActionHandlers.showErrorNotification('Adjustment amount must not be 0.', 'Invalid Amount');
                return;
            }

            const adjustmentsByDate = this.getPaycheckAdjustments();
            const current = adjustmentsByDate[payDate] || [];
            current.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                amount,
                note: note || '',
                createdAt: new Date().toISOString()
            });
            adjustmentsByDate[payDate] = current;

            this.savePaycheckAdjustments(adjustmentsByDate);
            this.rerender();
        } catch (error) {
            logger.error('Failed adding paycheck adjustment', error);
            billActionHandlers.showErrorNotification(error.message, 'Planner Update Failed');
        }
    }

    handleRemovePaycheckAdjustment(payDate, adjustmentId) {
        try {
            const adjustmentsByDate = this.getPaycheckAdjustments();
            const current = adjustmentsByDate[payDate] || [];
            adjustmentsByDate[payDate] = current.filter((entry) => entry.id !== adjustmentId);

            if (adjustmentsByDate[payDate].length === 0) {
                delete adjustmentsByDate[payDate];
            }

            this.savePaycheckAdjustments(adjustmentsByDate);
            this.rerender();
        } catch (error) {
            logger.error('Failed removing paycheck adjustment', error);
            billActionHandlers.showErrorNotification(error.message, 'Planner Update Failed');
        }
    }

    handleExportPaycheckAdjustments(format) {
        try {
            const adjustmentsByDate = this.getPaycheckAdjustments();
            const hasEntries = Object.values(adjustmentsByDate).some(entries => Array.isArray(entries) && entries.length > 0);

            if (!hasEntries) {
                billActionHandlers.showErrorNotification('No planner adjustments to export.', 'Export Failed');
                return;
            }

            const stamp = new Date().toISOString().slice(0, 10);
            let fileName = `paycheck-adjustments-${stamp}.json`;
            let contentType = 'application/json;charset=utf-8';
            let payload = JSON.stringify(adjustmentsByDate, null, 2);

            if (format === 'csv') {
                fileName = `paycheck-adjustments-${stamp}.csv`;
                contentType = 'text/csv;charset=utf-8';

                const escapeCsv = (value) => {
                    const raw = value === null || typeof value === 'undefined' ? '' : String(value);
                    if (!/[",\n]/.test(raw)) return raw;
                    return `"${raw.replace(/"/g, '""')}"`;
                };

                const rows = ['payDate,adjustmentId,amount,note,createdAt'];
                Object.entries(adjustmentsByDate).forEach(([payDate, entries]) => {
                    entries.forEach((entry) => {
                        rows.push([
                            escapeCsv(payDate),
                            escapeCsv(entry.id),
                            escapeCsv(entry.amount),
                            escapeCsv(entry.note || ''),
                            escapeCsv(entry.createdAt || '')
                        ].join(','));
                    });
                });
                payload = rows.join('\n');
            }

            const blob = new Blob([payload], { type: contentType });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);

            billActionHandlers.showSuccessNotification(`Planner adjustments exported as ${format.toUpperCase()}.`);
        } catch (error) {
            logger.error('Failed exporting paycheck adjustments', error);
            billActionHandlers.showErrorNotification(error.message, 'Export Failed');
        }
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
                    try {
                        const paymentSettings = StorageManager.get(STORAGE_KEYS.PAYMENT_SETTINGS, null);
                        const { error } = await syncUserData(bills, paymentSettings);
                        if (error) {
                            logger.error('Cloud sync failed', error);
                            if (!this.hasSyncErroredThisSession) {
                                this.hasSyncErroredThisSession = true;
                                const detail = error?.message || error?.code || 'unknown error';
                                billActionHandlers.showErrorNotification(
                                    `Cloud sync failed: ${detail}`,
                                    'Sync Warning'
                                );
                            }
                        } else {
                            this.hasSyncErroredThisSession = false;
                            logger.info('Cloud sync successful');
                        }
                    } finally {
                        this.isSyncing = false;
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
            const renderToken = ++this.viewRenderToken;

            // Update header UI
            updateHeaderUI(state.viewMode, state.selectedPaycheck, state.displayMode, state.showCarriedForward, state.allBillsScope, state.paymentFilter, state.searchQuery);

            // Render appropriate view based on displayMode
            const billGrid = document.getElementById('billGrid');
            const calendarView = document.getElementById('calendarView');
            const analyticsView = document.getElementById('analyticsView');
            const upcomingBillsView = document.getElementById('upcomingBillsView');
            const paycheckPlannerView = document.getElementById('paycheckPlannerView');
            const debtSnowballView = document.getElementById('debtSnowballView');

            // Hide all views first
            const dashboard = document.getElementById('dashboard');
            if (billGrid) billGrid.style.display = 'none';
            if (calendarView) calendarView.style.display = 'none';
            if (analyticsView) analyticsView.style.display = 'none';
            if (upcomingBillsView) upcomingBillsView.style.display = 'none';
            if (paycheckPlannerView) paycheckPlannerView.style.display = 'none';
            if (debtSnowballView) debtSnowballView.style.display = 'none';
            if (dashboard) dashboard.style.display = 'none';

            if (state.displayMode !== 'analytics' && this.analyticsViewModule?.cleanupCharts) {
                this.analyticsViewModule.cleanupCharts();
            }

            if (state.displayMode === 'calendar') {
                this.renderCalendarView(renderToken);
            } else if (state.displayMode === 'analytics') {
                this.renderAnalyticsView({
                    bills,
                    viewMode: state.viewMode,
                    selectedPaycheck: state.selectedPaycheck,
                    payCheckDates: paycheckManager.payCheckDates
                }, renderToken);
            } else {
                // List view (default)
                if (state.viewMode === 'upcoming') {
                    if (upcomingBillsView) upcomingBillsView.style.display = 'block';
                    renderUpcomingBills(
                        {
                            bills,
                            selectedPaycheck: state.selectedPaycheck,
                            payCheckDates: paycheckManager.payCheckDates,
                            showCarriedForward: state.showCarriedForward
                        },
                        {
                            onTogglePayment: (billId, isPaid) => this.handleTogglePayment(billId, isPaid),
                            onEditBill: (billId) => this.handleEditBill(billId),
                            onUpdateDueDate: (billId, dueDate) => this.handleUpdateDueDate(billId, dueDate),
                            paycheckAmount: paycheckManager.paymentSettings?.amount
                        }
                    );
                } else if (state.viewMode === 'planner') {
                    if (paycheckPlannerView) paycheckPlannerView.style.display = 'block';
                    renderPaycheckPlanner(
                        {
                            bills,
                            payCheckDates: paycheckManager.payCheckDates,
                            paymentSettings: paycheckManager.paymentSettings,
                            adjustmentsByDate: this.getPaycheckAdjustments()
                        },
                        {
                            onSavePaycheckAmount: (amount) => this.handleSavePaycheckAmount(amount),
                            onAddAdjustment: (payDate, amount, note) => this.handleAddPaycheckAdjustment(payDate, amount, note),
                            onRemoveAdjustment: (payDate, adjustmentId) => this.handleRemovePaycheckAdjustment(payDate, adjustmentId),
                            onExportAdjustments: (format) => this.handleExportPaycheckAdjustments(format),
                            onInvalidAmount: (message) => billActionHandlers.showErrorNotification(message, 'Planner Input')
                        }
                    );
                } else if (state.viewMode === 'debt-snowball') {
                    if (debtSnowballView) debtSnowballView.style.display = 'block';
                    renderDebtSnowballView(
                        {
                            bills,
                            settings: this.getDebtSnowballSettings()
                        },
                        {
                            onSaveSettings: (s) => this.handleSaveDebtSnowballSettings(s),
                            onEditBill: (billId) => this.handleEditBill(billId)
                        }
                    );
                } else {
                    if (billGrid) billGrid.style.display = 'block';

                    // Zero-bill empty state — skip dashboard, show getting-started panel
                    if (bills.length === 0) {
                        if (dashboard) {
                            dashboard.style.display = 'block';
                            renderDashboard(
                                bills,
                                state.viewMode,
                                state.selectedPaycheck,
                                state.selectedCategory,
                                state.paymentFilter,
                                paycheckManager.payCheckDates,
                                state.showCarriedForward,
                                state.allBillsScope
                            );
                            document.getElementById('dashboardDebtLink')?.addEventListener('click', () => handleDebtSnowballSelect());
                            document.getElementById('dashboardReportBtn')?.addEventListener('click', () => {
                                showSummaryReportModal({
                                    bills,
                                    viewMode: state.viewMode,
                                    selectedPaycheck: state.selectedPaycheck,
                                    selectedCategory: state.selectedCategory,
                                    paymentFilter: state.paymentFilter,
                                    payCheckDates: paycheckManager.payCheckDates,
                                    showCarriedForward: state.showCarriedForward,
                                    allBillsScope: state.allBillsScope
                                });
                            });
                        }
                        billGrid.className = 'flex flex-col gap-4 p-4 sm:p-6';
                        billGrid.innerHTML = `
                            <div class="mx-auto grid w-full max-w-5xl gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm lg:grid-cols-[1fr_1.1fr] lg:p-6">
                                <div class="flex flex-col items-center justify-center gap-4 text-center lg:items-start lg:text-left">
                                    <div class="rounded-full bg-muted p-5 text-4xl" aria-hidden="true">📋</div>
                                <div class="space-y-1">
                                    <h2 class="text-2xl font-semibold text-foreground">Welcome to Bill Tracker</h2>
                                    <p class="text-sm text-muted-foreground">You haven't added any bills yet. Start with one bill, then layer in reminders, payee details, and upcoming planning.</p>
                                </div>
                                <div class="rounded-xl border border-border bg-muted/30 px-4 py-3 text-left text-sm text-muted-foreground">
                                    <p class="font-medium text-foreground">Quick start</p>
                                    <p class="mt-1">Add a bill, then use reminders, search, and the calendar to stay ahead of what's coming next.</p>
                                </div>
                            </div>
                                <div class="space-y-4">
                                    <div class="rounded-xl border bg-background p-5">
                                        <div class="flex items-start gap-3">
                                            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                                            <div>
                                                <p class="text-sm font-medium text-foreground">Add your first bill</p>
                                                <p class="text-xs text-muted-foreground mt-0.5">Enter a bill name, payee, amount, and due date to start tracking.</p>
                                            </div>
                                        </div>
                                        <div class="my-4 border-t border-border"></div>
                                        <div class="flex items-start gap-3">
                                            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold border border-border">2</span>
                                            <div>
                                                <p class="text-sm font-medium text-foreground">Set reminders and autopay</p>
                                                <p class="text-xs text-muted-foreground mt-0.5">Turn on notifications and mark autopay so the app reflects your real workflow.</p>
                                            </div>
                                        </div>
                                        <div class="my-4 border-t border-border"></div>
                                        <div class="flex items-start gap-3">
                                            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold border border-border">3</span>
                                            <div>
                                                <p class="text-sm font-medium text-foreground">Review upcoming bills</p>
                                                <p class="text-xs text-muted-foreground mt-0.5">Use search, the calendar, and Upcoming view to see what’s due each pay period.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-3 lg:col-span-2">
                                    <div class="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                                        <span>Need to tune reminders or import data?</span>
                                    </div>
                                    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-center">
                                    <button id="emptyStateAddBill" type="button"
                                        class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-10 px-6 bg-primary text-primary-foreground shadow hover:bg-primary/90">
                                        + Add Your First Bill
                                    </button>
                                    <button id="emptyStateSettings" type="button"
                                        class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-10 px-6 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground">
                                        ⚙️ Open Settings
                                    </button>
                                    <label for="emptyStateImport"
                                        class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-10 px-6 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">
                                        📥 Import from Backup
                                    </label>
                                    <input id="emptyStateImport" type="file" accept=".json" class="sr-only" />
                                    </div>
                                </div>
                            </div>
                        `;
                        const addBtn = document.getElementById('emptyStateAddBill');
                        const settingsBtn = document.getElementById('emptyStateSettings');
                        const importInput = /** @type {HTMLInputElement|null} */ (document.getElementById('emptyStateImport'));
                        if (addBtn) addBtn.addEventListener('click', handleOpenAddBill);
                        if (settingsBtn) settingsBtn.addEventListener('click', () => document.getElementById('settingsBtn')?.click());
                        if (importInput) importInput.addEventListener('change', (e) => {
                            const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
                            if (file) this.handleImportData(file);
                        });
                        return;
                    }

                    if (dashboard) dashboard.style.display = 'block';
                    renderDashboard(bills, state.viewMode, state.selectedPaycheck, state.selectedCategory, state.paymentFilter, paycheckManager.payCheckDates, state.showCarriedForward, state.allBillsScope);
                    document.getElementById('dashboardDebtLink')?.addEventListener('click', () => handleDebtSnowballSelect());
                    document.getElementById('dashboardReportBtn')?.addEventListener('click', () => {
                        showSummaryReportModal({
                            bills,
                            viewMode: state.viewMode,
                            selectedPaycheck: state.selectedPaycheck,
                            selectedCategory: state.selectedCategory,
                            paymentFilter: state.paymentFilter,
                            payCheckDates: paycheckManager.payCheckDates,
                            showCarriedForward: state.showCarriedForward,
                            allBillsScope: state.allBillsScope
                        });
                    });

                    renderBillGrid(
                        {
                            bills,
                            viewMode: state.viewMode,
                            selectedPaycheck: state.selectedPaycheck,
                            selectedCategory: state.selectedCategory,
                            paymentFilter: state.paymentFilter,
                            searchQuery: state.searchQuery,
                            showCarriedForward: state.showCarriedForward,
                            payCheckDates: paycheckManager.payCheckDates,
                            allBillsScope: state.allBillsScope
                        },
                        {
                            onUpdateBalance: (billId, balance) =>
                                this.handleUpdateBalance(billId, balance),
                            onTogglePayment: (billId, isPaid) =>
                                this.handleTogglePayment(billId, isPaid),
                            onRecordPayment: (billId) => openRecordPaymentModal(billId),
                            onViewHistory: (billId) => this.handleViewHistory(billId),
                            onDeleteBill: (billId) => this.handleDeleteBill(billId),
                            onEditBill: (billId) => this.handleEditBill(billId),
                            onToggleReminder: (billId, enabled) => this.handleToggleReminder(billId, enabled),
                            onApplyReconcileFix: (billId, issueCode) => this.handleApplyReconcileFix(billId, issueCode)
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
                debtTotal: billData?.debtTotal ?? (g('billDebtTotal').value
                    ? parseFloat(g('billDebtTotal').value)
                    : (existingBill?.debtTotal || 0)),
                interestRate: billData?.interestRate ?? (g('billInterestRate').value
                    ? parseFloat(g('billInterestRate').value)
                    : (existingBill?.interestRate || 0)),
                includeInDebtSnowball: billData?.includeInDebtSnowball ?? g('billIncludeInDebtSnowball').checked,
                recurrence: billData?.recurrence || g('billRecurrence').value,
                reminderEnabled: billData?.reminderEnabled ?? g('billReminderEnabled').checked,
                autopayEnabled: billData?.autopayEnabled ?? g('billAutopayEnabled').checked,
                notes: billData?.notes || g('billNotes').value,
                website: billData?.website || g('billWebsite').value,
                payee: billData?.payee || g('billPayee').value,
                accountName: billData?.accountName || g('billAccountName').value,
                snoozeUntil: billData?.snoozeUntil ?? existingBill?.snoozeUntil ?? null,
                split: split,
                creditBalance: existingBill ? existingBill.creditBalance || 0 : 0,
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
                const sameRecurringSeries =
                    existingBill &&
                    existingBill.recurrence !== 'One-time' &&
                    bill.recurrence === existingBill.recurrence &&
                    bill.name === existingBill.name &&
                    bill.category === existingBill.category;

                const amountChanged =
                    existingBill &&
                    Math.abs((Number.parseFloat(existingBill.amountDue) || 0) - (Number.parseFloat(bill.amountDue) || 0)) > 0.009;

                if (sameRecurringSeries && amountChanged) {
                    const editedDueTime = new Date(existingBill.dueDate).getTime();
                    const previousAmount = Number.parseFloat(existingBill.amountDue) || 0;
                    const nextAmount = Number.parseFloat(bill.amountDue) || 0;

                    const updatedBills = bills.map((existing) => {
                        if (existing.id === id) {
                            return bill;
                        }

                        const isSameSeries =
                            existing.name === existingBill.name &&
                            existing.category === existingBill.category &&
                            existing.recurrence === existingBill.recurrence;

                        if (!isSameSeries) {
                            return existing;
                        }

                        const dueTime = new Date(existing.dueDate).getTime();
                        if (!Number.isFinite(dueTime) || dueTime <= editedDueTime) {
                            return existing;
                        }

                        const updatedFuture = {
                            ...existing,
                            amountDue: nextAmount
                        };

                        const hasHistory = Array.isArray(existing.paymentHistory) && existing.paymentHistory.length > 0;
                        const existingBalance = Number.parseFloat(existing.balance);

                        // Only sync balance automatically when the future instance is still untouched.
                        if (!existing.isPaid && !hasHistory && (!Number.isFinite(existingBalance) || Math.abs(existingBalance - previousAmount) < 0.01)) {
                            updatedFuture.balance = nextAmount;
                        }

                        return updatedFuture;
                    });

                    billStore.setBills(updatedBills);
                } else {
                    billStore.update(bill);
                }
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
                billActionHandlers.showErrorNotification(ERROR_CODES.BILL_INVALID_DUE_DATE.message, 'Invalid Date');
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

        const totalPaid = billActionHandlers.getTotalPaid(bill);
        const remaining = billActionHandlers.getRemainingBalance(bill);
        const amountDue = Number.parseFloat(String(bill.amountDue));
        const totalDue = Number.isFinite(amountDue) && amountDue > 0
            ? amountDue
            : (totalPaid + remaining);
        const payments = (bill.paymentHistory || []).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const timeline = buildBillTimeline(bill);

        const historyContent = document.getElementById('historyContent');
        historyContent.innerHTML = ''; // safe to clear

        const detailCard = document.createElement('div');
        detailCard.className = 'history-summary-card';

        const detailHeader = document.createElement('div');
        detailHeader.className = 'flex items-start justify-between gap-3';

        const detailHeadingWrap = document.createElement('div');
        const detailTitle = document.createElement('h3');
        detailTitle.textContent = bill.name;
        detailHeadingWrap.appendChild(detailTitle);

        const detailMeta = document.createElement('p');
        detailMeta.className = 'text-sm text-muted-foreground';
        const accountLabel = bill.accountName ? ` · ${bill.accountName}` : '';
        detailMeta.textContent = `${bill.category || 'Uncategorized'}${accountLabel} · Due ${bill.dueDate}`;
        detailHeadingWrap.appendChild(detailMeta);

        const detailTags = document.createElement('div');
        detailTags.className = 'mt-2 flex flex-wrap gap-2';
        const createTag = (label, tone = 'bg-muted text-muted-foreground') => {
            const tag = document.createElement('span');
            tag.className = `inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tone}`;
            tag.textContent = label;
            return tag;
        };
        detailTags.appendChild(createTag(bill.recurrence || 'One-time'));
        detailTags.appendChild(createTag(bill.reminderEnabled ? 'Reminders on' : 'Reminders off', bill.reminderEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'));
        if (bill.snoozeUntil) {
            detailTags.appendChild(createTag(`Snoozed until ${bill.snoozeUntil}`, 'bg-sky-500/10 text-sky-700'));
        }
        if (bill.website) {
            detailTags.appendChild(createTag('Pay link available', 'bg-emerald-500/10 text-emerald-700'));
        }
        if (bill.payee) {
            detailTags.appendChild(createTag(`Payee: ${bill.payee}`, 'bg-violet-500/10 text-violet-700'));
        }
        if (bill.autopayEnabled) {
            detailTags.appendChild(createTag('Autopay on', 'bg-sky-500/10 text-sky-700'));
        }
        detailHeadingWrap.appendChild(detailTags);

        detailHeader.appendChild(detailHeadingWrap);

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground';
        editButton.textContent = 'Edit Bill';
        editButton.addEventListener('click', () => {
            document.getElementById('viewHistoryModal').style.display = 'none';
            this.handleEditBill(bill.id);
        });
        detailHeader.appendChild(editButton);

        detailCard.appendChild(detailHeader);

        const detailInfoGrid = document.createElement('div');
        detailInfoGrid.className = 'mt-4 grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2';

        const addInfoRow = (label, value) => {
            const row = document.createElement('div');
            row.className = 'space-y-1';
            const rowLabel = document.createElement('div');
            rowLabel.className = 'text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground';
            rowLabel.textContent = label;
            const rowValue = document.createElement('div');
            rowValue.className = 'text-sm font-medium leading-relaxed break-words text-foreground';
            rowValue.textContent = value || 'Not set';
            row.appendChild(rowLabel);
            row.appendChild(rowValue);
            return row;
        };

        detailInfoGrid.appendChild(addInfoRow('Category', bill.category || 'Uncategorized'));
        detailInfoGrid.appendChild(addInfoRow('Due Date', bill.dueDate || 'Not set'));
        detailInfoGrid.appendChild(addInfoRow('Account', bill.accountName || 'Not set'));
        detailInfoGrid.appendChild(addInfoRow('Payee', bill.payee || 'Not set'));
        detailInfoGrid.appendChild(addInfoRow('Website', bill.website || 'Not set'));
        detailInfoGrid.appendChild(addInfoRow('Autopay', bill.autopayEnabled ? 'Enabled' : 'Disabled'));

        if (bill.notes) {
            const notesWrap = document.createElement('div');
            notesWrap.className = 'rounded-lg border border-border bg-background p-3 sm:col-span-2';
            const notesLabel = document.createElement('div');
            notesLabel.className = 'text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground';
            notesLabel.textContent = 'Notes';
            const notesValue = document.createElement('div');
            notesValue.className = 'mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground';
            notesValue.textContent = bill.notes;
            notesWrap.appendChild(notesLabel);
            notesWrap.appendChild(notesValue);
            detailInfoGrid.appendChild(notesWrap);
        }

        detailCard.appendChild(detailInfoGrid);

        const quickActions = document.createElement('div');
        quickActions.className = 'mt-3 flex flex-wrap gap-2';

        if (bill.website) {
            const payLinkButton = document.createElement('button');
            payLinkButton.type = 'button';
            payLinkButton.className = 'inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground';
            payLinkButton.textContent = 'Open Pay Link';
            payLinkButton.addEventListener('click', () => window.open(bill.website, '_blank'));
            quickActions.appendChild(payLinkButton);
        }

        const markPaidButton = document.createElement('button');
        markPaidButton.type = 'button';
        markPaidButton.className = 'inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90';
        markPaidButton.textContent = bill.isPaid ? 'Mark Unpaid' : 'Mark Paid';
        markPaidButton.addEventListener('click', () => {
            billActionHandlers.togglePaymentStatus(bill.id, !bill.isPaid);
            document.getElementById('viewHistoryModal').style.display = 'none';
            this.rerender();
        });
        quickActions.appendChild(markPaidButton);

        const remindButton = document.createElement('button');
        remindButton.type = 'button';
        remindButton.className = 'inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground';
        remindButton.textContent = bill.reminderEnabled ? 'Disable Reminders' : 'Enable Reminders';
        remindButton.addEventListener('click', () => {
            this.handleToggleReminder(bill.id, !bill.reminderEnabled);
            document.getElementById('viewHistoryModal').style.display = 'none';
        });
        quickActions.appendChild(remindButton);

        const snoozeButton = document.createElement('button');
        snoozeButton.type = 'button';
        snoozeButton.className = 'inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground';
        snoozeButton.textContent = bill.snoozeUntil ? 'Clear Snooze' : 'Snooze 3 Days';
        snoozeButton.addEventListener('click', () => {
            const nextSnooze = bill.snoozeUntil ? null : new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
            const bills = billStore.getAll();
            const currentBill = bills.find((item) => item.id === bill.id);
            if (!currentBill) return;
            billStore.update({
                ...currentBill,
                snoozeUntil: nextSnooze
            });
            document.getElementById('viewHistoryModal').style.display = 'none';
            this.rerender();
        });
        quickActions.appendChild(snoozeButton);

        const snoozePresets = document.createElement('div');
        snoozePresets.className = 'mt-2 flex flex-wrap gap-2';
        ['1 day', '3 days', '7 days'].forEach((label) => {
            const presetBtn = document.createElement('button');
            presetBtn.type = 'button';
            presetBtn.className = 'inline-flex items-center rounded-full border border-input bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';
            presetBtn.textContent = label;
            presetBtn.addEventListener('click', () => {
                const days = Number.parseInt(label, 10) || 1;
                const bills = billStore.getAll();
                const currentBill = bills.find((item) => item.id === bill.id);
                if (!currentBill) return;
                billStore.update({
                    ...currentBill,
                    snoozeUntil: new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
                });
                document.getElementById('viewHistoryModal').style.display = 'none';
                this.rerender();
            });
            snoozePresets.appendChild(presetBtn);
        });
        quickActions.appendChild(snoozePresets);

        detailCard.appendChild(quickActions);

        const summaryCard = document.createElement('div');
        summaryCard.className = 'mt-3';

        const statsDiv = document.createElement('div');
        statsDiv.className = 'history-stats-row';

        const createStat = (label, value, color = null) => {
            const span = document.createElement('span');
                if (color) span.className = color;
            const strong = document.createElement('strong');
            strong.textContent = `${label}: `;
            span.appendChild(strong);
            span.appendChild(document.createTextNode(`$${value.toFixed(2)}`));
            return span;
        };

        statsDiv.appendChild(createStat('Total Due', totalDue));
        statsDiv.appendChild(createStat('Total Paid', totalPaid));
            statsDiv.appendChild(createStat('Remaining', remaining, remaining > 0 ? 'history-payment-remaining-owed' : 'history-payment-remaining-paid'));
        statsDiv.appendChild(createStat('Balance', Number.parseFloat(String(bill.balance || 0)) || 0));

        summaryCard.appendChild(statsDiv);
        detailCard.appendChild(summaryCard);
        historyContent.appendChild(detailCard);

        const listContainer = document.createElement('div');
            listContainer.className = 'history-list';

        if (payments.length > 0) {
            payments.forEach(payment => {
                const item = document.createElement('div');
                    item.className = 'history-payment-item';

                const header = document.createElement('div');
                    header.className = 'history-payment-header';

                const dateStr = new Date(payment.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                const dateStrong = document.createElement('strong');
                dateStrong.textContent = dateStr;
                header.appendChild(dateStrong);

                const amountStrong = document.createElement('strong');
                    amountStrong.className = 'history-payment-amount';
                amountStrong.textContent = `$${payment.amount.toFixed(2)}`;
                header.appendChild(amountStrong);

                item.appendChild(header);

                const details = document.createElement('div');
                    details.className = 'history-payment-method';

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
                emptyState.className = 'history-empty-state';
            emptyState.textContent = 'No payments recorded yet';
            listContainer.appendChild(emptyState);
        }

        historyContent.appendChild(listContainer);

        const timelineContainer = document.createElement('div');
        timelineContainer.className = 'history-list mt-4';

        const timelineHeading = document.createElement('h4');
        timelineHeading.textContent = 'Timeline';
        timelineHeading.style.margin = '0 0 8px 0';
        timelineContainer.appendChild(timelineHeading);

        if (timeline.length > 0) {
            timeline.forEach((entry) => {
                const item = document.createElement('div');
                item.className = 'history-payment-item';

                const header = document.createElement('div');
                header.className = 'history-payment-header';

                const dateStrong = document.createElement('strong');
                dateStrong.textContent = new Date(entry.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                header.appendChild(dateStrong);

                const typeBadge = document.createElement('span');
                typeBadge.textContent = entry.kind === 'payment' ? 'PAYMENT' : 'AUDIT';
                typeBadge.className = entry.kind === 'payment'
                    ? 'history-payment-amount'
                    : 'history-payment-method';
                header.appendChild(typeBadge);

                item.appendChild(header);

                const title = document.createElement('div');
                title.className = 'history-payment-method';
                title.textContent = entry.title;
                item.appendChild(title);

                const detail = document.createElement('div');
                detail.className = 'history-payment-method';
                detail.textContent = entry.amount !== null
                    ? `${entry.details} | $${entry.amount.toFixed(2)}`
                    : entry.details;
                item.appendChild(detail);

                timelineContainer.appendChild(item);
            });
        } else {
            const emptyTimeline = document.createElement('p');
            emptyTimeline.className = 'history-empty-state';
            emptyTimeline.textContent = 'No timeline events yet';
            timelineContainer.appendChild(emptyTimeline);
        }

        historyContent.appendChild(timelineContainer);
        document.getElementById('viewHistoryModal').style.display = 'flex';
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
            billActionHandlers.showErrorNotification(error?.message || ERROR_CODES.BILL_REGENERATION_FAILED.message, 'Regeneration Failed');
        }
    }

    handleExportData(format = 'json') {
        billActionHandlers.exportData(format);
    }

    handleImportData(file) {
        billActionHandlers.importData(file);
    }

    // handleLogin, handleSignUp, handleLogout, handleResetPassword moved to src/app/loginHandlers.js

    async handleBulkDelete() {
        const bills = billStore.getAll();
        if (bills.length === 0) {
            billActionHandlers.showErrorNotification(ERROR_CODES.BULK_NO_BILLS_TO_CLEAR.message, 'Bulk Action');
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
            billActionHandlers.showErrorNotification(ERROR_CODES.BULK_NO_BILLS_TO_UPDATE.message, 'Bulk Action');
            return;
        }

        const state = appState.getState();
        const { viewMode, selectedPaycheck, selectedCategory, paymentFilter, allBillsScope } = state;
        const payCheckDates = paycheckManager.payCheckDates;

        let visibleBills = [];

        if (viewMode === 'all') {
            visibleBills = filterBillsByPeriod(bills, 'all', null, null, paymentFilter, payCheckDates, true, allBillsScope);
        } else if (viewMode === 'upcoming') {
            visibleBills = getUpcomingBills(
                bills,
                selectedPaycheck,
                payCheckDates,
                state.showCarriedForward
            );
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

        // Apply same payment filter as grid
        if (paymentFilter === 'unpaid') {
            visibleBills = visibleBills.filter(bill => !bill.isPaid);
        } else if (paymentFilter === 'paid') {
            visibleBills = visibleBills.filter(bill => bill.isPaid);
        }

        if (visibleBills.length === 0) {
            billActionHandlers.showErrorNotification('No bills to update.', 'Bulk Action');
            return;
        }

        // Determine action based on majority state
        const paidCount = visibleBills.filter(b => b.isPaid).length;
        const unpaidCount = visibleBills.length - paidCount;
        const shouldMarkPaid = unpaidCount >= paidCount;

        const ids = shouldMarkPaid
            ? visibleBills.filter(b => !b.isPaid).map(b => b.id)
            : visibleBills.filter(b => b.isPaid).map(b => b.id);

        if (ids.length === 0) {
            const message = shouldMarkPaid
                ? ERROR_CODES.BULK_NO_UNPAID_VISIBLE.message
                : 'All visible bills are already marked as unpaid.';
            billActionHandlers.showErrorNotification(message, 'Bulk Action');
            return;
        }

        const confirmed = await showConfirmationModal({
            title: shouldMarkPaid ? 'Mark bills as paid?' : 'Mark bills as unpaid?',
            message: `This will mark ${ids.length} visible bill${ids.length === 1 ? '' : 's'} as ${shouldMarkPaid ? 'paid' : 'unpaid'}.`,
            confirmText: shouldMarkPaid ? 'Mark Paid' : 'Mark Unpaid',
            confirmVariant: 'primary'
        });

        if (confirmed) {
            const previousBills = structuredClone(billStore.getAll());
            const success = shouldMarkPaid
                ? bulkMarkAsPaid(ids, true, { suppressSuccessNotification: true })
                : bulkMarkAsUnpaid(ids, true, { suppressSuccessNotification: true });
            if (success) {
                const actionLabel = shouldMarkPaid ? 'marked paid' : 'marked unpaid';
                const undoAction = enqueueUndoAction({
                    durationMs: 10000,
                    onUndo: () => {
                        billStore.setBills(previousBills);
                        recordAuditEvent('bulk.undo.applied', {
                            entityType: 'bill',
                            summary: `Undo applied for bulk ${shouldMarkPaid ? 'paid' : 'unpaid'} action`,
                            metadata: {
                                count: ids.length,
                                action: shouldMarkPaid ? 'paid' : 'unpaid'
                            }
                        });
                        billActionHandlers.showSuccessNotification('Bulk update undone.');
                        this.rerender();
                    }
                });

                billActionHandlers.showSuccessNotification(
                    `Bulk update applied: ${ids.length} bill${ids.length === 1 ? '' : 's'} ${actionLabel}.`,
                    {
                        actionLabel: 'Undo',
                        durationMs: 10000,
                        onAction: () => {
                            undoAction.consume();
                        }
                    }
                );
                this.rerender();
            }
        }
    }

    handleBulkFillBalances() {
        const previousBills = structuredClone(billStore.getAll());
        if (bulkFillZeroBalances({ suppressSuccessNotification: true })) {
            const restoredCount = previousBills.filter(bill => !bill.isPaid && (bill.balance === 0 || !bill.balance)).length;
            const undoAction = enqueueUndoAction({
                durationMs: 10000,
                onUndo: () => {
                    billStore.setBills(previousBills);
                    recordAuditEvent('bulk.undo.applied', {
                        entityType: 'bill',
                        summary: 'Undo applied for bulk fill balances action',
                        metadata: {
                            count: restoredCount,
                            action: 'fill-balances'
                        }
                    });
                    billActionHandlers.showSuccessNotification('Bulk balance fill undone.');
                    this.rerender();
                }
            });

            billActionHandlers.showSuccessNotification(
                `Filled balances for ${restoredCount} bill${restoredCount === 1 ? '' : 's'}.`,
                {
                    actionLabel: 'Undo',
                    durationMs: 10000,
                    onAction: () => {
                        undoAction.consume();
                    }
                }
            );
            this.rerender();
        }
    }

    handleApplyReconcileFix(billId, issueCode = null) {
        try {
            const bill = billStore.getAll().find((entry) => entry.id === billId);
            if (!bill) {
                billActionHandlers.showErrorNotification('Bill not found.', 'Reconcile');
                return;
            }

            const detectedIssues = getBillReconciliationIssues(bill);
            if (detectedIssues.length === 0) {
                billActionHandlers.showSuccessNotification('No reconcile issues detected for this bill.');
                return;
            }

            const { updatedBill: updated, appliedIssue: targetIssue } = applyReconciliationFix(bill, issueCode);
            if (!updated || !targetIssue || !Object.values(RECONCILIATION_ISSUES).includes(targetIssue.code)) {
                billActionHandlers.showErrorNotification('Unsupported reconcile issue.', 'Reconcile');
                return;
            }

            billStore.update(updated);
            recordAuditEvent('bill.reconcile.fixed', {
                entityType: 'bill',
                entityId: bill.id,
                summary: `Applied reconcile fix (${targetIssue.code}) for ${bill.name}`,
                metadata: {
                    issueCode: targetIssue.code
                }
            });
            billActionHandlers.showSuccessNotification(`Reconcile fix applied for "${bill.name}".`);
            this.rerender();
        } catch (error) {
            logger.error('Failed to apply reconcile fix', error);
            billActionHandlers.showErrorNotification(error.message, 'Reconcile');
        }
    }

    // showConfirmationModal moved to src/app/initializeModals.js

    // handleToggleTheme moved to src/app/themeManager.js

    handleShowSettings() {
        settingsHandlers.showSettingsModal(this.categories);
    }

    /**
     * Show a session-expired dialog prompting the user to sign in again.
     * Called by setupTokenRefreshMonitor when a session expires unexpectedly.
     */
    _showSessionExpiredPrompt() {
        StorageManager.remove(STORAGE_KEYS.USER_EMAIL);

        const existing = document.getElementById('sessionExpiredModal');
        if (existing) return; // already shown

        const modal = document.createElement('div');
        modal.id = 'sessionExpiredModal';
        modal.className = 'modal';
        modal.style.display = 'block';

        const content = document.createElement('div');
        content.className = 'modal-content modal-content-compact confirm-dialog';
        content.setAttribute('role', 'dialog');
        content.setAttribute('aria-modal', 'true');
        content.setAttribute('aria-labelledby', 'sessionExpiredTitle');

        const title = document.createElement('h2');
        title.id = 'sessionExpiredTitle';
        title.className = 'confirm-dialog-title';
        title.textContent = 'Session Expired';

        const message = document.createElement('p');
        message.className = 'confirm-dialog-message';
        message.textContent = 'Your session has expired. Please sign in again to continue syncing your data.';

        const actions = document.createElement('div');
        actions.className = 'confirm-dialog-actions';

        const dismissBtn = document.createElement('button');
        dismissBtn.type = 'button';
        dismissBtn.className = 'confirm-btn confirm-btn-secondary';
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.addEventListener('click', () => modal.remove());

        const signInBtn = document.createElement('button');
        signInBtn.type = 'button';
        signInBtn.className = 'confirm-btn confirm-btn-primary';
        signInBtn.textContent = 'Sign In Again';
        signInBtn.addEventListener('click', () => {
            modal.remove();
            openAuthModal();
        });

        actions.appendChild(dismissBtn);
        actions.appendChild(signInBtn);
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(actions);
        modal.appendChild(content);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
        signInBtn.focus();

        logger.warn('Session expired — prompting user to sign in again');
    }

    _isPasswordRecoveryRedirect() {
        const hash = window.location.hash || '';
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(window.location.search);

        const recoveryType = hashParams.get('type') || searchParams.get('type');
        const hasRecoveryToken = Boolean(
            hashParams.get('access_token') ||
            hashParams.get('refresh_token') ||
            searchParams.get('token_hash') ||
            searchParams.get('code')
        );

        return recoveryType === 'recovery' && hasRecoveryToken;
    }

    _getAuthRedirectErrorDetails() {
        const hash = window.location.hash || '';
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(window.location.search);

        const error = hashParams.get('error') || searchParams.get('error');
        const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

        if (!error && !errorCode && !errorDescription) {
            return null;
        }

        return { error, errorCode, errorDescription };
    }

    _handleAuthRedirectError() {
        const details = this._getAuthRedirectErrorDetails();
        if (!details) {
            return;
        }

        const { errorCode, errorDescription } = details;
        const fallbackMessage = 'Authentication link is invalid or has expired. Please request a new one.';
        const message = errorCode === 'otp_expired'
            ? 'This email link has expired. Request a new password reset email and try again.'
            : (errorDescription || fallbackMessage);

        logger.warn('Auth redirect returned error', details);
        billActionHandlers.showErrorNotification(message, 'Authentication');
        this._clearAuthRecoveryParamsFromUrl();
        openAuthModal();
    }

    _clearAuthRecoveryParamsFromUrl() {
        const url = new URL(window.location.href);
        const recoverySearchParams = [
            'type',
            'token_hash',
            'code',
            'error',
            'error_code',
            'error_description'
        ];

        recoverySearchParams.forEach((param) => url.searchParams.delete(param));
        url.hash = '';

        const cleanUrl = `${url.pathname}${url.search}`;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    async _handlePasswordRecoveryRedirect() {
        if (!this._isPasswordRecoveryRedirect()) {
            return;
        }

        const password = window.prompt('Enter your new password (minimum 8 characters):') || '';
        if (!password) {
            billActionHandlers.showErrorNotification('Password reset canceled. Open the reset link again when you are ready.', 'Password Reset');
            this._clearAuthRecoveryParamsFromUrl();
            return;
        }

        if (password.length < 8) {
            billActionHandlers.showErrorNotification('Password must be at least 8 characters long.', 'Password Reset');
            this._clearAuthRecoveryParamsFromUrl();
            return;
        }

        const confirmPassword = window.prompt('Confirm your new password:') || '';
        if (password !== confirmPassword) {
            billActionHandlers.showErrorNotification('Passwords do not match. Please try the reset link again.', 'Password Reset');
            this._clearAuthRecoveryParamsFromUrl();
            return;
        }

        const { error } = await updatePassword(password);
        this._clearAuthRecoveryParamsFromUrl();

        if (error) {
            logger.error('Failed to update password from recovery link', error);
            billActionHandlers.showErrorNotification(error.message || 'Unable to update password. Please request a new reset email.', 'Password Reset');
            return;
        }

        await signOut();
        StorageManager.remove(STORAGE_KEYS.USER_EMAIL);
        billActionHandlers.showSuccessNotification('Password updated. Please sign in with your new password.');
        openAuthModal();
    }

    // initializePaymentModals moved to src/app/initializeModals.js

    // initializeTheme moved to src/app/themeManager.js
}

// Export singleton instance
export const appOrchestrator = new AppOrchestrator();
