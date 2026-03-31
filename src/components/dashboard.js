import { filterBillsByPeriod } from '../utils/billHelpers.js';

/**
 * Dashboard Component
 * 
 * Displays financial overview metrics and statistics.
 * Shows total bills, total due amount, unpaid count/amount, overdue count,
 * and payment history. Respects view mode and category filtering.
 * 
 * Dashboard Metrics Displayed:
 * - Total Bills: Count of all bills in current view
 * - Total Due: Sum of all bill amounts
 * - Unpaid Count: Number of unpaid bills
 * - Unpaid Amount: Sum of unpaid bill amounts
 * - Overdue Count: Bills past due date and unpaid
 * - Payment History: Pie chart of payment status
 * 
 * @module dashboard
 */

/**
 * Initialize dashboard component
 * 
 * @function initializeDashboard
 * @returns {void}
 * 
 * @description Performs initial render of dashboard with empty data.
 *   Dashboard container HTML already exists in index.html.
 *   Called during app initialization to set up dashboard display.
 * 
 * @example
 * initializeDashboard();
 */
export const initializeDashboard = () => {
    // Dashboard container is already in HTML, nothing to init
    renderDashboard([], 'all', null, null, 'all', []);
};

/**
 * Render dashboard with calculated financial metrics
 * 
 * @function renderDashboard
 * @param {Array<Object>} bills - All bills to include in calculations
 * @param {string} viewMode - View mode: 'all' or 'filtered'
 *   - 'all': Display all bills regardless of paycheck/category
 *   - 'filtered': Apply paycheck and category filters to bills
 * @param {number|null} selectedPaycheck - Index of selected paycheck period (null if 'all' mode)
 * @param {string|null} selectedCategory - Selected bill category (null if 'all' mode)
 * @param {string} paymentFilter - Payment status filter
 *   Options: 'all', 'paid', 'unpaid'
 * @param {Array<Date>} payCheckDates - Array of paycheck date boundaries for filtering
 * 
 * @returns {void}
 * 
 * @description Calculates and displays:
 *   1. Total bill count and total amount due
 *   2. Unpaid bill count and unpaid amount
 *   3. Overdue bill count (past due and unpaid)
 *   4. Payment history pie chart showing paid vs unpaid ratio
 *   
 *   Applies filters in order:
 *   1. Payment status filter (paid/unpaid/all)
 *   2. View mode filter (if filtered, also filter by paycheck period and category)
 * 
 * @example
 * renderDashboard(
 *   billsData,
 *   'filtered',
 *   0,  // First paycheck period
 *   'Utilities',
 *   'unpaid',
 *   [new Date(2024, 0, 1), new Date(2024, 0, 15), ...]
 * );
 */
export const renderDashboard = (bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates, showCarriedForward = true, allBillsScope = 'everything') => {
    const dashboard = document.getElementById('dashboard');

    // Use shared filtering logic to ensure consistency with grid
    const displayBills = filterBillsByPeriod(bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates, showCarriedForward, allBillsScope);


    const totalBills = displayBills.length;
    const totalAmountDue = displayBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const unpaidBills = displayBills.filter(b => !b.isPaid);
    const totalUnpaidAmount = unpaidBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);

    // Calculate overdue bills (due date < today and not paid)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueBills = displayBills.filter(b => {
        const dueDate = new Date(b.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today && !b.isPaid;
    });

    const allZero = totalBills === 0 && totalAmountDue === 0 && unpaidBills.length === 0 && overdueBills.length === 0;

    // Compact layout when no data matches the current filter
    if (allZero) {
        dashboard.className = "w-full pt-3 pb-1";
        dashboard.innerHTML = `
            <div class="flex flex-wrap gap-2 sm:gap-3 mb-1">
                <div class="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm text-xs text-muted-foreground">
                    <span>📋</span><span class="font-medium">Total Bills</span><span class="font-bold text-foreground">0</span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm text-xs text-muted-foreground">
                    <span>💰</span><span class="font-medium">Total Due</span><span class="font-bold text-foreground">$0.00</span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm text-xs text-muted-foreground">
                    <span>⚠️</span><span class="font-medium">Unpaid</span><span class="font-bold text-foreground">0</span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm text-xs text-muted-foreground">
                    <span>🔴</span><span class="font-medium">Overdue</span><span class="font-bold text-foreground">0</span>
                </div>
            </div>
        `;
        return;
    }

    dashboard.className = "w-full pt-4 pb-2";
    dashboard.innerHTML = `
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4 mb-2">
            <div class="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">Total Bills</span>
                    <span class="text-sm">📋</span>
                </div>
                <div class="flex items-center pt-1">
                    <span class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">${totalBills}</span>
                </div>
            </div>
            
            <div class="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">Total Due</span>
                    <span class="text-sm">💰</span>
                </div>
                <div class="flex items-center pt-1">
                    <span class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">$${totalAmountDue.toFixed(2)}</span>
                </div>
            </div>

            <div class="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">Unpaid</span>
                    <span class="text-sm">⚠️</span>
                </div>
                <div class="flex items-center pt-1">
                    <span class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">${unpaidBills.length}</span>
                </div>
            </div>

            <div class="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">Unpaid Amt</span>
                    <span class="text-sm">💳</span>
                </div>
                <div class="flex items-center pt-1">
                    <span class="text-xl font-bold tracking-tight text-foreground sm:text-2xl text-destructive">$${totalUnpaidAmount.toFixed(2)}</span>
                </div>
            </div>

            <div class="col-span-2 flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm sm:col-span-1 border-destructive/20 bg-destructive/5">
                <div class="flex items-center justify-between space-y-0 pb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-destructive sm:text-xs">Overdue</span>
                    <span class="text-sm">🔴</span>
                </div>
                <div class="flex items-center pt-1">
                    <span class="text-xl font-bold tracking-tight text-destructive sm:text-2xl">${overdueBills.length}</span>
                </div>
            </div>
        </div>
    `;
};
