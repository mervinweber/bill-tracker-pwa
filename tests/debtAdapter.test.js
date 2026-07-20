import { describe, expect, it } from 'vitest';
import {
    debtFromBill,
    debtFromImportedBill,
    getDebtImportCandidates,
    mergeDebtsWithBills,
    migrateLegacyBillDebts
} from '../src/utils/debtAdapter.js';

const bill = {
    id: 'bill-1',
    name: 'Visa',
    dueDate: '2026-08-17',
    amountDue: 85,
    debtTotal: 3200,
    interestRate: 21.99,
    includeInDebtSnowball: true
};

describe('legacy bill debt adapter', () => {
    it('maps legacy debt fields without modifying the bill', () => {
        const snapshot = structuredClone(bill);
        expect(debtFromBill(bill)).toMatchObject({
            id: 'bill-debt-bill-1',
            linkedBillId: 'bill-1',
            name: 'Visa',
            balance: 3200,
            apr: 21.99,
            minimumPayment: 85,
            dueDay: 17,
            source: 'bill'
        });
        expect(bill).toEqual(snapshot);
    });

    it('does not duplicate a bill already linked to a planning debt', () => {
        const existing = debtFromBill(bill);
        expect(mergeDebtsWithBills([existing], [bill])).toHaveLength(1);
    });

    it('keeps manual debts independent from bills', () => {
        const manual = { id: 'manual-1', name: 'Family loan', source: 'manual', linkedBillId: null };
        const merged = mergeDebtsWithBills([manual], [bill]);
        expect(merged).toHaveLength(2);
        expect(merged[0]).toBe(manual);
    });

    it('reports only newly migrated legacy debts as changes', () => {
        const first = migrateLegacyBillDebts({ debts: [] }, [bill]);
        const second = migrateLegacyBillDebts(first.plan, [bill]);
        expect(first).toMatchObject({ addedCount: 1, changed: true });
        expect(second).toMatchObject({ addedCount: 0, changed: false });
    });

    it('collapses recurring bill occurrences into one debt', () => {
        const secondOccurrence = { ...bill, id: 'bill-2', dueDate: '2026-09-17', recurrence: 'Monthly' };
        const firstOccurrence = { ...bill, recurrence: 'Monthly' };
        const merged = mergeDebtsWithBills([], [firstOccurrence, secondOccurrence]);
        expect(merged).toHaveLength(1);
        expect(merged[0].linkedBillId).toBe('bill-1');
    });

    it('prefers an active recurring occurrence over an archived one', () => {
        const archived = { ...bill, id: 'old', recurrence: 'Monthly', dueDate: '2026-07-17', archived: true };
        const active = { ...bill, id: 'current', recurrence: 'Monthly', dueDate: '2026-08-17', archived: false };
        const merged = mergeDebtsWithBills([], [archived, active]);
        expect(merged).toHaveLength(1);
        expect(merged[0]).toMatchObject({ linkedBillId: 'current', isActive: true });
    });

    it('offers each active bill series once and excludes already linked debts', () => {
        const monthly = { ...bill, id: 'monthly-1', recurrence: 'Monthly', dueDate: '2026-08-17' };
        const nextMonthly = { ...monthly, id: 'monthly-2', dueDate: '2026-09-17' };
        const utility = { id: 'utility', name: 'Electric', amountDue: 140, dueDate: '2026-08-20' };
        const candidates = getDebtImportCandidates(
            [monthly, nextMonthly, utility],
            [debtFromBill(monthly)]
        );
        expect(candidates.map((candidate) => candidate.id)).toEqual(['utility']);
    });

    it('uses a regular bill amount as the initial balance when no debt balance exists', () => {
        const imported = debtFromImportedBill({
            id: 'medical', name: 'Medical bill', amountDue: 125, dueDate: '2026-08-12'
        });
        expect(imported).toMatchObject({ balance: 125, minimumPayment: 125, linkedBillId: 'medical' });
    });

    it('refreshes an imported recurring bill without auto-importing ordinary bills', () => {
        const first = { id: 'first', name: 'Medical', amountDue: 100, balance: 500, dueDate: '2026-08-12', recurrence: 'Monthly' };
        const next = { ...first, id: 'next', amountDue: 90, dueDate: '2026-09-12' };
        expect(mergeDebtsWithBills([], [first, next])).toEqual([]);
        expect(mergeDebtsWithBills([debtFromImportedBill(first)], [first, next])[0]).toMatchObject({
            linkedBillId: 'first', balance: 500, minimumPayment: 100
        });
    });
});
