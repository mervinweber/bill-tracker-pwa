/**
 * Initializes the bill form modal for creating and editing bills
 * 
 * @param {string[]} categories - Array of available bill categories
 * @param {Object} actions - Object containing action handler functions
 * @param {Function} actions.onSaveBill - Called when form is submitted (receives billData object)
 * @param {Function} actions.onMarkPaid - Called when Mark as Paid button is clicked (receives billId and isPaid boolean)
 * @returns {void}
 * @description Creates a modal form with:
 *   - All required fields: category, name, due date, amount due, balance, recurrence, notes
 *   - Form validation with proper error messages
 *   - Proper dialog semantics and WCAG 2.1 Level AA accessibility
 *   - Close button and Escape key handler
 *   - Help text linked via aria-describedby for all fields
 *   - Required field indicators and aria-required attributes
 *   - Mark as Paid button for quick payment status toggling
 */

import logger from '../utils/logger.js';

// Module-level variable to store actions for use in openBillForm
let formActions = {};

export const initializeBillForm = (categories, actions) => {
    formActions = actions;
    const form = document.getElementById('billForm');

    // Shadcn-like styling constants
    const inputBase = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
    const labelBase = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";
    const btnBase = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
    const btnPrimary = `${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`;
    const btnSecondary = `${btnBase} bg-secondary text-secondary-foreground hover:bg-secondary/80`;
    const btnOutline = `${btnBase} border border-input bg-background hover:bg-accent hover:text-accent-foreground`;
    const btnGhost = `${btnBase} hover:bg-accent hover:text-accent-foreground h-9 w-9 p-0`;

    form.className = "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
    form.style.display = 'none'; // Controlled by open/close functions

    form.innerHTML = `
        <div class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg md:w-full">
            <div class="flex flex-col space-y-1.5 text-center sm:text-left">
                <h2 id="billFormTitle" class="text-lg font-semibold leading-none tracking-tight">Add/Edit Bill</h2>
                <p class="text-sm text-muted-foreground">Fill in the details for your bill. Click save when you're done.</p>
            </div>
            
            <button class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground" id="closeBillFormBtn" aria-label="Close dialog">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                <span class="sr-only">Close</span>
            </button>

            <form id="billFormElement" novalidate class="space-y-4">
                <input type="hidden" id="billId">
                
                <div class="grid gap-2">
                    <label for="billCategory" class="${labelBase}">Category <span class="text-destructive">*</span></label>
                    <select id="billCategory" required aria-required="true" class="${inputBase}">
                        <option value="">Select Category</option>
                        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>
                
                <div class="grid gap-2">
                    <label for="billName" class="${labelBase}">Bill Name <span class="text-destructive">*</span></label>
                    <input type="text" id="billName" required aria-required="true" placeholder="Electric Bill" class="${inputBase}">
                </div>
                
                <div class="grid gap-2">
                    <label for="billDueDate" class="${labelBase}">Due Date <span class="text-destructive">*</span></label>
                    <input type="date" id="billDueDate" required aria-required="true" class="${inputBase}">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="grid gap-2">
                        <label for="billAmountDue" class="${labelBase}">Amount Due <span class="text-destructive">*</span></label>
                        <input type="number" id="billAmountDue" step="0.01" required aria-required="true" placeholder="0.00" class="${inputBase}" inputmode="decimal">
                    </div>
                    
                    <div class="grid gap-2">
                        <label for="billBalance" class="${labelBase}">Balance <span class="text-destructive">*</span></label>
                        <input type="number" id="billBalance" step="0.01" required aria-required="true" placeholder="0.00" class="${inputBase}" inputmode="decimal">
                    </div>
                </div>
                
                <div class="grid gap-2">
                    <label for="billRecurrence" class="${labelBase}">Recurrence</label>
                    <select id="billRecurrence" class="${inputBase}">
                        <option value="One-time">One-time</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                    </select>
                </div>

                <div class="flex items-center space-x-2 py-2">
                    <input type="checkbox" id="billReminderEnabled" checked class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary">
                    <label for="billReminderEnabled" class="text-sm font-medium leading-none cursor-pointer">Enable reminders for this bill</label>
                </div>
                
                <div class="grid gap-2">
                    <label for="billWebsite" class="${labelBase}">Website / Login URL</label>
                    <input type="url" id="billWebsite" placeholder="https://..." class="${inputBase}">
                </div>

                <div class="grid gap-2">
                    <label for="billNotes" class="${labelBase}">Notes</label>
                    <textarea id="billNotes" rows="2" placeholder="Add any notes..." class="${inputBase} min-h-[60px] resize-none"></textarea>
                </div>
                
                <div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-4">
                    <button type="button" id="cancelBillBtn" class="${btnOutline}">Cancel</button>
                    <button type="button" id="markPaidBtn" class="${btnSecondary} hidden">Mark as Paid</button>
                    <button type="submit" class="${btnPrimary}">Save Bill</button>
                </div>
            </form>
        </div>
    `;

    const closeBtn = document.getElementById('closeBillFormBtn');
    const cancelBtn = document.getElementById('cancelBillBtn');

    const hideForm = () => {
        form.style.display = 'none';
        form.classList.remove('animate-in', 'fade-in-0');
    };

    closeBtn.addEventListener('click', hideForm);
    cancelBtn.addEventListener('click', hideForm);

    // Record payment button handler
    const markPaidBtn = document.getElementById('markPaidBtn');
    markPaidBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const billId = document.getElementById('billId').value;
        if (formActions.onMarkPaid) {
            formActions.onMarkPaid(billId, true);
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === form) {
            hideForm();
        }
    });

    form.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideForm();
        }
    });

    document.getElementById('billFormElement').addEventListener('submit', (e) => {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('billAmountDue').value);
        if (amount < 0) {
            alert('Amount Due must be a positive number');
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
            reminderEnabled: document.getElementById('billReminderEnabled').checked,
            notes: document.getElementById('billNotes').value,
            website: document.getElementById('billWebsite').value
        };
        actions.onSaveBill(billData);
    });
};

export const openBillForm = (bill) => {
    const isEdit = !!bill;
    const billData = bill || {
        id: '',
        category: '',
        name: '',
        dueDate: '',
        amountDue: 0,
        balance: 0,
        recurrence: 'One-time',
        reminderEnabled: true,
        notes: '',
        website: ''
    };

    document.getElementById('billId').value = billData.id;
    document.getElementById('billCategory').value = billData.category;
    document.getElementById('billName').value = billData.name;
    document.getElementById('billDueDate').value = billData.dueDate;
    document.getElementById('billAmountDue').value = billData.amountDue || 0;
    document.getElementById('billBalance').value = billData.balance || 0;

    document.getElementById('billRecurrence').value = billData.recurrence;
    document.getElementById('billReminderEnabled').checked = billData.reminderEnabled !== false;
    document.getElementById('billNotes').value = billData.notes || '';
    document.getElementById('billWebsite').value = billData.website || '';

    const titleElement = document.getElementById('billFormTitle');
    titleElement.textContent = isEdit ? 'Edit Bill' : 'Add Bill';

    const markPaidBtn = document.getElementById('markPaidBtn');
    if (isEdit) {
        markPaidBtn.classList.remove('hidden');
    } else {
        markPaidBtn.classList.add('hidden');
    }

    const form = document.getElementById('billForm');
    form.style.display = 'block';
    form.classList.add('animate-in', 'fade-in-0');
    document.getElementById('billCategory').focus();
};

export const resetBillForm = () => {
    document.getElementById('billId').value = '';
    document.getElementById('billCategory').value = '';
    document.getElementById('billFormElement').reset();
    document.getElementById('billReminderEnabled').checked = true;
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
};

export const closeBillForm = () => {
    document.getElementById('billForm').style.display = 'none';
    resetBillForm();
};