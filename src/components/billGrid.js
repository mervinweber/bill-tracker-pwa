import { createLocalDate } from '../utils/dates.js';
import { paycheckManager } from '../utils/paycheckManager.js';
import { filterBillsByPeriod } from '../utils/billHelpers.js';


/**
 * Initializes the bill grid with empty state message
 * 
 * @returns {void}
 * @description Displays initial empty state message that prompts users to select filters.
 *   Includes aria-live region for screen reader announcements.
 */
export const initializeBillGrid = () => {
    document.getElementById('billGrid').innerHTML = '<p aria-live="polite" role="status">Select a paycheck date and category to view bills.</p>';
};

/**
 * Renders the bill grid table with filtered and sorted bills
 * 
 * @param {Object} state - Application state object
 * @param {Array<Object>} state.bills - Array of bill objects with properties: id, name, dueDate, amountDue, balance, isPaid, category, recurrence, notes, lastPaymentDate
 * @param {string} state.viewMode - View mode: 'all' for all bills or index-based for pay period view
 * @param {number|null} state.selectedPaycheck - Index of selected paycheck (null if viewing all)
 * @param {string|null} state.selectedCategory - Selected category name (null if not filtered)
 * @param {string} state.paymentFilter - Payment status filter: 'all'|'paid'|'unpaid'
 * @param {Date[]} state.payCheckDates - Array of paycheck dates for range filtering
 * @param {Object} actions - Action handler object
 * @param {Function} actions.onUpdateBalance - Called when user updates a bill's balance (receives billId, newBalance)
 * @param {Function} actions.onTogglePayment - Called when user toggles payment status (receives billId, isPaid)
 * @param {Function} actions.onRecordPayment - Called when user clicks payment button (receives billId)
 * @param {Function} actions.onViewHistory - Called when user clicks history button (receives billId)
 * @param {Function} actions.onDeleteBill - Called when user clicks delete button (receives billId)
 * @param {Function} actions.onEditBill - Called when user clicks edit button (receives billId)
 * @returns {void}
 * @description Renders a fully accessible table with:
 *   - Dynamic filtering by category, pay period, and payment status
 *   - Sorting by due date
 *   - Overdue status detection and visual indicators
 *   - Semantic table structure with proper ARIA roles and labels (WCAG 2.1 Level AA)
 *   - Action buttons for each bill (pay, history, edit, delete)
 *   - Payment toggle and balance input fields
 *   - Proper error handling and empty state messages
 */
export const renderBillGrid = ({ bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, showCarriedForward, payCheckDates }, actions) => {
    const billGrid = document.getElementById('billGrid');
    billGrid.innerHTML = '';

    // Use shared filtering logic
    const dueBills = filterBillsByPeriod(bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates, showCarriedForward);

    if (viewMode !== 'all' && (selectedPaycheck === null || selectedCategory === null)) {
        billGrid.innerHTML = '<p aria-live="polite" role="status">Select a paycheck date and category to view bills.</p>';
        return;
    }

    let html = `<div class="bill-grid-container" role="region" aria-label="Bills table">
        <table class="bill-table" role="table" aria-label="List of bills with payment status">
            <thead role="rowgroup">
                <tr role="row">
                    <th scope="col" role="columnheader">Bill Name</th>
                    <th scope="col" role="columnheader">Due Date</th>
                    ${viewMode === 'all' ? '<th scope="col" role="columnheader">Category</th>' : ''}
                    <th scope="col" role="columnheader">Amount Due</th>
                    <th scope="col" role="columnheader">Balance</th>
                    <th scope="col" role="columnheader">Paid <span class="sr-only">(checkbox)</span></th>
                    <th scope="col" role="columnheader">Last Payment</th>
                    <th scope="col" role="columnheader">Notes</th>
                    <th scope="col" role="columnheader">Recurrence</th>
                    <th scope="col" role="columnheader">Actions <span class="sr-only">(buttons)</span></th>
                </tr>
            </thead>
            <tbody role="rowgroup">`;

    if (dueBills.length > 0) {
        html += dueBills.map(bill => {
            const isPaid = bill.isPaid || false;
            const lastPayment = bill.lastPaymentDate ? new Date(bill.lastPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not paid';
            const notes = bill.notes || '';
            const notesDisplay = notes ? (notes.length > 30 ? notes.substring(0, 30) + '...' : notes) : '-';
            const notesTitle = notes ? notes : 'No notes';

            // Check if bill is overdue
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(bill.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const isOverdue = dueDate < today && !isPaid;

            const rowClass = `${isPaid ? 'paid-bill' : ''} ${isOverdue ? 'overdue-bill' : ''}`;
            const ariaLabel = `${bill.name}, due ${bill.dueDate}, $${(bill.amountDue || 0).toFixed(2)}, ${isPaid ? 'paid' : 'unpaid'}${isOverdue ? ', overdue' : ''}`;

            return `<tr class="${rowClass}" role="row" aria-label="${ariaLabel}">
                <td role="cell">${bill.name}</td>
                <td class="${isOverdue ? 'overdue-date' : ''}" role="cell" aria-label="Due date: ${bill.dueDate}${isOverdue ? ' (overdue)' : ''}">${bill.dueDate}${isOverdue ? ' ⚠️' : ''}</td>
                ${viewMode === 'all' ? `<td role="cell">${bill.category}</td>` : ''}
                <td role="cell" aria-label="Amount due: $${(bill.amountDue || 0).toFixed(2)}">$${(bill.amountDue || 0).toFixed(2)}</td>
                <td role="cell"><input type="number" class="balance-input" data-bill-id="${bill.id}" value="${(bill.balance || 0).toFixed(2)}" step="0.01" aria-label="Balance for ${bill.name}"></td>
                <td role="cell"><label class="payment-toggle"><input type="checkbox" class="payment-checkbox" data-bill-id="${bill.id}" aria-label="Mark ${bill.name} as ${isPaid ? 'unpaid' : 'paid'}" ${isPaid ? 'checked' : ''}><span class="toggle-slider" aria-hidden="true"></span></label></td>
                <td class="payment-date" role="cell" aria-label="Last payment: ${lastPayment}">${lastPayment}</td>
                <td class="notes-cell" role="cell" title="${notesTitle}" aria-label="Notes: ${notesDisplay === '-' ? 'none' : notesTitle}">${notesDisplay}</td>
                <td role="cell">${bill.recurrence}</td>
                <td role="cell">
                    <div class="action-buttons" role="group" aria-label="Actions for ${bill.name}">
                        ${bill.website ? `<button class="icon-btn link-btn" title="Pay Online" data-url="${bill.website}" aria-label="Pay ${bill.name} online">🔗</button>` : ''}
                        <button class="icon-btn pay-btn" title="Record Payment" data-bill-id="${bill.id}" aria-label="Record payment for ${bill.name}">💳</button>
                        <button class="icon-btn history-btn" title="View History" data-bill-id="${bill.id}" aria-label="View payment history for ${bill.name}">📜</button>
                        <button class="icon-btn edit-btn" title="Edit" data-bill-id="${bill.id}" aria-label="Edit ${bill.name}">✏️</button>
                        <button class="icon-btn delete-btn" title="Delete" data-bill-id="${bill.id}" aria-label="Delete ${bill.name}">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } else {
        const message = viewMode === 'all' ? 'No bills found' : 'No bills in this category due before the next paycheck';
        html += `<tr role="row"><td colspan="100%" role="cell" aria-live="polite">${message}</td></tr>`;
    }
    html += '</tbody></table></div>';
    billGrid.innerHTML = html;

    // Attach Event Listeners
    document.querySelectorAll('.balance-input').forEach(input => {
        input.addEventListener('change', (e) => actions.onUpdateBalance(e.target.dataset.billId, parseFloat(e.target.value)));
    });
    document.querySelectorAll('.payment-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => actions.onTogglePayment(e.target.dataset.billId, e.target.checked));
    });
    document.querySelectorAll('.link-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.closest('button').dataset.url;
            if (url) window.open(url, '_blank');
        });
    });
    document.querySelectorAll('.pay-btn').forEach(btn => {
        btn.addEventListener('click', (e) => actions.onRecordPayment(e.target.closest('button').dataset.billId));
    });
    document.querySelectorAll('.history-btn').forEach(btn => {
        btn.addEventListener('click', (e) => actions.onViewHistory(e.target.closest('button').dataset.billId));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => actions.onDeleteBill(e.target.closest('button').dataset.billId));
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => actions.onEditBill(e.target.closest('button').dataset.billId));
    });
};