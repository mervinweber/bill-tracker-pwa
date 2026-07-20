import { buildCashFlowForecast } from '../utils/cashFlowEngine.js';

const currency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
}).format(value || 0);

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const inputClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
const buttonClass = 'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function getCashFlowPanelMarkup({ bills, debts, financialPlan, paymentSettings }) {
    const activeScenario = financialPlan.cashFlowScenarios.find(
        (scenario) => scenario.id === financialPlan.settings.activeScenarioId
    ) || null;
    const forecast = buildCashFlowForecast({
        bills,
        debts,
        incomeSources: financialPlan.incomeSources,
        accounts: financialPlan.accounts,
        paymentSettings,
        scenario: activeScenario,
        extraDebtPayment: financialPlan.settings.extraPayment,
        months: financialPlan.settings.forecastMonths
    });

    const sourceRows = financialPlan.incomeSources.map((source) => `
        <div class="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0">
            <div class="min-w-0"><p class="truncate text-sm font-medium">${escapeHtml(source.name)}</p><p class="text-xs text-muted-foreground">${currency(source.amount)} · ${escapeHtml(source.frequency)}</p></div>
            <div class="flex gap-1">
                <button type="button" class="income-edit-btn ${buttonClass} border border-input bg-background hover:bg-accent" data-income-id="${escapeHtml(source.id)}">Edit</button>
                <button type="button" class="income-delete-btn ${buttonClass} text-destructive hover:bg-destructive/10" data-income-id="${escapeHtml(source.id)}">Remove</button>
            </div>
        </div>
    `).join('');

    const forecastRows = forecast.months.map((row) => {
        const label = new Date(`${row.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const netClass = row.net < 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400';
        return `
            <div class="grid grid-cols-2 gap-x-3 gap-y-1 border-b px-3 py-3 last:border-b-0 sm:grid-cols-[1.2fr_repeat(5,1fr)] sm:items-center">
                <p class="col-span-2 text-sm font-semibold sm:col-span-1">${label}</p>
                <p class="text-xs text-muted-foreground sm:text-sm"><span class="sm:hidden">Income </span>${currency(row.income)}</p>
                <p class="text-right text-xs text-muted-foreground sm:text-left sm:text-sm"><span class="sm:hidden">Bills </span>${currency(row.bills)}</p>
                <p class="text-xs text-muted-foreground sm:text-sm"><span class="sm:hidden">Debt </span>${currency(row.debtPayments)}</p>
                <p class="text-right text-sm font-medium ${netClass} sm:text-left">${row.net >= 0 ? '+' : ''}${currency(row.net)}</p>
                <p class="col-span-2 text-right text-sm font-semibold sm:col-span-1 sm:text-left">${currency(row.endingCash)}</p>
            </div>
        `;
    }).join('');

    const scenarioOptions = financialPlan.cashFlowScenarios.map((scenario) =>
        `<option value="${escapeHtml(scenario.id)}" ${scenario.id === financialPlan.settings.activeScenarioId ? 'selected' : ''}>${escapeHtml(scenario.name)}</option>`
    ).join('');

    return `
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div class="border-l-2 border-primary px-3 py-1"><p class="text-xs text-muted-foreground">Monthly income</p><p class="text-base font-semibold">${currency(forecast.baseMonthlyIncome)}</p></div>
                    <div class="border-l-2 border-amber-500 px-3 py-1"><p class="text-xs text-muted-foreground">Debt minimums</p><p class="text-base font-semibold">${currency(forecast.monthlyDebtMinimums)}</p></div>
                    <div class="border-l-2 border-sky-600 px-3 py-1"><p class="text-xs text-muted-foreground">Forecast change</p><p class="text-base font-semibold">${currency(forecast.totalNet)}</p></div>
                    <div class="border-l-2 ${forecast.hasShortfall ? 'border-destructive' : 'border-emerald-600'} px-3 py-1"><p class="text-xs text-muted-foreground">Lowest cash</p><p class="text-base font-semibold ${forecast.hasShortfall ? 'text-destructive' : ''}">${currency(forecast.lowestEndingCash)}</p></div>
                </div>

                <div class="overflow-hidden rounded-md border bg-card">
                    <div class="hidden border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1.2fr_repeat(5,1fr)]"><span>Month</span><span>Income</span><span>Bills</span><span>Debt</span><span>Net</span><span>Ending cash</span></div>
                    ${forecastRows}
                </div>
            </div>

            <aside class="space-y-3">
                <div class="rounded-md border bg-card p-3">
                    <div class="flex items-center justify-between gap-2"><h3 class="text-sm font-semibold">Income</h3><button id="addIncomeSourceBtn" type="button" class="${buttonClass} border border-input bg-background hover:bg-accent">Add</button></div>
                    <p class="mt-1 text-xs text-muted-foreground">${financialPlan.incomeSources.length ? 'Planning income overrides paycheck setup.' : 'Using your paycheck setup until income is added here.'}</p>
                    <div class="mt-2 overflow-hidden rounded-md border">${sourceRows || '<p class="px-3 py-4 text-center text-xs text-muted-foreground">No separate income sources.</p>'}</div>
                    <form id="incomeSourceForm" class="mt-3 hidden space-y-2">
                        <input id="incomeSourceId" type="hidden">
                        <input id="incomeSourceName" required maxlength="80" class="${inputClass}" placeholder="Income name">
                        <div class="grid grid-cols-2 gap-2">
                            <input id="incomeSourceAmount" required type="number" min="0" step="0.01" class="${inputClass}" placeholder="Amount" inputmode="decimal">
                            <select id="incomeSourceFrequency" class="${inputClass}"><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="semimonthly">Twice monthly</option><option value="monthly" selected>Monthly</option><option value="annual">Annual</option></select>
                        </div>
                        <div class="flex justify-end gap-2"><button id="cancelIncomeSourceBtn" type="button" class="${buttonClass} border border-input">Cancel</button><button type="submit" class="${buttonClass} bg-primary text-primary-foreground">Save</button></div>
                    </form>
                </div>

                <form id="cashFlowOptionsForm" class="space-y-3 rounded-md border bg-card p-3">
                    <h3 class="text-sm font-semibold">Forecast options</h3>
                    <label class="grid gap-1 text-xs text-muted-foreground">Months
                        <select id="forecastMonths" class="${inputClass}">${[3, 6, 12, 18, 24].map((count) => `<option value="${count}" ${financialPlan.settings.forecastMonths === count ? 'selected' : ''}>${count} months</option>`).join('')}</select>
                    </label>
                    <label class="grid gap-1 text-xs text-muted-foreground">Active what-if
                        <select id="activeCashFlowScenario" class="${inputClass}"><option value="">None</option>${scenarioOptions}</select>
                    </label>
                </form>

                <form id="cashFlowScenarioForm" class="space-y-2 rounded-md border bg-card p-3">
                    <h3 class="text-sm font-semibold">Save a what-if</h3>
                    <input id="cashFlowScenarioId" type="hidden" value="${escapeHtml(activeScenario?.id || '')}">
                    <input id="cashFlowScenarioName" required maxlength="60" class="${inputClass}" placeholder="Tax refund plan" value="${escapeHtml(activeScenario?.name || '')}">
                    <div class="grid grid-cols-2 gap-2">
                        <label class="grid gap-1 text-xs text-muted-foreground">Income change<input id="scenarioIncomeChange" type="number" step="0.01" class="${inputClass}" value="${activeScenario?.monthlyIncomeChange || 0}"></label>
                        <label class="grid gap-1 text-xs text-muted-foreground">Expense change<input id="scenarioExpenseChange" type="number" step="0.01" class="${inputClass}" value="${activeScenario?.monthlyExpenseChange || 0}"></label>
                    </div>
                    <label class="grid gap-1 text-xs text-muted-foreground">Extra debt payment<input id="scenarioExtraDebt" type="number" min="0" step="0.01" class="${inputClass}" value="${activeScenario?.extraDebtPayment || 0}"></label>
                    <button type="submit" class="${buttonClass} w-full bg-primary text-primary-foreground">Save and apply</button>
                </form>
            </aside>
        </div>
    `;
}

export function bindCashFlowPanel(container, financialPlan, actions) {
    const form = /** @type {HTMLFormElement|null} */ (container.querySelector('#incomeSourceForm'));
    const showIncomeForm = (source = null) => {
        if (!form) return;
        form.classList.remove('hidden');
        const set = (selector, value) => {
            const field = /** @type {HTMLInputElement|HTMLSelectElement|null} */ (form.querySelector(selector));
            if (field) field.value = value ?? '';
        };
        set('#incomeSourceId', source?.id || '');
        set('#incomeSourceName', source?.name || '');
        set('#incomeSourceAmount', source?.amount ?? '');
        set('#incomeSourceFrequency', source?.frequency || 'monthly');
    };

    container.querySelector('#addIncomeSourceBtn')?.addEventListener('click', () => showIncomeForm());
    container.querySelector('#cancelIncomeSourceBtn')?.addEventListener('click', () => form?.classList.add('hidden'));
    container.querySelectorAll('.income-edit-btn').forEach((button) => button.addEventListener('click', () => {
        showIncomeForm(financialPlan.incomeSources.find((source) => source.id === button.getAttribute('data-income-id')));
    }));
    container.querySelectorAll('.income-delete-btn').forEach((button) => button.addEventListener('click', () => {
        actions.onDeleteIncomeSource?.(button.getAttribute('data-income-id'));
    }));
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = (selector) => /** @type {HTMLInputElement|HTMLSelectElement} */ (form.querySelector(selector)).value;
        actions.onSaveIncomeSource?.({
            id: value('#incomeSourceId') || crypto.randomUUID(),
            name: value('#incomeSourceName'),
            amount: Number.parseFloat(value('#incomeSourceAmount')) || 0,
            frequency: value('#incomeSourceFrequency'),
            isActive: true
        });
    });
    container.querySelector('#forecastMonths')?.addEventListener('change', (event) => {
        actions.onSaveSettings?.({ forecastMonths: Number.parseInt(/** @type {HTMLSelectElement} */ (event.target).value, 10) });
    });
    container.querySelector('#activeCashFlowScenario')?.addEventListener('change', (event) => {
        actions.onSaveSettings?.({ activeScenarioId: /** @type {HTMLSelectElement} */ (event.target).value || null });
    });
    container.querySelector('#cashFlowScenarioForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const scenarioForm = /** @type {HTMLFormElement} */ (event.currentTarget);
        const value = (selector) => /** @type {HTMLInputElement} */ (scenarioForm.querySelector(selector)).value;
        const scenario = {
            id: value('#cashFlowScenarioId') || crypto.randomUUID(),
            name: value('#cashFlowScenarioName'),
            monthlyIncomeChange: Number.parseFloat(value('#scenarioIncomeChange')) || 0,
            monthlyExpenseChange: Number.parseFloat(value('#scenarioExpenseChange')) || 0,
            extraDebtPayment: Number.parseFloat(value('#scenarioExtraDebt')) || 0
        };
        actions.onSaveScenario?.(scenario);
    });
}
