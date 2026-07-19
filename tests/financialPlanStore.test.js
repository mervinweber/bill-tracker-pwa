import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialPlanStore } from '../src/store/FinancialPlanStore.js';
import { FINANCIAL_PLAN_SCHEMA_VERSION } from '../src/utils/financialPlan.js';

function createStorage(initialValue = null) {
    let value = initialValue;
    return {
        get: vi.fn((_key, fallback) => value ?? fallback),
        set: vi.fn((_key, nextValue) => {
            value = structuredClone(nextValue);
            return true;
        })
    };
}

describe('FinancialPlanStore', () => {
    let storage;
    let store;

    beforeEach(() => {
        storage = createStorage();
        store = new FinancialPlanStore(storage);
    });

    it('starts with a versioned, empty planning record', () => {
        expect(store.getPlan().schemaVersion).toBe(FINANCIAL_PLAN_SCHEMA_VERSION);
        expect(store.getPlan().debts).toEqual([]);
        expect(store.getPlan().settings.strategy).toBe('snowball');
    });

    it('normalizes and persists debts without changing bill storage', () => {
        store.upsertDebt({ id: 'debt-1', name: 'Visa', balance: '2500', apr: '19.5', minimumPayment: '75' });
        expect(store.getPlan().debts[0]).toMatchObject({
            id: 'debt-1', name: 'Visa', balance: 2500, apr: 19.5, minimumPayment: 75
        });
        expect(storage.set).toHaveBeenCalledWith('financialPlan', expect.any(Object));
    });

    it('preserves future planning collections when settings change', () => {
        store.replace({ accounts: [{ id: 'checking' }], budgetCategories: [{ id: 'food' }] });
        store.updateSettings({ strategy: 'avalanche', extraPayment: 200 });
        expect(store.getPlan().accounts).toEqual([{ id: 'checking' }]);
        expect(store.getPlan().budgetCategories).toEqual([{ id: 'food' }]);
        expect(store.getPlan().settings).toMatchObject({ strategy: 'avalanche', extraPayment: 200 });
    });

    it('notifies subscribers after an update', () => {
        const listener = vi.fn();
        store.subscribe(listener);
        store.upsertIncomeSource({ id: 'income-1', name: 'Paycheck', amount: 2000, frequency: 'biweekly' });
        expect(listener).toHaveBeenCalledOnce();
    });
});
