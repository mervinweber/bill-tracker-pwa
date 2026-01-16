/**
 * Calendar View Module
 * Handles calendar rendering and navigation
 */

import { billStore } from '../store/BillStore.js';
import { appState } from '../store/appState.js';

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
            html += `<div class="calendar-day other-month"><span class="calendar-day-number">${prevMonthLastDay - startingDay + 1 + i
                }</span></div>`;
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

            let billsHtml = '<div class="calendar-bills">';
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
                const statusClass = isPaid ? 'paid' : isOverdue ? 'overdue' : '';
                billsHtml += `<div class="calendar-bill ${statusClass}" title="${b.name} - $${(
                    b.amountDue || 0
                ).toFixed(2)}" onclick="window.editBillGlobal('${b.id}')" style="cursor: pointer;">${b.name
                    }</div>`;
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
        console.error('Error rendering calendar:', error);
        const calendarView = document.getElementById('calendarView');
        if (calendarView) {
            calendarView.innerHTML = `<div style="padding: 20px; color: var(--danger-color);">Error rendering calendar: ${error.message}</div>`;
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
            calendarDiv.className = 'calendar-container';
            main.appendChild(calendarDiv);
        }
    } catch (error) {
        console.error('Error initializing calendar view:', error);
    }
}
