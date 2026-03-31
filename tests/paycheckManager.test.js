import { it, expect } from 'vitest';
import { paycheckManager } from '../src/utils/paycheckManager.js';
import { billStore } from '../src/store/BillStore.js';
import { formatLocalDate } from '../src/utils/dates.js';

const today = new Date();
const formatDateString = (date) => date.toISOString().split('T')[0];

it('should validate settings with valid data', () => {
    const result = paycheckManager.validateSettings({
        startDate: '2025-01-08',
        frequency: 'bi-weekly',
        payPeriodsToShow: 4
    });
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
});

it('should validate settings and catch missing startDate', () => {
    const result = paycheckManager.validateSettings({ frequency: 'bi-weekly', payPeriodsToShow: 4 });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
});

it('should validate settings and catch invalid frequency', () => {
    const result = paycheckManager.validateSettings({ startDate: '2025-01-08', frequency: 'invalid', payPeriodsToShow: 4 });
    expect(result.isValid).toBe(false);
});

it('should generate paycheck dates correctly', () => {
    paycheckManager.updateSettings({ startDate: formatDateString(today), frequency: 'bi-weekly', payPeriodsToShow: 3 });
    const paychecks = paycheckManager.generatePaycheckDates();
    expect(paychecks.length).toBe(3);
});

it('should get paycheck labels for dates', () => {
    paycheckManager.updateSettings({ startDate: formatDateString(today), frequency: 'weekly', payPeriodsToShow: 2 });
    paycheckManager.generatePaycheckDates();
    const labels = paycheckManager.getPaycheckLabels();
    expect(labels.length).toBe(2);
    expect(typeof labels[0]).toBe('string');
});

it('should handle weekly frequency', () => {
    paycheckManager.updateSettings({ startDate: formatDateString(today), frequency: 'weekly', payPeriodsToShow: 2 });
    const paychecks = paycheckManager.generatePaycheckDates();
    expect(paychecks.length).toBe(2);
});

it('should handle bi-weekly frequency', () => {
    paycheckManager.updateSettings({ startDate: formatDateString(today), frequency: 'bi-weekly', payPeriodsToShow: 2 });
    const paychecks = paycheckManager.generatePaycheckDates();
    expect(paychecks.length).toBe(2);
});

it('should handle monthly frequency', () => {
    paycheckManager.updateSettings({ startDate: formatDateString(today), frequency: 'monthly', payPeriodsToShow: 2 });
    const paychecks = paycheckManager.generatePaycheckDates();
    expect(paychecks.length).toBe(2);
});

it('should backfill multiple weekly recurring instances within a bi-weekly pay period', () => {
    paycheckManager.updateSettings({
        startDate: formatDateString(today),
        frequency: 'bi-weekly',
        payPeriodsToShow: 3
    });

    const firstPayDate = paycheckManager.payCheckDates[0];
    const secondPayDate = paycheckManager.payCheckDates[1];

    billStore.setBills([
        {
            id: 'weekly-base',
            name: 'Gym Membership',
            category: 'Health',
            dueDate: formatLocalDate(firstPayDate),
            amountDue: 25,
            balance: 25,
            recurrence: 'Weekly',
            reminderEnabled: true,
            isPaid: false,
            paymentHistory: []
        }
    ]);

    const added = paycheckManager.addMissingRecurringBillInstances();
    const weeklyBillsInFirstPeriod = billStore.getAll().filter((bill) => {
        if (bill.name !== 'Gym Membership') return false;
        const due = new Date(bill.dueDate);
        return due >= firstPayDate && due < secondPayDate;
    });

    expect(added).toBeGreaterThan(0);
    expect(weeklyBillsInFirstPeriod.length).toBeGreaterThan(1);

    billStore.setBills([]);
});
