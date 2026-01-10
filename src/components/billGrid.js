export const initializeBillGrid = () => {
    document.getElementById('billGrid').innerHTML = '<p aria-live="polite" role="status">Select a paycheck date and category to view bills.</p>';
};

export const renderBillGrid = ({ bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates }, actions) => {
    const billGrid = document.getElementById('billGrid');
    billGrid.innerHTML = '';

    let dueBills = [];

    if (viewMode === 'all') {
        // Show all bills sorted by due date
        dueBills = bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else {
        // Filtered mode: require paycheck and category selection
        if (selectedPaycheck === null || selectedCategory === null) {
            billGrid.innerHTML = '<p aria-live="polite" role="status">Select a paycheck date and category to view bills.</p>';
            return;
        }

        const currentPaycheckDate = payCheckDates[selectedPaycheck];
        const nextPaycheckDate = selectedPaycheck < payCheckDates.length - 1 ? payCheckDates[selectedPaycheck + 1] : new Date(2026, 2, 5);

        dueBills = bills.filter(bill => {
            const billDate = new Date(bill.dueDate);
            return bill.category === selectedCategory && billDate >= currentPaycheckDate && billDate < nextPaycheckDate;
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    // Apply payment filter
    if (paymentFilter === 'unpaid') {
        dueBills = dueBills.filter(bill => !bill.isPaid);
    } else if (paymentFilter === 'paid') {
        dueBills = dueBills.filter(bill => bill.isPaid);
    }
    // if 'all', no filtering needed

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