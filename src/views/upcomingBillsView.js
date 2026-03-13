import { createLocalDate } from '../utils/dates.js';

const toCurrency = (value) => `$${(value || 0).toFixed(2)}`;

const getCoverageSummary = (totalDue, paycheckAmountRaw) => {
    const paycheckAmount = Number.parseFloat(paycheckAmountRaw);
    if (!Number.isFinite(paycheckAmount) || paycheckAmount <= 0) {
        return {
            hasAmount: false,
            label: 'Add paycheck amount in settings to see coverage',
            value: null,
            statusClass: 'unconfigured'
        };
    }

    const difference = paycheckAmount - totalDue;
    const isCovered = difference >= 0;

    return {
        hasAmount: true,
        label: isCovered ? 'Paycheck Coverage' : 'Paycheck Shortfall',
        value: toCurrency(Math.abs(difference)),
        statusClass: isCovered ? 'covered' : 'short'
    };
};

const getUpcomingBills = (bills = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bills
        .filter((bill) => {
            const dueDate = createLocalDate(bill.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return !bill.isPaid && dueDate >= today;
        })
        .sort((a, b) => createLocalDate(a.dueDate).getTime() - createLocalDate(b.dueDate).getTime());
};

export function initializeUpcomingBillsView() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    if (!document.getElementById('upcomingBillsView')) {
        const upcomingDiv = document.createElement('div');
        upcomingDiv.id = 'upcomingBillsView';
        upcomingDiv.className = 'upcoming-bills-container';
        upcomingDiv.style.display = 'none';
        main.appendChild(upcomingDiv);
    }
}

export function renderUpcomingBills({ bills }, actions) {
    const upcomingContainer = document.getElementById('upcomingBillsView');
    if (!upcomingContainer) return;

    const upcomingBills = getUpcomingBills(bills);
    const totalDue = upcomingBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);
    const paycheckAmountRaw = actions?.paycheckAmount;
    const coverage = getCoverageSummary(totalDue, paycheckAmountRaw);

    if (upcomingBills.length === 0) {
        upcomingContainer.innerHTML = `
            <section class="upcoming-bills-shell" aria-label="Upcoming bills">
                <div class="upcoming-bills-header">
                    <h2>📅 Upcoming Bills</h2>
                    <p>All upcoming unpaid bills in one place.</p>
                </div>
                <div class="upcoming-empty-state" role="status" aria-live="polite">
                    No upcoming unpaid bills. You’re all caught up.
                </div>
                <div class="upcoming-total-footer" role="note" aria-label="Total upcoming amount due">
                    <span>Total Upcoming Due</span>
                    <strong>${toCurrency(0)}</strong>
                </div>
                <div class="upcoming-coverage-row ${coverage.statusClass}" role="note" aria-label="Paycheck coverage">
                    <span>${coverage.label}</span>
                    <strong>${coverage.hasAmount ? coverage.value : '—'}</strong>
                </div>
            </section>
        `;
        return;
    }

    const listMarkup = upcomingBills.map((bill) => `
        <article class="upcoming-bill-card" data-bill-id="${bill.id}">
            <div class="upcoming-bill-main">
                <h3>${bill.name}</h3>
                <p class="upcoming-bill-meta">${bill.category} • Due ${bill.dueDate}</p>
            </div>
            <div class="upcoming-bill-amount">${toCurrency(bill.amountDue)}</div>
            <div class="upcoming-bill-actions">
                <label class="upcoming-date-label" for="dueDate-${bill.id}">Due date</label>
                <input id="dueDate-${bill.id}" class="upcoming-date-input" type="date" value="${bill.dueDate}" aria-label="Due date for ${bill.name}">
                <button class="view-btn upcoming-update-btn" data-action="update-date">Update Date</button>
                <button class="view-btn upcoming-edit-btn" data-action="edit-bill">Edit</button>
                <button class="view-btn upcoming-paid-btn" data-action="mark-paid">Mark Paid</button>
            </div>
        </article>
    `).join('');

    upcomingContainer.innerHTML = `
        <section class="upcoming-bills-shell" aria-label="Upcoming bills">
            <div class="upcoming-bills-header">
                <h2>📅 Upcoming Bills</h2>
                <p>See what’s coming up, update dates, and mark bills paid.</p>
            </div>
            <div class="upcoming-bills-list" role="list">
                ${listMarkup}
            </div>
            <div class="upcoming-total-footer" role="note" aria-label="Total upcoming amount due">
                <span>Total Upcoming Due</span>
                <strong>${toCurrency(totalDue)}</strong>
            </div>
            <div class="upcoming-coverage-row ${coverage.statusClass}" role="note" aria-label="Paycheck coverage">
                <span>${coverage.label}</span>
                <strong>${coverage.hasAmount ? coverage.value : '—'}</strong>
            </div>
        </section>
    `;

    upcomingContainer.querySelectorAll('.upcoming-bill-card').forEach((card) => {
        const billId = card.getAttribute('data-bill-id');
        const dueDateInput = /** @type {HTMLInputElement|null} */ (card.querySelector('.upcoming-date-input'));
        const updateDateBtn = card.querySelector('[data-action="update-date"]');
        const editBtn = card.querySelector('[data-action="edit-bill"]');
        const paidBtn = card.querySelector('[data-action="mark-paid"]');

        updateDateBtn?.addEventListener('click', () => {
            if (!billId || !dueDateInput?.value) return;
            actions.onUpdateDueDate?.(billId, dueDateInput.value);
        });

        editBtn?.addEventListener('click', () => {
            if (!billId) return;
            actions.onEditBill?.(billId);
        });

        paidBtn?.addEventListener('click', () => {
            if (!billId) return;
            actions.onTogglePayment?.(billId, true);
        });
    });
}
