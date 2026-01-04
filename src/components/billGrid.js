export const initializeBillGrid = () => {
    document.getElementById('billGrid').innerHTML = '<p>Select a paycheck date and category to view bills.</p>';
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
            billGrid.innerHTML = '<p>Select a paycheck date and category to view bills.</p>';
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

    let html = `<div class="bill-grid-container"><table class="bill-table"><thead><tr><th>Bill Name</th><th>Due Date</th>${viewMode === 'all' ? '<th>Category</th>' : ''}<th>Amount Due</th><th>Balance</th><th>Paid</th><th>Last Payment</th><th>Notes</th><th>Recurrence</th><th>Actions</th></tr></thead><tbody>`;

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

            return `<tr class="${rowClass}">
                <td>${bill.name}</td>
                <td class="${isOverdue ? 'overdue-date' : ''}">${bill.dueDate}${isOverdue ? ' ⚠️' : ''}</td>
                ${viewMode === 'all' ? `<td>${bill.category}</td>` : ''}
                <td>$${(bill.amountDue || 0).toFixed(2)}</td>
                <td><input type="number" class="balance-input" data-bill-id="${bill.id}" value="${(bill.balance || 0).toFixed(2)}" step="0.01"></td>
                <td><label class="payment-toggle"><input type="checkbox" class="payment-checkbox" data-bill-id="${bill.id}" ${isPaid ? 'checked' : ''}><span class="toggle-slider"></span></label></td>
                <td class="payment-date">${lastPayment}</td>
                <td class="notes-cell" title="${notesTitle}">${notesDisplay}</td>
                <td>${bill.recurrence}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn pay-btn" title="Record Payment" data-bill-id="${bill.id}">💳</button>
                        <button class="icon-btn history-btn" title="View History" data-bill-id="${bill.id}">📜</button>
                        <button class="icon-btn edit-btn" title="Edit" data-bill-id="${bill.id}">✏️</button>
                        <button class="icon-btn delete-btn" title="Delete" data-bill-id="${bill.id}">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } else {
        const message = viewMode === 'all' ? 'No bills found' : 'No bills in this category due before the next paycheck';
        html += `<tr><td colspan="100%">${message}</td></tr>`;
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