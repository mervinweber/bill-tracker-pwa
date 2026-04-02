import { buildDebtSnowballPlan } from '../utils/debtSnowball.js';

const toCurrency = (value) => `$${(value || 0).toFixed(2)}`;

export function initializeDebtSnowballView() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    if (!document.getElementById('debtSnowballView')) {
        const debtDiv = document.createElement('div');
        debtDiv.id = 'debtSnowballView';
        debtDiv.className = 'w-full';
        debtDiv.style.display = 'none';
        main.appendChild(debtDiv);
    }
}

export function renderDebtSnowballView({ bills, settings }, actions) {
    const container = document.getElementById('debtSnowballView');
    if (!container) return;

    const extraPayment = Number.parseFloat(settings?.extraPayment) || 0;
    const strategy = settings?.strategy === 'avalanche' ? 'avalanche' : 'snowball';
    const plan = buildDebtSnowballPlan(bills, extraPayment, strategy);

    if (plan.itemCount === 0) {
        container.innerHTML = `
            <section class="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6" aria-label="Debt snowball planner">
                <div class="rounded-2xl border bg-card p-6 shadow-sm text-center">
                    <h2 class="text-2xl font-semibold text-card-foreground">Debt Snowball Planner</h2>
                    <p class="mt-2 text-sm text-muted-foreground">Add an interest rate, debt total, or enable debt snowball review on a bill to include it here.</p>
                </div>
            </section>
        `;
        return;
    }

    const rowMarkup = plan.items.map((item, index) => {
        const payoffLabel = item.payoffMonths === null
            ? '<span class="text-destructive">Not paying down</span>'
            : `<span class="font-medium text-card-foreground">~${item.payoffMonths} month${item.payoffMonths !== 1 ? 's' : ''}</span>`;
        return `
        <article class="rounded-xl border bg-card p-4 shadow-sm">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="inline-flex h-7 w-7 items-center justify-center rounded-full ${item.isPriorityTarget ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'} text-xs font-bold">${index + 1}</span>
                        <h3 class="text-lg font-semibold text-card-foreground">${item.name}</h3>
                        ${item.isPriorityTarget ? '<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">Focus First</span>' : ''}
                    </div>
                    <p class="mt-1 text-xs text-muted-foreground">${item.category || 'Uncategorized'} • ${item.includeInDebtSnowball ? 'Flagged for snowball review' : 'Included by debt settings'}</p>
                </div>
                <button type="button" class="debt-edit-btn inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground" data-bill-id="${item.id}">Edit</button>
            </div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div class="rounded-lg border bg-background/70 p-3">
                    <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Debt Total</div>
                    <div class="text-lg font-semibold text-card-foreground">${toCurrency(item.debtTotal)}</div>
                </div>
                <div class="rounded-lg border bg-background/70 p-3">
                    <div class="text-[11px] uppercase tracking-wide text-muted-foreground">APR</div>
                    <div class="text-lg font-semibold text-card-foreground">${item.interestRate.toFixed(2)}%</div>
                </div>
                <div class="rounded-lg border bg-background/70 p-3">
                    <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Min Payment</div>
                    <div class="text-lg font-semibold text-card-foreground">${toCurrency(item.minimumPayment)}</div>
                </div>
                <div class="rounded-lg border bg-background/70 p-3">
                    <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Suggested Payment</div>
                    <div class="text-lg font-semibold ${item.isPriorityTarget ? 'text-amber-700' : 'text-card-foreground'}">${toCurrency(item.recommendedPayment)}</div>
                </div>
                <div class="rounded-lg border bg-background/70 p-3">
                    <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Payoff Est.</div>
                    <div class="text-lg font-semibold">${payoffLabel}</div>
                </div>
            </div>
            <p class="mt-3 text-sm text-muted-foreground">Estimated monthly interest: <span class="font-medium text-card-foreground">${toCurrency(item.monthlyInterestEstimate)}</span></p>
        </article>
        `;
    }).join('');

    container.innerHTML = `
        <section class="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6" aria-label="Debt snowball planner">
            <div class="rounded-2xl border bg-card p-6 shadow-sm">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 class="text-2xl font-semibold text-card-foreground">Debt Snowball Planner</h2>
                        <p class="mt-2 text-sm text-muted-foreground">${strategy === 'avalanche' ? 'Highest interest rate first (avalanche).' : 'Smallest balance first (snowball).'} Anything with an interest rate, debt total, or debt-snowball flag is included here.</p>
                    </div>
                    <form id="debtSnowballSettingsForm" class="grid gap-2 sm:grid-cols-[minmax(140px,180px)_minmax(180px,220px)_auto]">
                        <label class="grid gap-1 text-sm">
                            <span class="text-xs text-muted-foreground">Strategy</span>
                            <select id="debtSnowballStrategy" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="snowball" ${strategy === 'snowball' ? 'selected' : ''}>🔵 Snowball (smallest first)</option>
                                <option value="avalanche" ${strategy === 'avalanche' ? 'selected' : ''}>🔴 Avalanche (highest rate first)</option>
                            </select>
                        </label>
                        <label class="grid gap-1 text-sm">
                            <span class="text-xs text-muted-foreground">Extra Monthly Payment</span>
                            <input id="debtSnowballExtraPayment" type="number" step="0.01" min="0" value="${extraPayment.toFixed(2)}" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        </label>
                        <button type="submit" class="inline-flex h-10 items-center justify-center self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save Settings</button>
                    </form>
                </div>
                <div class="mt-4 grid gap-3 sm:grid-cols-3">
                    <div class="rounded-lg border bg-background/70 p-3">
                        <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Tracked Debts</div>
                        <div class="text-xl font-semibold text-card-foreground">${plan.itemCount}</div>
                    </div>
                    <div class="rounded-lg border bg-background/70 p-3">
                        <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Total Debt</div>
                        <div class="text-xl font-semibold text-card-foreground">${toCurrency(plan.totalDebt)}</div>
                    </div>
                    <div class="rounded-lg border bg-background/70 p-3">
                        <div class="text-[11px] uppercase tracking-wide text-muted-foreground">Monthly Interest Estimate</div>
                        <div class="text-xl font-semibold text-card-foreground">${toCurrency(plan.totalMonthlyInterest)}</div>
                    </div>
                </div>
            </div>
            <div class="grid gap-4">${rowMarkup}</div>
        </section>
    `;

    container.querySelector('#debtSnowballSettingsForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = /** @type {HTMLInputElement|null} */ (container.querySelector('#debtSnowballExtraPayment'));
        const select = /** @type {HTMLSelectElement|null} */ (container.querySelector('#debtSnowballStrategy'));
        const amount = Number.parseFloat(input?.value || '0') || 0;
        const selectedStrategy = select?.value === 'avalanche' ? 'avalanche' : 'snowball';
        actions.onSaveSettings?.({ extraPayment: amount, strategy: selectedStrategy });
    });

    container.querySelectorAll('.debt-edit-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const billId = button.getAttribute('data-bill-id');
            if (billId) {
                actions.onEditBill?.(billId);
            }
        });
    });
}
