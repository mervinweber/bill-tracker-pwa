/**
 * Modal Initialization
 * Creates and wires up the payment recording, view history, and confirmation modals.
 * Pass the host's rerender callback to keep the modals updating the UI correctly.
 */

import { billActionHandlers } from '../handlers/billActionHandlers.js';
import { getMissedCycles, createLocalDate } from '../utils/dates.js';
import { billStore } from '../store/BillStore.js';

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
            <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div class="relative w-full max-w-lg border bg-background shadow-lg sm:rounded-lg">
                    <div class="flex flex-col space-y-1.5 p-6 pb-4 border-b">
                        <h2 id="viewHistoryTitle" class="text-lg font-semibold leading-none tracking-tight">📜 Payment History</h2>
                    </div>
                    <button type="button" class="${closeBtn}" id="closeViewHistory" aria-label="Close dialog">${closeIcon}</button>
                    <div id="historyContent" class="p-6 pt-4 max-h-[70vh] overflow-y-auto space-y-4"></div>
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
