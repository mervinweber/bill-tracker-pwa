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

    let html = `
        <div class="history-summary">
            <p><strong>${bill.name}</strong></p>
            <p>Total Due: $${totalDue.toFixed(2)} | Total Paid: $${totalPaid.toFixed(2)} | Remaining: $${remaining.toFixed(2)}</p>
        </div>
        <div class="history-list">
    `;

    if (payments.length > 0) {
        payments.forEach(payment => {
            html += `
                <div class="payment-record">
                    <div class="payment-header">
                        <span class="payment-date">${new Date(payment.date).toLocaleDateString()}</span>
                        <span class="payment-amount">$${payment.amount.toFixed(2)}</span>
                    </div>
                    <div class="payment-details">
                        <span class="payment-method">💳 ${payment.method}</span>
                        ${payment.confirmationNumber ? `<span class="payment-conf">Conf: ${payment.confirmationNumber}</span>` : ''}
                    </div>
                    ${payment.notes ? `<div class="payment-notes">${payment.notes}</div>` : ''}
                </div>
            `;
        });
    } else {
        html += '<p>No payments recorded yet.</p>';
    }

    html += '</div>';

    document.getElementById('historyContent').innerHTML = html;
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
