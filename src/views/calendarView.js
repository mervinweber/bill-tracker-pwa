/**
 * Calendar View Module
 * Handles calendar rendering and navigation
 */

import { billStore } from '../store/BillStore.js';
import { appState } from '../store/appState.js';
import logger from '../utils/logger.js';

let renderedMonthKey = null;
let dayCellMap = new Map();

function getMonthKey(year, month) {
    return `${year}-${month}`;
}

function getDateString(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isOverdueDate(dateStr, today) {
    return new Date(dateStr) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function buildDayBadges(billsDue, dateStr, today) {
    const container = document.createElement('div');
    container.className = 'space-y-1 mt-1';

    billsDue.forEach((bill) => {
        const isPaid = bill.isPaid;
        const isOverdue = !isPaid && isOverdueDate(dateStr, today);
        const statusClasses = isPaid
            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
            : isOverdue
                ? 'bg-destructive/15 text-destructive border-destructive/30'
                : 'bg-primary/10 text-primary border-primary/20';

        const badge = document.createElement('div');
        badge.className = `px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate cursor-pointer transition-transform hover:scale-[1.02] ${statusClasses}`;
        badge.title = `${bill.name} - $${(bill.amountDue || 0).toFixed(2)}`;
        badge.textContent = bill.name;
        badge.addEventListener('click', () => window.editBillGlobal?.(bill.id));
        container.appendChild(badge);
    });

    return container;
}

function buildDueListItem(bill, dateStr, today) {
    const isPaid = bill.isPaid;
    const isOverdue = !isPaid && isOverdueDate(dateStr, today);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `w-full rounded-lg border px-3 py-2 text-left text-xs shadow-sm transition hover:bg-accent/40 ${
        isPaid
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : isOverdue
                ? 'border-destructive/20 bg-destructive/5 text-destructive'
                : 'border-border bg-background text-foreground'
    }`;
    item.innerHTML = `
        <div class="flex items-center justify-between gap-2">
            <span class="font-semibold">${bill.name}</span>
            <span class="font-mono text-[11px]">$${(bill.amountDue || 0).toFixed(2)}</span>
        </div>
        <div class="mt-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] opacity-70">
            <span>${bill.category || 'Uncategorized'}</span>
            <span>${dateStr}</span>
        </div>
    `;
    item.addEventListener('click', () => window.editBillGlobal?.(bill.id));
    return item;
}

function updateCalendarDayCells(year, month) {
    const today = new Date();
    const currentBills = billStore.getAll();
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = dayCellMap.get(day);
        if (!cell) continue;

        const dateStr = getDateString(year, month, day);
        const billsDue = currentBills.filter((bill) => bill.dueDate === dateStr);

        const oldList = cell.querySelector('.space-y-1.mt-1');
        if (oldList) oldList.remove();

        const billsMarkup = buildDayBadges(billsDue, dateStr, today);
        cell.appendChild(billsMarkup);
    }
}

function attachMonthNavigationHandlers(currentCalendarDate) {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    if (prevBtn) {
        prevBtn.onclick = () => {
            const newDate = new Date(currentCalendarDate);
            newDate.setMonth(newDate.getMonth() - 1);
            appState.setCurrentCalendarDate(newDate);
            renderCalendar();
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            const newDate = new Date(currentCalendarDate);
            newDate.setMonth(newDate.getMonth() + 1);
            appState.setCurrentCalendarDate(newDate);
            renderCalendar();
        };
    }
}

/**
 * Render calendar view
 */
export function renderCalendar() {
    try {
        const calendarView = document.getElementById('calendarView');

        if (!calendarView) {
            throw new Error('Calendar view container not found in DOM');
        }

        const currentCalendarDate = appState.getState('currentCalendarDate');
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const monthKey = getMonthKey(year, month);
        const currentBills = billStore.getAll();

        // Incremental path: if month has not changed, only patch day-cell bill content.
        if (renderedMonthKey === monthKey && dayCellMap.size > 0) {
            updateCalendarDayCells(year, month);
            return;
        }

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ];
        const monthBills = currentBills.filter((bill) => {
            const dueDate = new Date(bill.dueDate);
            return dueDate.getFullYear() === year && dueDate.getMonth() === month;
        });
        const overdueBills = monthBills.filter((bill) => !bill.isPaid && isOverdueDate(bill.dueDate, today));
        const upcomingBills = monthBills
            .filter((bill) => !bill.isPaid && !isOverdueDate(bill.dueDate, today))
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 5);
        const monthTotal = monthBills.reduce((sum, bill) => sum + (bill.amountDue || 0), 0);

        let html = `
            <div class="mb-4 rounded-2xl border bg-card px-4 py-3 shadow-sm">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div class="flex items-center justify-between gap-2">
                        <button id="prevMonth" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4">&lt; Prev</button>
                        <h2 class="px-2 text-xl font-bold tracking-tight">${monthNames[month]} ${year}</h2>
                        <button id="nextMonth" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4">Next &gt;</button>
                    </div>
                    <div class="grid grid-cols-3 gap-2 sm:min-w-[320px]">
                        <div class="rounded-xl border border-border bg-background px-3 py-2">
                            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Bills</div>
                            <div class="mt-1 text-lg font-semibold">${monthBills.length}</div>
                        </div>
                        <div class="rounded-xl border border-border bg-background px-3 py-2">
                            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Overdue</div>
                            <div class="mt-1 text-lg font-semibold text-destructive">${overdueBills.length}</div>
                        </div>
                        <div class="rounded-xl border border-border bg-background px-3 py-2">
                            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Total</div>
                            <div class="mt-1 text-lg font-semibold">$${monthTotal.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-muted shadow-sm shadow-black/5 ring-1 ring-muted mb-4" role="grid">
                <div class="bg-background py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">Sun</div>
                <div class="bg-background py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">Mon</div>
                <div class="bg-background py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">Tue</div>
                <div class="bg-background py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">Wed</div>
                <div class="bg-background py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">Thu</div>
                <div class="bg-background py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">Fri</div>
                <div class="bg-background py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">Sat</div>
        `;

        // Previous month filler days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = 0; i < startingDay; i++) {
            html += `<div class="bg-muted/30 p-2 min-h-[100px] text-muted-foreground/40 opacity-50 shrink-0 select-none">
                        <span class="text-xs font-medium">${prevMonthLastDay - startingDay + 1 + i}</span>
                     </div>`;
        }

        // Current month days
        const today = new Date();

        for (let day = 1; day <= daysInMonth; day++) {
            const isToday =
                today.getDate() === day &&
                today.getMonth() === month &&
                today.getFullYear() === year;

            html += `
                <div class="relative bg-background p-2 min-h-[100px] hover:bg-accent/5 transition-colors ${isToday ? 'ring-2 ring-primary ring-inset z-10' : ''}" data-day="${day}">
                    <span class="text-xs font-bold ${isToday ? 'text-primary' : 'text-muted-foreground'}">${day}</span>
                </div>`;
        }

        // Next month filler days
        const totalCells = startingDay + daysInMonth;
        const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remainingCells; i++) {
            html += `<div class="bg-muted/30 p-2 min-h-[100px] text-muted-foreground/40 opacity-50 shrink-0 select-none">
                        <span class="text-xs font-medium">${i}</span>
                     </div>`;
        }

        html += '</div>';
        if (upcomingBills.length > 0) {
            html += `
                <div class="mb-4 rounded-2xl border bg-card px-4 py-3 shadow-sm">
                    <div class="flex items-center justify-between gap-2">
                        <div>
                            <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Agenda</div>
                            <div class="mt-1 text-sm font-medium text-foreground">Next bills coming up this month</div>
                        </div>
                        <button id="calendarTodayBtn" type="button" class="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">Today</button>
                    </div>
                    <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        ${upcomingBills.map((bill) => buildDueListItem(bill, bill.dueDate, today).outerHTML).join('')}
                    </div>
                </div>
            `;
        }
        calendarView.innerHTML = html;

        renderedMonthKey = monthKey;
        dayCellMap = new Map();

        calendarView.querySelectorAll('[data-day]').forEach((cell) => {
            const day = Number.parseInt(cell.getAttribute('data-day') || '', 10);
            if (Number.isFinite(day)) {
                dayCellMap.set(day, cell);
            }
        });

        updateCalendarDayCells(year, month);
        attachMonthNavigationHandlers(currentCalendarDate);
        document.getElementById('calendarTodayBtn')?.addEventListener('click', () => {
            appState.setCurrentCalendarDate(new Date());
            renderCalendar();
        });
    } catch (error) {
        logger.error('Error rendering calendar', error);
        const calendarView = document.getElementById('calendarView');
        if (calendarView) {
            calendarView.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
                    <p class="font-bold">Error rendering calendar</p>
                    <p class="text-sm opacity-80">${error.message}</p>
                </div>`;
        }
    }
}

/**
 * Initialize calendar view DOM
 */
export function initializeCalendarView() {
    try {
        const main = document.getElementById('mainContent');
        if (!main) {
            throw new Error('Main content container not found');
        }

        if (!document.getElementById('calendarView')) {
            const calendarDiv = document.createElement('div');
            calendarDiv.id = 'calendarView';
            calendarDiv.className = 'p-4 sm:p-6 transition-all duration-300';
            main.appendChild(calendarDiv);
        }

        // Ensure stale cached mapping is cleared if view is re-initialized.
        renderedMonthKey = null;
        dayCellMap = new Map();
    } catch (error) {
        logger.error('Error initializing calendar view', error);
    }
}
