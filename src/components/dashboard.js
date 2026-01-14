export const initializeDashboard = () => {
    // Dashboard container is already in HTML, nothing to init
    renderDashboard([], 'all', null, null, 'all', []);
};

export const renderDashboard = ({ bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates }) => {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    // Calculate metrics
    let displayBills = bills;

    // Filter by payment status
    if (paymentFilter === 'unpaid') {
        displayBills = displayBills.filter(b => !b.isPaid);
    } else if (paymentFilter === 'paid') {
        displayBills = displayBills.filter(b => b.isPaid);
    }
    // if 'all', no filtering needed

    // In filtered mode, further filter by current paycheck and category
    if (viewMode === 'filtered' && selectedPaycheck !== null && selectedCategory !== null) {
        const currentPaycheckDate = payCheckDates[selectedPaycheck];
        const nextPaycheckDate = selectedPaycheck < payCheckDates.length - 1 ? payCheckDates[selectedPaycheck + 1] : new Date(2026, 2, 5);
        displayBills = displayBills.filter(bill => {
            const billDate = new Date(bill.dueDate);
            return bill.category === selectedCategory && billDate >= currentPaycheckDate && billDate < nextPaycheckDate;
        });
    }

    const totalBills = displayBills.length;
    const totalAmountDue = displayBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const unpaidBills = displayBills.filter(b => !b.isPaid);
    const totalUnpaidAmount = unpaidBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);

    // Calculate overdue bills (due date < today and not paid)
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
                <div class="card-content">
                    <div class="card-value">${totalBills}</div>
                    <div class="card-label">Total Bills</div>
                </div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon">💰</div>
                <div class="card-content">
                    <div class="card-value">$${totalAmountDue.toFixed(2)}</div>
                    <div class="card-label">Total Due</div>
                </div>
            </div>
            <div class="dashboard-card unpaid">
                <div class="card-icon">⚠️</div>
                <div class="card-content">
                    <div class="card-value">${unpaidBills.length}</div>
                    <div class="card-label">Unpaid</div>
                </div>
            </div>
            <div class="dashboard-card unpaid-amount">
                <div class="card-icon">💳</div>
                <div class="card-content">
                    <div class="card-value">$${totalUnpaidAmount.toFixed(2)}</div>
                    <div class="card-label">Unpaid Amt</div>
                </div>
            </div>
            <div class="dashboard-card overdue">
                <div class="card-icon">🔴</div>
                <div class="card-content">
                    <div class="card-value">${overdueBills.length}</div>
                    <div class="card-label">Overdue</div>
                </div>
            </div>
        </div>
    `;
};
