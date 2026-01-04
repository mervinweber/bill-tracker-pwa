export const initializeHeader = (paychecks, actions) => {
    const header = document.getElementById('header');
    header.innerHTML = `
        <div class="header-top">
            <div style="display: flex; align-items: center; gap: 15px;">
                <h1>Bill Tracker</h1>
                <select id="payPeriodSelect" class="pay-period-select">
                    ${paychecks.map((c, i) => `<option value="${i}">${c}</option>`).join('')}
                </select>
            </div>
            
            <div class="view-controls">
                <button id="allBillsBtn" class="view-btn">📋 All Bills</button>
                <div class="filter-group">
                    <label for="paymentFilter">Filter:</label>
                    <select id="paymentFilter" class="payment-filter-dropdown">
                        <option value="all">All</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    const payPeriodSelect = document.getElementById('payPeriodSelect');

    payPeriodSelect.addEventListener('change', (e) => {
        document.getElementById('allBillsBtn').classList.remove('active');
        actions.onPaycheckSelect(parseInt(e.target.value));
    });

    document.getElementById('allBillsBtn').addEventListener('click', () => {
        document.getElementById('allBillsBtn').classList.add('active');
        // Optional: clear select or keep last selected? Using a visual cue is better.
        // We'll keep the select value but maybe style it differently or just let the button state indicate mode.
        payPeriodSelect.value = ''; // Or keep it
        actions.onAllBillsSelect();
    });

    document.getElementById('paymentFilter').addEventListener('change', (e) => {
        actions.onFilterChange(e.target.value);
    });
};

export const updateHeaderUI = (viewMode, selectedPaycheck) => {
    const payPeriodSelect = document.getElementById('payPeriodSelect');
    if (viewMode === 'all') {
        document.getElementById('allBillsBtn').classList.add('active');
    } else {
        document.getElementById('allBillsBtn').classList.remove('active');
        if (payPeriodSelect && selectedPaycheck !== null) {
            payPeriodSelect.value = selectedPaycheck;
        }
    }
};