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

    container.innerHTML = `
        <div id="recordPaymentModal" class="modal">
            <div class="modal-content">
                <span class="close" id="closeRecordPayment">&times;</span>
                <h2>Record Payment</h2>
                <form id="recordPaymentForm">
                    <input type="hidden" id="paymentBillId">
                    <div class="payment-summary-card" aria-live="polite">
                        <p class="payment-summary-bill">Bill: <strong id="paymentBillName">-</strong></p>
                        <p class="payment-summary-remaining">Remaining: <strong id="paymentRemainingAmount">$0.00</strong></p>
                    </div>
                    <div id="monthlyStrategySection" class="payment-strategy-section" style="display:none;">
                        <p id="monthlyStrategyHint" class="payment-strategy-hint"></p>
                        <div class="payment-strategy-options" role="radiogroup" aria-label="Overdue recurring payment strategy">
                            <label>
                                <input type="radio" id="paymentStrategySingleCycle" name="paymentRecurrenceStrategy" value="single-cycle" checked>
                                <span id="paymentStrategySingleCycleLabel">Clear one cycle only</span>
                            </label>
                            <label>
                                <input type="radio" id="paymentStrategyCatchUp" name="paymentRecurrenceStrategy" value="catch-up-to-current">
                                <span id="paymentStrategyCatchUpLabel">Catch up to current schedule</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group"><label>Amount Paid:</label><input type="number" id="paymentAmount" step="0.01" required></div>
                    <div class="form-group"><label>Payment Date:</label><input type="date" id="paymentDate" required></div>
                    <div class="payment-modal-actions">
                        <button type="button" id="quickPayFullBtn" class="submit-btn">⚡ Pay Full Today</button>
                        <button type="submit" class="action-btn">💾 Save Payment</button>
                    </div>
                    <details id="paymentOptionalDetails" class="payment-optional-details">
                        <summary>Optional details</summary>
                        <div class="form-group"><label>Payment Method:</label><select id="paymentMethod">
                            <option value="Credit Card">💳 Credit Card</option>
                            <option value="Debit Card">💳 Debit Card</option>
                            <option value="Bank Transfer">🏦 Bank Transfer</option>
                            <option value="Cash">💵 Cash</option>
                            <option value="Check">📝 Check</option>
                            <option value="PayPal">💰 PayPal</option>
                            <option value="Venmo">💸 Venmo</option>
                        </select></div>
                        <div class="form-group"><label>Confirmation # (Optional):</label><input type="text" id="paymentConfirmation"></div>
                    </details>
                </form>
            </div>
        </div>
        <div id="viewHistoryModal" class="modal">
            <div class="modal-content"><span class="close" id="closeViewHistory">&times;</span><h2>📜 Payment History</h2><div id="historyContent"></div></div>
        </div>
    `;

    document.getElementById('closeRecordPayment').addEventListener('click', () => {
        document.getElementById('recordPaymentModal').style.display = 'none';
    });
    document.getElementById('closeViewHistory').addEventListener('click', () => {
        document.getElementById('viewHistoryModal').style.display = 'none';
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
    const remaining = billActionHandlers.getRemainingBalance(bill);
    f('paymentBillName').textContent = bill.name;
    f('paymentRemainingAmount').textContent =
        creditBalance > 0
            ? `$${remaining.toFixed(2)} (Credit: $${creditBalance.toFixed(2)})`
            : `$${remaining.toFixed(2)}`;
    f('paymentBillId').value = billId;
    f('paymentAmount').value = remaining.toFixed(2);
    f('paymentDate').value = new Date().toISOString().split('T')[0];
    f('paymentOptionalDetails').open = false;
    f('recordPaymentModal').style.display = 'block';
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
