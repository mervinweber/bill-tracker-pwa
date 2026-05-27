import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { getRemainingBalance } from '../src/utils/billHelpers.js';
import { deleteBill, validateBill } from '../src/handlers/billActionHandlers.js';
import { billStore } from '../src/store/BillStore.js';

const mockBill = {
    id: 'bill_001',
    name: 'Electric Bill',
    category: 'Utilities',
    dueDate: '2026-03-15',
    amountDue: 100,
    balance: 100,
    recurrence: 'Monthly',
    isPaid: false,
    paymentHistory: []
};

const getTotalPaid = (bill) => (bill.paymentHistory || []).reduce((sum, p) => sum + (p.amount || 0), 0);

it('should calculate remaining balance for unpaid bill', () => {
    expect(getRemainingBalance(mockBill)).toBe(100);
});

it('should calculate remaining balance for partially paid bill', () => {
    const bill = { ...mockBill, paymentHistory: [{ amount: 30 }] };
    expect(getRemainingBalance(bill)).toBe(70);
});

it('should calculate remaining balance for fully paid bill', () => {
    const bill = { ...mockBill, paymentHistory: [{ amount: 100 }] };
    expect(getRemainingBalance(bill)).toBe(0);
});

it('should calculate total paid amount', () => {
    const bill = { ...mockBill, paymentHistory: [{ amount: 30 }, { amount: 20 }, { amount: 15 }] };
    expect(getTotalPaid(bill)).toBe(65);
});

it('should validate bill with valid data', () => {
    const result = validateBill(mockBill);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
});

it('should validate bill and catch missing name', () => {
    const result = validateBill({ ...mockBill, name: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('name'))).toBe(true);
});

it('should validate bill and catch invalid amount', () => {
    const result = validateBill({ ...mockBill, amountDue: -50 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => /amount/i.test(e))).toBe(true);
});

it('should validate bill and catch missing dueDate', () => {
    const result = validateBill({ ...mockBill, dueDate: '' });
    expect(result.isValid).toBe(false);
});

it('should validate bill with zero amount as valid (zero-balance bills are allowed)', () => {
    const result = validateBill({ ...mockBill, amountDue: 0 });
    // Zero amount is valid per business logic (balance can be cleared)
    expect(result.isValid).toBe(true);
});

it('should calculate remaining balance with credit balance applied', () => {
    const bill = { ...mockBill, creditBalance: 25 };
    expect(getRemainingBalance(bill)).toBe(75);
});

it('should reject negative credit balance in validation', () => {
    const result = validateBill({ ...mockBill, creditBalance: -10 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => /credit balance/i.test(e))).toBe(true);
});

describe('deleteBill', () => {
    beforeEach(() => {
        billStore.setBills([]);
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
        billStore.setBills([]);
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('deletes every matching recurring occurrence at once', () => {
        billStore.setBills([
            { ...mockBill, id: 'grass-1', name: 'Grass Cutting week 1', dueDate: '2026-05-15', recurrence: 'Weekly' },
            { ...mockBill, id: 'grass-2', name: 'Grass Cutting week 1', dueDate: '2026-05-22', recurrence: 'Weekly' },
            { ...mockBill, id: 'grass-3', name: 'Grass Cutting week 1', dueDate: '2026-05-29', recurrence: 'Weekly' },
            { ...mockBill, id: 'safe', name: 'Simpli Safe', dueDate: '2026-06-08', recurrence: 'Monthly' }
        ]);

        expect(deleteBill('grass-2')).toBe(true);

        const remainingBills = billStore.getAll();
        expect(remainingBills.map((bill) => bill.id)).toEqual(['safe']);
        expect(window.confirm).toHaveBeenCalledWith(
            'Delete all 3 occurrences of "Grass Cutting week 1"? This action cannot be undone.'
        );
    });

    it('deletes only the selected one-time bill', () => {
        billStore.setBills([
            { ...mockBill, id: 'one-time', name: 'One-time Repair', recurrence: 'One-time' },
            { ...mockBill, id: 'monthly', name: 'Simpli Safe', recurrence: 'Monthly' }
        ]);

        expect(deleteBill('one-time')).toBe(true);

        expect(billStore.getAll().map((bill) => bill.id)).toEqual(['monthly']);
    });
});
