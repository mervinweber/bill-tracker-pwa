import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/auditTracker.js', () => ({
    getAuditEvents: vi.fn(() => [
        {
            entityType: 'bill',
            entityId: 'bill-1',
            timestamp: '2026-04-01T10:00:00.000Z',
            eventType: 'bill.balance.updated',
            summary: 'Balance updated for Internet',
            metadata: { balance: 77.5 }
        },
        {
            entityType: 'bill',
            entityId: 'other-bill',
            timestamp: '2026-04-01T12:00:00.000Z',
            eventType: 'bill.deleted',
            summary: 'Deleted bill'
        }
    ])
}));

import { buildBillTimeline } from '../src/utils/historyTimeline.js';

/**
 * @param {Partial<import('../src/types/domainTypes.js').Bill>} overrides
 * @returns {import('../src/types/domainTypes.js').Bill}
 */
function buildBill(overrides = {}) {
    return {
        id: 'bill-1',
        name: 'Internet',
        category: 'Utilities',
        dueDate: '2026-04-05',
        amountDue: 100,
        balance: 100,
        recurrence: 'Monthly',
        isPaid: false,
        paymentHistory: [
            { id: 'p1', date: '2026-04-02', amount: 50, method: 'Card' }
        ],
        ...overrides
    };
}

describe('history timeline adapter', () => {
    it('builds combined timeline for the bill only', () => {
        const timeline = buildBillTimeline(buildBill());

        expect(timeline.length).toBe(2);
        expect(timeline[0].kind).toBe('payment');
        expect(timeline[1].kind).toBe('audit');
        expect(timeline[1].details).toBe('New balance: $77.50');
    });

    it('returns empty for missing bill', () => {
        expect(buildBillTimeline(null)).toEqual([]);
    });
});
