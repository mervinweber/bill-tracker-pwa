import { filterBillsByPeriod } from '../utils/billHelpers.js';
import { isDebtSnowballCandidate } from '../utils/debtSnowball.js';
import { isSupabaseConfigured } from '../services/supabase.js';
import { getNotificationSettings } from '../utils/notifications.js';
import { createLocalDate } from '../utils/dates.js';
import { paycheckManager } from '../utils/paycheckManager.js';
import { forecastNextMonth } from '../utils/forecastingHelpers.js';
import StorageManager from '../utils/StorageManager.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { appState } from '../store/appState.js';

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
 * Build the Setup Health Card HTML strip.
 * Runs 4 synchronous health checks and returns an HTML string.
 * Returns empty string when all checks pass and there's nothing to flag.
 *
 * @returns {string} HTML string for the health card
 */
function buildHealthCardHtml() {
    const checks = [];

    // 1. Cloud sync configured
    const syncOk = isSupabaseConfigured();
    checks.push({
        label: 'Cloud Sync',
        ok: syncOk,
        icon: '☁️',
        ctaLabel: syncOk ? null : 'Configure',
        ctaTarget: 'settingsBtn'
    });

    // 2. Reminders enabled + permission granted
    const notifSettings = getNotificationSettings();
    const hasNotifPermission = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    const remindersOk = notifSettings.enabled && hasNotifPermission;
    checks.push({
        label: 'Reminders',
        ok: remindersOk,
        icon: '🔔',
        ctaLabel: remindersOk ? null : 'Enable',
        ctaTarget: 'settingsBtn'
    });

    // 3. Recent backup (within 30 days)
    const lastExport = StorageManager.get(STORAGE_KEYS.LAST_EXPORT_DATE, null);
    const backupOk = !!lastExport && (Date.now() - new Date(lastExport).getTime()) < 30 * 24 * 60 * 60 * 1000;
    checks.push({
        label: 'Backup',
        ok: backupOk,
        icon: '💾',
        ctaLabel: backupOk ? null : 'Export Now',
        ctaTarget: 'exportDataBtn'
    });

    // 4. Turnstile security configured
    const turnstileOk = !!(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TURNSTILE_SITE_KEY);
    checks.push({
        label: 'Security',
        ok: turnstileOk,
        icon: '🔒',
        ctaLabel: turnstileOk ? null : 'Review',
        ctaTarget: 'settingsBtn'
    });

    const failCount = checks.filter(c => !c.ok).length;
    const allOk = failCount === 0;

    // No setup warnings to show.
    if (allOk) {
        return '';
    }

    const badgeClass = allOk
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-amber-200 bg-amber-50 text-amber-800';
    const dotColor = allOk ? 'bg-emerald-500' : 'bg-amber-400';

    const checkBadges = checks.map(c => {
        const cls = c.ok
            ? 'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700'
            : 'inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 cursor-pointer hover:bg-amber-200';
        const icon = c.ok ? '✓' : '!';
        return `<span class="${cls}">${c.icon} ${c.label} <span class="font-bold">${icon}</span></span>`;
    }).join('');

    const issueLabel = failCount === 1 ? '1 issue' : `${failCount} issues`;
    const ctaHtml = `<button type="button" id="healthCardSettingsLink" class="inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors">Review Setup →</button>`;

    return `
        <div class="mt-2 rounded-2xl border ${badgeClass} px-4 py-3 text-xs shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-2 border-b border-current/10 pb-3">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="inline-block h-2 w-2 rounded-full ${dotColor}"></span>
                        <span class="font-semibold">Setup Health</span>
                        <span class="rounded-full border border-current/15 bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]">${issueLabel}</span>
                    </div>
                    <div class="text-sm font-medium">A few setup checks still need attention.</div>
                </div>
                ${ctaHtml}
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
                ${checkBadges}
            </div>
        </div>`;
}

function getNormalizedDate(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function getBillDueDate(bill) {
    if (typeof bill?.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bill.dueDate)) {
        return getNormalizedDate(createLocalDate(bill.dueDate));
    }

    return getNormalizedDate(bill?.dueDate || new Date());
}

function getNextPaydayDate(payCheckDates = []) {
    const today = getNormalizedDate();
    const futurePayday = (payCheckDates || [])
        .map((date) => getNormalizedDate(date))
        .find((date) => date > today);

    if (futurePayday) {
        return futurePayday;
    }

    const lastKnownPayday = payCheckDates?.length ? getNormalizedDate(payCheckDates[payCheckDates.length - 1]) : null;
    if (!lastKnownPayday) {
        return null;
    }

    const frequency = paycheckManager.paymentSettings?.frequency || 'bi-weekly';
    const days = frequency === 'weekly'
        ? 7
        : frequency === 'bi-weekly'
            ? 14
            : frequency === 'custom'
                ? Number.parseInt(paycheckManager.paymentSettings?.customDays, 10) || 30
                : 30;
    return getNormalizedDate(new Date(lastKnownPayday.getTime() + (days * 24 * 60 * 60 * 1000)));
}

function buildTodayOverviewHtml(bills = [], payCheckDates = [], paymentFilter = 'all') {
    if (!Array.isArray(bills) || bills.length === 0) {
        return '';
    }

    const today = getNormalizedDate();
    const nextPayday = getNextPaydayDate(payCheckDates);
    const unpaidBills = bills.filter((bill) => !bill.isPaid);

    const overdueBills = unpaidBills.filter((bill) => getBillDueDate(bill) < today);
    const beforeNextPaydayBills = unpaidBills.filter((bill) => {
        const dueDate = getBillDueDate(bill);
        if (dueDate < today) {
            return false;
        }
        return nextPayday ? dueDate < nextPayday : true;
    });
    const nextUpBill = [...unpaidBills]
        .map((bill) => ({ bill, dueDate: getBillDueDate(bill) }))
        .filter(({ dueDate }) => dueDate >= today)
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0] || null;

    const overdueTotal = overdueBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const beforeNextPaydayTotal = beforeNextPaydayBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const allCaughtUp = overdueBills.length === 0 && beforeNextPaydayBills.length === 0;
    const nextPaydayLabel = nextPayday
        ? nextPayday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'your next pay day';

    const containerClass = allCaughtUp
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : overdueBills.length > 0
            ? 'border-rose-200 bg-rose-50 text-rose-950'
            : 'border-amber-200 bg-amber-50 text-amber-950';
    const subtitle = allCaughtUp
        ? `No unpaid bills are past due or due before ${nextPaydayLabel}.`
        : `Based on today's date, here's what needs attention before ${nextPaydayLabel}.`;

    const pastDueActiveClass = paymentFilter === 'overdue'
        ? 'ring-2 ring-primary ring-offset-1'
        : 'hover:border-primary/50 hover:bg-background/90';
    const beforeNextActiveClass = paymentFilter === 'before_next_payday'
        ? 'ring-2 ring-primary ring-offset-1'
        : 'hover:border-primary/50 hover:bg-background/90';
    const nextUpActiveClass = nextUpBill && paymentFilter === 'all'
        ? 'ring-2 ring-primary ring-offset-1'
        : 'hover:border-primary/50 hover:bg-background/90';

    return `
        <section class="mb-3 rounded-2xl border ${containerClass} px-4 py-3 shadow-sm" aria-label="Today's overview">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div class="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">Today's Overview</div>
                    <div class="mt-1 text-sm font-medium">${subtitle}</div>
                </div>
                <div class="grid gap-2 sm:grid-cols-3 lg:min-w-[42rem] lg:max-w-[48rem] lg:flex-1">
                    <button
                        type="button"
                        class="rounded-xl border border-current/10 bg-background/70 px-3 py-2 text-left shadow-sm transition ${pastDueActiveClass}"
                        data-dashboard-filter="overdue"
                        aria-pressed="${paymentFilter === 'overdue' ? 'true' : 'false'}"
                    >
                        <div class="text-[11px] uppercase tracking-[0.15em] opacity-65">Past Due</div>
                        <div class="mt-1 text-lg font-semibold">${overdueBills.length} bill${overdueBills.length === 1 ? '' : 's'}</div>
                        <div class="text-xs opacity-75">$${overdueTotal.toFixed(2)} total</div>
                    </button>
                    <button
                        type="button"
                        class="rounded-xl border border-current/10 bg-background/70 px-3 py-2 text-left shadow-sm transition ${beforeNextActiveClass}"
                        data-dashboard-filter="before_next_payday"
                        aria-pressed="${paymentFilter === 'before_next_payday' ? 'true' : 'false'}"
                    >
                        <div class="text-[11px] uppercase tracking-[0.15em] opacity-65">Before Next Payday</div>
                        <div class="mt-1 text-lg font-semibold">${beforeNextPaydayBills.length} bill${beforeNextPaydayBills.length === 1 ? '' : 's'}</div>
                        <div class="text-xs opacity-75">$${beforeNextPaydayTotal.toFixed(2)} due before ${nextPaydayLabel}</div>
                    </button>
                    <button
                        type="button"
                        class="rounded-xl border border-current/10 bg-background/70 px-3 py-2 text-left shadow-sm transition ${nextUpActiveClass}"
                        data-dashboard-filter="all"
                        aria-pressed="${paymentFilter === 'all' ? 'true' : 'false'}"
                    >
                        <div class="text-[11px] uppercase tracking-[0.15em] opacity-65">Next Up</div>
                        <div class="mt-1 text-lg font-semibold">${nextUpBill ? nextUpBill.bill.name : 'All caught up'}</div>
                        <div class="text-xs opacity-75">${nextUpBill ? `${nextUpBill.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · $${nextUpBill.bill.amountDue.toFixed(2)}` : 'No upcoming unpaid bills'}</div>
                    </button>
                </div>
            </div>
        </section>`;
}

function getNextPaycheckDate(payCheckDates = []) {
    const today = getNormalizedDate();
    const future = (payCheckDates || [])
        .map((date) => getNormalizedDate(date))
        .find((date) => date > today);

    return future || null;
}

function buildPaycheckCoverageHtml(bills = [], payCheckDates = [], paymentFilter = 'all', allBillsScope = 'everything') {
    if (!Array.isArray(bills) || bills.length === 0) {
        return '';
    }

    const nextPaycheck = getNextPaycheckDate(payCheckDates);
    if (!nextPaycheck) {
        return '';
    }

    const settings = paycheckManager.paymentSettings || {};
    const paycheckAmount = Math.max(0, Number.parseFloat(settings.amount) || 0);
    const today = getNormalizedDate();
    const dueBeforeNextPaycheck = bills.filter((bill) => {
        if (bill.isPaid) return false;
        const dueDate = getBillDueDate(bill);
        return dueDate >= today && dueDate < nextPaycheck;
    });

    const dueTotal = dueBeforeNextPaycheck.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const coverageGap = Math.max(0, dueTotal - paycheckAmount);
    const coverageRemaining = Math.max(0, paycheckAmount - dueTotal);
    const nextPaycheckLabel = nextPaycheck.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const coverageClass = coverageGap > 0
        ? 'border-rose-200 bg-rose-50 text-rose-950'
        : 'border-emerald-200 bg-emerald-50 text-emerald-950';
    const coverageText = paycheckAmount > 0
        ? coverageGap > 0
            ? `Short by $${coverageGap.toFixed(2)} before ${nextPaycheckLabel}.`
            : `Covered with $${coverageRemaining.toFixed(2)} left after ${nextPaycheckLabel}.`
        : `Set a paycheck amount in Settings to see coverage.`;

    const filterHint = paymentFilter !== 'all' || allBillsScope !== 'everything'
        ? 'Based on your current filters and scope.'
        : 'Based on all unpaid bills due before the next paycheck.';

    return `
        <section class="mb-3 rounded-2xl border ${coverageClass} px-4 py-3 shadow-sm" aria-label="Paycheck coverage">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div class="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">Paycheck Coverage</div>
                    <div class="mt-1 text-sm font-medium">${coverageText}</div>
                    <div class="mt-1 text-xs opacity-75">${filterHint}</div>
                </div>
                <div class="grid grid-cols-2 gap-2 sm:min-w-[240px]">
                    <div class="rounded-xl border border-current/10 bg-background/80 px-3 py-2">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">Bills Before</div>
                        <div class="mt-1 text-lg font-semibold">${dueBeforeNextPaycheck.length}</div>
                    </div>
                    <div class="rounded-xl border border-current/10 bg-background/80 px-3 py-2">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">Total Due</div>
                        <div class="mt-1 text-lg font-semibold">$${dueTotal.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

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

function buildMetricCard({ label, icon, value, tone = 'default', filter = 'all', isActive = false, columns = '' }) {
    const toneClass = tone === 'success'
        ? 'border-emerald-200 bg-emerald-50'
        : tone === 'danger'
            ? 'border-destructive/20 bg-destructive/5'
            : 'bg-card';
    const labelClass = tone === 'success'
        ? 'text-emerald-700'
        : tone === 'danger'
            ? 'text-destructive'
            : 'text-muted-foreground';
    const valueClass = tone === 'success'
        ? 'text-emerald-800'
        : tone === 'danger'
            ? 'text-destructive'
            : 'text-foreground';
    const activeClass = isActive ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/40 hover:bg-accent/40';

    return `
        <button type="button" class="${columns} flex flex-col gap-0.5 rounded-lg border p-2.5 text-left shadow-sm transition ${toneClass} ${activeClass}" data-dashboard-filter="${filter}" aria-pressed="${isActive ? 'true' : 'false'}">
            <div class="flex items-center justify-between space-y-0 pb-0.5">
                <span class="text-[9px] font-bold uppercase tracking-wider ${labelClass} sm:text-[10px]">${label}</span>
                <span class="text-xs">${icon}</span>
            </div>
            <div class="flex items-center pt-0.5">
                <span class="text-base font-bold tracking-tight ${valueClass} sm:text-lg">${value}</span>
            </div>
        </button>
    `;
}

function wireDashboardFilterCards() {
    document.querySelectorAll('[data-dashboard-filter]').forEach((node) => {
        node.addEventListener('click', () => {
            const filter = node.getAttribute('data-dashboard-filter') || 'all';
            appState.setDisplayMode('list');
            appState.setPaymentFilter(filter);
        });
    });
}

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
    const healthCardHtml = buildHealthCardHtml();
    const todayOverviewHtml = buildTodayOverviewHtml(displayBills, payCheckDates, paymentFilter);
    const paycheckCoverageHtml = buildPaycheckCoverageHtml(displayBills, payCheckDates, paymentFilter, allBillsScope);
    const forecast = forecastNextMonth(displayBills);
    const topForecastCategory = Object.entries(forecast.byCategory || {})
        .sort((a, b) => b[1] - a[1])[0] || null;
    const forecastCardHtml = `
        <div class="mb-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-950 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">Next Month Forecast</div>
                    <div class="mt-1 text-sm font-medium">${forecast.recurringCount} recurring bill${forecast.recurringCount === 1 ? '' : 's'} mapped</div>
                    <div class="mt-1 text-xs text-sky-700">Projected recurring total: <strong>$${forecast.total.toFixed(2)}</strong>${topForecastCategory ? ` · Largest category: ${topForecastCategory[0]}` : ''}</div>
                </div>
                <div class="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                    <div class="rounded-xl border border-sky-200 bg-white/70 px-3 py-2">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">Recurring</div>
                        <div class="mt-1 text-lg font-semibold text-sky-950">${forecast.recurringCount}</div>
                    </div>
                    <div class="rounded-xl border border-sky-200 bg-white/70 px-3 py-2">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">Monthly Total</div>
                        <div class="mt-1 text-lg font-semibold text-sky-950">$${forecast.total.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </div>`;

    if (allZero) {
        dashboard.className = "w-full pt-3 pb-1";
        dashboard.innerHTML = `
            ${todayOverviewHtml}
            ${paycheckCoverageHtml}
            <div class="mb-1 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                        <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Summary</div>
                        <div class="mt-1 text-sm font-medium text-foreground">No bills are in this view yet.</div>
                    </div>
                    <div class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        Ready for first bill
                    </div>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <button type="button" class="rounded-xl border border-border bg-background px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/40" data-dashboard-filter="all">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Total Bills</div>
                        <div class="mt-1 text-lg font-semibold text-foreground">0</div>
                    </button>
                    <button type="button" class="rounded-xl border border-border bg-background px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/40" data-dashboard-filter="all">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Total Due</div>
                        <div class="mt-1 text-lg font-semibold text-foreground">$0.00</div>
                    </button>
                    <button type="button" class="rounded-xl border border-border bg-background px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/40" data-dashboard-filter="all">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Net Due</div>
                        <div class="mt-1 text-lg font-semibold text-foreground">$0.00</div>
                    </button>
                    <button type="button" class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100" data-dashboard-filter="credit">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Total Credit</div>
                        <div class="mt-1 text-lg font-semibold text-emerald-800">$0.00</div>
                    </button>
                    <button type="button" class="rounded-xl border border-border bg-background px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/40" data-dashboard-filter="unpaid">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Unpaid</div>
                        <div class="mt-1 text-lg font-semibold text-foreground">0</div>
                    </button>
                    <button type="button" class="rounded-xl border border-border bg-background px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/40" data-dashboard-filter="overdue">
                        <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Overdue</div>
                        <div class="mt-1 text-lg font-semibold text-foreground">0</div>
                    </button>
                </div>
            </div>
            ${debtWidgetHtml}
            ${healthCardHtml}
        `;
        // Wire CTA button to open settings
        document.getElementById('healthCardSettingsLink')?.addEventListener('click', () => {
            document.getElementById('settingsBtn')?.click();
        });
        return;
    }

    dashboard.className = "w-full pt-3 pb-1";
    dashboard.innerHTML = `
        ${todayOverviewHtml}
        ${paycheckCoverageHtml}
        ${forecast.recurringCount > 0 ? forecastCardHtml : ''}
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-7 sm:gap-3 mb-2">
            ${buildMetricCard({ label: 'Total Bills', icon: '📋', value: `${totalBills}`, filter: 'all', isActive: paymentFilter === 'all' })}
            ${buildMetricCard({ label: 'Total Due', icon: '💰', value: `$${totalAmountDue.toFixed(2)}`, filter: 'all', isActive: paymentFilter === 'all' })}
            ${buildMetricCard({ label: 'Net Due', icon: '🧮', value: `$${netDue.toFixed(2)}`, filter: 'all', isActive: paymentFilter === 'all' })}
            ${buildMetricCard({ label: 'Total Credit', icon: '💚', value: `$${totalCredit.toFixed(2)}`, tone: 'success', filter: 'credit', isActive: paymentFilter === 'credit' })}
            ${buildMetricCard({ label: 'Unpaid', icon: '⚠️', value: `${unpaidBills.length}`, filter: 'unpaid', isActive: paymentFilter === 'unpaid' })}
            ${buildMetricCard({ label: 'Unpaid Amt', icon: '💳', value: `$${totalUnpaidAmount.toFixed(2)}`, tone: 'danger', filter: 'unpaid', isActive: paymentFilter === 'unpaid' })}
            ${buildMetricCard({ label: 'Overdue', icon: '🔴', value: `${overdueBills.length}`, tone: 'danger', filter: 'overdue', isActive: paymentFilter === 'overdue', columns: 'col-span-2 sm:col-span-1' })}
        </div>
        ${debtWidgetHtml}
    `;
    // Wire CTA button to open settings
    document.getElementById('healthCardSettingsLink')?.addEventListener('click', () => {
        document.getElementById('settingsBtn')?.click();
    });
    wireDashboardFilterCards();
};
