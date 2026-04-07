import { createLocalDate } from '../utils/dates.js';
import { filterBillsByPeriod } from '../utils/billHelpers.js';
import { paycheckManager } from '../utils/paycheckManager.js';

const toCurrency = (value) => `$${(value || 0).toFixed(2)}`;

const getCoverageSummary = (totalDue, paycheckAmountRaw) => {
    const paycheckAmount = Number.parseFloat(paycheckAmountRaw);
    if (!Number.isFinite(paycheckAmount) || paycheckAmount <= 0) {
        return {
            hasAmount: false,
            label: 'Add paycheck amount in settings to see coverage',
            value: null,
            statusClass: 'unconfigured'
        };
    }

    const difference = paycheckAmount - totalDue;
    const isCovered = difference >= 0;

    return {
        hasAmount: true,
        label: isCovered ? 'Paycheck Coverage' : 'Paycheck Shortfall',
        value: toCurrency(Math.abs(difference)),
        statusClass: isCovered ? 'covered' : 'short'
    };
};

export const getUpcomingBills = (bills = [], selectedPaycheck, payCheckDates, showCarriedForward = true) => {
    // If no paycheck selected, show all unpaid bills for next paycheck period
    // Otherwise use period filtering to constrain to selected period
    if (selectedPaycheck === null || !payCheckDates || payCheckDates.length === 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        return bills
            .filter((bill) => {
                const dueDate = createLocalDate(bill.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return !bill.isPaid && dueDate >= today && dueDate <= sevenDaysOut;
            })
            .sort((a, b) => createLocalDate(a.dueDate).getTime() - createLocalDate(b.dueDate).getTime());
    }

    // Use period-aware filtering when pay period is selected
    // Show bills for all categories within the selected period
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentPaycheckDate = payCheckDates[selectedPaycheck] || today;
    const frequency = paycheckManager.paymentSettings?.frequency || 'bi-weekly';
    const days = frequency === 'weekly' ? 7 : frequency === 'bi-weekly' ? 14 : 30;

    const nextPaycheckDate = selectedPaycheck < payCheckDates.length - 1
        ? payCheckDates[selectedPaycheck + 1]
        : new Date(currentPaycheckDate.getTime() + (days * 24 * 60 * 60 * 1000));

    return bills
        .filter((bill) => {
            const billDate = createLocalDate(bill.dueDate);
            billDate.setHours(0, 0, 0, 0);
            const isInPeriod = !bill.isPaid && billDate >= currentPaycheckDate && billDate < nextPaycheckDate;
            const isOverdue = showCarriedForward && !bill.isPaid && billDate < currentPaycheckDate;

            return isInPeriod || isOverdue;
        })
        .sort((a, b) => createLocalDate(a.dueDate).getTime() - createLocalDate(b.dueDate).getTime());
};

export function initializeUpcomingBillsView() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    if (!document.getElementById('upcomingBillsView')) {
        const upcomingDiv = document.createElement('div');
        upcomingDiv.id = 'upcomingBillsView';
        upcomingDiv.className = 'upcoming-bills-container';
        upcomingDiv.style.display = 'none';
        main.appendChild(upcomingDiv);
    }
}

export function renderUpcomingBills({ bills, selectedPaycheck, payCheckDates, showCarriedForward }, actions) {
    const upcomingContainer = document.getElementById('upcomingBillsView');
    if (!upcomingContainer) return;

    const buttonBase = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
    const neutralButton = `${buttonBase} border border-input bg-background px-3 py-2 text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground`;
    const primaryButton = `${buttonBase} bg-primary px-3 py-2 text-primary-foreground shadow hover:opacity-90`;
    const inputBase = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

    const upcomingBills = getUpcomingBills(bills, selectedPaycheck, payCheckDates, showCarriedForward ?? true);
    const totalDue = upcomingBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const paycheckAmountRaw = actions?.paycheckAmount;
    const coverage = getCoverageSummary(totalDue, paycheckAmountRaw);

    if (upcomingBills.length === 0) {
        upcomingContainer.innerHTML = `
            <section class="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6" aria-label="Upcoming bills">
                <div class="rounded-2xl border bg-card p-6 shadow-sm">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div class="space-y-1">
                            <h2 class="text-2xl font-semibold tracking-tight text-card-foreground">📅 Upcoming Bills</h2>
                            <p class="text-sm text-muted-foreground">All upcoming unpaid bills in one place.</p>
                        </div>
                    </div>
                </div>
                <div class="rounded-2xl border border-dashed bg-card/70 px-6 py-12 text-center shadow-sm" role="status" aria-live="polite">
                    <p class="text-base font-medium text-card-foreground">No upcoming unpaid bills. You’re all caught up.</p>
                    <p class="mt-2 text-sm text-muted-foreground">When new unpaid bills fall due in the future, they’ll show up here.</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="rounded-xl border bg-card p-4 shadow-sm" role="note" aria-label="Total upcoming amount due">
                        <div class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Total Upcoming Due</div>
                        <strong class="mt-2 block text-2xl font-semibold text-card-foreground">${toCurrency(0)}</strong>
                    </div>
                    <div class="rounded-xl border bg-card p-4 shadow-sm" role="note" aria-label="Paycheck coverage">
                        <div class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">${coverage.label}</div>
                        <strong class="mt-2 block text-2xl font-semibold ${coverage.statusClass === 'short' ? 'text-destructive' : 'text-card-foreground'}">${coverage.hasAmount ? coverage.value : '—'}</strong>
                    </div>
                </div>
            </section>
        `;
        return;
    }

    const listMarkup = upcomingBills.map((bill) => `
        <article class="rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md" data-bill-id="${bill.id}">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                        <h3 class="truncate text-base font-semibold text-card-foreground">${bill.name}</h3>
                        <span class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">${bill.category}</span>
                    </div>
                </div>
                <div class="text-left sm:text-right">
                    <div class="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Amount Due</div>
                    <div class="mt-0.5 text-lg font-semibold text-card-foreground">${toCurrency(bill.amountDue)}</div>
                </div>
            </div>
            <div class="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-[minmax(0,180px)_repeat(3,max-content)] sm:items-end">
                <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground" for="dueDate-${bill.id}">Due date</label>
                    <input id="dueDate-${bill.id}" class="upcoming-date-input ${inputBase}" type="date" value="${bill.dueDate}" aria-label="Due date for ${bill.name}">
                </div>
                <button class="upcoming-update-btn ${neutralButton}" data-action="update-date">Update</button>
                <button class="upcoming-edit-btn ${neutralButton}" data-action="edit-bill">Edit</button>
                <button class="upcoming-paid-btn ${primaryButton}" data-action="mark-paid">Mark Paid</button>
            </div>
        </article>
    `).join('');

    upcomingContainer.innerHTML = `
        <section class="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6" aria-label="Upcoming bills">
            <div class="rounded-2xl border bg-card p-6 shadow-sm">
                <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div class="space-y-1">
                        <h2 class="text-2xl font-semibold tracking-tight text-card-foreground">📅 Upcoming Bills</h2>
                        <p class="text-sm text-muted-foreground">See what’s coming up, update dates, and mark bills paid.</p>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2 md:min-w-[320px]">
                        <div class="rounded-xl border bg-background/60 p-4">
                            <div class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Total Upcoming Due</div>
                            <strong class="mt-2 block text-2xl font-semibold text-card-foreground">${toCurrency(totalDue)}</strong>
                        </div>
                        <div class="rounded-xl border bg-background/60 p-4">
                            <div class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">${coverage.label}</div>
                            <strong class="mt-2 block text-2xl font-semibold ${coverage.statusClass === 'short' ? 'text-destructive' : 'text-card-foreground'}">${coverage.hasAmount ? coverage.value : '—'}</strong>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex flex-col gap-4" role="list">
                ${listMarkup}
            </div>
            <div class="rounded-2xl border bg-card p-4 shadow-sm" role="note" aria-label="Upcoming bills summary">
                <div class="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>Review upcoming unpaid bills, keep due dates current, and mark them paid from this view.</span>
                    <span class="font-medium text-card-foreground">${upcomingBills.length} bill${upcomingBills.length === 1 ? '' : 's'} upcoming</span>
                </div>
            </div>
        </section>
    `;

    upcomingContainer.querySelectorAll('.upcoming-bill-card').forEach((card) => {
        const billId = card.getAttribute('data-bill-id');
        const dueDateInput = /** @type {HTMLInputElement|null} */ (card.querySelector('.upcoming-date-input'));
        const updateDateBtn = card.querySelector('[data-action="update-date"]');
        const editBtn = card.querySelector('[data-action="edit-bill"]');
        const paidBtn = card.querySelector('[data-action="mark-paid"]');

        updateDateBtn?.addEventListener('click', () => {
            if (!billId || !dueDateInput?.value) return;
            actions.onUpdateDueDate?.(billId, dueDateInput.value);
        });

        editBtn?.addEventListener('click', () => {
            if (!billId) return;
            actions.onEditBill?.(billId);
        });

        paidBtn?.addEventListener('click', () => {
            if (!billId) return;
            actions.onTogglePayment?.(billId, true);
        });
    });
}
