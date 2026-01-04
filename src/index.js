// State
let bills = [];
let selectedPaycheck = null;
let selectedCategory = null;
let viewMode = 'filtered'; // 'filtered' or 'all'
let paymentFilter = 'all'; // 'all', 'unpaid', 'paid'
let paymentStartDate = null;
let paymentFrequency = 'bi-weekly'; // 'weekly', 'bi-weekly', 'monthly'
let payPeriodsToShow = 6; // number of pay periods to display

// Constants
const categories = ['Rent', 'Utilities', 'Groceries', 'Transportation', 'Insurance', 'Entertainment'];

// Helper function to create a date from string without timezone issues
function createLocalDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Helper function to format a date as YYYY-MM-DD in local timezone
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Generate paycheck dates dynamically - based on user settings or defaults
function generatePaycheckDates() {
    // Load from localStorage or use defaults
    const stored = localStorage.getItem('paymentSettings');
    let startDate, frequency, periods;
    
    if (stored) {
        const settings = JSON.parse(stored);
        startDate = createLocalDate(settings.startDate);
        frequency = settings.frequency;
        periods = settings.payPeriodsToShow || 6;
        paymentStartDate = settings.startDate;
        paymentFrequency = frequency;
        payPeriodsToShow = periods;
    } else {
        // Default: next Thursday, bi-weekly
        const today = new Date();
        const dayOfWeek = today.getDay();
        startDate = new Date(today);
        const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
        startDate.setDate(startDate.getDate() + (daysUntilThursday === 0 ? 0 : daysUntilThursday));
        frequency = 'bi-weekly';
        periods = 6;
        paymentStartDate = startDate.toISOString().split('T')[0];
        paymentFrequency = frequency;
        payPeriodsToShow = periods;
    }
    
    // Generate paycheck dates based on user preference
    const dates = [];
    const daysBetweenPaychecks = frequency === 'weekly' ? 7 : frequency === 'bi-weekly' ? 14 : 30;
    
    for (let i = 0; i < periods; i++) {
        const payDate = new Date(startDate);
        payDate.setDate(payDate.getDate() + (i * daysBetweenPaychecks));
        dates.push(payDate);
    }
    return dates;
}

const payCheckDates = generatePaycheckDates();
const paychecks = payCheckDates.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check if user has configured payment settings
    const hasSettings = localStorage.getItem('paymentSettings');
    if (!hasSettings) {
        // Redirect to setup page
        window.location.href = 'setup.html';
        return;
    }
    
    loadBillsFromStorage();
    completeInitialization();
});

function completeInitialization() {
    migrateBillsToPaymentHistory();
    updateBillDatesBasedOnRecurrence();
    initializeHeader();
    initializeSidebar();
    initializeBillForm();
    initializePaymentModals();
    initializeDashboard();
    autoSelectPayPeriod();
    initializeBillGrid();
    
    // ENSURE ALL MODALS ARE HIDDEN ON STARTUP
    const billForm = document.getElementById('billForm');
    if (billForm) billForm.style.display = 'none';
    const recordPaymentModal = document.getElementById('recordPaymentModal');
    if (recordPaymentModal) recordPaymentModal.style.display = 'none';
    const viewHistoryModal = document.getElementById('viewHistoryModal');
    if (viewHistoryModal) viewHistoryModal.style.display = 'none';
}

// ========== HEADER & NAVIGATION ==========
function initializeHeader() {
    const header = document.getElementById('header');
    header.innerHTML = `
        <div class="header-top">
            <h1>Bill Tracker</h1>
            <div class="view-controls">
                <button id="allBillsBtn" class="view-btn">📋 All Bills</button>
                <div class="filter-group">
                    <label for="paymentFilter">Show:</label>
                    <select id="paymentFilter" class="payment-filter-dropdown">
                        <option value="all">All Bills</option>
                        <option value="unpaid">Unpaid Only</option>
                        <option value="paid">Paid Only</option>
                    </select>
                </div>
                <button id="settingsBtn" class="settings-btn" title="Settings">⚙️</button>
            </div>
        </div>
        <div class="payroll-checks">${paychecks.map((c, i) => `<button class="paycheck-btn" data-check="${i}">${c}</button>`).join('')}</div>
    `;

    document.querySelectorAll('.paycheck-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            viewMode = 'filtered';
            selectedPaycheck = parseInt(e.target.dataset.check);
            document.querySelectorAll('.paycheck-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById('allBillsBtn').classList.remove('active');
            renderDashboard();
            renderBillGrid();
        });
    });

    document.getElementById('allBillsBtn').addEventListener('click', () => {
        viewMode = 'all';
        document.querySelectorAll('.paycheck-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('allBillsBtn').classList.add('active');
        renderDashboard();
        renderBillGrid();
    });

    document.getElementById('paymentFilter').addEventListener('change', (e) => {
        paymentFilter = e.target.value;
        renderDashboard();
        renderBillGrid();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
        showSettingsModal();
    });
}

function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    let html = '<h2>Categories</h2><ul>';
    categories.forEach(cat => {
        html += `<li><button class="category-btn" data-category="${cat}">${cat}</button></li>`;
    });
    html += '</ul><button id="addBillBtn" class="add-bill-btn">+ Add Bill</button>';
    html += '<button id="regenerateBillsBtn" class="regenerate-btn" title="Regenerate all recurring bills">🔄 Regenerate Bills</button>';
    sidebar.innerHTML = html;

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedCategory = e.target.dataset.category;
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderBillGrid();
        });
    });

    document.getElementById('addBillBtn').addEventListener('click', () => {
        resetBillForm();
        document.getElementById('billForm').style.display = 'block';
    });

    document.getElementById('regenerateBillsBtn').addEventListener('click', () => {
        regenerateAllRecurringBills();
    });
}

function autoSelectPayPeriod() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let selectedIndex = 0;

    // Find the current or next pay period
    for (let i = 0; i < payCheckDates.length; i++) {
        const payDate = new Date(payCheckDates[i]);
        payDate.setHours(0, 0, 0, 0);

        if (today <= payDate) {
            selectedIndex = i;
            break;
        }

        if (i < payCheckDates.length - 1) {
            const nextPayDate = new Date(payCheckDates[i + 1]);
            nextPayDate.setHours(0, 0, 0, 0);
            if (today > payDate && today < nextPayDate) {
                selectedIndex = i;
                break;
            }
        }
    }

    if (today > payCheckDates[payCheckDates.length - 1]) {
        selectedIndex = payCheckDates.length - 1;
    }

    selectedPaycheck = selectedIndex;
    selectedCategory = categories[0];
    viewMode = 'filtered';

    const paycheckButtons = document.querySelectorAll('.paycheck-btn');
    if (paycheckButtons[selectedIndex]) {
        paycheckButtons[selectedIndex].classList.add('active');
    }

    const categoryButtons = document.querySelectorAll('.category-btn');
    if (categoryButtons[0]) {
        categoryButtons[0].classList.add('active');
    }

    renderDashboard();
    renderBillGrid();
}

// ========== RECURRING BILLS & DATE UPDATES ==========
function updateBillDatesBasedOnRecurrence() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    bills = bills.map(bill => {
        // Skip if already paid
        if (bill.isPaid) return bill;
        
        const billDueDate = createLocalDate(bill.dueDate);
        billDueDate.setHours(0, 0, 0, 0);
        
        // If bill is past due and unpaid, move it to next applicable pay date
        if (billDueDate < today && bill.recurrence !== 'One-time') {
            let nextDueDate = new Date(billDueDate);
            
            // Keep moving forward until we find a date that's today or in the future
            while (nextDueDate < today) {
                nextDueDate = calculateNextDueDate(nextDueDate, bill.recurrence);
            }
            
            // Find closest paycheck date on or after nextDueDate
            const closestPaycheck = findClosestPaycheckDate(nextDueDate);
            if (closestPaycheck) {
                bill.dueDate = formatLocalDate(closestPaycheck);
            }
        }
        // If bill is today or in the future but past the last paycheck, move it to next cycle
        else if (billDueDate > today && bill.recurrence !== 'One-time') {
            const lastPaycheck = payCheckDates[payCheckDates.length - 1];
            if (billDueDate > lastPaycheck) {
                let nextDueDate = calculateNextDueDate(billDueDate, bill.recurrence);
                const closestPaycheck = findClosestPaycheckDate(nextDueDate);
                if (closestPaycheck) {
                    bill.dueDate = formatLocalDate(closestPaycheck);
                }
            }
        }
        
        return bill;
    });
    
    saveBillsToStorage();
}

function findClosestPaycheckDate(targetDate) {
    let closest = null;
    let minDifference = Infinity;
    
    for (const payDate of payCheckDates) {
        const payDateClone = new Date(payDate);
        payDateClone.setHours(0, 0, 0, 0);
        
        // Find paychecks on or after targetDate
        if (payDateClone >= targetDate) {
            const difference = payDateClone - targetDate;
            if (difference < minDifference) {
                minDifference = difference;
                closest = payDateClone;
            }
        }
    }
    
    return closest;
}

function calculateNextDueDate(currentDate, recurrence) {
    const nextDate = new Date(currentDate);
    switch (recurrence) {
        case 'Weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'Bi-weekly': nextDate.setDate(nextDate.getDate() + 14); break;
        case 'Monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'Yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        default: return null;
    }
    return nextDate;
}

function generateRecurringBillInstances(baseBill) {
    if (baseBill.recurrence === 'One-time') return;
    const generatedBills = [];
    let currentDueDate = createLocalDate(baseBill.dueDate);

    for (let i = 0; i < payCheckDates.length; i++) {
        const payPeriodStart = payCheckDates[i];
        const payPeriodEnd = i < payCheckDates.length - 1 ?
            payCheckDates[i + 1] :
            new Date(payCheckDates[i].getTime() + (14 * 24 * 60 * 60 * 1000));

        while (currentDueDate < payPeriodEnd) {
            if (currentDueDate >= payPeriodStart && currentDueDate < payPeriodEnd) {
                const dueDateStr = formatLocalDate(currentDueDate);
                const existingBill = bills.find(b =>
                    b.name === baseBill.name &&
                    b.category === baseBill.category &&
                    b.dueDate === dueDateStr &&
                    b.recurrence === baseBill.recurrence
                );

                if (!existingBill) {
                    const previousBill = bills.find(b =>
                        b.name === baseBill.name &&
                        b.category === baseBill.category &&
                        !b.isPaid &&
                        new Date(b.dueDate) < currentDueDate
                    );

                    const accumulatedBalance = previousBill ?
                        (previousBill.balance || previousBill.amountDue || 0) :
                        (baseBill.balance || baseBill.amountDue || 0);

                    const newBill = {
                        ...baseBill,
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        dueDate: dueDateStr,
                        isPaid: false,
                        lastPaymentDate: null,
                        balance: accumulatedBalance,
                        paymentHistory: []
                    };
                    generatedBills.push(newBill);
                }
            }
            const nextDate = calculateNextDueDate(currentDueDate, baseBill.recurrence);
            if (!nextDate || nextDate.getFullYear() > 2027) break;
            currentDueDate = nextDate;
        }
    }
    return generatedBills;
}

function regenerateAllRecurringBills() {
    if (!confirm('This will regenerate all recurring bill instances. Continue?')) return;
    const recurringBills = bills.filter(b => b.recurrence !== 'One-time');
    const uniqueBills = [];
    const seen = new Set();

    for (const bill of recurringBills) {
        const key = `${bill.name}-${bill.category}-${bill.recurrence}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueBills.push(bill);
        }
    }

    const today = new Date();
    bills = bills.filter(b => b.recurrence === 'One-time' || b.isPaid || new Date(b.dueDate) <= today);

    for (const template of uniqueBills) {
        const generatedBills = generateRecurringBillInstances(template);
        if (generatedBills && generatedBills.length > 0) bills.push(...generatedBills);
    }
    saveBillsToStorage();
    renderDashboard();
    renderBillGrid();
    alert('Recurring bills regenerated successfully!');
}

// ========== DASHBOARD & GRID ==========
function initializeDashboard() { renderDashboard(); }

function renderDashboard() {
    const dashboard = document.getElementById('dashboard');
    let displayBills = bills;

    if (paymentFilter === 'unpaid') displayBills = displayBills.filter(b => !b.isPaid);
    else if (paymentFilter === 'paid') displayBills = displayBills.filter(b => b.isPaid);

    if (viewMode === 'filtered' && selectedPaycheck !== null && selectedCategory !== null) {
        const currentPaycheckDate = payCheckDates[selectedPaycheck];
        const nextPaycheckDate = selectedPaycheck < payCheckDates.length - 1 ? payCheckDates[selectedPaycheck + 1] : new Date(2026, 2, 5);
        displayBills = displayBills.filter(bill => {
            const billDate = createLocalDate(bill.dueDate);
            return bill.category === selectedCategory && billDate >= currentPaycheckDate && billDate < nextPaycheckDate;
        });
    }

    const totalBills = displayBills.length;
    const totalAmountDue = displayBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const unpaidBills = displayBills.filter(b => !b.isPaid);
    const totalUnpaidAmount = unpaidBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueBills = displayBills.filter(b => {
        const dueDate = new Date(b.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today && !b.isPaid;
    });

    dashboard.innerHTML = `
        <div class="dashboard">
            <div class="dashboard-card">
                <div class="card-icon">📊</div>
                <div class="card-content"><div class="card-value">${totalBills}</div><div class="card-label">Total Bills</div></div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon">💰</div>
                <div class="card-content"><div class="card-value">$${totalAmountDue.toFixed(2)}</div><div class="card-label">Total Amount</div></div>
            </div>
            <div class="dashboard-card unpaid">
                <div class="card-icon">⚠️</div>
                <div class="card-content"><div class="card-value">${unpaidBills.length}</div><div class="card-label">Unpaid Bills</div></div>
            </div>
            <div class="dashboard-card unpaid-amount">
                <div class="card-icon">💳</div>
                <div class="card-content"><div class="card-value">$${totalUnpaidAmount.toFixed(2)}</div><div class="card-label">Unpaid Amount</div></div>
            </div>
            <div class="dashboard-card overdue">
                <div class="card-icon">🔴</div>
                <div class="card-content"><div class="card-value">${overdueBills.length}</div><div class="card-label">Overdue</div></div>
            </div>
        </div>
    `;
}

function initializeBillGrid() {
    document.getElementById('billGrid').innerHTML = '<p>Select a paycheck date and category to view bills.</p>';
}

function renderBillGrid() {
    const billGrid = document.getElementById('billGrid');
    billGrid.innerHTML = '';
    let dueBills = [];

    if (viewMode === 'all') {
        dueBills = bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else {
        if (selectedPaycheck === null || selectedCategory === null) {
            billGrid.innerHTML = '<p>Select a paycheck date and category to view bills.</p>';
            return;
        }
        const currentPaycheckDate = payCheckDates[selectedPaycheck];
        const nextPaycheckDate = selectedPaycheck < payCheckDates.length - 1 ? payCheckDates[selectedPaycheck + 1] : new Date(2026, 2, 5);
        dueBills = bills.filter(bill => {
            const billDate = createLocalDate(bill.dueDate);
            return bill.category === selectedCategory && billDate >= currentPaycheckDate && billDate < nextPaycheckDate;
        }).sort((a, b) => createLocalDate(a.dueDate) - createLocalDate(b.dueDate));
    }

    if (paymentFilter === 'unpaid') dueBills = dueBills.filter(bill => !bill.isPaid);
    else if (paymentFilter === 'paid') dueBills = dueBills.filter(bill => bill.isPaid);

    let html = `<div class="bill-grid-container"><table class="bill-table"><thead><tr><th>Bill Name</th><th>Due Date</th>${viewMode === 'all' ? '<th>Category</th>' : ''}<th>Amount Due</th><th>Balance</th><th>Paid</th><th>Last Payment</th><th>Notes</th><th>Recurrence</th><th>Actions</th></tr></thead><tbody>`;

    if (dueBills.length > 0) {
        html += dueBills.map(bill => {
            const isPaid = bill.isPaid || false;
            const lastPayment = bill.lastPaymentDate ? new Date(bill.lastPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not paid';
            const notes = bill.notes || '';
            const notesDisplay = notes ? (notes.length > 30 ? notes.substring(0, 30) + '...' : notes) : '-';
            const notesTitle = notes ? notes : 'No notes';
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = createLocalDate(bill.dueDate);
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

    document.querySelectorAll('.balance-input').forEach(input => input.addEventListener('change', (e) => updateBillBalance(e.target.dataset.billId, parseFloat(e.target.value))));
    document.querySelectorAll('.payment-checkbox').forEach(checkbox => checkbox.addEventListener('change', (e) => togglePaymentStatus(e.target.dataset.billId, e.target.checked)));
    document.querySelectorAll('.pay-btn').forEach(btn => btn.addEventListener('click', (e) => openRecordPayment(e.target.closest('button').dataset.billId)));
    document.querySelectorAll('.history-btn').forEach(btn => btn.addEventListener('click', (e) => openViewHistory(e.target.closest('button').dataset.billId)));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteBill(e.target.closest('button').dataset.billId)));
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => editBill(e.target.closest('button').dataset.billId)));
}

// ========== BILL FORM ==========
function initializeBillForm() {
    const form = document.getElementById('billForm');
    form.innerHTML = `<div class="modal"><div class="modal-content"><span class="close">&times;</span><h2>Add/Edit Bill</h2><form id="billFormElement"><input type="hidden" id="billId"><div class="form-group"><label>Category:</label><select id="billCategory" required><option value="">Select Category</option>${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}</select></div><div class="form-group"><label>Bill Name:</label><input type="text" id="billName" required></div><div class="form-group"><label>Due Date:</label><input type="date" id="billDueDate" required></div><div class="form-group"><label>Amount Due:</label><input type="number" id="billAmountDue" step="0.01" required></div><div class="form-group"><label>Balance:</label><input type="number" id="billBalance" step="0.01" required></div><div class="form-group"><label>Recurrence:</label><select id="billRecurrence"><option value="One-time">One-time</option><option value="Weekly">Weekly</option><option value="Bi-weekly">Bi-weekly</option><option value="Monthly">Monthly</option><option value="Yearly">Yearly</option></select></div><div class="form-group"><label>Notes:</label><textarea id="billNotes" rows="3" placeholder="Add any notes or comments..."></textarea></div><button type="submit" class="submit-btn">Save Bill</button></form></div></div>`;
    const modal = form.querySelector('.modal');
    form.querySelector('.close').addEventListener('click', () => form.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) form.style.display = 'none'; });
    document.getElementById('billFormElement').addEventListener('submit', (e) => { e.preventDefault(); saveBill(); });
}

function saveBill() {
    const id = document.getElementById('billId').value;
    const existingBill = id ? bills.find(b => b.id === id) : null;
    const bill = {
        id: id || Date.now().toString(),
        category: document.getElementById('billCategory').value,
        name: document.getElementById('billName').value,
        dueDate: document.getElementById('billDueDate').value,
        amountDue: parseFloat(document.getElementById('billAmountDue').value),
        balance: parseFloat(document.getElementById('billBalance').value),
        recurrence: document.getElementById('billRecurrence').value,
        notes: document.getElementById('billNotes').value,
        isPaid: existingBill ? existingBill.isPaid || false : false,
        lastPaymentDate: existingBill ? existingBill.lastPaymentDate || null : null,
        paymentHistory: existingBill ? existingBill.paymentHistory || [] : []
    };

    if (id) {
        bills = bills.map(b => b.id === id ? bill : b);
    } else {
        bills.push(bill);
        if (bill.recurrence !== 'One-time') {
            const generatedBills = generateRecurringBillInstances(bill);
            if (generatedBills && generatedBills.length > 0) bills.push(...generatedBills);
        }
    }

    saveBillsToStorage();
    document.getElementById('billForm').style.display = 'none';
    document.getElementById('billFormElement').reset();
    document.getElementById('billId').value = '';
    renderDashboard();
    renderBillGrid();
}

function editBill(billId) {
    const bill = bills.find(b => b.id === billId);
    if (bill) {
        document.getElementById('billId').value = bill.id;
        document.getElementById('billCategory').value = bill.category;
        document.getElementById('billName').value = bill.name;
        document.getElementById('billDueDate').value = bill.dueDate;
        document.getElementById('billAmountDue').value = bill.amountDue || 0;
        document.getElementById('billBalance').value = bill.balance || 0;
        document.getElementById('billRecurrence').value = bill.recurrence;
        document.getElementById('billNotes').value = bill.notes || '';
        document.getElementById('billForm').style.display = 'block';
    }
}

function resetBillForm() {
    document.getElementById('billId').value = '';
    document.getElementById('billCategory').value = '';
    document.getElementById('billFormElement').reset();
}

// ========== BILL ACTIONS ==========
function updateBillBalance(billId, newBalance) {
    const bill = bills.find(b => b.id === billId);
    if (bill) { bill.balance = newBalance; saveBillsToStorage(); }
}

function togglePaymentStatus(billId, isPaid) {
    const bill = bills.find(b => b.id === billId);
    if (bill) {
        bill.isPaid = isPaid;
        bill.lastPaymentDate = isPaid ? new Date().toISOString() : null;
        if (isPaid) {
            // Record simplified payment
            recordPayment(billId, { amount: getRemainingBalance(bill), method: 'Quick Pay', notes: 'Toggled paid' });
        }
        saveBillsToStorage();
        renderDashboard();
        renderBillGrid();
    }
}

function deleteBill(billId) {
    if (confirm('Delete this bill?')) {
        bills = bills.filter(b => b.id !== billId);
        saveBillsToStorage();
        renderDashboard();
        renderBillGrid();
    }
}

// ========== PAYMENT HISTORY ==========
function initializePaymentModals() {
    const container = document.getElementById('paymentModals');
    container.innerHTML = `
        <div id="recordPaymentModal" class="modal">
            <div class="modal-content">
                <span class="close" id="closeRecordPayment">&times;</span>
                <h2>Record Payment</h2>
                <form id="recordPaymentForm">
                    <input type="hidden" id="paymentBillId">
                    <div class="form-group"><label>Amount Paid:</label><input type="number" id="paymentAmount" step="0.01" required></div>
                    <div class="form-group"><label>Payment Date:</label><input type="date" id="paymentDate" required></div>
                    <div class="form-group"><label>Payment Method:</label><select id="paymentMethod">
                        <option value="Credit Card">💳 Credit Card</option>
                        <option value="Debit Card">💳 Debit Card</option>
                        <option value="Bank Transfer">🏦 Bank Transfer</option>
                        <option value="Cash">💵 Cash</option>
                        <option value="Check">📝 Check</option>
                        <option value="PayPal">💰 PayPal</option>
                        <option value="Venmo">💸 Venmo</option>
                    </select></div>
                    <div class="form-group"><label>Confirmation # (Optional):</label><input type="text" id="paymentConfirmation"></div>
                    <button type="submit" class="submit-btn">💾 Record Payment</button>
                </form>
            </div>
        </div>
        <div id="viewHistoryModal" class="modal">
            <div class="modal-content"><span class="close" id="closeViewHistory">&times;</span><h2>📜 Payment History</h2><div id="historyContent"></div></div>
        </div>
    `;

    document.getElementById('closeRecordPayment').addEventListener('click', () => document.getElementById('recordPaymentModal').style.display = 'none');
    document.getElementById('closeViewHistory').addEventListener('click', () => document.getElementById('viewHistoryModal').style.display = 'none');

    document.getElementById('recordPaymentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const billId = document.getElementById('paymentBillId').value;
        const paymentData = {
            amount: document.getElementById('paymentAmount').value,
            date: document.getElementById('paymentDate').value,
            method: document.getElementById('paymentMethod').value,
            confirmationNumber: document.getElementById('paymentConfirmation').value
        };
        recordPayment(billId, paymentData);
        document.getElementById('recordPaymentModal').style.display = 'none';
        document.getElementById('recordPaymentForm').reset();
    });
}

function migrateBillsToPaymentHistory() {
    bills.forEach(bill => {
        if (!bill.paymentHistory) {
            bill.paymentHistory = [];
            if (bill.lastPaymentDate && bill.isPaid) {
                bill.paymentHistory.push({
                    id: 'legacy_' + Date.now(),
                    date: bill.lastPaymentDate,
                    amount: bill.amountDue || 0,
                    method: 'Quick Pay',
                    notes: 'Migrated from toggle'
                });
            }
        }
    });
    saveBillsToStorage();
}

function getTotalPaid(bill) {
    if (!bill.paymentHistory) return 0;
    return bill.paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
}

function getRemainingBalance(bill) {
    const totalDue = bill.balance || bill.amountDue || 0;
    const totalPaid = getTotalPaid(bill);
    return Math.max(0, totalDue - totalPaid);
}

function recordPayment(billId, paymentData) {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    if (!bill.paymentHistory) bill.paymentHistory = [];

    const payment = {
        id: 'pmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        date: paymentData.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(paymentData.amount) || 0,
        method: paymentData.method || 'Cash',
        confirmationNumber: paymentData.confirmationNumber || '',
        notes: paymentData.notes || ''
    };

    bill.paymentHistory.push(payment);
    bill.lastPaymentDate = payment.date;
    const remaining = getRemainingBalance(bill);
    bill.balance = remaining; // Update balance to reflect payment
    bill.isPaid = remaining <= 0;

    saveBillsToStorage();
    renderDashboard();
    renderBillGrid();
}

function openRecordPayment(billId) {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    document.getElementById('paymentBillId').value = billId;
    document.getElementById('paymentAmount').value = getRemainingBalance(bill).toFixed(2);
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('recordPaymentModal').style.display = 'block';
}

function openViewHistory(billId) {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    const totalDue = bill.amountDue || 0; // Fix: Show original amount due, not balance
    const totalPaid = getTotalPaid(bill);
    const remaining = getRemainingBalance(bill);
    const payments = (bill.paymentHistory || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = `
        <div style="padding: 15px; background: #f8f9fa; border-radius: 4px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0;">${bill.name}</h3>
            <div style="display: flex; gap: 20px; font-size: 14px;">
                <span><strong>Total Due:</strong> $${totalDue.toFixed(2)}</span>
                <span><strong>Total Paid:</strong> $${totalPaid.toFixed(2)}</span>
                <span style="color: ${remaining > 0 ? '#e74c3c' : '#27ae60'};"><strong>Remaining:</strong> $${remaining.toFixed(2)}</span>
            </div>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
    `;
    if (payments.length > 0) {
        payments.forEach(payment => {
            html += `
                <div style="padding: 12px; border-left: 3px solid #5eb3d6; background: white; margin-bottom: 10px; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                        <strong style="color: #27ae60;">$${payment.amount.toFixed(2)}</strong>
                    </div>
                    <div style="font-size: 13px; color: #666;">
                        ${payment.method} ${payment.confirmationNumber ? `| Conf: ${payment.confirmationNumber}` : ''}
                    </div>
                </div>
            `;
        });
    } else {
        html += '<p style="text-align: center; color: #999; padding: 20px;">No payments recorded yet</p>';
    }
    html += '</div>';
    document.getElementById('historyContent').innerHTML = html;
    document.getElementById('viewHistoryModal').style.display = 'block';
}

function showSettingsModal() {
    const settings = JSON.parse(localStorage.getItem('paymentSettings'));
    const modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>⚙️ Settings</h2>
            <p style="color: #666; margin-bottom: 20px;">Update your payment configuration</p>
            <form id="settingsForm">
                <div class="form-group">
                    <label><strong>First Paycheck Date:</strong></label>
                    <input type="date" id="settingsStartDate" value="${settings.startDate}" required>
                </div>
                <div class="form-group">
                    <label><strong>Payment Frequency:</strong></label>
                    <select id="settingsFrequency" required>
                        <option value="weekly" ${settings.frequency === 'weekly' ? 'selected' : ''}>Weekly (every 7 days)</option>
                        <option value="bi-weekly" ${settings.frequency === 'bi-weekly' ? 'selected' : ''}>Bi-weekly (every 14 days)</option>
                        <option value="monthly" ${settings.frequency === 'monthly' ? 'selected' : ''}>Monthly (every 30 days)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label><strong>Number of Pay Periods to Show:</strong></label>
                    <select id="settingsWeeks" required>
                        <option value="3" ${settings.payPeriodsToShow === 3 ? 'selected' : ''}>3 Pay Periods</option>
                        <option value="4" ${settings.payPeriodsToShow === 4 ? 'selected' : ''}>4 Pay Periods</option>
                        <option value="6" ${settings.payPeriodsToShow === 6 ? 'selected' : ''}>6 Pay Periods</option>
                        <option value="8" ${settings.payPeriodsToShow === 8 ? 'selected' : ''}>8 Pay Periods</option>
                        <option value="12" ${settings.payPeriodsToShow === 12 ? 'selected' : ''}>12 Pay Periods</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" class="submit-btn" style="flex: 1;">Save Settings</button>
                    <button type="button" id="closeSettingsBtn" class="cancel-btn" style="flex: 1;">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const startDate = document.getElementById('settingsStartDate').value;
        const frequency = document.getElementById('settingsFrequency').value;
        const weeks = document.getElementById('settingsWeeks').value;
        
        // Save to localStorage
        localStorage.setItem('paymentSettings', JSON.stringify({
            startDate: startDate,
            frequency: frequency,
            payPeriodsToShow: parseInt(weeks)
        }));
        
        // Reload page to apply changes
        modal.remove();
        window.location.reload();
    });
}

// ========== STORAGE ==========
function saveBillsToStorage() { localStorage.setItem('bills', JSON.stringify(bills)); }
function loadBillsFromStorage() { const stored = localStorage.getItem('bills'); bills = stored ? JSON.parse(stored) : []; }