import { calculateNextDueDate, getRemainingBalance } from '../src/utils/billHelpers.js';

export const runTests = async () => {

    await test('calculateNextDueDate - Monthly', () => {
        const date = new Date('2025-01-01');
        const next = calculateNextDueDate(date, 'Monthly');
        const expected = new Date('2025-02-01');
        assert(next.getTime() === expected.getTime(), `Expected Feb 1, got ${next.toDateString()}`);
    });

    await test('calculateNextDueDate - Weekly', () => {
        const date = new Date('2025-01-01'); // Wednesday
        const next = calculateNextDueDate(date, 'Weekly');
        const expected = new Date('2025-01-08');
        assert(next.getTime() === expected.getTime(), `Expected Jan 8, got ${next.toDateString()}`);
    });

    await test('getRemainingBalance - Fully Unpaid', () => {
        const bill = { amountDue: 100, paymentHistory: [] };
        const balance = getRemainingBalance(bill);
        assert(balance === 100, `Expected 100, got ${balance}`);
    });

    await test('getRemainingBalance - Partially Paid', () => {
        const bill = {
            amountDue: 100,
            paymentHistory: [
                { amount: 30 },
                { amount: 20 }
            ]
        };
        const balance = getRemainingBalance(bill);
        assert(balance === 50, `Expected 50, got ${balance}`);
    });

    await test('getRemainingBalance - Fully Paid', () => {
        const bill = {
            amountDue: 100,
            paymentHistory: [
                { amount: 100 }
            ]
        };
        const balance = getRemainingBalance(bill);
        assert(balance === 0, `Expected 0, got ${balance}`);
    });
};
