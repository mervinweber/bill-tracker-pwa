export const initializeBillForm = (categories, actions) => {
    const form = document.getElementById('billForm');
    form.innerHTML = `<div class="modal"><div class="modal-content"><span class="close">&times;</span><h2>Add/Edit Bill</h2><form id="billFormElement"><input type="hidden" id="billId"><div class="form-group"><label>Category:</label><select id="billCategory" required><option value="">Select Category</option>${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}</select></div><div class="form-group"><label>Bill Name:</label><input type="text" id="billName" required></div><div class="form-group"><label>Due Date:</label><input type="date" id="billDueDate" required></div><div class="form-group"><label>Amount Due:</label><input type="number" id="billAmountDue" step="0.01" required></div><div class="form-group"><label>Balance:</label><input type="number" id="billBalance" step="0.01" required></div><div class="form-group"><label>Recurrence:</label><select id="billRecurrence"><option value="One-time">One-time</option><option value="Weekly">Weekly</option><option value="Bi-weekly">Bi-weekly</option><option value="Monthly">Monthly</option><option value="Yearly">Yearly</option></select></div><div class="form-group"><label>Notes:</label><textarea id="billNotes" rows="3" placeholder="Add any notes or comments..."></textarea></div><button type="submit" class="submit-btn">Save Bill</button></form></div></div>`;

    const modal = form.querySelector('.modal');
    form.querySelector('.close').addEventListener('click', () => form.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) form.style.display = 'none'; });

    document.getElementById('billFormElement').addEventListener('submit', (e) => {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('billAmountDue').value);
        if (amount < 0) {
            alert('Amount Due must be a positive number');
            return;
        }

        const billData = {
            id: document.getElementById('billId').value,
            category: document.getElementById('billCategory').value,
            name: document.getElementById('billName').value,
            dueDate: document.getElementById('billDueDate').value,
            amountDue: amount,
            balance: parseFloat(document.getElementById('billBalance').value),
            recurrence: document.getElementById('billRecurrence').value,
            notes: document.getElementById('billNotes').value
        };
        actions.onSaveBill(billData);
    });
};

export const openBillForm = (bill) => {
    document.getElementById('billId').value = bill.id;
    document.getElementById('billCategory').value = bill.category;
    document.getElementById('billName').value = bill.name;
    document.getElementById('billDueDate').value = bill.dueDate;
    document.getElementById('billAmountDue').value = bill.amountDue || 0;
    document.getElementById('billBalance').value = bill.balance || 0;
    document.getElementById('billRecurrence').value = bill.recurrence;
    document.getElementById('billNotes').value = bill.notes || '';
    document.getElementById('billForm').style.display = 'block';
};

export const resetBillForm = () => {
    document.getElementById('billId').value = '';
    document.getElementById('billCategory').value = '';
    document.getElementById('billFormElement').reset();
};

export const closeBillForm = () => {
    document.getElementById('billForm').style.display = 'none';
    resetBillForm();
};