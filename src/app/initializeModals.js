/**
 * Modal Initialization
 * Creates and wires up the payment recording, view history, and confirmation modals.
 * Pass the host's rerender callback to keep the modals updating the UI correctly.
 */

import { billActionHandlers } from '../handlers/billActionHandlers.js';
import { getMissedCycles, createLocalDate } from '../utils/dates.js';
import { billStore } from '../store/BillStore.js';
import { filterBillsByPeriod } from '../utils/billHelpers.js';

function formatCurrency(value) {
    return `$${(Number.parseFloat(value) || 0).toFixed(2)}`;
}

function getRecurrenceCycleLabel(recurrence) {
    switch (recurrence) {
        case 'Weekly':
            return 'weeks';
        case 'Bi-weekly':
            return 'bi-weekly cycles';
        case 'Monthly':
            return 'months';
        case 'Quarterly':
            return 'quarters';
        case 'Yearly':
            return 'years';
        default:
            return 'cycles';
    }
}

function getRecurrenceSingleCycleLabel(recurrence) {
    switch (recurrence) {
        case 'Weekly':
            return 'week';
        case 'Bi-weekly':
            return 'bi-weekly cycle';
        case 'Monthly':
            return 'month';
        case 'Quarterly':
            return 'quarter';
        case 'Yearly':
            return 'year';
        default:
            return 'cycle';
    }
}

/**
 * Initialize and mount payment recording / history modals
 * @param {Function} onRerender - Called when the UI needs to refresh after a payment
 */
export function initializePaymentModals(onRerender) {
    const container = document.getElementById('paymentModals');
    if (!container) return;
    const g = (id) => /** @type {any} */ (document.getElementById(id));

    const inputBase = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
    const labelBase = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";
    const btnBase = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
    const btnPrimary = `${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`;
    const btnSecondary = `${btnBase} bg-secondary text-secondary-foreground hover:bg-secondary/80`;
    const closeBtn = `absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`;
    const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg><span class="sr-only">Close</span>`;

    container.innerHTML = `
        <div id="recordPaymentModal" class="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="recordPaymentTitle">
            <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div class="relative w-full max-w-md border bg-background shadow-lg sm:rounded-lg">
                    <div class="flex flex-col space-y-1.5 p-6 pb-4 border-b">
                        <h2 id="recordPaymentTitle" class="text-lg font-semibold leading-none tracking-tight">Record Payment</h2>
                        <p class="text-sm text-muted-foreground">Enter the amount and date for this payment.</p>
                    </div>
                    <button type="button" class="${closeBtn}" id="closeRecordPayment" aria-label="Close dialog">${closeIcon}</button>
                    <form id="recordPaymentForm" class="p-6 pt-4 space-y-4">
                        <input type="hidden" id="paymentBillId">
                        <div class="rounded-lg border bg-muted/50 p-3 space-y-1" aria-live="polite">
                            <p class="text-sm text-muted-foreground">Bill: <strong class="text-foreground" id="paymentBillName">-</strong></p>
                            <p class="text-sm text-muted-foreground">Remaining: <strong class="text-foreground" id="paymentRemainingAmount">$0.00</strong></p>
                        </div>
                        <div id="monthlyStrategySection" class="rounded-lg border bg-muted/40 p-3 space-y-2" style="display:none;">
                            <p id="monthlyStrategyHint" class="text-sm text-muted-foreground"></p>
                            <div class="space-y-1" role="radiogroup" aria-label="Overdue recurring payment strategy">
                                <label class="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" id="paymentStrategySingleCycle" name="paymentRecurrenceStrategy" value="single-cycle" checked class="accent-primary">
                                    <span id="paymentStrategySingleCycleLabel">Clear one cycle only</span>
                                </label>
                                <label class="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" id="paymentStrategyCatchUp" name="paymentRecurrenceStrategy" value="catch-up-to-current" class="accent-primary">
                                    <span id="paymentStrategyCatchUpLabel">Catch up to current schedule</span>
                                </label>
                            </div>
                        </div>
                        <div class="grid gap-2">
                            <label for="paymentAmount" class="${labelBase}">Amount Paid <span class="text-destructive">*</span></label>
                            <input type="number" id="paymentAmount" step="0.01" required class="${inputBase}" inputmode="decimal">
                        </div>
                        <div class="grid gap-2">
                            <label for="paymentDate" class="${labelBase}">Payment Date <span class="text-destructive">*</span></label>
                            <input type="date" id="paymentDate" required class="${inputBase}">
                        </div>
                        <div class="flex gap-2 flex-col-reverse sm:flex-row">
                            <button type="button" id="quickPayFullBtn" class="${btnSecondary} flex-1">⚡ Pay Full Today</button>
                            <button type="submit" class="${btnPrimary} flex-1">💾 Save Payment</button>
                        </div>
                        <details id="paymentOptionalDetails" class="pt-1">
                            <summary class="text-sm text-muted-foreground cursor-pointer select-none">Optional details</summary>
                            <div class="pt-3 space-y-3">
                                <div class="grid gap-2">
                                    <label for="paymentMethod" class="${labelBase}">Payment Method</label>
                                    <select id="paymentMethod" class="${inputBase}">
                                        <option value="Credit Card">💳 Credit Card</option>
                                        <option value="Debit Card">💳 Debit Card</option>
                                        <option value="Bank Transfer">🏦 Bank Transfer</option>
                                        <option value="Cash">💵 Cash</option>
                                        <option value="Check">📝 Check</option>
                                        <option value="PayPal">💰 PayPal</option>
                                        <option value="Venmo">💸 Venmo</option>
                                    </select>
                                </div>
                                <div class="grid gap-2">
                                    <label for="paymentConfirmation" class="${labelBase}">Confirmation # (optional)</label>
                                    <input type="text" id="paymentConfirmation" class="${inputBase}" placeholder="Optional">
                                </div>
                            </div>
                        </details>
                    </form>
                </div>
            </div>
        </div>

        <div id="viewHistoryModal" class="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="viewHistoryTitle">
            <div class="flex min-h-full justify-end p-0 sm:p-4">
                <div class="relative flex h-screen w-full max-w-full flex-col border bg-background shadow-2xl sm:max-w-xl sm:rounded-l-2xl" style="min-height: 100vh;">
                    <div class="flex flex-col space-y-1.5 border-b px-6 py-5">
                        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Bill Details</p>
                        <h2 id="viewHistoryTitle" class="text-lg font-semibold leading-none tracking-tight">📜 Payment History</h2>
                    </div>
                    <button type="button" class="${closeBtn}" id="closeViewHistory" aria-label="Close dialog">${closeIcon}</button>
                    <div id="historyContent" class="flex-1 overflow-y-auto px-6 py-4 space-y-4"></div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('closeRecordPayment').addEventListener('click', () => {
        document.getElementById('recordPaymentModal').style.display = 'none';
    });
    document.getElementById('closeViewHistory').addEventListener('click', () => {
        document.getElementById('viewHistoryModal').style.display = 'none';
    });

    // Click-outside and Escape to close
    document.getElementById('recordPaymentModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('recordPaymentModal')) {
            g('recordPaymentModal').style.display = 'none';
        }
    });
    document.getElementById('viewHistoryModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('viewHistoryModal')) {
            g('viewHistoryModal').style.display = 'none';
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const rp = g('recordPaymentModal');
        if (rp && rp.style.display !== 'none') { rp.style.display = 'none'; return; }
        const vh = g('viewHistoryModal');
        if (vh && vh.style.display !== 'none') { vh.style.display = 'none'; }
    });

    const submitPayment = (billId, paymentData) => {
        if (billActionHandlers.recordPayment(billId, paymentData)) {
            g('recordPaymentModal').style.display = 'none';
            g('recordPaymentForm').reset();
            onRerender();
        }
    };

    document.getElementById('quickPayFullBtn').addEventListener('click', () => {
        const billId = g('paymentBillId').value;
        const amount = g('paymentAmount').value;
        const date = g('paymentDate').value;
        const method = g('paymentMethod').value;
        const confirmationNumber = g('paymentConfirmation').value;
        const recurrenceStrategy =
            /** @type {HTMLInputElement|null} */ (document.querySelector('input[name="paymentRecurrenceStrategy"]:checked'))?.value ||
            'single-cycle';

        submitPayment(billId, { amount, date, method, confirmationNumber, recurrenceStrategy });
    });

    g('recordPaymentForm').addEventListener('submit', e => {
        e.preventDefault();
        const billId = g('paymentBillId').value;
        const paymentData = {
            amount: g('paymentAmount').value,
            date: g('paymentDate').value,
            method: g('paymentMethod').value,
            confirmationNumber: g('paymentConfirmation').value,
            recurrenceStrategy:
                /** @type {HTMLInputElement|null} */ (document.querySelector('input[name="paymentRecurrenceStrategy"]:checked'))?.value ||
                'single-cycle'
        };

        submitPayment(billId, paymentData);
    });
}

/**
 * Open the record payment modal for a specific bill
 * @param {string} billId
 */
export function openRecordPaymentModal(billId) {
    const bills = billStore.getAll();
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    const strategySection = document.getElementById('monthlyStrategySection');
    const strategyHint = document.getElementById('monthlyStrategyHint');
    const singleCycleOption = document.getElementById('paymentStrategySingleCycle');
    const singleCycleLabel = document.getElementById('paymentStrategySingleCycleLabel');
    const catchUpLabel = document.getElementById('paymentStrategyCatchUpLabel');

    const isRecurring = !!bill.recurrence && bill.recurrence !== 'One-time';
    const missedCycles = isRecurring
        ? getMissedCycles(createLocalDate(bill.dueDate), bill.recurrence, new Date())
        : 0;

    const singleCycleUnit = getRecurrenceSingleCycleLabel(bill.recurrence);
    if (singleCycleLabel) {
        singleCycleLabel.textContent = `Clear one ${singleCycleUnit} only`;
    }
    if (catchUpLabel) {
        catchUpLabel.textContent = `Catch up to current ${singleCycleUnit}`;
    }

    if (isRecurring && missedCycles >= 2) {
        const cycleLabel = getRecurrenceCycleLabel(bill.recurrence);
        strategySection.style.display = 'block';
        strategyHint.textContent = `${missedCycles} ${cycleLabel} past due. Choose how to advance this recurring bill.`;
    } else {
        strategySection.style.display = 'none';
        strategyHint.textContent = '';
    }

    /** @type {HTMLInputElement} */ (singleCycleOption).checked = true;
    const f = (id) => /** @type {any} */ (document.getElementById(id));
    const creditBalance = Math.max(0, Number.parseFloat(bill.creditBalance) || 0);
    // Use bill.balance (kept current by recordPayment each cycle) rather than
    // recomputing from paymentHistory, which accumulates across all recurring cycles
    // and would cause the remaining to appear as $0 on subsequent cycles.
    const currentBalance = (bill.balance > 0) ? Number(bill.balance) : Math.max(0, Number(bill.amountDue) || 0);
    const remaining = Math.max(0, currentBalance - creditBalance);
    f('paymentBillName').textContent = bill.name;
    f('paymentRemainingAmount').textContent =
        creditBalance > 0
            ? `$${remaining.toFixed(2)} (Credit: $${creditBalance.toFixed(2)})`
            : `$${remaining.toFixed(2)}`;
    f('paymentBillId').value = billId;
    f('paymentAmount').value = remaining.toFixed(2);
    f('paymentDate').value = new Date().toISOString().split('T')[0];
    f('paymentOptionalDetails').open = false;
    f('recordPaymentModal').style.display = 'flex';
}

/**
 * Show a confirmation dialog and return a Promise<boolean>
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmText]
 * @param {'primary'|'danger'} [options.confirmVariant]
 * @returns {Promise<boolean>}
 */
export function showConfirmationModal({
    title,
    message,
    confirmText = 'Confirm',
    confirmVariant = 'primary'
}) {
    return new Promise((resolve) => {
        const existingModal = document.getElementById('actionConfirmModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'actionConfirmModal';
        modal.className = 'modal confirm-modal-overlay';

        const confirmButtonClass = confirmVariant === 'danger'
            ? 'confirm-btn confirm-btn-danger'
            : 'confirm-btn confirm-btn-primary';

        modal.innerHTML = `
            <div class="modal-content modal-content-compact confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmDialogTitle">
                <div class="confirm-dialog-header">
                    <h2 id="confirmDialogTitle" class="confirm-dialog-title">${title}</h2>
                </div>
                <p class="confirm-dialog-message">${message}</p>
                <div class="confirm-dialog-actions">
                    <button type="button" class="confirm-btn confirm-btn-secondary" id="confirmDialogCancel">Cancel</button>
                    <button type="button" class="${confirmButtonClass}" id="confirmDialogConfirm">${confirmText}</button>
                </div>
            </div>
        `;

        const cleanup = (result) => {
            modal.remove();
            resolve(result);
        };

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                cleanup(false);
            }
        });

        document.body.appendChild(modal);

        document.getElementById('confirmDialogCancel')?.addEventListener('click', () => cleanup(false));
        document.getElementById('confirmDialogConfirm')?.addEventListener('click', () => cleanup(true));
        document.getElementById('confirmDialogConfirm')?.focus();
    });
}

/**
 * Show a checklist dialog and return selected bill IDs.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {Array<Object>} options.bills
 * @param {string} [options.confirmText]
 * @returns {Promise<string[]|null>}
 */
export function showBillSelectionModal({
    title,
    message,
    bills,
    confirmText = 'Apply'
}) {
    return new Promise((resolve) => {
        const existingModal = document.getElementById('billSelectionModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'billSelectionModal';
        modal.className = 'modal confirm-modal-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'modal-content confirm-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'billSelectionTitle');

        const titleEl = document.createElement('h2');
        titleEl.id = 'billSelectionTitle';
        titleEl.className = 'confirm-dialog-title';
        titleEl.textContent = title;
        dialog.appendChild(titleEl);

        const messageEl = document.createElement('p');
        messageEl.className = 'confirm-dialog-message';
        messageEl.textContent = message;
        dialog.appendChild(messageEl);

        const tools = document.createElement('div');
        tools.className = 'mb-3 flex flex-wrap items-center justify-between gap-2';

        const countLabel = document.createElement('div');
        countLabel.className = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';
        tools.appendChild(countLabel);

        const selectTools = document.createElement('div');
        selectTools.className = 'flex gap-2';

        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.className = 'confirm-btn confirm-btn-secondary text-xs';
        selectAllBtn.textContent = 'Select All';
        selectTools.appendChild(selectAllBtn);

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'confirm-btn confirm-btn-secondary text-xs';
        clearBtn.textContent = 'Clear';
        selectTools.appendChild(clearBtn);
        tools.appendChild(selectTools);
        dialog.appendChild(tools);

        const list = document.createElement('div');
        list.className = 'max-h-[50vh] space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-2';

        bills.forEach((bill) => {
            const label = document.createElement('label');
            label.className = 'flex cursor-pointer items-start gap-3 rounded-md bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary bill-selection-checkbox';
            checkbox.value = bill.id;
            checkbox.checked = true;
            label.appendChild(checkbox);

            const content = document.createElement('span');
            content.className = 'min-w-0 flex-1';

            const name = document.createElement('span');
            name.className = 'block font-semibold';
            name.textContent = bill.name || 'Unnamed bill';
            content.appendChild(name);

            const meta = document.createElement('span');
            meta.className = 'mt-0.5 block text-xs text-muted-foreground';
            const amount = Number.parseFloat(bill.amountDue) || 0;
            meta.textContent = `${bill.dueDate || 'No due date'} · ${bill.category || 'Uncategorized'} · $${amount.toFixed(2)}`;
            content.appendChild(meta);

            label.appendChild(content);
            list.appendChild(label);
        });

        dialog.appendChild(list);

        const actions = document.createElement('div');
        actions.className = 'confirm-dialog-actions mt-4';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'confirm-btn confirm-btn-secondary';
        cancelBtn.textContent = 'Cancel';
        actions.appendChild(cancelBtn);

        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'confirm-btn confirm-btn-primary';
        confirmBtn.textContent = confirmText;
        actions.appendChild(confirmBtn);
        dialog.appendChild(actions);

        modal.appendChild(dialog);

        const getCheckboxes = () => /** @type {HTMLInputElement[]} */ (
            Array.from(modal.querySelectorAll('.bill-selection-checkbox'))
        );
        const updateCount = () => {
            const selectedCount = getCheckboxes().filter((checkbox) => checkbox.checked).length;
            countLabel.textContent = `${selectedCount} of ${bills.length} selected`;
            confirmBtn.disabled = selectedCount === 0;
            confirmBtn.style.opacity = selectedCount === 0 ? '0.55' : '1';
            confirmBtn.style.cursor = selectedCount === 0 ? 'not-allowed' : 'pointer';
        };

        const cleanup = (result) => {
            modal.remove();
            resolve(result);
        };

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                cleanup(null);
            }
        });

        selectAllBtn.addEventListener('click', () => {
            getCheckboxes().forEach((checkbox) => {
                checkbox.checked = true;
            });
            updateCount();
        });

        clearBtn.addEventListener('click', () => {
            getCheckboxes().forEach((checkbox) => {
                checkbox.checked = false;
            });
            updateCount();
        });

        list.addEventListener('change', updateCount);
        cancelBtn.addEventListener('click', () => cleanup(null));
        confirmBtn.addEventListener('click', () => {
            const selectedIds = getCheckboxes()
                .filter((checkbox) => checkbox.checked)
                .map((checkbox) => checkbox.value);
            cleanup(selectedIds);
        });

        document.body.appendChild(modal);
        updateCount();
        confirmBtn.focus();
    });
}

/**
 * Show a printable/shareable summary modal for the current dashboard scope.
 * @param {Object} [options={}]
 * @param {Array} [options.bills]
 * @param {string} [options.viewMode]
 * @param {number|null} [options.selectedPaycheck]
 * @param {string|null} [options.selectedCategory]
 * @param {string} [options.paymentFilter]
 * @param {Array<Date>} [options.payCheckDates]
 * @param {boolean} [options.showCarriedForward]
 * @param {string} [options.allBillsScope]
 * @param {string} [options.title]
 * @returns {void}
 */
export function showSummaryReportModal({
    bills = [],
    viewMode,
    selectedPaycheck,
    selectedCategory,
    paymentFilter,
    payCheckDates,
    showCarriedForward,
    allBillsScope,
    title = 'Bill Summary Report'
} = {}) {
    const existing = document.getElementById('summaryReportModal');
    if (existing) {
        existing.remove();
    }

    const visibleBills = filterBillsByPeriod(bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates, showCarriedForward, allBillsScope);
    const unpaidBills = visibleBills.filter((bill) => !bill.isPaid);
    const overdueBills = unpaidBills.filter((bill) => {
        const due = new Date(bill.dueDate);
        due.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today;
    });
    const totalDue = visibleBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const totalCredit = visibleBills.reduce((sum, bill) => sum + Math.max(0, Number.parseFloat(bill.creditBalance) || 0), 0);
    const netDue = Math.max(0, totalDue - totalCredit);
    const topCategories = Array.from(
        visibleBills.reduce((map, bill) => {
            const key = bill.category || 'Uncategorized';
            map.set(key, (map.get(key) || 0) + (bill.amountDue || 0));
            return map;
        }, new Map())
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const modal = document.createElement('div');
    modal.id = 'summaryReportModal';
    modal.className = 'fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'summaryReportTitle');
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
            <div class="relative w-full max-w-3xl overflow-hidden rounded-2xl border bg-background shadow-2xl">
                <div class="flex flex-col gap-2 border-b px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Printable / Shareable</p>
                        <h2 id="summaryReportTitle" class="text-xl font-semibold tracking-tight">${title}</h2>
                        <p class="mt-1 text-sm text-muted-foreground">Reflects the current filtered view so it matches what you’re seeing in the app.</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button type="button" id="summaryReportPrint" class="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-accent hover:text-accent-foreground">Print</button>
                        <button type="button" id="summaryReportShare" class="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-accent hover:text-accent-foreground">Share</button>
                        <button type="button" id="summaryReportCopy" class="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-accent hover:text-accent-foreground">Copy Text</button>
                    </div>
                </div>
                <div class="max-h-[75vh] overflow-y-auto px-6 py-5">
                    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div class="rounded-xl border bg-muted/30 p-4">
                            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Bills Shown</div>
                            <div class="mt-1 text-2xl font-bold">${visibleBills.length}</div>
                        </div>
                        <div class="rounded-xl border bg-muted/30 p-4">
                            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Unpaid</div>
                            <div class="mt-1 text-2xl font-bold">${unpaidBills.length}</div>
                        </div>
                        <div class="rounded-xl border bg-muted/30 p-4">
                            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Overdue</div>
                            <div class="mt-1 text-2xl font-bold">${overdueBills.length}</div>
                        </div>
                        <div class="rounded-xl border bg-muted/30 p-4">
                            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Net Due</div>
                            <div class="mt-1 text-2xl font-bold">${formatCurrency(netDue)}</div>
                        </div>
                    </div>

                    <div class="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <div class="rounded-xl border bg-card p-4">
                            <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">Upcoming / Due Breakdown</h3>
                            <div class="mt-3 space-y-2">
                                ${visibleBills.slice(0, 8).map((bill) => `
                                    <div class="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div class="min-w-0">
                                            <div class="truncate text-sm font-medium">${bill.name}</div>
                                            <div class="text-xs text-muted-foreground">${bill.category || 'Uncategorized'} · Due ${bill.dueDate}</div>
                                        </div>
                                        <div class="flex items-center gap-2 text-xs font-semibold">
                                            <span>${bill.isPaid ? 'Paid' : overdueBills.some((item) => item.id === bill.id) ? 'Overdue' : 'Open'}</span>
                                            <span class="font-mono">${formatCurrency(bill.amountDue)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="rounded-xl border bg-card p-4">
                            <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">Top Categories</h3>
                            <div class="mt-3 space-y-2">
                                ${topCategories.length > 0 ? topCategories.map(([category, amount]) => `
                                    <div class="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                                        <span class="min-w-0 truncate text-sm font-medium">${category}</span>
                                        <span class="font-mono text-sm font-semibold">${formatCurrency(amount)}</span>
                                    </div>
                                `).join('') : '<div class="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">No categories to summarize yet.</div>'}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap justify-between gap-2 border-t px-6 py-4">
                    <p class="text-xs text-muted-foreground">Use Print for a paper/PDF export, or Share to send the summary from supported devices.</p>
                    <button type="button" id="summaryReportClose" class="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-accent hover:text-accent-foreground">Close</button>
                </div>
            </div>
        </div>
    `;

    const cleanup = () => modal.remove();
    modal.addEventListener('click', (event) => {
        if (event.target === modal) cleanup();
    });

    document.body.appendChild(modal);

    document.getElementById('summaryReportClose')?.addEventListener('click', cleanup);
    document.getElementById('summaryReportPrint')?.addEventListener('click', () => window.print());
    document.getElementById('summaryReportCopy')?.addEventListener('click', async () => {
        const lines = [
            title,
            `Bills shown: ${visibleBills.length}`,
            `Unpaid: ${unpaidBills.length}`,
            `Overdue: ${overdueBills.length}`,
            `Net due: ${formatCurrency(netDue)}`,
            '',
            ...visibleBills.map((bill) => `${bill.name} | ${bill.category || 'Uncategorized'} | Due ${bill.dueDate} | ${formatCurrency(bill.amountDue)}`)
        ].join('\n');
        try {
            await navigator.clipboard.writeText(lines);
        } catch {
            // Ignore clipboard failures in unsupported contexts.
        }
    });
    document.getElementById('summaryReportShare')?.addEventListener('click', async () => {
        const text = `${title}\nBills shown: ${visibleBills.length}\nUnpaid: ${unpaidBills.length}\nOverdue: ${overdueBills.length}\nNet due: ${formatCurrency(netDue)}`;
        if (navigator.share) {
            try {
                await navigator.share({ title, text });
            } catch {
                // user cancelled
            }
        }
    });
    document.getElementById('summaryReportClose')?.focus();
}
