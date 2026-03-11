/**
 * Calendar View Module
 * Handles calendar rendering and navigation
 */

import { billStore } from '../store/BillStore.js';
import { appState } from '../store/appState.js';
import logger from '../utils/logger.js';

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

        let html = `
            <div class="flex items-center justify-between mb-6 px-2">
                <button id="prevMonth" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4">&lt; Prev</button>
                <h2 class="text-xl font-bold tracking-tight">${monthNames[month]} ${year}</h2>
                <button id="nextMonth" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4">Next &gt;</button>
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
        const currentBills = billStore.getAll();

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday =
                today.getDate() === day &&
                today.getMonth() === month &&
                today.getFullYear() === year;

            const billsDue = currentBills.filter(b => b.dueDate === dateStr);

            let billsHtml = '<div class="space-y-1 mt-1">';
            billsDue.forEach(b => {
                const isPaid = b.isPaid;
                const isOverdue =
                    !isPaid &&
                    new Date(dateStr) <
                    new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate()
                    );
                const statusClasses = isPaid
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                    : isOverdue
                        ? 'bg-destructive/15 text-destructive border-destructive/30'
                        : 'bg-primary/10 text-primary border-primary/20';

                billsHtml += `
                    <div class="px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate cursor-pointer transition-transform hover:scale-[1.02] ${statusClasses}" 
                         title="${b.name} - $${(b.amountDue || 0).toFixed(2)}" 
                         onclick="window.editBillGlobal('${b.id}')">
                        ${b.name}
                    </div>`;
            });
            billsHtml += '</div>';

            html += `
                <div class="relative bg-background p-2 min-h-[100px] hover:bg-accent/5 transition-colors ${isToday ? 'ring-2 ring-primary ring-inset z-10' : ''}">
                    <span class="text-xs font-bold ${isToday ? 'text-primary' : 'text-muted-foreground'}">${day}</span>
                    ${billsHtml}
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
        calendarView.innerHTML = html;

        // Attach event listeners
        document.getElementById('prevMonth').addEventListener('click', () => {
            const newDate = new Date(currentCalendarDate);
            newDate.setMonth(newDate.getMonth() - 1);
            appState.setCurrentCalendarDate(newDate);
            renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            const newDate = new Date(currentCalendarDate);
            newDate.setMonth(newDate.getMonth() + 1);
            appState.setCurrentCalendarDate(newDate);
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
    } catch (error) {
        logger.error('Error initializing calendar view', error);
    }
}
