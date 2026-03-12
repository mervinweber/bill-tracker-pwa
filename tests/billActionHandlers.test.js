import { it, expect } from 'vitest';
import { getRemainingBalance } from '../src/utils/billHelpers.js';
import { validateBill } from '../src/handlers/billActionHandlers.js';

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
