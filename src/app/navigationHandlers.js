/**
 * Navigation Handlers
 * Handles filter/view mode changes, category selection, paycheck selection,
 * and bill form opening. All handlers are pure functions that delegate to appState.
 */

import { appState } from '../store/appState.js';
import { paycheckManager } from '../utils/paycheckManager.js';
import { resetBillForm, openBillForm } from '../components/billForm.js';

export function handlePaycheckSelect(index) {
    appState.setViewMode('filtered');
    appState.setSelectedPaycheck(index);

    const selectedPaycheckDate = paycheckManager.payCheckDates[index];
    if (selectedPaycheckDate) {
        appState.setCurrentCalendarDate(new Date(selectedPaycheckDate));
    }
}

export function handleFilterChange(filter) {
    appState.setPaymentFilter(filter);
}

export function handleToggleCarriedForward(show) {
    appState.setShowCarriedForward(show);
}

export function handleAllBillsSelect() {
    appState.setViewMode('all');
    appState.setCurrentCalendarDate(new Date());
}

export function handleUpcomingBillsSelect() {
    appState.setViewMode('upcoming');
    appState.setDisplayMode('list');
}

export function handleCategorySelect(category) {
    appState.setSelectedCategory(category);
    appState.setViewMode('filtered');
    appState.setDisplayMode('list');
}

export function handleDisplayModeSelect(mode) {
    appState.setDisplayMode(mode);
}

export function handleOpenAddBill() {
    resetBillForm();
    openBillForm({
        id: '',
        category: '',
        name: '',
        dueDate: '',
        amountDue: '',
        balance: '',
        recurrence: '',
        reminderEnabled: true,
        notes: '',
        website: ''
    });
}
