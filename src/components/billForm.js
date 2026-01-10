export const initializeBillForm = (categories, actions) => {
    const form = document.getElementById('billForm');
    form.innerHTML = `<div class="modal" role="dialog" aria-labelledby="billFormTitle" aria-modal="true">
        <div class="modal-content">
            <button class="close" aria-label="Close dialog">&times;</button>
            <h2 id="billFormTitle">Add/Edit Bill</h2>
            <form id="billFormElement" novalidate>
                <input type="hidden" id="billId">
                
                <div class="form-group">
                    <label for="billCategory">Category: <span aria-label="required">*</span></label>
                    <select id="billCategory" required aria-required="true" aria-describedby="categoryHelp">
                        <option value="">Select Category</option>
                        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                    <span id="categoryHelp" class="sr-only">Choose the category this bill belongs to</span>
                </div>
                
                <div class="form-group">
                    <label for="billName">Bill Name: <span aria-label="required">*</span></label>
                    <input type="text" id="billName" required aria-required="true" placeholder="e.g., Electric Bill" aria-describedby="billNameHelp">
                    <span id="billNameHelp" class="sr-only">Enter the name of the bill</span>
                </div>
                
                <div class="form-group">
                    <label for="billDueDate">Due Date: <span aria-label="required">*</span></label>
                    <input type="date" id="billDueDate" required aria-required="true" aria-describedby="dueDateHelp">
                    <span id="dueDateHelp" class="sr-only">Select the date when this bill is due</span>
                </div>
                
                <div class="form-group">
                    <label for="billAmountDue">Amount Due: <span aria-label="required">*</span></label>
                    <input type="number" id="billAmountDue" step="0.01" required aria-required="true" placeholder="0.00" aria-describedby="amountHelp">
                    <span id="amountHelp" class="sr-only">Enter the amount due in dollars</span>
                </div>
                
                <div class="form-group">
                    <label for="billBalance">Balance: <span aria-label="required">*</span></label>
                    <input type="number" id="billBalance" step="0.01" required aria-required="true" placeholder="0.00" aria-describedby="balanceHelp">
                    <span id="balanceHelp" class="sr-only">Enter the current balance remaining on this bill</span>
                </div>
                
                <div class="form-group">
                    <label for="billRecurrence">Recurrence:</label>
                    <select id="billRecurrence" aria-describedby="recurrenceHelp">
                        <option value="One-time">One-time</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                    </select>
                    <span id="recurrenceHelp" class="sr-only">Select how often this bill recurs</span>
                </div>
                
                <div class="form-group">
                    <label for="billNotes">Notes:</label>
                    <textarea id="billNotes" rows="3" placeholder="Add any notes or comments..." aria-describedby="notesHelp"></textarea>
                    <span id="notesHelp" class="sr-only">Add any additional notes about this bill</span>
                </div>
                
                <button type="submit" class="submit-btn">Save Bill</button>
            </form>
        </div>
    </div>`;

    const modal = form.querySelector('.modal');
    const closeBtn = form.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        form.style.display = 'none';
        closeBtn.setAttribute('aria-label', 'Close');
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            form.style.display = 'none';
        }
    });
    
    // Trap focus within modal when open
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            form.style.display = 'none';
        }
    });

    document.getElementById('billFormElement').addEventListener('submit', (e) => {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('billAmountDue').value);
        if (amount < 0) {
            const msg = 'Amount Due must be a positive number';
            alert(msg);
            document.getElementById('billAmountDue').setAttribute('aria-invalid', 'true');
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
    document.getElementById('billCategory').focus();
};

export const resetBillForm = () => {
    document.getElementById('billId').value = '';
    document.getElementById('billCategory').value = '';
    document.getElementById('billFormElement').reset();
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
};

export const closeBillForm = () => {
    document.getElementById('billForm').style.display = 'none';
    resetBillForm();
};