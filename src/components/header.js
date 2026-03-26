/**
 * Initializes the header component with pay period selector and bill filters
 * 
 * @param {string[]} paychecks - Array of paycheck date strings (formatted dates)
 * @param {Object} actions - Object containing action handler functions
 * @param {Function} actions.onPaycheckSelect - Called when user selects a pay period (receives index)
 * @param {Function} actions.onAllBillsSelect - Called when user clicks "All Bills" button
 * @param {Function} actions.onFilterChange - Called when user changes payment filter (receives filter value: 'all'|'paid'|'unpaid')
 * @param {Function} [actions.onUpcomingBillsSelect] - Called when user clicks "Upcoming" button
 * @param {Function} [actions.onToggleCarriedForward] - Called when carried forward toggle changes
 * @param {Function} [actions.onDisplayModeSelect] - Called when display mode button is clicked
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
    header.className = "border-b bg-background py-3";
    const btnBase = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    const btnGhost = `${btnBase} hover:bg-accent hover:text-accent-foreground`;
    const btnOutline = `${btnBase} border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground`;
    const inputBase = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

    header.innerHTML = `
        <div class="px-4 sm:px-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
                <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">💰 Bill Tracker</h1>
                <p class="text-xs text-muted-foreground sm:text-sm" id="headerStatus" role="status" aria-live="polite" aria-atomic="true">Select a pay period to get started</p>
            </div>
            
            <div class="header-controls flex flex-wrap items-center gap-3 sm:gap-4">
                <div class="flex items-center gap-2">
                    <label for="payPeriodSelect" class="text-xs font-medium text-foreground sm:text-sm">Pay Period:</label>
                    <select id="payPeriodSelect" class="${inputBase} h-8 w-auto min-w-[180px] sm:h-9" aria-label="Select pay period" aria-describedby="payPeriodHelp">
                        <option value="">-- Choose a pay period --</option>
                        ${paychecks.map((c, i) => `<option value="${i}">${c}</option>`).join('')}
                    </select>
                    <span id="payPeriodHelp" class="sr-only">Choose when to view bills due between this paycheck and the next</span>
                </div>
                
                <div class="flex items-center gap-1.5 rounded-lg border bg-muted/50 p-1 shadow-sm">
                    <button id="allBillsBtn" class="${btnGhost} h-7 px-2.5 text-xs sm:h-8 sm:px-3 sm:text-sm" aria-label="View all bills" aria-pressed="false">📋 All Bills</button>
                    <button id="upcomingBillsBtn" class="${btnGhost} h-7 px-2.5 text-xs sm:h-8 sm:px-3 sm:text-sm" aria-label="View upcoming bills" aria-pressed="false">📅 Upcoming</button>
                </div>

                <button
                    id="mobileControlsToggle"
                    class="${btnOutline} h-8 px-3 text-xs sm:hidden"
                    aria-label="Show advanced filters"
                    aria-expanded="false"
                    aria-controls="headerAdvancedControls"
                >
                    ⚙️ More
                </button>

                <div id="headerAdvancedControls" class="flex items-center gap-3 sm:gap-4">
                    <div class="flex items-center gap-1 rounded-md bg-muted/50 p-1">
                        <button id="listViewBtn" class="${btnGhost} h-7 w-auto px-2 text-xs active" title="List View">📋 List</button>
                        <button id="calendarViewBtn" class="${btnGhost} h-7 w-auto px-2 text-xs" title="Calendar View">📅 Calendar</button>
                        <button id="analyticsViewBtn" class="${btnGhost} h-7 w-auto px-2 text-xs" title="Analytics View">📊 Analytics</button>
                    </div>

                    <div class="flex items-center gap-2">
                        <label for="paymentFilter" class="text-xs font-medium text-foreground sm:text-sm">Filter:</label>
                        <select id="paymentFilter" class="${inputBase} h-8 w-auto min-w-[80px] sm:h-9" aria-label="Filter bills by payment status">
                            <option value="all">All</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-2">
                        <label class="relative inline-flex cursor-pointer items-center transition-opacity hover:opacity-80">
                            <input type="checkbox" id="carriedForwardToggle" class="peer sr-only" checked>
                            <div class="peer h-5 w-9 rounded-full bg-muted transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring"></div>
                            <span class="ml-2 text-xs font-medium text-foreground sm:text-sm">Show Overdue</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;

    const payPeriodSelect = /** @type {HTMLSelectElement} */ (document.getElementById('payPeriodSelect'));
    const allBillsBtn = document.getElementById('allBillsBtn');
    const upcomingBillsBtn = document.getElementById('upcomingBillsBtn');
    const headerStatus = document.getElementById('headerStatus');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const analyticsViewBtn = document.getElementById('analyticsViewBtn');
    const headerControls = document.querySelector('.header-controls');
    const mobileControlsToggle = document.getElementById('mobileControlsToggle');
    const headerAdvancedControls = document.getElementById('headerAdvancedControls');

    let mobileControlsExpanded = false;

    const applyMobileControlsState = () => {
        const isMobile = window.innerWidth <= 768;

        if (!isMobile) {
            if (mobileControlsToggle) {
                mobileControlsToggle.setAttribute('aria-expanded', 'true');
                mobileControlsToggle.setAttribute('aria-label', 'Advanced filters shown');
                mobileControlsToggle.textContent = '⚙️ More';
            }
            if (headerControls) {
                headerControls.classList.remove('mobile-controls-collapsed');
                headerControls.classList.remove('mobile-controls-expanded');
            }
            if (headerAdvancedControls) headerAdvancedControls.hidden = false;
            return;
        }

        if (headerControls) {
            headerControls.classList.toggle('mobile-controls-expanded', mobileControlsExpanded);
            headerControls.classList.toggle('mobile-controls-collapsed', !mobileControlsExpanded);
        }
        if (headerAdvancedControls) headerAdvancedControls.hidden = !mobileControlsExpanded;

        if (mobileControlsToggle) {
            mobileControlsToggle.setAttribute('aria-expanded', mobileControlsExpanded ? 'true' : 'false');
            mobileControlsToggle.setAttribute(
                'aria-label',
                mobileControlsExpanded ? 'Hide advanced filters' : 'Show advanced filters'
            );
            mobileControlsToggle.textContent = mobileControlsExpanded ? '⚙️ Hide' : '⚙️ More';
        }
    };

    if (mobileControlsToggle) {
        mobileControlsToggle.addEventListener('click', () => {
            mobileControlsExpanded = !mobileControlsExpanded;
            applyMobileControlsState();
        });
    }

    window.addEventListener('resize', applyMobileControlsState);
    applyMobileControlsState();

    payPeriodSelect.addEventListener('change', (e) => {
        const sel = /** @type {HTMLSelectElement} */ (e.target);
        allBillsBtn.classList.remove('active');
        allBillsBtn.setAttribute('aria-pressed', 'false');
        upcomingBillsBtn.classList.remove('active');
        upcomingBillsBtn.setAttribute('aria-pressed', 'false');
        const selectedText = sel.options[sel.selectedIndex].text;
        headerStatus.textContent = `Viewing bills for: ${selectedText}`;
        actions.onPaycheckSelect(parseInt(sel.value));
    });

    allBillsBtn.addEventListener('click', () => {
        allBillsBtn.classList.add('active');
        allBillsBtn.setAttribute('aria-pressed', 'true');
        upcomingBillsBtn.classList.remove('active');
        upcomingBillsBtn.setAttribute('aria-pressed', 'false');
        payPeriodSelect.value = '';
        headerStatus.textContent = 'Viewing all bills';
        actions.onAllBillsSelect();
    });

    upcomingBillsBtn.addEventListener('click', () => {
        upcomingBillsBtn.classList.add('active');
        upcomingBillsBtn.setAttribute('aria-pressed', 'true');
        allBillsBtn.classList.remove('active');
        allBillsBtn.setAttribute('aria-pressed', 'false');
        headerStatus.textContent = 'Viewing upcoming bills';
        actions.onUpcomingBillsSelect();
    });

    document.getElementById('paymentFilter').addEventListener('change', (e) => {
        const sel = /** @type {HTMLSelectElement} */ (e.target);
        const filterText = sel.options[sel.selectedIndex].text;
        headerStatus.textContent = `Viewing ${filterText.toLowerCase()} bills`;
        actions.onFilterChange(sel.value);
    });

    document.getElementById('carriedForwardToggle').addEventListener('change', (e) => {
        actions.onToggleCarriedForward(/** @type {HTMLInputElement} */ (e.target).checked);
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
    const payPeriodSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('payPeriodSelect'));
    const allBillsBtn = document.getElementById('allBillsBtn');
    const upcomingBillsBtn = document.getElementById('upcomingBillsBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const analyticsViewBtn = document.getElementById('analyticsViewBtn');
    const carriedForwardToggle = /** @type {HTMLInputElement|null} */ (document.getElementById('carriedForwardToggle'));

    if (payPeriodSelect) {
        payPeriodSelect.value = selectedPaycheck !== null ? String(selectedPaycheck) : '';
    }

    if (viewMode === 'all') {
        allBillsBtn.classList.add('active');
        allBillsBtn.setAttribute('aria-pressed', 'true');
        if (upcomingBillsBtn) {
            upcomingBillsBtn.classList.remove('active');
            upcomingBillsBtn.setAttribute('aria-pressed', 'false');
        }
    } else if (viewMode === 'upcoming') {
        allBillsBtn.classList.remove('active');
        allBillsBtn.setAttribute('aria-pressed', 'false');
        if (upcomingBillsBtn) {
            upcomingBillsBtn.classList.add('active');
            upcomingBillsBtn.setAttribute('aria-pressed', 'true');
        }
    } else {
        allBillsBtn.classList.remove('active');
        allBillsBtn.setAttribute('aria-pressed', 'false');
        if (upcomingBillsBtn) {
            upcomingBillsBtn.classList.remove('active');
            upcomingBillsBtn.setAttribute('aria-pressed', 'false');
        }
    }

    if (displayMode && listViewBtn) {
        [listViewBtn, calendarViewBtn, analyticsViewBtn].forEach(btn => btn.classList.remove('active'));
        if (displayMode === 'list') listViewBtn.classList.add('active');
        if (displayMode === 'calendar') calendarViewBtn.classList.add('active');
        if (displayMode === 'analytics') analyticsViewBtn.classList.add('active');
    }

    if (carriedForwardToggle && typeof showCarriedForward !== 'undefined') {
        carriedForwardToggle.checked = showCarriedForward;
    }
};