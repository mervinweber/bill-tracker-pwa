// Payment History Modal Functions

function initializePaymentModals() {
    const container = document.getElementById('paymentModals');
    container.innerHTML = `
        <!-- Record Payment Modal -->
        <div id="recordPaymentModal" class="modal-overlay">
            <div class="modal">
                <span class="close" onclick="window.closeRecordPayment()">&times;</span>
                <h2>Record Payment</h2>
                <form id="recordPaymentForm">
                    <input type="hidden" id="paymentBillId">
                    <div class="form-group">
                        <label>Amount Paid:</label>
                        <input type="number" id="paymentAmount" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Payment Date:</label>
                        <input type="date" id="paymentDate" required>
                    </div>
                    <div class="form-group">
                        <label>Payment Method:</label>
                        <select id="paymentMethod">
                            <option value="Credit Card">Credit Card</option>
                            <option value="Debit Card">Debit Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="Check">Check</option>
                            <option value="PayPal">PayPal</option>
                            <option value="Venmo">Venmo</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Confirmation # (Optional):</label>
                        <input type="text" id="paymentConfirmation">
                    </div>
                    <div class="form-group">
                        <label>Notes (Optional):</label>
                        <textarea id="paymentNotes" rows="2"></textarea>
                    </div>
                    <button type="submit" class="submit-btn">Record Payment</button>
                </form>
            </div>
        </div>

        <!-- View History Modal -->
        <div id="viewHistoryModal" class="modal-overlay">
            <div class="modal">
                <span class="close" onclick="window.closeViewHistory()">&times;</span>
                <h2 id="historyTitle">Payment History</h2>
                <div id="historyContent"></div>
            </div>
        </div>
    `;

    document.getElementById('recordPaymentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        savePayment();
    });
}

function openRecordPayment(billId) {
    const bill = window.bills.find(b => b.id === billId);
    if (!bill) return;

    document.getElementById('paymentBillId').value = billId;
    document.getElementById('paymentAmount').value = window.getRemainingBalance(bill).toFixed(2);
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('recordPaymentModal').style.display = 'block';
}

function closeRecordPayment() {
    document.getElementById('recordPaymentModal').style.display = 'none';
    document.getElementById('recordPaymentForm').reset();
}

function savePayment() {
    const billId = document.getElementById('paymentBillId').value;
    const paymentData = {
        amount: document.getElementById('paymentAmount').value,
        date: document.getElementById('paymentDate').value,
        method: document.getElementById('paymentMethod').value,
        confirmationNumber: document.getElementById('paymentConfirmation').value,
        notes: document.getElementById('paymentNotes').value
    };

    window.recordPayment(billId, paymentData);
    closeRecordPayment();
}

function openViewHistory(billId) {
    const bill = window.bills.find(b => b.id === billId);
    if (!bill) return;

    const totalDue = bill.balance || bill.amountDue || 0;
    const totalPaid = window.getTotalPaid(bill);
    const remaining = window.getRemainingBalance(bill);

    const payments = (bill.paymentHistory || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    const historyContent = document.getElementById('historyContent');
    historyContent.innerHTML = '';

    // Summary Section
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'history-summary';

    const nameP = document.createElement('p');
    const nameStrong = document.createElement('strong');
    nameStrong.textContent = bill.name;
    nameP.appendChild(nameStrong);
    summaryDiv.appendChild(nameP);

    const statsP = document.createElement('p');
    statsP.textContent = `Total Due: $${totalDue.toFixed(2)} | Total Paid: $${totalPaid.toFixed(2)} | Remaining: $${remaining.toFixed(2)}`;
    summaryDiv.appendChild(statsP);

    historyContent.appendChild(summaryDiv);

    // List Section
    const listDiv = document.createElement('div');
    listDiv.className = 'history-list';

    if (payments.length > 0) {
        payments.forEach(payment => {
            const recordDiv = document.createElement('div');
            recordDiv.className = 'payment-record';

            // Header (Date and Amount)
            const headerDiv = document.createElement('div');
            headerDiv.className = 'payment-header';

            const dateSpan = document.createElement('span');
            dateSpan.className = 'payment-date';
            dateSpan.textContent = new Date(payment.date).toLocaleDateString();
            headerDiv.appendChild(dateSpan);

            const amountSpan = document.createElement('span');
            amountSpan.className = 'payment-amount';
            amountSpan.textContent = `$${payment.amount.toFixed(2)}`;
            headerDiv.appendChild(amountSpan);

            recordDiv.appendChild(headerDiv);

            // Details (Method and Confirmation)
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'payment-details';

            const methodSpan = document.createElement('span');
            methodSpan.className = 'payment-method';
            methodSpan.textContent = `💳 ${payment.method}`;
            detailsDiv.appendChild(methodSpan);

            if (payment.confirmationNumber) {
                const confSpan = document.createElement('span');
                confSpan.className = 'payment-conf';
                confSpan.textContent = `Conf: ${payment.confirmationNumber}`;
                detailsDiv.appendChild(confSpan);
            }
            recordDiv.appendChild(detailsDiv);

            // Notes
            if (payment.notes) {
                const notesDiv = document.createElement('div');
                notesDiv.className = 'payment-notes';
                notesDiv.textContent = payment.notes;
                recordDiv.appendChild(notesDiv);
            }

            listDiv.appendChild(recordDiv);
        });
    } else {
        const noPayP = document.createElement('p');
        noPayP.textContent = 'No payments recorded yet.';
        listDiv.appendChild(noPayP);
    }

    historyContent.appendChild(listDiv);
    document.getElementById('viewHistoryModal').style.display = 'block';
}

function closeViewHistory() {
    document.getElementById('viewHistoryModal').style.display = 'none';
}

// Make functions globally available
window.openRecordPayment = openRecordPayment;
window.closeRecordPayment = closeRecordPayment;
window.openViewHistory = openViewHistory;
window.closeViewHistory = closeViewHistory;
window.initializePaymentModals = initializePaymentModals;
