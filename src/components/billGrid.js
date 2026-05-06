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
    billGrid.className = "flex flex-col gap-4 p-4 sm:p-6";
    billGrid.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
            <div class="rounded-full bg-muted p-3 mb-4 text-2xl">📋</div>
            <h3 class="text-sm font-semibold text-foreground">No selection</h3>
            <p class="text-xs text-muted-foreground mt-1" aria-live="polite" role="status">Select a paycheck date and category to view bills.</p>
        </div>
    `;
};

const formatDueDateLabel = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const renderBillGrid = ({ bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, showCarriedForward, payCheckDates, allBillsScope }, actions) => {
    runBillGridCleanup();
    const useCompactMobileActions = isTouchDevice() && isMobileViewport();
    const billGrid = document.getElementById('billGrid');
    billGrid.className = "flex flex-col gap-4 p-4 sm:p-6";
    billGrid.innerHTML = '';

    let dueBills = filterBillsByPeriod(bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates, showCarriedForward, allBillsScope);

    if (paymentFilter === 'reconcile') {
        dueBills = dueBills.filter((bill) => getBillReconciliationIssues(bill).length > 0);
    }

    if (viewMode !== 'all' && (selectedPaycheck === null || selectedCategory === null)) {
        initializeBillGrid();
        return;
    }

    if (dueBills.length === 0) {
        const message = viewMode === 'all' ? 'No bills found' : 'No bills in this category due before the next paycheck';
        billGrid.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg border border-dashed">
                <div class="text-2xl mb-2">✨</div>
                <p class="text-sm text-muted-foreground" aria-live="polite" role="status">${message}</p>
            </div>
        `;
        return;
    }

    // Shadcn-like styling constants
    const btnBase = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    const btnGhost = `${btnBase} hover:bg-accent hover:text-accent-foreground h-8 w-8`;
    const checkboxBase = "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";
    const inputBase = "flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
    const reasonBadgeBase = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
    const reasonBadgeStyles = {
        overdue: 'bg-destructive/10 text-destructive',
        carried: 'bg-amber-500/10 text-amber-700',
        due: 'bg-sky-500/10 text-sky-700',
        paid: 'bg-emerald-500/10 text-emerald-700',
        open: 'bg-muted text-muted-foreground'
    };

    const tableWrapper = document.createElement('div');
    tableWrapper.className = "relative w-full overflow-x-auto overflow-y-visible rounded-lg border bg-card shadow-sm";

    const table = document.createElement('table');
    table.className = "w-full caption-bottom text-sm min-w-max sm:min-w-full";
    table.setAttribute('role', 'table');

    const thead = document.createElement('thead');
    thead.className = "[&_tr]:border-b";
    thead.innerHTML = `
        <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap">Bill</th>
            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap">Due</th>
            ${viewMode === 'all' ? '<th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap">Category</th>' : ''}
            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap">Amount</th>\n            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap">Balance</th>
            <th class="h-9 px-3 py-1 text-left align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap">Credit</th>
            <th class="h-9 px-3 py-1 text-center align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap">Status</th>
            <th class="h-9 px-3 py-1 text-right align-middle font-medium text-muted-foreground bg-card text-xs whitespace-nowrap">Actions</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = "[&_tr:last-child]:border-0";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentPaycheckDate = payCheckDates?.[selectedPaycheck ?? 0] || null;
    const nextPaycheckDate = currentPaycheckDate && selectedPaycheck !== null && payCheckDates?.length
        ? (selectedPaycheck < payCheckDates.length - 1
            ? payCheckDates[selectedPaycheck + 1]
            : new Date(currentPaycheckDate.getTime() + (14 * 24 * 60 * 60 * 1000)))
        : null;
    const summaryDateLabel = nextPaycheckDate instanceof Date && !Number.isNaN(nextPaycheckDate.getTime())
        ? formatDueDateLabel(nextPaycheckDate)
        : null;
    const dueThisPeriodCount = dueBills.filter((bill) => {
        if (bill.isPaid) return false;
        const dueDate = createLocalDate(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return currentPaycheckDate && nextPaycheckDate
            ? dueDate >= currentPaycheckDate && dueDate < nextPaycheckDate
            : true;
    }).length;
    const carriedForwardCount = dueBills.filter((bill) => {
        if (bill.isPaid || !showCarriedForward) return false;
        const dueDate = createLocalDate(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return currentPaycheckDate ? dueDate < currentPaycheckDate : false;
    }).length;
    const overdueCount = dueBills.filter((bill) => {
        if (bill.isPaid) return false;
        const dueDate = createLocalDate(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }).length;

    const summaryMarkup = viewMode === 'filtered' || allBillsScope !== 'everything' ? `
        <div class="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Pay Period Summary</div>
                    <p class="mt-1 text-sm text-card-foreground">
                        ${summaryDateLabel
                            ? `Showing bills that need attention before ${summaryDateLabel}.`
                            : 'Showing bills that need attention in the selected period.'}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span class="inline-flex items-center rounded-full bg-sky-500/10 px-3 py-1 text-sky-700">${dueThisPeriodCount} due this period</span>
                    <span class="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-amber-700">${carriedForwardCount} carried forward</span>
                    <span class="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-destructive">${overdueCount} overdue</span>
                </div>
            </div>
        </div>
    ` : '';

    dueBills.forEach(bill => {
        const isPaid = bill.isPaid || false;
        const creditBalance = Math.max(0, Number.parseFloat(bill.creditBalance) || 0);
        const reconciliationIssues = getBillReconciliationIssues(bill);
        const primaryReconciliationIssue = reconciliationIssues[0] || null;
        const dueDate = new Date(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const isOverdue = dueDate < today && !isPaid;
        const dueReason = (() => {
            if (isPaid) return { label: 'Paid', tone: 'paid' };
            if (viewMode === 'filtered' && showCarriedForward && isOverdue) {
                return { label: 'Carried from previous period', tone: 'carried' };
            }
            if (isOverdue) return { label: 'Overdue', tone: 'overdue' };
            if (viewMode === 'filtered' && nextPaycheckDate) {
                return { label: `Due by ${formatDueDateLabel(nextPaycheckDate)}`, tone: 'due' };
            }
            if (viewMode === 'filtered') return { label: 'Due this period', tone: 'due' };
            if (allBillsScope === 'open-through-next-pay-date' && nextPaycheckDate) {
                return { label: `Due by ${formatDueDateLabel(nextPaycheckDate)}`, tone: 'due' };
            }
            if (allBillsScope === 'open-only') return { label: 'Open only', tone: 'open' };
            return { label: 'Open', tone: 'open' };
        })();

        const row = document.createElement('tr');
        row.className = `border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${isPaid ? 'opacity-60 bg-muted/20' : ''}`;
        row.setAttribute('role', 'row');

        // Name & Notes hidden
        const nameCell = document.createElement('td');
        nameCell.className = "p-4 align-middle";
        const hasNotes = typeof bill.notes === 'string' && bill.notes.trim().length > 0;
        nameCell.innerHTML = `
            <div class="flex flex-col">
                <span class="font-semibold text-foreground">${bill.name}</span>
                <span class="${reasonBadgeBase} ${reasonBadgeStyles[dueReason.tone] || reasonBadgeStyles.open} mt-1 w-fit">${dueReason.label}</span>
                ${hasNotes ? `<span class="text-[10px] text-muted-foreground truncate max-w-[150px]">${bill.notes}</span>` : ''}
                ${primaryReconciliationIssue ? '<span class="text-[10px] text-amber-700 font-semibold uppercase tracking-wide">Needs Reconcile</span>' : ''}
            </div>
        `;
        row.appendChild(nameCell);

        // Due Date
        const dateCell = document.createElement('td');
        dateCell.className = "p-4 align-middle whitespace-nowrap";
        dateCell.innerHTML = `
            <div class="flex flex-col">
                <span class="${isOverdue ? 'text-destructive font-bold' : ''}">${bill.dueDate}</span>
                <span class="text-[10px] text-muted-foreground uppercase">${bill.recurrence}</span>
            </div>
        `;
        row.appendChild(dateCell);

        // Category
        if (viewMode === 'all') {
            const catCell = document.createElement('td');
            catCell.className = "p-4 align-middle";
            catCell.innerHTML = `<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">${bill.category}</span>`;
            row.appendChild(catCell);
        }

        // Amount Due
        const amountCell = document.createElement('td');
        amountCell.className = "p-4 align-middle font-medium font-mono";
        const splitIndicator = bill.split?.enabled 
            ? `<div class="text-[10px] text-primary font-sans font-bold">SPLIT (${bill.split.payers.length})</div>` 
            : '';
        amountCell.innerHTML = `
            <div class="flex flex-col">
                <span>$${(bill.amountDue || 0).toFixed(2)}</span>
                ${splitIndicator}
            </div>
        `;
        row.appendChild(amountCell);

        // Balance Input
        const balanceCell = document.createElement('td');
        balanceCell.className = "p-4 align-middle min-w-[100px]";
        const balanceInput = document.createElement('input');
        balanceInput.className = inputBase;
        balanceInput.type = 'number';
        balanceInput.step = '0.01';
        balanceInput.value = (bill.balance || 0).toFixed(2);
        balanceInput.addEventListener('change', (e) => actions.onUpdateBalance(bill.id, parseFloat(/** @type {HTMLInputElement} */ (e.target).value)));
        balanceCell.appendChild(balanceInput);
        row.appendChild(balanceCell);

        // Credit
        const creditCell = document.createElement('td');
        creditCell.className = 'p-4 align-middle font-medium font-mono';
        creditCell.innerHTML = creditBalance > 0
            ? `<span class="text-emerald-600">$${creditBalance.toFixed(2)}</span>`
            : '<span class="text-muted-foreground">$0.00</span>';
        row.appendChild(creditCell);

        // Status / Paid Toggle
        const statusCell = document.createElement('td');
        statusCell.className = "p-4 align-middle text-center";
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
        actionsCell.className = "p-4 align-middle text-right";
        const actionGroup = document.createElement('div');
        actionGroup.className = "flex items-center justify-end gap-2";

        const btnStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8";

        if (bill.website) {
            const linkBtn = document.createElement('button');
            linkBtn.className = btnStyle;
            linkBtn.title = "Pay Website";
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

        const deleteBtn = document.createElement('button');
        deleteBtn.className = `${btnStyle} hover:text-destructive`;
        deleteBtn.title = "Delete";
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.addEventListener('click', () => actions.onDeleteBill(bill.id));
        actionGroup.appendChild(deleteBtn);

        if (primaryReconciliationIssue && typeof actions.onApplyReconcileFix === 'function') {
            const fixBtn = document.createElement('button');
            fixBtn.className = `${btnStyle} hover:text-amber-700`;
            fixBtn.title = `Apply reconcile fix: ${primaryReconciliationIssue.message}`;
            fixBtn.innerHTML = '🩹';
            fixBtn.addEventListener('click', () => actions.onApplyReconcileFix(bill.id, primaryReconciliationIssue.code));
            actionGroup.appendChild(fixBtn);
        }

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
    billGrid.innerHTML = `
        <div class="flex flex-col gap-4">
            ${summaryMarkup}
        </div>
    `;
    billGrid.appendChild(tableWrapper);
};
