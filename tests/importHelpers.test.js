import { it, expect } from 'vitest';
import { normalizeImportPayload, MAX_IMPORT_BILLS } from '../src/utils/importHelpers.js';

const validPayload = {
    version: '1.0',
    bills: [{
        id: 'b1',
        name: 'Electric',
        category: 'Utilities',
        dueDate: '2026-03-15',
        amountDue: 120,
        balance: 0,
        recurrence: 'Monthly',
        isPaid: false,
        paymentHistory: []
    }]
};

it('should normalize valid payload', () => {
    const result = normalizeImportPayload(validPayload, {
        existingCategories: ['Rent'],
        defaultCategories: ['Rent', 'Utilities']
    });
    expect(result).toBeTruthy();
    expect(result.processedBills).toBeDefined();
});

it('should reject invalid bill amount', () => {
    const badPayload = { bills: [{ ...validPayload.bills[0], amountDue: '-1' }] };
    let rejected = false;
    try {
        normalizeImportPayload(badPayload);
    } catch (err) {
        rejected = /invalid bill entries|non-negative number/i.test(err.message);
    }
    expect(rejected).toBe(true);
});

it('should reject oversized bill payloads', () => {
    const oversizedBills = Array.from({ length: MAX_IMPORT_BILLS + 1 }, () => ({ ...validPayload.bills[0] }));
    let rejected = false;
    try {
        normalizeImportPayload({ bills: oversizedBills });
    } catch (err) {
        rejected = /exceeds/i.test(err.message);
    }
    expect(rejected).toBe(true);
});

it('should handle import payload with no paymentSettings', () => {
    const simplePayload = { bills: validPayload.bills };
    const result = normalizeImportPayload(simplePayload);
    expect(result.processedBills.length).toBe(1);
});

it('should normalize every 3 months recurrence to Quarterly', () => {
    const quarterlyPayload = {
        bills: [{
            ...validPayload.bills[0],
            recurrence: 'every 3 months'
        }]
    };
    const result = normalizeImportPayload(quarterlyPayload);
    expect(result.processedBills[0].recurrence).toBe('Quarterly');
});

it('should normalize missing credit balance to zero', () => {
    const result = normalizeImportPayload({ bills: [validPayload.bills[0]] });
    expect(result.processedBills[0].creditBalance).toBe(0);
});

it('should reject negative credit balance', () => {
    const badPayload = { bills: [{ ...validPayload.bills[0], creditBalance: -1 }] };
    let rejected = false;
    try {
        normalizeImportPayload(badPayload);
    } catch (err) {
        rejected = /credit balance|invalid bill entries|non-negative number/i.test(err.message);
    }
    expect(rejected).toBe(true);
});

it('should normalize debt fields', () => {
    const result = normalizeImportPayload({
        bills: [{
            ...validPayload.bills[0],
            debtTotal: 1200,
            interestRate: 18.99,
            includeInDebtSnowball: true
        }]
    });
    expect(result.processedBills[0].debtTotal).toBe(1200);
    expect(result.processedBills[0].interestRate).toBe(18.99);
    expect(result.processedBills[0].includeInDebtSnowball).toBe(true);
});

it('should reject negative debt total', () => {
    const badPayload = { bills: [{ ...validPayload.bills[0], debtTotal: -50 }] };
    let rejected = false;
    try {
        normalizeImportPayload(badPayload);
    } catch (err) {
        rejected = /debt total|invalid bill entries|non-negative number/i.test(err.message);
    }
    expect(rejected).toBe(true);
});
