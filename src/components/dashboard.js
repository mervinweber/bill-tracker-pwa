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
export const renderDashboard = (bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates) => {
    const dashboard = document.getElementById('dashboard');

    // Use shared filtering logic to ensure consistency with grid
    const displayBills = filterBillsByPeriod(bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates);


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

    dashboard.innerHTML = `
        <div class="dashboard">
            <div class="dashboard-card">
                <div class="card-icon">📊</div>
                <div class="card-content">
                    <div class="card-value">${totalBills}</div>
                    <div class="card-label">Total Bills</div>
                </div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon">💰</div>
                <div class="card-content">
                    <div class="card-value">$${totalAmountDue.toFixed(2)}</div>
                    <div class="card-label">Total Due</div>
                </div>
            </div>
            <div class="dashboard-card unpaid">
                <div class="card-icon">⚠️</div>
                <div class="card-content">
                    <div class="card-value">${unpaidBills.length}</div>
                    <div class="card-label">Unpaid</div>
                </div>
            </div>
            <div class="dashboard-card unpaid-amount">
                <div class="card-icon">💳</div>
                <div class="card-content">
                    <div class="card-value">$${totalUnpaidAmount.toFixed(2)}</div>
                    <div class="card-label">Unpaid Amt</div>
                </div>
            </div>
            <div class="dashboard-card overdue">
                <div class="card-icon">🔴</div>
                <div class="card-content">
                    <div class="card-value">${overdueBills.length}</div>
                    <div class="card-label">Overdue</div>
                </div>
            </div>
        </div>
    `;
};
