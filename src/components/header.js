/**
 * Initializes the header component with pay period selector and bill filters
 * 
 * @param {string[]} paychecks - Array of paycheck date strings (formatted dates)
 * @param {Object} actions - Object containing action handler functions
 * @param {Function} actions.onPaycheckSelect - Called when user selects a pay period (receives index)
 * @param {Function} actions.onAllBillsSelect - Called when user clicks "All Bills" button
 * @param {Function} actions.onFilterChange - Called when user changes payment filter (receives filter value: 'all'|'paid'|'unpaid')
 * @returns {void}
 * @description Sets up the header with:
 *   - Live status region for screen reader announcements
 *   - Pay period dropdown with accessible labels
 *   - "All Bills" view toggle button with aria-pressed state
 *   - Payment status filter dropdown
 *   - All interactive elements properly labeled for accessibility (WCAG 2.1 Level AA)
 */
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
                
                <div class="display-mode-controls" style="display: flex; gap: 5px; background: rgba(0,0,0,0.1); padding: 4px; border-radius: 8px;">
                    <button id="listViewBtn" class="view-btn active" title="List View">📋 List</button>
                    <button id="calendarViewBtn" class="view-btn" title="Calendar View">📅 Calendar</button>
                    <button id="analyticsViewBtn" class="view-btn" title="Analytics View">📊 Analytics</button>
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

                <div class="toggle-group" style="display: flex; align-items: center; gap: 8px;">
                    <label class="switch-container" style="display: flex; align-items: center; cursor: pointer; font-size: 13px; font-weight: 500;">
                        <input type="checkbox" id="carriedForwardToggle" checked style="margin-right: 5px;">
                        <span>Show Overdue</span>
                    </label>
                </div>
            </div>
        </div>
    `;

    const payPeriodSelect = document.getElementById('payPeriodSelect');
    const allBillsBtn = document.getElementById('allBillsBtn');
    const headerStatus = document.getElementById('headerStatus');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const analyticsViewBtn = document.getElementById('analyticsViewBtn');

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

    document.getElementById('carriedForwardToggle').addEventListener('change', (e) => {
        actions.onToggleCarriedForward(e.target.checked);
    });

    // Display mode buttons
    const setDisplayModeActive = (mode) => {
        [listViewBtn, calendarViewBtn, analyticsViewBtn].forEach(btn => btn.classList.remove('active'));
        if (mode === 'list') listViewBtn.classList.add('active');
        if (mode === 'calendar') calendarViewBtn.classList.add('active');
        if (mode === 'analytics') analyticsViewBtn.classList.add('active');
    };

    listViewBtn.onclick = () => {
        setDisplayModeActive('list');
        actions.onDisplayModeSelect('list');
    };
    calendarViewBtn.onclick = () => {
        setDisplayModeActive('calendar');
        actions.onDisplayModeSelect('calendar');
    };
    analyticsViewBtn.onclick = () => {
        setDisplayModeActive('analytics');
        actions.onDisplayModeSelect('analytics');
    };
};

/**
 * Updates the header UI to reflect the current view mode and selected pay period
 * 
 * @param {string} viewMode - Current view mode ('all' for all bills, or specific paycheck index)
 * @param {number|null} selectedPaycheck - Index of selected paycheck, or null if viewing all bills
 * @param {string} displayMode - Current display mode ('list', 'calendar', 'analytics')
 * @param {boolean} showCarriedForward - Whether to show carried forward bills
 * @returns {void}
 */
export const updateHeaderUI = (viewMode, selectedPaycheck, displayMode, showCarriedForward) => {
    const payPeriodSelect = document.getElementById('payPeriodSelect');
    const allBillsBtn = document.getElementById('allBillsBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const analyticsViewBtn = document.getElementById('analyticsViewBtn');
    const carriedForwardToggle = document.getElementById('carriedForwardToggle');

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

    if (displayMode && listViewBtn) {
        [listViewBtn, calendarViewBtn, analyticsViewBtn].forEach(btn => btn.classList.remove('active'));
        if (displayMode === 'list') listViewBtn.classList.add('active');
        if (displayMode === 'calendar') calendarViewBtn.classList.add('active');
        if (displayMode === 'analytics') analyticsViewBtn.classList.add('active');
    }
};