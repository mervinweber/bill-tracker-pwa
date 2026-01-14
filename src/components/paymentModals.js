export function initializePaymentModals(actions) {
    const { onRecordPayment, onGetRemainingBalance, onGetTotalPaid } = actions;
    const container = document.getElementById('paymentModals');
    if (!container) return;

    container.innerHTML = `
        <div id="recordPaymentModal" class="modal">
            <div class="modal-content">
                <span class="close" id="closeRecordPayment">&times;</span>
                <h2>Record Payment</h2>
                <form id="recordPaymentForm">
                    <input type="hidden" id="paymentBillId">
                    <div class="form-group"><label>Amount Paid:</label><input type="number" id="paymentAmount" step="0.01" required></div>
                    <div class="form-group"><label>Payment Date:</label><input type="date" id="paymentDate" required></div>
                    <div class="form-group"><label>Method:</label><select id="paymentMethod"><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Credit Card">Credit Card</option><option value="Debit Card">Debit Card</option><option value="Check">Check</option></select></div>
                    <div class="form-group"><label>Confirmation #:</label><input type="text" id="paymentConfirmation"></div>
                    <button type="submit" class="submit-btn">Record Payment</button>
                </form>
            </div>
        </div>
        <div id="viewHistoryModal" class="modal">
            <div class="modal-content">
                <span class="close" id="closeViewHistory">&times;</span>
                <h2>Payment History</h2>
                <div id="historyContent"></div>
            </div>
        </div>
    `;

    document.getElementById('closeRecordPayment').onclick = () => document.getElementById('recordPaymentModal').style.display = 'none';
    document.getElementById('closeViewHistory').onclick = () => document.getElementById('viewHistoryModal').style.display = 'none';

    document.getElementById('recordPaymentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const billId = document.getElementById('paymentBillId').value;
        const paymentData = {
            amount: document.getElementById('paymentAmount').value,
            date: document.getElementById('paymentDate').value,
            method: document.getElementById('paymentMethod').value,
            confirmationNumber: document.getElementById('paymentConfirmation').value
        };
        onRecordPayment(billId, paymentData);
        document.getElementById('recordPaymentModal').style.display = 'none';
        document.getElementById('recordPaymentForm').reset();
    });
}

export function openRecordPayment(bill, remainingBalance) {
    document.getElementById('paymentBillId').value = bill.id;
    document.getElementById('paymentAmount').value = remainingBalance.toFixed(2);
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('recordPaymentModal').style.display = 'block';
}

export function openViewHistory(bill, data) {
    const { totalPaid, remaining, payments } = data;
    const totalDue = bill.amountDue || 0;

    let html = `
        <div style="padding: 15px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0;">${bill.name}</h3>
            <div style="display: flex; gap: 20px; font-size: 14px;">
                <span><strong>Total Due:</strong> $${totalDue.toFixed(2)}</span>
                <span><strong>Total Paid:</strong> $${totalPaid.toFixed(2)}</span>
                <span style="color: ${remaining > 0 ? 'var(--danger-color)' : 'var(--success-color)'};"><strong>Remaining:</strong> $${remaining.toFixed(2)}</span>
            </div>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
    `;

    if (payments.length > 0) {
        payments.forEach(payment => {
            html += `
                <div style="padding: 12px; border-left: 3px solid var(--accent-color); background: var(--bg-primary); margin-bottom: 10px; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                        <strong style="color: var(--success-color);">$${payment.amount.toFixed(2)}</strong>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        ${payment.method} ${payment.confirmationNumber ? `| Conf: ${payment.confirmationNumber}` : ''}
                    </div>
                </div>
            `;
        });
    } else {
        html += '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No payments recorded yet</p>';
    }
    html += '</div>';

    document.getElementById('historyContent').innerHTML = html;
    document.getElementById('viewHistoryModal').style.display = 'block';
}
