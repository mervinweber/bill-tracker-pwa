import { buildDebtPayoffPlan, compareDebtStrategies } from '../utils/debtPayoffEngine.js';
import { getDebtImportCandidates } from '../utils/debtAdapter.js';
import { bindCashFlowPanel, getCashFlowPanelMarkup } from './cashFlowPanel.js';

const currency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
}).format(value || 0);

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const payoffLabel = (item) => item.payoffDate
    ? new Date(`${item.payoffDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Needs more payment';

const inputClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
const buttonClass = 'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function initializeDebtSnowballView() {
    const main = document.getElementById('mainContent');
    if (!main || document.getElementById('debtSnowballView')) return;
    const debtDiv = document.createElement('div');
    debtDiv.id = 'debtSnowballView';
    debtDiv.className = 'w-full';
    debtDiv.style.display = 'none';
    main.appendChild(debtDiv);
}

export function renderDebtSnowballView({ bills = [], debts, financialPlan, paymentSettings = null }, actions) {
    const container = document.getElementById('debtSnowballView');
    if (!container) return;

    const settings = financialPlan.settings;
    const extraPayment = Number.parseFloat(settings?.extraPayment) || 0;
    const strategy = settings?.strategy === 'avalanche' ? 'avalanche' : 'snowball';
    const activeView = settings?.activeView === 'cashflow' ? 'cashflow' : 'debt';
    const plan = buildDebtPayoffPlan(debts, extraPayment, strategy);
    const comparison = compareDebtStrategies(debts, extraPayment);
    const selected = strategy === 'avalanche' ? comparison.avalanche : comparison.snowball;
    const importCandidates = getDebtImportCandidates(bills, debts);
    const importRows = importCandidates.map((bill) => {
        const balance = Number.parseFloat(bill.debtTotal) || Number.parseFloat(bill.balance) || Number.parseFloat(bill.amountDue) || 0;
        const minimumPayment = Number.parseFloat(bill.amountDue) || 0;
        const apr = Number.parseFloat(bill.interestRate) || 0;
        const searchText = `${bill.name || ''} ${bill.category || ''}`.toLowerCase();
        return `
            <label class="bill-import-row flex cursor-pointer items-start gap-3 border-b px-2 py-2.5 last:border-b-0 hover:bg-muted/40" data-search="${escapeHtml(searchText)}">
                <input type="checkbox" name="billImport" value="${escapeHtml(bill.id)}" class="mt-0.5 h-4 w-4 shrink-0 rounded border-input">
                <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium text-foreground">${escapeHtml(bill.name || 'Untitled bill')}</span>
                    <span class="block text-xs text-muted-foreground">Balance ${currency(balance)} · Minimum ${currency(minimumPayment)} · APR ${apr.toFixed(2)}%</span>
                </span>
            </label>
        `;
    }).join('');

    const debtRows = plan.items.map((item, index) => `
        <article class="border-b px-3 py-3 last:border-b-0 sm:px-4" data-debt-row="${escapeHtml(item.id)}">
            <div class="grid gap-2 sm:grid-cols-[minmax(150px,1.6fr)_repeat(4,minmax(88px,1fr))_auto] sm:items-center">
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[11px] font-semibold">${index + 1}</span>
                        <h3 class="truncate text-sm font-semibold text-card-foreground">${escapeHtml(item.name)}</h3>
                    </div>
                    <p class="ml-7 mt-0.5 text-xs text-muted-foreground">${item.source === 'bill' ? 'Linked to bill' : 'Planning debt'}${item.isPriorityTarget ? ' · Focus first' : ''}</p>
                </div>
                <div><span class="text-xs text-muted-foreground sm:hidden">Balance </span><span class="text-sm font-medium">${currency(item.balance)}</span></div>
                <div><span class="text-xs text-muted-foreground sm:hidden">APR </span><span class="text-sm">${item.apr.toFixed(2)}%</span></div>
                <div><span class="text-xs text-muted-foreground sm:hidden">Minimum </span><span class="text-sm">${currency(item.minimumPayment)}</span></div>
                <div><span class="text-xs text-muted-foreground sm:hidden">Payoff </span><span class="text-sm">${payoffLabel(item)}</span></div>
                <button type="button" class="debt-edit-btn ${buttonClass} border border-input bg-background hover:bg-accent" data-debt-id="${escapeHtml(item.id)}" data-linked-bill-id="${escapeHtml(item.linkedBillId || '')}">${item.source === 'bill' ? 'Edit bill' : 'Edit'}</button>
            </div>
        </article>
    `).join('');

    container.innerHTML = `
        <section class="mx-auto w-full max-w-6xl space-y-4 p-3 sm:p-5" aria-label="Debt payoff planner">
            <div class="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 class="text-lg font-semibold text-foreground">Financial plan</h2>
                    <p class="mt-1 text-sm text-muted-foreground">Payoff strategy and forward cash flow in one place.</p>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex rounded-md border bg-muted/40 p-1" role="tablist" aria-label="Financial plan view">
                        <button id="debtPlanTab" type="button" role="tab" aria-selected="${activeView === 'debt'}" class="${buttonClass} h-8 ${activeView === 'debt' ? 'bg-background shadow-sm' : 'text-muted-foreground'}">Debt plan</button>
                        <button id="cashFlowTab" type="button" role="tab" aria-selected="${activeView === 'cashflow'}" class="${buttonClass} h-8 ${activeView === 'cashflow' ? 'bg-background shadow-sm' : 'text-muted-foreground'}">Cash flow</button>
                    </div>
                    <button id="addPlanningDebtBtn" type="button" class="${buttonClass} ${activeView === 'debt' ? '' : 'hidden'} bg-primary text-primary-foreground hover:bg-primary/90">Add debt</button>
                </div>
            </div>

            <div id="debtPlanningPanel" class="${activeView === 'debt' ? 'space-y-4' : 'hidden'}" role="tabpanel" aria-labelledby="debtPlanTab">
            <form id="debtSettingsForm" class="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto] sm:items-end">
                <label class="grid gap-1 text-xs text-muted-foreground">Strategy
                    <select id="debtStrategy" class="${inputClass}">
                        <option value="snowball" ${strategy === 'snowball' ? 'selected' : ''}>Snowball · smallest balance</option>
                        <option value="avalanche" ${strategy === 'avalanche' ? 'selected' : ''}>Avalanche · highest APR</option>
                    </select>
                </label>
                <label class="grid gap-1 text-xs text-muted-foreground">Extra each month
                    <input id="debtExtraPayment" type="number" min="0" step="0.01" value="${extraPayment.toFixed(2)}" class="${inputClass}">
                </label>
                <button type="submit" class="${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90">Update plan</button>
            </form>

            <div class="rounded-md border bg-card p-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 class="text-sm font-medium text-foreground">Import existing bills</h3>
                        <p class="text-xs text-muted-foreground">Select bills to add to this debt plan.</p>
                    </div>
                    <button id="openBillDebtImportBtn" type="button" class="${buttonClass} border border-input bg-background hover:bg-accent" ${importCandidates.length ? '' : 'disabled'}>
                        ${importCandidates.length ? `Choose bills (${importCandidates.length})` : 'No bills available'}
                    </button>
                </div>
                <form id="billDebtImportForm" class="mt-3 hidden border-t pt-3">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input id="billDebtImportSearch" type="search" class="${inputClass} sm:max-w-xs" placeholder="Search bills" aria-label="Search bills">
                        <label class="inline-flex h-9 items-center gap-2 text-sm text-muted-foreground">
                            <input id="selectAllBillDebts" type="checkbox" class="h-4 w-4 rounded border-input"> Select all shown
                        </label>
                    </div>
                    <div id="billDebtImportList" class="mt-2 max-h-64 overflow-y-auto rounded-md border">${importRows}</div>
                    <p id="billDebtImportEmpty" class="mt-3 hidden text-center text-sm text-muted-foreground">No matching bills.</p>
                    <div class="mt-3 flex flex-wrap justify-end gap-2">
                        <button id="cancelBillDebtImportBtn" type="button" class="${buttonClass} border border-input bg-background hover:bg-accent">Cancel</button>
                        <button type="submit" class="${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90">Import selected</button>
                    </div>
                </form>
            </div>

            <form id="planningDebtForm" class="hidden rounded-md border bg-card p-3" aria-label="Add or edit debt">
                <input id="planningDebtId" type="hidden">
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <label class="grid gap-1 text-xs text-muted-foreground lg:col-span-2">Debt name
                        <input id="planningDebtName" required maxlength="80" class="${inputClass}" placeholder="Credit card or loan">
                    </label>
                    <label class="grid gap-1 text-xs text-muted-foreground">Balance
                        <input id="planningDebtBalance" required type="number" min="0" step="0.01" class="${inputClass}" inputmode="decimal">
                    </label>
                    <label class="grid gap-1 text-xs text-muted-foreground">APR
                        <input id="planningDebtApr" required type="number" min="0" step="0.01" class="${inputClass}" inputmode="decimal">
                    </label>
                    <label class="grid gap-1 text-xs text-muted-foreground">Minimum
                        <input id="planningDebtMinimum" required type="number" min="0" step="0.01" class="${inputClass}" inputmode="decimal">
                    </label>
                    <label class="grid gap-1 text-xs text-muted-foreground">Due day
                        <input id="planningDebtDueDay" required type="number" min="1" max="31" step="1" value="1" class="${inputClass}" inputmode="numeric">
                    </label>
                </div>
                <div class="mt-3 flex flex-wrap justify-end gap-2">
                    <button id="deletePlanningDebtBtn" type="button" class="${buttonClass} hidden text-destructive hover:bg-destructive/10">Delete</button>
                    <button id="cancelPlanningDebtBtn" type="button" class="${buttonClass} border border-input bg-background hover:bg-accent">Cancel</button>
                    <button type="submit" class="${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90">Save debt</button>
                </div>
            </form>

            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div class="border-l-2 border-primary px-3 py-1"><p class="text-xs text-muted-foreground">Total debt</p><p class="text-base font-semibold">${currency(plan.totalDebt)}</p></div>
                <div class="border-l-2 border-emerald-600 px-3 py-1"><p class="text-xs text-muted-foreground">Monthly plan</p><p class="text-base font-semibold">${currency(plan.monthlyBudget)}</p></div>
                <div class="border-l-2 border-amber-500 px-3 py-1"><p class="text-xs text-muted-foreground">Interest</p><p class="text-base font-semibold">${currency(plan.totalInterest)}</p></div>
                <div class="border-l-2 border-sky-600 px-3 py-1"><p class="text-xs text-muted-foreground">Debt free</p><p class="text-base font-semibold">${plan.debtFreeDate ? payoffLabel({ payoffDate: plan.debtFreeDate }) : 'Not projected'}</p></div>
            </div>

            <p class="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                ${comparison.interestSavingsWithAvalanche > 0
                    ? `Avalanche saves about ${currency(comparison.interestSavingsWithAvalanche)} in projected interest. Current ${strategy} plan projects ${selected.payoffMonths ?? 'no'} months.`
                    : `Both strategies are currently close in cost. This plan projects ${selected.payoffMonths ?? 'no'} months to payoff.`}
            </p>

            <div class="overflow-hidden rounded-md border bg-card">
                <div class="hidden border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(150px,1.6fr)_repeat(4,minmax(88px,1fr))_auto] sm:gap-2">
                    <span>Debt</span><span>Balance</span><span>APR</span><span>Minimum</span><span>Payoff</span><span class="sr-only">Actions</span>
                </div>
                ${debtRows || '<p class="px-4 py-8 text-center text-sm text-muted-foreground">No debts yet. Add one here or add debt details to an existing bill.</p>'}
            </div>
            </div>

            <div id="cashFlowPanel" class="${activeView === 'cashflow' ? '' : 'hidden'}" role="tabpanel" aria-labelledby="cashFlowTab">
                ${getCashFlowPanelMarkup({ bills, debts, financialPlan, paymentSettings })}
            </div>
        </section>
    `;

    const form = /** @type {HTMLFormElement|null} */ (container.querySelector('#planningDebtForm'));
    container.querySelector('#debtPlanTab')?.addEventListener('click', () => actions.onSaveSettings?.({ activeView: 'debt' }));
    container.querySelector('#cashFlowTab')?.addEventListener('click', () => actions.onSaveSettings?.({ activeView: 'cashflow' }));
    const showForm = (debt = null) => {
        if (!form) return;
        form.classList.remove('hidden');
        const setValue = (selector, value) => {
            const field = /** @type {HTMLInputElement|null} */ (form.querySelector(selector));
            if (field) field.value = value ?? '';
        };
        setValue('#planningDebtId', debt?.id || '');
        setValue('#planningDebtName', debt?.name || '');
        setValue('#planningDebtBalance', debt?.balance ?? '');
        setValue('#planningDebtApr', debt?.apr ?? '');
        setValue('#planningDebtMinimum', debt?.minimumPayment ?? '');
        setValue('#planningDebtDueDay', debt?.dueDay || 1);
        container.querySelector('#deletePlanningDebtBtn')?.classList.toggle('hidden', !debt?.id);
        /** @type {HTMLInputElement|null} */ (form.querySelector('#planningDebtName'))?.focus();
    };

    container.querySelector('#addPlanningDebtBtn')?.addEventListener('click', () => showForm());
    container.querySelector('#cancelPlanningDebtBtn')?.addEventListener('click', () => form?.classList.add('hidden'));
    const importForm = /** @type {HTMLFormElement|null} */ (container.querySelector('#billDebtImportForm'));
    container.querySelector('#openBillDebtImportBtn')?.addEventListener('click', () => {
        importForm?.classList.toggle('hidden');
        if (!importForm?.classList.contains('hidden')) {
            /** @type {HTMLInputElement|null} */ (container.querySelector('#billDebtImportSearch'))?.focus();
        }
    });
    container.querySelector('#cancelBillDebtImportBtn')?.addEventListener('click', () => importForm?.classList.add('hidden'));
    container.querySelector('#billDebtImportSearch')?.addEventListener('input', (event) => {
        const query = /** @type {HTMLInputElement} */ (event.currentTarget).value.trim().toLowerCase();
        let visibleCount = 0;
        container.querySelectorAll('.bill-import-row').forEach((row) => {
            const isVisible = !query || row.getAttribute('data-search')?.includes(query);
            row.classList.toggle('hidden', !isVisible);
            if (isVisible) visibleCount += 1;
        });
        container.querySelector('#billDebtImportEmpty')?.classList.toggle('hidden', visibleCount > 0);
    });
    container.querySelector('#selectAllBillDebts')?.addEventListener('change', (event) => {
        const checked = /** @type {HTMLInputElement} */ (event.currentTarget).checked;
        container.querySelectorAll('.bill-import-row:not(.hidden) input[name="billImport"]').forEach((checkbox) => {
            /** @type {HTMLInputElement} */ (checkbox).checked = checked;
        });
    });
    importForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const selectedIds = [...importForm.querySelectorAll('input[name="billImport"]:checked')]
            .map((checkbox) => /** @type {HTMLInputElement} */ (checkbox).value);
        actions.onImportBills?.(selectedIds);
    });
    container.querySelector('#debtSettingsForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const amount = Number.parseFloat(/** @type {HTMLInputElement} */ (container.querySelector('#debtExtraPayment')).value) || 0;
        const selectedStrategy = /** @type {HTMLSelectElement} */ (container.querySelector('#debtStrategy')).value;
        actions.onSaveSettings?.({ extraPayment: amount, strategy: selectedStrategy });
    });

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = (selector) => /** @type {HTMLInputElement} */ (form.querySelector(selector)).value;
        actions.onSaveDebt?.({
            id: value('#planningDebtId') || crypto.randomUUID(),
            name: value('#planningDebtName'),
            balance: Number.parseFloat(value('#planningDebtBalance')) || 0,
            apr: Number.parseFloat(value('#planningDebtApr')) || 0,
            minimumPayment: Number.parseFloat(value('#planningDebtMinimum')) || 0,
            dueDay: Number.parseInt(value('#planningDebtDueDay'), 10) || 1,
            source: 'manual',
            isActive: true
        });
    });

    container.querySelector('#deletePlanningDebtBtn')?.addEventListener('click', () => {
        const id = /** @type {HTMLInputElement|null} */ (form?.querySelector('#planningDebtId'))?.value;
        if (id) actions.onDeleteDebt?.(id);
    });

    container.querySelectorAll('.debt-edit-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const linkedBillId = button.getAttribute('data-linked-bill-id');
            const debtId = button.getAttribute('data-debt-id');
            if (linkedBillId) actions.onEditBill?.(linkedBillId);
            else showForm((debts || []).find((debt) => debt.id === debtId));
        });
    });
    bindCashFlowPanel(container, financialPlan, actions);
}
