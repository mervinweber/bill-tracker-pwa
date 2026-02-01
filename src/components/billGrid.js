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

    const container = document.createElement('div');
    container.className = 'bill-grid-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Bills table');

    const table = document.createElement('table');
    table.className = 'bill-table';
    table.setAttribute('role', 'table');
    table.setAttribute('aria-label', 'List of bills with payment status');

    const thead = document.createElement('thead');
    thead.setAttribute('role', 'rowgroup');
    // Headers are static and safe
    thead.innerHTML = `
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
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.setAttribute('role', 'rowgroup');

    if (dueBills.length > 0) {
        dueBills.forEach(bill => {
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

            const row = document.createElement('tr');
            row.className = `${isPaid ? 'paid-bill' : ''} ${isOverdue ? 'overdue-bill' : ''}`;
            row.setAttribute('role', 'row');
            row.setAttribute('aria-label', `${bill.name}, due ${bill.dueDate}, $${(bill.amountDue || 0).toFixed(2)}, ${isPaid ? 'paid' : 'unpaid'}${isOverdue ? ', overdue' : ''}`);

            // Bill Name
            const nameCell = document.createElement('td');
            nameCell.setAttribute('role', 'cell');
            nameCell.textContent = bill.name;
            row.appendChild(nameCell);

            // Due Date
            const dateCell = document.createElement('td');
            dateCell.setAttribute('role', 'cell');
            if (isOverdue) dateCell.className = 'overdue-date';
            dateCell.setAttribute('aria-label', `Due date: ${bill.dueDate}${isOverdue ? ' (overdue)' : ''}`);
            dateCell.textContent = bill.dueDate + (isOverdue ? ' ⚠️' : '');
            row.appendChild(dateCell);

            // Category (conditional)
            if (viewMode === 'all') {
                const catCell = document.createElement('td');
                catCell.setAttribute('role', 'cell');
                catCell.textContent = bill.category;
                row.appendChild(catCell);
            }

            // Amount Due
            const amountCell = document.createElement('td');
            amountCell.setAttribute('role', 'cell');
            amountCell.textContent = `$${(bill.amountDue || 0).toFixed(2)}`;
            row.appendChild(amountCell);

            // Balance Input
            const balanceCell = document.createElement('td');
            balanceCell.setAttribute('role', 'cell');
            const balanceInput = document.createElement('input');
            balanceInput.type = 'number';
            balanceInput.className = 'balance-input';
            balanceInput.dataset.billId = bill.id;
            balanceInput.value = (bill.balance || 0).toFixed(2);
            balanceInput.step = '0.01';
            balanceInput.ariaLabel = `Balance for ${bill.name}`;
            balanceInput.addEventListener('change', (e) => actions.onUpdateBalance(bill.id, parseFloat(e.target.value)));
            balanceCell.appendChild(balanceInput);
            row.appendChild(balanceCell);

            // Paid Checkbox
            const paidCell = document.createElement('td');
            paidCell.setAttribute('role', 'cell');
            const toggleLabel = document.createElement('label');
            toggleLabel.className = 'payment-toggle';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'payment-checkbox';
            checkbox.dataset.billId = bill.id;
            checkbox.ariaLabel = `Mark ${bill.name} as ${isPaid ? 'unpaid' : 'paid'}`;
            checkbox.checked = isPaid;
            checkbox.addEventListener('change', (e) => actions.onTogglePayment(bill.id, e.target.checked));

            const slider = document.createElement('span');
            slider.className = 'toggle-slider';
            slider.setAttribute('aria-hidden', 'true');

            toggleLabel.appendChild(checkbox);
            toggleLabel.appendChild(slider);
            paidCell.appendChild(toggleLabel);
            row.appendChild(paidCell);

            // Last Payment
            const lastPaymentCell = document.createElement('td');
            lastPaymentCell.className = 'payment-date';
            lastPaymentCell.setAttribute('role', 'cell');
            lastPaymentCell.textContent = lastPayment;
            row.appendChild(lastPaymentCell);

            // Notes
            const notesCell = document.createElement('td');
            notesCell.className = 'notes-cell';
            notesCell.setAttribute('role', 'cell');
            notesCell.title = notesTitle; // Tooltips are safe text
            notesCell.textContent = notesDisplay;
            row.appendChild(notesCell);

            // Recurrence
            const recurrenceCell = document.createElement('td');
            recurrenceCell.setAttribute('role', 'cell');
            recurrenceCell.textContent = bill.recurrence;
            row.appendChild(recurrenceCell);

            // Actions
            const actionsCell = document.createElement('td');
            actionsCell.setAttribute('role', 'cell');
            const btnGroup = document.createElement('div');
            btnGroup.className = 'action-buttons';
            btnGroup.setAttribute('role', 'group');
            btnGroup.ariaLabel = `Actions for ${bill.name}`;

            if (bill.website) {
                const linkBtn = document.createElement('button');
                linkBtn.className = 'icon-btn link-btn';
                linkBtn.title = 'Pay Online';
                linkBtn.ariaLabel = `Pay ${bill.name} online`;
                linkBtn.textContent = '🔗';
                linkBtn.addEventListener('click', () => window.open(bill.website, '_blank'));
                btnGroup.appendChild(linkBtn);
            }

            const payBtn = document.createElement('button');
            payBtn.className = 'icon-btn pay-btn';
            payBtn.title = 'Record Payment';
            payBtn.ariaLabel = `Record payment for ${bill.name}`;
            payBtn.textContent = '💳';
            payBtn.addEventListener('click', () => actions.onRecordPayment(bill.id));
            btnGroup.appendChild(payBtn);

            const historyBtn = document.createElement('button');
            historyBtn.className = 'icon-btn history-btn';
            historyBtn.title = 'View History';
            historyBtn.ariaLabel = `View payment history for ${bill.name}`;
            historyBtn.textContent = '📜';
            historyBtn.addEventListener('click', () => actions.onViewHistory(bill.id));
            btnGroup.appendChild(historyBtn);

            const editBtn = document.createElement('button');
            editBtn.className = 'icon-btn edit-btn';
            editBtn.title = 'Edit';
            editBtn.ariaLabel = `Edit ${bill.name}`;
            editBtn.textContent = '✏️';
            editBtn.addEventListener('click', () => actions.onEditBill(bill.id));
            btnGroup.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-btn delete-btn';
            deleteBtn.title = 'Delete';
            deleteBtn.ariaLabel = `Delete ${bill.name}`;
            deleteBtn.textContent = '🗑️';
            deleteBtn.addEventListener('click', () => actions.onDeleteBill(bill.id));
            btnGroup.appendChild(deleteBtn);

            actionsCell.appendChild(btnGroup);
            row.appendChild(actionsCell);

            tbody.appendChild(row);
        });
    } else {
        const message = viewMode === 'all' ? 'No bills found' : 'No bills in this category due before the next paycheck';
        const emptyRow = document.createElement('tr');
        emptyRow.setAttribute('role', 'row');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 10;
        emptyCell.setAttribute('role', 'cell');
        emptyCell.setAttribute('aria-live', 'polite');
        emptyCell.textContent = message;
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
    }

    table.appendChild(tbody);
    container.appendChild(table);
    billGrid.appendChild(container);

    // Event listeners are already attached during element creation above
};