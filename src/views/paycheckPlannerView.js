import { createLocalDate, formatLocalDate } from '../utils/dates.js';
import { paycheckManager } from '../utils/paycheckManager.js';

const toCurrency = (value) => `$${(value || 0).toFixed(2)}`;

const getPeriodLengthDays = (frequency) => {
    if (frequency === 'weekly') return 7;
    if (frequency === 'bi-weekly') return 14;
    if (frequency === 'custom') {
        const customDays = Number.parseInt(paycheckManager.paymentSettings?.customDays, 10);
        if (Number.isInteger(customDays) && customDays >= 1 && customDays <= 365) {
            return customDays;
        }
    }
    return 30;
};

const getPeriodEndDate = (payCheckDates, index, frequency) => {
    if (index < payCheckDates.length - 1) {
        return new Date(payCheckDates[index + 1]);
    }

    const fallback = new Date(payCheckDates[index]);
    fallback.setDate(fallback.getDate() + getPeriodLengthDays(frequency));
    return fallback;
};

const parseBillDueDate = (rawDate) => {
    if (typeof rawDate !== 'string' || rawDate.trim() === '') {
        return null;
    }

    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return createLocalDate(trimmed);
    }

    // Backward-compatibility for legacy/imported timestamps like 2026-03-30T00:00:00.000Z
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const getBillAmountForPlanning = (bill) => {
    const amountDue = Number.parseFloat(bill.amountDue);
    if (Number.isFinite(amountDue) && amountDue >= 0) {
        return amountDue;
    }

    const balance = Number.parseFloat(bill.balance);
    if (Number.isFinite(balance) && balance >= 0) {
        return balance;
    }

    return 0;
};

const getBillPlanningKey = (bill) => {
    if (bill.id) {
        return String(bill.id);
    }

    return [
        bill.name || '',
        bill.category || '',
        bill.dueDate || '',
        getBillAmountForPlanning(bill)
    ].join('|');
};

const sanitizeAdjustmentMap = (adjustmentsByDate = {}) => {
    const sanitized = {};

    Object.entries(adjustmentsByDate).forEach(([payDateKey, adjustments]) => {
        if (!Array.isArray(adjustments)) return;

        const valid = adjustments.filter((entry) => {
            return entry && typeof entry.id === 'string' && Number.isFinite(entry.amount);
        });

        if (valid.length > 0) {
            sanitized[payDateKey] = valid;
        }
    });

    return sanitized;
};

const toPercent = (value, total) => {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, (value / total) * 100);
};

export function buildPlannerRows({ bills, payCheckDates, frequency, paycheckAmount, adjustmentsByDate = {} }) {
    const normalizedAdjustments = sanitizeAdjustmentMap(adjustmentsByDate);
    let rollingCarry = 0;
    const consumedBillIds = new Set();

    return payCheckDates.map((payDate, index) => {
        const startDate = new Date(payDate);
        const endDate = getPeriodEndDate(payCheckDates, index, frequency);
        const payDateKey = formatLocalDate(startDate);

        const periodBills = bills.filter((bill) => {
            const billKey = getBillPlanningKey(bill);
            if (bill.isPaid || consumedBillIds.has(billKey)) {
                return false;
            }

            const dueDate = parseBillDueDate(bill.dueDate);
            if (!dueDate) {
                return false;
            }

            const isInPeriod = dueDate >= startDate && dueDate < endDate;
            const isOverdueForFirstPeriod = index === 0 && dueDate < startDate;
            return isInPeriod || isOverdueForFirstPeriod;
        });

        periodBills.forEach((bill) => consumedBillIds.add(getBillPlanningKey(bill)));

        const totalDue = periodBills.reduce((sum, bill) => sum + getBillAmountForPlanning(bill), 0);
        const adjustments = normalizedAdjustments[payDateKey] || [];
        const adjustmentTotal = adjustments.reduce((sum, entry) => sum + entry.amount, 0);
        const carryIn = Number.isFinite(paycheckAmount) ? rollingCarry : null;
        const available = Number.isFinite(paycheckAmount)
            ? paycheckAmount + adjustmentTotal + rollingCarry
            : null;
        const remaining = available === null ? null : available - totalDue;
        if (remaining !== null) {
            rollingCarry = remaining;
        }

        const shortfallBills = remaining !== null && remaining < 0
            ? [...periodBills]
                .sort((a, b) => (b.amountDue || 0) - (a.amountDue || 0))
                .slice(0, 5)
                .map((bill) => ({
                    id: bill.id,
                    name: bill.name,
                    amountDue: getBillAmountForPlanning(bill),
                    category: bill.category
                }))
            : [];

        return {
            index,
            payDateKey,
            payDateLabel: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            rangeLabel: `${formatLocalDate(startDate)} to ${formatLocalDate(new Date(endDate.getTime() - 1))}`,
            billCount: periodBills.length,
            totalDue,
            adjustmentTotal,
            adjustments,
            carryIn,
            available,
            remaining,
            shortfallBills
        };
    });
}

export function initializePaycheckPlannerView() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    if (!document.getElementById('paycheckPlannerView')) {
        const plannerDiv = document.createElement('div');
        plannerDiv.id = 'paycheckPlannerView';
        plannerDiv.className = 'w-full';
        plannerDiv.style.display = 'none';
        main.appendChild(plannerDiv);
    }
}

export function renderPaycheckPlanner({ bills, payCheckDates, paymentSettings, adjustmentsByDate }, actions) {
    const container = document.getElementById('paycheckPlannerView');
    if (!container) return;

    const paycheckAmount = Number.parseFloat(paymentSettings?.amount);
    const normalizedAmount = Number.isFinite(paycheckAmount) ? paycheckAmount : null;
    const rows = buildPlannerRows({
        bills,
        payCheckDates,
        frequency: paymentSettings?.frequency || 'bi-weekly',
        paycheckAmount: normalizedAmount,
        adjustmentsByDate
    });

    const rowMarkup = rows.map((row) => {
        const remainingClass = row.remaining === null
            ? 'text-muted-foreground'
            : row.remaining >= 0
                ? 'text-emerald-600'
                : 'text-destructive';

        const adjustmentItems = row.adjustments.length > 0
            ? row.adjustments.map((adjustment) => `
                <li class="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                    <div>
                        <span class="font-medium ${adjustment.amount >= 0 ? 'text-emerald-600' : 'text-destructive'}">${adjustment.amount >= 0 ? '+' : '-'}${toCurrency(Math.abs(adjustment.amount))}</span>
                        <span class="ml-2 text-muted-foreground">${adjustment.note || 'Adjustment'}</span>
                    </div>
                    <button type="button" class="planner-remove-adjustment text-xs text-muted-foreground hover:text-destructive" data-pay-date="${row.payDateKey}" data-adjustment-id="${adjustment.id}">Remove</button>
                </li>
            `).join('')
            : '<li class="text-sm text-muted-foreground">No manual adjustments yet.</li>';

        const chartBase = row.available === null
            ? null
            : Math.max(Math.abs(row.available), row.totalDue, 1);
        const duePercent = chartBase === null ? 0 : Math.min(toPercent(row.totalDue, chartBase), 100);
        const remainingPositive = row.remaining === null ? 0 : Math.max(row.remaining, 0);
        const remainingPercent = chartBase === null ? 0 : Math.min(toPercent(remainingPositive, chartBase), 100);
        const shortfallAmount = row.remaining === null ? 0 : Math.max(row.totalDue - row.available, 0);
        const shortfallPercent = chartBase === null ? 0 : Math.min(toPercent(shortfallAmount, chartBase), 100);

        const chartMarkup = row.available === null
            ? `
                <div class="rounded-lg border border-dashed bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                    Add a paycheck amount to visualize coverage and remaining funds.
                </div>
            `
            : `
                <div class="space-y-2 rounded-lg border bg-background/60 p-3">
                    <div class="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                        <span>Paycheck Flow</span>
                        <span>Base ${toCurrency(chartBase)}</span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-muted">
                        <div class="h-full bg-blue-500" style="width: ${duePercent.toFixed(2)}%"></div>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-muted">
                        <div class="h-full ${row.remaining !== null && row.remaining >= 0 ? 'bg-emerald-500' : 'bg-destructive'}" style="width: ${(row.remaining !== null && row.remaining >= 0 ? remainingPercent : shortfallPercent).toFixed(2)}%"></div>
                    </div>
                    <div class="grid gap-1 text-xs sm:grid-cols-3">
                        <div class="rounded border bg-background px-2 py-1">
                            <div class="text-muted-foreground">Available</div>
                            <div class="font-semibold">${toCurrency(row.available)}</div>
                        </div>
                        <div class="rounded border bg-background px-2 py-1">
                            <div class="text-muted-foreground">Bills</div>
                            <div class="font-semibold text-blue-600">${toCurrency(row.totalDue)}</div>
                        </div>
                        <div class="rounded border bg-background px-2 py-1">
                            <div class="text-muted-foreground">${row.remaining !== null && row.remaining >= 0 ? 'Left' : 'Shortfall'}</div>
                            <div class="font-semibold ${row.remaining !== null && row.remaining >= 0 ? 'text-emerald-600' : 'text-destructive'}">${toCurrency(row.remaining !== null && row.remaining >= 0 ? row.remaining : shortfallAmount)}</div>
                        </div>
                    </div>
                </div>
            `;

        return `
            <section class="rounded-2xl border bg-card p-4 shadow-sm" data-pay-date-section="${row.payDateKey}">
                <div class="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h3 class="text-lg font-semibold text-card-foreground">Paycheck: ${row.payDateLabel}</h3>
                        <p class="text-xs text-muted-foreground">Covers ${row.rangeLabel}</p>
                        ${row.carryIn !== null ? `<p class="mt-1 text-xs ${row.carryIn >= 0 ? 'text-emerald-600' : 'text-destructive'}">Carry-in from previous paycheck: ${toCurrency(row.carryIn)}</p>` : ''}
                    </div>
                    <div class="grid gap-2 sm:grid-cols-3">
                        <div class="rounded-lg border bg-background/70 px-3 py-2">
                            <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Bills Due</div>
                            <div class="text-lg font-semibold">${toCurrency(row.totalDue)}</div>
                            <div class="text-xs text-muted-foreground">${row.billCount} unpaid bill${row.billCount === 1 ? '' : 's'}</div>
                        </div>
                        <div class="rounded-lg border bg-background/70 px-3 py-2">
                            <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Adjustments</div>
                            <div class="text-lg font-semibold ${row.adjustmentTotal >= 0 ? 'text-emerald-600' : 'text-destructive'}">${row.adjustmentTotal >= 0 ? '+' : '-'}${toCurrency(Math.abs(row.adjustmentTotal))}</div>
                            <div class="text-xs text-muted-foreground">Manual additions/removals</div>
                        </div>
                        <div class="rounded-lg border bg-background/70 px-3 py-2">
                            <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Remaining</div>
                            <div class="text-lg font-semibold ${remainingClass}">${row.remaining === null ? 'Set paycheck amount' : toCurrency(row.remaining)}</div>
                            <div class="text-xs text-muted-foreground">After bills + adjustments</div>
                        </div>
                    </div>
                </div>

                <div class="mt-4 grid gap-4 lg:grid-cols-2">
                    <div class="space-y-3">
                        ${chartMarkup}
                        ${row.shortfallBills.length > 0 ? `
                            <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                                <h4 class="text-sm font-semibold text-destructive">Why Shortfall?</h4>
                                <p class="mt-1 text-xs text-muted-foreground">Largest bills driving this paycheck shortfall:</p>
                                <ul class="mt-2 space-y-1 text-sm">
                                    ${row.shortfallBills.map((bill) => `
                                        <li class="flex items-center justify-between rounded border border-destructive/20 bg-background px-2 py-1">
                                            <span class="truncate pr-2">${bill.name} <span class="text-xs text-muted-foreground">(${bill.category || 'Uncategorized'})</span></span>
                                            <span class="font-medium text-destructive">${toCurrency(bill.amountDue)}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        <h4 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Adjustments</h4>
                        <ul class="space-y-2">${adjustmentItems}</ul>
                    </div>

                    <form class="planner-adjustment-form space-y-3 rounded-xl border bg-background/60 p-4" data-pay-date="${row.payDateKey}">
                        <h4 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add or Remove Money</h4>
                        <div class="grid gap-3 sm:grid-cols-2">
                            <label class="space-y-1 text-sm">
                                <span class="text-xs text-muted-foreground">Amount</span>
                                <input type="number" step="0.01" min="0.01" required class="planner-adjustment-amount flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="250.00">
                            </label>
                            <label class="space-y-1 text-sm">
                                <span class="text-xs text-muted-foreground">Note (optional)</span>
                                <input type="text" maxlength="80" class="planner-adjustment-note flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Bonus, side income, fee...">
                            </label>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="planner-add-money inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700" data-pay-date="${row.payDateKey}">+ Add Extra</button>
                            <button type="button" class="planner-remove-money inline-flex items-center justify-center rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90" data-pay-date="${row.payDateKey}">- Remove Money</button>
                        </div>
                    </form>
                </div>
            </section>
        `;
    }).join('');

    container.innerHTML = `
        <section class="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6" aria-label="Paycheck planner">
            <div class="rounded-2xl border bg-card p-6 shadow-sm">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 class="text-2xl font-semibold tracking-tight text-card-foreground">Paycheck Planner</h2>
                        <p class="text-sm text-muted-foreground">Track what remains per paycheck, then manually add or remove money as plans change.</p>
                    </div>
                    <form id="plannerPaycheckAmountForm" class="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <label class="space-y-1 text-sm">
                            <span class="text-xs uppercase tracking-wide text-muted-foreground">Paycheck Amount</span>
                            <input id="plannerPaycheckAmountInput" type="number" min="0" step="0.01" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:min-w-[180px]" value="${normalizedAmount === null ? '' : normalizedAmount.toFixed(2)}" placeholder="e.g. 2500.00">
                        </label>
                        <button type="submit" class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">Save Amount</button>
                    </form>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                    <button id="plannerExportJsonBtn" type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Export Adjustments JSON</button>
                    <button id="plannerExportCsvBtn" type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Export Adjustments CSV</button>
                </div>
            </div>

            ${rowMarkup}
        </section>
    `;

    const saveAmountForm = document.getElementById('plannerPaycheckAmountForm');
    const saveAmountInput = /** @type {HTMLInputElement|null} */ (document.getElementById('plannerPaycheckAmountInput'));
    const exportJsonBtn = document.getElementById('plannerExportJsonBtn');
    const exportCsvBtn = document.getElementById('plannerExportCsvBtn');

    exportJsonBtn?.addEventListener('click', () => actions.onExportAdjustments?.('json'));
    exportCsvBtn?.addEventListener('click', () => actions.onExportAdjustments?.('csv'));

    saveAmountForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!saveAmountInput) return;

        const raw = saveAmountInput.value.trim();
        if (raw === '') {
            actions.onSavePaycheckAmount?.(null);
            return;
        }

        const amount = Number.parseFloat(raw);
        if (!Number.isFinite(amount) || amount < 0) {
            actions.onInvalidAmount?.('Please enter a valid paycheck amount (0 or greater).');
            return;
        }

        actions.onSavePaycheckAmount?.(amount);
    });

    container.querySelectorAll('.planner-add-money, .planner-remove-money').forEach((button) => {
        button.addEventListener('click', (event) => {
            const target = /** @type {HTMLElement} */ (event.currentTarget);
            const payDate = target.dataset.payDate;
            if (!payDate) return;

            const section = container.querySelector(`[data-pay-date-section="${payDate}"]`);
            if (!section) return;

            const amountInput = /** @type {HTMLInputElement|null} */ (section.querySelector('.planner-adjustment-amount'));
            const noteInput = /** @type {HTMLInputElement|null} */ (section.querySelector('.planner-adjustment-note'));
            const parsedAmount = Number.parseFloat(amountInput?.value || '');

            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                actions.onInvalidAmount?.('Enter an adjustment amount greater than 0.');
                return;
            }

            const note = noteInput?.value?.trim() || '';
            const isRemove = target.classList.contains('planner-remove-money');
            actions.onAddAdjustment?.(payDate, isRemove ? -parsedAmount : parsedAmount, note);
        });
    });

    container.querySelectorAll('.planner-remove-adjustment').forEach((button) => {
        button.addEventListener('click', (event) => {
            const target = /** @type {HTMLElement} */ (event.currentTarget);
            const payDate = target.dataset.payDate;
            const adjustmentId = target.dataset.adjustmentId;
            if (!payDate || !adjustmentId) return;
            actions.onRemoveAdjustment?.(payDate, adjustmentId);
        });
    });
}
