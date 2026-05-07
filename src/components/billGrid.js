import { createLocalDate } from '../utils/dates.js';
import { paycheckManager } from '../utils/paycheckManager.js';
import { filterBillsByPeriod } from '../utils/billHelpers.js';
import { getBillReconciliationIssues } from '../utils/reconciliation.js';
import { initializeSwipeDelete, isTouchDevice, isMobileViewport } from '../utils/mobileGestures.js';

let billGridCleanupFns = [];

const registerBillGridCleanup = (cleanupFn) => {
    if (typeof cleanupFn === 'function') {
        billGridCleanupFns.push(cleanupFn);
    }
};

const runBillGridCleanup = () => {
    billGridCleanupFns.forEach((cleanupFn) => {
        try {
            cleanupFn();
        } catch (error) {
            // no-op cleanup guard
        }
    });
    billGridCleanupFns = [];
};

export const cleanupBillGrid = () => {
    runBillGridCleanup();
};

export const initializeBillGrid = () => {
    const billGrid = document.getElementById('billGrid');
    billGrid.className = "flex flex-col gap-3 p-4 sm:p-6";
    billGrid.innerHTML = `
        <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-dashed bg-card px-5 py-8 text-center shadow-sm sm:px-6">
            <div class="mx-auto rounded-full bg-muted p-3 text-2xl">📋</div>
            <div class="space-y-1">
                <h3 class="text-sm font-semibold text-foreground">Choose a view to start</h3>
                <p class="text-xs text-muted-foreground mt-1" aria-live="polite" role="status">Pick a paycheck date or switch to All Bills so we can show the right bills here.</p>
            </div>
            <div class="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span class="rounded-full border bg-muted/40 px-3 py-1">Pay period</span>
                <span class="rounded-full border bg-muted/40 px-3 py-1">Category</span>
                <span class="rounded-full border bg-muted/40 px-3 py-1">All Bills</span>
            </div>
        </div>
    `;
};

export const renderBillGrid = ({ bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, searchQuery = '', showCarriedForward, payCheckDates, allBillsScope }, actions) => {
    runBillGridCleanup();
    const useCompactMobileActions = isTouchDevice() && isMobileViewport();
    const billGrid = document.getElementById('billGrid');
    billGrid.className = "flex flex-col gap-3 p-4 sm:p-6";
    billGrid.innerHTML = '';

    let dueBills = filterBillsByPeriod(bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates, showCarriedForward, allBillsScope);

    if (paymentFilter === 'reconcile') {
        dueBills = dueBills.filter((bill) => getBillReconciliationIssues(bill).length > 0);
    }

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    if (normalizedSearchQuery) {
        dueBills = dueBills.filter((bill) => {
            const haystack = [
                bill.name,
                bill.category,
                bill.notes,
                bill.website,
                bill.recurrence,
                bill.amountDue,
                bill.balance
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedSearchQuery);
        });
    }

    if (viewMode !== 'all' && (selectedPaycheck === null || selectedCategory === null)) {
        initializeBillGrid();
        return;
    }

    if (dueBills.length === 0) {
        const message = normalizedSearchQuery
            ? `No bills match "${searchQuery.trim()}"`
            : viewMode === 'all'
            ? 'No bills found in this view'
            : 'No bills in this category are due before the next paycheck';
        const helper = normalizedSearchQuery
            ? 'Clear search or try a different keyword like vendor, category, or note.'
            : viewMode === 'all'
            ? 'Try a different payment filter or add your first bill from the sidebar.'
            : 'Try a different pay period, category, or switch to All Bills.';
        billGrid.innerHTML = `
            <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-dashed bg-card px-5 py-8 text-center shadow-sm sm:px-6">
                <div class="mx-auto rounded-full bg-muted p-3 text-2xl">✨</div>
                <div class="space-y-1">
                    <p class="text-sm font-medium text-foreground" aria-live="polite" role="status">${message}</p>
                    <p class="mt-1 text-xs text-muted-foreground">${helper}</p>
                </div>
                <div class="flex flex-wrap justify-center gap-2">
                    <button type="button" class="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground" id="emptyStateClearSearch">Clear Search</button>
                    <button type="button" class="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground" id="emptyStateAddBill">Add Bill</button>
                    <button type="button" class="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground" id="emptyStateOpenAllBills">All Bills</button>
                </div>
            </div>
        `;
        document.getElementById('emptyStateClearSearch')?.addEventListener('click', () => {
            const search = /** @type {HTMLInputElement | null} */ (document.getElementById('billSearchInput'));
            if (search) {
                search.value = '';
                search.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        document.getElementById('emptyStateAddBill')?.addEventListener('click', () => document.getElementById('addBillBtn')?.click());
        document.getElementById('emptyStateOpenAllBills')?.addEventListener('click', () => document.getElementById('allBillsBtn')?.click());
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const summaryCounts = dueBills.reduce((acc, bill) => {
        const dueDate = new Date(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (bill.isPaid) {
            acc.paid += 1;
        } else if (dueDate < today) {
            acc.overdue += 1;
        } else if (bill.carriedForward) {
            acc.carried += 1;
        } else {
            acc.due += 1;
        }

        return acc;
    }, { due: 0, carried: 0, overdue: 0, paid: 0 });

    const summaryStrip = document.createElement('div');
    summaryStrip.className = "rounded-xl border bg-card/85 px-4 py-3 shadow-sm";
    summaryStrip.innerHTML = `
        <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pay Period Summary</div>
                <div class="mt-1 text-sm text-foreground">
                    ${dueBills.length} bill${dueBills.length === 1 ? '' : 's'} shown.
                </div>
                <div class="mt-1 text-xs text-muted-foreground">Focus on overdue items first, then work through carried-forward bills.</div>
            </div>
            <div class="flex flex-wrap gap-2">
                <span class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">${summaryCounts.due} due</span>
                <span class="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">${summaryCounts.carried} carried</span>
                <span class="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">${summaryCounts.overdue} overdue</span>
            </div>
        </div>
    `;
    billGrid.appendChild(summaryStrip);

    // Shadcn-like styling constants
    const btnBase = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    const btnGhost = `${btnBase} hover:bg-accent hover:text-accent-foreground h-8 w-8`;
    const checkboxBase = "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";
    const inputBase = "flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

    const tableWrapper = document.createElement('div');
    tableWrapper.className = "relative w-full overflow-x-auto overflow-y-visible rounded-xl border bg-card shadow-sm";

    const table = document.createElement('table');
    table.className = "w-full table-fixed caption-bottom text-sm min-w-[1040px]";
    table.setAttribute('role', 'table');

    const thead = document.createElement('thead');
    thead.className = "[&_tr]:border-b";
    thead.innerHTML = `
        <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap w-[30%]">Bill</th>
            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap w-[15%]">Due</th>
            ${viewMode === 'all' ? '<th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap">Category</th>' : ''}
            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap w-[12%]">Amount</th>
            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap w-[20%]">Balance</th>
            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap w-[10%]">Credit</th>
            <th class="h-9 px-3 py-1 text-center align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap w-[8%]">Paid</th>
            <th class="h-9 px-3 py-1 text-right align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap w-[15%]">Actions</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = "[&_tr:last-child]:border-0";

    dueBills.forEach(bill => {
        const isPaid = bill.isPaid || false;
        const creditBalance = Math.max(0, Number.parseFloat(bill.creditBalance) || 0);
        const reconciliationIssues = getBillReconciliationIssues(bill);
        const primaryReconciliationIssue = reconciliationIssues[0] || null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const isOverdue = dueDate < today && !isPaid;

        const row = document.createElement('tr');
        row.className = `border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${isPaid ? 'opacity-60 bg-muted/20' : ''}`;
        row.setAttribute('role', 'row');

        // Name & Notes hidden
        const nameCell = document.createElement('td');
        nameCell.className = "px-3 py-3 align-top";
        const hasNotes = typeof bill.notes === 'string' && bill.notes.trim().length > 0;
        nameCell.innerHTML = `
            <div class="flex flex-col">
                <span class="font-semibold text-foreground leading-tight">${bill.name}</span>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">${bill.recurrence}</span>
                    ${primaryReconciliationIssue ? '<span class="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Needs Reconcile</span>' : ''}
                </div>
                ${hasNotes ? `<span class="mt-1 max-w-[220px] truncate text-[10px] text-muted-foreground">${bill.notes}</span>` : ''}
            </div>
        `;
        row.appendChild(nameCell);

        // Due Date
        const dateCell = document.createElement('td');
        dateCell.className = "px-3 py-3 align-top whitespace-nowrap";
        dateCell.innerHTML = `
            <div class="flex flex-col">
                <span class="${isOverdue ? 'text-destructive font-bold' : ''}">${bill.dueDate}</span>
                <span class="text-[10px] text-muted-foreground uppercase">${isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Due date'}</span>
            </div>
        `;
        row.appendChild(dateCell);

        // Category
        if (viewMode === 'all') {
            const catCell = document.createElement('td');
            catCell.className = "px-3 py-3 align-top";
            catCell.innerHTML = `<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">${bill.category}</span>`;
            row.appendChild(catCell);
        }

        // Amount Due
        const amountCell = document.createElement('td');
        amountCell.className = "px-3 py-3 align-top font-medium font-mono";
        const splitIndicator = bill.split?.enabled 
            ? `<div class="text-[10px] text-primary font-sans font-bold">SPLIT (${bill.split.payers.length})</div>` 
            : '';
        amountCell.innerHTML = `
            <div class="flex flex-col gap-1">
                <span>$${(bill.amountDue || 0).toFixed(2)}</span>
                ${splitIndicator}
            </div>
        `;
        row.appendChild(amountCell);

        // Balance Input
        const balanceCell = document.createElement('td');
        balanceCell.className = "px-3 py-3 align-top";
        const balanceInput = document.createElement('input');
        balanceInput.className = `${inputBase} max-w-[124px]`;
        balanceInput.type = 'number';
        balanceInput.step = '0.01';
        balanceInput.value = (bill.balance || 0).toFixed(2);
        balanceInput.addEventListener('change', (e) => actions.onUpdateBalance(bill.id, parseFloat(/** @type {HTMLInputElement} */ (e.target).value)));
        balanceCell.appendChild(balanceInput);
        row.appendChild(balanceCell);

        // Credit
        const creditCell = document.createElement('td');
        creditCell.className = 'px-3 py-3 align-top font-medium font-mono';
        creditCell.innerHTML = creditBalance > 0
            ? `<span class="text-emerald-600">$${creditBalance.toFixed(2)}</span>`
            : '<span class="text-muted-foreground">$0.00</span>';
        row.appendChild(creditCell);

        // Status / Paid Toggle
        const statusCell = document.createElement('td');
        statusCell.className = "px-3 py-3 align-top text-center";
        const toggleDiv = document.createElement('div');
        toggleDiv.className = "flex items-center justify-center";

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isPaid;
        checkbox.className = "h-4 w-4 rounded border-input text-primary focus:ring-primary";
        checkbox.addEventListener('change', (e) => actions.onTogglePayment(bill.id, /** @type {HTMLInputElement} */ (e.target).checked));
        toggleDiv.appendChild(checkbox);
        statusCell.appendChild(toggleDiv);
        row.appendChild(statusCell);

        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.className = "px-3 py-3 align-top text-right";
        const actionGroup = document.createElement('div');
        actionGroup.className = "flex flex-wrap items-center justify-end gap-1";

        const btnStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 w-7";
        const overflowBtnStyle = "inline-flex items-center justify-center rounded-md border border-input bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

        if (bill.website) {
            const linkBtn = document.createElement('button');
            linkBtn.className = btnStyle;
            linkBtn.title = "Open Website";
            linkBtn.innerHTML = "🌐";
            linkBtn.addEventListener('click', () => window.open(bill.website, '_blank'));
            actionGroup.appendChild(linkBtn);
        }

        const payBtn = document.createElement('button');
        payBtn.className = btnStyle;
        payBtn.title = "Record Payment";
        payBtn.innerHTML = "💰";
        payBtn.addEventListener('click', () => actions.onRecordPayment(bill.id));
        actionGroup.appendChild(payBtn);

        const editBtn = document.createElement('button');
        editBtn.className = btnStyle;
        editBtn.title = "Edit";
        editBtn.innerHTML = "✏️";
        editBtn.addEventListener('click', () => actions.onEditBill(bill.id));
        actionGroup.appendChild(editBtn);

        const moreMenu = document.createElement('details');
        moreMenu.className = "relative";

        const moreSummary = document.createElement('summary');
        moreSummary.className = overflowBtnStyle;
        moreSummary.textContent = 'More';
        moreMenu.appendChild(moreSummary);

        const morePanel = document.createElement('div');
        morePanel.className = "absolute right-0 z-20 mt-2 w-44 rounded-md border bg-card p-1 shadow-lg";

        const appendMenuButton = (label, onClick, toneClass = '') => {
            const menuBtn = document.createElement('button');
            menuBtn.type = 'button';
            menuBtn.className = `flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent ${toneClass}`;
            menuBtn.textContent = label;
            menuBtn.addEventListener('click', () => {
                onClick();
                moreMenu.removeAttribute('open');
            });
            morePanel.appendChild(menuBtn);
        };

        appendMenuButton('Edit', () => actions.onEditBill(bill.id));
        appendMenuButton('Delete', () => actions.onDeleteBill(bill.id), 'text-destructive hover:text-destructive');

        if (primaryReconciliationIssue && typeof actions.onApplyReconcileFix === 'function') {
            appendMenuButton(`Fix: ${primaryReconciliationIssue.code}`, () => actions.onApplyReconcileFix(bill.id, primaryReconciliationIssue.code), 'text-amber-700 hover:text-amber-700');
        }

        moreMenu.appendChild(morePanel);
        actionGroup.appendChild(moreMenu);

        actionsCell.appendChild(actionGroup);
        row.appendChild(actionsCell);

        tbody.appendChild(row);

        // Swipe delete for mobile
        if (useCompactMobileActions) {
            const cleanupSwipeDelete = initializeSwipeDelete(row, () => {
                actions.onDeleteBill(bill.id);
            }, 80);
            registerBillGridCleanup(cleanupSwipeDelete);
        }
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    billGrid.appendChild(tableWrapper);
};
