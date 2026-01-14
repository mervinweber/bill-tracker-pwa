export function initializeCalendar() {
    // Optional: Add any initial setup for the calendar view if needed
}

export function renderCalendar(data, actions) {
    const { bills, currentCalendarDate } = data;
    const { onPrevMonth, onNextMonth, onEditBill } = actions;

    const calendarView = document.getElementById('calendarView');
    if (!calendarView) return;

    calendarView.style.display = 'block';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 is Sunday

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let html = `
        <div class="calendar-header">
            <button id="prevMonth" class="calendar-nav-btn">&lt; Prev</button>
            <h2>${monthNames[month]} ${year}</h2>
            <button id="nextMonth" class="calendar-nav-btn">Next &gt;</button>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-header">Sun</div>
            <div class="calendar-day-header">Mon</div>
            <div class="calendar-day-header">Tue</div>
            <div class="calendar-day-header">Wed</div>
            <div class="calendar-day-header">Thu</div>
            <div class="calendar-day-header">Fri</div>
            <div class="calendar-day-header">Sat</div>
    `;

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDay; i++) {
        html += `<div class="calendar-day other-month"><span class="calendar-day-number">${prevMonthLastDay - startingDay + 1 + i}</span></div>`;
    }

    // Current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

        // Find bills due on this day
        const billsDue = bills.filter(b => b.dueDate === dateStr);

        let billsHtml = '<div class="calendar-bills">';
        billsDue.forEach(b => {
            const isPaid = b.isPaid;
            const billDate = new Date(dateStr);
            billDate.setHours(0, 0, 0, 0);
            const isOverdue = !isPaid && billDate < today;
            const statusClass = isPaid ? 'paid' : (isOverdue ? 'overdue' : '');
            billsHtml += `<div class="calendar-bill ${statusClass}" title="${b.name} - $${(b.amountDue || 0).toFixed(2)}" data-bill-id="${b.id}">${b.name}</div>`;
        });
        billsHtml += '</div>';

        html += `<div class="calendar-day ${isToday ? 'today' : ''}">
            <span class="calendar-day-number">${day}</span>
            ${billsHtml}
        </div>`;
    }

    // Next month filler days
    const totalCells = startingDay + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
        html += `<div class="calendar-day other-month"><span class="calendar-day-number">${i}</span></div>`;
    }

    html += '</div>';
    calendarView.innerHTML = html;

    // Attach Event Listeners
    document.getElementById('prevMonth').addEventListener('click', onPrevMonth);
    document.getElementById('nextMonth').addEventListener('click', onNextMonth);

    calendarView.querySelectorAll('.calendar-bill').forEach(billEl => {
        billEl.addEventListener('click', (e) => {
            onEditBill(e.target.dataset.billId);
        });
    });
}
