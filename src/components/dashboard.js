import { filterBillsByPeriod } from '../utils/billHelpers.js';
import { isDebtSnowballCandidate } from '../utils/debtSnowball.js';

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
 * - Total Credit: Sum of all stored bill credits
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
 *   2. Total available credit across visible bills
 *   3. Unpaid bill count and unpaid amount
 *   4. Overdue bill count (past due and unpaid)
 *   5. Payment history pie chart showing paid vs unpaid ratio
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

    // Debt overview widget — uses ALL bills (not filtered) to show full debt picture
    const debtCandidates = (bills || []).filter(isDebtSnowballCandidate);
    const totalDebtAmount = debtCandidates.reduce((sum, b) => sum + Math.max(0, Number.parseFloat(b.debtTotal) || 0), 0);
    const totalDebtMonthlyInterest = debtCandidates.reduce((sum, b) => {
        const rate = Math.max(0, Number.parseFloat(b.interestRate) || 0);
        const debt = Math.max(0, Number.parseFloat(b.debtTotal) || 0);
        return sum + (debt * (rate / 100) / 12);
    }, 0);
    const debtWidgetHtml = debtCandidates.length > 0 ? `
        <div class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <span class="text-base">🏔️</span>
            <span class="font-semibold">Debt Overview</span>
            <span class="text-amber-600">•</span>
            <span>${debtCandidates.length} tracked debt${debtCandidates.length !== 1 ? 's' : ''}</span>
            <span class="text-amber-600">•</span>
            <span>Total: <strong>$${totalDebtAmount.toFixed(2)}</strong></span>
            <span class="text-amber-600">•</span>
            <span>Est. Monthly Interest: <strong>$${totalDebtMonthlyInterest.toFixed(2)}</strong></span>
            <button id="dashboardDebtLink" type="button" class="ml-auto inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors">View Debt Snowball →</button>
        </div>` : '';

    const totalBills = displayBills.length;
    const totalAmountDue = displayBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const totalCredit = displayBills.reduce((sum, bill) => sum + Math.max(0, Number.parseFloat(bill.creditBalance) || 0), 0);
    const netDue = Math.max(0, totalAmountDue - totalCredit);
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
                    <span>🧮</span><span class="font-medium">Net Due</span><span class="font-bold text-foreground">$0.00</span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border bg-emerald-50 px-3 py-2 shadow-sm text-xs text-emerald-700 border-emerald-200">
                    <span>💚</span><span class="font-medium">Total Credit</span><span class="font-bold text-emerald-800">$0.00</span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm text-xs text-muted-foreground">
                    <span>⚠️</span><span class="font-medium">Unpaid</span><span class="font-bold text-foreground">0</span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm text-xs text-muted-foreground">
                    <span>🔴</span><span class="font-medium">Overdue</span><span class="font-bold text-foreground">0</span>
                </div>
            </div>
            ${debtWidgetHtml}
        `;
        return;
    }

    dashboard.className = "w-full pt-3 pb-1";
    dashboard.innerHTML = `
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-7 sm:gap-3 mb-2">
            <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-2.5 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-0.5">
                    <span class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Total Bills</span>
                    <span class="text-xs">📋</span>
                </div>
                <div class="flex items-center pt-0.5">
                    <span class="text-base font-bold tracking-tight text-foreground sm:text-lg">${totalBills}</span>
                </div>
            </div>
            
            <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-2.5 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-0.5">
                    <span class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Total Due</span>
                    <span class="text-xs">💰</span>
                </div>
                <div class="flex items-center pt-0.5">
                    <span class="text-base font-bold tracking-tight text-foreground sm:text-lg">$${totalAmountDue.toFixed(2)}</span>
                </div>
            </div>

            <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-2.5 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-0.5">
                    <span class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Net Due</span>
                    <span class="text-xs">🧮</span>
                </div>
                <div class="flex items-center pt-0.5">
                    <span class="text-base font-bold tracking-tight ${netDue > 0 ? 'text-foreground' : 'text-emerald-700'} sm:text-lg">$${netDue.toFixed(2)}</span>
                </div>
            </div>

            <div class="flex flex-col gap-0.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-0.5">
                    <span class="text-[9px] font-bold uppercase tracking-wider text-emerald-700 sm:text-[10px]">Total Credit</span>
                    <span class="text-xs">💚</span>
                </div>
                <div class="flex items-center pt-0.5">
                    <span class="text-base font-bold tracking-tight text-emerald-800 sm:text-lg">$${totalCredit.toFixed(2)}</span>
                </div>
            </div>

            <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-2.5 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-0.5">
                    <span class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Unpaid</span>
                    <span class="text-xs">⚠️</span>
                </div>
                <div class="flex items-center pt-0.5">
                    <span class="text-base font-bold tracking-tight text-foreground sm:text-lg">${unpaidBills.length}</span>
                </div>
            </div>

            <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-2.5 shadow-sm">
                <div class="flex items-center justify-between space-y-0 pb-0.5">
                    <span class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Unpaid Amt</span>
                    <span class="text-xs">💳</span>
                </div>
                <div class="flex items-center pt-0.5">
                    <span class="text-base font-bold tracking-tight text-foreground sm:text-lg text-destructive">$${totalUnpaidAmount.toFixed(2)}</span>
                </div>
            </div>

            <div class="col-span-2 flex flex-col gap-0.5 rounded-lg border bg-card p-2.5 shadow-sm sm:col-span-1 border-destructive/20 bg-destructive/5">
                <div class="flex items-center justify-between space-y-0 pb-0.5">
                    <span class="text-[9px] font-bold uppercase tracking-wider text-destructive sm:text-[10px]">Overdue</span>
                    <span class="text-xs">🔴</span>
                </div>
                <div class="flex items-center pt-0.5">
                    <span class="text-base font-bold tracking-tight text-destructive sm:text-lg">${overdueBills.length}</span>
                </div>
            </div>
        </div>
        ${debtWidgetHtml}
    `;
};
