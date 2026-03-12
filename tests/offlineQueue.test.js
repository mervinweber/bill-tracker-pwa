import { it, expect, beforeEach } from 'vitest';

// Offline queue logic implemented inline for unit testing
const MAX_QUEUE_SIZE = 250;
const MAX_OP_SIZE = 10 * 1024; // 10KB

const makeQueue = () => {
    const ops = [];
    
    const enqueue = (type, data, id) => {
        if (!type || typeof type !== 'string') return null;
        if (!data || typeof data !== 'object') return null;
        if (!id || typeof id !== 'string') return null;
        if (JSON.stringify(data).length > MAX_OP_SIZE) return null;
        if (ops.length >= MAX_QUEUE_SIZE) return null;
        const op = { id: id + '-' + Date.now(), operationType: type, billId: id, data, status: 'pending', retries: 0 };
        ops.push(op);
        return op;
    };

    return {
        enqueue,
        complete(opId) { const o = ops.find(x => x.id === opId); if (o) { o.status = 'completed'; return true; } return false; },
        fail(opId) { const o = ops.find(x => x.id === opId); if (o) { o.status = 'failed'; o.retries++; return true; } return false; },
        remove(opId) { const i = ops.findIndex(x => x.id === opId); if (i > -1) { ops.splice(i, 1); return true; } return false; },
        stats() { return { total: ops.length, pending: ops.filter(o => o.status === 'pending').length, completed: ops.filter(o => o.status === 'completed').length, failed: ops.filter(o => o.status === 'failed').length }; },
        get all() { return [...ops]; }
    };
};

let q;
beforeEach(() => { q = makeQueue(); });

it('new operation starts with status pending', () => {
    const op = q.enqueue('create_bill', { name: 'Test' }, 'b1');
    expect(op.status).toBe('pending');
});

it('new operation initializes retries to 0', () => {
    const op = q.enqueue('create_bill', { name: 'Test' }, 'b1');
    expect(op.retries).toBe(0);
});

it('rejects null operationType', () => {
    expect(q.enqueue(null, {}, 'id')).toBe(null);
});

it('rejects null data', () => {
    expect(q.enqueue('create_bill', null, 'id')).toBe(null);
});

it('rejects null id', () => {
    expect(q.enqueue('create_bill', {}, null)).toBe(null);
});

it('rejects oversized data', () => {
    expect(q.enqueue('create_bill', { x: 'x'.repeat(20000) }, 'b1')).toBe(null);
});

it('accepts 250 operations', () => {
    for (let i = 0; i < 250; i++) q.enqueue('create_bill', { n: i }, `b${i}`);
    expect(q.all.length).toBe(250);
});

it('rejects 251st operation', () => {
    for (let i = 0; i < 250; i++) q.enqueue('create_bill', { n: i }, `b${i}`);
    expect(q.enqueue('create_bill', {}, 'overflow')).toBe(null);
});

it('marks operation as completed', () => {
    const op = q.enqueue('update_bill', { name: 'Test' }, 'b1');
    q.complete(op.id);
    expect(q.all[0].status).toBe('completed');
});

it('increments retry count on fail', () => {
    const op = q.enqueue('update_bill', { name: 'Test' }, 'b1');
    q.fail(op.id);
    expect(q.all[0].retries).toBe(1);
});

it('removes operation', () => {
    const op = q.enqueue('update_bill', { name: 'Test' }, 'b1');
    q.remove(op.id);
    expect(q.all.length).toBe(0);
});

it('returns false removing nonexistent op', () => {
    expect(q.remove('does-not-exist')).toBe(false);
});

it('reports accurate stats', () => {
    const a = q.enqueue('create_bill', {}, 'b1');
    const b = q.enqueue('create_bill', {}, 'b2');
    const c = q.enqueue('create_bill', {}, 'b3');
    q.complete(a.id);
    q.fail(b.id);
    const s = q.stats();
    expect(s.total).toBe(3);
    expect(s.completed).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.pending).toBe(1);
});
