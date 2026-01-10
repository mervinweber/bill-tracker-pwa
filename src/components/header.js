export const initializeHeader = (paychecks, actions) => {
    const header = document.getElementById('header');
    header.innerHTML = `
        <div class="header-top">
            <div class="header-title">
                <h1>💰 Bill Tracker</h1>
                <p class="header-subtitle" id="headerStatus" role="status" aria-live="polite" aria-atomic="true">Select a pay period to get started</p>
            </div>
            
            <div class="header-controls">
                <div class="pay-period-group">
                    <label for="payPeriodSelect" class="control-label">Pay Period:</label>
                    <select id="payPeriodSelect" class="pay-period-select" aria-label="Select pay period" aria-describedby="payPeriodHelp">
                        <option value="">-- Choose a pay period --</option>
                        ${paychecks.map((c, i) => `<option value="${i}">${c}</option>`).join('')}
                    </select>
                    <span id="payPeriodHelp" class="sr-only">Choose when to view bills due between this paycheck and the next</span>
                </div>
                
                <div class="view-controls">
                    <button id="allBillsBtn" class="view-btn" aria-label="View all bills" aria-pressed="false">📋 All Bills</button>
                </div>
                
                <div class="filter-group">
                    <label for="paymentFilter" class="control-label">Filter:</label>
                    <select id="paymentFilter" class="payment-filter-dropdown" aria-label="Filter bills by payment status">
                        <option value="all">All</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    const payPeriodSelect = document.getElementById('payPeriodSelect');
    const allBillsBtn = document.getElementById('allBillsBtn');
    const headerStatus = document.getElementById('headerStatus');

    payPeriodSelect.addEventListener('change', (e) => {
        allBillsBtn.classList.remove('active');
        allBillsBtn.setAttribute('aria-pressed', 'false');
        const selectedText = e.target.options[e.target.selectedIndex].text;
        headerStatus.textContent = `Viewing bills for: ${selectedText}`;
        actions.onPaycheckSelect(parseInt(e.target.value));
    });

    allBillsBtn.addEventListener('click', () => {
        allBillsBtn.classList.add('active');
        allBillsBtn.setAttribute('aria-pressed', 'true');
        payPeriodSelect.value = '';
        headerStatus.textContent = 'Viewing all bills';
        actions.onAllBillsSelect();
    });

    document.getElementById('paymentFilter').addEventListener('change', (e) => {
        const filterText = e.target.options[e.target.selectedIndex].text;
        headerStatus.textContent = `Viewing ${filterText.toLowerCase()} bills`;
        actions.onFilterChange(e.target.value);
    });
};

export const updateHeaderUI = (viewMode, selectedPaycheck) => {
    const payPeriodSelect = document.getElementById('payPeriodSelect');
    const allBillsBtn = document.getElementById('allBillsBtn');
    
    if (viewMode === 'all') {
        allBillsBtn.classList.add('active');
        allBillsBtn.setAttribute('aria-pressed', 'true');
    } else {
        allBillsBtn.classList.remove('active');
        allBillsBtn.setAttribute('aria-pressed', 'false');
        if (payPeriodSelect && selectedPaycheck !== null) {
            payPeriodSelect.value = selectedPaycheck;
        }
    }
};