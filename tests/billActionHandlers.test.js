import { assert, describe, it, expect } from 'vitest';
/**
 * Bill Action Handlers Unit Tests
 * Tests bill operations with validation and error handling
 */





}


}

function test(description, testFn) {
    try {
        testFn();
        console.log(`✅ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ ${description}: ${error.message}`);
        testsFailed++;
    }
}


// Mock bill data
const mockBill = {
    id: '1',
    name: 'Electricity',
    amountDue: 100,
    dueDate: '2025-02-01',
    category: 'Utilities',
    paymentHistory: []
};

test('should calculate remaining balance for unpaid bill', () => {
    const remaining = getRemainingBalance(mockBill);
    assertEqual(remaining, 100, 'unpaid bill should have full balance');
});

test('should calculate remaining balance for partially paid bill', () => {
    const bill = {
        ...mockBill,
        paymentHistory: [{ amount: 30 }]
    };
    const remaining = getRemainingBalance(bill);
    assertEqual(remaining, 70, 'partially paid bill should have correct remaining');
});

test('should calculate remaining balance for fully paid bill', () => {
    const bill = {
        ...mockBill,
        paymentHistory: [{ amount: 100 }]
    };
    const remaining = getRemainingBalance(bill);
    assertEqual(remaining, 0, 'fully paid bill should have zero balance');
});

test('should calculate total paid amount', () => {
    const bill = {
        ...mockBill,
        paymentHistory: [
            { amount: 30 },
            { amount: 20 },
            { amount: 15 }
        ]
    };
    const total = getTotalPaid(bill);
    assertEqual(total, 65, 'should sum all payment history');
});

test('should validate bill with valid data', () => {
    const result = validateBill(mockBill);
    assert(result.isValid, 'valid bill should pass validation');
    assert(result.errors.length === 0, 'valid bill should have no errors');
});

test('should validate bill and catch missing name', () => {
    const bill = { ...mockBill, name: '' };
    const result = validateBill(bill);
    assert(!result.isValid, 'bill without name should fail');
    assert(result.errors.some(e => e.includes('name')), 'should have name error');
});

test('should validate bill and catch invalid amount', () => {
    const bill = { ...mockBill, amountDue: -50 };
    const result = validateBill(bill);
    assert(!result.isValid, 'bill with negative amount should fail');
    assert(result.errors.some(e => /amount/i.test(e)), 'should have amount error');
});

test('should validate bill and catch missing dueDate', () => {
    const bill = { ...mockBill, dueDate: '' };
    const result = validateBill(bill);
    assert(!result.isValid, 'bill without dueDate should fail');
    assert(result.errors.some(e => e.includes('date')), 'should have date error');
});

test('should validate bill with zero amount', () => {
    const bill = { ...mockBill, amountDue: 0 };
    const result = validateBill(bill);
    assert(!result.isValid, 'bill with zero amount should fail');
});

function getRemainingBalance(bill) {
    const totalPaid = getTotalPaid(bill);
    return Math.max(0, bill.amountDue - totalPaid);
}

function getTotalPaid(bill) {
    return bill.paymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
}

function validateBill(bill) {
    const errors = [];
    
    if (!bill.name || bill.name.trim() === '') {
        errors.push('Bill name is required');
    }
    
    if (bill.amountDue === undefined || bill.amountDue === null || bill.amountDue <= 0) {
        errors.push('Amount must be greater than 0');
    }
    
    if (!bill.dueDate || bill.dueDate.trim() === '') {
        errors.push('Due date is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}



